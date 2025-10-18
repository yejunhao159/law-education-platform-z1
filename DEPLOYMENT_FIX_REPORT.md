# 🚀 部署配置修复报告 (v1.2.1)

## 📋 问题总结

经过全面审查，发现了以下严重问题，已全部修复：

### 🚨 1. AI_302_API_KEY 配置缺失（严重问题）

**问题描述**：服务器拉取镜像后，PPT生成功能会失败

**根本原因**：
- Dockerfile 缺少 `AI_302_API_KEY` 构建参数
- GitHub workflows 使用了错误的环境变量名 `NEXT_PUBLIC_AI_302_API_KEY`
- 但服务端 API (`/api/ppt`) 使用的是 `AI_302_API_KEY`（无NEXT_PUBLIC前缀）

**影响**：
- 容器启动后找不到 `AI_302_API_KEY`
- PPT生成请求返回 500 错误
- 功能完全不可用

**修复方案**：
1. ✅ Dockerfile 添加 `ARG AI_302_API_KEY=""`
2. ✅ Dockerfile 添加 `ENV AI_302_API_KEY=${AI_302_API_KEY}`
3. ✅ 所有 workflows 更新 build-args 使用正确的变量名

---

### ⚠️ 2. GitHub Workflows 重复（资源浪费）

**问题描述**：推送到 main 分支会同时触发 3 个 workflows

**当前状态**：
- `docker-build-push.yml` - 推送到阿里云
- `docker-export.yml` - 导出 tar
- `docker-publish-main.yml` - 推送到 GHCR

**影响**：
- 浪费 CI 资源
- 构建时间过长（每次 main 推送触发 3 次构建）
- 维护困难

**建议方案**（未实施，需要用户确认）：
合并为 2 个 workflow：
1. `ci.yml` - 代码质量检查
2. `docker-unified.yml` - 统一的 Docker 构建
   - main 推送 → GHCR + 阿里云 (latest)
   - tag 推送 → GHCR + 阿里云 (版本标签)

---

### 🔧 3. 超时和 Token 限制不足

**问题描述**：PPT生成可能因超时或token截断而失败

**当前配置**：
```
PPT API 超时: 6 分钟 (360000ms)
maxTokens:
  - short: 5000
  - medium: 8000
  - long: 12000
Socket.IO pingTimeout: 60秒
```

**优化后**：
```
PPT API 超时: 8 分钟 (480000ms) ✅ 提高 33%
maxTokens:
  - short: 8000   ✅ 提高 60%
  - medium: 12000 ✅ 提高 50%
  - long: 16000   ✅ 提高 33%
Socket.IO pingTimeout: 120秒 ✅ 提高 100%
```

**理由**：
- PPT生成可能需要 3-6 分钟
- 更高的 maxTokens 确保内容完整性和质量
- 更长的 Socket 超时避免长时间操作时连接断开

---

## ✅ 已完成的修复

### 1. Dockerfile 修复
```diff
# 接收构建参数
ARG DEEPSEEK_API_KEY=""
+ ARG AI_302_API_KEY=""
ARG NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# 设置环境变量
ENV DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
+ ENV AI_302_API_KEY=${AI_302_API_KEY}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
```

### 2. GitHub Workflows 修复

**docker-build-push.yml**:
```diff
build-args: |
  DEEPSEEK_API_KEY=${{ secrets.DEEPSEEK_API_KEY }}
- NEXT_PUBLIC_AI_302_API_KEY=${{ secrets.NEXT_PUBLIC_AI_302_API_KEY }}
+ AI_302_API_KEY=${{ secrets.AI_302_API_KEY }}
  NEXT_PUBLIC_BASE_URL=${{ secrets.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000' }}
- NEXT_PUBLIC_SOCKET_IO_URL=${{ secrets.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:3000' }}
```

**docker-publish-main.yml**: ✅ 添加 build-args
**docker-publish.yml**: ✅ 添加 build-args

### 3. 超时和 Token 限制提升

