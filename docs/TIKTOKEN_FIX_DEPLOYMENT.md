# tiktoken WebAssembly 修复部署指南

## 🐛 问题描述

生产环境部署后，AI功能不可用，错误信息：
```
Error: Missing tiktoken_bg.wasm
```

## ✅ 修复方案

已实施三层修复策略：

### 1. 添加直接依赖 (package.json)

```json
"tiktoken": "^1.0.22"
```

**原因**: tiktoken 原本是传递依赖，Next.js standalone 模式可能遗漏。

### 2. 明确复制 WebAssembly 文件 (Dockerfile)

```dockerfile
# 修复 tiktoken WebAssembly 文件缺失问题
# standalone 模式不会自动复制 .wasm 文件，需要手动复制
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tiktoken/tiktoken_bg.wasm ./node_modules/tiktoken/tiktoken_bg.wasm
```

**原因**: Next.js standalone 输出模式不会自动包含 `.wasm` 文件。

### 3. Webpack 配置优化 (next.config.mjs)

```javascript
webpack: (config, { isServer }) => {
  // 配置pdf.js worker
  config.resolve.alias.canvas = false;
  config.resolve.alias.encoding = false;

  // 修复 tiktoken WebAssembly 文件加载问题
  if (isServer) {
    // 确保 tiktoken 正确解析
    config.resolve.alias = {
      ...config.resolve.alias,
      'tiktoken': require.resolve('tiktoken'),
    };
  }

  return config;
}
```

**原因**: 确保服务端正确解析 tiktoken 模块路径。

## 🚀 部署步骤

### 方法 1: 使用自动化测试脚本（推荐）

```bash
# 1. 确保 Docker Desktop 已启用 WSL 集成
# 设置 -> Resources -> WSL Integration -> 启用你的发行版

# 2. 运行测试脚本
./scripts/test-tiktoken-fix.sh
```

脚本会自动执行：
- ✅ 构建 Docker 镜像
- ✅ 启动测试容器（端口 3001）
- ✅ 健康检查
- ✅ AI 功能测试
- ✅ 显示详细日志

### 方法 2: 手动部署

#### Step 1: 安装依赖

```bash
npm install --legacy-peer-deps
```

#### Step 2: 构建 Docker 镜像

```bash
docker build -t law-education-platform:fix-tiktoken .
```

预计耗时: 5-10 分钟

#### Step 3: 运行容器

```bash
docker run -d \
  --name law-edu-prod \
  -p 3000:3000 \
  --env-file .env.production \
  law-education-platform:fix-tiktoken
```

#### Step 4: 验证修复

**4.1 健康检查**
```bash
curl http://localhost:3000/api/health
# 期望: {"status":"ok"}
```

**4.2 测试 AI 功能**
```bash
curl -X POST http://localhost:3000/api/legal-intelligence/extract \
  -H "Content-Type: application/json" \
  -d '{
    "documentText": "原告张三诉称：被告李四于2023年1月15日借款人民币10万元。",
    "extractionOptions": {
      "extractBasicInfo": true,
      "extractParties": true
    }
  }'
```

**成功标志**:
- ✅ 无 "Missing tiktoken_bg.wasm" 错误
- ✅ 返回 JSON 格式的分析结果

**失败标志**:
- ❌ 返回 500 错误
- ❌ 日志中出现 tiktoken 相关错误

#### Step 5: 查看日志

```bash
# 实时日志
docker logs -f law-edu-prod

# 最后 100 行
docker logs law-edu-prod --tail 100
```

## 🌐 生产环境部署

### 阿里云部署步骤

#### 1. 推送镜像到 GitHub Container Registry

```bash
# 登录 GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u yejunhao159 --password-stdin

# 标记镜像
docker tag law-education-platform:fix-tiktoken \
  ghcr.io/yejunhao159/law-education-platform-z1:fix-tiktoken

docker tag law-education-platform:fix-tiktoken \
  ghcr.io/yejunhao159/law-education-platform-z1:latest

# 推送镜像
docker push ghcr.io/yejunhao159/law-education-platform-z1:fix-tiktoken
docker push ghcr.io/yejunhao159/law-education-platform-z1:latest
```

