# Tasks Document

## TDD Implementation Strategy
每个任务遵循测试驱动开发流程：
1. 先编写失败的测试
2. 实现最小代码使测试通过
3. 重构并优化代码

## Phase 1: Foundation Layer (类型定义与数据模型)

- [x] 1. Define core TypeScript interfaces for dispute and evidence
  - File: types/dispute-evidence.ts
  - Create DisputeFocus, EvidenceQuality, InteractionState interfaces
  - Extend existing LegalCase types
  - Purpose: Establish type safety foundation
  - _Test First: types/dispute-evidence.test.ts - Type validation tests_
  - _Leverage: types/legal-case.ts_
  - _Requirements: Core data structures_

- [x] 2. Create dispute analysis service types
  - File: lib/ai-dispute-analyzer.ts (types only)
  - Define DisputeAnalysisRequest, DisputeAnalysisResponse interfaces
  - Add ClaimBasisMapping type
  - Purpose: Type contracts for AI service
  - _Test First: lib/__tests__/ai-dispute-analyzer.types.test.ts_
  - _Leverage: lib/ai-legal-agent.ts patterns_
  - _Requirements: Requirement 1_

## Phase 2: State Management Layer

- [x] 3. Extend Zustand store with dispute state
  - File: lib/stores/useDisputeStore.ts
  - Add dispute focus state management
  - Include loading, error, and cache states
  - Purpose: Centralized dispute state management
  - _Test First: lib/stores/__tests__/useDisputeStore.test.ts - State mutations_
  - _Leverage: lib/stores/useCaseStore.ts_
  - _Requirements: Requirement 1_

- [x] 4. Create evidence interaction store
  - File: lib/stores/useEvidenceInteractionStore.ts
  - Manage drag state, drop targets, flipped cards
  - Track completed mappings and scores
  - Purpose: Interactive state management
  - _Test First: lib/stores/__tests__/useEvidenceInteractionStore.test.ts_
  - _Leverage: Zustand patterns from useCaseStore_
  - _Requirements: Requirement 2_

## Phase 3: Service Layer

- [x] 5. Implement dispute analysis service
  - File: lib/ai-dispute-analyzer.ts (implementation)
  - Create extractDisputes method with DeepSeek API
  - Add response parsing and error handling
  - Purpose: AI-powered dispute extraction
  - _Test First: lib/__tests__/ai-dispute-analyzer.test.ts - Mock API tests_
  - _Leverage: lib/ai-legal-agent.ts, DeepSeekLegalAgent class_
  - _Requirements: Requirement 1_

- [x] 6. Create evidence mapping service
  - File: lib/services/evidence-mapping-service.ts
  - Implement mapEvidenceToElements method
  - Add validation logic for mappings
  - Purpose: Evidence-to-claim element mapping logic
  - _Test First: lib/services/__tests__/evidence-mapping-service.test.ts_
  - _Leverage: Existing Evidence types_
  - _Requirements: Requirement 2_

- [x] 7. Implement dispute cache service
  - File: lib/cache/dispute-cache.ts
  - Create cache key generation for disputes
  - Add TTL-based cache management
  - Purpose: Performance optimization
  - _Test First: lib/cache/__tests__/dispute-cache.test.ts_
  - _Leverage: lib/utils/analysis-cache.ts_
  - _Requirements: Non-functional - Performance_

## Phase 4: API Endpoints

- [x] 8. Create dispute analysis API endpoint
  - File: app/api/dispute-analysis/route.ts
  - Implement POST handler for dispute extraction
  - Add request validation and error responses
  - Purpose: HTTP interface for dispute analysis
  - _Test First: app/api/dispute-analysis/__tests__/route.test.ts_
  - _Leverage: app/api/legal-analysis/route.ts patterns_
  - _Requirements: Requirement 1_

- [x] 9. Create evidence quality API endpoint
  - File: app/api/evidence-quality/route.ts
  - Implement POST for quality assessment
  - Add GET for retrieving assessments
  - Purpose: Evidence quality evaluation API
  - _Test First: app/api/evidence-quality/__tests__/route.test.ts_
  - _Leverage: Existing API patterns_
  - _Requirements: Requirement 2_

## Phase 5: Base UI Components

- [x] 10. Create InteractiveCard component
  - File: components/ui/interactive-card.tsx
  - Implement flippable card with framer-motion
  - Add draggable wrapper using @dnd-kit
  - Purpose: Reusable interactive card component
  - _Test First: components/ui/__tests__/interactive-card.test.tsx_
  - _Leverage: components/ui/card.tsx_
  - _Requirements: Requirement 2 - UI_

- [x] 11. Install and configure @dnd-kit
  - File: components/providers/dnd-provider.tsx
  - Set up DndContext and sensors
  - Configure touch and mouse handling
  - Purpose: Drag and drop foundation
  - _Test First: components/providers/__tests__/dnd-provider.test.tsx_
  - _Requirements: Requirement 2 - Interaction_

## Phase 6: Dispute Focus Components

- [x] 12. Create DisputeCard component
  - File: components/dispute/DisputeCard.tsx
  - Display dispute with three viewpoints
  - Add claim basis badges
  - Purpose: Individual dispute display
  - _Test First: components/dispute/__tests__/DisputeCard.test.tsx_
  - _Leverage: components/ui/card.tsx, badge.tsx_
  - _Requirements: Requirement 1 - UI_

