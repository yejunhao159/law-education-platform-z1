# 📚 项目文档索引

本目录包含法学教育平台的所有技术文档和架构说明。

## 📖 核心文档

### [CLAUDE.md](./CLAUDE.md) - 项目架构指南
**用途**：给 Claude Code 和开发者提供的完整架构说明

**包含内容**：
- 🎯 项目使命和核心理念
- 🏗️ DDD架构设计
- 🎭 四幕教学法技术实现
- 🤖 AI集成架构
- 📐 架构决策记录 (ADR)
- 🛠️ 开发规范和最佳实践
- 🧠 Sean的架构哲学（矛盾论应用）

**适合人群**：新贡献者、架构决策者、AI协作者

---

### [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署文档
**用途**：生产环境部署的完整指南

**包含内容**：
- 🐳 Docker部署流程
- 🔧 环境变量配置
- 🚀 GitHub Actions CI/CD
- 📊 监控和日志配置
- 🔒 安全最佳实践

**适合人群**：运维人员、部署管理员

---

## 🔧 技术文档

### [implementation-overview.md](./implementation-overview.md)
项目实现概览和技术栈说明

### [socratic-enhancements-20251004.md](./socratic-enhancements-20251004.md)
苏格拉底对话增强功能的设计文档

### [judgment-extraction-data-flow.md](./judgment-extraction-data-flow.md)
判决书提取的数据流程说明

### [context-architecture-comparison.md](./context-architecture-comparison.md)
上下文架构对比分析

---

## 🏛️ 专项部署文档

### [DEPLOY_JD_CLOUD.md](./DEPLOY_JD_CLOUD.md)
京东云部署指南

### [TIKTOKEN_FIX_DEPLOYMENT.md](./TIKTOKEN_FIX_DEPLOYMENT.md)
Tiktoken依赖修复部署方案

---

## 📂 架构设计

### [architecture/](./architecture/)
详细的架构设计文档和图表

---

## 🤝 如何使用这些文档

1. **新手入门**：先读 [CLAUDE.md](./CLAUDE.md) 的"快速开始路径"部分
2. **理解架构**：阅读 [CLAUDE.md](./CLAUDE.md) 的"架构决策记录"
3. **开发功能**：参考 [CLAUDE.md](./CLAUDE.md) 的"常见开发任务"
4. **部署项目**：按照 [DEPLOYMENT.md](./DEPLOYMENT.md) 执行
5. **深入细节**：查看对应的技术文档

---

## 💡 文档维护原则

- **保持同步**：代码变更时及时更新文档
- **用例驱动**：文档应该包含实际使用例子
- **架构优先**：先写架构决策（ADR），再写实现
- **奥卡姆剃刀**：删除过时文档，避免信息冗余

---

**最后更新**：2025-10-08
**维护者**：项目团队