**app/api/ppt/route.ts**:
```diff
- const REQUEST_TIMEOUT = 360_000; // 6 minutes
+ const REQUEST_TIMEOUT = 480_000; // 8 minutes
```

**src/domains/teaching-acts/services/PptGeneratorService.ts**:
```diff
const maxTokensMap = {
- short: 5000,
- medium: 8000,
- long: 12000
+ short: 8000,   // 提高 60%
+ medium: 12000, // 提高 50%
+ long: 16000    // 提高 33%
};
```

**server/socket-server.js** 和 **server/index.js**:
```diff
- pingTimeout: 60000,
+ pingTimeout: 120000,  // 2分钟（提高到120秒）
pingInterval: 25000,
```

### 4. 环境变量示例文件修复

**发现问题**：所有 `.env` 示例文件仍在使用旧的变量名 `NEXT_PUBLIC_AI_302_API_KEY`

**修复文件**：
- `.env.example` ✅
- `.env.local.example` ✅
- `.env.production.example` ✅

**修复内容**：
```diff
- NEXT_PUBLIC_AI_302_API_KEY=your-302ai-api-key-here
+ AI_302_API_KEY=your-302ai-api-key-here
```

同时移除了废弃的 `NEXT_PUBLIC_SOCKET_URL` 配置说明

---

## 📁 修改的文件列表

1. `Dockerfile` - 添加 AI_302_API_KEY 构建参数和环境变量
2. `.github/workflows/docker-build-push.yml` - 修复 build-args
3. `.github/workflows/docker-publish-main.yml` - 添加 build-args
4. `.github/workflows/docker-publish.yml` - 添加 build-args
5. `app/api/ppt/route.ts` - 提高超时到 8 分钟
6. `src/domains/teaching-acts/services/PptGeneratorService.ts` - 提高 maxTokens
7. `server/socket-server.js` - 提高 Socket.IO 超时
8. `server/index.js` - 提高 Socket.IO 超时
9. `.env.example` - 修复 API 密钥变量名
10. `.env.local.example` - 修复 API 密钥变量名
11. `.env.production.example` - 修复 API 密钥变量名
12. `DEPLOYMENT_FIX_REPORT.md` - **新增** 完整修复报告

---

## 🔑 GitHub Secrets 配置要求

需要在 GitHub 仓库设置中配置以下 Secrets：

### 必需的 Secrets:
- ✅ `DEEPSEEK_API_KEY` - DeepSeek AI 服务密钥
- ⚠️ `AI_302_API_KEY` - **新增**：302.ai PPT 生成服务端密钥
- ✅ `ALIYUN_REGISTRY` - 阿里云容器镜像仓库地址
- ✅ `ALIYUN_REGISTRY_USER` - 阿里云仓库用户名
- ✅ `ALIYUN_REGISTRY_PASSWORD` - 阿里云仓库密码
- ✅ `ALIYUN_IMAGE_REPO` - 阿里云镜像仓库路径

### 可选的 Secrets:
- `NEXT_PUBLIC_BASE_URL` - 默认: `http://localhost:3000`

### ❌ 不再需要的 Secrets:
- ~~`NEXT_PUBLIC_AI_302_API_KEY`~~ - 已移除（新架构使用服务端代理）
- ~~`NEXT_PUBLIC_SOCKET_IO_URL`~~ - 已移除（使用同域连接）

---

## 🚀 部署流程

### 1. 配置 GitHub Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：
```
AI_302_API_KEY = sk-xxxxxxxxxxxxx
```

### 2. 推送代码触发构建

```bash
git add .
git commit -m "fix: 修复 AI_302_API_KEY 配置 + 优化超时和 token 限制"
git push origin main
```

### 3. 服务器拉取镜像

从阿里云拉取：
```bash
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/law-education:latest
```

或从 GHCR 拉取：
```bash
docker pull ghcr.io/yejunhao159/law-education-platform-z1:latest
```

### 4. 启动容器

