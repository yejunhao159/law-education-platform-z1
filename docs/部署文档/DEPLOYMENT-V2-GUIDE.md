# 🚀 Docker部署完全指南 v2.0（治本方案）

> 本文档描述了基于治本方案v2.0的完整部署流程，彻底解决Socket.IO依赖问题

---

## 📋 目录

- [核心改进说明](#核心改进说明)
- [快速部署](#快速部署)
- [详细部署步骤](#详细部署步骤)
- [验证清单](#验证清单)
- [故障排查](#故障排查)
- [版本升级指南](#版本升级指南)

---

## 🎯 核心改进说明

### 什么问题被彻底解决了？

**旧问题**（v1.x）：
- 手动维护Socket.IO依赖列表（Dockerfile中COPY 20+行依赖）
- 容易遗漏传递依赖（导致Issue #49, #50）
- socket.io升级需要重新审查和修改Dockerfile
- 环境变量配置错误只能在运行时发现

**新方案**（v2.0）：
- ✅ 使用`npm ci --only=production`自动安装所有依赖
- ✅ 自动处理所有传递依赖（negotiator, mime-types等）
- ✅ socket.io升级无需修改Dockerfile
- ✅ 容器启动时自动验证环境变量

### 权衡说明

| 维度 | 旧方案 | 新方案 |
|------|--------|--------|
| 镜像大小 | ~200MB | ~250-300MB (+50-100MB) |
| 构建时间 | ~3分钟 | ~4-5分钟 (+30-60秒) |
| 依赖完整性 | ⚠️ 手动维护，容易遗漏 | ✅ 自动完整 |
| 可维护性 | ❌ 依赖升级需要手动调整 | ✅ 自动适配 |
| 环境安全 | ⚠️ 运行时才发现配置错误 | ✅ 启动时验证 |

**结论**：牺牲50MB镜像大小和30秒构建时间，换取可靠性和可维护性，值得。

---

## ⚡ 快速部署

### 第一次部署

```bash
# 1. SSH登录服务器
ssh user@115.29.191.180

# 2. 创建项目目录
mkdir -p ~/law-education-platform
cd ~/law-education-platform

# 3. 下载部署文件
wget https://raw.githubusercontent.com/yejunhao159/law-education-platform-z1/main/docker-compose.prod.yml
wget https://raw.githubusercontent.com/yejunhao159/law-education-platform-z1/main/.env.example

# 4. 创建环境变量文件（重要！）
cp .env.example .env.production

# 5. 编辑环境变量（必需配置）
vim .env.production
```

**必需配置**（.env.production）：
```bash
# ========== 核心AI服务（必需） ==========
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
NEXT_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com/v1

# ========== PPT功能（推荐） ==========
NEXT_PUBLIC_AI_302_API_KEY=sk-302ai-xxxxxxxxxxxxxxxxxxxxxxxx

# ========== Socket.IO配置（推荐） ==========
NEXT_PUBLIC_SOCKET_URL=http://115.29.191.180:3001

# ========== 环境配置 ==========
NODE_ENV=production
```

```bash
# 6. 登录GitHub Container Registry
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 7. 拉取镜像并启动
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 8. 验证部署（重要！）
docker logs law-edu-app-prod --tail 50
```

### 预期的正常输出

```
🔍 [ENV-CHECK] 开始检查必需的环境变量...
✅ [ENV-CHECK] 环境变量检查通过！

📋 当前环境配置：
   NODE_ENV: production
   DEEPSEEK_API_KEY: sk-xxxxxxx... (已配置)
   NEXT_PUBLIC_AI_302_API_KEY: 已配置
   NEXT_PUBLIC_SOCKET_URL: http://115.29.191.180:3001

[PM2] Starting in no daemon mode
╔════════════════════════════════════════════════════════════╗
║  🚀 Socket.IO 服务器已启动                                ║
║  📡 监听端口: 3001                                         ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📝 详细部署步骤

### Step 1: 准备服务器环境

#### 1.1 安装Docker

```bash
# 检查Docker是否已安装
docker --version
docker-compose --version

# 如果未安装，执行以下命令（Ubuntu/Debian）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

#### 1.2 创建项目目录结构

```bash
mkdir -p ~/law-education-platform/{logs,data,backups}
cd ~/law-education-platform
```

### Step 2: 配置环境变量

#### 2.1 创建.env.production文件

这是**最关键的一步**，环境变量配置错误会导致容器拒绝启动。

```bash
cat > .env.production << 'EOF'
# =============================================================================
# 法学教育平台 - 生产环境配置
# =============================================================================
# 重要：此文件包含敏感信息，请勿提交到Git
# =============================================================================

# ========== 核心AI服务（必需） ==========
# 获取方式：https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-your-deepseek-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
NEXT_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com/v1

# ========== PPT生成功能（推荐配置） ==========
# 获取方式：https://302.ai/ 注册后在"API管理"页面创建
# 格式：sk-302ai-xxxxxxxxxxxxx
# 未配置则PPT生成功能不可用，其他功能正常
NEXT_PUBLIC_AI_302_API_KEY=sk-302ai-your-key-here

# ========== Socket.IO实时通信（推荐配置） ==========
# 生产环境：使用服务器公网IP或域名
# 开发环境：使用localhost
# 未配置则使用客户端默认配置（可能导致跨域问题）
NEXT_PUBLIC_SOCKET_URL=http://115.29.191.180:3001

# ========== 环境配置 ==========
NODE_ENV=production

# ========== 可选配置：Redis缓存 ==========
# 如果启用Redis，取消注释以下配置
# REDIS_URL=redis://localhost:6379
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
EOF
```

#### 2.2 验证环境变量文件

```bash
# 检查文件是否包含必需的配置
grep "DEEPSEEK_API_KEY" .env.production
grep "NEXT_PUBLIC_AI_302_API_KEY" .env.production

# 确保文件权限正确
chmod 600 .env.production
```

### Step 3: 登录GitHub Container Registry

```bash
# 1. 生成GitHub Personal Access Token
# 访问：https://github.com/settings/tokens
# 权限：勾选 read:packages, write:packages

# 2. 登录GHCR
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 3. 验证登录
docker pull ghcr.io/yejunhao159/law-education-platform-z1:latest
```

### Step 4: 部署容器

```bash
# 1. 拉取最新镜像
docker-compose -f docker-compose.prod.yml pull

# 2. 启动服务（后台运行）
docker-compose -f docker-compose.prod.yml up -d

# 3. 查看启动日志
docker logs law-edu-app-prod -f
```

### Step 5: 验证部署（关键步骤）

执行以下验证清单，确保所有功能正常：

```bash
# 1. 容器状态检查
docker ps | grep law-edu
# 预期：应该看到law-edu-app-prod容器在运行（Up状态）

# 2. 环境变量验证
docker exec law-edu-app-prod env | grep -E "DEEPSEEK|302|SOCKET"
# 预期：应该看到所有配置的环境变量

# 3. 健康检查
curl http://localhost:3000/api/health
# 预期：返回200状态码和JSON响应

# 4. Socket.IO服务检查
curl http://localhost:3001/socket.io/
# 预期：返回400（正常，因为不是WebSocket握手）

# 5. PM2进程检查
docker exec law-edu-app-prod pm2 list
# 预期：nextjs-app和socketio-server都是online状态

# 6. 依赖完整性检查
docker exec law-edu-app-prod sh -c '
  test -d /app/node_modules/socket.io && echo "✅ socket.io" || echo "❌ socket.io缺失"
  test -d /app/node_modules/negotiator && echo "✅ negotiator" || echo "❌ negotiator缺失"
  test -d /app/node_modules/tiktoken && echo "✅ tiktoken" || echo "❌ tiktoken缺失"
'
# 预期：所有依赖都显示✅

# 7. 启动日志检查
docker logs law-edu-app-prod --tail 100 | grep -E "ENV-CHECK|Socket.IO"
# 预期：
#   - ✅ [ENV-CHECK] 环境变量检查通过！
#   - 🚀 Socket.IO 服务器已启动
```

---

## ✅ 验证清单

### 部署后必须验证的项目

| 检查项 | 验证命令 | 预期结果 | 状态 |
|--------|----------|----------|------|
| **1. 容器运行** | `docker ps \| grep law-edu` | 容器状态为Up | ☐ |
| **2. 环境变量** | `docker exec law-edu-app-prod env \| grep DEEPSEEK` | 显示密钥 | ☐ |
| **3. Next.js健康** | `curl http://localhost:3000/api/health` | 返回200 | ☐ |
| **4. Socket.IO运行** | `curl http://localhost:3001/socket.io/` | 返回400 | ☐ |
| **5. PM2进程** | `docker exec law-edu-app-prod pm2 list` | 2个进程online | ☐ |
| **6. Socket.IO依赖** | 见上方验证命令 | 所有✅ | ☐ |
| **7. 启动日志正常** | `docker logs law-edu-app-prod --tail 50` | 无ERROR | ☐ |

### 功能验证（通过浏览器）

1. **访问首页**：http://115.29.191.180:3000
   - ☐ 页面正常加载
   - ☐ 无控制台错误

2. **案例导入功能**：上传一个Word或PDF文件
   - ☐ 文件上传成功
   - ☐ AI分析正常

3. **苏格拉底对话**：进入第三幕
   - ☐ 对话界面正常显示
   - ☐ AI回复正常

4. **实时课堂功能**：创建课堂
   - ☐ Socket.IO连接成功（浏览器控制台无WebSocket错误）
   - ☐ 实时消息推送正常

5. **PPT生成功能**（如果配置了302.ai）：
   - ☐ 进入第四幕
   - ☐ PPT生成成功

---

## 🔧 故障排查

### 问题1: 容器启动失败，显示环境变量缺失

**症状**：
```
❌ [ENV-CHECK] 环境变量检查失败！缺少必需配置：
  ❌ DEEPSEEK_API_KEY - DeepSeek AI服务密钥（核心功能必需）
```

**解决方案**：
```bash
# 1. 检查.env.production文件是否存在
ls -la .env.production

# 2. 检查docker-compose.prod.yml是否正确加载环境变量
grep "env_file" docker-compose.prod.yml

# 3. 手动注入环境变量测试
docker run --rm \
  -e DEEPSEEK_API_KEY=test-key \
  -e NEXT_PUBLIC_DEEPSEEK_API_KEY=test-key \
  -e NODE_ENV=production \
  ghcr.io/yejunhao159/law-education-platform-z1:latest \
  sh -c './scripts/check-env.sh'
```

### 问题2: Socket.IO连接失败

**症状**：浏览器控制台显示WebSocket连接错误

**解决方案**：
```bash
# 1. 检查Socket.IO服务是否运行
curl http://115.29.191.180:3001/socket.io/

# 2. 检查CORS配置
docker exec law-edu-app-prod cat server/socket-server.js | grep -A 15 "cors:"

# 3. 检查防火墙
sudo ufw status
sudo ufw allow 3001/tcp

# 4. 检查环境变量
docker exec law-edu-app-prod env | grep SOCKET
```

### 问题3: PPT生成失败

**症状**：点击生成PPT后报错"API Key未配置"

**解决方案**：
```bash
# 1. 检查302.ai密钥是否配置
docker exec law-edu-app-prod env | grep AI_302

# 2. 验证密钥格式（应该是sk-302ai-开头）
# 编辑.env.production，确保格式正确

# 3. 重启容器加载新配置
docker-compose -f docker-compose.prod.yml restart

# 4. 检查日志
docker logs law-edu-app-prod 2>&1 | grep -i "302"
```

### 问题4: 依赖缺失（negotiator等）

**症状**：容器启动后Socket.IO功能异常

**注意**：v2.0版本使用`npm ci --only=production`自动安装所有依赖，这个问题应该不会再出现。如果出现：

```bash
# 1. 验证镜像版本是否是v2.0
docker inspect ghcr.io/yejunhao159/law-education-platform-z1:latest | grep "治本"

# 2. 检查依赖完整性
docker exec law-edu-app-prod ls -la /app/node_modules | grep negotiator

# 3. 如果确实缺失，拉取最新镜像
docker pull ghcr.io/yejunhao159/law-education-platform-z1:latest
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## 🔄 版本升级指南

### 从v1.x升级到v2.0

```bash
# 1. 备份当前配置
cp .env.production .env.production.backup

# 2. 停止旧版本
docker-compose -f docker-compose.prod.yml down

# 3. 拉取v2.0镜像
docker pull ghcr.io/yejunhao159/law-education-platform-z1:latest

# 4. 验证新镜像
docker run --rm ghcr.io/yejunhao159/law-education-platform-z1:latest cat Dockerfile | grep "治本"

# 5. 启动新版本
docker-compose -f docker-compose.prod.yml up -d

# 6. 验证升级
docker logs law-edu-app-prod --tail 50 | grep "治本"
```

### 未来版本升级

```bash
# 标准升级流程
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
docker logs law-edu-app-prod --tail 50
```

---

## 📊 性能监控

### 容器资源使用

```bash
# 实时监控
docker stats law-edu-app-prod

# 资源限制（在docker-compose.prod.yml中）
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

### 日志管理

```bash
# 查看最近日志
docker logs law-edu-app-prod --tail 100 -f

# 日志轮转（已在docker-compose.prod.yml中配置）
logging:
  driver: "json-file"
  options:
    max-size: "50m"
    max-file: "10"
```

---

## 📞 获取帮助

遇到问题？

1. **检查本文档的故障排查部分**
2. **查看GitHub Issues**：https://github.com/yejunhao159/law-education-platform-z1/issues
3. **提交新Issue**：提供详细的错误日志和环境信息

---

**版本信息**：
- 文档版本：v2.0
- 适用镜像：ghcr.io/yejunhao159/law-education-platform-z1:latest (v2.0+)
- 最后更新：2025-01-16
- 作者：Sean - PromptX
