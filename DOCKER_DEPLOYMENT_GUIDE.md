# Docker 部署完整指南

> 🎯 **设计哲学**：简单 > 复杂，约定 > 配置，自动化 > 手动

## 📋 目录

1. [快速开始](#快速开始)
2. [部署架构](#部署架构)
3. [环境变量管理](#环境变量管理)
4. [部署步骤](#部署步骤)
5. [常见问题](#常见问题)

---

## 🚀 快速开始

### 前置条件

```bash
# 1. 安装Docker和Docker Compose
docker --version  # >= 20.10
docker-compose --version  # >= 2.0

# 2. 准备必需的API密钥
# - DeepSeek API Key（用于AI对话）
# - 302.AI API Key（用于PPT生成）
```

### 一键部署（本地测试）

```bash
# 1. 配置环境变量
cp .env.docker .env

# 2. 启动服务
docker-compose -f docker-compose.postgres.yml up -d

# 3. 查看日志
docker-compose -f docker-compose.postgres.yml logs -f app

# 4. 访问应用
# http://localhost:3000
```

### 一键部署（生产环境）

```bash
# 1. 配置生产环境变量
cp .env.production.example .env.production
vim .env.production  # 填写真实的密钥和域名

# 2. 启动服务
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# 3. 配置SSL证书（可选）
./scripts/setup-ssl.sh

# 4. 访问应用
# https://your-domain.com
```

---

## 🏗️ 部署架构

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Internet (Port 80/443)               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Nginx (Reverse      │
              │   Proxy + SSL)        │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│   Next.js      │  │   Socket.IO    │  │   Static       │
│   (Port 3000)  │  │   (Port 3001)  │  │   Files        │
└────────┬───────┘  └────────────────┘  └────────────────┘
         │
         ▼
┌────────────────┐
│   PostgreSQL   │
│   (Port 5432)  │
└────────────────┘
```

### 容器职责

| 容器 | 职责 | 端口 | 依赖 |
|------|------|------|------|
| **nginx** | 反向代理、SSL终止、静态资源 | 80, 443 | app |
| **app** | Next.js + Socket.IO（PM2管理） | 3000, 3001 | postgres |
| **postgres** | PostgreSQL数据库 | 5432 | - |
| **pgadmin** | 数据库管理工具（可选） | 5050 | postgres |

---

## 🔐 环境变量管理

### 环境变量分类

项目使用**三层环境变量管理**：

```
构建时（ARG） → 运行时（ENV） → 应用代码（process.env）
```

#### 1. 构建时变量（Dockerfile ARG）

**仅用于公开信息**，不应包含密钥：

```dockerfile
ARG NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

#### 2. 运行时变量（docker-compose environment）

**敏感信息在此注入**，不写入镜像层：

```yaml
environment:
  DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
  AI_302_API_KEY: ${AI_302_API_KEY}
```

#### 3. 应用代码读取

```typescript
// 服务端API（只能在服务端访问）
const apiKey = process.env.AI_302_API_KEY;

// 客户端（暴露到浏览器，仅用于公开配置）
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
```

### ⚠️ 关键注意事项

**问题：为什么生产环境中PPT秘钥返回不到？**

**根本原因**：环境变量命名不一致！

```bash
# ❌ 错误配置（只有客户端版本）
NEXT_PUBLIC_AI_302_API_KEY=sk-xxx

# ✅ 正确配置（需要两个版本）
AI_302_API_KEY=sk-xxx                    # ← 服务端API使用
NEXT_PUBLIC_AI_302_API_KEY=sk-xxx        # ← 客户端使用（可选）
```

**规则**：
- `NEXT_PUBLIC_*`：会暴露到浏览器，用于客户端
- 无前缀：仅服务端可访问，用于API路由

---

## 📦 部署步骤

### 步骤1：准备环境文件

创建 `.env.production` 文件：

```bash
# =============================================================================
# 生产环境配置
# =============================================================================

# 🔑 API密钥（必需）
DEEPSEEK_API_KEY=sk-your-deepseek-key
AI_302_API_KEY=sk-your-302ai-key

# 🌐 应用URL（根据实际域名修改）
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_SOCKET_IO_URL=https://your-domain.com

# 💾 数据库配置
DB_NAME=law_education
DB_USER=postgres
DB_PASSWORD=your-strong-password

# 🛡️ 安全配置
GUEST_MODE=false
AUTO_SEED_DATABASE=true

# 📧 管理员配置（可选）
PGADMIN_EMAIL=admin@your-domain.com
PGADMIN_PASSWORD=admin-strong-password
```

### 步骤2：构建Docker镜像

```bash
# 本地构建
docker build -t law-education-platform:latest .

# 或使用已发布的镜像
docker pull ghcr.io/yejunhao159/law-education-platform-z1:latest
```

### 步骤3：启动服务

```bash
# 启动所有服务
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# 查看服务状态
docker-compose -f docker-compose.production.yml ps

# 查看日志
docker-compose -f docker-compose.production.yml logs -f app
```

### 步骤4：验证部署

```bash
# 1. 检查容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 2. 测试API健康检查
curl http://localhost:3000/api/health

# 3. 测试PPT生成（验证API密钥）
curl -X POST http://localhost:3000/api/ppt \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "payload": {
      "outlineMarkdown": "# Test\n\n## Page 1\n\nContent",
      "stream": false,
      "asyncGenPptx": false,
      "lang": "zh"
    }
  }'
```

### 步骤5：配置SSL（生产环境）

```bash
# 使用Let's Encrypt自动获取证书
docker run -it --rm -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d your-domain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# 重启Nginx加载证书
docker-compose -f docker-compose.production.yml restart nginx
```

---

## 🔧 常见问题

### Q1: 容器启动失败，提示"API key missing"

**原因**：环境变量未正确传递到容器

**解决**：

```bash
# 1. 检查.env.production是否存在
ls -la .env.production

# 2. 检查环境变量是否加载
docker-compose -f docker-compose.production.yml config

# 3. 手动传递环境变量
docker-compose -f docker-compose.production.yml \
  --env-file .env.production up -d
```

### Q2: PPT生成返回500错误

**原因**：缺少服务端API密钥 `AI_302_API_KEY`

**解决**：

```bash
# 确保.env文件中同时配置了两个版本
AI_302_API_KEY=sk-xxx                    # 服务端（必需）
NEXT_PUBLIC_AI_302_API_KEY=sk-xxx        # 客户端（可选）

# 重启容器
docker-compose -f docker-compose.production.yml restart app
```

### Q3: 数据库连接失败

**原因**：数据库容器未就绪

**解决**：

```bash
# 1. 检查数据库健康状态
docker-compose -f docker-compose.production.yml ps postgres

# 2. 查看数据库日志
docker-compose -f docker-compose.production.yml logs postgres

# 3. 等待数据库完全启动（healthcheck会自动处理）
# 应用容器会等待postgres的healthcheck通过后才启动
```

### Q4: Socket.IO连接失败

**原因**：Nginx配置缺少WebSocket支持

**解决**：

检查 `nginx.conf` 是否包含WebSocket升级配置：

```nginx
location /socket.io/ {
    proxy_pass http://app:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Q5: 如何更新应用版本？

```bash
# 1. 拉取最新镜像
docker pull ghcr.io/yejunhao159/law-education-platform-z1:latest

# 2. 停止旧容器
docker-compose -f docker-compose.production.yml down

# 3. 启动新容器
docker-compose -f docker-compose.production.yml up -d

# 4. 验证新版本
docker-compose -f docker-compose.production.yml exec app node -e "console.log(require('./package.json').version)"
```

### Q6: 如何备份数据库？

```bash
# 1. 创建备份
docker exec law-edu-postgres pg_dump -U postgres law_education > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. 恢复备份
docker exec -i law-edu-postgres psql -U postgres law_education < backup.sql
```

---

## 🎯 部署检查清单

部署前请确认：

- [ ] API密钥已准备（DeepSeek + 302.AI）
- [ ] 域名DNS已指向服务器
- [ ] 服务器防火墙已开放80/443端口
- [ ] Docker和Docker Compose已安装
- [ ] `.env.production` 文件已配置
- [ ] 数据库密码已设置（强密码）
- [ ] SSL证书已配置（生产环境）
- [ ] 备份策略已制定

部署后验证：

- [ ] 健康检查通过（`/api/health`）
- [ ] 登录功能正常
- [ ] PPT生成功能正常
- [ ] Socket.IO连接正常
- [ ] 数据库连接正常
- [ ] 日志正常输出

---

## 📚 相关文档

- [Dockerfile详解](./Dockerfile)
- [环境变量配置示例](./.env.production.example)
- [Nginx配置](./nginx.conf)
- [部署脚本](./scripts/)

---

## 🆘 获取帮助

遇到问题？

1. 查看日志：`docker-compose logs -f app`
2. 检查健康状态：`docker ps`
3. 查看环境变量：`docker-compose config`
4. 提交Issue：[GitHub Issues](https://github.com/yejunhao159/law-education-platform-z1/issues)
