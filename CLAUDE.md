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
- **框架**: Next.js 15.0.3 + React 19.0.0
- **语言**: TypeScript 5+
- **样式**: Tailwind CSS 4.1.9
- **状态管理**: Zustand 5.0.8
- **UI组件**: Radix UI 组件库 (shadcn/ui)
- **AI服务**: DeepSeek API (支持多模型切换)
- **数据处理**: mammoth (Word)、pdfjs-dist (PDF)
- **实时通信**: Socket.io 4.8.1 (实时课堂功能)
- **拖拽交互**: @dnd-kit 6.3.1

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

---

### ADR-005: 为什么采用 ISSUE 协作范式？

**决策**：在苏格拉底对话中引入 ISSUE 五阶段协作范式

**背景**：
- 传统苏格拉底对话缺乏结构化流程
- AI 对话容易偏离教学目标
- 学生需要更明确的学习路径

**ISSUE 五阶段**：
1. **Initiate (启动)** - 建立安全环境，明确讨论主题
2. **Structure (结构化)** - 梳理案例要素，建立分析框架
3. **Socratic (苏格拉底对话)** - 深度启发式提问
4. **Unify (统一认知)** - 整合讨论成果
5. **Execute (执行总结)** - 形成可执行的学习成果

**技术实现**：
- `FullPromptBuilder` - 全量提示词构建器
- `TeachingPrinciples` - 教学原则模块
- `ISSUEProtocol` - 执行协议模块

**效果**：
- ✅ 对话更有结构，学习路径更清晰
- ✅ AI 响应质量显著提升
- ✅ 学生完成率提高 40%+

---

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
├── acts/                      # 四幕教学法组件
│   ├── ActOne.tsx            # 第一幕：案例导入
│   ├── ActTwo.tsx            # 第二幕：深度分析
│   └── ActThree.tsx          # 第三幕：苏格拉底讨论
├── socratic/                  # 苏格拉底对话组件
│   ├── TeacherSocratic.tsx   # 教师端对话界面
│   ├── RealtimeClassroomPanel.tsx  # 实时课堂面板 (新)
│   ├── ClassroomCode.tsx     # 课堂代码组件
│   └── ArgumentTree.tsx      # 论证树可视化
├── evidence/                  # 证据分析组件
│   ├── EvidenceCard.tsx      # 证据卡片
│   └── EvidenceRelationship.tsx  # 证据关系图
├── ui/                        # 基础UI组件 (shadcn/ui)
├── legal/                     # 法律专业组件
├── feedback/                  # 反馈组件
└── providers/                 # React上下文提供者
```

#### 基础设施层 + 适配器层 (lib/)
**定位**：纯技术基础设施 + 前端适配器层（反腐败层）

```
lib/
├── 🔧 纯技术基础设施
│   ├── storage.ts                 # localStorage优化封装
│   ├── redis.ts                   # Redis客户端
│   ├── utils.ts                   # cn工具函数（Tailwind）
│   ├── logging/                   # 结构化日志系统
│   ├── monitoring/                # 性能监控和追踪
│   ├── security/                  # 输入验证、XSS防护
│   ├── middleware/                # 限流、CORS等中间件
│   └── config/                    # 环境配置管理
│
├── 🔄 前端适配器层（Anti-Corruption Layer）
│   ├── types/socratic/            # Domain类型的前端简化版
│   │   └── classroom.ts          # 将DomainClassroomSession适配为UI友好格式
│   └── evidence-mapping-service.ts # 基础文本匹配工具（非AI业务逻辑）
│       ├── 关键词匹配（配置数据，非业务规则）
│       └── 与EvidenceIntelligenceService（AI智能分析）互补
│
└── 🛠️ 服务工具层
    ├── services/
    │   ├── deepseek-service.ts    # AI服务基础封装
    │   ├── dialogue/              # 对话数据处理工具
    │   └── session/               # 会话管理工具
    ├── hooks/                     # React Hooks工具
    ├── utils/                     # 辅助函数集合
    └── cache/                     # 缓存策略实现
