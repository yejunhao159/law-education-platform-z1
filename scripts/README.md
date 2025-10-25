# 数据库诊断工具使用指南

## 🎯 快速开始

```bash
# 查看所有会话
npm run db:sessions

# 检查Act1数据完整性（判决书提取）
npm run db:act1

# 检查Act2数据完整性（深度分析）
npm run db:act2

# 查看完整诊断（会话列表 + Act2检查 + 最新会话详情）
npm run db:status
```

## 📊 工具说明

### `check-act1-completeness.js` - Act1完整性检查

**功能**：
- 检查判决书提取的27个字段是否完整
- 分6大模块检查：基本信息、事实认定、证据分析、法官说理、元数据、其他信息
- 显示必填字段和可选字段的提取情况
- 统计完整度百分比

**命令**：
```bash
npm run db:act1
```

**检查项**：
- 必填字段：13个（案号、法院、当事人、各模块摘要、元数据等）
- 可选字段：14个（时间线、关键事实、证据列表、法律依据等）

### `db-diagnostic.js` - 统一诊断工具

**功能**：
- 查看所有教学会话
- 检查Act2数据完整性（4个模块：narrative、timelineAnalysis、evidenceQuestions、claimAnalysis）
- 查看最新会话的详细信息

**命令**：
```bash
node scripts/db-diagnostic.js [command]

命令:
  all      - 完整诊断（默认）
  sessions - 仅显示会话列表
  act2     - 仅检查Act2完整性
  latest   - 仅显示最新会话
```

### 其他可用命令

```bash
npm run db:check      # 检查数据库表结构
npm run db:migrate    # 运行数据库迁移
npm run db:test       # 测试数据库连接
npm run db:test-api   # 测试API端点
```

## 📁 文件结构

```
scripts/
├── db-diagnostic.js      # 统一诊断工具（新）
├── check-schema.ts       # 表结构检查
├── run-migration.ts      # 数据库迁移
└── test-*.ts             # 各种测试脚本

archive/old-diagnostics/  # 已归档的旧诊断脚本（10个）
```

## ✅ Act2数据保存问题修复记录

### 问题
- Act2数据无法完整保存到数据库
- 前端显示正常，但数据库中缺失数据

### 根本原因
1. **类型转换问题**：claimAnalysis的caseId和timeline.sequence类型不匹配
2. **映射问题**：evidence.submittedBy缺少英文映射
3. **历史数据问题**：localStorage中有旧格式数据（嵌套数组）

### 修复方案
**文件**：`src/domains/teaching-acts/utils/SnapshotConverterV2.ts`

1. 添加`normalizeClaimAnalysis()`函数（第695-728行）
   - 转换caseId: number → string
   - 转换timeline.sequence: object[] → string[]

2. 扩展`submittedByMapping`（第562-574行）
   - 添加英文pass-through映射

3. 清理localStorage
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### 验证结果
```bash
npm run db:act2
# 输出：完整度 4/4 (100%) ✅
```

## 🔧 常见问题

**Q: 数据保存后找不到？**
A: 运行 `npm run db:sessions` 查看所有会话

**Q: Act2数据不完整？**
A: 运行 `npm run db:act2` 检查具体缺失哪个模块

**Q: 想看最新会话详情？**
A: 运行 `node scripts/db-diagnostic.js latest`

## 📝 维护建议

- 旧的诊断脚本已移动到 `archive/old-diagnostics/`
- 以后只需要维护 `scripts/db-diagnostic.js` 这一个文件
- 如需新增诊断功能，在此文件中添加新函数即可
