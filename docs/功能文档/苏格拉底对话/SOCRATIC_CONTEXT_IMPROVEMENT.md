# 苏格拉底对话会话上下文改进方案

## 当前架构分析

### 现状
目前系统**已经在发送全局上下文**，包括：
- 完整的对话历史（messages数组）
- 案件信息（caseContext字符串）
- 当前话题（currentTopic）

### 核心问题
虽然发送了全局上下文，但存在以下不足：
1. 上下文结构不够清晰（字符串拼接）
2. Token使用效率低（完整消息历史）
3. 缺少会话级别的元信息（教学状态追踪）
4. AI提示词没有充分利用历史上下文

---

## 改进方案

### 方案1：结构化上下文（推荐）

#### 当前实现（字符串拼接）
```javascript
caseContext: `案件：${caseData.title}\n争议：${caseData.dispute}\n事实：${caseData.facts.join('；')}\n法条：${caseData.laws.join('；')}`
```

#### 改进后（结构化JSON）
```javascript
caseContext: {
  case: {
    title: caseData.title,
    dispute: caseData.dispute,
    facts: caseData.facts.map((fact, idx) => ({
      id: `fact-${idx}`,
      content: fact,
      discussed: false,  // 是否已讨论过
      importance: 'high' // 重要性
    })),
    laws: caseData.laws.map((law, idx) => ({
      id: `law-${idx}`,
      content: law,
      discussed: false,
      relatedFacts: []   // 关联的事实ID
    }))
  },
  teachingStatus: {
    currentPhase: 'exploration',  // exploration | argumentation | conclusion
    discussedTopics: ['合同效力', '显失公平'],
    studentUnderstanding: {
      level: 'intermediate',
      strengths: ['逻辑推理'],
      weaknesses: ['法条适用']
    },
    nextSuggestion: '引导学生分析法条与事实的对应关系'
  }
}
```

**优势**：
- AI可以精确定位到具体的事实/法条
- 可以追踪哪些内容已讨论，避免重复
- 提供教学状态，帮助AI生成更有针对性的问题

---

### 方案2：滑动窗口 + 摘要

#### 当前实现（发送全部消息）
```javascript
messages: [
  ...messages.map(m => ({ role, content, timestamp })),
  { role: 'user', content: currentQuestion }
]
```

#### 改进后（滑动窗口）
```javascript
// 保留最近N轮对话 + 关键摘要
const recentMessages = messages.slice(-10);  // 最近5轮（10条消息）
const historySummary = generateSummary(messages.slice(0, -10));

messages: [
  {
    role: 'system',
    content: `对话历史摘要：${historySummary.keyPoints.join('；')}\n已讨论的主题：${historySummary.topics.join('、')}`
  },
  ...recentMessages,
  { role: 'user', content: currentQuestion }
]
```

**优势**：
- 大幅减少token消耗
- 保留了历史脉络（通过摘要）
- 聚焦于最近的对话

**实现示例**：
```typescript
function generateConversationSummary(messages: Message[]): {
  keyPoints: string[];
  topics: string[];
  studentInsights: string[];
} {
  // 提取关键论证点
  const keyPoints = messages
    .filter(m => m.role === 'ai')
    .map(m => extractKeyArguments(m.content))
    .flat();

  // 提取讨论主题
  const topics = [...new Set(messages
    .map(m => extractTopics(m.content))
    .flat()
  )];

  // 提取学生见解
  const studentInsights = messages
    .filter(m => m.role === 'teacher')
    .map(m => m.content)
    .slice(-3);  // 最近3个学生回答

  return { keyPoints, topics, studentInsights };
}
```

---

### 方案3：增强提示词，明确历史上下文使用

#### 当前提示词（TeacherSocratic.tsx:461-507）
```
你现在要开始第一次苏格拉底对话...
【核心任务】：生成第一个引导性问题...
```

#### 改进后
```typescript
const buildSocraticPrompt = (context: {
  messages: Message[];
  caseData: CaseData;
  discussedTopics: string[];
  studentUnderstanding: StudentProfile;
}) => `
你是一位苏格拉底式教师，正在进行第 ${Math.floor(context.messages.length / 2) + 1} 轮对话。

【对话历史回顾】：
- 已讨论的主题：${context.discussedTopics.join('、')}
- 学生理解程度：${context.studentUnderstanding.level}
- 学生的优势：${context.studentUnderstanding.strengths.join('、')}
- 学生的薄弱点：${context.studentUnderstanding.weaknesses.join('、')}

【案件核心信息】：
案件：${context.caseData.title}
争议：${context.caseData.dispute}
已讨论的事实：${context.caseData.facts.filter(f => f.discussed).map(f => f.content).join('；')}
未讨论的事实：${context.caseData.facts.filter(f => !f.discussed).map(f => f.content).join('；')}

【你的任务】：
基于以上历史对话和学生的理解状况，生成下一个引导性问题。
重点关注：
1. 学生的薄弱点（${context.studentUnderstanding.weaknesses[0]}）
2. 尚未讨论的关键事实
3. 深化已讨论主题的理解

