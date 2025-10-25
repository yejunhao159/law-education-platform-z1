# Data Model: 教学会话快照系统

**Branch**: `001-teaching-session-storage` · **Spec**: [spec.md](./spec.md)

---

## Overview

快照模式将四幕教学内容与苏格拉底对话拆分为:
1. **SnapshotEnvelope** — 快照版本及元数据,四幕静态内容写入JSONB。
2. **DialogueStream** — Act3流式对话的明细表,保留完整轮次与追踪信息。

数据库采用PostgreSQL,`teaching_session_snapshots`为事实表,`teaching_session_dialogues`承载高频对话流水。

---

## 1. Entity Definitions

### 1.1 SnapshotEnvelope

```typescript
interface SnapshotEnvelope {
  versionId: string;          // UUID
  sessionId: string;          // 归属教学会话
  userId: string;             // 教师
  organizationId: string;     // 机构隔离
  versionTag: string;         // 语义标签,如"default", "ppt-v2"
  status: SnapshotStatus;     // draft | ready_for_class | classroom_ready | archived
  classroomReady: boolean;    // 是否可用于课堂
  lockedAt?: string;          // 快照锁定时间
  lockedBy?: string;          // 锁定操作者
  sourceService: string;      // 最近一次写入的服务
  requestId: string;          // 最近一次写入的请求ID
  traceId?: string;           // 可选链路追踪
  schemaVersion: string;      // 快照主结构版本
  dataVersion: string;        // 业务数据版本
  act1CaseSnapshot?: Act1Snapshot;
  act2AnalysisSnapshot?: Act2Snapshot;
  act3DialogueSnapshot?: Act3SnapshotSummary;
  act4SummarySnapshot?: Act4Snapshot;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

type SnapshotStatus =
  | 'draft'
  | 'ready_for_class'
  | 'classroom_ready'
  | 'archived';
```

### 1.2 Act Snapshots (只读内容)

```typescript
interface Act1Snapshot {
  caseId: string;
  caseTitle: string;
  factSummary: string;
  evidenceHighlights?: string[];
  teachingGoals?: string[];
  importedAt: string;           // ISO 8601
}

interface Act2Snapshot {
  legalIssues: string[];
  factAnalysis: string;
  legalBasis: string[];
  conclusions: string;
  aiSuggestions?: string[];
  analyzedAt: string;
}

interface Act4Snapshot {
  summary: string;
  keyTakeaways: string[];
  pptAssetId?: string;
  pptDownloadUrl?: string;
  classroomNotes?: string;
  summarizedAt: string;
}
```

### 1.3 Act3SnapshotSummary

```typescript
interface Act3SnapshotSummary {
  totalTurns: number;
  studentParticipation: number;    // 0-100
  startedAt: string;
  endedAt?: string;
  latestTurnId?: string;
}
```

### 1.4 DialogueStream

```typescript
interface SocraticTurn {
  turnId: string;              // UUID
  sessionId: string;
  versionId: string;           // 对应快照版本
  turnIndex: number;           // 全局轮次
  chunkIndex: number;          // 流式分片序号
  speaker: 'teacher' | 'student' | 'assistant';
  message: string;
  sourceService: string;
  requestId: string;
  traceId?: string;
  streamedAt: string;
}
```

---

## 2. Database Schema (PostgreSQL)

### 2.1 teaching_session_snapshots

```sql
CREATE TABLE teaching_session_snapshots (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL DEFAULT 'default-org',
  version_tag VARCHAR(64) NOT NULL DEFAULT 'draft',
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready_for_class','classroom_ready','archived')),
  classroom_ready BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(255),
  source_service VARCHAR(128) NOT NULL,
  request_id VARCHAR(128) NOT NULL,
  trace_id VARCHAR(128),
  act1_case_snapshot JSONB,
  act2_analysis_snapshot JSONB,
  act3_dialogue_snapshot JSONB,
  act4_summary_snapshot JSONB,
  schema_version VARCHAR(10) NOT NULL DEFAULT '1.0.0',
  data_version VARCHAR(10) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_snapshots_session_recent
  ON teaching_session_snapshots(session_id, classroom_ready DESC, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_snapshots_status
  ON teaching_session_snapshots(status, updated_at DESC)
  WHERE deleted_at IS NULL;
```

