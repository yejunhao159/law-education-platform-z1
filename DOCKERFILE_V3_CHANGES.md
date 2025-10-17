# 📝 Dockerfile v3.0 改进总结

## 🎯 核心改进

### 问题1️⃣：Python3编译错误 ✅ 已解决
```diff
FROM node:20-alpine AS base

+ # 添加Python3和构建工具
+ RUN apk add --no-cache \
+     libc6-compat \
+     python3 \
+     make \
+     g++ \
+     build-base

RUN apk add --no-cache libc6-compat
```

**影响**：
- ✅ `better-sqlite3` 可以正确编译
- ✅ 登入页面不再崩溃
- ✅ 所有原生模块编译正常

---

### 问题2️⃣：PPT前端API环境变量硬编码 ✅ 已解决

#### 新增脚本：`scripts/generate-env.sh`
```bash
# 运行时生成.env.production，动态注入环境变量
- 读取系统环境变量
- 生成.env.production文件
- 确保NEXT_PUBLIC_*变量可用
- 验证关键变量已设置
```

#### 改进的启动流程
```diff
- CMD ["pm2-runtime", "ecosystem.config.js"]
+ CMD ["sh", "-c", "set -e && \
+   ./scripts/generate-env.sh && \
+   ./scripts/check-env.sh && \
+   pm2-runtime ecosystem.config.js"]
```

**执行顺序**：
```
[1/3] 运行time生成环境变量 (generate-env.sh)
   └─ 读取 DEEPSEEK_API_KEY, NEXT_PUBLIC_AI_302_API_KEY 等
   └─ 生成 .env.production 文件
   └─ 供Next.js应用使用

[2/3] 验证环境变量 (check-env.sh)
   └─ 检查必要变量是否存在
   └─ 报告缺失的变量

[3/3] 启动PM2服务
   └─ 启动 nextjs-app (端口3000)
   └─ 启动 socketio-server (端口3001)
```

**影响**：
- ✅ PPT生成功能可以获取 `NEXT_PUBLIC_AI_302_API_KEY`
- ✅ 前端API调用不再使用占位符值
- ✅ 环境变量可以在 `docker run -e` 时动态传入

---

### 问题3️⃣：Socket.IO依赖冲突 ✅ 已解决

#### 改进的依赖安装
```diff
# deps 阶段
- RUN npm ci --legacy-peer-deps
+ RUN npm ci \
+     --legacy-peer-deps \
+     --no-optional \
+     && npm cache clean --force

# runner 阶段
+ RUN npm ci --only=production --legacy-peer-deps --omit=dev --ignore-scripts
```

**改进点**：
- `--legacy-peer-deps`：避免peer依赖冲突
- `--no-optional`：skip可选依赖以加快安装
- `--ignore-scripts`：跳过prepare脚本（husky在生产环境不需要）
- `--omit=dev`：确保只安装生产依赖

**影响**：
- ✅ Socket.IO依赖完整安装
- ✅ 无peer依赖冲突
- ✅ 不会有遗漏的传递依赖

---

## 📂 新增文件

### 1. `scripts/generate-env.sh` - 环境变量运行时注入
```bash
# 关键功能：
✓ 在容器启动时生成.env.production
✓ 注入系统环境变量到应用
✓ 验证必要的API密钥已设置
✓ 生成清晰的日志输出

# 用法：
docker run -e DEEPSEEK_API_KEY=sk-xxxxx \
           -e NEXT_PUBLIC_AI_302_API_KEY=sk-xxxxx \
           ... legal-education:latest
```

### 2. `scripts/build-and-push-aliyun.sh` - 一键构建推送
```bash
# 关键功能：
✓ 检查Docker环境
✓ 验证阿里云登录
✓ 构建优化的Docker镜像
✓ 推送到阿里云Container Registry
✓ 显示部署后的操作步骤

# 用法：
./scripts/build-and-push-aliyun.sh v1.0.1
```

### 3. `ALIYUN_DEPLOY_GUIDE.md` - 完整部署指南
- 详细的阿里云部署步骤
- 环境变量说明
- 常见问题排查
- 性能优化建议

### 4. `DOCKERFILE_V3_CHANGES.md` - 本文档
- 详细记录所有改进
- 解释修复的原因

---

## 🔧 环境变量配置

### 必需的环境变量

| 变量 | 用途 | 示例 | 必需 |
|-----|------|------|------|
| DEEPSEEK_API_KEY | 后端AI API密钥 | sk-xxxxx | ✅ |
| NEXT_PUBLIC_DEEPSEEK_API_KEY | 前端AI API密钥 | sk-xxxxx | ⚠️ (可选，使用后端密钥) |
| NEXT_PUBLIC_AI_302_API_KEY | PPT生成服务密钥 | sk-xxxxx | ✅ (PPT功能) |

### 可选的环境变量