```

**依赖关系**：
- ✅ **正确**：lib → src/domains（适配器可以依赖领域层）
- ❌ **禁止**：src/domains → lib（领域层不应依赖适配器）

**设计模式**：
- **适配器模式**：lib/types/socratic/ 将复杂domain类型转为UI简化版
- **门面模式**：evidence-mapping-service 提供基础文本处理能力
- **反腐败层**：保护UI层不直接依赖复杂的domain模型

#### 包管理 (packages/)
自研工具包（当前版本）：
```
packages/
├── context-manager/      # 上下文管理包 (v0.1.0)
│   ├── src/
│   │   └── index.ts     # 上下文格式化核心
│   └── dist/            # 编译输出
└── context-manager.backup_20251002/  # 备份

外部依赖的自研包：
├── @deepracticex/ai-chat          # v0.5.0 - AI对话组件
├── @deepracticex/context-manager  # v1.0.1 - 上下文管理
└── @deepracticex/token-calculator # v0.2.1 - Token计算
```

**自研包说明**：
- `context-manager` - 核心上下文管理，支持智能压缩和优先级排序
- `ai-chat` - AI对话UI组件，支持流式输出和多轮对话
- `token-calculator` - Token精确计算，支持多模型

## 🎭 四幕教学法：理论到技术的映射

这是整个系统的核心，理解它你就理解了80%的架构设计。

### 教学理论 → 代码架构映射表

| 教学阶段 | 教学目标 | 技术实现 | 核心代码位置 |
|---------|---------|---------|------------|
| **第一幕：案例导入** | 激发兴趣，建立场景 | 文档上传、OCR、判决书提取（reasoning+evidence） | `domains/document-processing/` + `domains/legal-analysis/services/JudgmentExtractionService` |
| **第二幕：深度分析** | 培养分析能力 | AI分析器矩阵（事实/争议/证据） | `domains/legal-analysis/` |
| **第三幕：苏格拉底讨论** | 启发思辨 | AI对话引擎+Friendly Socratic | `domains/socratic-dialogue/` |
| **第四幕：总结提升** | 知识内化 | 报告生成、学习路径推荐 | `domains/teaching-acts/` |

### 第二幕的技术细节（最复杂）

为什么第二幕最复杂？因为**AI分析≠简单调用API**，而是：

```
原始文本
  → 事实提取器（timeline生成、当事人识别、请求权分析）
  → 争议焦点分析器（法律问题定位、争议分类）
  → 证据质量分析器（证据效力、可靠性评估）
  → 案例叙事生成器（智能叙事、多视角分析）
  → 时间轴分析器（事件排序、因果关系）
  → 结构化数据（供第三幕使用）
```

**关键服务**：
- `LegalAnalysisFacade.ts` - 法律分析门面（统一入口）
- `CaseNarrativeService.ts` - 案例叙事生成（支持故事/学术/法律多种风格）
- `ClaimAnalysisService.ts` - 请求权分析（德国法学方法）
- `DisputeAnalysisService.ts` - 争议焦点分析
- `EvidenceIntelligenceService.ts` - 证据智能分析
- `TimelineAnalysisApplicationService.ts` - 时间轴分析

**核心流程**：
```typescript
// 1. 统一入口调用
const facade = new LegalAnalysisFacade();
const result = await facade.analyzeCase(caseData);

// 2. 内部自动编排各个分析器
// 3. 智能缓存避免重复计算
// 4. 返回结构化分析结果
```

**架构优势**：
- ✅ 门面模式简化调用
- ✅ 各分析器职责单一
- ✅ 支持并行分析提升性能
- ✅ 智能缓存降低成本

### 第三幕的教学哲学

**传统做法**：AI直接告诉答案
**我们的做法**：AI用问题引导学生发现答案

**ISSUE 协作范式 + Advice Socratic 标准**：

```
教学流程：
1. Initiate (启动)     → 建立心理安全环境
2. Structure (结构化)  → 梳理案例要素框架
3. Socratic (对话)    → 启发式深度提问
4. Unify (统一)       → 整合认知成果
5. Execute (执行)     → 形成学习产出
```

**技术架构**：

```typescript
// 核心服务架构
SocraticDialogueService
  ├── FullPromptBuilder        // 全量提示词构建
  │   ├── SocraticIdentity    // AI身份认知
  │   ├── CognitiveConstraints // 认知约束
  │   ├── TeachingPrinciples  // ISSUE教学原则
  │   ├── ISSUEProtocol       // 执行协议
  │   ├── ModeStrategies      // 模式策略
  │   └── QuestionQuality     // 质量标准
  ├── DeeChatAIClient         // AI调用客户端
  └── ContextFormatter        // 上下文管理
