# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 项目使命

这是一个基于AI的法学教育平台，采用苏力教授的四幕教学法，通过智能分析和苏格拉底式对话提升法学教育质量。

### 核心教学理念
**从"知识灌输"到"思辨训练"** - 通过AI辅助的苏格拉底式对话，引导学生主动发现法律推理的本质。

## 🚀 快速开始路径

### 新贡献者3步上手
1. **环境启动**：`npm install && npm run dev`
2. **理解核心流程**：阅读"四幕教学法架构"部分
3. **找到切入点**：查看"常见开发任务"选择你的第一个任务

### AI协作者注意
- **优先阅读**："架构决策记录(ADR)"和"AI协作边界"
- **理解语境**：这是教育产品，不是法律工具 - 重点是启发而非给答案
- **风格守则**：代码清晰 > 技巧炫耀，测试必写，类型必全

## 开发命令

### 基础开发
```bash
npm run dev           # 启动开发服务器 (http://localhost:3000)
npm run build         # 生产构建
npm run start         # 启动生产服务器
npm run lint          # ESLint 代码检查
npm run lint:fix      # 自动修复 ESLint 错误
npm run type-check    # TypeScript 类型检查
npm run format        # 格式化代码
npm run format:check  # 检查代码格式
```

### 测试命令
```bash
npm test                    # 运行所有Jest测试
npm run test:watch         # Jest监视模式
npm run test:coverage      # 生成测试覆盖率报告
npm run test:unit          # 运行单元测试
npm run test:integration   # 运行集成测试
npm run test:e2e           # Playwright端到端测试
npm run test:e2e:ui        # Playwright UI模式
npm run test:e2e:debug     # Playwright调试模式
```

### 专项测试和演示
```bash
npm run test:legal         # 法律智能分析测试
npm run test:all           # 运行所有测试套件
npm run demo:deechat       # DeepChat集成演示
npm run test:deechat       # DeepChat生产环境测试
npm run demo:enhanced-socratic  # 增强苏格拉底对话演示
```

### 清理和维护
```bash
npm run clean              # 清理构建文件和缓存
npm run precommit          # lint-staged预提交检查
```

## 🏗️ 技术架构

### 核心技术栈
- **框架**: Next.js 15 + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **UI组件**: Radix UI 组件库
- **AI服务**: DeepSeek API
- **数据处理**: 支持Word、PDF文档处理

## 📐 架构决策记录 (ADR)

### ADR-001: 为什么选择DDD（领域驱动设计）？

**决策**：采用DDD架构，按业务领域划分代码

**背景矛盾**：
- **对立面A**：教学场景复杂（四幕教学、苏格拉底对话、案例分析、证据链条）
- **对立面B**：传统MVC架构会导致逻辑分散、难以维护

**解决方案**：
- 每个domains/目录对应一个教学领域
- 领域内部的entities、services、repositories职责清晰
- 降低认知负担：改一个教学功能只需关注一个domain

**代价**：
- 新手理解成本较高（需理解DDD概念）
- 文件路径变长
- 跨域协作需要显式接口

**何时重新评估**：如果团队发现80%的改动都需要跨多个domain，说明领域划分有问题

---

### ADR-002: 为什么选Zustand而非Redux？

**决策**：使用Zustand作为全局状态管理

**理由**：
1. **简洁性**：无需action/reducer样板代码
2. **类型安全**：TypeScript支持更友好
3. **按需订阅**：性能优于Context API
4. **学习曲线平缓**：新贡献者上手快

**Redux的优势我们不需要**：
- 时间旅行调试（教学场景不需要）
- 严格的单向数据流约束（Zustand够用）
- 庞大的中间件生态（我们用不上）

**何时切换到Redux**：如果未来需要复杂的状态回溯（如"撤销学生的10步操作"），再考虑Redux

---

### ADR-003: 为什么DeepSeek而非OpenAI？

**决策**：主力AI模型使用DeepSeek API

**理由**：
1. **成本**：同等性能下价格优势明显
2. **中文优化**：法律术语理解更准确
3. **API兼容性**：可快速切换到OpenAI（接口设计已抽象）

**架构保障**：
- `lib/ai-legal-agent.ts`作为统一入口
- AI Provider可配置化
- 未来支持多模型ensemble

---

