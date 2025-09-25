# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于AI的法学教育平台，采用苏力教授的四幕教学法，通过智能分析和苏格拉底式对话提升法学教育质量。

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

## 技术架构

### 核心技术栈
- **框架**: Next.js 15 + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **UI组件**: Radix UI 组件库
- **AI服务**: DeepSeek API
- **数据处理**: 支持Word、PDF文档处理

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

### 四幕教学法架构

系统核心实现四幕教学法：
1. **第一幕**: 案例导入 - 文档上传和基础信息提取
2. **第二幕**: 深度分析 - AI驱动的事实提取、争议分析、证据链条构建
3. **第三幕**: 苏格拉底讨论 - 交互式AI对话和思辨训练
4. **第四幕**: 总结提升 - 生成分析报告和学习建议

### AI集成架构

- **主AI代理**: `DeepSeekLegalAgent` (lib/ai-legal-agent.ts)
- **专业分析器**:
  - 事实提取器
  - 争议焦点分析器
  - 证据链条构建器
  - 法条映射器
- **对话引擎**: 基于苏格拉底教学法的AI对话系统

## 环境配置

### 必需环境变量
创建 `.env.local` 文件：
```env
DEEPSEEK_API_KEY=your_api_key
NEXT_PUBLIC_DEEPSEEK_API_KEY=your_public_api_key
DEEPSEEK_API_URL=your_api_url
```

### 开发规范

- **组件开发**: 优先使用现有的Radix UI组件，遵循shadcn/ui设计系统
- **状态管理**: 使用Zustand进行全局状态管理，按领域划分store
- **类型安全**: 严格使用TypeScript，所有API调用必须有类型定义
- **测试**: 新功能需要编写对应的单元测试和集成测试
- **文档处理**: 支持.docx和.pdf格式，使用mammoth和pdfjs-dist处理

### 常见开发任务

1. **添加新的教学组件**: 在 `components/acts/` 下创建
2. **扩展AI分析功能**: 修改 `lib/ai-legal-agent.ts` 和相关服务
3. **新增UI组件**: 基于 `components/ui/` 的shadcn/ui组件扩展
4. **状态管理**: 在对应域的stores中添加Zustand状态
5. **API路由**: 在 `app/api/` 下添加Next.js API路由

### 包依赖说明

- 自研包使用本地tarball或npm私有包
- UI组件严重依赖@radix-ui生态系统
- AI功能基于DeepSeek API，可替换为其他LLM API
- 文档处理支持Word和PDF格式
- 拖拽功能使用@dnd-kit实现