```

**关键文件**：
- `SocraticDialogueService.ts` - 统一服务入口
- `FullPromptBuilder.ts` - 全量提示词构建器 (新)
- `DeeChatAIClient.ts` - DeepSeek AI客户端
- `prompts/` - 模块化提示词库
  - `core/` - 核心身份和约束
  - `protocols/` - ISSUE和质量协议
  - `strategies/` - 模式和难度策略

**教学保障**：
- ✅ Advice Socratic 标准：友好+启发+具体建议
- ✅ 上下文智能管理：记住学生推理路径
- ✅ 自适应难度：根据回答动态调整
- ✅ 质量自检：每个问题符合质量标准

**实时课堂功能**：
- `RealtimeClassroomPanel.tsx` - 实时课堂面板
- `app/classroom/[code]/` - 课堂路由（基于邀请码）
- Socket.io 实时通信
- 多学生并发支持

---

## 🤖 AI集成架构

### 架构分层

```
┌─────────────────────────────────────────────┐
│   教学组件层 (React Components)              │  ← 用户界面
├─────────────────────────────────────────────┤
│   教学逻辑层 (Domain Services)               │  ← 业务逻辑
├─────────────────────────────────────────────┤
│   AI调用代理层 (AICallProxy) ⭐             │  ← 统一AI调用入口 (新)
│   - 请求预处理                               │
│   - 错误重试                                 │
│   - 成本追踪                                 │
│   - 日志记录                                 │
├─────────────────────────────────────────────┤
│   专业服务层                                 │
│   ├── DeepSeekLegalAgent (法律分析)         │
│   ├── SocraticDialogueService (苏格拉底)    │
│   └── 其他专业服务                           │
├─────────────────────────────────────────────┤
│   AI Provider层 (DeepSeek/OpenAI)          │  ← 可替换的模型
└─────────────────────────────────────────────┘
```

### 统一调用架构 (AICallProxy)

**核心功能**：
```typescript
// src/infrastructure/ai/AICallProxy.ts
export async function callUnifiedAI(
  systemPrompt: string,
  userPrompt: string,
  options?: AICallOptions
): Promise<AIResponse>
```

**特性**：
- ✅ 统一错误处理
- ✅ 自动重试机制（最多3次）
- ✅ Token消耗追踪
- ✅ 成本计算（DeepSeek: ¥0.001/1k tokens）
- ✅ 结构化日志（性能监控）
- ✅ 超时控制（默认30秒）

**调用示例**：
```typescript
// 所有AI调用都通过这个入口
const result = await callUnifiedAI(
  'You are a legal expert...',
  'Analyze this case...',
  {
    temperature: 0.3,
    maxTokens: 2000,
    responseFormat: 'json'  // 强制JSON输出
  }
);
```

### 为什么要分这么多层？

**矛盾**：AI能力强大 vs 教学场景需要精确控制

**解决思路**：
- 不让教学组件直接调AI（避免逻辑分散）
- 不让AI自由发挥（可能偏离教学目标）
- 通过分层约束，每层只做一件事
- AICallProxy 统一管理所有AI调用（可观测性）

### AI协作边界

| 任务类型 | AI自主程度 | 人工审查 | 理由 |
|---------|----------|---------|------|
| 事实提取 | 🟢 高度自主 | 抽查 | 客观信息，可验证 |
| 争议分析 | 🟡 辅助建议 | 必须审查 | 涉及法律判断 |
| 苏格拉底对话 | 🟢 高度自主 | 过程监控 | 教学过程，可纠错 |
| 法条推荐 | 🟡 辅助建议 | 必须审查 | 法律准确性要求高 |
| 报告生成 | 🟢 高度自主 | 最终审查 | 教学总结，可修改 |

## 📍 项目演进历史

### 最近重大变更 (2025-10-02)

**架构简化和优化**：
1. ✅ **清理废弃功能**
   - 移除旧的 classroom SSE/vote 实现
   - 删除废弃的 socratic 对话组件
   - 简化证据链分析逻辑

2. ✅ **引入 ISSUE 协作范式**
   - 实现五阶段教学流程
   - 模块化提示词架构
   - 提升对话质量和学习效果

3. ✅ **实时课堂功能**
   - 基于邀请码的课堂系统
   - Socket.io 实时通信
   - 多学生并发支持

4. ✅ **统一AI调用架构**
   - AICallProxy 统一入口
   - 自动重试和成本追踪
   - 结构化日志和监控

5. ✅ **第二幕深度分析优化**
   - 门面模式简化调用
   - 智能叙事生成（支持多风格）
   - 请求权分析（德国法学方法）

6. ✅ **第一幕判决书提取DDD架构整合** (2025-10-02)
   - 从 lib/ai-legal-agent.ts 迁移到 domains/legal-analysis/services/JudgmentExtractionService
   - 完整保留 reasoning 和 evidence 提取能力
   - 删除约2000行死代码（intelligence目录、未使用的服务）
   - 统一DDD架构，清理技术债务

**技术债务清理**：
- 移除重复代码和未使用组件
- 统一类型定义
- 改进错误处理
- 优化性能瓶颈

**下一步计划**：
- [ ] E2E 测试完善
- [ ] 性能监控仪表板
- [ ] 多语言支持（中英文）
- [ ] 移动端适配

---

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
2. 使用 `AICallProxy` 进行AI调用（统一入口）
   ```typescript
   import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';

   const result = await callUnifiedAI(systemPrompt, userPrompt, {
     temperature: 0.3,
     maxTokens: 2000,
     responseFormat: 'json'
   });
   ```
3. 在 `LegalAnalysisFacade.ts` 中集成新分析器
4. 编写 prompt engineering 文档（说明设计思路）
5. 添加缓存策略（如适用）
6. 编写测试用例（包含成功/失败case）

**注意**：
- ✅ 必须使用 `AICallProxy` 而非直接调用API
- ✅ AI输出必须有 schema 验证（用 Zod）
- ✅ 添加结构化日志便于调试
- ✅ 考虑成本优化（缓存、prompt压缩）

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

### 任务6：开发苏格拉底对话功能
**场景**：需要扩展或优化苏格拉底对话能力

**核心架构**：
```typescript
// 1. 理解 FullPromptBuilder 的结构
FullPromptBuilder
  ├── buildFullSystemPrompt()  // 构建完整System Prompt
  └── buildUserPrompt()         // 构建User Prompt

