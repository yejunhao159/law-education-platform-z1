# 🚀 PostgreSQL 迁移指南

## 📋 迁移概览

从 SQLite (better-sqlite3) 迁移到 PostgreSQL

**迁移时间**: 2025-10-18
**执行人**: Sean (PromptX)

---

## 🎯 为什么要迁移？

### SQLite的问题

1. **编译复杂**：better-sqlite3是原生C++模块，需要编译
   - 需要 python3 + make + g++ + node-gyp
   - Docker构建增加 500MB
   - 编译时间增加 2-3分钟
   - 容易失败（环境差异）

2. **容器化困难**：
   - 文件存储与容器无状态理念冲突
   - 需要挂载持久化卷
   - 不支持横向扩展

3. **权限问题**：
   - 在Docker环境中容易出现权限错误

### PostgreSQL的优势

1. **无需编译**：纯JS驱动（pg包）
2. **容器友好**：服务分离架构
3. **生产级**：支持并发、事务、高性能
4. **易扩展**：支持横向扩展、主从复制
5. **生态丰富**：备份、监控、管理工具完善

---

## 📦 改动清单

### 1. 依赖变更

#### 删除
```json
{
  "dependencies": {
    - "better-sqlite3": "^12.4.1"
  },
  "devDependencies": {
    - "@types/better-sqlite3": "^7.6.13"
  }
}
```

#### 添加
```json
{
  "dependencies": {
    + "pg": "^8.11.3"
  },
  "devDependencies": {
    + "@types/pg": "^8.10.9"
  }
}
```

### 2. 代码文件

#### 修改的文件

| 文件 | 改动 | 说明 |
|-----|------|------|
| `package.json` | ✅ 已修改 | 依赖切换 |
| `lib/db/index.ts` | ✅ 已修改 | 从SQLite改为PostgreSQL连接池 |
| `lib/db/users.ts` | ✅ 已修改 | 所有操作改为异步 |
| `lib/db/seed.ts` | ✅ 已修改 | 种子数据脚本改为异步 |

#### 新增的文件

| 文件 | 说明 |
|-----|------|
| `docker-compose.postgres.yml` | PostgreSQL开发环境配置 |
| `POSTGRESQL_MIGRATION.md` | 本迁移指南 |

#### 备份的文件

| 原文件 | 备份文件 |
|--------|---------|
| `lib/db/index.ts` | `lib/db/index.ts.sqlite-backup` |
| `lib/db/users.ts` | `lib/db/users.ts.sqlite-backup` |
| `lib/db/seed.ts` | `lib/db/seed.ts.sqlite-backup` |

---

## 🔄 SQL差异对比

### 数据类型

| SQLite | PostgreSQL | 说明 |
|--------|-----------|------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | 自增主键 |
| `TEXT` | `VARCHAR(255)` 或 `TEXT` | 字符串 |
| `INTEGER DEFAULT 1` | `BOOLEAN DEFAULT TRUE` | 布尔值 |
| `TEXT` (时间) | `TIMESTAMP` | 时间戳 |

### 参数占位符

| SQLite | PostgreSQL |
|--------|-----------|
| `?` | `$1, $2, $3...` |

**示例**：
```sql
-- SQLite
SELECT * FROM users WHERE username = ?

-- PostgreSQL
SELECT * FROM users WHERE username = $1
```

### 返回插入的数据

| SQLite | PostgreSQL |
|--------|-----------|
| `lastInsertRowid` | `RETURNING *` |

**示例**：
```typescript
// SQLite
const info = stmt.run(username, password);
const id = info.lastInsertRowid;
const user = findById(id);

// PostgreSQL
const result = await pool.query(
  'INSERT INTO users (...) VALUES ($1, $2) RETURNING *',
  [username, password]
);
const user = result.rows[0];
```

---

## 🚀 本地测试步骤

### Step 1: 安装依赖

```bash
# 安装PostgreSQL驱动
npm install

# 或者强制重新安装
rm -rf node_modules package-lock.json
npm install
```

### Step 2: 启动PostgreSQL（使用Docker Compose）

```bash
# 启动PostgreSQL + 应用
docker-compose -f docker-compose.postgres.yml up -d

# 查看日志
docker-compose -f docker-compose.postgres.yml logs -f

# 查看数据库是否启动
docker-compose -f docker-compose.postgres.yml ps
```

**预期输出**：
```
NAME                IMAGE                   STATUS         PORTS
law-edu-postgres    postgres:16-alpine      Up (healthy)   0.0.0.0:5432->5432
law-edu-app         law-edu-platform:...    Up (healthy)   0.0.0.0:3000->3000, 0.0.0.0:3001->3001
```

### Step 3: 验证数据库连接

```bash
# 进入PostgreSQL容器
docker exec -it law-edu-postgres psql -U postgres -d law_education

# 查看表结构
\dt

# 查看用户数据
SELECT * FROM users;

# 退出
\q
```

### Step 4: 测试应用

```bash
# 访问应用
curl http://localhost:3000

# 测试健康检查
curl http://localhost:3000/api/health
```

### Step 5: 查看应用日志

```bash
# 查看应用日志
docker-compose -f docker-compose.postgres.yml logs -f app

# 查看PostgreSQL日志
docker-compose -f docker-compose.postgres.yml logs -f postgres
```

---

## 🔍 常见问题排查

