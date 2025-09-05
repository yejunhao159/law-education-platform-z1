# Design Document

## Architecture

### Component Structure (Simplified 4-Act Flow)

法律教育平台采用精简的4幕教学流程，移除了冗余的交互功能：

```
├── Act 1: 案例导入 (Upload)
│   └── ThreeElementsExtractor - 智能解析判决书
├── Act 2: 深度分析 (Analysis) 
│   ├── Act2CaseIntro - 案件概况
│   └── Act4FocusAnalysis - 争议焦点
├── Act 3: 苏格拉底讨论 (Socratic)
│   └── Act5SocraticDiscussion - AI引导式对话
└── Act 4: 总结提升 (Summary)
    └── Act6JudgmentSummary - 学习报告生成
```

**已移除组件**：
- ~~Act3FactDetermination~~ - 快速编辑和数据流转功能（用户反馈：多余且复杂）

### Deep Analysis Component Design (Simplified)

深度分析模块从原有的3个标签页简化为线性流式布局：

```typescript
// 原设计（已废弃）
tabs = ['facts', 'evidence', 'focus'] // 太多标签，重复内容

// 新设计（简化版）
sections = [
  '案件概况',    // Act2CaseIntro
  '争议焦点',    // Act4FocusAnalysis  
  '关键证据',    // 筛选后的高可信度证据
  '裁判要点'     // 法官说理精华
]
```

### State Management

使用Zustand管理全局状态，保持简洁：

```typescript
interface CaseStore {
  caseData: CaseData | null
  currentAct: string
  analysisComplete: boolean // 新增：跟踪分析完成状态
  socraticLevel: number
  setCurrentAct: (act: string) => void
  markActComplete: (act: string) => void
}
```

### API Integration

#### DeepSeek Integration for Socratic Dialogue

```typescript
// /app/api/socratic-deepseek/route.ts
interface SocraticRequest {
  caseContext: string
  currentLevel: string
  userInput: string
  history: Message[]
}

interface SocraticResponse {
  question: string     // AI生成的追问
  hints: string[]      // 思考提示
  shouldProgress: boolean // 是否进入下一层级
}
```

### UI/UX Improvements

1. **移除Tabs组件** - 改为垂直Card布局，减少认知负担
2. **简化交互流程** - 一键完成分析，无需多次切换
3. **精简内容展示** - 只显示核心要素，移除重复信息
4. **统一视觉层级** - 使用一致的Card和图标系统

### Performance Optimizations

1. **组件懒加载** - 继续使用React.lazy()
2. **减少渲染次数** - 移除tabs切换带来的重复渲染
3. **简化状态管理** - 移除completedTabs等复杂状态

### Decision Rationale

**为什么删除Act3FactDetermination？**
- 用户反馈：快速编辑功能使用率低
- 数据流转功能与其他模块重复
- 增加了不必要的复杂度
- 影响核心教学流程的流畅性

**为什么简化Deep Analysis？**
- 3个tabs切换繁琐
- 内容存在重复
- 线性流更符合教学逻辑
- 提升用户体验

### Future Considerations

1. **可扩展性** - 保留模块化结构，便于后续添加新功能
2. **教师定制** - 预留接口供教师自定义分析重点
3. **AI增强** - 深度分析可由AI自动生成摘要
4. **数据分析** - 收集用户行为数据优化流程