【禁止】：
- 不要重复已经充分讨论的话题
- 不要问学生已经回答过的问题
- 不要忽视学生的薄弱点
`;
```

---

### 方案4：会话状态持久化

当前问题：每次刷新页面，对话历史丢失。

#### 实现会话管理
```typescript
// src/domains/socratic-dialogue/services/SessionManager.ts
export class SocraticSessionManager {
  private sessionStore: Map<string, SocraticSession> = new Map();

  saveSession(sessionId: string, session: SocraticSession) {
    this.sessionStore.set(sessionId, session);
    // 可选：持久化到数据库
    this.persistToDatabase(sessionId, session);
  }

  getSession(sessionId: string): SocraticSession | null {
    return this.sessionStore.get(sessionId) || null;
  }

  updateSessionMetadata(sessionId: string, metadata: SessionMetadata) {
    const session = this.getSession(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...metadata };
      this.saveSession(sessionId, session);
    }
  }
}

interface SocraticSession {
  id: string;
  caseId: string;
  messages: Message[];
  metadata: {
    discussedTopics: string[];
    discussedFacts: string[];
    discussedLaws: string[];
    studentProfile: StudentProfile;
    teachingPhase: 'exploration' | 'argumentation' | 'conclusion';
    startTime: number;
    lastUpdateTime: number;
  };
}

interface StudentProfile {
  understandingLevel: 'beginner' | 'intermediate' | 'advanced';
  strengths: string[];
  weaknesses: string[];
  participationScore: number;
  logicalReasoningScore: number;
}
```

---

## 实施步骤

### 第一步：优化上下文结构（核心）
1. 修改 `TeacherSocratic.tsx` 中的 `caseContext` 为结构化JSON
2. 修改API路由接收结构化数据
3. 更新AI提示词，利用结构化信息

### 第二步：实现滑动窗口（性能）
1. 在发送前截取最近N轮对话
2. 生成历史摘要（可以用简单的关键词提取）
3. 合并摘要 + 最近消息

### 第三步：增加会话元信息（智能）
1. 在 `useSocraticDialogueStore` 中添加 `sessionMetadata`
2. 每次对话后更新 `discussedTopics`、`studentProfile`
3. 将元信息传递给AI

### 第四步：持久化（可选）
1. 实现 `SessionManager`
2. 在每次消息更新后保存会话
3. 页面刷新后恢复会话

---

## 对比效果

### 改进前
```json
{
  "messages": [
    {"role": "user", "content": "什么是显失公平？"},
    {"role": "assistant", "content": "显失公平是指..."},
    // ... 50条消息
  ],
  "caseContext": "案件：张三诉李四合同纠纷\n争议：合同是否显失公平\n事实：...",
  "currentTopic": "如何判断显失公平？"
}
```
**Token消耗**：约5000 tokens

### 改进后
```json
{
  "messages": [
    {
      "role": "system",
      "content": "历史摘要：已讨论显失公平的定义、构成要件；学生对法条理解较好，但缺乏案例分析能力"
    },
    // 只保留最近5轮对话
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "caseContext": {
    "case": {
      "title": "张三诉李四合同纠纷",
      "facts": [
        {"id": "fact-1", "content": "...", "discussed": true},
        {"id": "fact-2", "content": "...", "discussed": false}
      ]
    },
    "teachingStatus": {
      "discussedTopics": ["显失公平定义", "构成要件"],
      "studentProfile": {
        "strengths": ["法条理解"],
        "weaknesses": ["案例分析"]
      },
      "nextSuggestion": "引导学生将法条应用到具体事实"
    }
  }
}
```
**Token消耗**：约2000 tokens（减少60%）
**AI质量**：更高（有明确的教学状态指导）

---

## 技术实现参考

### 文件修改清单
1. `components/socratic/TeacherSocratic.tsx` - 优化消息发送逻辑
2. `src/domains/socratic-dialogue/stores/useSocraticDialogueStore.ts` - 添加会话元信息
3. `app/api/socratic/route.ts` - 支持结构化上下文
4. 新增 `src/domains/socratic-dialogue/services/SessionManager.ts` - 会话管理
5. 新增 `src/domains/socratic-dialogue/utils/ContextOptimizer.ts` - 上下文优化

### 测试验证
- [ ] 验证结构化上下文是否正确传递
- [ ] 对比滑动窗口前后的token消耗
- [ ] A/B测试AI响应质量
- [ ] 测试会话持久化和恢复

---

## 总结

**关键洞察**：
- 当前系统**已经在发送全局上下文**，不是"只收集当下问题"
- 真正的问题是**上下文的结构和利用效率**不够好
- 改进重点：
  1. 结构化上下文（让AI更容易理解）
  2. 滑动窗口 + 摘要（减少token消耗）
  3. 会话元信息（提供教学状态）
  4. 增强提示词（明确告诉AI如何利用历史）

**预期收益**：
- Token消耗减少50-60%
- AI响应质量提升（更有针对性）
- 更好的教学连贯性
- 支持长时间对话（不会因token限制中断）
