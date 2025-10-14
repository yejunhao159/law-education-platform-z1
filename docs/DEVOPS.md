# DevOps 指南

本文档介绍法学教育平台的 DevOps 流程、工具和最佳实践。

## 📋 目录

- [CI/CD 流程](#cicd-流程)
- [GitHub Actions](#github-actions)
- [Docker 部署](#docker-部署)
- [部署脚本](#部署脚本)
- [自动化测试](#自动化测试)
- [监控和日志](#监控和日志)
- [故障排查](#故障排查)

---

## 🔄 CI/CD 流程

### 完整流程图

```
代码提交 → PR创建 → CI检查 → 代码审查 → 合并到main → 自动构建 → 手动部署/自动部署
```

### 工作流说明

1. **开发阶段**：本地开发 + 单元测试
2. **提交阶段**：创建 Pull Request
3. **CI阶段**：自动运行测试、代码检查、安全扫描
4. **代码审查**：团队成员审查代码
5. **合并阶段**：合并到 main 分支，自动构建 Docker 镜像
6. **部署阶段**：手动或自动部署到生产环境

---

## 🚀 GitHub Actions

### 可用的 Workflows

#### 1. CI - 持续集成 (`.github/workflows/ci.yml`)

**触发条件**：
- Pull Request 到 main/develop 分支
- Push 到 main/develop 分支

**功能**：
- ✅ 代码质量检查（ESLint + Prettier + TypeScript）
- ✅ 单元测试和集成测试（多 Node 版本）
- ✅ 代码覆盖率报告
- ✅ 依赖安全审计
- ✅ 构建验证

**使用方式**：
```bash
# 自动触发：创建 PR 或 push 代码即可

# 查看结果：
# GitHub Actions 页面 → CI - Continuous Integration workflow
```

#### 2. Docker 镜像发布 - Tag 触发 (`.github/workflows/docker-publish.yml`)

**触发条件**：
- 推送版本标签（如 `v1.0.0`）

**功能**：
- ✅ 构建 Docker 镜像
- ✅ 推送到 GitHub Container Registry (GHCR)
- ✅ 安全扫描（Trivy）
- ✅ 自动打标签（latest + 版本号）

**使用方式**：
```bash
# 1. 更新版本并打标签
git tag v1.2.0
git push origin v1.2.0

# 2. 查看构建进度
# GitHub Actions 页面 → Docker Build and Publish workflow

# 3. 查看安全扫描结果
# GitHub Security 页面 → Code scanning alerts
```

#### 3. Docker 镜像发布 - Main 分支 (`.github/workflows/docker-publish-main.yml`)

**触发条件**：
- Push 到 main 分支

**功能**：
- ✅ 自动构建最新版本
- ✅ 标签：latest + commit SHA
- ✅ 验证 Socket.IO 依赖

**使用方式**：
```bash
# 自动触发：合并 PR 到 main 即可

# 拉取最新镜像：
docker pull ghcr.io/yejunhao159/law-education-platform-z1:latest
```

---

## 🐳 Docker 部署

### 部署配置文件

#### 1. 标准生产部署 (`docker-compose.prod.yml`)

**适用场景**：标准生产环境部署

**特性**：
- ✅ 增强的健康检查（Next.js + Socket.IO）
- ✅ 资源限制和预留
- ✅ 日志轮转
- ✅ 数据持久化
- ✅ 备份支持

**使用方法**：
```bash
# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重启服务
docker-compose -f docker-compose.prod.yml restart
```

#### 2. 蓝绿部署 (`docker-compose.blue-green.yml`)

**适用场景**：零停机部署

**特性**：
- ✅ 两套完整环境（蓝色 + 绿色）
- ✅ 独立端口映射
- ✅ 快速切换和回滚

**端口映射**：
- 蓝色环境：3000 (Next.js), 3001 (Socket.IO)
- 绿色环境：3002 (Next.js), 3003 (Socket.IO)

**使用方法**：
```bash
# 查看当前环境
./scripts/deploy-blue-green.sh status

# 部署新版本（自动选择备用环境）
./scripts/deploy-blue-green.sh v1.2.0

# 手动启动绿色环境
docker-compose -f docker-compose.blue-green.yml --profile green up -d app-green

# 验证绿色环境
curl http://localhost:3002/api/health

# 切换流量（需要配置负载均衡器）
./scripts/deploy-blue-green.sh switch
```

---

## 📜 部署脚本

### 1. 标准部署脚本 (`scripts/deploy-v1.1.6.sh`)

**功能**：
- 基础部署流程
- 健康检查
- PM2 进程验证

**使用方法**：
```bash
./scripts/deploy-v1.1.6.sh
```

### 2. 增强版部署脚本 (`scripts/deploy-enhanced.sh`) ⭐ 推荐

**新增功能**：
- ✅ 自动备份（数据 + 配置）
- ✅ 一键回滚机制
- ✅ 部署前验证
- ✅ 冒烟测试
- ✅ 详细错误处理
- ✅ 部署日志记录

**使用方法**：
```bash
# 部署指定版本
./scripts/deploy-enhanced.sh v1.2.0

# 部署最新版本
./scripts/deploy-enhanced.sh latest

# 回滚到上一个版本
./scripts/deploy-enhanced.sh rollback

# 查看部署日志
ls -lt deployment-logs/
cat deployment-logs/deploy-*.log
```

**部署流程**：
```
前置检查 → 备份 → 拉取镜像 → 部署 → 健康检查 → 冒烟测试 → 生成报告
```

**回滚机制**：
- 自动保存最近 5 个备份
- 记录之前的镜像版本
- 30秒内选择是否回滚
- 一键恢复数据和配置

### 3. 蓝绿部署脚本 (`scripts/deploy-blue-green.sh`)

**功能**：
- 零停机升级
- 自动环境检测
- 流量切换
- 安全回滚

**使用方法**：
```bash
# 部署新版本（交互式）
./scripts/deploy-blue-green.sh v1.2.0

# 查看环境状态
./scripts/deploy-blue-green.sh status

# 手动切换流量
./scripts/deploy-blue-green.sh switch
```

---

## 🧪 自动化测试

### 测试类型

#### 1. 单元测试（Jest）

```bash
# 运行所有单元测试
npm run test:unit

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

#### 2. 集成测试

```bash
npm run test:integration
```

#### 3. E2E 测试（Playwright）

```bash
# 运行 E2E 测试
npm run test:e2e

# UI 模式（可视化调试）
npm run test:e2e:ui

# Debug 模式
npm run test:e2e:debug
```

### 代码质量检查

```bash
# ESLint 检查
npm run lint

# ESLint 自动修复
npm run lint:fix

# TypeScript 类型检查
npm run type-check

# Prettier 检查
npm run format:check

# Prettier 格式化
npm run format
```

### CI 环境中的测试

所有测试在以下情况自动运行：
1. 创建 Pull Request
2. Push 到 main/develop 分支

查看测试结果：
- GitHub Actions 页面
- PR 检查状态
- 代码覆盖率报告（Artifacts）

---

## 📊 监控和日志

### 容器日志

```bash
# 实时查看日志
docker logs -f law-edu-app-prod

# 查看最近 100 行
docker logs --tail 100 law-edu-app-prod

# 查看特定时间范围
docker logs --since 1h law-edu-app-prod
```

### PM2 进程管理

```bash
# 查看 PM2 状态
docker exec law-edu-app-prod pm2 list

# 查看 PM2 日志
docker exec law-edu-app-prod pm2 logs

# 查看 Socket.IO 服务日志
docker exec law-edu-app-prod pm2 logs socket-server --lines 50
```

### 健康检查

```bash
# Next.js 健康检查
curl http://localhost:3000/api/health

# Socket.IO 健康检查
curl "http://localhost:3001/socket.io/?EIO=4&transport=polling"

# 完整健康检查
docker inspect --format='{{.State.Health.Status}}' law-edu-app-prod
```

### 日志文件位置

```
./logs/                  # 应用日志
./deployment-logs/       # 部署日志
./backups/              # 备份文件
```

---

## 🔧 故障排查

### 常见问题

#### 1. 容器无法启动

```bash
# 查看容器状态
docker ps -a

# 查看详细日志
docker logs --tail 200 law-edu-app-prod

# 检查配置文件
docker inspect law-edu-app-prod

# 进入容器调试
docker exec -it law-edu-app-prod sh
```

#### 2. 健康检查失败

```bash
# 检查端口监听
docker exec law-edu-app-prod netstat -tlnp

# 测试内部端口
docker exec law-edu-app-prod curl http://localhost:3000/api/health

# 查看 PM2 进程
docker exec law-edu-app-prod pm2 list
docker exec law-edu-app-prod pm2 logs --lines 50
```

#### 3. Socket.IO 连接问题

```bash
# 检查 Socket.IO 服务
curl -v "http://localhost:3001/socket.io/?EIO=4&transport=polling"

# 查看 Socket.IO 日志
docker exec law-edu-app-prod pm2 logs socket-server

# 检查 CORS 配置
docker exec law-edu-app-prod cat server/socket-server.js | grep -A 10 cors
```

#### 4. 部署失败回滚

```bash
# 使用增强版部署脚本的自动回滚
./scripts/deploy-enhanced.sh rollback

# 手动回滚到指定版本
docker-compose -f docker-compose.prod.yml down
# 更新 docker-compose.prod.yml 中的镜像版本
docker-compose -f docker-compose.prod.yml up -d
```

#### 5. 磁盘空间不足

```bash
# 清理未使用的镜像
docker image prune -a

# 清理容器和网络
docker system prune

# 清理旧的备份
find ./backups -type d -mtime +30 -exec rm -rf {} +

# 清理日志
find ./logs -name "*.log" -mtime +7 -delete
```

### 性能监控

```bash
# 查看容器资源使用
docker stats law-edu-app-prod

# 查看容器详细信息
docker inspect law-edu-app-prod

# 查看进程列表
docker exec law-edu-app-prod ps aux
```

---

## 📚 最佳实践

### 部署流程建议

1. **开发环境测试** → 2. **暂存环境验证** → 3. **生产环境部署**

### 部署前检查清单

- [ ] 所有 CI 检查通过
- [ ] 代码已审查并合并
- [ ] 创建版本标签
- [ ] Docker 镜像构建成功
- [ ] 安全扫描无严重问题
- [ ] 备份当前生产数据
- [ ] 准备回滚方案

### 部署后验证清单

- [ ] 健康检查通过
- [ ] Next.js 服务正常响应
- [ ] Socket.IO 服务正常连接
- [ ] PM2 进程运行正常
- [ ] 关键功能冒烟测试
- [ ] 查看错误日志
- [ ] 监控系统告警

### 安全建议

1. **镜像安全**：定期查看 Trivy 扫描结果
2. **依赖更新**：定期运行 `npm audit` 并修复漏洞
3. **环境变量**：不要在代码中硬编码敏感信息
4. **访问控制**：限制生产服务器访问权限
5. **日志安全**：不记录敏感数据到日志

### 备份策略

1. **自动备份**：使用增强版部署脚本自动备份
2. **备份保留**：保留最近 5 个部署备份
3. **数据备份**：定期备份数据库到外部存储
4. **测试恢复**：定期测试备份恢复流程

---

## 🎯 快速参考

### 一行命令速查

```bash
# 快速部署最新版本（带备份和回滚）
./scripts/deploy-enhanced.sh latest

# 零停机部署
./scripts/deploy-blue-green.sh v1.2.0

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看实时日志
docker logs -f law-edu-app-prod

# 健康检查
curl http://localhost:3000/api/health && curl http://localhost:3001/socket.io/

# 快速重启
docker-compose -f docker-compose.prod.yml restart

# 进入容器调试
docker exec -it law-edu-app-prod sh

# 查看 PM2 状态
docker exec law-edu-app-prod pm2 list

# 清理系统
docker system prune -a
```

---

## 📞 支持和联系

如有问题或建议，请：
1. 查看 [故障排查](#故障排查) 章节
2. 查看 GitHub Issues
3. 联系 DevOps 团队

---

**文档版本**: v1.0
**最后更新**: 2025-10-11
**维护者**: DevOps Team
