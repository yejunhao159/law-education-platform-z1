# PostgreSQL 数据库查询命令

## 连接数据库

```bash
# 通过Docker连接
docker exec law-edu-postgres psql -U postgres -d law_education

# 或使用docker exec执行单条命令
docker exec law-edu-postgres psql -U postgres -d law_education -c "YOUR_SQL_HERE"
```

---

## 常用查询

### 1. 查看所有表
```bash
docker exec law-edu-postgres psql -U postgres -d law_education -c "\dt"
```

### 2. 查看最近的5个session
```bash
docker exec law-edu-postgres psql -U postgres -d law_education -c "
SELECT
  id,
  case_title,
  session_state,
  created_at
FROM teaching_sessions_v2
ORDER BY created_at DESC
LIMIT 5;
"
```

### 3. 查看特定session的详细信息
```bash
# 替换SESSION_ID为实际的UUID
docker exec law-edu-postgres psql -U postgres -d law_education -c "
SELECT
  id,
  case_title,
  session_state,
  act1_confidence,
  CASE WHEN act1_basic_info IS NOT NULL THEN 'YES' ELSE 'NO' END as has_basic_info,
  CASE WHEN act1_facts IS NOT NULL THEN 'YES' ELSE 'NO' END as has_facts,
  CASE WHEN act1_evidence IS NOT NULL THEN 'YES' ELSE 'NO' END as has_evidence,
  CASE WHEN act1_reasoning IS NOT NULL THEN 'YES' ELSE 'NO' END as has_reasoning,
  created_at
FROM teaching_sessions_v2
WHERE id = 'SESSION_ID';
"
```

### 4. 查看第一幕的原始数据（JSONB）
```bash
docker exec law-edu-postgres psql -U postgres -d law_education -c "
SELECT
  id,
  case_title,
  act1_basic_info,
  act1_facts,
  act1_evidence,
  act1_reasoning
FROM teaching_sessions_v2
WHERE id = 'SESSION_ID';
"
```

### 5. 统计session数量（按状态）
```bash
docker exec law-edu-postgres psql -U postgres -d law_education -c "
SELECT
  session_state,
  COUNT(*) as count
FROM teaching_sessions_v2
GROUP BY session_state
ORDER BY count DESC;
"
```

### 6. 删除测试数据（谨慎使用！）
```bash
# 删除特定session
docker exec law-edu-postgres psql -U postgres -d law_education -c "
DELETE FROM teaching_sessions_v2 WHERE id = 'SESSION_ID';
"

# 清空所有session（危险！）
docker exec law-edu-postgres psql -U postgres -d law_education -c "
TRUNCATE teaching_sessions_v2;
"
```

### 7. 查看表结构
```bash
docker exec law-edu-postgres psql -U postgres -d law_education -c "
\d+ teaching_sessions_v2
"
```

### 8. 搜索包含特定案号的session
```bash
docker exec law-edu-postgres psql -U postgres -d law_education -c "
SELECT
  id,
  case_title,
  case_number,
  session_state
FROM teaching_sessions_v2
WHERE case_number LIKE '%2020%'
OR case_title LIKE '%2020%';
"
```

---

## 数据库配置信息

- **主机**: localhost
- **端口**: 5432
- **数据库**: law_education
- **用户名**: postgres
- **密码**: postgres
- **Docker容器**: law-edu-postgres

---

## GUI工具推荐

如果想用可视化界面管理数据库，推荐：

1. **DBeaver** (免费, 跨平台)
   - 下载: https://dbeaver.io/
   - 连接配置：Host=localhost, Port=5432, Database=law_education

2. **pgAdmin** (PostgreSQL官方工具)
   - 下载: https://www.pgadmin.org/

3. **TablePlus** (Mac/Windows, 免费版可用)
   - 下载: https://tableplus.com/

---

## 快捷脚本

创建一个bash脚本快速查询：

```bash
#!/bin/bash
# 保存为 db-query.sh

case $1 in
  "list")
    docker exec law-edu-postgres psql -U postgres -d law_education -c "
    SELECT id, case_title, session_state, created_at
    FROM teaching_sessions_v2
    ORDER BY created_at DESC LIMIT 10;"
    ;;
  "count")
    docker exec law-edu-postgres psql -U postgres -d law_education -c "
    SELECT session_state, COUNT(*)
    FROM teaching_sessions_v2
    GROUP BY session_state;"
    ;;
  *)
    echo "Usage: ./db-query.sh [list|count]"
    ;;
esac
```

使用方法：
```bash
chmod +x db-query.sh
./db-query.sh list
./db-query.sh count
```
