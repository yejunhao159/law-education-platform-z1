# 🚀 生产环境部署指南

## 📋 部署检查清单

### ✅ 前置条件

- [x] **PostgreSQL 迁移完成** - 已从 SQLite 迁移到 PostgreSQL
- [x] **依赖更新完成** - pg 已安装，better-sqlite3 已移除
- [x] **代码已提交** - 所有改动已提交到 main 分支
- [x] **GitHub Actions 配置** - CI/CD 流程已配置
- [x] **Nginx 配置已创建** - nginx.conf 已准备

### 🔧 部署条件验证

#### 1. 服务器要求

```bash
# 最低配置
CPU: 2核
内存: 4GB
存储: 20GB
系统: Linux (Ubuntu 20.04+ / CentOS 7+)

# 推荐配置
CPU: 4核
内存: 8GB
存储: 50GB
```

#### 2. 软件要求

```bash
# 检查Docker版本
docker --version  # 需要 >= 20.10

# 检查Docker Compose版本
docker-compose --version  # 需要 >= 2.0

# 检查Nginx是否安装
nginx -v  # 可选，如果使用Docker Compose中的Nginx可以不安装
```

#### 3. 密钥准备

确保你有以下密钥：
- ✅ `DEEPSEEK_API_KEY` - DeepSeek API密钥
- ✅ `NEXT_PUBLIC_AI_302_API_KEY` - 302.ai API密钥（PPT生成）
- ✅ 数据库密码（强密码）

---

## 🎯 部署方案选择

### 方案1：GitHub Actions 自动部署（推荐）✨

**优势**：
- ✅ 镜像在构建时已包含 API 密钥
- ✅ 自动化构建、测试、推送
- ✅ 镜像托管在阿里云 ACR
- ✅ 一致性好，不易出错

**适用场景**：
- 标准部署流程
- 需要版本管理
- 团队协作

**部署步骤** → 见下文「自动部署」章节

### 方案2：本地构建部署

**优势**：
- ✅ 完全掌控构建过程
- ✅ 可以本地测试

**缺点**：
- ❌ 需要手动传入 build-args
- ❌ 容易遗漏环境变量

**适用场景**：
- 调试构建问题
- 内网部署（无法访问GitHub）

**部署步骤** → 见下文「手动部署」章节

---

## 🤖 方案1：GitHub Actions 自动部署

### Step 1: 配置 GitHub Secrets

进入 GitHub 仓库 → Settings → Secrets and variables → Actions，添加以下 secrets：

```
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
NEXT_PUBLIC_AI_302_API_KEY=sk-your-302ai-api-key
ALIYUN_REGISTRY=registry.cn-shenzhen.aliyuncs.com
ALIYUN_REGISTRY_USER=your-aliyun-username
ALIYUN_REGISTRY_PASSWORD=your-aliyun-password
ALIYUN_IMAGE_REPO=yejunhao/legal-education
```

### Step 2: 触发构建

**方式1：推送到 main 分支**
```bash
git add .
git commit -m "feat: 准备生产环境部署"
git push origin main
```

**方式2：创建版本标签**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**方式3：手动触发**
- 进入 GitHub Actions 页面
- 选择 "Build and Verify Docker Image" workflow
- 点击 "Run workflow"

### Step 3: 等待构建完成

查看 GitHub Actions 日志，确认：
- ✅ 镜像构建成功
- ✅ 镜像验证通过
- ✅ 推送到阿里云成功

### Step 4: 服务器部署

```bash
# 1. SSH 登录服务器
ssh user@your-server-ip

# 2. 创建项目目录
mkdir -p /opt/law-education && cd /opt/law-education

# 3. 下载部署配置
wget https://raw.githubusercontent.com/your-repo/main/docker-compose.production.yml
wget https://raw.githubusercontent.com/your-repo/main/.env.production.example

# 4. 配置环境变量
cp .env.production.example .env.production
vim .env.production  # 填写真实的密钥和配置

# 5. 拉取镜像
docker pull registry.cn-shenzhen.aliyuncs.com/yejunhao/legal-education:latest

# 6. 启动服务
docker-compose -f docker-compose.production.yml up -d

# 7. 查看日志
docker-compose -f docker-compose.production.yml logs -f
```

---

## 🛠️ 方案2：本地构建部署

### Step 1: 本地构建镜像

```bash
# 构建镜像（必须传入 build-args）
docker build \
  --build-arg DEEPSEEK_API_KEY=sk-your-deepseek-api-key \
  --build-arg NEXT_PUBLIC_AI_302_API_KEY=sk-your-302ai-api-key \
  --build-arg NEXT_PUBLIC_BASE_URL=https://your-domain.com \
  --build-arg NEXT_PUBLIC_SOCKET_IO_URL=https://your-domain.com \
  -t law-education:v1.0.0 \
  -f Dockerfile .
```

### Step 2: 导出镜像

```bash
# 保存镜像为tar文件
docker save law-education:v1.0.0 | gzip > law-education-v1.0.0.tar.gz

# 传输到服务器
scp law-education-v1.0.0.tar.gz user@server:/opt/law-education/
```

### Step 3: 服务器部署

```bash
# 1. 加载镜像
docker load < law-education-v1.0.0.tar.gz

# 2. 配置环境变量
cp .env.production.example .env.production
vim .env.production

# 修改 DOCKER_IMAGE
# DOCKER_IMAGE=law-education:v1.0.0

# 3. 启动服务
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔧 Nginx 反向代理配置

### Option 1: 使用 Docker Compose 中的 Nginx（推荐）

已包含在 `docker-compose.production.yml` 中，无需额外配置。

**准备 SSL 证书**：
```bash
# 创建SSL目录
mkdir -p ssl

