# Quick Start: 教学会话快照系统

**Branch**: `001-teaching-session-storage` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)  
目标: 快速搭建“快照优先”开发环境,验证AI产出落库→只读课堂展示→苏格拉底对话留痕的完整链路。

---

## 1. Prerequisites

- **Node.js** ≥ 18.18  
- **pnpm** ≥ 8 (推荐) / npm ≥ 9  
- **PostgreSQL** ≥ 14, 启用`pgcrypto`扩展(用于`gen_random_uuid`)  
- **Flyway/Prisma/Knex**任选其一作为迁移工具 (示例使用纯SQL)

---

## 2. Environment Setup

### 2.1 获取项目 & 依赖

```bash
git clone <repository-url>
cd law-education-platform-z1
pnpm install   # 或 npm install
```

### 2.2 环境变量

创建 `.env.local`:

```dotenv
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=law_education_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

NEXT_PUBLIC_API_URL=http://localhost:3000
SNAPSHOT_DEFAULT_ORG_ID=default-org
```

---

## 3. Database Bootstrap

### 3.1 创建数据库与扩展

```sql
CREATE DATABASE law_education_db;
\c law_education_db;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 3.2 迁移脚本示例

保存为 `migrations/001_snapshot_tables.sql` 并执行:

```sql
CREATE TABLE teaching_session_snapshots (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL DEFAULT 'default-org',
  version_tag VARCHAR(64) NOT NULL DEFAULT 'draft',
  status VARCHAR(32) NOT NULL DEFAULT 'draft', -- draft | ready_for_class | classroom_ready | archived
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

CREATE TABLE teaching_session_dialogues (
  turn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  version_id UUID NOT NULL,
  turn_index INT NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  speaker VARCHAR(32) NOT NULL CHECK (speaker IN ('teacher','student','assistant')),
  message TEXT NOT NULL,
  source_service VARCHAR(128) NOT NULL,
  request_id VARCHAR(128) NOT NULL,
  trace_id VARCHAR(128),
  streamed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_session_status
  ON teaching_session_snapshots(session_id, classroom_ready DESC, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_dialogues_session_turn
  ON teaching_session_dialogues(session_id, version_id, turn_index, chunk_index);
```

执行迁移:

```bash
psql -U postgres -d law_education_db -f migrations/001_snapshot_tables.sql
```

---

## 4. Running the Stack

```bash
pnpm dev    # Next.js dev server
```

服务启动后可访问 [http://localhost:3000](http://localhost:3000)。

---

## 5. End-to-End Flow

### 5.1 模拟AI写库

调用测试路由(示例):

```bash
curl -X POST http://localhost:3000/api/teaching-sessions/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "d2f1f4ba-1d86-4f1f-9d27-7f02ff3e21a1",
    "act": "act1_analysis_snapshot",
    "payload": {
      "caseId": "case-2024-001",
      "caseTitle": "买卖合同纠纷",
      "factSummary": "2024年甲乙双方买卖纠纷……",
      "importedAt": "2025-01-15T02:30:00Z"
    },
    "sourceService": "case-analysis-ai",
    "requestId": "req-123",
    "traceId": "trace-abc"
  }'
```

> 真实实现中,AI服务调用应走 `SnapshotWriter` 包装器,在写库成功后再返回响应。

验证数据库:

```sql
SELECT version_id, session_id, classroom_ready, version_tag
FROM teaching_session_snapshots
ORDER BY created_at DESC
LIMIT 5;
```

### 5.2 获取课堂快照

```bash
curl http://localhost:3000/api/teaching-sessions/d2f1f4ba-1d86-4f1f-9d27-7f02ff3e21a1/snapshot
```

预期: 返回最新`classroom_ready`快照,若不存在则返回最新`ready_for_class`并提示需发布。

### 5.3 苏格拉底对话流

```bash
curl -N http://localhost:3000/api/socratic/stream-test?sessionId=d2f1f4ba-1d86-4f1f-9d27-7f02ff3e21a1
```

- 观察SSE流: 每条消息应在发送前插入`teaching_session_dialogues`。
- 验证数据库:

```sql
SELECT turn_index, speaker, message
FROM teaching_session_dialogues
WHERE session_id = 'd2f1f4ba-1d86-4f1f-9d27-7f02ff3e21a1'
ORDER BY turn_index, chunk_index;
```

### 5.4 发布课堂版快照

```bash
curl -X POST http://localhost:3000/api/teaching-sessions/d2f1f4ba-1d86-4f1f-9d27-7f02ff3e21a1/publish \
  -H "Content-Type: application/json" \
  -d '{ "versionId": "23a9a4da-9d9e-4b45-90f5-9c3fa2d1d1fb", "targetStatus": "classroom_ready" }'
```

发布后,课堂入口读取的就是该版本,Act1/Act2/Act4在UI层应变为只读。

---

## 6. Frontend Checklist

- [ ] `useTeachingStore` 通过`/snapshot`接口加载课堂版, 并在UI层开启只读模式。  
- [ ] 苏格拉底对话组件继续侦听SSE流,但历史记录来自`teaching_session_dialogues`。  
- [ ] PPT演示组件直接取`act4_summary_snapshot.pptAssetId`或`pptDownloadUrl`。  
- [ ] 课堂模式的编辑按钮隐藏/禁用,显示“快照只读”提示。  
- [ ] 历史版本入口调用`GET /api/teaching-sessions/:id/versions`并渲染版本列表。

---

## 7. Troubleshooting

| 问题 | 排查步骤 |
| ---- | -------- |
| API返回空快照 | 确认`teaching_session_snapshots`存在记录且`deleted_at IS NULL`; 检查`publish`是否标记`classroom_ready` |
| 对话记录缺失 | 检查SSE handler是否调用`SnapshotWriter.saveDialogue`; 查看数据库连接池日志 |
| 前端仍显示可编辑 | 确认接口返回`classroomReady=true`; 前端需依据该标记禁用表单 |
| PPT链接为null | 追踪`source_service`日志,验证PPT生成AI是否写入Act4快照 |

---

## 8. Next Steps

- 对接真实AI服务: 将所有AI调用迁移到`SnapshotWriter`管线  
- 编写OpenAPI文档,同步快照/版本/对话接口  
- 增加E2E测试,覆盖“点击学习案例 → 加载课堂快照 → 对话留痕”全链路  
- 准备迁移脚本,把历史教学数据转换为快照版本