### 问题1: 数据库连接失败

**错误信息**：
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案**：
```bash
# 检查PostgreSQL是否启动
docker-compose -f docker-compose.postgres.yml ps postgres

# 查看PostgreSQL日志
docker-compose -f docker-compose.postgres.yml logs postgres

# 重启PostgreSQL
docker-compose -f docker-compose.postgres.yml restart postgres
```

### 问题2: 表不存在

**错误信息**：
```
relation "users" does not exist
```

**解决方案**：
```bash
# 查看初始化日志
docker-compose -f docker-compose.postgres.yml logs app | grep "Initializing database"

# 手动初始化（如果需要）
docker exec -it law-edu-app node -e "require('./lib/db/index').initDatabase()"
```

### 问题3: 权限错误

**错误信息**：
```
permission denied for table users
```

**解决方案**：
```bash
# 进入PostgreSQL检查权限
docker exec -it law-edu-postgres psql -U postgres -d law_education

# 查看用户权限
\du

# 授予权限（如果需要）
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

---

## 📊 环境变量配置

### 本地开发（`.env.local`）

```env
# 数据库连接
DB_HOST=localhost
DB_PORT=5432
DB_NAME=law_education
DB_USER=postgres
DB_PASSWORD=postgres

# API密钥
DEEPSEEK_API_KEY=sk-xxx
NEXT_PUBLIC_AI_302_API_KEY=sk-xxx

# 游客模式（可选）
GUEST_MODE=false

# 自动种子数据
AUTO_SEED_DATABASE=true
```

### 生产环境（Docker/K8s）

```env
# 数据库连接（使用环境变量注入）
DB_HOST=postgres
DB_PORT=5432
DB_NAME=law_education
DB_USER=postgres
DB_PASSWORD=<secure-password>

# API密钥（使用Secrets）
DEEPSEEK_API_KEY=<from-secrets>
NEXT_PUBLIC_AI_302_API_KEY=<from-secrets>

# 生产配置
GUEST_MODE=false
AUTO_SEED_DATABASE=true
NODE_ENV=production
```

---

## 🎯 生产部署

### 方式1: Docker Compose（单服务器）

```bash
# 1. 更新环境变量
cp .env.example .env.production
vim .env.production  # 填写生产配置

# 2. 启动服务
docker-compose -f docker-compose.postgres.yml --env-file .env.production up -d

# 3. 查看日志
docker-compose -f docker-compose.postgres.yml logs -f
```

### 方式2: Kubernetes（生产环境）

```yaml
# postgres-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  ports:
    - port: 5432
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_DB
          value: law_education
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

### 方式3: 托管数据库（推荐）

使用云服务商提供的托管PostgreSQL：

**阿里云RDS PostgreSQL**：
```env
DB_HOST=rm-xxx.pg.rds.aliyuncs.com
DB_PORT=5432
DB_NAME=law_education
DB_USER=law_edu_user
DB_PASSWORD=<secure-password>
```

**腾讯云PostgreSQL**：
```env
DB_HOST=postgres-xxx.tencentcdb.com
DB_PORT=5432
DB_NAME=law_education
DB_USER=law_edu_user
DB_PASSWORD=<secure-password>
```

**优势**：
- ✅ 自动备份
- ✅ 高可用（主从自动切换）
- ✅ 性能监控
- ✅ 自动扩容
- ✅ 不需要自己维护

---

## 🔄 回滚方案

如果迁移出现问题，可以快速回滚到SQLite：

```bash
# 1. 恢复备份文件
cp lib/db/index.ts.sqlite-backup lib/db/index.ts
cp lib/db/users.ts.sqlite-backup lib/db/users.ts
cp lib/db/seed.ts.sqlite-backup lib/db/seed.ts

# 2. 恢复package.json依赖
git checkout package.json

# 3. 重新安装依赖
npm install

# 4. 重启应用
docker-compose restart
```

---

## 📚 参考资料

- [PostgreSQL官方文档](https://www.postgresql.org/docs/)
- [node-postgres (pg)文档](https://node-postgres.com/)
- [从SQLite迁移到PostgreSQL最佳实践](https://www.postgresql.org/docs/current/migrate-from-sqlite.html)
- [Docker Compose PostgreSQL配置](https://hub.docker.com/_/postgres)

---

## ✅ 迁移检查清单

### 代码改动
- [x] 删除 better-sqlite3 依赖
- [x] 添加 pg 依赖
- [x] 更新 lib/db/index.ts
- [x] 更新 lib/db/users.ts（改为异步）
- [x] 更新 lib/db/seed.ts（改为异步）
- [ ] 更新所有使用数据库的API路由（改为异步）

### 配置文件
- [x] 创建 docker-compose.postgres.yml
- [ ] 更新 .env.local 添加数据库配置
- [ ] 更新 Dockerfile 添加数据库环境变量

### 测试验证
- [ ] 本地Docker Compose测试
- [ ] 数据库连接测试
- [ ] 用户登录测试
- [ ] 数据持久化测试

### 文档更新
- [x] 创建 POSTGRESQL_MIGRATION.md
- [ ] 更新 DEPLOYMENT_GUIDE.md
- [ ] 更新 README.md

---

**创建时间**: 2025-10-18
**作者**: Sean (PromptX)
**版本**: v1.0 - PostgreSQL Migration
