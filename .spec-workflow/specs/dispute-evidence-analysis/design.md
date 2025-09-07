# Design Document

## Overview

争议焦点与证据质证分析系统的设计以**用户体验优先**为核心原则，通过现代化的拖拽交互、动画反馈、渐进式内容展示等技术手段，将复杂的法律分析转化为直观易懂的交互体验。系统将充分复用现有组件和服务，采用增量式开发策略。

## Steering Document Alignment

### Technical Standards (tech.md)
项目采用Next.js 15 + React 19的最新技术栈，遵循以下标准：
- TypeScript严格类型检查
- Zustand状态管理模式
- Tailwind CSS样式系统
- 组件化开发原则

### Project Structure (structure.md)
遵循现有项目结构：
- `/components/acts/` - 第二幕相关组件
- `/lib/ai-*.ts` - AI服务层
- `/lib/stores/` - Zustand状态管理
- `/types/` - TypeScript类型定义

## Code Reuse Analysis

### Existing Components to Leverage
- **Card, Badge, Button** (shadcn/ui): 复用现有UI组件保持视觉一致性
- **useCaseStore** (Zustand): 扩展现有store添加争议和证据状态
- **DeepSeekLegalAgent**: 复用AI分析服务，添加争议提取方法
- **ErrorBoundary**: 复用错误处理组件

### Integration Points
- **现有时间轴系统**: 争议焦点可作为时间轴的补充视角
- **AI分析API**: 扩展现有的`/api/legal-analysis`端点
- **缓存系统**: 复用`analysis-cache.ts`的缓存策略

## Architecture

采用分层架构设计，确保各层职责清晰：

### Modular Design Principles
- **单一职责**: 每个组件只负责一个功能领域
- **组件隔离**: 争议卡片、证据卡片等独立开发和测试
- **服务层分离**: AI分析逻辑与UI展示完全解耦
- **状态管理集中**: 所有交互状态统一由Zustand管理

```mermaid
graph TD
    subgraph "UI Layer"
        DC[DisputeCards]
        EC[EvidenceCards]
        QD[QualityDialog]
    end
    
    subgraph "State Layer"
        DS[DisputeStore]
        ES[EvidenceStore]
        IS[InteractionStore]
    end
    
    subgraph "Service Layer"
        DAS[DisputeAnalysisService]
        EMS[EvidenceMappingService]
        CS[CacheService]
    end
    
    subgraph "API Layer"
        LAE[/api/legal-analysis]
        DAE[/api/dispute-analysis]
    end
    
    DC --> DS
    EC --> ES
    QD --> IS
    
    DS --> DAS
    ES --> EMS
    
    DAS --> LAE
    EMS --> DAE
    
    DAS --> CS
    EMS --> CS
```

## Components and Interfaces

### DisputeFocusAnalyzer
- **Purpose:** 智能分析和展示案件争议焦点
- **Interfaces:** 
  ```typescript
  interface DisputeFocusAnalyzerProps {
    caseId: string
    mode: 'view' | 'practice'
    difficulty: 'basic' | 'advanced' | 'professional'
    onAnalysisComplete?: (disputes: Dispute[]) => void
  }
  ```
- **Dependencies:** @dnd-kit/core, framer-motion, DeepSeekService
- **Reuses:** Card, Badge, Button组件

### EvidenceQualitySystem
- **Purpose:** 证据质证的交互式展示和练习
- **Interfaces:**
  ```typescript
  interface EvidenceQualitySystemProps {
    evidences: Evidence[]
    claimElements: ClaimElement[]
    mode: 'watch' | 'practice'
    onComplete?: (result: QualityResult) => void
  }
  ```
- **Dependencies:** @dnd-kit/sortable, framer-motion
- **Reuses:** 现有Evidence类型，扩展交互属性

### InteractiveCard
- **Purpose:** 可拖拽、可翻转的通用卡片组件
- **Interfaces:**
  ```typescript
  interface InteractiveCardProps {
    frontContent: ReactNode
    backContent?: ReactNode
    draggable?: boolean
    flippable?: boolean
    onDrop?: (target: string) => void
  }
  ```
- **Dependencies:** @dnd-kit/core, framer-motion
- **Reuses:** 基础Card组件样式

## Data Models

### DisputeFocus
```typescript
interface DisputeFocus {
  id: string
  content: string
  plaintiffView: string
  defendantView: string
  courtView: string
  claimBasis: ClaimBasis[]  // 关联的请求权基础
  difficulty: 'basic' | 'advanced' | 'professional'
  teachingValue: 'high' | 'medium' | 'low'
  relatedLaws: LawReference[]
  createdAt: string
}
```

### EvidenceQuality
```typescript
interface EvidenceQuality {
  id: string
  evidenceId: string
  authenticity: number  // 真实性评分 0-100
  relevance: number     // 关联性评分 0-100
  legality: number      // 合法性评分 0-100
  supportedElements: string[]  // 支持的请求权要件ID
  challengePoints: string[]     // 质疑点
  aiAnalysis?: string
}
```

### InteractionState
```typescript
interface InteractionState {
  draggedItem: string | null
  dropTarget: string | null
  flippedCards: Set<string>
  completedMappings: Map<string, string>
  score: number
  feedback: FeedbackMessage[]
}
```

## Technical Stack Decisions

基于2024年最新技术研究：

### 拖拽库选择：@dnd-kit
- **原因**: 性能最优、自定义能力强、内置无障碍支持
- **配置**: 使用sensors API实现触摸和鼠标兼容
- **优化**: 使用CSS transform避免重排

### 动画库选择：Framer Motion
- **原因**: 已在项目中使用、性能优秀、API简洁
- **配置**: 使用GPU加速的transform动画
- **优化**: 使用willChange提示浏览器优化

### 状态管理：Zustand
- **原因**: 项目已采用、轻量级、TypeScript友好
- **配置**: 创建独立的slice管理交互状态

## Error Handling

### Error Scenarios
1. **AI分析失败**
   - **Handling:** 降级到基础展示模式，显示缓存数据
   - **User Impact:** 看到"AI分析暂时不可用"提示，但基础功能正常

2. **拖拽操作失败**
   - **Handling:** 自动恢复到拖拽前状态
   - **User Impact:** 看到"操作失败，请重试"的toast提示

3. **网络中断**
   - **Handling:** 启用离线模式，使用本地存储
   - **User Impact:** 看到"离线模式"标识，部分功能受限

## Performance Optimizations

### 关键性能指标
- 拖拽响应时间 < 16ms (60fps)
- AI分析首字节时间 < 3s
- 页面可交互时间 < 2s

### 优化策略
1. **虚拟化长列表**: 使用react-window处理大量证据
2. **懒加载**: 练习模式按需加载
3. **防抖搜索**: 争议搜索输入防抖300ms
4. **缓存策略**: 
   - AI分析结果缓存24小时
   - 用户交互状态本地存储
5. **动画优化**:
   - 使用transform代替position
   - 开启GPU加速
   - 低端设备自动降级

## Testing Strategy

### Unit Testing
- 测试DisputeAnalysisService的争议提取逻辑
- 测试EvidenceMappingService的映射算法
- 测试拖拽状态管理的各种场景

### Integration Testing
- 测试完整的拖拽流程
- 测试AI分析与UI更新的集成
- 测试错误恢复机制

### End-to-End Testing
- 测试老师备课流程
- 测试学生练习流程
- 测试模式切换和难度调节