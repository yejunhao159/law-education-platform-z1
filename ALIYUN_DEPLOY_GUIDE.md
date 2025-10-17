# 🚀 法学AI教学系统 - 阿里云部署完整指南

## 📋 目录
1. [概述](#概述)
2. [修复内容](#修复内容)
3. [本地构建](#本地构建)
4. [推送到阿里云](#推送到阿里云)
5. [服务器拉取和运行](#服务器拉取和运行)
6. [故障排查](#故障排查)

---

## 概述

本指南描述如何使用**新版本Dockerfile v3.0**将法学AI教学系统部署到阿里云Container Registry，并在服务器上运行。

### ✨ 新Dockerfile修复的三个核心问题

#### ✅ 问题1：Python3编译错误（生产环境登录页崩溃）
- **原因**：Alpine镜像缺少Python3和构建工具，`better-sqlite3`编译失败
- **解决方案**：在base镜像中添加python3、make、g++、build-base
- **影响**：登入页面现在可以正常工作

#### ✅ 问题2：PPT前端API环境变量硬编码（最严重）
- **原因**：NEXT_PUBLIC_*变量在构建时被硬编码到客户端代码中，使用占位符值构建会导致前端API调用失败
- **解决方案**：
  - 新增 `scripts/generate-env.sh` 脚本在运行时生成 `.env.production`
  - 修改启动流程：`generate-env.sh` → `check-env.sh` → `pm2-runtime`
  - 环境变量通过 `docker run -e` 动态注入
- **影响**：PPT生成功能现在可以正常获取API密钥

#### ✅ 问题3：Socket.IO依赖冲突
- **原因**：standalone模式可能遗漏传递依赖
- **解决方案**：在runner阶段完整重新安装生产依赖
- **影响**：Socket.IO及其所有依赖都被正确安装

---

## 修复内容

### 更新的文件

#### 1. `Dockerfile` - v3.0 完整修复版
```dockerfile
# 关键改进：
✓ 添加 python3, make, g++, build-base（修复编译问题）
✓ 添加 generate-env.sh 环境变量注入脚本
✓ 修改启动流程为三步初始化
✓ 改进的 npm ci 命令（Socket.IO依赖完整性）
```

#### 2. 新增：`scripts/generate-env.sh`
- 在容器启动时运行时生成 `.env.production`
- 将系统环境变量注入到应用中
- 验证必要的环境变量已设置

#### 3. 新增：`scripts/build-and-push-aliyun.sh`
- 一键构建和推送到阿里云
- 包含验证和错误检查
- 提供推送后的操作指引

---

## 本地构建

### 方式1：手动构建

```bash
# 在项目根目录执行
docker build -f Dockerfile -t law-education:latest .

# 验证镜像
docker images | grep law-education
```

### 方式2：使用脚本构建并推送（推荐）

```bash
# 赋予脚本执行权限
chmod +x scripts/build-and-push-aliyun.sh

# 构建并推送到阿里云
./scripts/build-and-push-aliyun.sh v1.0.1

# 或使用默认版本标签
./scripts/build-and-push-aliyun.sh latest
```

### 构建时间预估
- 首次构建：8-15分钟（需要安装所有依赖）
- 缓存构建：2-5分钟
- 镜像大小：~280-320MB

---

## 推送到阿里云

### 前置条件
- 拥有阿里云账号
- 已开通Container Registry服务
- 知道阿里云用户名和密码

### 阿里云镜像仓库地址
```
仓库地址：crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com
命名空间：yejunhao
镜像名称：legal-education
```

### 推送步骤

#### Step 1: 本地登录阿里云

```bash
docker login --username=nick2447759034 \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com

# 密码为：开通服务时设置的密码
```

#### Step 2: 构建镜像

```bash
docker build -f Dockerfile \
  -t crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.1 \
  .
```

#### Step 3: 推送到阿里云

```bash
docker push \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.1
```

#### 或使用脚本一键完成

```bash
./scripts/build-and-push-aliyun.sh v1.0.1
```

### 推送完成后的验证

在阿里云控制台查看：
```
https://cr.console.aliyun.com/repository/cn-shenzhen/yejunhao/legal-education/details
```

应该看到新推送的镜像标签（如 v1.0.1）。

---

## 服务器拉取和运行

### 在服务器上的操作

#### Step 1: 登录阿里云镜像仓库

```bash
ssh root@115.29.191.180

docker login --username=nick2447759034 \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com

# 输入密码
```

#### Step 2: 拉取镜像

```bash
docker pull \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.1
```

#### Step 3: 创建Docker卷（用于数据持久化）

```bash
# 创建卷用于SQLite数据库
docker volume create legal-education-data

# 创建卷用于日志
docker volume create legal-education-logs
```

#### Step 4: 运行容器

```bash
docker run -d \
  --name legal-education-prod \
  --restart always \
  --network bridge \
  -p 3000:3000 \
  -p 3001:3001 \
  -e DEEPSEEK_API_KEY=sk-6b081a93258346379182141661293345 \
  -e NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-6b081a93258346379182141661293345 \
  -e NEXT_PUBLIC_AI_302_API_KEY=sk-AJeqG8UJnqhvwAQP16DGTtb0VIfTuhDjtJID22Lh3yDKQbPz \
  -e NEXT_PUBLIC_BASE_URL=http://115.29.191.180:3000 \
  -e NEXT_PUBLIC_SOCKET_IO_URL=http://115.29.191.180:3001 \
  -v legal-education-data:/app/data \
  -v legal-education-logs:/app/logs \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.1
```

### 环境变量说明

| 变量 | 说明 | 是否必需 | 示例 |
|-----|------|--------|------|
| DEEPSEEK_API_KEY | 后端AI API密钥 | ✅ 必需 | sk-xxxxx |
| NEXT_PUBLIC_DEEPSEEK_API_KEY | 前端AI API密钥 | ⚠️ 可选 | sk-xxxxx |
| NEXT_PUBLIC_AI_302_API_KEY | PPT生成服务密钥 | ✅ 必需（PPT功能） | sk-xxxxx |
| NEXT_PUBLIC_BASE_URL | 应用前端URL | ✅ 必需 | http://115.29.191.180:3000 |
| NEXT_PUBLIC_SOCKET_IO_URL | Socket.IO服务URL | ✅ 必需 | http://115.29.191.180:3001 |

### 验证容器运行

```bash
# 查看容器状态
docker ps | grep legal-education

# 查看实时日志
docker logs -f legal-education-prod

# 关键日志应该显示：
# ✓ 环境变量生成完成
# ✓ 环境变量验证完成
# ✓ 启动 Next.js 应用
# ✓ 启动 Socket.IO 服务
```

### 通过API验证应用

```bash
# 测试Next.js健康检查
curl http://115.29.191.180:3000/api/health

# 测试Socket.IO服务
curl http://115.29.191.180:3001

# 访问应用
# http://115.29.191.180:3000
```

---

## 故障排查

### 🔴 问题1：容器启动后立即退出

**症状**：
```bash
docker logs legal-education-prod
# 显示短暂输出后退出
```

**原因**：通常是环境变量缺失

**解决方案**：
```bash
# 检查容器日志中的错误
docker logs legal-education-prod

# 关键检查：
# ❌ "DEEPSEEK_API_KEY 环境变量未设置" → 提供此环境变量
# ❌ "NEXT_PUBLIC_AI_302_API_KEY 未设置" → 提供此环境变量

# 重新运行容器（添加缺失的环境变量）
docker rm legal-education-prod
# 然后再次运行 docker run 命令
```

### 🔴 问题2：登入页面显示"建立连接失败"

**症状**：访问 http://115.29.191.180:3000 显示连接错误

**原因**：Next.js应用启动失败，通常是Python3编译问题

**解决方案**：
```bash
# 检查完整日志
docker logs -f legal-education-prod | head -50

# 查找是否有编译错误（better-sqlite3相关）
docker logs legal-education-prod | grep -i "error\|failed"

# 如果是编译问题，确保Dockerfile已更新为v3.0版本
# 重新构建镜像
./scripts/build-and-push-aliyun.sh v1.0.2
```

### 🔴 问题3：PPT生成失败，返回"API密钥错误"

**症状**：使用PPT功能显示"API调用失败"

**原因**：NEXT_PUBLIC_AI_302_API_KEY 未正确传入前端

**解决方案**：
```bash
# 检查环境变量是否注入
docker exec legal-education-prod cat /app/.env.production | grep AI_302

# 应该显示：NEXT_PUBLIC_AI_302_API_KEY=sk-xxxxx

# 如果为空，说明环境变量未传入容器
# 确保 docker run 命令中包含 -e NEXT_PUBLIC_AI_302_API_KEY=...
```

### 🔴 问题4：Socket.IO连接超时

**症状**：前端无法连接Socket.IO服务

**原因**：Socket.IO服务未启动或端口未开放

**解决方案**：
```bash
# 检查Socket.IO进程是否运行
docker exec legal-education-prod pm2 list

# 应该看到两个进程都是 "online" 状态：
# - nextjs-app (online)
# - socketio-server (online)

# 检查端口3001是否开放
netstat -tlnp | grep 3001

# 检查Socket.IO日志
docker logs legal-education-prod | grep -i "socket"
```

### 🔴 问题5：数据库无法创建

**症状**：应用正常启动但功能异常

**原因**：SQLite数据目录权限问题

**解决方案**：
```bash
# 进入容器检查权限
docker exec -it legal-education-prod sh

# 检查数据目录
ls -la /app/data

# 应该看到 nextjs:nodejs 所有者

# 如果权限不对，删除卷重新创建
docker stop legal-education-prod
docker rm legal-education-prod
docker volume rm legal-education-data

# 重新创建并运行
docker volume create legal-education-data
# 重新运行 docker run 命令
```

### 📊 监控和性能检查

```bash
# 查看容器资源使用
docker stats legal-education-prod

# 应该看到合理的内存使用（<500MB）和CPU使用

# 实时监控日志
docker logs -f legal-education-prod

# 查看进程详情
docker exec legal-education-prod pm2 show nextjs-app
docker exec legal-education-prod pm2 show socketio-server
```

---

## 常用命令汇总

### 容器管理
```bash
# 启动容器
docker start legal-education-prod

# 停止容器
docker stop legal-education-prod

# 重启容器
docker restart legal-education-prod

# 查看容器日志
docker logs -f legal-education-prod

# 进入容器
docker exec -it legal-education-prod sh

# 删除容器
docker rm legal-education-prod
```

### 镜像管理
```bash
# 查看本地镜像
docker images | grep legal-education

# 删除镜像
docker rmi crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.1

# 重新标记镜像
docker tag law-education:latest \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.2
```

### 卷管理
```bash
# 查看卷
docker volume ls | grep legal

# 检查卷内容
docker run -v legal-education-data:/data alpine ls -la /data

# 删除卷
docker volume rm legal-education-data
```

---

## 性能优化建议

### 1. 使用Nginx反向代理
```nginx
upstream legal_education {
  server localhost:3000 max_fails=3 fail_timeout=30s;
}

server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://legal_education;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Socket.IO配置
  location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### 2. 使用SSL/TLS
```bash
# 更新环境变量为HTTPS
docker run -d \
  -e NEXT_PUBLIC_BASE_URL=https://your-domain.com \
  -e NEXT_PUBLIC_SOCKET_IO_URL=https://your-domain.com:3001 \
  ...
```

### 3. 监控和告警
```bash
# 设置定期健康检查
0 */6 * * * curl -f http://localhost:3000/api/health || docker restart legal-education-prod
```

---

## 更新和回滚

### 更新到新版本

```bash
# 构建新版本
./scripts/build-and-push-aliyun.sh v1.0.2

# 在服务器上拉取新版本
docker pull \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.2

# 停止旧容器
docker stop legal-education-prod

# 运行新版本
docker run -d ... v1.0.2

# 验证
docker logs legal-education-prod
```

### 回滚到之前版本

```bash
# 停止当前容器
docker stop legal-education-prod

# 运行之前版本
docker run -d \
  ... \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.0
```

---

## 支持和反馈

遇到问题？请检查：
1. ✓ Docker版本 >= 20.10
2. ✓ 所有必需的环境变量都已设置
3. ✓ 端口3000和3001未被占用
4. ✓ 网络连接正常
5. ✓ 磁盘空间充足

更新时间：2025-10-17
Dockerfile 版本：v3.0