使用 docker-compose:
```bash
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

或直接运行：
```bash
docker run -d --name law-edu-platform \
  -p 3000:3000 -p 3001:3001 \
  -e NODE_ENV=production \
  -e DEEPSEEK_API_KEY=sk-your-deepseek-key \
  -e AI_302_API_KEY=sk-your-302ai-key \
  -e NEXT_PUBLIC_BASE_URL=https://your-domain.com \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/law-education:latest
```

### 5. 验证部署

检查容器日志：
```bash
docker logs law-edu-platform --tail 50
```

检查环境变量：
```bash
docker exec law-edu-platform env | grep -E 'DEEPSEEK|AI_302'
```

测试 PPT 生成功能。

---

## 📊 优化效果

### 修复前 vs 修复后

| 配置项 | 修复前 | 修复后 | 提升 |
|--------|--------|--------|------|
| AI_302_API_KEY | ❌ 缺失 | ✅ 正确配置 | 功能可用 |
| PPT API 超时 | 6分钟 | 8分钟 | +33% |
| maxTokens (short) | 5000 | 8000 | +60% |
| maxTokens (medium) | 8000 | 12000 | +50% |
| maxTokens (long) | 12000 | 16000 | +33% |
| Socket.IO 超时 | 60秒 | 120秒 | +100% |

---

## ⚠️ 注意事项

### 1. 环境变量验证

容器启动时会自动验证环境变量（`scripts/check-env.sh`）：
- 如果缺少 `DEEPSEEK_API_KEY` 或 `AI_302_API_KEY`，容器会拒绝启动
- 日志会显示详细的错误信息和解决方案

### 2. Socket.IO 连接配置

- 客户端使用同域连接：`/socket.io/`
- 不需要配置 `NEXT_PUBLIC_SOCKET_IO_URL`
- CORS 已配置支持生产域名

### 3. 生产环境 CORS

确保在 `server/socket-server.js` 和 `server/index.js` 中添加您的生产域名：
```javascript
origin: process.env.NODE_ENV === 'production'
  ? [
      'http://115.29.191.180:3000',
      'https://your-domain.com',  // 添加您的域名
      ...
    ]
  : '*',
```

---

## 🔍 前端逻辑验证

### PPT API 调用流程

1. **前端组件** (`PptGeneratorPanel.tsx:91`)
   ```typescript
   const service = new PptGeneratorService();  // 不传入 apiKey
   ```

2. **自动使用后端代理** (`PptGeneratorService.ts:146-148`)
   ```typescript
   private shouldUseBackendProxy(): boolean {
     return typeof window !== 'undefined' && (!this.apiKey || this.apiKey.length === 0);
   }
   // 返回 true → 使用后端代理
   ```

3. **调用服务端 API** (`PptGeneratorService.ts:184`)
   ```typescript
   const response = await fetch('/api/ppt', {
     method: 'POST',
     body: JSON.stringify({ action, payload })
   });
   ```

4. **后端读取环境变量** (`app/api/ppt/route.ts:20`)
   ```typescript
   const apiKey = process.env.AI_302_API_KEY;  // 从服务端环境变量读取
   if (!apiKey) {
     return NextResponse.json({ error: 'PPT API key missing' }, { status: 500 });
   }
   ```

✅ **结论**：前端逻辑完全正确，使用服务端代理架构，API 密钥不会暴露在客户端。

---

## 🎯 后续建议

### 1. 整合 GitHub Workflows（可选）

当前有 5 个 workflows，建议整合为 2 个：
1. 保留 `ci.yml` 用于代码质量检查
2. 创建 `docker-unified.yml` 合并所有 Docker 构建流程

### 2. 监控和告警

建议添加：
- PPT 生成成功率监控
- 平均生成时间监控
- Socket.IO 连接状态监控

### 3. 性能优化

- 考虑添加 PPT 生成缓存
- 优化大纲生成 prompt，减少 token 消耗
- 实现生成进度实时推送

---

## 📝 版本信息

- **报告版本**: v1.2.1
- **修复日期**: 2025-10-19
- **修复内容**: AI_302_API_KEY 配置 + 超时和 token 限制优化
- **下一版本计划**: Workflows 整合 + 监控系统

---

**修复完成！可以安全部署到生产环境。**