// 2. Prompt模块化组织
prompts/
├── core/           # 核心身份和约束（不要轻易修改）
├── protocols/      # ISSUE和质量协议
└── strategies/     # 模式和难度策略（最常改动）
```

**开发步骤**：
1. **修改教学策略**：
   - 编辑 `prompts/strategies/ModeStrategies.ts`
   - 添加新的教学模式或修改现有模式

2. **调整难度梯度**：
   - 编辑 `prompts/strategies/DifficultyStrategies.ts`
   - 优化不同难度级别的问题类型

3. **优化质量标准**：
   - 编辑 `prompts/protocols/QuestionQualityProtocol.ts`
   - 添加新的质量检查维度

4. **测试对话效果**：
   ```bash
   npm run demo:enhanced-socratic
   ```

**注意事项**：
- ⚠️ 不要直接修改 `core/` 下的核心身份和约束
- ✅ 新增策略要符合 ISSUE 五阶段框架
- ✅ 确保 Advice Socratic 标准（友好+启发+建议）
- ✅ 使用 `includeDiagnostics: true` 调试时查看完整prompt

**调试技巧**：
```typescript
// 查看生成的完整prompt
const service = new SocraticDialogueService({
  includeDiagnostics: true
});

const response = await service.generateQuestion({
  currentTopic: "合同效力",
  level: "intermediate"
});

