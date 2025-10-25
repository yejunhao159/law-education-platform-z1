# Technical Research: 教学会话存储系统

**Branch**: `001-teaching-session-storage` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)

## Overview

本文档记录教学会话存储系统的技术调研结果,重点解决以下技术决策:

1. **编辑/复习模式数据隔离方案** (FR-011, FR-012)
2. **Schema版本升级兼容性策略** (SC-009)
3. **软删除 vs 物理删除权衡** (FR-017)

## 1. 编辑/复习模式数据隔离方案

### 业务需求

- **FR-011**: 编辑模式下,教师可修改Act2-Act4的分析内容,修改后仅在编辑模式下可见
- **FR-012**: 复习模式下,教师看到的是学生视角的原始分析内容,不受编辑模式修改影响

### 技术方案对比

#### 方案A: 双JSONB字段 (当前实现)

**数据结构**:
```typescript
// teaching_sessions_v2表
{
  act2_case_snapshot: JSONB,           // 原始学生视角快照
  act2_case_snapshot_edit: JSONB,      // 编辑模式快照
  act3_dialogue_snapshot: JSONB,
  act3_dialogue_snapshot_edit: JSONB,
  act4_summary_snapshot: JSONB,
  act4_summary_snapshot_edit: JSONB
}
```

**优点**:
- ✅ 数据隔离彻底,无需运行时计算
- ✅ 查询简单,直接读取对应字段
- ✅ 扩展性好,支持独立的Schema版本

**缺点**:
- ❌ 字段数量翻倍 (当前已有30列,再增加会超过最佳实践)
- ❌ 存储空间增加 (估计+40%,因编辑版本通常基于原始版本)
- ❌ 同步复杂度:如果原始数据更新,需考虑编辑版本的合并策略

**评估**: 当前teaching_sessions_v2表已有30列,再增加6个JSONB字段会导致表过宽,不建议继续扩展。

---

#### 方案B: 单JSONB字段 + mode字段 + 版本号

**数据结构**:
```typescript
{
  act2_snapshot: JSONB,  // 统一快照字段
  act2_mode: ENUM('student', 'teacher'),  // 当前模式
  act2_version: INTEGER  // 版本号
}
```

**快照内部结构**:
```typescript
{
  studentVersion: { /* 学生视角数据 */ },
  teacherVersion: { /* 教师编辑数据 */ },
  currentMode: 'student' | 'teacher'
}
```

**优点**:
- ✅ 字段数量不变
- ✅ 历史版本可追溯 (通过version字段)
- ✅ 灵活性高,可扩展更多模式

**缺点**:
- ❌ 查询需要JSONB路径提取,性能略降
- ❌ 数据模型复杂,前端需要解析嵌套结构
- ❌ 索引困难 (无法对JSONB内部字段建索引)

**评估**: 灵活但复杂,增加了前端和Repository层的复杂度。

---

#### 方案C: 分离表 (teaching_session_edits)

**数据结构**:
```sql
-- 主表 (teaching_sessions_v2)
CREATE TABLE teaching_sessions_v2 (
  id UUID PRIMARY KEY,
  act2_snapshot JSONB,  -- 原始学生视角
  ...
);

-- 编辑表 (teaching_session_edits)
CREATE TABLE teaching_session_edits (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES teaching_sessions_v2(id),
  act_number INTEGER,  -- 2, 3, 4
  edited_snapshot JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**优点**:
- ✅ 数据分离彻底,主表保持简洁
- ✅ 编辑历史可扩展 (支持多版本编辑)
- ✅ 查询灵活 (JOIN或LEFT JOIN)
- ✅ 符合数据库规范化原则

**缺点**:
- ❌ 查询需要JOIN,复杂度增加
- ❌ 事务管理复杂 (保存时需同时操作两张表)
- ❌ Repository接口需重新设计

**评估**: 最符合关系型数据库设计原则,但引入新表需要更多开发工作。

---

### 推荐方案

**🎯 Phase 1 (MVP): 保持当前实现,暂不实现编辑/复习模式隔离**

**理由**:
1. **业务需求不明确**: Spec中FR-011/FR-012标记为P2优先级,且无明确的用户场景
2. **技术成本高**: 三种方案都需要较大改动 (方案A: 表结构变更, 方案B: 数据模型重构, 方案C: 新增表+事务管理)
3. **现有实现可用**: 当前单JSONB字段已满足基础存储需求

**Phase 2 (Future Feature): 选择方案C**

当业务需求明确后,推荐采用**方案C (分离表)**:
- 符合数据库设计最佳实践
- 支持未来扩展 (如编辑历史、版本对比)
- 对现有代码侵入性最小

**迁移路径**:
```typescript
// Phase 1: 现有API继续工作
await repository.saveSnapshot(sessionId, snapshot);

