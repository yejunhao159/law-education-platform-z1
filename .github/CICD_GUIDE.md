# 🚀 CI/CD 流程指南

## 📋 目录

- [概述](#概述)
- [Workflows 说明](#workflows-说明)
- [触发条件](#触发条件)
- [环境变量配置](#环境变量配置)
- [使用指南](#使用指南)
- [常见问题](#常见问题)

---

## 概述

本项目采用**企业级 CI/CD 流程**，包含以下两个主要 workflows：

1. **CI (代码质量检查)** - `ci.yml`
2. **CD (Docker 构建和发布)** - `docker-unified.yml`

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                   Push to GitHub                         │
│                  (main / tag / PR)                       │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌────────────────┐
│   CI Pipeline │    │  CD Pipeline   │
│ (代码质量检查) │    │ (构建和部署)    │
└───────────────┘    └────────────────┘
        │                     │
        ▼                     ▼
  ✅ Lint/Test          🐳 Docker Image
  ✅ Type Check              │
  ✅ Security Scan    ┌──────┴──────┐
                      ▼             ▼
                   GHCR         阿里云
```

---

## Workflows 说明

### 1️⃣ CI Pipeline (ci.yml)

**文件**: `.github/workflows/ci.yml`

**功能**:
- ✅ ESLint 代码检查
- ✅ TypeScript 类型检查
- ✅ Prettier 格式检查
- ✅ npm 依赖安全审计
- ✅ 构建验证

**触发条件**:
- Push to `main` or `develop`
- Pull Request to `main` or `develop`
- 手动触发 (workflow_dispatch)

**运行时间**: ~5-10 分钟

**并发控制**: 同一 PR 只运行最新的 workflow（自动取消旧的运行）

---

### 2️⃣ CD Pipeline (docker-unified.yml)

**文件**: `.github/workflows/docker-unified.yml`

**功能**:
- 🏗️ 构建 Docker 镜像（支持缓存）
- 🔍 Trivy 安全扫描
- 📦 推送到 GitHub Container Registry (GHCR)
- 📦 推送到阿里云容器镜像仓库
- 📋 生成部署摘要

**触发条件**:
- Push to `main` → 标签: `latest`, `main-{sha}`
- Push tag `v*` → 标签: `v1.2.3`, `1.2`, `1`
- 手动触发 → 自定义标签

**运行时间**: ~10-15 分钟

**镜像仓库**:
- **GHCR**: `ghcr.io/yejunhao159/law-education-platform-z1`
- **阿里云**: 根据配置的 `ALIYUN_IMAGE_REPO`

---

## 触发条件

### 自动触发

| 事件 | CI Pipeline | CD Pipeline |
|------|-------------|-------------|
| Push to `main` | ✅ 运行 | ✅ 运行（标签: latest） |
| Push to `develop` | ✅ 运行 | ❌ 不运行 |
| Push tag `v*` | ❌ 不运行 | ✅ 运行（标签: 版本号） |
| Pull Request | ✅ 运行 | ❌ 不运行 |
| 修改 `.md` 文件 | ❌ 跳过 | ❌ 跳过 |

### 手动触发

在 GitHub Actions 页面可以手动触发：

1. 进入 **Actions** 标签页
2. 选择要运行的 workflow
3. 点击 **Run workflow**
4. 选择分支和参数（如果有）

---

## 环境变量配置

### 必需的 GitHub Secrets

在 **Settings → Secrets and variables → Actions** 中配置：

| Secret 名称 | 说明 | 用途 |
|------------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek AI 密钥 | 构建时注入镜像 |
| `AI_302_API_KEY` | 302.ai PPT 生成密钥 | 构建时注入镜像 |
| `ALIYUN_REGISTRY` | 阿里云仓库地址 | 推送镜像到阿里云 |
| `ALIYUN_REGISTRY_USER` | 阿里云仓库用户名 | 登录阿里云 |
| `ALIYUN_REGISTRY_PASSWORD` | 阿里云仓库密码 | 登录阿里云 |
| `ALIYUN_IMAGE_REPO` | 阿里云镜像仓库路径 | 镜像完整路径 |

### 可选的 Secrets

| Secret 名称 | 说明 | 默认值 |
|------------|------|--------|
| `NEXT_PUBLIC_BASE_URL` | 前端基础 URL | `http://localhost:3000` |

---

## 使用指南

### 场景 1: 日常开发推送

```bash
git add .
git commit -m "feat: 添加新功能"
git push origin main
```

**触发的 Workflows**:
- ✅ CI Pipeline (代码检查)
- ✅ CD Pipeline (构建 Docker 镜像，标签: latest)

---

### 场景 2: 发布新版本

```bash
# 1. 创建并推送 tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 2. GitHub Actions 自动构建
# 镜像标签: v1.2.3, 1.2, 1, latest
```

**触发的 Workflows**:
- ✅ CD Pipeline (构建 Docker 镜像，标签: v1.2.3)

**生成的镜像标签**:
- `v1.2.3` (完整版本)
- `1.2` (主版本+次版本)
- `1` (主版本)

---

### 场景 3: Pull Request 检查

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发并推送
git push origin feature/new-feature

# 3. 在 GitHub 创建 Pull Request
# GitHub Actions 自动运行 CI 检查
```

**触发的 Workflows**:
- ✅ CI Pipeline (仅代码检查，不构建镜像)

---

### 场景 4: 部署到生产环境

**步骤 1**: 等待 GitHub Actions 构建完成

访问: `https://github.com/yejunhao159/law-education-platform-z1/actions`

**步骤 2**: 在服务器拉取镜像

```bash
# 从 GHCR 拉取
docker pull ghcr.io/yejunhao159/law-education-platform-z1:latest

# 或从阿里云拉取（更快）
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/law-education:latest
```

**步骤 3**: 使用 docker-compose 部署

```bash
cd /path/to/project
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

**步骤 4**: 验证部署

```bash
# 查看日志
docker logs law-edu-app --tail 50 -f

# 检查健康状态
curl http://localhost:3000/api/health
```

---

## 常见问题

### Q1: 为什么 main 推送触发了两个 workflows？

A: 这是正常的！
- **CI Pipeline**: 检查代码质量
- **CD Pipeline**: 构建 Docker 镜像

两者并行运行，互不影响。

---

### Q2: 如何跳过 CI 检查？

A: 在 commit 消息中添加 `[skip ci]`：

```bash
git commit -m "docs: 更新文档 [skip ci]"
```

**注意**: 不推荐跳过 CI，除非是纯文档修改。

---

### Q3: 构建失败怎么办？

**步骤 1**: 查看错误日志

1. 进入 GitHub Actions
2. 点击失败的 workflow
3. 查看详细日志

**步骤 2**: 常见错误和解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `ESLint errors` | 代码不符合规范 | 运行 `npm run lint -- --fix` |
| `Type check failed` | TypeScript 类型错误 | 修复类型错误 |
| `Build failed` | 构建失败 | 检查环境变量和依赖 |
| `Docker build timeout` | 构建超时 | 等待重试或联系维护者 |

---

### Q4: 如何查看构建的镜像？

**GHCR (GitHub Container Registry)**:

访问: `https://github.com/yejunhao159/law-education-platform-z1/pkgs/container/law-education-platform-z1`

**阿里云**:

登录阿里云控制台 → 容器镜像服务

---

### Q5: 如何优化构建速度？

当前已启用的优化：
- ✅ Docker 层缓存 (GitHub Actions Cache)
- ✅ npm 依赖缓存
- ✅ BuildKit 加速构建
- ✅ 并行推送到多个仓库

平均构建时间：
- CI Pipeline: ~5-10 分钟
- CD Pipeline: ~10-15 分钟

---

## 🎯 最佳实践

### 1. 提交前本地检查

```bash
# 运行 lint
npm run lint

# 运行类型检查
npm run type-check

# 运行格式检查
npm run format:check

# 本地构建测试
npm run build
```

### 2. 使用语义化版本号

```bash
# 主版本（不兼容的 API 修改）
git tag v2.0.0

# 次版本（功能性新增）
git tag v1.1.0

# 修订版本（bug 修复）
git tag v1.0.1
```

### 3. 保持 Secrets 安全

- ❌ 不要在代码中硬编码密钥
- ✅ 使用 GitHub Secrets
- ✅ 定期轮换密钥
- ✅ 最小权限原则

### 4. 监控构建状态

在 README.md 中添加状态徽章：

```markdown
[![CI](https://github.com/yejunhao159/law-education-platform-z1/actions/workflows/ci.yml/badge.svg)](https://github.com/yejunhao159/law-education-platform-z1/actions/workflows/ci.yml)
[![Docker](https://github.com/yejunhao159/law-education-platform-z1/actions/workflows/docker-unified.yml/badge.svg)](https://github.com/yejunhao159/law-education-platform-z1/actions/workflows/docker-unified.yml)
```

---

## 📞 支持

如有问题，请：
1. 查看 [GitHub Actions 日志](https://github.com/yejunhao159/law-education-platform-z1/actions)
2. 查看 [Issues](https://github.com/yejunhao159/law-education-platform-z1/issues)
3. 联系维护者

---

**文档版本**: v1.0
**最后更新**: 2025-10-19
**维护者**: DeepPractice.ai Team