- [x] 13. Implement DisputeFocusAnalyzer component
  - File: components/acts/DisputeFocusAnalyzer.tsx
  - Integrate AI analysis trigger
  - Add difficulty toggle and view switching
  - Purpose: Main dispute analysis interface
  - _Test First: components/acts/__tests__/DisputeFocusAnalyzer.test.tsx_
  - _Leverage: components/acts/Act4FocusAnalysis.tsx structure_
  - _Requirements: Requirement 1 - Complete_

- [x] 14. Add dispute loading and error states
  - File: components/dispute/DisputeLoadingState.tsx, DisputeErrorState.tsx
  - Create skeleton loaders with proper animations
  - Design error recovery UI
  - Purpose: User feedback during async operations
  - _Test First: components/dispute/__tests__/DisputeStates.test.tsx_
  - _Leverage: Existing loading patterns_
  - _Requirements: Non-functional - UX_

## Phase 7: Evidence Quality Components

- [x] 15. Create EvidenceCard component
  - File: components/evidence/EvidenceCard.tsx
  - Implement draggable evidence cards
  - Add quality indicators (authenticity, relevance, legality)
  - Purpose: Individual evidence display
  - _Test First: components/evidence/__tests__/EvidenceCard.test.tsx_
  - _Leverage: InteractiveCard component_
  - _Requirements: Requirement 2 - UI_

- [x] 16. Create ClaimElementDropZone component
  - File: components/evidence/ClaimElementDropZone.tsx
  - Implement drop target with visual feedback
  - Add validation for dropped items
  - Purpose: Drop targets for evidence mapping
  - _Test First: components/evidence/__tests__/ClaimElementDropZone.test.tsx_
  - _Leverage: @dnd-kit/sortable_
  - _Requirements: Requirement 2 - Interaction_

- [x] 17. Implement EvidenceQualitySystem component
  - File: components/acts/EvidenceQualitySystem.tsx
  - Integrate drag-and-drop system
  - Add mode switching (watch/practice)
  - Purpose: Main evidence quality interface
  - _Test First: components/acts/__tests__/EvidenceQualitySystem.test.tsx_
  - _Leverage: components/acts/EvidenceReview.tsx_
  - _Requirements: Requirement 2 - Complete_

## Phase 8: Animation and Feedback

- [x] 18. Create feedback animation system
  - File: components/feedback/FeedbackAnimations.tsx
  - Implement success/error animations with framer-motion
  - Add score incrementing animation
  - Purpose: Visual feedback for user actions
  - _Test First: components/feedback/__tests__/FeedbackAnimations.test.tsx_
  - _Leverage: framer-motion_
  - _Requirements: Requirement 2 - Feedback_

- [x] 19. Add sound feedback system (optional)
  - File: lib/utils/sound-feedback.ts
  - Create success/error sound triggers
  - Add volume control and mute option
  - Purpose: Audio feedback for interactions
  - _Test First: lib/utils/__tests__/sound-feedback.test.ts_
  - _Requirements: Non-functional - UX Enhancement_

## Phase 9: Integration

- [x] 20. Integrate DisputeFocusAnalyzer into DeepAnalysis
  - File: components/acts/DeepAnalysis.tsx (modify)
  - Replace static Act4FocusAnalysis with new component
  - Connect to case data store
  - Purpose: Deploy dispute analysis in main flow
  - _Test First: components/acts/__tests__/DeepAnalysis.integration.test.tsx_
  - _Leverage: Existing DeepAnalysis structure_
  - _Requirements: Integration_

- [x] 21. Integrate EvidenceQualitySystem into DeepAnalysis
  - File: components/acts/DeepAnalysis.tsx (continue)
  - Replace static EvidenceReview with new component
  - Wire up state management
  - Purpose: Deploy evidence quality in main flow
  - _Test First: Continue integration tests_
  - _Leverage: Existing component slots_
  - _Requirements: Integration_

## Phase 10: Testing & Polish

- [x] 22. Create E2E test for dispute analysis flow
  - File: __tests__/e2e/dispute-analysis.e2e.test.tsx
  - Test complete user journey from upload to analysis
  - Verify AI integration and error handling
  - Purpose: End-to-end validation
  - _Test Strategy: User story validation_
  - _Requirements: All dispute requirements_

- [x] 23. Create E2E test for evidence quality flow
  - File: __tests__/e2e/evidence-quality.e2e.test.tsx
  - Test drag-and-drop interactions
  - Verify scoring and feedback
  - Purpose: Interaction flow validation
  - _Test Strategy: User interaction paths_
  - _Requirements: All evidence requirements_

- [x] 24. Performance optimization and cleanup
  - Files: All created components
  - Add React.memo where appropriate
  - Optimize re-renders and animations
  - Purpose: Production readiness
  - _Test: Performance benchmarks_
  - _Requirements: Non-functional - Performance_

- [x] 25. Accessibility audit and fixes
  - Files: All interactive components
  - Add ARIA labels and keyboard navigation
  - Test with screen readers
  - Purpose: Accessibility compliance
  - _Test: Accessibility tests_
  - _Requirements: Non-functional - Accessibility_

## Task Dependencies Graph
```
1,2 → 3,4 → 5,6,7 → 8,9 → 10,11 → 12,13,14 → 15,16,17 → 18,19 → 20,21 → 22,23 → 24,25
```

## Estimated Effort
- Phase 1-2 (Foundation): 4 hours
- Phase 3-4 (Services & API): 6 hours
- Phase 5-7 (Components): 10 hours
- Phase 8-9 (Polish & Integration): 4 hours
- Phase 10 (Testing): 4 hours
- **Total: ~28 hours (3-4 days)**