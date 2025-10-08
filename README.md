# 法学AI教学系统 (Legal Education Platform)

一个基于AI的法学教育平台，采用苏力教授的四幕教学法，通过智能分析和苏格拉底式对话提升法学教育质量。

## 🎯 项目特色

- **四幕教学法**：系统性的案例导入→深度分析→苏格拉底讨论→总结提升流程
- **AI驱动分析**：自动提取案例要素、争议焦点、证据链条
- **智能对话系统**：基于苏格拉底教学法的AI互动讨论
- **时间轴分析**：可视化展示案件发展脉络和关键节点

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 配置环境变量
创建 `.env.local` 文件并添加：
```env
DEEPSEEK_API_KEY=your_api_key
NEXT_PUBLIC_DEEPSEEK_API_KEY=your_public_api_key
DEEPSEEK_API_URL=your_api_url
```

### 启动开发服务器

**方式一：仅启动 Next.js（不包含实时课堂功能）**
```bash
npm run dev
```

**方式二：启动完整服务（推荐 - 包含实时课堂互动）**
```bash
npm run dev:all
```
此命令会同时启动：
- Next.js 开发服务器（端口 3000）
- Socket.IO 实时通信服务器（端口 3001）

访问 http://localhost:3000

## 🏗️ 技术架构

### 技术栈
- **框架**: Next.js 15 + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **UI组件**: Radix UI
- **AI服务**: DeepSeek API

### 目录结构
```
├── app/                  # Next.js App Router
│   ├── api/             # API路由
│   └── page.tsx         # 主页面
├── components/          # React组件
│   ├── acts/           # 四幕教学组件
│   ├── ui/             # 基础UI组件
│   └── ...             # 其他业务组件
├── lib/                 # 核心业务逻辑
│   ├── legal-intelligence/  # 法律智能分析
│   ├── stores/         # Zustand状态管理
│   ├── agents/         # AI代理系统
│   └── services/       # 服务层
└── __tests__/          # 测试文件
```

## 📚 核心功能

### 1. 案例导入
- 支持Word、PDF等格式的判决书上传
- 自动识别和提取案例信息

### 2. 深度分析
- **事实提取**：自动识别案件基本事实
- **争议分析**：智能识别争议焦点
- **证据链条**：构建完整的证据关系图
- **法条映射**：自动匹配相关法律条款

### 3. 苏格拉底讨论
- AI引导式提问
- 多角度思辨训练
- 实时反馈和建议

### 4. 学习总结
- 生成完整的案例分析报告
- 个性化学习建议
- 知识点总结归纳

## 🧪 测试

```bash
# 运行所有测试
npm test

# 测试覆盖率
npm run test:coverage

# 单元测试
npm run test:unit

# E2E测试
npm run test:e2e
```

## 📦 构建部署

```bash
# 生产构建
npm run build

# 启动生产服务器
npm run start
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request。

## 📄 许可证

MIT License

## 📖 文档

### 核心文档
- **[架构指南](./docs/CLAUDE.md)** - 项目架构、DDD设计、开发规范（⭐ 新贡献者必读）
- **[部署文档](./docs/DEPLOYMENT.md)** - 生产环境部署完整指南

### 技术文档
- [文档索引](./docs/README.md) - 所有技术文档的导航
- [实现概览](./docs/implementation-overview.md) - 技术栈和实现细节
- [苏格拉底对话增强](./docs/socratic-enhancements-20251004.md) - AI对话系统设计

### 专项指南
- [京东云部署](./docs/DEPLOY_JD_CLOUD.md)
- [Tiktoken修复方案](./docs/TIKTOKEN_FIX_DEPLOYMENT.md)