### ADR-004: 为什么自研ai-chat等工具包？

**决策**：部分功能不用现成npm包，而是自研

**矛盾分析**：
- **对立面A**：现成包快速启动
- **对立面B**：教学场景的定制需求（如token精确计算、对话上下文管理）

**自研边界**：
- ✅ 自研：与教学逻辑深度耦合的（ai-chat、context-manager）
- ❌ 不自研：通用UI组件（Radix UI）、通用工具（date-fns、lodash）

**维护承诺**：每个自研包必须有单元测试覆盖率>80%

### 项目结构

#### 领域驱动设计 (src/domains/)
项目采用DDD架构，按业务领域组织代码：

```
src/domains/
├── case-management/        # 案例管理域
├── legal-analysis/        # 法律分析域
├── socratic-dialogue/     # 苏格拉底对话域
├── teaching-acts/         # 四幕教学域
├── document-processing/   # 文档处理域
└── shared/               # 共享组件和服务
```

#### 组件架构 (components/)
```
components/
├── acts/                 # 四幕教学法组件
├── socratic/            # 苏格拉底对话组件
├── evidence/            # 证据分析组件
├── ui/                  # 基础UI组件 (shadcn/ui)
└── providers/           # React上下文提供者
```

#### 核心服务层 (lib/)
```
lib/
├── ai-legal-agent.ts         # DeepSeek AI法律分析代理
├── evidence-mapping-service.ts  # 证据映射服务
├── services/                 # 业务服务层
├── stores/                   # Zustand状态管理
├── types/                    # TypeScript类型定义
├── utils/                    # 工具函数
└── config/                   # 配置文件
```

#### 包管理 (packages/)
自研工具包：
```
packages/
├── ai-chat/              # AI对话组件包
├── context-manager/      # 上下文管理包
├── token-calculator/     # Token计算包
├── conversation-storage/ # 对话存储包
└── mcp-client/          # MCP客户端包
```

## 🎭 四幕教学法：理论到技术的映射

这是整个系统的核心，理解它你就理解了80%的架构设计。

### 教学理论 → 代码架构映射表

| 教学阶段 | 教学目标 | 技术实现 | 核心代码位置 |
|---------|---------|---------|------------|
| **第一幕：案例导入** | 激发兴趣，建立场景 | 文档上传、OCR、信息提取 | `domains/document-processing/` |
| **第二幕：深度分析** | 培养分析能力 | AI分析器矩阵（事实/争议/证据） | `domains/legal-analysis/` |
| **第三幕：苏格拉底讨论** | 启发思辨 | AI对话引擎+Friendly Socratic | `domains/socratic-dialogue/` |
| **第四幕：总结提升** | 知识内化 | 报告生成、学习路径推荐 | `domains/teaching-acts/` |

### 第二幕的技术细节（最复杂）

为什么第二幕最复杂？因为**AI分析≠简单调用API**，而是：

```
原始文本
  → 事实提取器（timeline生成、当事人识别）
  → 争议焦点分析器（法律问题定位）
  → 证据链条构建器（证据-事实-争议映射）
  → 法条映射器（相关法条检索）
  → 结构化数据（供第三幕使用）
```

**关键文件**：
- `lib/ai-legal-agent.ts` - AI代理统一入口
- `lib/evidence-mapping-service.ts` - 证据映射服务
- `domains/legal-analysis/services/` - 各专业分析器

### 第三幕的教学哲学

**传统做法**：AI直接告诉答案
**我们的做法**：AI用问题引导学生发现答案

**技术保障**：
- Friendly Socratic协议：每个问题必须友好+提供选项
- 对话上下文管理：记住学生的推理路径
- 适应性调整：根据学生回答动态调整问题难度

**核心代码**：`domains/socratic-dialogue/engines/`

---

## 🤖 AI集成架构

### 架构分层

```
┌─────────────────────────────────────┐
│   教学组件层 (React Components)       │  ← 用户看到的界面
├─────────────────────────────────────┤
│   教学逻辑层 (Domain Services)        │  ← 四幕教学法实现
├─────────────────────────────────────┤
│   AI代理层 (DeepSeekLegalAgent)      │  ← 统一AI调用入口
├─────────────────────────────────────┤
│   专业分析器层 (Specialized Agents)   │  ← 事实/争议/证据/法条
├─────────────────────────────────────┤
│   AI Provider层 (DeepSeek/OpenAI)   │  ← 可替换的模型层
└─────────────────────────────────────┘
```