// Phase 2: 新增编辑模式API
await repository.saveEditedSnapshot(sessionId, actNumber, editedSnapshot);
await repository.getSnapshot(sessionId, { mode: 'student' | 'teacher' });
```

---

## 2. Schema版本升级兼容性策略

### 需求

- **SC-009**: Schema版本升级后,系统仍能正确读取旧版本数据,兼容率100%

### 技术方案

#### 2.1 版本标识字段

```typescript
// teaching_sessions_v2表
{
  schema_version: VARCHAR(10) DEFAULT '1.0.0',  // Schema结构版本
  data_version: VARCHAR(10) DEFAULT '1.0.0'     // 数据内容版本
}
```

**区别**:
- `schema_version`: 表结构变更 (如新增字段、修改类型)
- `data_version`: JSONB内部结构变更 (如Act2快照格式变化)

#### 2.2 Zod Schema向后兼容

**原则**: 新字段使用`.optional()`或`.default()`

```typescript
// SnapshotSchemas.ts v1.0.0
export const Act2SnapshotSchema = z.object({
  caseId: z.string(),
  analysis: z.string()
});

// SnapshotSchemas.ts v1.1.0 (新增字段)
export const Act2SnapshotSchema = z.object({
  caseId: z.string(),
  analysis: z.string(),
  tags: z.array(z.string()).optional(),  // 新字段,向后兼容
  metadata: z.record(z.unknown()).default({})
});
```

**验证逻辑**:
```typescript
// PostgreSQLTeachingSessionRepository.ts
async getSessionById(id: string): Promise<TeachingSession | null> {
  const row = await this.pool.query('SELECT * FROM teaching_sessions_v2 WHERE id = $1', [id]);

  // 版本检测
  const schemaVersion = row.schema_version || '1.0.0';

  // 选择对应版本的Schema
  const schema = this.getSchemaForVersion(schemaVersion);

  // Zod验证 + 默认值填充
  const validated = schema.parse(row.act2_case_snapshot);

  return validated;
}
```

#### 2.3 Breaking Changes处理

**场景**: 字段重命名或类型变更

```typescript
// v1.0.0
{ caseId: "123" }

// v2.0.0 (breaking change)
{ caseIdentifier: "123" }  // 字段名变更
```

**迁移函数**:
```typescript
// migrations/act2-v1-to-v2.ts
export function migrateAct2SnapshotV1ToV2(oldData: any): Act2SnapshotV2 {
  return {
    caseIdentifier: oldData.caseId,  // 字段映射
    ...oldData
  };
}

// Repository层
async getSessionById(id: string) {
  const row = await this.pool.query(...);

  if (row.data_version === '1.0.0') {
    row.act2_case_snapshot = migrateAct2SnapshotV1ToV2(row.act2_case_snapshot);
  }

  return this.parseSession(row);
}
```

#### 2.4 版本策略总结

| 变更类型 | 策略 | 示例 |
|---------|------|------|
| 新增可选字段 | Zod `.optional()` | `tags: z.array(z.string()).optional()` |
| 新增必填字段 | Zod `.default()` | `status: z.enum(['draft', 'active']).default('draft')` |
| 字段重命名 | Migration函数 | `caseId` → `caseIdentifier` |
| 类型变更 | Migration函数 + 新Schema版本 | `string` → `number` |
| 删除字段 | 保留读取逻辑 (不验证) | 读取时忽略,写入时不包含 |

**兼容性保证**: 使用上述策略,可实现100%向后兼容,满足SC-009。

---

## 3. 软删除 vs 物理删除权衡

### 需求

- **FR-017**: 教师可删除历史会话,删除后在列表中不可见
- **SC-008**: 删除操作响应时间 < 1秒

### 技术方案对比

#### 方案A: 软删除 (推荐)

**实现**:
```sql
ALTER TABLE teaching_sessions_v2 ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 查询时过滤
SELECT * FROM teaching_sessions_v2 WHERE user_id = $1 AND deleted_at IS NULL;

