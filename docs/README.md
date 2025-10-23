# 📚 法学教育平台 - 文档中心

本目录包含法学教育平台的所有技术文档，已按模块分类整理。

---

## 🎯 核心文档（必读）

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

## 🧩 代码导航

### 核心代码目录
- [`src/`](../src/README.md) - **领域驱动设计(DDD)核心** - 业务逻辑和领域模型
- [`components/`](../components/README.md) - **React组件库** - UI组件和教学组件
- [`app/`](../app/README.md) - **Next.js路由** - 页面和API路由
- [`lib/`](../lib/) - 工具函数和辅助服务
- [`scripts/`](../scripts/) - 自动化脚本（部署、测试、环境检查）
- [`server/`](../server/) - Socket.IO实时通信服务器

### 快速定位
| 我想... | 查看目录 |
|--------|---------|
| 修改苏格拉底对话逻辑 | `src/domains/socratic-dialogue/` |
| 修改法律分析功能 | `src/domains/legal-analysis/` |
| 修改四幕教学流程 | `src/domains/teaching-acts/` |
| 修改UI组件 | `components/` |
| 添加新页面 | `app/` |
| 添加新API | `app/api/` |
| 部署到生产环境 | [部署文档](./部署文档/DEPLOYMENT-V2-GUIDE.md) |

---

## 📂 文档分类

### 🏛️ [架构文档](./架构文档/)
系统整体架构设计和数据流转说明

- [数据流架构总览-2025.md](./架构文档/数据流架构总览-2025.md) - **📌 最新**：2025版完整架构和数据流（推荐阅读）
- [architecture-and-dataflow.md](./架构文档/architecture-and-dataflow.md) - 2025年1月版架构和数据流图（历史参考）
- [implementation-overview.md](./架构文档/implementation-overview.md) - 技术实现概览
- [DATABASE-QUERIES.md](./架构文档/DATABASE-QUERIES.md) - 数据库查询和架构说明

### 🔍 [调研](./调研/)
技术调研和方案设计文档

- [合同知识库技术调研.md](./调研/合同知识库技术调研.md) - **📌 最新**：合同识别知识库技术方案（2025-10-23）
- [合同知识库微服务架构设计.md](./调研/合同知识库微服务架构设计.md) - **📌 最新**：微服务架构完整设计方案（2025-10-23）
- [合同知识库Schema设计.md](./调研/合同知识库Schema设计.md) - 四层知识库数据结构设计（2025-10-23）

### 🚀 [部署文档](./部署文档/)
生产环境部署和运维指南

- [DEPLOYMENT-V2-GUIDE.md](./部署文档/DEPLOYMENT-V2-GUIDE.md) - Docker部署完全指南（v2.0治本方案）

### ⚙️ [功能文档](./功能文档/)
各功能模块的详细技术文档

#### 📄 [合同分析](./功能文档/合同分析/)
- [contract-analysis-architecture.md](./功能文档/合同分析/contract-analysis-architecture.md) - 合同分析模块架构
- [contract-agent-discussion.md](./功能文档/合同分析/contract-agent-discussion.md) - Agent设计讨论
- [contract-editor-setup.md](./功能文档/合同分析/contract-editor-setup.md) - 编辑器配置指南
- [contract-test-sample.md](./功能文档/合同分析/contract-test-sample.md) - 测试样例

#### 🎭 [四幕教学](./功能文档/四幕教学/)
- [SNAPSHOT-ARCHITECTURE.md](./功能文档/四幕教学/SNAPSHOT-ARCHITECTURE.md) - 快照系统架构设计
- [FOURTH_ACT_DATA_FLOW_ANALYSIS.md](./功能文档/四幕教学/FOURTH_ACT_DATA_FLOW_ANALYSIS.md) - 第四幕数据流分析
- [FOURTH_ACT_DATA_PERSISTENCE_ANALYSIS.md](./功能文档/四幕教学/FOURTH_ACT_DATA_PERSISTENCE_ANALYSIS.md) - 数据持久化分析
- [snapshot-system-optimization-guide.md](./功能文档/四幕教学/snapshot-system-optimization-guide.md) - 快照系统优化指南