### 为什么要分这么多层？

**矛盾**：AI能力强大 vs 教学场景需要精确控制

**解决思路**：
- 不让教学组件直接调AI（避免逻辑分散）
- 不让AI自由发挥（可能偏离教学目标）
- 通过分层约束，每层只做一件事

### AI协作边界

| 任务类型 | AI自主程度 | 人工审查 | 理由 |
|---------|----------|---------|------|
| 事实提取 | 🟢 高度自主 | 抽查 | 客观信息，可验证 |
| 争议分析 | 🟡 辅助建议 | 必须审查 | 涉及法律判断 |
| 苏格拉底对话 | 🟢 高度自主 | 过程监控 | 教学过程，可纠错 |
| 法条推荐 | 🟡 辅助建议 | 必须审查 | 法律准确性要求高 |
| 报告生成 | 🟢 高度自主 | 最终审查 | 教学总结，可修改 |

## 环境配置

### 必需环境变量
创建 `.env.local` 文件：
```env
DEEPSEEK_API_KEY=your_api_key
NEXT_PUBLIC_DEEPSEEK_API_KEY=your_public_api_key
DEEPSEEK_API_URL=your_api_url
```

## 🛠️ 开发规范

### 代码质量三原则
1. **可读性 > 性能**（除非性能真的是瓶颈）
2. **显式 > 隐式**（magic number要注释，复杂逻辑要拆分）
3. **测试先行**（写完功能必须写测试，不是可选项）

### 具体规范

#### 组件开发
- ✅ 优先复用 Radix UI 组件（已验证无障碍性）
- ✅ 遵循 shadcn/ui 设计系统（保持UI一致性）
- ❌ 不要重复造轮子（除非现有组件真的不满足）
- ⚠️ 自定义组件必须支持keyboard navigation

#### 状态管理
- 全局状态用 Zustand，按 domain 划分 store
- 组件内部状态用 useState/useReducer
- 服务端状态用 SWR 或 React Query（如需引入）

#### 类型安全
- 所有 API 调用必须有 TypeScript 类型定义
- 禁止使用 `any`（实在不行用 `unknown` 并做类型守卫）
- Props 必须用 interface 定义（便于扩展）

#### 测试要求
- 单元测试：业务逻辑函数必须有测试
- 集成测试：关键流程（如四幕流程）必须有测试
- E2E测试：核心用户路径必须覆盖
- 测试覆盖率目标：>80%

#### 文档处理
- 支持 .docx 和 .pdf 格式
- 使用 mammoth（Word） 和 pdfjs-dist（PDF）
- 大文件必须做分片处理（避免内存溢出）

---

## 📋 常见开发任务索引

### 任务1：添加新的教学组件
**场景**：需要新增一个教学环节的UI组件

**步骤**：
1. 在 `components/acts/` 下创建组件文件
2. 参考现有组件结构（如 `ActTwo.tsx`）
3. 连接对应的 domain service
4. 添加 Storybook 示例（如有）
5. 编写单元测试

**注意**：组件只负责展示，业务逻辑放在 domain service

---

### 任务2：扩展AI分析功能
**场景**：需要新增一个AI分析器（如"法律关系识别器"）

**步骤**：
1. 在 `domains/legal-analysis/services/` 下创建新分析器
2. 继承 `BaseLegalAnalyzer`（如有）或实现标准接口
3. 在 `lib/ai-legal-agent.ts` 中注册新分析器
4. 编写 prompt engineering 文档（说明设计思路）
5. 编写测试用例（包含成功/失败case）

**注意**：AI输出必须有 schema 验证（用 Zod）

---

### 任务3：新增UI组件
**场景**：需要一个项目特有的UI组件（现有的不够用）

**步骤**：
1. 检查 `components/ui/` 是否已有类似组件
2. 基于 Radix UI primitive 扩展（如 Dialog、Popover）
3. 添加 Tailwind 样式（遵循设计系统）
4. 导出到 `components/ui/index.ts`
5. 更新文档（如组件有复杂用法）

**注意**：不要从头造组件，除非 Radix UI 真的没有

---

### 任务4：状态管理
**场景**：需要添加新的全局状态