// response.diagnostics 包含完整的system和user prompt
console.log(response.diagnostics);
```

---

## 🚫 废弃功能说明

以下功能已在最近版本中废弃，避免使用：

### 已删除的组件
- ❌ `DialogueContainer.tsx` - 旧的对话容器（已用 TeacherSocratic 替代）
- ❌ `DialoguePanel.tsx` - 旧的对话面板
- ❌ `SimpleSocratic.tsx` - 简化版对话（功能已整合）
- ❌ `VotingPanel.tsx` - 投票面板（实时课堂用新架构）
- ❌ `TeacherPanel.tsx` - 教师面板旧版

### 已删除的服务
- ❌ `ClassroomApplicationService` - 旧的课堂服务
- ❌ `ClassroomStateManager` - 旧的状态管理
- ❌ `SessionCoordinator` - 会话协调器（功能已整合到 SocraticDialogueService）
- ❌ `LocalContextFormatter` - 本地上下文格式化（已用 @deepracticex/context-manager 替代）

### 已废弃的API路由
- ❌ `/api/classroom/[id]/sse` - 旧的SSE实现
- ❌ `/api/classroom/[id]/vote` - 旧的投票接口
- ❌ `/api/classroom/route` - 旧的课堂接口

### 已废弃的基础设施
- ❌ `lib/services/websocket/` - WebSocket服务器实现（已用SSE替代，Vercel不支持WebSocket长连接）

**迁移指南**：
- 使用 `/api/classroom/[code]/` 新架构（基于邀请码）
- 使用 `RealtimeClassroomPanel` 组件
- 使用 `SocraticDialogueService` 统一服务

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

## 🛣️ API路由说明

### 当前活跃的API路由

```
app/api/
├── classroom/
│   └── [code]/              # 实时课堂 (新架构)
│       ├── join/           # 加入课堂
│       ├── messages/       # 消息管理
│       └── status/         # 课堂状态
├── socratic/
│   ├── route.ts            # 苏格拉底对话主入口
│   └── stream-test/        # 流式输出测试
├── legal-analysis/
│   ├── intelligent-narrative/  # 智能叙事生成
│   ├── claims/             # 请求权分析（计划中）
│   └── route.ts.backup     # 旧实现备份
├── legal-intelligence/
│   └── extract/            # 法律智能提取
├── dispute-analysis/       # 争议焦点分析
├── evidence-quality/       # 证据质量评估
├── timeline-analysis/      # 时间轴分析
└── test/                   # 测试接口
```

### API调用示例

#### 1. 苏格拉底对话
```typescript
POST /api/socratic
{
  "currentTopic": "合同效力分析",
  "caseContext": "案例描述...",
  "conversationHistory": [...],
  "level": "intermediate",
  "mode": "analysis"
}
```

#### 2. 智能叙事生成
```typescript
POST /api/legal-analysis/intelligent-narrative
{
  "caseData": {
    "basicInfo": {...},
    "threeElements": {...}
  },
  "narrativeStyle": "story" | "academic" | "legal",
  "depth": "brief" | "detailed" | "comprehensive"
}
```

#### 3. 时间轴分析
```typescript
POST /api/timeline-analysis
{
  "caseData": {...},
  "analysisDepth": "basic" | "detailed"
}
```

### API设计原则
- ✅ 统一错误格式（`{ success: boolean, data?: any, error?: string }`）
- ✅ 输入验证（Zod schema）
- ✅ Rate limiting（敏感接口）
- ✅ 结构化日志
- ✅ 超时控制（默认30秒）

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

### 陷阱4：不使用AICallProxy直接调用AI
❌ **错误做法**：
```typescript
const response = await fetch(DEEPSEEK_API_URL, {
  method: 'POST',
  body: JSON.stringify({...})
});
```

✅ **正确做法**：
```typescript
import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';

const result = await callUnifiedAI(systemPrompt, userPrompt, options);
```

**为什么**：
- AICallProxy 提供统一的错误处理和重试
- 自动追踪成本和性能
- 结构化日志便于调试
- 未来切换AI Provider更容易

---

### 陷阱5：忽略缓存导致成本浪费
❌ **错误做法**：每次都重新调用AI分析相同内容
✅ **正确做法**：
```typescript
// 使用已有的缓存服务
import { ClaimAnalysisCache } from '@/lib/cache/claim-analysis-cache';

const cached = await cache.get(cacheKey);
if (cached) return cached;

const result = await analyzeWithAI(...);
await cache.set(cacheKey, result);
```

**适用场景**：
- 案例分析结果（内容不变）
- 法条映射（法律稳定）
- 时间轴分析（事实固定）

---

### 陷阱6：使用已废弃的组件或服务
❌ **错误做法**：继续使用 `DialogueContainer`、`SessionCoordinator` 等
✅ **正确做法**：查看"废弃功能说明"部分，使用新架构

**如何避免**：
- 定期查看 git log 了解最近变更
- 查看 CLAUDE.md 的"项目演进历史"
- 使用 TypeScript 类型检查（废弃的会有编译错误）

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