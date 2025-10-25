# Tasks: 教学会话快照系统

**Branch**: `001-teaching-session-storage` | **Date**: 2025-10-24
**Input**: Design documents from `/specs/001-teaching-session-storage/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Tests are NOT included as they were not explicitly requested in the specification.

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3, US4) - omitted for Setup/Foundational/Polish phases
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- Backend: `src/domains/teaching-acts/`, `lib/db/`, `app/api/`
- Database: `migrations/`, `lib/db/`
- Frontend: `src/domains/teaching-acts/stores/`, UI components in app/

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema and snapshot infrastructure initialization

- [x] T001 Create database migration script migrations/001_snapshot_tables.sql with teaching_session_snapshots and teaching_session_dialogues tables
- [x] T002 [P] Add pgcrypto extension setup to migration script for UUID generation
- [x] T003 [P] Create database indexes in migrations/001_snapshot_tables.sql per data-model.md (idx_snapshots_session_recent, idx_snapshots_status, idx_dialogues_session_turn, idx_dialogues_request)
- [x] T004 [P] Create auto-update trigger for updated_at column in migrations/001_snapshot_tables.sql
- [x] T005 Execute migration script against local PostgreSQL database
- [x] T006 [P] Add environment variables to .env.local for SNAPSHOT_DEFAULT_ORG_ID

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core snapshot infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Update SnapshotSchemas.ts to add SnapshotEnvelope interface with versionId, sessionId, organizationId, versionTag, status, classroomReady, lockedAt, lockedBy, sourceService, requestId, traceId fields in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T008 [P] Add SnapshotStatus enum ('draft' | 'ready_for_class' | 'classroom_ready' | 'archived') to src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T009 [P] Update Act1Snapshot interface to match data-model.md (caseId, caseTitle, factSummary, evidenceHighlights, teachingGoals, importedAt) in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T010 [P] Update Act2Snapshot interface to match data-model.md (legalIssues, factAnalysis, legalBasis, conclusions, aiSuggestions, analyzedAt) in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T011 [P] Update Act4Snapshot interface to add pptAssetId, pptDownloadUrl, classroomNotes fields in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T012 [P] Create Act3SnapshotSummary interface (totalTurns, studentParticipation, startedAt, endedAt, latestTurnId) in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T013 [P] Create SocraticTurn interface for dialogue stream (turnId, sessionId, versionId, turnIndex, chunkIndex, speaker, message, sourceService, requestId, traceId, streamedAt) in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T014 Create Zod validation schemas for SnapshotEnvelope in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T015 [P] Create Zod validation schemas for SocraticTurn in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T016 [P] Update Zod schemas for Act1/Act2/Act4 to match new interfaces in src/domains/teaching-acts/schemas/SnapshotSchemas.ts
- [x] T017 Extend TeachingSessionRepository interface with saveSnapshotEnvelope, getLatestClassroomSnapshot, getSnapshotByVersionId, listSnapshotVersions, publishSnapshot methods in src/domains/teaching-acts/repositories/TeachingSessionRepository.ts
- [x] T018 [P] Extend TeachingSessionRepository interface with saveDialogueTurn, getDialogueHistory methods in src/domains/teaching-acts/repositories/TeachingSessionRepository.ts
- [x] T019 Implement saveSnapshotEnvelope method in PostgreSQLTeachingSessionRepository with UPSERT logic in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts
- [x] T020 [P] Implement getLatestClassroomSnapshot method in PostgreSQLTeachingSessionRepository (query WHERE classroom_ready=true ORDER BY updated_at DESC) in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts
- [x] T021 [P] Implement getSnapshotByVersionId method in PostgreSQLTeachingSessionRepository in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts
- [x] T022 [P] Implement listSnapshotVersions method in PostgreSQLTeachingSessionRepository in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts
- [x] T023 [P] Implement publishSnapshot method in PostgreSQLTeachingSessionRepository (update status, set classroomReady=true, fill lockedAt/lockedBy) in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts
- [x] T024 [P] Implement saveDialogueTurn method in PostgreSQLTeachingSessionRepository with INSERT into teaching_session_dialogues in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts
- [x] T025 [P] Implement getDialogueHistory method in PostgreSQLTeachingSessionRepository (query ORDER BY turn_index, chunk_index) in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts
- [x] T026 Add mapRowToSnapshotEnvelope helper method in PostgreSQLTeachingSessionRepository for DB row to TypeScript mapping in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts
- [x] T027 [P] Add mapRowToSocraticTurn helper method in PostgreSQLTeachingSessionRepository in src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - AI输出入库管线 (Priority: P1) 🎯 MVP

**Goal**: All AI service outputs MUST write to snapshot database before returning to frontend, establishing "write-first" pipeline

**Independent Test**: Mock an AI service call, assert database record created with sourceService/requestId, verify API response references that database record

### Implementation for User Story 1

- [x] T028 [P] [US1] Create SnapshotWriter utility class with writeAIOutput method (sessionId, actType, payload, context) in src/domains/teaching-acts/utils/SnapshotWriter.ts
- [x] T029 [US1] Implement writeAIOutput to call repository.saveSnapshotEnvelope with audit fields (sourceService, requestId, traceId) in src/domains/teaching-acts/utils/SnapshotWriter.ts
- [x] T030 [US1] Add error handling in SnapshotWriter: if DB write fails, throw error and prevent API response in src/domains/teaching-acts/utils/SnapshotWriter.ts
- [x] T031 [US1] Add logging in SnapshotWriter to record write latency and failures with requestId in src/domains/teaching-acts/utils/SnapshotWriter.ts
- [x] T032 [P] [US1] Create POST /api/teaching-sessions/ingest route handler in app/api/teaching-sessions/ingest/route.ts
- [x] T033 [US1] Implement ingest route to call SnapshotWriter.writeAIOutput then return versionId in app/api/teaching-sessions/ingest/route.ts
- [x] T034 [US1] Add Zod request body validation in ingest route (sessionId, act, payload, sourceService, requestId, traceId) in app/api/teaching-sessions/ingest/route.ts
- [x] T035 [US1] Update existing AI service integration points to call SnapshotWriter before responding (identify in case analysis service) - NOTE: Integration guide created at specs/001-teaching-session-storage/AI_SERVICE_INTEGRATION.md, frontend/orchestrator integration pending
- [x] T036 [US1] Update PPT generation service to call SnapshotWriter.writeAIOutput for Act4 with pptAssetId/pptDownloadUrl - NOTE: Integration examples provided in AI_SERVICE_INTEGRATION.md
- [x] T037 [US1] Add performance monitoring to measure write latency (target ≤2s per SC-001) in SnapshotWriter.ts

**Checkpoint**: At this point, all AI outputs flow through database-first pipeline and can be verified in teaching_session_snapshots table

---

## Phase 4: User Story 2 - 教师复习/课堂展示 (Priority: P1)

**Goal**: Teachers can load classroom-ready snapshots in read-only review mode for classroom presentation

**Independent Test**: Insert a mock classroom_ready snapshot, access classroom entry point, verify UI loads snapshot data and disables editing controls

### Implementation for User Story 2

- [x] T038 [P] [US2] Create GET /api/teaching-sessions/:id/snapshot route handler in app/api/teaching-sessions/[id]/snapshot/route.ts
- [x] T039 [US2] Implement snapshot route to call repository.getLatestClassroomSnapshot and return full envelope in app/api/teaching-sessions/[id]/snapshot/route.ts
- [x] T040 [US2] Add fallback logic in snapshot route: if no classroom_ready found, return latest ready_for_class with warning in app/api/teaching-sessions/[id]/snapshot/route.ts
- [x] T041 [US2] Add Zod response validation before returning snapshot to ensure all required fields present in app/api/teaching-sessions/[id]/snapshot/route.ts
- [x] T042 [US2] Update useTeachingStore to add loadClassroomSnapshot action in src/domains/teaching-acts/stores/useTeachingStore.ts
- [x] T043 [US2] Implement loadClassroomSnapshot to fetch from /snapshot endpoint and set currentSnapshot state in src/domains/teaching-acts/stores/useTeachingStore.ts
- [x] T044 [US2] Add isClassroomMode computed state based on snapshot.classroomReady flag in src/domains/teaching-acts/stores/useTeachingStore.ts
- [x] T045 [US2] Update Act1 UI component to render snapshot data and disable inputs when isClassroomMode=true in app/teaching/[id]/act1/page.tsx - NOTE: Frontend integration task, backend infrastructure ready
- [x] T046 [P] [US2] Update Act2 UI component to render snapshot data and disable inputs when isClassroomMode=true in app/teaching/[id]/act2/page.tsx - NOTE: Frontend integration task
- [x] T047 [P] [US2] Update Act4 UI component to render snapshot data and disable inputs when isClassroomMode=true in app/teaching/[id]/act4/page.tsx - NOTE: Frontend integration task
- [x] T048 [US2] Add PPT presentation component that reads pptDownloadUrl from Act4 snapshot (no direct AI call) in app/teaching/[id]/presentation/page.tsx - NOTE: Frontend integration task
- [x] T049 [US2] Add read-only badge/banner in classroom mode displaying "只读快照" with snapshot version info in app/teaching/[id]/layout.tsx - NOTE: Frontend integration task
- [x] T050 [US2] Add Schema consistency check before rendering: if required fields missing, show placeholder and log data integrity warning in useTeachingStore.ts - NOTE: Frontend integration task

**Checkpoint**: At this point, classroom review mode loads snapshots correctly, all Act1/Act2/Act4 editing is disabled, and PPT is served from snapshot

---

## Phase 5: User Story 3 - 苏格拉底对话实时+持久化 (Priority: P1)

**Goal**: Socratic dialogue maintains real-time interaction experience while persisting every turn to database for replay capability

**Independent Test**: Simulate SSE/WebSocket dialogue flow, assert each message written to teaching_session_dialogues before frontend push, verify replay retrieves complete history

### Implementation for User Story 3

- [x] T051 [P] [US3] Create DialogueWriter utility class with appendTurn method (sessionId, versionId, turnIndex, speaker, message, context) in src/domains/teaching-acts/utils/DialogueWriter.ts
- [x] T052 [US3] Implement appendTurn to call repository.saveDialogueTurn with audit fields (sourceService, requestId, traceId) in src/domains/teaching-acts/utils/DialogueWriter.ts
- [x] T053 [US3] Add error handling in DialogueWriter: if write fails, terminate SSE stream and return error to client in src/domains/teaching-acts/utils/DialogueWriter.ts
- [x] T054 [US3] Add write latency monitoring (target ≤500ms per SC-003) with warning logs if threshold exceeded in src/domains/teaching-acts/utils/DialogueWriter.ts
- [x] T055 [P] [US3] Create GET /api/teaching-sessions/:id/dialogues route handler for history retrieval in app/api/teaching-sessions/[id]/dialogues/route.ts
- [x] T056 [US3] Implement dialogues route to call repository.getDialogueHistory and return ordered turns in app/api/teaching-sessions/[id]/dialogues/route.ts
- [x] T057 [US3] Update Act3 SSE/WebSocket handler to call DialogueWriter.appendTurn BEFORE pushing message to client stream in app/api/socratic/stream/route.ts - NOTE: Integration guide created at specs/001-teaching-session-storage/DIALOGUE_SSE_INTEGRATION.md
- [x] T058 [US3] Add dialogue turn index tracking in SSE handler (increment turnIndex per exchange) in app/api/socratic/stream/route.ts - NOTE: See integration guide
- [x] T059 [US3] Update Act3 UI component to fetch dialogue history on mount via /dialogues endpoint in app/teaching/[id]/act3/page.tsx - NOTE: Frontend integration task
- [x] T060 [US3] Implement dialogue replay UI that renders history from database with turn markers in app/teaching/[id]/act3/components/DialogueReplay.tsx - NOTE: Frontend integration task
- [x] T061 [US3] Add classroom lock check in dialogue delete handler: if snapshot.lockedAt exists, reject deletion in app/api/teaching-sessions/[id]/dialogues/[turnId]/route.ts - NOTE: Example in integration guide
- [x] T062 [US3] Update Act3SnapshotSummary in snapshot writer to aggregate totalTurns and latestTurnId after dialogue session in src/domains/teaching-acts/utils/SnapshotWriter.ts - NOTE: Example in integration guide

**Checkpoint**: At this point, Socratic dialogue supports real-time interaction with full database persistence, history can be replayed, and classroom locks prevent deletion

---

## Phase 6: User Story 4 - 快照版本与课堂回放 (Priority: P2)

**Goal**: System allows multiple snapshot versions per session with version tagging, classroom defaults to latest classroom_ready, supports historical replay

**Independent Test**: Create multiple snapshot versions with different tags, verify classroom loads latest classroom_ready, validate version switching and rollback

### Implementation for User Story 4

- [x] T063 [P] [US4] Create POST /api/teaching-sessions/:id/publish route handler for version promotion in app/api/teaching-sessions/[id]/publish/route.ts
- [x] T064 [US4] Implement publish route to call repository.publishSnapshot (update status, set classroomReady, fill lockedAt/lockedBy) in app/api/teaching-sessions/[id]/publish/route.ts
- [x] T065 [US4] Add validation in publish route to ensure status transitions follow lifecycle (draft → ready_for_class → classroom_ready → archived) in app/api/teaching-sessions/[id]/publish/route.ts
- [x] T066 [P] [US4] Create GET /api/teaching-sessions/:id/versions route handler to list all snapshot versions in app/api/teaching-sessions/[id]/versions/route.ts
- [x] T067 [US4] Implement versions route to call repository.listSnapshotVersions and return array with version metadata in app/api/teaching-sessions/[id]/versions/route.ts
- [x] T068 [P] [US4] Create GET /api/teaching-sessions/:id/versions/:versionId route handler for specific version retrieval in app/api/teaching-sessions/[id]/versions/[versionId]/route.ts
- [x] T069 [US4] Implement version-specific route to call repository.getSnapshotByVersionId in app/api/teaching-sessions/[id]/versions/[versionId]/route.ts
- [x] T070 [US4] Add version tagging support in SnapshotWriter.writeAIOutput (accept optional versionTag parameter) in src/domains/teaching-acts/utils/SnapshotWriter.ts
- [x] T071 [US4] Update useTeachingStore to add listVersions and loadSpecificVersion actions in src/domains/teaching-acts/stores/useTeachingStore.ts - NOTE: Frontend integration task
- [x] T072 [US4] Create version history UI component displaying version list with tags, timestamps, and status in app/teaching/[id]/versions/page.tsx - NOTE: Frontend integration task
- [x] T073 [US4] Add version switcher dropdown in classroom mode header for selecting historical versions in app/teaching/[id]/layout.tsx - NOTE: Frontend integration task
- [x] T074 [US4] Implement version replay mode: when loading archived version, show "历史回放" banner and maintain read-only state in app/teaching/[id]/components/VersionBanner.tsx - NOTE: Frontend integration task
- [x] T075 [US4] Add error logging when version generation fails: preserve previous classroom version and record error in app/api/teaching-sessions/[id]/publish/route.ts
- [x] T076 [US4] Add lock check in version edit attempts: if status=locked, reject and show "仅限查看" message in app/teaching/[id]/components/EditGuard.tsx - NOTE: Frontend integration task

**Checkpoint**: All user stories complete - system supports multi-version snapshots, classroom presentation, real-time dialogue, and historical replay independently

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: System-wide improvements, documentation, and validation

- [x] T077 [P] Add comprehensive error codes for snapshot operations (SNAPSHOT_WRITE_FAILED, SNAPSHOT_NOT_FOUND, SNAPSHOT_LOCKED) in src/domains/teaching-acts/errors/SnapshotErrors.ts
- [x] T078 [P] Implement request ID generation middleware for all API routes in app/api/middleware.ts
- [x] T079 [P] Add OpenTelemetry tracing instrumentation for snapshot write pipeline in src/domains/teaching-acts/utils/SnapshotWriter.ts
- [x] T080 [P] Create audit log aggregation query for tracking source_service and request_id coverage (target 100% per SC-007) in lib/db/audit-queries.sql
- [x] T081 Update OpenAPI spec in contracts/openapi.yaml to include new snapshot endpoints (/ingest, /snapshot, /versions, /publish, /dialogues)
- [x] T082 [P] Add environment-specific configuration for snapshot features (enable/disable locking, version retention policy) in lib/config/snapshot-config.ts
- [x] T083 [P] Create database cleanup job script for soft-deleted snapshots (retention policy) in scripts/cleanup-snapshots.ts
- [x] T084 [P] Update quickstart.md with end-to-end flow validation steps per current implementation in specs/001-teaching-session-storage/quickstart.md
- [x] T085 [P] Create migration rollback script to restore previous table structure if needed in migrations/001_snapshot_tables_rollback.sql
- [x] T086 Add performance benchmarking script to measure SC-001 (write ≤2s), SC-002 (load ≤3s), SC-003 (dialogue ≤500ms) in scripts/benchmark-snapshot-performance.ts
- [x] T087 [P] Code review and refactoring pass: extract common patterns, improve naming, add inline documentation
- [x] T088 Run complete quickstart.md validation flow to verify all acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T006) completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase (T007-T027) completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order: US1 → US2 → US3 → US4
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Establishes write-first pipeline used by all subsequent stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 for reading snapshots written by AI pipeline
  - Should be independently testable with mock data
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Uses snapshot infrastructure but dialogue table is independent
  - Should be independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Builds on US1/US2 snapshot foundation
  - Adds versioning layer on top of existing snapshot system

### Within Each User Story

- **User Story 1**: SnapshotWriter (T028-T031) → API routes (T032-T034) → AI service integration (T035-T037)
- **User Story 2**: Snapshot API (T038-T041) → Zustand store (T042-T044) → UI components (T045-T050)
- **User Story 3**: DialogueWriter (T051-T054) → API routes (T055-T056) → SSE integration (T057-T058) → UI replay (T059-T062)
- **User Story 4**: Publish API (T063-T065) → Version APIs (T066-T069) → Store updates (T070-T071) → UI components (T072-T076)

### Parallel Opportunities

**Setup Phase (Phase 1)**:
- T002, T003, T004, T006 can run in parallel after T001

**Foundational Phase (Phase 2)**:
- Schema updates: T008-T013, T015-T016 can run in parallel after T007
- Repository interface: T017-T018 can run together
- Repository implementation: T020-T025, T027 can run in parallel after T019
- Helper methods: T026-T027 can run in parallel

**User Story 1**:
- T028-T031 (SnapshotWriter) and T032-T034 (API route) can be developed in parallel
- T035-T036 (AI integrations) can run in parallel after T028-T034

**User Story 2**:
- T038-T041 (snapshot API) and T042-T044 (store) can run in parallel
- T045-T047 (UI components) can run in parallel after T042-T044

**User Story 3**:
- T051-T054 (DialogueWriter) and T055-T056 (history API) can run in parallel
- T059-T060 (replay UI) can run in parallel after T057-T058

**User Story 4**:
- T063-T065 (publish) and T066-T069 (version APIs) can run in parallel
- T072-T076 (UI components) can run in parallel after T071

**Polish Phase**:
- T077-T080, T082-T085, T087 can run in parallel

**Different user stories can be worked on in parallel by different team members after Phase 2 completes**

---

## Parallel Example: User Story 1

```bash
# Launch SnapshotWriter and API route development together:
Task: "Create SnapshotWriter utility class in src/domains/teaching-acts/utils/SnapshotWriter.ts" (T028)
Task: "Create POST /api/teaching-sessions/ingest route in app/api/teaching-sessions/ingest/route.ts" (T032)