**步骤**：
1. 确定状态属于哪个 domain
2. 在对应的 `domains/[domain]/stores/` 下创建或扩展 store
3. 用 Zustand 的 `create` 定义 store
4. 导出 hooks（如 `useCaseStore`）
5. 在组件中使用（避免过度订阅）

**注意**：状态尽量局部化，不要什么都放全局

---

### 任务5：API路由
**场景**：需要新增一个后端API

**步骤**：
1. 在 `app/api/` 下创建路由文件（如 `app/api/analyze/route.ts`）
2. 使用 Next.js 15 的 Route Handler 格式
3. 添加输入验证（Zod schema）
4. 添加错误处理（统一错误格式）
5. 编写集成测试

**注意**：敏感操作必须加 rate limiting

---

## 📦 包依赖说明

### 依赖分类
- **自研包**：`@deepracticex/*`（本地 tarball 或 npm 私有包）
- **UI 生态**：`@radix-ui/*`（无障碍组件库）
- **AI 服务**：DeepSeek API（可替换为 OpenAI，接口已抽象）
- **文档处理**：mammoth（Word）、pdfjs-dist（PDF）
- **拖拽交互**：@dnd-kit（证据链条可视化）

### 依赖管理原则
- 优先使用成熟稳定的包
- 避免引入大而全的包（如 lodash，按需引入）
- 定期检查安全漏洞（`npm audit`）
- 记录为什么选这个包（在 ADR 中）

---

## 🚨 常见陷阱和解决方案

### 陷阱1：直接在组件里调AI
❌ **错误做法**：
```tsx
const MyComponent = () => {
  const result = await fetch('/api/deepseek', { ... })
  // ...
}
```

✅ **正确做法**：
```tsx
// 1. 在 domain service 中调用
// domains/legal-analysis/services/analyzer.ts
export class FactAnalyzer {
  async analyze(text: string) {
    return this.aiAgent.extractFacts(text)
  }
}

// 2. 组件只调用 domain service
const MyComponent = () => {
  const analyzer = useFactAnalyzer()
  const result = await analyzer.analyze(text)
}
```

---

### 陷阱2：过度使用全局状态
❌ **错误做法**：把所有状态都放 Zustand
✅ **正确做法**：
- 全局共享的用 Zustand（如当前案例、用户偏好）
- 组件内部的用 useState（如表单输入、临时UI状态）
- 服务端数据用 SWR/React Query（如列表、详情）

---

### 陷阱3：类型定义不一致
❌ **错误做法**：前端定义一套类型，后端返回另一套
✅ **正确做法**：
- 在 `lib/types/` 中定义共享类型
- API 返回必须符合类型定义（运行时用 Zod 验证）
- 前后端共用同一份类型定义

---

## 🎓 学习路径建议

### 新手（0-1周）
1. 跑起来项目：`npm install && npm run dev`
2. 理解四幕教学法：读本文档 + 体验产品
3. 改一个简单 bug：从 GitHub Issues 找 `good-first-issue`

### 进阶（1-4周）
1. 深入一个 domain：选一个感兴趣的领域深入研究
2. 理解 AI 集成：读 `lib/ai-legal-agent.ts` 和 prompt 设计
3. 添加一个功能：从小功能开始（如新增一个分析维度）

### 高级（1-3月）
1. 优化架构：发现并解决架构问题
2. 提升 AI 效果：优化 prompt、调整分析流程
3. 带新人：帮助新贡献者理解项目

---

## 🤝 贡献指南

### 提交代码前检查清单
- [ ] 代码通过 `npm run lint` 和 `npm run type-check`
- [ ] 新功能有对应的测试
- [ ] 测试通过 `npm test`
- [ ] 更新了相关文档（如果需要）
- [ ] Commit message 清晰（遵循 Conventional Commits）

### Commit Message 格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `refactor`: 重构（不改变功能）
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat(legal-analysis): 添加法律关系识别器

实现了基于依存句法分析的法律关系识别功能，
可自动识别合同关系、侵权关系等常见法律关系类型。

Closes #123
```

---

## 📞 获取帮助

- **技术问题**：GitHub Issues
- **架构讨论**：GitHub Discussions
- **紧急问题**：联系维护者（见 package.json）

记住：**没有蠢问题，只有没问出来的问题**。