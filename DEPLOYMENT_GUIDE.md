# 🚀 法学教育平台 - 完整部署指南

## 📋 目录

1. [部署流程概览](#部署流程概览)
2. [前置准备](#前置准备)
3. [配置GitHub Secrets](#配置github-secrets)
4. [触发构建和推送](#触发构建和推送)
5. [服务器部署](#服务器部署)
6. [验证和测试](#验证和测试)
7. [故障排查](#故障排查)

---

## 🎯 部署流程概览

```
开发者推送代码
    ↓
GitHub Actions 自动构建 Docker 镜像
    ↓
验证镜像完整性
    ↓
推送到阿里云容器镜像仓库
    ↓
服务器拉取镜像并部署
    ↓
应用运行
```

**优势**：
- ✅ 利用GitHub Actions免费CI/CD资源
- ✅ 阿里云镜像仓库在中国大陆访问速度快
- ✅ 服务器部署简单快速（只需拉取镜像）
- ✅ 版本管理清晰（每次提交都有对应的镜像）

---

## 🔧 前置准备

### 1. 阿里云容器镜像仓库信息

已配置的仓库信息：
```
仓库名称: legal-education
仓库地域: 华南1（深圳）
仓库类型: 公开
公网地址: crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education
用户名: nick2447759034
密码: [需要在阿里云访问凭证页面查看/设置]
```

### 2. 需要的API密钥

- `DEEPSEEK_API_KEY`: DeepSeek AI API密钥
- `NEXT_PUBLIC_AI_302_API_KEY`: 302.ai PPT生成API密钥

---

## 🔐 配置GitHub Secrets

### Step 1: 进入GitHub仓库设置

1. 访问: https://github.com/yejunhao159/law-education-platform-z1
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**

### Step 2: 添加阿里云容器镜像仓库密钥

需要添加以下4个Secrets：

#### Secret 1: ALIYUN_REGISTRY
```
Name: ALIYUN_REGISTRY
Secret: crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com
```

#### Secret 2: ALIYUN_REGISTRY_USER
```
Name: ALIYUN_REGISTRY_USER
Secret: nick2447759034
```

#### Secret 3: ALIYUN_REGISTRY_PASSWORD
```
Name: ALIYUN_REGISTRY_PASSWORD
Secret: [你的阿里云容器镜像仓库密码]
```

**⚠️ 如何获取密码**：
1. 访问阿里云容器镜像服务控制台
2. 点击 **访问凭证**
3. 查看或重置密码

#### Secret 4: ALIYUN_IMAGE_REPO
```
Name: ALIYUN_IMAGE_REPO
Secret: yejunhao/legal-education
```

### Step 3: 添加API密钥（如果还没有）

#### DEEPSEEK_API_KEY
```
Name: DEEPSEEK_API_KEY
Secret: sk-6b081a93258346379182141661293345
```

#### NEXT_PUBLIC_AI_302_API_KEY
```
Name: NEXT_PUBLIC_AI_302_API_KEY
Secret: sk-AJeqG8UJnqhvwAQP16DGTtb0VIfTuhDjtJID22Lh3yDKQbPz
```

### Step 4: 验证配置

所有Secrets配置完成后，你应该看到：
- ✅ ALIYUN_REGISTRY
- ✅ ALIYUN_REGISTRY_USER
- ✅ ALIYUN_REGISTRY_PASSWORD
- ✅ ALIYUN_IMAGE_REPO
- ✅ DEEPSEEK_API_KEY
- ✅ NEXT_PUBLIC_AI_302_API_KEY

---

## 🚀 触发构建和推送

### 自动触发

每次推送到 `main` 分支时，GitHub Actions 会自动：
1. 构建Docker镜像
2. 验证镜像完整性
3. 推送到阿里云容器镜像仓库

### 手动触发

1. 访问: https://github.com/yejunhao159/law-education-platform-z1/actions
2. 选择 **🐳 Build and Verify Docker Image** workflow
3. 点击 **Run workflow** → **Run workflow**

### 查看构建进度

```bash
# 使用GitHub CLI（本地）
gh run list --limit 5
gh run view <run-id>
gh run view <run-id> --log

# 或访问网页
https://github.com/yejunhao159/law-education-platform-z1/actions
```

---

## 🖥️ 服务器部署

### 方式1：使用公网地址（推荐）

```bash
# 1. 拉取最新镜像
docker pull crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:latest

# 2. 停止旧容器（如果存在）
docker stop law-edu-platform || true
docker rm law-edu-platform || true

# 3. 启动新容器
docker run -d --name law-edu-platform \
  -p 3000:3000 -p 3001:3001 \
  -e GUEST_MODE=true \
  -e DEEPSEEK_API_KEY=sk-6b081a93258346379182141661293345 \
  -e NEXT_PUBLIC_AI_302_API_KEY=sk-AJeqG8UJnqhvwAQP16DGTtb0VIfTuhDjtJID22Lh3yDKQbPz \
  -e NEXT_PUBLIC_BASE_URL=http://你的服务器IP:3000 \
  -e NEXT_PUBLIC_SOCKET_IO_URL=http://你的服务器IP:3000 \
  --restart unless-stopped \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:latest

# 4. 查看日志
docker logs -f law-edu-platform
```

### 方式2：使用专有网络（VPC内网）

如果服务器在阿里云VPC网络内：

```bash
# 使用内网地址，速度更快且不消耗公网流量
docker pull crpi-k9wo9ii25m22jesx-vpc.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:latest

docker run -d --name law-edu-platform \
  -p 3000:3000 -p 3001:3001 \
  -e GUEST_MODE=true \
  -e DEEPSEEK_API_KEY=sk-6b081a93258346379182141661293345 \
  -e NEXT_PUBLIC_AI_302_API_KEY=sk-AJeqG8UJnqhvwAQP16DGTtb0VIfTuhDjtJID22Lh3yDKQbPz \
  --restart unless-stopped \
  crpi-k9wo9ii25m22jesx-vpc.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:latest
```

### 环境变量说明

| 环境变量 | 说明 | 是否必须 | 默认值 |
|---------|------|---------|--------|
| `GUEST_MODE` | 游客模式（跳过登录） | 否 | false |
| `DEEPSEEK_API_KEY` | DeepSeek AI密钥 | 是 | - |
| `NEXT_PUBLIC_AI_302_API_KEY` | 302.ai PPT生成密钥 | 是 | - |
| `NEXT_PUBLIC_BASE_URL` | 应用访问地址 | 否 | http://localhost:3000 |
| `NEXT_PUBLIC_SOCKET_IO_URL` | Socket.IO地址 | 否 | http://localhost:3000 |

---

## ✅ 验证和测试

### 1. 检查容器状态

```bash
# 查看容器是否运行
docker ps | grep law-edu-platform

# 查看容器日志
docker logs law-edu-platform

# 查看实时日志
docker logs -f law-edu-platform
```

### 2. 验证服务可用性

```bash
# 检查HTTP服务
curl http://localhost:3000

# 检查健康检查接口（如果有）
curl http://localhost:3000/api/health
```

### 3. 浏览器访问

打开浏览器访问：
```
http://你的服务器IP:3000
```

**游客模式下**：
- ✅ 应该直接进入主页（不会重定向到登录页）
- ✅ 可以使用所有AI教学功能
- ✅ Socket.IO实时功能正常

---

## 🔍 故障排查

### 问题1: 容器无法启动

**检查日志**：
```bash
docker logs law-edu-platform
```

**常见原因**：
- API密钥未设置或错误
- 端口被占用（3000或3001）
- 内存不足

**解决方案**：
```bash
# 检查端口占用
netstat -tulpn | grep -E "3000|3001"

# 检查系统资源
docker stats law-edu-platform
```

### 问题2: GitHub Actions构建失败

**查看详细日志**：
```bash
gh run view <run-id> --log-failed
```

**常见原因**：
- GitHub Secrets未配置或错误
- Dockerfile语法错误
- 依赖安装失败

### 问题3: 推送到阿里云失败

**检查**：
1. ALIYUN_REGISTRY_PASSWORD 是否正确
2. 阿里云容器镜像仓库是否存在
3. 用户名是否正确

**解决方案**：
访问阿里云控制台 → 容器镜像服务 → 访问凭证 → 重置密码

### 问题4: 服务器拉取镜像慢

**优化方案**：
1. 如果在阿里云VPC内，使用内网地址
2. 检查服务器网络连接
3. 使用镜像加速器

---

## 📊 完整部署流程（一键脚本）

### 服务器部署脚本

创建 `deploy.sh`：

```bash
#!/bin/bash
set -e

echo "🚀 开始部署法学教育平台..."

# 配置
IMAGE="crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:latest"
CONTAINER_NAME="law-edu-platform"

# 拉取最新镜像
echo "📦 拉取最新镜像..."
docker pull $IMAGE

# 停止并删除旧容器
echo "🛑 停止旧容器..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 启动新容器
echo "🚀 启动新容器..."
docker run -d --name $CONTAINER_NAME \
  -p 3000:3000 -p 3001:3001 \
  -e GUEST_MODE=true \
  -e DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY} \
  -e NEXT_PUBLIC_AI_302_API_KEY=${NEXT_PUBLIC_AI_302_API_KEY} \
  -e NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-http://localhost:3000} \
  -e NEXT_PUBLIC_SOCKET_IO_URL=${NEXT_PUBLIC_SOCKET_IO_URL:-http://localhost:3000} \
  --restart unless-stopped \
  $IMAGE

# 等待容器启动
echo "⏳ 等待容器启动..."
sleep 5

# 检查容器状态
if docker ps | grep -q $CONTAINER_NAME; then
  echo "✅ 部署成功！"
  echo ""
  echo "📋 容器信息："
  docker ps | grep $CONTAINER_NAME
  echo ""
  echo "📝 查看日志："
  echo "  docker logs -f $CONTAINER_NAME"
else
  echo "❌ 部署失败，请查看日志："
  docker logs $CONTAINER_NAME
  exit 1
fi
```

### 使用脚本部署

```bash
# 1. 设置环境变量
export DEEPSEEK_API_KEY=sk-6b081a93258346379182141661293345
export NEXT_PUBLIC_AI_302_API_KEY=sk-AJeqG8UJnqhvwAQP16DGTtb0VIfTuhDjtJID22Lh3yDKQbPz
export NEXT_PUBLIC_BASE_URL=http://你的服务器IP:3000

# 2. 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

---

## 🎯 总结

### 正确的部署流程

1. **开发阶段**：本地开发，使用 `npm run dev`
2. **提交代码**：推送到GitHub main分支
3. **自动构建**：GitHub Actions自动构建镜像
4. **自动推送**：镜像推送到阿里云容器镜像仓库
5. **服务器部署**：从阿里云拉取镜像并运行

### 关键优势

- ✅ **快速**：GitHub构建 + 阿里云分发，速度快
- ✅ **稳定**：不依赖本地或服务器构建环境
- ✅ **自动**：推送代码即自动部署
- ✅ **可靠**：每个版本都有对应的镜像
- ✅ **省钱**：使用GitHub免费CI/CD资源

---

**创建时间**: 2025-10-18
**作者**: Sean (PromptX)
**版本**: v1.0 - Aliyun Deployment
