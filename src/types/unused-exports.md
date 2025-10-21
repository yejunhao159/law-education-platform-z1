# 未使用的类型导出清理记录

**清理日期**: 2025-10-21
**工具**: ts-prune
**清理范围**: src/types/index.ts

## 📊 清理统计

- **清理前**: 119个导出
- **清理后**: 仅保留实际使用的导出
- **移除数量**: ~30个未使用导出

## 🗑️ 已移除的未使用导出

以下导出经ts-prune验证后确认未被任何代码引用，已从src/types/index.ts中移除：

### 根目录类型
- `LawReference` - 法律引用类型
- `LegalParty` - 法律当事方类型（别名）
- `ExtractedData` - 提取数据类型
- `DateElement` - 日期元素
- `Amount` - 金额类型
- `LegalClause` - 法律条款
- `FactElement` - 事实元素
- `DocumentMetadata` - 文档元数据

### 域类型别名
- `Facts` - 事实类型（已通过domains导出）
- `Evidence` - 证据类型（已通过domains导出）
- `EvidenceItem` - 证据项
- `Reasoning` - 说理类型
- `LegalAnalysis` - 法律分析
- `Message` - 消息类型
- `ActState` - 幕状态
- `ActType` - 幕类型

### 组合类型
- `CaseWithAnalysis` - 带分析的案例
- `TeachingContext` - 教学上下文
- `AppState` - 应用状态
- `ApiEndpoints` - API端点接口

## ✅ 保留的导出

以下导出在代码中有实际引用，已保留：

### 通配符导出（星号导出）
- `export * from './shared/base'` - 基础共享类型
- `export * from './domains/case-management'` - 案例管理域
- `export * from './domains/legal-analysis'` - 法律分析域
- `export * from './domains/socratic-dialogue'` - 苏格拉底对话域
- `export * from './domains/teaching-acts'` - 教学行为域

### 具名导出
- `LegalCase` - 法律案例（在模块内部被使用）
- `ThreeElements` - 三要素（在模块内部被使用）
- `TimelineAnalysis` - 时间轴分析（在模块内部被使用）
- `DialogueSession` - 对话会话（在模块内部被使用）
- `SocraticRequest` - 苏格拉底请求（在模块内部被使用）
- `SocraticResponse` - 苏格拉底响应（在模块内部被使用）
- `TeachingSession` - 教学会话（在模块内部被使用）
- `TeachingProgress` - 教学进度（在模块内部被使用）

## 🔄 如何恢复

如果未来需要这些类型，可以：

1. 直接从原始域文件导入：
   ```typescript
   import type { Facts, Evidence } from './domains/legal-analysis';
   ```

2. 或者从根类型文件导入：
   ```typescript
   import type { Party, LawReference } from '../../types/legal-case';
   ```

## 📝 注意事项

- 通配符导出（`export * from ...`）会导出子模块的所有类型，但ts-prune无法准确跟踪
- 某些类型标记为"used in module"表示在文件内部被引用（如作为其他类型的组成部分）
- Next.js约定式文件（app/layout.tsx等）的导出会被ts-prune误报，已排除

## 🎯 清理进度

按优先级排序：
1. ✅ `src/types/index.ts` - 已完成（2025-01-21）
2. ✅ `lib/types/socratic/index.ts` - 已完成（2025-01-21）
3. ⏭️ `src/domains/stores.ts` - 44项待清理
4. ⏭️ `src/domains/socratic-dialogue/types/index.ts` - 42项待清理
5. ⏭️ `types/legal-case.ts` - 40项待清理
6. ⏭️ `src/domains/legal-analysis/types/index.ts` - 37项待清理

---

## 📋 清理记录 #2: lib/types/socratic/index.ts

**清理日期**: 2025-01-21
**清理前**: 101行，49个导出
**清理后**: 45行，1个导出
**减少幅度**: 代码-55%，导出-98%

### 保留的导出
- `ClassroomSession` - 被2个组件使用：
  - components/socratic/TeacherSocratic.tsx
  - components/socratic/ClassroomCode.tsx

### 移除的未使用导出 (48个)

#### 对话类型 (lib/types/socratic/dialogue)
- `MessageRole`, `DialogueLevel`, `ControlMode`, `Difficulty`
- `MessageMetadata`, `Message`, `Performance`, `DialogueState`, `DialogueMetrics`
- `LevelConfig`, `PromptTemplate`, `LEVEL_CONFIG`

#### 课堂管理 (lib/types/socratic/classroom)
- `SessionMode`, `StudentInfo`, `VoteChoice`, `VoteData`
- `SESSION_EXPIRY_TIME`, `CLASSROOM_CODE_LENGTH`

#### AI服务 (lib/types/socratic/ai-service)
- `SocraticDifficultyLevel`, `SocraticMode`, `SocraticDifficulty`, `SocraticErrorCode`
- `SocraticMessage`, `SocraticSession`, `SocraticSessionMetadata`
- `SocraticRequest`, `SocraticGenerateRequest`, `SocraticResponse`
- `SocraticResponseData`, `SocraticResponseMetadata`, `SocraticError`
- `SocraticPerformanceData`, `SocraticConfig`
- `AIRequest`, `AIResponse`, `PerformanceMetrics`, `FallbackMetrics`

#### 案例管理 (lib/types/socratic/case)
- `CaseInfo`, `AgentSettings`, `AgentContext`, `AgentResponse`
- `CachedResponse`, `CacheStats`
- `DEFAULT_AGENT_SETTINGS`, `CACHE_SIMILARITY_THRESHOLD`

#### 日志 (lib/types/socratic)
- `LogLevel`, `LogEntry`, `LogContext`

### 重要发现

**为什么这么多未使用导出？**
1. **架构迁移**：项目已迁移到新的类型系统（`src/domains/socratic-dialogue/types/`）
2. **遗留代码**：`lib/types/socratic/` 主要用于向后兼容
3. **过度导出**：索引文件导出了所有子模块类型，但实际只用了1个

**影响分析**：
- ✅ 无破坏性变更（保留了唯一使用的类型）
- ✅ 类型错误从249个减少到242个（修复了7个错误）
- ✅ 提高可维护性（明确哪些类型实际在用）

**如何恢复**：
如需使用已移除的类型，请直接从原始文件导入：
```typescript
// 示例：需要使用MessageRole
import { MessageRole } from '@/lib/types/socratic/dialogue';

// 更好的做法：使用新的类型系统
import { MessageRole } from '@/src/domains/socratic-dialogue/types';
```

### 清理效果

| 指标 | 清理前 | 清理后 | 改善 |
|------|--------|--------|------|
| 代码行数 | 101行 | 45行 | -55% |
| 导出数量 | 49个 | 1个 | -98% |
| 类型错误 | 249个 | 242个 | -7个 |
| 使用率 | 2% | 100% | +98% |

---
