# Tasks Document

## Phase 1: 准备工作和类型定义

- [x] 1. 创建统一时间轴的类型定义
  - File: types/timeline-claim-analysis.ts
  - 定义TimelineEvent扩展接口（包含请求权字段）
  - 定义ClaimAnalysisResult、ClaimStructure等核心类型
  - Purpose: 为整个功能建立类型安全基础
  - _Leverage: types/legal-case.ts_
  - _Requirements: 2.1, 3.1_

- [x] 2. 扩展Zustand store以支持请求权分析状态
  - File: lib/stores/useCaseStore.ts (修改现有)
  - 添加claimAnalysis状态分支
  - 添加setClaimAnalysis、clearClaimAnalysis等actions
  - Purpose: 统一管理请求权分析相关状态
  - _Leverage: 现有的useCaseStore结构_
  - _Requirements: 1.1, 2.1_

## Phase 2: 组件重构和合并

- [x] 3. 创建UnifiedTimeline组件目录结构
  - File: components/acts/UnifiedTimeline/index.tsx
  - 创建主组件框架，协调子组件
  - 设置props接口和默认值
  - Purpose: 建立统一时间轴组件的入口
  - _Leverage: components/acts/TimelineAIAnalysis.tsx_
  - _Requirements: 1.1, 1.2_

- [x] 4. 实现TimelineView子组件
  - File: components/acts/UnifiedTimeline/TimelineView.tsx
  - 合并CaseTimelineSimplified和Enhanced的渲染逻辑
  - 实现简化/增强视图切换
  - Purpose: 统一时间轴的视觉展示
  - _Leverage: CaseTimelineSimplified.tsx, CaseTimelineEnhanced.tsx_
  - _Requirements: 1.1, 1.3_

- [x] 5. 创建TimelineNode组件支持请求权标注
  - File: components/acts/UnifiedTimeline/TimelineNode.tsx
  - 扩展节点组件以显示请求权基础标签
  - 添加法律关系变化的视觉标记
  - Purpose: 在时间节点上展示法律信息
  - _Leverage: components/acts/TimelineNodeDetail.tsx_
  - _Requirements: 2.1, 2.2, 3.1_

- [x] 6. 实现ClaimAnalysis分析组件
  - File: components/acts/UnifiedTimeline/ClaimAnalysis.tsx
  - 创建AI分析触发器和进度显示
  - 处理分析结果并更新store
  - Purpose: 管理请求权分析的执行和结果展示
  - _Leverage: TimelineAIAnalysis.tsx的AI调用逻辑_
  - _Requirements: 2.1, 2.3, 4.1_

## Phase 3: API层开发

- [x] 7. 创建请求权分析API路由
  - File: app/api/claim-analysis/route.ts
  - 实现POST端点接收时间轴数据
  - 调用DeepSeek API进行请求权分析
  - Purpose: 提供请求权分析的后端服务
  - _Leverage: app/api/timeline-analysis/route.ts_
  - _Requirements: 2.1, 2.2, 4.1_

- [x] 8. 实现AI请求权分析器
  - File: lib/ai-claim-analyzer.ts
  - 创建专门的请求权分析prompt模板
  - 实现请求权识别、构成要件检验逻辑
  - Purpose: 封装请求权分析的AI逻辑
  - _Leverage: lib/ai-legal-agent.ts_
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 9. 扩展法条数据库支持请求权基础
  - File: data/legal-provisions-extended.json
  - 添加更多民法、合同法相关条文
  - 标注每个法条的请求权基础属性
  - Purpose: 提供完整的请求权基础数据
  - _Leverage: data/legal-provisions.json_
  - _Requirements: 2.2, 2.3_

## Phase 4: 交互功能实现

- [x] 10. 实现视图模式切换控制器
  - File: components/acts/UnifiedTimeline/ViewModeController.tsx
  - 创建简化/增强/AI分析三种模式切换
  - 添加切换动画和状态保持
  - Purpose: 提供流畅的视图切换体验
  - _Leverage: 现有的Button和Toggle组件_
  - _Requirements: 1.3, 5.1_

- [x] 11. 创建请求权详情弹窗组件
  - File: components/acts/UnifiedTimeline/ClaimDetailModal.tsx
  - 显示请求权基础、构成要件、法条全文
  - 实现要件检验的交互式界面
  - Purpose: 提供深入的请求权学习体验
  - _Leverage: components/ui/dialog_
  - _Requirements: 2.3, 5.1, 5.2_

- [x] 12. 实现举证责任标注组件
  - File: components/acts/UnifiedTimeline/BurdenOfProofBadge.tsx
  - 创建举证责任方的视觉标识
  - 显示证明标准和现有证据
  - Purpose: 清晰展示举证责任分配
  - _Leverage: components/ui/badge_
  - _Requirements: 4.1, 4.2, 4.3_

## Phase 5: 集成和迁移

- [x] 13. 更新DeepAnalysis组件使用新时间轴
  - File: components/acts/DeepAnalysis.tsx (修改)
  - 替换TimelineAIAnalysis为UnifiedTimeline
  - 调整props传递和状态管理
  - Purpose: 集成新组件到现有流程
  - _Leverage: 现有的DeepAnalysis结构_
  - _Requirements: 1.1_

- [x] 14. 更新Act2CaseIntro使用统一时间轴
  - File: components/acts/Act2CaseIntro/index.tsx (修改)
  - 移除对旧时间轴组件的引用
  - 使用UnifiedTimeline替代
  - Purpose: 统一所有时间轴使用场景
  - _Leverage: 现有的Act2CaseIntro逻辑_
  - _Requirements: 1.1_

## Phase 6: 优化和测试

- [x] 15. 实现请求权分析结果缓存
  - File: lib/cache/claim-analysis-cache.ts
  - 创建基于内存的缓存机制
  - 实现缓存键生成和过期策略
  - Purpose: 减少重复API调用，提升性能
  - _Leverage: lib/storage.ts_
  - _Requirements: Performance requirements_

- [x] 16. 添加错误处理和降级策略
  - File: components/acts/UnifiedTimeline/ErrorBoundary.tsx
  - 实现组件级错误边界
  - 添加降级到基础时间轴的逻辑
  - Purpose: 确保系统稳定性
  - _Leverage: components/ErrorBoundary.tsx_
  - _Requirements: Error Handling_

- [x] 17. 创建UnifiedTimeline单元测试
  - File: components/acts/UnifiedTimeline/__tests__/index.test.tsx
  - 测试组件渲染和基本交互
  - 测试视图切换和AI分析触发
  - Purpose: 确保组件功能正确
  - _Leverage: jest.setup.ts, @testing-library/react_
  - _Requirements: Testing Strategy_

- [x] 18. 创建请求权分析API集成测试
  - File: app/api/claim-analysis/__tests__/route.test.ts
  - 测试API端点响应
  - 测试错误处理和边界情况
  - Purpose: 验证API层稳定性
  - _Leverage: 现有的API测试框架_
  - _Requirements: Testing Strategy_

## Phase 7: 清理和文档

- [x] 19. 删除旧的时间轴组件
  - Files: CaseTimelineSimplified.tsx, CaseTimelineEnhanced.tsx, TimelineAIAnalysis.tsx
  - 确认所有引用已更新
  - 清理相关的导入语句
  - Purpose: 移除冗余代码
  - _Requirements: 1.1_

- [x] 20. 更新项目文档和使用说明
  - File: docs/TIMELINE-CLAIM-ANALYSIS.md
  - 记录新功能的使用方法
  - 添加请求权分析法的教学说明
  - Purpose: 帮助用户理解和使用新功能
  - _Requirements: All_