### 2.2 teaching_session_dialogues

```sql
CREATE TABLE teaching_session_dialogues (
  turn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  version_id UUID NOT NULL,
  turn_index INT NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  speaker VARCHAR(32) NOT NULL
    CHECK (speaker IN ('teacher','student','assistant')),
  message TEXT NOT NULL,
  source_service VARCHAR(128) NOT NULL,
  request_id VARCHAR(128) NOT NULL,
  trace_id VARCHAR(128),
  streamed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dialogues_session_turn
  ON teaching_session_dialogues(session_id, version_id, turn_index, chunk_index);

CREATE INDEX idx_dialogues_request
  ON teaching_session_dialogues(request_id);
```

### 2.3 视图/物化视图 (可选)

```sql
CREATE VIEW classroom_ready_snapshots AS
SELECT *
FROM teaching_session_snapshots
WHERE classroom_ready = TRUE AND deleted_at IS NULL;
```

---

## 3. Data Mapping

| Layer | Mapping |
| ----- | ------- |
| Repository | `PostgreSQLTeachingSessionRepository` 负责 CRUD + 版本筛选 |
| SnapshotWriter | 统一接口 `saveSnapshot(sessionId, act, payload, context)` 写入或更新快照 |
| DialogueWriter | `appendDialogueTurn(sessionId, versionId, turn)` 写入对话流水 |
| API | `/api/teaching-sessions/:id/snapshot` → 最新课堂版快照<br>`/api/teaching-sessions/:id/versions` → 历史版本列表<br>`/api/teaching-sessions/:id/dialogues` → 对话回放 |

---

## 4. Validation Rules

- `SnapshotEnvelope` 通过 Zod Schema 校验必填字段,并在`classroomReady=true`时强制 `lockedAt` 与 `lockedBy` 非空。
- Act Snapshots 校验字段:
  - Act1: `caseId`, `caseTitle`, `factSummary`, `importedAt`
  - Act2: `legalIssues.length > 0`, `factAnalysis`, `legalBasis`, `conclusions`, `analyzedAt`
  - Act4: `summary`, `keyTakeaways`, `summarizedAt`
- `SocraticTurn` 校验 `turnIndex >= 0`, `chunkIndex >= 0`, `message` 非空。
- 版本状态转换规则:  
  `draft → ready_for_class → classroom_ready → archived`, 不允许回退(需新增版本)。

---

## 5. Index Strategy

1. `idx_snapshots_session_recent`: 课堂入口查询最近快照。
2. `idx_snapshots_status`: 后台筛选不同状态版本。
3. `idx_dialogues_session_turn`: 对话回放按轮次顺序读取。
4. `idx_dialogues_request`: 链路追踪快速定位请求。
5. (可选) GIN 索引: 若需要文本搜索快照内容,可对 `act1_case_snapshot`, `act2_analysis_snapshot` 建全文索引。

---

## 6. Migration Considerations

- 历史数据迁移: 读取旧 `teaching_sessions_v2` 表,为每条记录创建`SnapshotEnvelope`版本并填充`version_tag='legacy-import'`。
- 对话拆分: 将旧Act3中的对话数组拆分为`teaching_session_dialogues`多行。
- 回滚策略: 删除新表并恢复旧表视图; 需要保留SQL脚本。

---

## 7. Audit & Observability

- 每次写入快照/对话需记录`source_service`, `request_id`, `trace_id`。
- 建议在应用层使用OpenTelemetry/自定义日志输出写入耗时、失败原因。
- 定期校验: 任务脚本检查`classroom_ready=true`但`locked_at IS NULL`等异常情况。

---

## 8. Data Retention

- `deleted_at` 实现软删除,课堂查询默认过滤。
- 历史对话保留策略: 同步保留,未来可按`archived`版本做归档。
- 大文件(PPT)仅存储引用ID/URL,实际文件由对象存储负责。