-- 删除时标记
UPDATE teaching_sessions_v2 SET deleted_at = NOW() WHERE id = $1;
```

**优点**:
- ✅ 数据可恢复 (误删保护)
- ✅ 审计友好 (保留删除记录)
- ✅ 性能好 (UPDATE比DELETE快)
- ✅ 满足SC-008 (响应时间 < 1秒)

**缺点**:
- ❌ 存储空间持续增长
- ❌ 查询需要额外WHERE条件
- ❌ 可能违反GDPR (用户要求彻底删除)

**优化**:
```sql
-- 部分索引,仅索引未删除记录
CREATE INDEX idx_active_sessions
ON teaching_sessions_v2(user_id, created_at DESC)
WHERE deleted_at IS NULL;
```

---

#### 方案B: 物理删除

**实现**:
```sql
DELETE FROM teaching_sessions_v2 WHERE id = $1;
```

**优点**:
- ✅ 数据库体积小
- ✅ 查询简单 (无需过滤)
- ✅ 符合GDPR "被遗忘权"

**缺点**:
- ❌ 数据无法恢复
- ❌ 审计困难
- ❌ 级联删除复杂 (如有关联表)

---

#### 方案C: 混合方案 (推荐)

**策略**: 软删除 + 定期物理清理

```typescript
// 1. 用户删除 → 软删除
async deleteSession(id: string): Promise<void> {
  await this.pool.query(
    'UPDATE teaching_sessions_v2 SET deleted_at = NOW() WHERE id = $1',
    [id]
  );
}

// 2. 定时任务 (每月执行)
async physicalCleanup(): Promise<void> {
  await this.pool.query(
    'DELETE FROM teaching_sessions_v2 WHERE deleted_at < NOW() - INTERVAL \'30 days\'',
    []
  );
}
```

**配置**:
```typescript
// config.ts
export const DELETION_POLICY = {
  softDeleteEnabled: true,
  retentionDays: 30,  // 软删除保留30天
  autoCleanup: true   // 自动物理清理
};
```

**优点**:
- ✅ 兼顾恢复能力和存储效率
- ✅ 满足GDPR (30天后彻底删除)
- ✅ 审计窗口 (30天内可追溯)

---

### 推荐方案

**🎯 采用方案C: 软删除 + 30天自动清理**

**实施步骤**:
1. **Phase 1 (MVP)**: 仅实现软删除
   - 添加`deleted_at`字段
   - 修改查询逻辑 (WHERE deleted_at IS NULL)
   - 添加部分索引

2. **Phase 2 (Production)**: 添加自动清理
   - 实现定时任务 (cron job或GitHub Actions)
   - 添加清理日志和监控
   - 支持手动触发紧急清理

**合规性**:
- **GDPR遵从**: 用户可请求立即物理删除 (提供专用API)
- **审计遵从**: 30天内的删除记录可追溯

---

## 4. 技术决策总结

| 决策点 | 推荐方案 | 优先级 | 实施阶段 |
|-------|---------|-------|---------|
| 编辑/复习模式隔离 | Phase 1不实现,Phase 2采用分离表 | P2 | Future |
| Schema版本兼容 | Zod `.optional()` + Migration函数 | P0 | Phase 1 |
| 删除策略 | 软删除 + 30天自动清理 | P1 | Phase 1 (软删除), Phase 2 (清理) |

---

## 5. 风险与缓解

### 风险1: 编辑模式功能推迟影响用户体验

**缓解措施**:
- 在UI层提供临时方案 (前端状态管理保存编辑版本)
- 明确告知用户编辑版本仅本地生效
- Phase 2开发时提供一键迁移工具

### 风险2: Schema升级导致数据损坏

**缓解措施**:
- 生产环境部署前运行迁移脚本
- 备份旧数据 (保留7天)
- 提供回滚机制 (降级Schema版本)

### 风险3: 软删除数据泄露

**缓解措施**:
- API层严格过滤`deleted_at IS NULL`
- 数据库视图封装 (CREATE VIEW active_sessions AS ...)
- 敏感字段加密 (如学生姓名、案例内容)

---

**Version**: 1.0.0 | **Author**: AI Planning Agent | **Reviewed**: Pending
