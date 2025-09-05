# GitHub Issues 创建清单

## Issue #1: 🎯 [Feature] Act5苏格拉底式智慧引导系统实现

### 📝 功能描述
重新设计和实现Act5苏格拉底式讨论模块，采用**预设问题库+动态路径+教师主导**的方案，避免对AI API的依赖。

### 🎯 核心设计理念
基于Sean的矛盾分析：
- **主要矛盾**：教学深度 vs 用户认知负担  
- **解决载体**：三层递进式引导系统
- **设计原则**：奥卡姆剃刀 - 简单可控优于复杂智能

### ✨ 三大核心优势
1. **教学质量可控** - 每个问题经过专家设计，确保教学目标
2. **零成本实施** - 纯前端实现，无需API费用
3. **交互体验流畅** - 即时响应，支持离线使用

### 🏗️ 技术架构

#### 问题引擎设计
```typescript
interface SocraticQuestion {
  id: string;
  level: 1 | 2 | 3; // 观察层、分析层、价值层
  question: string;
  type: 'observation' | 'analysis' | 'value';
  branches: {
    response: string | RegExp;
    nextQuestionId: string;
    feedback?: string;
  }[];
  hints: string[];
  expectedInsights: string[];
}
```

#### 三层递进法
- **Level 1 观察层**："你看到了什么？" - 建立共同认知基础
- **Level 2 分析层**："这意味着什么？" - 培养逻辑推理能力  
- **Level 3 价值层**："这样对吗？" - 引发价值思考

### 📋 实施计划

#### 第一阶段（3天）
- [ ] 实现问题引擎核心逻辑
- [ ] 创建基础问题库数据结构
- [ ] 开发简单对话界面

#### 第二阶段（3天）
- [ ] 添加进度追踪功能
- [ ] 实现上下文记忆
- [ ] 优化问题模板

#### 第三阶段（4天）
- [ ] 多角色协作机制
- [ ] 智能路径规划
- [ ] 学习效果评估

---

## Issue #2: 🔬 [Research] AI SDK技术选型研究

### 📝 研究目标
评估和选择适合法律教育平台的AI SDK，为未来智能化功能做技术储备。

### 🎯 研究内容

#### 1. SDK对比分析
| SDK | 优势 | 劣势 | 适用场景 |
|-----|------|------|---------|
| **Vercel AI SDK** | 简单易用、流式优先、Next.js完美集成 | 功能相对简单 | Web应用快速集成 |
| **LangChain** | 功能丰富、生态完整、支持复杂编排 | 学习曲线陡峭 | 复杂AI系统 |
| **OpenAI SDK** | 官方支持、API完整 | 仅支持OpenAI | OpenAI专用场景 |

#### 2. 成本评估
- API调用成本分析（GPT-3.5 vs GPT-4）
- Token优化策略
- 缓存机制设计

#### 3. 集成方案
```typescript
// 推荐渐进式集成
Phase 1: Vercel AI SDK (简单对话)
Phase 2: LangChain (复杂推理链)
Phase 3: Custom Wrapper (特定优化)
```

### 📋 研究任务
- [ ] 搭建Vercel AI SDK POC
- [ ] 测试流式响应性能
- [ ] 评估Token消耗
- [ ] 设计缓存策略
- [ ] 编写集成文档

### 🎯 预期产出
- 技术选型报告
- POC示例代码
- 成本预算表
- 集成指南

---

## Issue #3: 🏗️ [Architecture] 苏格拉底系统状态管理设计

### 📝 设计目标
设计一个清晰、可扩展的状态管理架构，支持苏格拉底式教学系统的复杂交互。

### 🎯 状态结构设计

```typescript
interface SocraticStore {
  // 核心状态
  currentQuestion: SocraticQuestion | null;
  discussionHistory: DiscussionEntry[];
  currentLevel: number;
  
  // 学生参与
  activeStudents: Set<string>;
  studentInsights: Map<string, Insight[]>;
  
  // 教学控制
  mode: 'guided' | 'free' | 'collaborative';
  pacing: 'auto' | 'manual';
  
  // Actions
  submitResponse: (response: string) => void;
  skipToLevel: (level: number) => void;
  generateReport: () => TeachingReport;
}
```

### 📋 开发任务
- [ ] 创建socraticStore
- [ ] 集成到现有useCaseStore
- [ ] 实现状态持久化
- [ ] 添加状态监听hooks
- [ ] 开发DevTools支持

---

## Issue #4: 📚 [Data] 法律案例问题库建设

### 📝 目标
构建高质量的苏格拉底式问题库，覆盖常见法律教学案例。

### 🎯 问题库结构

```typescript
const questionBank = {
  "房屋买卖案": {
    metadata: {
      difficulty: "medium",
      duration: "30min",
      topics: ["合同法", "情势变更"]
    },
    questions: {
      level1: [...], // 5-8个观察问题
      level2: [...], // 5-8个分析问题
      level3: [...]  // 3-5个价值问题
    }
  }
}
```

### 📋 建设任务
- [ ] 设计问题模板
- [ ] 编写房屋买卖案问题（示例）
- [ ] 添加劳动合同案问题
- [ ] 添加侵权责任案问题
- [ ] 建立问题质量评审机制

### 🎯 质量标准
- 每个问题必须有明确的教学目标
- 提供至少3个可能的回答分支
- 包含渐进式提示
- 标注预期洞察点

---

## Issue #5: 🎨 [UI/UX] 苏格拉底讨论界面优化

### 📝 设计目标
创建沉浸式、互动性强的苏格拉底式讨论界面。

### 🎯 设计要点

#### 视觉层次
- 问题卡片：中心突出，带动画效果
- 讨论流：时间轴式展现
- 进度指示：三层圆环可视化

#### 交互设计
- 智能提示：基于停顿时间
- 快捷操作：键盘快捷键支持
- 多人协作：实时显示他人输入

### 📋 设计任务
- [ ] 设计问题卡片组件
- [ ] 实现进度可视化
- [ ] 开发讨论时间轴
- [ ] 添加动画效果
- [ ] 优化移动端体验

---

## Issue #6: 📊 [Analytics] 教学效果评估系统

### 📝 功能描述
建立数据驱动的教学效果评估体系。

### 🎯 评估维度

```typescript
interface TeachingMetrics {
  participation: {
    responseRate: number;
    averageResponseTime: number;
    interactionDepth: number;
  };
  understanding: {
    insightQuality: number;
    progressionSpeed: number;
    conceptGrasp: number;
  };
  engagement: {
    sessionDuration: number;
    completionRate: number;
    returnRate: number;
  };
}
```

### 📋 开发任务
- [ ] 设计指标体系
- [ ] 实现数据采集
- [ ] 开发分析算法
- [ ] 创建可视化报表
- [ ] 导出功能

---

## 优先级排序

1. **P0 - 立即开始**
   - Issue #1: 苏格拉底式智慧引导系统（核心功能）
   - Issue #3: 状态管理设计（基础架构）

2. **P1 - 第二批**
   - Issue #4: 问题库建设（内容支撑）
   - Issue #5: UI/UX优化（用户体验）

3. **P2 - 后续考虑**
   - Issue #2: AI SDK研究（未来扩展）
   - Issue #6: 评估系统（增值功能）