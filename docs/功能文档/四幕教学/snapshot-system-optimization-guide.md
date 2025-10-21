# 快照系统优化实施指南

**创建日期**: 2025-10-21
**负责人**: Sean (通过Claude Code)
**优化目标**: 解决快照模式的数据丢失、类型混乱、版本管理缺失等问题

---

## 📋 目录

1. [问题诊断](#问题诊断)
2. [优化方案](#优化方案)
3. [实施步骤](#实施步骤)
4. [数据迁移](#数据迁移)
5. [测试验证](#测试验证)
6. [回滚方案](#回滚方案)

---

## 🔍 问题诊断

### 核心问题

#### 问题1: Store同步缺失（时间轴不显示）

**现象**:
- 第二幕时间轴在快照恢复后不显示
- storyChapters丢失

**根本原因**:
```
数据存储: useTeachingStore.analysisData.result.timelineAnalysis
组件读取: useAnalysisStore.timelineAnalyses (Map)
❌ 快照恢复时只恢复了useTeachingStore，没有同步到useAnalysisStore
```

**解决方案**: SnapshotConverterV2自动同步所有相关Store

---

#### 问题2: 数据结构不完整

**现象**:
- 第一幕extractedElements是松散的`Record<string, unknown>`
- 缺少Schema验证
- 数据恢复时无法保证完整性

**根本原因**:
- 没有使用Zod进行运行时验证
- 数据库JSONB字段太大，没有细分

**解决方案**:
- 创建完整的Zod Schema（SnapshotSchemas.ts）
- 数据库Schema细分（schema-v2.sql）

---

#### 问题3: 版本管理缺失

**现象**:
- 数据格式升级后，旧快照无法解析
- 无法追踪数据结构变化

**根本原因**:
- 没有`schema_version`字段
- 没有`data_version`字段

**解决方案**: 添加版本控制字段和兼容性检查

---

## 💡 优化方案

### 架构改进

```
旧架构:
Store → SnapshotConverter → Database (JSONB大字段)
                                ↓
                          恢复时数据丢失

新架构:
Store → SnapshotConverterV2 → Database (结构化JSONB)
         ↓ (Zod验证)           ↓ (版本控制)
         ✓ 数据完整性           ✓ 向后兼容
         ↓ (Store同步)
         useTeachingStore ←→ useAnalysisStore
```

### 核心改进点

1. **Zod Schema验证** (`SnapshotSchemas.ts`)
   - 完整的Act1-4数据结构定义
   - 运行时验证
   - 友好的错误提示

2. **数据库结构优化** (`schema-v2.sql`)
   - 细分JSONB字段
   - 添加版本控制
   - 性能索引优化

3. **SnapshotConverter增强** (`SnapshotConverterV2.ts`)
   - 版本兼容性检查
   - 自动Store同步
   - 详细错误处理

---

## 🚀 实施步骤

### 阶段1: 准备工作（10分钟）

#### 1.1 备份现有数据

```bash
# 备份数据库
pg_dump -U postgres -d law_education -t teaching_sessions > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份代码
git commit -am "backup: 快照系统优化前的代码状态"
git tag snapshot-optimization-before
```

#### 1.2 验证新文件已创建

```bash
# 检查新文件
ls -lh src/domains/teaching-acts/schemas/SnapshotSchemas.ts
ls -lh src/domains/teaching-acts/utils/SnapshotConverterV2.ts
ls -lh database/schema-v2.sql
```

---

### 阶段2: 数据库迁移（20分钟）

#### 2.1 执行Schema创建

```bash
# 连接数据库
psql -U postgres -d law_education

# 执行V2 Schema
\i database/schema-v2.sql

# 验证表创建成功
\d teaching_sessions_v2

# 验证视图创建成功
\dv teaching_sessions_list_v2
```

#### 2.2 数据迁移（如果有旧数据）

```sql
-- 方法1: 使用内置迁移函数
SELECT * FROM migrate_teaching_session_v1_to_v2();

-- 查看迁移结果
-- 返回: (migrated_count, error_count, errors[])

-- 方法2: 手动迁移（更安全）
-- 先迁移1-2条测试数据
INSERT INTO teaching_sessions_v2 (...)
SELECT ... FROM teaching_sessions LIMIT 2;

-- 验证数据正确性
SELECT * FROM teaching_sessions_v2;

-- 确认无误后，迁移全部
-- ...
```

#### 2.3 验证迁移结果

```sql
-- 检查数据完整性
SELECT
  COUNT(*) as total_sessions,
  COUNT(act1_basic_info) as has_act1,
  COUNT(act2_timeline_analysis) as has_timeline,
  COUNT(act2_narrative) as has_narrative,
  schema_version,
  data_version
FROM teaching_sessions_v2
GROUP BY schema_version, data_version;

-- 检查索引
\di teaching_sessions_v2*

-- 检查触发器
\df update_teaching_sessions_v2_updated_at
```

---

### 阶段3: 代码更新（5分钟）

#### 3.1 更新Repository（使用新表）

**方法A: 渐进式（推荐）**

```typescript
// src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts

// 添加配置项切换新旧表
private readonly tableName = process.env.USE_V2_SCHEMA === 'true'
  ? 'teaching_sessions_v2'
  : 'teaching_sessions';
```

**方法B: 直接切换**

```typescript
// 直接将所有SQL查询的表名改为 teaching_sessions_v2
```

#### 3.2 更新API路由

```typescript
// app/api/teaching-sessions/route.ts

// 确认使用SnapshotConverterV2
import { SnapshotConverter } from '@/src/domains/teaching-acts/utils/SnapshotConverterV2';
```

---

### 阶段4: 测试验证（30分钟）

#### 4.1 单元测试

创建测试文件 `src/domains/teaching-acts/utils/__tests__/SnapshotConverterV2.test.ts`:

```typescript
import { SnapshotConverterV2 } from '../SnapshotConverterV2';
import { validateTeachingSessionSnapshot } from '../../schemas/SnapshotSchemas';

describe('SnapshotConverterV2', () => {
  test('toDatabase应该生成有效的快照', () => {
    const mockStoreState = {
      uploadData: { /* ... */ },
      analysisData: { /* ... */ },
    };

    const snapshot = SnapshotConverterV2.toDatabase(mockStoreState);

    // 验证
    const validation = validateTeachingSessionSnapshot(snapshot);
    expect(validation.success).toBe(true);
  });

  test('toStore应该恢复完整数据', async () => {
    const mockDbSession = { /* ... */ };

    const storeData = SnapshotConverterV2.toStore(mockDbSession);

    // 验证timelineAnalysis是否同步
    expect(storeData.analysisData?.result?.timelineAnalysis).toBeDefined();
  });
});
```

运行测试:
```bash
npm test -- SnapshotConverterV2
```

#### 4.2 集成测试

1. **创建新会话并保存**
   - 上传判决书
   - 完成第一幕
   - 生成第二幕分析（确保有timelineAnalysis）
   - 点击"完成学习"保存快照

2. **验证数据库存储**
   ```sql
   SELECT
     id,
     case_title,
     session_state,
     act2_timeline_analysis IS NOT NULL as has_timeline,
     act2_narrative->'chapters' as narrative_chapters
   FROM teaching_sessions_v2
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **恢复快照并验证**
   - 打开"我的课件"
   - 点击刚才保存的课件
   - 进入第二幕
   - **验证时间轴是否显示** ✓
   - **验证故事章节是否显示** ✓

#### 4.3 浏览器控制台检查

打开浏览器开发者工具，查看日志:

```
✅ [SnapshotConverter] 快照验证通过
✅ [SnapshotConverter] timelineAnalysis已同步到useAnalysisStore
✅ [SessionDetail] storyChapters已恢复
```

---

## 🔄 数据迁移详细步骤

### 选项1: 零停机迁移（生产环境推荐）

```sql
-- 1. 创建V2表（不影响现有系统）
\i database/schema-v2.sql

-- 2. 双写模式（修改代码，同时写入V1和V2）
-- 在Repository中实现双写逻辑

-- 3. 后台迁移历史数据
SELECT * FROM migrate_teaching_session_v1_to_v2();

-- 4. 验证数据一致性
SELECT v1.id, v1.case_title, v2.case_title
FROM teaching_sessions v1
LEFT JOIN teaching_sessions_v2 v2 ON v1.id = v2.id
WHERE v2.id IS NULL;  -- 应该返回空

-- 5. 切换读取到V2（修改Repository读取逻辑）

-- 6. 停止写入V1

-- 7. 删除或归档V1表（可选）
-- ALTER TABLE teaching_sessions RENAME TO teaching_sessions_v1_archived;
```

### 选项2: 快速迁移（开发/测试环境）

```bash
# 1. 停止应用
pm2 stop law-education-platform

# 2. 备份
pg_dump -U postgres -d law_education > backup.sql

# 3. 执行迁移
psql -U postgres -d law_education -f database/schema-v2.sql

# 4. 迁移数据
psql -U postgres -d law_education -c "SELECT * FROM migrate_teaching_session_v1_to_v2();"

# 5. 更新代码（直接使用V2表）

# 6. 重启应用
npm run build
pm2 restart law-education-platform
```

---

## 🧪 测试验证清单

### 功能测试

- [ ] **第一幕**: 上传判决书，提取三要素
- [ ] **第二幕**: 生成AI叙事和时间轴分析
- [ ] **保存快照**: 点击"完成学习"，数据正确保存到V2表
- [ ] **查看列表**: "我的课件"列表正确显示
- [ ] **恢复快照**: 点击查看详情，跳转到四幕界面
- [ ] **时间轴显示**: 第二幕时间轴正确显示（关键！）
- [ ] **故事章节显示**: 第二幕故事章节正确显示
- [ ] **第一幕预览**: 第一幕数据完整显示

### 数据验证

```sql
-- 验证1: 检查Schema版本
SELECT DISTINCT schema_version, data_version, COUNT(*)
FROM teaching_sessions_v2
GROUP BY schema_version, data_version;

-- 验证2: 检查时间轴数据
SELECT
  id,
  case_title,
  act2_timeline_analysis->'turningPoints' as turning_points,
  jsonb_array_length(act2_timeline_analysis->'turningPoints') as turning_point_count
FROM teaching_sessions_v2
WHERE act2_timeline_analysis IS NOT NULL;

-- 验证3: 检查故事章节
SELECT
  id,
  case_title,
  jsonb_array_length(act2_narrative->'chapters') as chapter_count
FROM teaching_sessions_v2
WHERE act2_narrative IS NOT NULL;
```

### 性能测试

```sql
-- 查询性能测试（应该 < 100ms）
EXPLAIN ANALYZE
SELECT * FROM teaching_sessions_v2
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 20;

-- 全文搜索测试
EXPLAIN ANALYZE
SELECT * FROM teaching_sessions_v2
WHERE to_tsvector('simple', case_title || ' ' || COALESCE(case_number, ''))
  @@ to_tsquery('simple', '劳动合同');
```

---

## ⏪ 回滚方案

如果发现问题需要回滚:

### 回滚步骤

```bash
# 1. 停止应用
pm2 stop law-education-platform

# 2. 恢复代码
git checkout snapshot-optimization-before

# 3. 恢复数据库（如果V1表还在）
# 不需要操作，继续使用V1表

# 4. 重启应用
npm run dev:all
```

### 数据恢复

```sql
-- 如果V2数据有问题，从备份恢复
psql -U postgres -d law_education < backup_20251021_XXXXXX.sql

-- 删除V2表
DROP TABLE IF EXISTS teaching_sessions_v2 CASCADE;
DROP VIEW IF EXISTS teaching_sessions_list_v2 CASCADE;
```

---

## 📝 注意事项

### 关键检查点

1. **时间轴数据**:
   - 确保`act2_timeline_analysis`不为空
   - 确保`syncTimelineAnalysis()`被调用
   - 浏览器控制台应该看到同步成功日志

2. **故事章节**:
   - 确保`act2_narrative.chapters`不为空
   - 确保`setStoryChapters()`被调用

3. **版本兼容**:
   - 检查`schema_version`和`data_version`
   - SnapshotConverterV2应该能处理V1和V2两种格式

### 常见问题

**Q: 迁移后旧数据无法查看？**
A: 检查SnapshotConverterV2的`restoreAct1ToStore`方法是否兼容V1格式

**Q: 时间轴还是不显示？**
A: 检查浏览器控制台，确认`syncTimelineAnalysis`是否成功执行

**Q: Zod验证失败？**
A: 检查数据格式，可能需要调整Schema或添加`.optional()`

---

## ✅ 完成标志

优化成功的标志：

- [ ] 数据库V2表创建成功
- [ ] 历史数据迁移完成（如有）
- [ ] 新快照使用V2格式保存
- [ ] 快照恢复后时间轴正常显示
- [ ] 快照恢复后故事章节正常显示
- [ ] 第一幕数据完整恢复
- [ ] Zod验证通过
- [ ] 所有测试用例通过
- [ ] 性能符合预期（列表查询 < 100ms）

---

## 🎯 后续优化建议

1. **自动保存**: 实现10秒debounce的自动保存
2. **增量保存**: 只保存变化的幕数据
3. **版本历史**: 保存多个历史版本支持回退
4. **数据压缩**: 使用LZ算法压缩JSONB减少存储
5. **性能监控**: 添加APM监控快照保存/恢复性能

---

**文档版本**: 1.0
**最后更新**: 2025-10-21
**维护者**: Sean
