# 🚀 法学教育平台 - Docker 部署指南

本文档提供完整的 Docker 容器化部署方案，支持快速迭代和版本管理。

## 📋 目录

- [架构概览](#架构概览)
- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [本地测试](#本地测试)
- [生产部署](#生产部署)
- [版本管理](#版本管理)
- [常见问题](#常见问题)
- [故障排查](#故障排查)

---

## 🏗️ 架构概览

### 完整部署流程

```
┌─────────────────┐
│  本地开发       │
│  npm run dev    │
└────────┬────────┘
         │
         │ git push
         ▼
┌─────────────────┐
│  GitHub         │
│  代码仓库       │
└────────┬────────┘
         │
         │ git tag v1.0.0
         ▼
┌─────────────────────────────┐
│  GitHub Actions             │
│  自动构建 Docker 镜像       │
└──────────┬──────────────────┘
           │
           │ 推送镜像
           ▼
┌─────────────────────────────┐
│  GitHub Container Registry  │
│  (GHCR) 免费镜像仓库        │
└──────────┬──────────────────┘
           │
           │ docker pull
           ▼
┌─────────────────────────────┐
│  企业服务器                 │
│  Docker 容器运行            │
└─────────────────────────────┘
```

### 核心优势

- ✅ **版本管理清晰**：每个 git tag 对应一个 Docker 镜像
- ✅ **开发流程不变**：本地继续使用 `npm run dev`
- ✅ **自动化部署**：推送 tag 自动构建镜像
- ✅ **快速回滚**：1 分钟内切换到任意历史版本
- ✅ **环境一致**：开发、测试、生产环境完全一致

---

## 📦 前置要求

### 本地环境

- Node.js 20+
- Docker 20.10+
- Docker Compose 2.0+
- Git

### 服务器环境

- Linux 系统（推荐 Ubuntu 20.04+）
- Docker 20.10+
- Docker Compose 2.0+
- 端口 3000 可用
- 至少 2GB 内存

### 检查环境

```bash
# 检查 Docker 版本
docker --version
docker-compose --version

# 检查 Docker 是否运行
docker ps
```

---

## 🚀 快速开始

### 1. 本地测试 Docker 构建

```bash
# 1. 构建镜像
docker build -t law-education:test .

# 2. 运行容器（使用 .env.local）
docker run -p 3000:3000 --env-file .env.local law-education:test

# 3. 访问应用
open http://localhost:3000
```

### 2. 使用 Docker Compose

```bash
# 1. 构建并启动
docker-compose up --build

# 2. 后台运行
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 停止服务
docker-compose down
```

---

## 🧪 本地测试

### 完整测试流程

```bash
# 1. 克隆项目
git clone https://github.com/yejunhao159/law-education-platform-z1.git
cd law-education-platform-z1

# 2. 配置环境变量
cp .env.local.example .env.local
vim .env.local  # 填写 API Key 等配置

# 3. 构建并运行
docker-compose up --build

# 4. 测试功能
# 访问 http://localhost:3000
# 测试案例导入、AI 分析、苏格拉底对话等功能

# 5. 查看日志
docker-compose logs -f app

# 6. 健康检查
curl http://localhost:3000/api/health

# 7. 停止服务
docker-compose down
```

### 验证构建产物

```bash
# 检查镜像大小（应该 < 500MB）
docker images | grep law-education

# 检查容器状态
docker ps

# 进入容器查看
docker exec -it law-edu-app-dev sh
```

---

## 🏢 生产部署

### 第一步：配置 GitHub Container Registry

#### 1.1 设置仓库可见性

1. 进入 GitHub 仓库设置
2. 找到 "Packages" 设置
3. 确保 Container Registry 已启用

#### 1.2 服务器登录 GHCR

```bash
# 创建 GitHub Personal Access Token
# 1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
# 2. 勾选权限：read:packages, write:packages
# 3. 复制 token

# 服务器登录
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 第二步：服务器首次部署

#### 2.1 克隆仓库到服务器

```bash
# SSH 登录服务器
ssh user@your-server-ip

# 克隆项目（或仅克隆部署所需文件）
git clone https://github.com/yejunhao159/law-education-platform-z1.git
cd law-education-platform-z1

# 或者仅下载部署文件
mkdir law-education-platform
cd law-education-platform
wget https://raw.githubusercontent.com/yejunhao159/law-education-platform-z1/main/docker-compose.prod.yml
wget https://raw.githubusercontent.com/yejunhao159/law-education-platform-z1/main/.env.production.example
wget https://raw.githubusercontent.com/yejunhao159/law-education-platform-z1/main/deploy.sh
chmod +x deploy.sh
```

#### 2.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑配置文件（填写实际的 API Key 等）
vim .env.production
```

**必需配置项**：
```env
DEEPSEEK_API_KEY=sk-xxxxx  # 必填
NEXT_PUBLIC_BASE_URL=https://your-domain.com  # 生产域名
```

#### 2.3 首次部署

```bash
# 使用部署脚本（推荐）
./deploy.sh deploy

# 或手动部署
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

#### 2.4 验证部署

```bash
# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs

# 健康检查
curl http://localhost:3000/api/health
```

### 第三步：配置反向代理（可选但推荐）

#### Nginx 配置示例

```nginx
# /etc/nginx/sites-available/law-education

server {
    listen 80;
    server_name your-domain.com;

    # 自动重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 代理到 Docker 容器
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io 支持（WebSocket 升级）
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/law-education /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔄 版本管理

### CI/CD 自动化流程

#### 开发流程

```bash
# 1. 本地开发
npm run dev

# 2. 提交代码
git add .
git commit -m "feat: 添加新功能"
git push origin develop

# 3. 合并到 main 分支
git checkout main
git merge develop
git push origin main

# 4. 打 tag 触发部署
git tag v1.0.0
git push origin v1.0.0
```

#### 自动构建

推送 tag 后，GitHub Actions 会自动：
1. 构建 Docker 镜像
2. 推送到 GHCR（格式：`ghcr.io/yejunhao159/law-education-platform-z1:v1.0.0`）
3. 同时打上 `latest` 标签

#### 服务器更新

```bash
# 方法 1：使用部署脚本（推荐）
./deploy.sh deploy v1.0.0

# 方法 2：手动更新
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 版本回滚

```bash
# 回滚到指定版本
./deploy.sh rollback v0.9.0

# 查看可用版本
docker images | grep law-education
```

### 标签策略

- `vX.Y.Z`：语义化版本号（如 v1.2.3）
- `latest`：最新稳定版本
- `vX.Y.Z-beta`：测试版本

---

## 🛠️ 部署脚本使用

### deploy.sh 命令

```bash
# 部署最新版本
./deploy.sh deploy

# 部署指定版本
./deploy.sh deploy v1.2.0

# 回滚到指定版本
./deploy.sh rollback v1.1.0

# 查看日志（最近 100 行）
./deploy.sh logs

# 查看更多日志
./deploy.sh logs 500

# 查看服务状态
./deploy.sh status

# 停止服务
./deploy.sh stop

# 启动服务
./deploy.sh start

# 重启服务
./deploy.sh restart

# 清理未使用的镜像
./deploy.sh cleanup

# 显示帮助
./deploy.sh help
```

---

## ❓ 常见问题

### Q1: 镜像构建失败

**问题**：`npm ci` 失败或依赖安装错误

**解决方案**：
```bash
# 清理 Docker 缓存
docker builder prune -a

# 重新构建（不使用缓存）
docker build --no-cache -t law-education:test .
```

### Q2: 容器启动失败

**问题**：容器启动后立即退出

**解决方案**：
```bash
# 查看容器日志
docker logs law-edu-app-prod

# 常见原因：
# 1. .env.production 配置错误
# 2. 端口冲突（3000 被占用）
# 3. 内存不足

# 检查端口占用
sudo lsof -i :3000

# 检查内存使用
free -h
```

### Q3: 健康检查失败

**问题**：`/api/health` 返回 404 或超时

**解决方案**：
```bash
# 进入容器检查
docker exec -it law-edu-app-prod sh

# 手动测试健康检查
node -e "require('http').get('http://localhost:3000/api/health', (r) => { console.log(r.statusCode) })"

# 检查 Next.js 是否正常启动
ps aux | grep node
```

### Q4: Socket.io 连接失败

**问题**：实时课堂功能无法连接

**解决方案**：
```bash
# 1. 检查 Nginx 配置是否支持 WebSocket 升级
# 2. 检查防火墙是否开放端口
sudo ufw status

# 3. 测试 WebSocket 连接
wscat -c ws://your-domain.com/socket.io/
```

### Q5: 如何查看详细日志

```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs -f

# 进入容器查看文件
docker exec -it law-edu-app-prod sh
cd /app
ls -la
```

### Q6: 如何更新环境变量

```bash
# 1. 修改 .env.production
vim .env.production

# 2. 重启容器（会重新加载环境变量）
./deploy.sh restart
```

---

## 🔍 故障排查

### 检查清单

```bash
# 1. Docker 服务是否运行
systemctl status docker

# 2. 容器是否运行
docker ps

# 3. 容器日志
docker logs law-edu-app-prod --tail 100

# 4. 健康检查
curl http://localhost:3000/api/health

# 5. 环境变量是否正确
docker exec law-edu-app-prod env | grep DEEPSEEK

# 6. 网络连接
docker exec law-edu-app-prod ping -c 3 api.deepseek.com

# 7. 资源使用
docker stats law-edu-app-prod
```

### 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看镜像大小
docker images | grep law-education

# 查看容器详细信息
docker inspect law-edu-app-prod
```

### 日志管理

```bash
# 清理旧日志
docker-compose -f docker-compose.prod.yml logs --since 7d > logs-archive.txt

# 配置日志轮转（在 docker-compose.prod.yml 中已配置）
logging:
  driver: "json-file"
  options:
    max-size: "50m"
    max-file: "10"
```

---

## 📊 性能优化

### 镜像优化

- ✅ 使用多阶段构建（已实现）
- ✅ 使用 Alpine 基础镜像（已实现）
- ✅ 生产环境移除开发依赖（已实现）
- ✅ 使用 .dockerignore 排除不必要文件（已实现）

### 运行优化

```bash
# 限制资源使用（在 docker-compose.prod.yml 中配置）
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
```

---

## 🔐 安全建议

1. **不要将敏感信息提交到 Git**
   - .env.production 已在 .gitignore 中
   - 使用环境变量管理敏感配置

2. **定期更新镜像**
   ```bash
   # 更新基础镜像
   docker pull node:20-alpine

   # 重新构建
   docker build --no-cache -t law-education:latest .
   ```

3. **使用非 root 用户运行**
   - Dockerfile 已配置 nextjs 用户

4. **配置防火墙**
   ```bash
   # 仅开放必要端口
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

---

## 📚 相关资源

- [Next.js Docker 官方文档](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose 文件参考](https://docs.docker.com/compose/compose-file/)
- [GitHub Actions 工作流语法](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Container Registry 使用指南](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## 🤝 获取帮助

遇到问题？

1. 查看本文档的"常见问题"和"故障排查"部分
2. 查看项目 [GitHub Issues](https://github.com/yejunhao159/law-education-platform-z1/issues)
3. 提交新的 Issue 描述问题

---

**最后更新**：2025-10-07
**维护者**：yejh0725
