# 法律教育平台 - 架构与数据流分析

> **文档版本**: v1.0
> **更新日期**: 2025-01-21
> **当前分支**: feature/teaching-session-storage

---

## 📋 目录

1. [系统架构概览](#系统架构概览)
2. [四幕教学流程](#四幕教学流程)
3. [数据流转图](#数据流转图)
4. [API接口清单](#api接口清单)
5. [状态管理（Store）](#状态管理store)
6. [快照存储机制](#快照存储机制)
7. [数据库设计](#数据库设计)
8. [当前问题分析](#当前问题分析)
9. [优化建议](#优化建议)

---

## 系统架构概览

### 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     法律教育平台                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐    ┌───────────────┐    ┌─────────────┐ │
│  │  前端页面层    │    │  API路由层    │    │  数据库层   │ │
│  │  (Next.js)    │◄───│  (Route       │◄───│  (Postgres) │ │
│  │               │    │   Handlers)   │    │             │ │
│  └───────┬───────┘    └───────┬───────┘    └─────────────┘ │
│          │                    │                              │
│  ┌───────▼───────────────────▼────────────────────────┐    │
│  │           状态管理层 (Zustand Stores)               │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │Teaching  │ │  Case    │ │Socratic  │           │    │
│  │  │  Store   │ │  Store   │ │  Store   │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘           │    │
│  └───────┬──────────────────────────────────────────┘    │
│          │                                                  │
│  ┌───────▼─────────────────────────────────────────────┐  │
│  │              业务逻辑层 (Services)                   │  │
│  │  ┌────────────────┐  ┌────────────────┐            │  │
│  │  │ Legal Analysis │  │    Socratic    │            │  │
│  │  │   Services     │  │   Dialogue     │            │  │
│  │  └────────────────┘  └────────────────┘            │  │
│  └───────┬──────────────────────────────────────────┘    │
│          │                                                  │
│  ┌───────▼─────────────────────────────────────────────┐  │
│  │          AI集成层 (DeepSeek API)                     │  │
│  │         统一调用代理 (AiInvocation)                   │  │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 📦 核心技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Next.js 15 + React 18 | 服务端渲染 + 客户端渲染混合 |
| **UI组件** | shadcn/ui + Tailwind CSS | 现代化UI组件库 |
| **状态管理** | Zustand + Immer + Persist | 轻量级状态管理 |
| **类型系统** | TypeScript + Zod | 编译时+运行时类型校验 |
| **数据库** | PostgreSQL + Prisma | 关系型数据库 + ORM |
| **AI服务** | DeepSeek API | 大语言模型集成 |
| **样式** | Tailwind CSS + Framer Motion | 原子化CSS + 动画 |

---

## 四幕教学流程

### 🎭 教学四幕概览

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   第一幕     │────▶│   第二幕     │────▶│   第三幕     │────▶│   第四幕     │
│  案例导入    │     │  深度分析    │     │ 苏格拉底对话 │     │  总结提升    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
  (upload)            (analysis)           (socratic)           (summary)
```

### 详细流程图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          第一幕：案例导入（Upload）                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  用户操作：上传判决书文档（PDF/TXT/Word）                                │
│      ↓                                                                    │
│  前端组件：ThreeElementsExtractor                                         │
│      ↓                                                                    │
│  API调用：POST /api/legal-intelligence/extract                           │
│      ↓                                                                    │
│  后端服务：JudgmentExtractionService                                      │
│      ├─ 规则提取（正则表达式）                                            │
│      └─ AI增强提取（DeepSeek）                                            │
│      ↓                                                                    │
│  返回数据：三要素提取结果                                                 │
│      ├─ basicInfo（基础信息）                                             │
│      ├─ threeElements.facts（事实认定）                                   │
│      ├─ threeElements.evidence（证据质证）                                │
│      └─ threeElements.reasoning（法官说理）                               │
│      ↓                                                                    │
│  存储位置：                                                               │
│      ├─ useTeachingStore.uploadData.extractedElements                    │
│      └─ useCaseManagementStore.currentCase (as LegalCase)                │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         第二幕：深度分析（Analysis）                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  触发条件：第一幕完成 && 有extractedElements                              │
│      ↓                                                                    │
│  前端组件：DeepAnalysis                                                   │
│      ├─ CaseOverview（案情概览 + AI故事叙事）                             │
│      ├─ TimelineExplorer（时间轴探索）                                    │
│      ├─ EvidenceQuizSection（证据质证）                                   │
│      └─ DisputeFocusAnalysis（争议焦点分析）                              │
│      ↓                                                                    │
│  🎨 故事模式（storyMode = true）：                                        │
│      ├─ 自动调用：POST /api/legal-analysis/intelligent-narrative         │
│      │   └─ CaseNarrativeService.generateIntelligentNarrative()          │
│      ├─ 生成：storyChapters[]（AI叙事章节）                               │
│      │   ├─ 第一章：案情缘起                                              │
│      │   ├─ 第二章：争议焦点                                              │
│      │   ├─ 第三章：证据链条                                              │
│      │   ├─ 第四章：法律论证                                              │
│      │   └─ 第五章：裁判结果                                              │
│      └─ 存储：useTeachingStore.storyChapters                              │
│      ↓                                                                    │
│  📊 时间轴分析（按需）：                                                  │
│      ├─ 用户点击时间轴事件                                                │
│      ├─ API调用：POST /api/timeline-analysis                             │
│      ├─ 服务：TimelineAnalysisService                                    │
│      └─ 返回：该事件的法律意义、风险提示、策略建议                        │
│      ↓                                                                    │
│  🔍 争议焦点分析（按需）：                                                │
│      ├─ API调用：POST /api/dispute-analysis                              │
│      ├─ 服务：DisputeAnalysisService                                     │
│      └─ 返回：争议要素、证据映射、法律依据                                │
│      ↓                                                                    │
│  存储位置：                                                               │
│      ├─ useTeachingStore.analysisData.result                             │
│      └─ useTeachingStore.storyChapters                                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       第三幕：苏格拉底对话（Socratic）                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  触发条件：第二幕完成                                                      │
│      ↓                                                                    │
│  前端组件：SocraticDialogue                                               │
│      ├─ 🧑‍🎓 学生模式：TeacherSocratic（教师引导学生）                     │
│      └─ 🤖 AI模式：SocraticChat（AI与学生对话）                           │
│      ↓                                                                    │
│  对话流程：                                                               │
│      1. 用户发送消息/选择主题                                             │
│      2. API调用：POST /api/socratic                                      │
│      3. 后端服务：SocraticDialogueService                                │
│      4. AI生成苏格拉底式引导问题                                          │
│      5. 返回：问题 + 教学引导 + 追问                                      │
│      ↓                                                                    │
│  数据结构：                                                               │
│      ├─ messages[]（对话历史）                                            │
│      ├─ level（1=beginner, 2=intermediate, 3=advanced）                  │
│      ├─ mode（exploration/deep-dive/practice）                           │
│      └─ completedNodes（已完成的知识节点）                                │
│      ↓                                                                    │
│  存储位置：                                                               │
│      ├─ useTeachingStore.socraticData                                    │
│      └─ useSocraticDialogueStore（专用Store）                            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        第四幕：总结提升（Summary）                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  触发条件：第三幕完成                                                      │
│      ↓                                                                    │
│  前端组件：Act6JudgmentSummary                                            │
│      ↓                                                                    │
│  生成总结：                                                               │
│      ├─ API调用：POST /api/teaching-acts/summary                         │
│      ├─ 服务：SummaryGenerationService                                   │
│      └─ 输入数据：                                                        │
│          ├─ extractedElements（第一幕）                                   │
│          ├─ analysisResult（第二幕）                                      │
│          └─ socraticDialogue（第三幕）                                    │
│      ↓                                                                    │
│  生成内容：                                                               │
│      ├─ 案例核心要点                                                      │
│      ├─ 法律知识总结                                                      │
│      ├─ 学习收获与反思                                                    │
│      ├─ 相关案例推荐                                                      │
│      └─ 学习建议                                                          │
│      ↓                                                                    │
│  存储位置：                                                               │
│      └─ useTeachingStore.summaryData.caseLearningReport                  │
│      ↓                                                                    │
│  🎓 完成学习按钮：                                                        │
│      ├─ 触发：保存整个教学会话到数据库                                    │
│      ├─ API调用：POST /api/teaching-sessions                             │
│      ├─ 转换：SnapshotConverter.toDatabase(stores)                       │
│      └─ 保存：PostgreSQL teaching_sessions表                             │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 数据流转图

### 🔄 核心数据流

```
┌────────────────────────────────────────────────────────────────────────┐
│                           数据生命周期                                   │
└────────────────────────────────────────────────────────────────────────┘

1️⃣ 数据生成阶段
   ┌─────────────┐
   │ 用户上传文档 │
   └──────┬──────┘
          ↓
   ┌─────────────────────────────┐
   │ JudgmentExtractionService   │
   │  - 规则提取                  │
   │  - AI增强                    │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ extractedElements           │
   │ {                           │
   │   basicInfo: {...},         │
   │   threeElements: {          │
   │     facts: {...},           │
   │     evidence: {...},        │
   │     reasoning: {...}        │
   │   }                         │
   │ }                           │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ Store存储（内存）            │
   │  - useTeachingStore         │
   │  - useCaseManagementStore   │
   └──────┬──────────────────────┘
          ↓
   [用户学习过程]
          ↓

2️⃣ 数据增强阶段（第二幕）
   ┌─────────────────────────────┐
   │ AI生成故事章节               │
   │ CaseNarrativeService        │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ storyChapters[]             │
   │ [                           │
   │   {                         │
   │     id: 'chapter-1',        │
   │     title: '案情缘起',      │
   │     content: '...',         │
   │     icon: '📋'              │
   │   },                        │
   │   ...                       │
   │ ]                           │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ Store存储                    │
   │ useTeachingStore.           │
   │   storyChapters             │
   └──────┬──────────────────────┘
          ↓

3️⃣ 数据持久化阶段（完成学习）
   ┌─────────────────────────────┐
   │ 用户点击"完成学习"           │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ SnapshotConverter.          │
   │   toDatabase(stores)        │
   │                             │
   │ 转换所有Store数据为：        │
   │  - act1_upload (JSONB)      │
   │  - act2_analysis (JSONB)    │
   │  - act3_socratic (JSONB)    │
   │  - act4_summary (JSONB)     │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ PostgreSQL                  │
   │ teaching_sessions表         │
   │                             │
   │ INSERT INTO                 │
   │   teaching_sessions(...)    │
   └──────┬──────────────────────┘
          ↓
   [数据已保存到数据库]

4️⃣ 数据恢复阶段（查看历史记录）
   ┌─────────────────────────────┐
   │ 用户访问：                   │
   │ /dashboard/my-courseware/   │
   │   [id]                      │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ API调用：                    │
   │ GET /api/teaching-sessions/ │
   │   [id]                      │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ 从PostgreSQL读取快照         │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ SnapshotConverter.          │
   │   toStore(snapshot)         │
   │                             │
   │ 还原数据为Store格式          │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ 恢复到Zustand Store         │
   │  - setExtractedElements()   │
   │  - setAnalysisResult()      │
   │  - setStoryChapters() ✅    │
   │  - setCaseLearningReport()  │
   │  - setCurrentCase()         │
   └──────┬──────────────────────┘
          ↓
   ┌─────────────────────────────┐
   │ 跳转到四幕界面               │
   │ router.push('/dashboard/    │
   │   judgment')                │
   └─────────────────────────────┘
```

### 🗄️ Store数据结构

```typescript
┌────────────────────────────────────────────────────────────┐
│                    useTeachingStore                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  uploadData: {                                             │
│    extractedElements: Record<string, unknown> | null       │
│    confidence: number                                      │
│  }                                                         │
│                                                            │
│  analysisData: {                                           │
│    result: DeepAnalysisResult | null                      │
│    isAnalyzing: boolean                                    │
│  }                                                         │
│                                                            │
│  storyChapters: StoryChapter[]  // ✅ 第二幕AI叙事        │
│                                                            │
│  socraticData: {                                           │
│    isActive: boolean                                       │
│    level: 1 | 2 | 3                                        │
│    completedNodes: Set<string>                             │
│  }                                                         │
│                                                            │
│  summaryData: {                                            │
│    caseLearningReport: CaseLearningReport | null           │
│    isGenerating: boolean                                   │
│  }                                                         │
│                                                            │
│  currentAct: 'upload' | 'analysis' | 'socratic' |          │
│              'summary'                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│               useCaseManagementStore                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  currentCase: LegalCase | null                             │
│    {                                                       │
│      id: string                                            │
│      basicInfo: BasicInfo                                  │
│      threeElements: ThreeElements                          │
│      timeline: TimelineEvent[]                             │
│      metadata: CaseMetadata                                │
│    }                                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│            useSocraticDialogueStore                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  messages: Message[]                                       │
│  currentLevel: DialogueLevel                               │
│  currentMode: DialogueMode                                 │
│  isLoading: boolean                                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## API接口清单

### 📡 完整API列表

| 端点 | 方法 | 功能 | 服务 |
|------|------|------|------|
| **认证相关** | | | |
| `/api/auth/login` | POST | 用户登录 | - |
| `/api/auth/logout` | POST | 用户登出 | - |
| `/api/auth/session` | GET | 获取会话 | - |
| **案例提取** | | | |
| `/api/legal-intelligence/extract` | POST | 提取判决书三要素 | JudgmentExtractionService |
| **深度分析** | | | |
| `/api/legal-analysis` | POST | 综合法律分析 | LegalAnalysisFacade |
| `/api/legal-analysis/intelligent-narrative` | POST | AI智能叙事生成 | CaseNarrativeService |
| `/api/legal-analysis/stream` | POST | 流式分析（SSE） | - |
| `/api/legal-analysis/event-claim` | POST | 事件请求权分析 | - |
| **时间轴分析** | | | |
| `/api/timeline-analysis` | POST | 时间轴事件分析 | TimelineAnalysisService |
| **争议分析** | | | |
| `/api/dispute-analysis` | POST | 争议焦点分析 | DisputeAnalysisService |
| **证据质量** | | | |
| `/api/evidence-quality` | POST | 证据质量评估 | EvidenceIntelligenceService |
| **苏格拉底对话** | | | |
| `/api/socratic` | POST | 苏格拉底对话 | SocraticDialogueService |
| `/api/socratic/stream-test` | POST | 流式对话测试 | - |
| `/api/socratic/view-prompt` | POST | 查看提示词 | - |
| **教学会话** | | | |
| `/api/teaching-sessions` | GET | 获取会话列表 | - |
| `/api/teaching-sessions` | POST | 保存教学会话 | SnapshotConverter |
| `/api/teaching-sessions/[id]` | GET | 获取会话详情 | SnapshotConverter |
| **总结生成** | | | |
| `/api/teaching-acts/summary` | POST | 生成学习总结 | SummaryGenerationService |
| **PPT生成** | | | |
| `/api/ppt` | POST | 生成课件PPT | PptGeneratorService |
| **课堂管理** | | | |
| `/api/classroom/[code]/check` | POST | 检查课堂代码 | - |
| `/api/classroom/[code]/question` | POST | 课堂提问 | - |
| **健康检查** | | | |
| `/api/health` | GET | 系统健康检查 | - |
| `/api/health/socratic` | GET | Socratic服务检查 | - |

### 🔑 关键API详解

#### 1. 案例提取 API

```http
POST /api/legal-intelligence/extract

Request Body:
{
  "documentText": "判决书全文...",
  "extractionMethod": "hybrid" | "pure-ai" | "rule-enhanced"
}

Response:
{
  "success": true,
  "data": {
    "basicInfo": {
      "caseNumber": "（2023）京0105民初12345号",
      "court": "北京市朝阳区人民法院",
      "judgeDate": "2023-05-15",
      "parties": {
        "plaintiff": [{ name: "张三" }],
        "defendant": [{ name: "李四" }]
      }
    },
    "threeElements": {
      "facts": { ... },
      "evidence": { ... },
      "reasoning": { ... }
    },
    "confidence": 85,
    "processingTime": 2340
  }
}
```

#### 2. AI智能叙事 API

```http
POST /api/legal-analysis/intelligent-narrative

Request Body:
{
  "caseData": {
    "basicInfo": { ... },
    "threeElements": { ... }
  },
  "depth": "basic" | "detailed" | "comprehensive",
  "narrativeStyle": "story"
}

Response:
{
  "success": true,
  "chapters": [
    {
      "id": "chapter-1",
      "title": "案情缘起",
      "content": "2023年初，原告张三与被告李四因...",
      "icon": "📋",
      "color": "blue",
      "timelineEvents": ["event-1", "event-2"],
      "legalSignificance": "该案涉及..."
    },
    // ... 更多章节
  ],
  "metadata": {
    "generatedAt": "2023-05-15T10:30:00Z",
    "processingTime": 3500,
    "confidence": 90,
    "model": "deepseek-chat-narrative"
  }
}
```

#### 3. 教学会话保存 API

```http
POST /api/teaching-sessions

Request Body:
{
  "caseTitle": "张三诉李四买卖合同纠纷案",
  "caseNumber": "（2023）京0105民初12345号",
  "snapshot": {
    "uploadData": { ... },
    "analysisData": { ... },
    "storyChapters": [ ... ],  // ✅ 包含AI叙事
    "socraticData": { ... },
    "summaryData": { ... }
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid-xxx-xxx",
    "caseTitle": "张三诉李四买卖合同纠纷案",
    "createdAt": "2023-05-15T10:30:00Z"
  }
}
```

#### 4. 教学会话恢复 API

```http
GET /api/teaching-sessions/[id]

Response:
{
  "success": true,
  "data": {
    "id": "uuid-xxx-xxx",
    "caseTitle": "张三诉李四买卖合同纠纷案",
    "caseNumber": "（2023）京0105民初12345号",
    "act1_upload": {
      "extractedElements": { ... },
      "confidence": 85
    },
    "act2_analysis": {
      "result": { ... },
      "storyChapters": [ ... ]  // ✅ AI叙事章节
    },
    "act3_socratic": { ... },
    "act4_summary": {
      "caseLearningReport": { ... }
    },
    "createdAt": "2023-05-15T10:30:00Z",
    "updatedAt": "2023-05-15T12:45:00Z"
  }
}
```

---

## 状态管理（Store）

### 🏪 Store架构图

```
┌─────────────────────────────────────────────────────────┐
│                   Zustand Store生态                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────┐                                │
│  │ useTeachingStore   │  ◀─── 核心Store                │
│  │                    │                                 │
│  │ • 四幕状态管理      │                                 │
│  │ • 教学进度追踪      │                                 │
│  │ • 数据缓存         │                                 │
│  │ • 快照序列化       │                                 │
│  └─────────┬──────────┘                                │
│            │                                            │
│  ┌─────────▼─────────────────────────┐                │
│  │  Zustand Middleware                │                │
│  │  ┌──────────┐  ┌──────────────┐  │                │
│  │  │  immer   │  │   persist    │  │                │
│  │  │（不可变） │  │（LocalStorage）│  │                │
│  │  └──────────┘  └──────────────┘  │                │
│  └────────────────────────────────┘                │
│                                                         │
│  ┌────────────────────┐                                │
│  │ useCaseManagement  │  ◀─── 案例管理                 │
│  │    Store           │                                │
│  │                    │                                 │
│  │ • 当前案例         │                                 │
│  │ • 案例列表         │                                 │
│  └────────────────────┘                                │
│                                                         │
│  ┌────────────────────┐                                │
│  │ useSocraticDialogue│  ◀─── 对话管理                 │
│  │    Store           │                                │
│  │                    │                                 │
│  │ • 对话历史         │                                 │
│  │ • 教学层级         │                                 │
│  │ • 知识节点         │                                 │
│  └────────────────────┘                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 数据持久化策略

| Store | 持久化 | 存储位置 | 说明 |
|-------|--------|---------|------|
| useTeachingStore | ✅ 是 | localStorage | 会话期间保持，刷新不丢失 |
| useCaseManagementStore | ✅ 是 | localStorage | 保存当前案例 |
| useSocraticDialogueStore | ⚠️ 部分 | - | 仅内存，页面刷新会丢失 |

---

## 快照存储机制

### 📸 快照系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      快照转换器                              │
│                  (SnapshotConverter)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  两个核心方法：                                              │
│                                                             │
│  1️⃣ toDatabase(stores) → DatabaseSnapshot                 │
│     功能：将Zustand Store序列化为数据库格式                 │
│                                                             │
│     输入：                                                  │
│     ┌─────────────────────────────┐                        │
│     │ useTeachingStore.getState() │                        │
│     │ useCaseManagementStore.     │                        │
│     │   getState()                │                        │
│     └─────────────────────────────┘                        │
│              ↓                                              │
│     处理：                                                  │
│     • 提取extractedElements → act1_upload                  │
│     • 提取analysisResult + storyChapters → act2_analysis   │
│     • 提取socraticData → act3_socratic                     │
│     • 提取caseLearningReport → act4_summary                │
│              ↓                                              │
│     输出：                                                  │
│     ┌─────────────────────────────┐                        │
│     │ {                           │                        │
│     │   act1_upload: JSONB,       │                        │
│     │   act2_analysis: JSONB,     │                        │
│     │   act3_socratic: JSONB,     │                        │
│     │   act4_summary: JSONB       │                        │
│     │ }                           │                        │
│     └─────────────────────────────┘                        │
│                                                             │
│  2️⃣ toStore(snapshot) → StoreData                         │
│     功能：将数据库快照反序列化为Store格式                   │
│                                                             │
│     输入：                                                  │
│     ┌─────────────────────────────┐                        │
│     │ {                           │                        │
│     │   act1_upload: {...},       │                        │
│     │   act2_analysis: {...},     │                        │
│     │   act3_socratic: {...},     │                        │
│     │   act4_summary: {...}       │                        │
│     │ }                           │                        │
│     └─────────────────────────────┘                        │
│              ↓                                              │
│     处理：                                                  │
│     • 还原extractedElements                                │
│     • 还原analysisResult                                   │
│     • 还原storyChapters ✅                                 │
│     • 还原caseLearningReport                               │
│              ↓                                              │
│     输出：                                                  │
│     ┌─────────────────────────────┐                        │
│     │ {                           │                        │
│     │   uploadData: {...},        │                        │
│     │   analysisData: {...},      │                        │
│     │   storyChapters: [...],     │                        │
│     │   summaryData: {...}        │                        │
│     │ }                           │                        │
│     └─────────────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 快照保存与恢复流程

**保存流程**:
```
用户点击"完成学习"
    ↓
调用 SnapshotConverter.toDatabase()
    ↓
将Store状态转换为JSONB格式
    ↓
POST /api/teaching-sessions
    ↓
存入PostgreSQL teaching_sessions表
```

**恢复流程**:
```
用户访问 /dashboard/my-courseware/[id]
    ↓
GET /api/teaching-sessions/[id]
    ↓
调用 SnapshotConverter.toStore()
    ↓
恢复各个Store状态：
  - setExtractedElements()
  - setAnalysisResult()
  - setStoryChapters() ✅
  - setCaseLearningReport()
  - setCurrentCase()
    ↓
跳转到 /dashboard/judgment（四幕界面）
```

---

## 数据库设计

### 🗄️ PostgreSQL Schema

#### teaching_sessions表

```sql
CREATE TABLE teaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 元数据
  case_title VARCHAR(500) NOT NULL,
  case_number VARCHAR(100),
  user_id UUID REFERENCES users(id),

  -- 四幕快照（JSONB）
  act1_upload JSONB,      -- 第一幕：案例导入数据
  act2_analysis JSONB,    -- 第二幕：分析结果 + storyChapters
  act3_socratic JSONB,    -- 第三幕：对话历史
  act4_summary JSONB,     -- 第四幕：学习总结

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 索引
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at DESC)
);
```

#### act2_analysis 数据结构

```json
{
  "result": {
    "timeline": [...],
    "disputePoints": [...],
    "evidenceMapping": [...],
    "narrative": {
      "chapters": [  // ✅ AI故事章节
        {
          "id": "chapter-1",
          "title": "案情缘起",
          "content": "...",
          "icon": "📋",
          "color": "blue"
        },
        ...
      ]
    }
  },
  "storyChapters": [...]  // ⚠️ 冗余存储（待优化）
}
```

---

## 当前问题分析

### ❌ 已发现的问题

#### 1. **快照恢复不完整** ✅ 已修复

**问题描述**:
- 用户反馈："第二幕依旧在调用AI分析"
- 根本原因：storyChapters未被恢复到Store

**修复方案**:
```typescript
// app/dashboard/my-courseware/[id]/page.tsx (lines 155-161)
if (storeData.storyChapters && storeData.storyChapters.length > 0) {
  useTeachingStore.getState().setStoryChapters(storeData.storyChapters)
  console.log('✅ [SessionDetail] storyChapters已恢复')
}
```

**状态**: ✅ 已在最新commit中修复

---

#### 2. **类型系统混乱** ⚠️ 部分修复

**问题描述**:
- 存在两个版本的LegalCase定义
- 旧版本（types/legal-case.ts）包含threeElements
- 新版本（src/types/domains/case-management.ts）不包含

**影响**:
- 导致类型错误
- 代码可维护性降低

**修复方案**:
```typescript
// src/types/index.ts
// 明确导出旧版本LegalCase，保持向后兼容
export type {
  LegalCase,
  ThreeElements,
  // ...
} from '../../types/legal-case';
```

**状态**: ⚠️ 临时方案，建议长期统一类型定义

---

#### 3. **数据冗余存储** ⚠️ 待优化

**问题描述**:
```json
// act2_analysis中同时存在：
{
  "result": {
    "narrative": {
      "chapters": [...]  // 位置1
    }
  },
  "storyChapters": [...]   // 位置2（冗余）
}
```

**建议**:
- 统一存储位置
- 减少数据冗余

---

#### 4. **LegalAnalysisFacade类型错误** ❌ 未修复

**问题**:
- 9个类型不匹配错误
- 涉及多个接口定义冲突

**状态**: ❌ 需要深入重构

---

#### 5. **未使用导出过多** ⚠️ 持续清理中

**当前进度**:
- ✅ src/types/index.ts (清理30+个)
- ✅ lib/types/socratic/index.ts (清理48个)
- ⏭️ src/domains/stores.ts (44个待清理)
- ⏭️ types/legal-case.ts (40个待清理)

---

## 优化建议

### 🎯 短期优化（1-2周）

#### 1. 统一LegalCase类型定义

**目标**: 消除类型冲突

**方案**:
```typescript
// 建议统一使用新版本定义
// src/types/domains/case-management.ts
export const LegalCaseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  basicInfo: BasicInfoSchema,
  threeElements: ThreeElementsSchema,  // 添加此字段
  timeline: z.array(TimelineEventSchema),
  metadata: CaseMetadataSchema
});
```

**影响**: 需要全局搜索替换imports

---

#### 2. 优化快照数据结构

**当前问题**: storyChapters存储在两个位置

**建议方案**:
```typescript
// SnapshotConverter.toDatabase()
{
  act2_analysis: {
    result: analysisResult,
    // 移除冗余的storyChapters，统一从narrative.chapters读取
  }
}

// SnapshotConverter.toStore()
const storyChapters =
  snapshot.act2_analysis?.result?.narrative?.chapters || [];
```

---

#### 3. 添加数据验证

**建议**:
```typescript
// 使用Zod schema验证快照数据
const SnapshotSchema = z.object({
  act1_upload: z.object({
    extractedElements: z.record(z.unknown()),
    confidence: z.number()
  }).optional(),
  act2_analysis: z.object({
    result: DeepAnalysisResultSchema,
  }).optional(),
  // ...
});

// 在恢复时验证
export function toStore(snapshot: DatabaseSnapshot): StoreData {
  const validated = SnapshotSchema.parse(snapshot);
  // ...
}
```

---

### 🚀 中期优化（1-2个月）

#### 1. 实现增量保存

**当前**: 只有"完成学习"才保存

**建议**: 每幕完成后自动保存
```typescript
// useTeachingStore
markActComplete: (act: ActType) => {
  set(state => {
    state.progress.completedActs.add(act);
  });

  // 自动保存快照
  saveSessionSnapshot();
}
```

---

#### 2. 添加版本控制

**建议**: 快照增加版本号
```sql
ALTER TABLE teaching_sessions
  ADD COLUMN snapshot_version VARCHAR(10) DEFAULT 'v1.0';
```

**好处**:
- 支持数据迁移
- 向后兼容
- 便于升级

---

#### 3. 性能优化

**问题**: 大型案例JSON体积大

**建议**:
- 压缩JSONB
- 分离大型字段到专用表
- 添加缓存层（Redis）

---

### 🌟 长期优化（3-6个月）

#### 1. 微服务架构

**建议拆分**:
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Web App   │  │ AI Service  │  │   Storage   │
│  (Next.js)  │◄─│ (DeepSeek)  │◄─│ (Postgres)  │
└─────────────┘  └─────────────┘  └─────────────┘
      ↑                  ↑
      └──────────────────┘
         GraphQL/gRPC
```

---

#### 2. 实时协作功能

**建议**: 使用WebSocket支持：
- 多用户同时学习同一案例
- 实时共享笔记
- 课堂互动

---

#### 3. AI能力增强

**建议**:
- 多模型支持（GPT-4, Claude等）
- 本地模型部署
- 个性化学习路径

---

## 总结

### ✅ 系统优势

1. **清晰的四幕教学流程**
2. **完善的数据流转机制**
3. **灵活的状态管理**
4. **AI深度集成**

### ⚠️ 需要改进

1. **类型系统统一**
2. **数据结构优化**
3. **性能提升**
4. **测试覆盖**

### 🎯 下一步行动

1. ✅ 完成storyChapters恢复（已完成）
2. ⏭️ 测试快照功能
3. ⏭️ 统一类型定义
4. ⏭️ 优化数据存储

---

**文档维护**: 请在架构变更时及时更新此文档