#### 2. 在生产服务器上部署

SSH 连接到服务器:
```bash
ssh root@115.29.191.180
```

拉取最新镜像并重启:
```bash
cd /path/to/project

# 拉取最新镜像
docker compose pull

# 重启服务
docker compose down
docker compose up -d

# 查看日志
docker compose logs -f
```

#### 3. 验证生产环境

```bash
# 健康检查
curl http://115.29.191.180:3000/api/health

# AI 功能测试
curl -X POST http://115.29.191.180:3000/api/legal-intelligence/extract \
  -H "Content-Type: application/json" \
  -d '{
    "documentText": "测试文本",
    "extractionOptions": {"extractBasicInfo": true}
  }'
```

## 🔍 故障排查

### 问题 1: Docker 在 WSL2 中不可用

**错误信息**:
```
The command 'docker' could not be found in this WSL 2 distro.
```

**解决方案**:
1. 打开 Docker Desktop
2. 设置 -> Resources -> WSL Integration
3. 启用你的 WSL 发行版
4. 点击 "Apply & Restart"

### 问题 2: 构建时提示依赖错误

**解决方案**:
```bash
# 清理缓存
npm run clean
rm -rf node_modules package-lock.json

# 重新安装
npm install --legacy-peer-deps
```

### 问题 3: 容器启动后立即退出

**排查步骤**:
```bash
# 查看容器状态
docker ps -a | grep law-edu

# 查看退出日志
docker logs <container_id>

# 常见原因:
# - 环境变量缺失（检查 .env.production）
# - 端口冲突（检查 3000 端口是否被占用）
# - 内存不足（检查系统资源）
```

### 问题 4: tiktoken 错误仍然存在

**排查清单**:

1. ✅ 确认 package.json 包含 tiktoken 依赖
2. ✅ 确认 Dockerfile 包含 COPY tiktoken_bg.wasm 指令
3. ✅ 确认 next.config.mjs 包含 webpack alias 配置
4. ✅ 重新构建镜像（不使用缓存）:
   ```bash
   docker build --no-cache -t law-education-platform:fix-tiktoken .
   ```
5. ✅ 进入容器检查文件:
   ```bash
   docker exec -it <container_id> sh
   ls -la node_modules/tiktoken/
   # 应该看到 tiktoken_bg.wasm 文件
   ```

## 📊 验证清单

部署完成后，请确认以下所有项：

- [ ] Docker 镜像构建成功
- [ ] 容器启动成功（docker ps 可见）
- [ ] 健康检查通过 (`/api/health` 返回 ok)
- [ ] AI 功能测试通过（无 tiktoken 错误）
- [ ] 容器日志无严重错误
- [ ] 生产环境可正常访问
- [ ] 所有 AI 相关 API 正常工作:
  - [ ] `/api/legal-intelligence/extract` - 法律智能提取
  - [ ] `/api/socratic` - 苏格拉底对话
  - [ ] `/api/legal-analysis/intelligent-narrative` - 智能叙事
  - [ ] `/api/dispute-analysis` - 争议焦点分析
  - [ ] `/api/evidence-quality` - 证据质量评估

## 📝 相关文档

- [Dockerfile 官方文档](https://docs.docker.com/engine/reference/builder/)
- [Next.js Docker 部署](https://nextjs.org/docs/deployment#docker-image)
- [tiktoken GitHub](https://github.com/dqbd/tiktoken)

## 🔗 相关 Issue

- Issue #44: 🚨 生产环境部署问题：tiktoken WebAssembly文件缺失导致AI功能不可用
- Issue #45: 🔧 生产环境优化建议（资源限制、健康检查等）

---

**最后更新**: 2025-10-08
**维护者**: @yejunhao159
