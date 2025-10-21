# 合同富文本编辑器 - 安装指南

## 1. 安装依赖

```bash
# Tiptap 富文本编辑器核心库
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-highlight @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-underline

# PDF生成库
npm install jspdf html2canvas

# 如果还没安装这些（你们项目可能已有）
npm install zustand  # 状态管理（你们已经用了）
```

## 2. 文件结构

```
app/contract/
├── editor/
│   └── page.tsx                    # 主编辑器页面
├── upload/
│   └── page.tsx                    # 上传页面

components/contract/
├── ContractEditor.tsx              # 编辑器组件
├── ContractToolbar.tsx             # 工具栏组件
├── AIAssistantPanel.tsx            # AI助手面板
├── RiskHighlightCard.tsx           # 风险卡片组件
└── FileUploadZone.tsx              # 文件上传组件

src/domains/contract-analysis/
├── services/
│   ├── ContractParsingService.ts   # 合同解析服务
│   ├── RiskIdentificationService.ts # 风险识别服务
│   └── ClauseCheckerService.ts     # 条款检查服务
├── types/
│   └── index.ts                    # 类型定义
└── stores/
    └── contractEditorStore.ts      # 编辑器状态管理

styles/
└── contract-editor.css             # 编辑器样式
```

## 3. 开发流程

1. 先创建类型定义
2. 创建编辑器核心组件
3. 集成文件上传
4. 实现AI分析
5. 测试完整流程

## 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000/contract/editor`