# 方式1：使用Let's Encrypt（推荐）
# 参考：https://certbot.eff.org/

# 方式2：使用自签名证书（仅测试）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem
```

### Option 2: 使用系统 Nginx

```bash
# 1. 安装 Nginx
sudo apt update && sudo apt install nginx -y

# 2. 复制配置文件
sudo cp nginx.conf /etc/nginx/conf.d/law-education.conf

# 3. 修改配置中的域名
sudo vim /etc/nginx/conf.d/law-education.conf
# 将 your-domain.com 改为真实域名

# 4. 测试配置
sudo nginx -t

# 5. 重载 Nginx
sudo systemctl reload nginx

# 6. 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 📊 部署验证

### 1. 健康检查

```bash
# 检查容器状态
docker-compose -f docker-compose.production.yml ps

# 预期输出：
# NAME                IMAGE                                          STATUS
# law-edu-app         registry...legal-education:latest              Up (healthy)
# law-edu-postgres    postgres:16-alpine                             Up (healthy)
# law-edu-nginx       nginx:alpine                                   Up (healthy)
```

### 2. 功能测试

```bash
# 测试健康检查接口
curl http://localhost:3000/api/health

# 测试Nginx代理
curl http://localhost/api/health

# 测试HTTPS（如果配置了SSL）
curl https://your-domain.com/api/health
```

### 3. 日志检查

```bash
# 查看应用日志
docker-compose -f docker-compose.production.yml logs app | grep "错误\|警告"

# 查看数据库日志
docker-compose -f docker-compose.production.yml logs postgres

# 查看Nginx日志
docker-compose -f docker-compose.production.yml logs nginx
```

### 4. 数据库验证

```bash
# 进入数据库
docker exec -it law-edu-postgres psql -U law_edu_user -d law_education

# 检查表结构
\dt

# 检查用户数据
SELECT * FROM users;

# 退出
\q
```

---

## 🔍 常见问题排查

### 问题1: 容器启动失败

**检查日志**：
```bash
docker-compose -f docker-compose.production.yml logs app
```

**常见原因**：
- ❌ 环境变量未设置 → 检查 `.env.production`
- ❌ 数据库连接失败 → 检查 PostgreSQL 是否启动
- ❌ 端口被占用 → 使用 `netstat -tulpn | grep 3000`

### 问题2: 302 API 密钥无效

**诊断**：
```bash
# 检查镜像是否包含密钥（仅用于诊断）
docker run --rm law-education:latest env | grep NEXT_PUBLIC_AI_302_API_KEY
```

**解决方案**：
- 使用 GitHub Actions 构建的镜像（密钥已在构建时嵌入）
- 或者本地构建时确保传入 `--build-arg NEXT_PUBLIC_AI_302_API_KEY=...`

### 问题3: 数据库权限错误

**解决方案**：
```bash
# 进入数据库容器
docker exec -it law-edu-postgres psql -U postgres

# 授予权限
GRANT ALL PRIVILEGES ON DATABASE law_education TO law_edu_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO law_edu_user;

# 退出
\q
```

### 问题4: Nginx 502 错误

**检查后端服务**：
```bash
# 检查应用是否正常运行
curl http://127.0.0.1:3000/api/health

# 检查Nginx配置
docker exec law-edu-nginx nginx -t
```

---

## 📈 性能优化建议

### 1. 数据库优化

```sql
-- 创建索引（如果未创建）
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_stats_user_id ON activity_stats(user_id);

-- 定期清理旧日志（可选）
DELETE FROM login_logs WHERE login_time < NOW() - INTERVAL '90 days';
```

### 2. 容器资源限制

在 `docker-compose.production.yml` 中添加：
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### 3. 启用 CDN

将静态资源托管到 CDN（阿里云 OSS + CDN）。

---

## 🔄 更新部署

### 滚动更新

```bash
# 1. 拉取最新镜像
docker pull registry.cn-shenzhen.aliyuncs.com/yejunhao/legal-education:latest

# 2. 重启应用（零停机）
docker-compose -f docker-compose.production.yml up -d --no-deps app

# 3. 验证新版本
curl http://localhost:3000/api/health
```

### 回滚

```bash
# 1. 指定旧版本镜像
DOCKER_IMAGE=registry.cn-shenzhen.aliyuncs.com/yejunhao/legal-education:v1.0.0

# 2. 重启应用
docker-compose -f docker-compose.production.yml up -d --no-deps app
```

---

## 🔐 安全加固

### 1. 防火墙配置

```bash
# 仅开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 2. 禁用游客模式

```bash
# .env.production
GUEST_MODE=false
```

### 3. 定期备份

```bash
# 备份数据库
docker exec law-edu-postgres pg_dump -U law_edu_user law_education > backup-$(date +%Y%m%d).sql

# 定时备份（添加到 crontab）
0 2 * * * /path/to/backup-script.sh
```

---

## ✅ 部署完成检查清单

- [ ] 容器全部 healthy
- [ ] API 健康检查正常
- [ ] 登录功能正常
- [ ] PPT 生成功能正常
- [ ] Socket.IO 连接正常
- [ ] 数据库数据完整
- [ ] Nginx 反向代理正常
- [ ] SSL 证书有效
- [ ] 日志无报错
- [ ] 性能监控正常

---

**版本**: v1.0
**更新时间**: 2025-10-18
**维护人**: Claude Code