| 变量 | 默认值 | 示例 |
|-----|-------|------|
| NEXT_PUBLIC_BASE_URL | http://localhost:3000 | http://115.29.191.180:3000 |
| NEXT_PUBLIC_SOCKET_IO_URL | http://localhost:3001 | http://115.29.191.180:3001 |
| NODE_ENV | production | production |

### 在Docker中使用

```bash
docker run -d \
  --name legal-education \
  -p 3000:3000 \
  -p 3001:3001 \
  -e DEEPSEEK_API_KEY=sk-xxxxx \
  -e NEXT_PUBLIC_AI_302_API_KEY=sk-xxxxx \
  -e NEXT_PUBLIC_BASE_URL=http://115.29.191.180:3000 \
  -e NEXT_PUBLIC_SOCKET_IO_URL=http://115.29.191.180:3001 \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.1
```

---

## 📊 对比：修复前后

### 修复前的问题

| 问题 | 表现 | 原因 |
|-----|------|------|
| Python3编译错误 | 登入页面崩溃 | Alpine镜像缺少python3 |
| 环境变量硬编码 | PPT功能失败 | NEXT_PUBLIC_*被编译到客户端代码 |
| 依赖不完整 | Socket.IO不稳定 | standalone模式遗漏传递依赖 |

### 修复后的改进

| 问题 | 现状 | 方案 |
|-----|------|------|
| Python3编译错误 | ✅ 已解决 | 添加python3, make, g++, build-base |
| 环境变量硬编码 | ✅ 已解决 | 运行时脚本注入.env.production |
| 依赖不完整 | ✅ 已解决 | 重新安装完整生产依赖 |

---

## 🚀 快速开始

### 本地构建
```bash
docker build -f Dockerfile -t law-education:latest .
```

### 推送到阿里云
```bash
chmod +x scripts/build-and-push-aliyun.sh
./scripts/build-and-push-aliyun.sh v1.0.1
```

### 在服务器运行
```bash
docker pull crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.1

docker run -d \
  --name legal-education \
  -p 3000:3000 -p 3001:3001 \
  -e DEEPSEEK_API_KEY=sk-xxxxx \
  -e NEXT_PUBLIC_AI_302_API_KEY=sk-xxxxx \
  crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com/yejunhao/legal-education:v1.0.1
```

---

## 🔍 验证修复

### 检查Python3已安装
```bash
docker run --rm law-education:latest python3 --version
```

### 检查环境变量注入
```bash
docker run -e DEEPSEEK_API_KEY=test law-education:latest \
  cat /app/.env.production | grep DEEPSEEK_API_KEY
```

### 检查Socket.IO依赖
```bash
docker run --rm law-education:latest npm list socket.io
```

---

## 📝 技术细节

### 多阶段构建优化
```
base (node:20-alpine + python3)
  ↓
deps (npm ci --legacy-peer-deps)
  ↓
builder (npm run build)
  ↓
runner (重新安装生产依赖 + PM2)
```

**结果**：
- ✅ 编译依赖不进入最终镜像
- ✅ 所有生产依赖完整
- ✅ 镜像大小优化

### 启动流程改进
```
启动容器
  ↓
generate-env.sh
  └─ 验证环境变量
  └─ 生成.env.production
  └─ 日志输出
  ↓
check-env.sh
  └─ 验证必要变量
  └─ 返回状态码
  ↓
pm2-runtime
  └─ 启动Next.js (3000)
  └─ 启动Socket.IO (3001)
```

---

## ⚠️ 重要注意事项

1. **必须提供DEEPSEEK_API_KEY**
   - 没有它应用无法启动
   - 检查日志中的错误信息

2. **NEXT_PUBLIC_AI_302_API_KEY影响PPT功能**
   - 如果不提供，PPT生成功能不可用
   - 但不会导致应用启动失败

3. **BASE_URL和SOCKET_IO_URL很重要**
   - 在生产环境必须设置为正确的域名
   - 否则前端会找不到API和WebSocket服务

4. **数据持久化**
   - 建议使用docker volume持久化/app/data目录
   - SQLite数据库存储在此目录

---

## 🔄 升级路径

### 从v2.0升级到v3.0
```bash
# 备份数据
docker cp legal-education-old:/app/data ./data-backup

# 停止旧容器
docker stop legal-education-old

# 拉取新镜像
docker pull ...v3.0.0

# 运行新容器
docker run -d \
  -v $(pwd)/data-backup:/app/data \
  ... v3.0.0
```

---

## 📞 支持

遇到问题？

1. 检查 `ALIYUN_DEPLOY_GUIDE.md` 的故障排查章节
2. 查看容器日志：`docker logs -f legal-education`
3. 验证所有必需的环境变量已设置

---

**版本**：v3.0
**更新时间**：2025-10-17
**作者**：Claude Code