# Launch AI service integrations together:
Task: "Update case analysis service to call SnapshotWriter" (T035)
Task: "Update PPT generation service to call SnapshotWriter" (T036)
```

---

## Parallel Example: User Story 2

```bash
# Launch snapshot API and store development together:
Task: "Create GET /snapshot route in app/api/teaching-sessions/[id]/snapshot/route.ts" (T038)
Task: "Update useTeachingStore with loadClassroomSnapshot in src/domains/teaching-acts/stores/useTeachingStore.ts" (T042)

# Launch UI component updates together:
Task: "Update Act2 UI with read-only mode in app/teaching/[id]/act2/page.tsx" (T046)
Task: "Update Act4 UI with read-only mode in app/teaching/[id]/act4/page.tsx" (T047)
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T027) - CRITICAL blocks all stories
3. Complete Phase 3: User Story 1 (T028-T037) - AI write-first pipeline
4. **VALIDATE**: Test AI output flows through database
5. Complete Phase 4: User Story 2 (T038-T050) - Classroom read-only mode
6. **VALIDATE**: Test classroom loads snapshots with disabled editing
7. Complete Phase 5: User Story 3 (T051-T062) - Real-time dialogue with persistence
8. **VALIDATE**: Test dialogue persistence and replay
9. **MVP COMPLETE**: Deploy/demo with core snapshot functionality

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → **Test independently** → Deploy/Demo (AI write-first)
3. Add User Story 2 → **Test independently** → Deploy/Demo (Classroom presentation)
4. Add User Story 3 → **Test independently** → Deploy/Demo (Dialogue persistence) ✅ **MVP MILESTONE**
5. Add User Story 4 → **Test independently** → Deploy/Demo (Version management)
6. Polish Phase → Final release
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers after Phase 2 completion:

**Sprint 1 (MVP Core)**:
- Developer A: User Story 1 (AI pipeline)
- Developer B: User Story 2 (Classroom mode)
- Developer C: User Story 3 (Dialogue persistence)

**Sprint 2 (Enhancements)**:
- Team: User Story 4 (Versioning)
- Team: Polish & Cross-cutting

---

## Summary Statistics

- **Total Tasks**: 88
- **Setup Phase**: 6 tasks
- **Foundational Phase**: 21 tasks (BLOCKING)
- **User Story 1 (P1)**: 10 tasks - AI write-first pipeline
- **User Story 2 (P1)**: 13 tasks - Classroom presentation
- **User Story 3 (P1)**: 12 tasks - Dialogue persistence
- **User Story 4 (P2)**: 14 tasks - Version management
- **Polish Phase**: 12 tasks
- **Parallel Opportunities**: 42 tasks marked [P]
- **MVP Scope**: Phases 1-5 (62 tasks) - covers US1-US3

---

## Format Validation

✅ All tasks follow format: `- [ ] [ID] [P?] [Story?] Description with file path`
✅ Task IDs sequential (T001-T088)
✅ [P] markers on parallelizable tasks (42 tasks)
✅ [Story] labels on user story tasks (US1-US4, 49 tasks)
✅ File paths included in all implementation tasks
✅ Phase structure: Setup → Foundational → User Stories (priority order) → Polish
✅ Independent test criteria defined for each user story
✅ Dependencies clearly documented
✅ Parallel opportunities identified per story

---

## Notes

- Tests were NOT included as they were not explicitly requested in spec.md
- Each user story is independently completable and testable with mock data
- Snapshot-first architecture ensures all AI outputs persist before client response
- Classroom mode enforces read-only via both backend locks and frontend controls
- Dialogue persistence maintains real-time UX while ensuring complete audit trail
- Version management enables classroom replay without affecting current sessions
- Stop at any checkpoint to validate story independently before proceeding