#### 💬 [苏格拉底对话](./功能文档/苏格拉底对话/)
- [SOCRATIC_CASE_DATA_LOSS_ANALYSIS.md](./功能文档/苏格拉底对话/SOCRATIC_CASE_DATA_LOSS_ANALYSIS.md) - 案例数据丢失分析
- [SOCRATIC_CONTEXT_IMPROVEMENT.md](./功能文档/苏格拉底对话/SOCRATIC_CONTEXT_IMPROVEMENT.md) - 上下文改进方案

#### 📊 [PPT生成](./功能文档/PPT生成/)
- [PPT_GENERATION_FLOW.md](./功能文档/PPT生成/PPT_GENERATION_FLOW.md) - PPT生成流程说明
- [PPT_GENERATOR_QUICK_START.md](./功能文档/PPT生成/PPT_GENERATOR_QUICK_START.md) - 快速开始指南
- [PPT_GENERATOR_TEST_GUIDE.md](./功能文档/PPT生成/PPT_GENERATOR_TEST_GUIDE.md) - 测试指南

---

## 🚦 如何使用这些文档

### 新手入门路径
1. **了解项目** → 阅读 [CLAUDE.md](./CLAUDE.md) 的"快速开始路径"
2. **理解架构** → 浏览 [架构文档](./架构文档/) 目录
3. **选择功能** → 根据需求查看 [功能文档](./功能文档/) 对应模块
4. **部署上线** → 参考 [部署文档](./部署文档/)

### AI协作者路径
1. **优先阅读** → [CLAUDE.md](./CLAUDE.md) 的"架构决策记录(ADR)"和"AI协作边界"
2. **理解语境** → 这是教育产品，重点是启发而非给答案
3. **遵循规范** → 代码清晰 > 技巧炫耀，测试必写，类型必全

### 运维人员路径
1. **部署指南** → [DEPLOYMENT-V2-GUIDE.md](./部署文档/DEPLOYMENT-V2-GUIDE.md)
2. **架构理解** → [architecture-and-dataflow.md](./架构文档/architecture-and-dataflow.md)
3. **问题排查** → 查看对应功能模块的文档

---

## 📊 文档统计

- **核心文档**: 2个（CLAUDE.md, README.md）
- **架构文档**: 4个
- **调研文档**: 3个（合同知识库完整方案）
- **部署文档**: 1个
- **功能文档**: 13个
  - 合同分析: 4个
  - 四幕教学: 4个（新增快照架构）
  - 苏格拉底对话: 2个
  - PPT生成: 3个

---

## 💡 文档维护原则

- **保持同步**：代码变更时及时更新文档
- **用例驱动**：文档应该包含实际使用例子
- **架构优先**：先写架构决策（ADR），再写实现
- **奥卡姆剃刀**：删除过时文档，避免信息冗余
- **中文优先**：文件夹使用中文命名，便于快速定位

---

## 🗑️ 已清理的文档

以下文档已删除（过时/已修复）：
- ❌ DEPLOYMENT.md（已被V2版本替代）
- ❌ DATA_FLOW_ARCHITECTURE.md（内容已合并到architecture-and-dataflow.md）
- ❌ FOURTH_ACT_PERSISTENCE_FIX.md（Bug已修复）
- ❌ PPT_STREAMING_FIX.md（Bug已修复）
- ❌ RESET_BUG_TEST_GUIDE.md（已过时）
- ❌ code-cleanup-explanation.md（临时文档）
- ❌ SOCRATIC_IMPROVEMENT_SUMMARY.md（内容已合并）
- ❌ SNAPSHOT-VALIDATION-FIX.md（Bug已修复，功能稳定）

---

## 📈 最近更新

- **2025-10-23**: 完成合同知识库微服务架构设计，确定技术栈和实施路线图
- **2025-10-23**: 完成四层知识库Schema设计（合同/条款/术语/案例）
- **2025-10-23**: 完成docs目录重构，新增调研目录，整理文档分类
- **2025-10-23**: 新增《合同知识库技术调研.md》，完成RAG+向量数据库技术方案调研
- **2025-10-21**: 新增《数据流架构总览-2025.md》，基于当前生产环境完整梳理数据流
- **2025-10-06**: 完成废弃功能清理，架构进入稳定期
- **2025-09-23**: 引入ISSUE协作范式，优化苏格拉底对话

---

**最后更新**：2025-10-23
**维护者**：项目团队 + Sean（PromptX调研）
**文档版本**：v2.3（合同知识库微服务架构）
