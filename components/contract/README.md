# Contract UI Components (合同分析UI组件)

## 📋 组件层概述

UI组件层是合同分析功能的**用户界面层**，负责将后端数据转化为直观、易用的交互界面。

**核心职责**：
- 📄 展示合同内容（富文本编辑器）
- 🚨 高亮显示风险（实时标注）
- 🤖 AI辅助交互（对话面板）
- 📂 文件上传处理（拖拽上传）
- 🛠️ 编辑功能工具栏

**设计原则**：
- 用户友好：降低学习成本，普通人也能用
- 响应迅速：即时反馈，流畅体验
- 视觉清晰：风险分级明确，信息层次分明
- 可访问性：支持键盘导航，遵循WCAG标准

---

## 🗂️ 组件清单

### ✅ 已实现（v0.1）

```
components/contract/
├── README.md                # 本文件
├── ContractEditor.tsx       # 富文本编辑器核心组件 ⭐
├── ContractToolbar.tsx      # 编辑器工具栏
├── AIAssistantPanel.tsx     # AI助手面板 ⭐
├── FileUploadZone.tsx       # 文件上传区域 ⭐
└── RiskHighlightCard.tsx    # 风险卡片组件
```

---

## 📐 组件详解

### ContractEditor.tsx - 富文本编辑器核心组件

**职责**：提供强大的富文本编辑能力，支持风险高亮和实时编辑

**核心功能**：
- ✅ 富文本编辑（基于 Tiptap）
- ✅ 风险自动高亮（三级颜色标注）
- ✅ 位置跳转（点击风险跳转到对应位置）
- ✅ 建议应用（一键应用AI修改建议）
- ✅ 实时保存（自动同步到状态管理）

**技术实现**：
- **框架**：Tiptap (基于 ProseMirror)
- **扩展**：StarterKit + Highlight + TextStyle + Color
- **状态管理**：Zustand (contractEditorStore)
- **样式**：Tailwind Prose

**Props接口**：
```typescript
interface ContractEditorProps {
  initialContent?: string;                     // 初始内容
  onContentChange?: (content: string) => void; // 内容变化回调
}
```

**使用示例**：
```typescript
import { ContractEditor } from '@/components/contract/ContractEditor';

function MyPage() {
  return (
    <ContractEditor
      initialContent="合同初始文本..."
      onContentChange={(content) => {
        console.log('内容已更新:', content);
      }}
    />
  );
}
```

**核心方法**：
```typescript
// 暴露给window的编辑器实例
window.contractEditor = {
  jumpToPosition: (position: { start: number; end: number }) => void,
  applySuggestion: (suggestion: {
    originalText: string;
    suggestedText: string;
    position: { start: number; end: number };
  }) => void,
};
```

**风险高亮颜色规范**：
```typescript
const RISK_COLORS = {
  high: '#FEE2E2',    // 红色背景 - 严重风险
  medium: '#FEF3C7',  // 黄色背景 - 中等风险
  low: '#DBEAFE',     // 蓝色背景 - 轻微风险
};
```

**性能优化**：
- 使用 `useEffect` 依赖优化，避免不必要的重渲染
- 高亮操作批量处理，减少DOM操作
- 编辑器实例全局复用（挂载到window）

**已知限制**：
- 大文本（>10万字）性能下降
- 复杂格式（表格、图片）支持有限
- 撤销历史不持久化

---

### FileUploadZone.tsx - 文件上传区域

**职责**：处理合同文档的上传和文本提取

**核心功能**：
- ✅ 拖拽上传（Drag & Drop）
- ✅ 点击上传（File Input）
- ✅ 文件验证（类型、大小）
- ✅ 文本提取（PDF、Word）
- ✅ 加载状态（进度提示）
- ✅ 错误处理（友好提示）

**技术实现**：
- **拖拽**：HTML5 Drag and Drop API
- **PDF提取**：pdfjs-dist（计划集成）
- **Word提取**：mammoth（计划集成）
- **图标**：lucide-react

**Props接口**：
```typescript
interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;           // 文件选择回调
  onExtractComplete?: (text: string) => void;   // 文本提取完成回调
  accept?: string;                              // 接受的文件类型（默认：.pdf,.doc,.docx）
  maxSize?: number;                             // 最大文件大小（默认：10MB）
}
```

**使用示例**：
```typescript
import { FileUploadZone } from '@/components/contract/FileUploadZone';

function MyPage() {
  const handleFileSelect = (file: File) => {
    console.log('已选择文件:', file.name);
  };

  const handleExtractComplete = (text: string) => {
    console.log('提取的文本长度:', text.length);
    // 开始分析合同
    analyzeContract(text);
  };

  return (
    <FileUploadZone
      onFileSelect={handleFileSelect}
      onExtractComplete={handleExtractComplete}
      accept=".pdf,.docx"
      maxSize={20}  // 20MB
    />
  );
}
```

**支持的文件格式**：
| 格式 | 扩展名 | 提取状态 | 说明 |
|-----|--------|---------|------|
| PDF | `.pdf` | 🚧 计划中 | 使用 pdfjs-dist |
| Word 2007+ | `.docx` | 🚧 计划中 | 使用 mammoth |
| Word 旧版 | `.doc` | 🚧 计划中 | 使用 mammoth |

**文本提取流程**：
```
用户选择文件
    ↓
validateFile() - 验证文件类型和大小
    ↓
handleFile() - 处理文件
    ↓
extractTextFromFile() - 根据文件类型提取文本
    ├── PDF → extractFromPDF()
    └── Word → extractFromWord()
    ↓
onExtractComplete(text) - 返回提取的文本
```

**错误处理**：
```typescript
// 常见错误类型
const errors = {
  FILE_TOO_LARGE: '文件大小超过限制',
  INVALID_TYPE: '不支持的文件格式',
  EXTRACT_FAILED: '文本提取失败',
  CORRUPTED_FILE: '文件损坏或格式不正确',
};
```

**未来改进**（v0.2）：
- [ ] 实际集成 pdfjs-dist 和 mammoth
- [ ] 支持批量上传
- [ ] 上传进度条
- [ ] 预览缩略图
- [ ] OCR文字识别（扫描件）

---

### AIAssistantPanel.tsx - AI助手面板

**职责**：显示AI分析结果和提供对话交互

**核心功能**：
- ✅ 风险列表展示（三级分类）
- ✅ 条款检查清单（6大核心条款）
- ✅ AI对话界面（问答交互）
- ✅ 标签切换（风险/条款/对话）
- ✅ 风险定位跳转
- ✅ 建议一键应用

**技术实现**：
- **状态管理**：Zustand (contractEditorStore)
- **图标**：lucide-react
- **布局**：Tailwind CSS + Flexbox

**Props接口**：
```typescript
interface AIAssistantPanelProps {
  onJumpToPosition?: (position: { start: number; end: number }) => void;
  onApplySuggestion?: (suggestion: {
    originalText: string;
    suggestedText: string;
    position: { start: number; end: number };
  }) => void;
}
```

**使用示例**：
```typescript
import { AIAssistantPanel } from '@/components/contract/AIAssistantPanel';

function MyPage() {
  const handleJumpToPosition = (position) => {
    // 跳转到编辑器中的指定位置
    window.contractEditor.jumpToPosition(position);
  };

  const handleApplySuggestion = (suggestion) => {
    // 应用AI修改建议
    window.contractEditor.applySuggestion(suggestion);
  };

  return (
    <AIAssistantPanel
      onJumpToPosition={handleJumpToPosition}
      onApplySuggestion={handleApplySuggestion}
    />
  );
}
```

**三个标签页**：

#### 1. 风险标签（Risks Tab）
显示所有识别的风险项：
```typescript
// 风险卡片
<RiskHighlightCard
  risk={risk}
  onJumpToPosition={onJumpToPosition}
  onApplySuggestion={onApplySuggestion}
/>
```

**风险分级显示**：
- 🔴 高风险（high）：红色边框 + 警告图标
- 🟡 中风险（medium）：黄色边框 + 提示图标
- 🔵 低风险（low）：蓝色边框 + 信息图标

#### 2. 条款标签（Clauses Tab）
显示6大核心条款检查结果：
```typescript
// 条款检查卡片
{clauseChecks.map(clause => (
  <div key={clause.clauseName}>
    {renderClauseCheckIcon(clause)}
    <span>{clause.clauseName}</span>
    {!clause.present && (
      <p className="text-sm text-red-600">{clause.reason}</p>
    )}
  </div>
))}
```

**条款状态图标**：
- ✅ 充分（sufficient）：绿色对钩
- ⚠️ 需改进（needs-improvement）：黄色警告
- ❌ 缺失（missing）：红色叉号

#### 3. 对话标签（Chat Tab）
AI对话交互界面：
```typescript
// 对话消息
{messages.map((msg, index) => (
  <div key={index} className={msg.role === 'user' ? 'user-message' : 'ai-message'}>
    {msg.content}
  </div>
))}

// 输入框
<input
  value={chatInput}
  onChange={(e) => setChatInput(e.target.value)}
  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
  placeholder="询问合同相关问题..."
/>
```

**对话功能**（v0.2 计划）：
- [ ] 集成真实AI服务
- [ ] 上下文理解（基于当前合同）
- [ ] 历史记录保存
- [ ] 建议操作快捷按钮

**分析进度显示**：
```typescript
{isAnalyzing && (
  <div className="progress-bar">
    <div className="progress-fill" style={{ width: `${analysisProgress}%` }} />
    <span>{analysisProgress}%</span>
  </div>
)}
```

---

### ContractToolbar.tsx - 编辑器工具栏

**职责**：提供文本编辑和文档导出功能

**核心功能**：
- ✅ 文本格式化（加粗、斜体、下划线）
- ✅ 标题设置（H1、H2、H3）
- ✅ PDF导出（jsPDF）
- ✅ Word导出（计划）
- ✅ 撤销/重做

**技术实现**：
- **编辑器API**：Tiptap Commands
- **PDF生成**：jsPDF
- **图标**：lucide-react

**Props接口**：
```typescript
interface ContractToolbarProps {
  editor: Editor | null;                 // Tiptap编辑器实例
  onExportPDF?: () => void;              // PDF导出回调
  onExportWord?: () => void;             // Word导出回调
}
```

**使用示例**：
```typescript
import { ContractToolbar } from '@/components/contract/ContractToolbar';

function MyPage() {
  const editor = useEditor({ ... });

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const content = editor.getText();
    // ... 导出逻辑
    doc.save('contract.pdf');
  };

  return (
    <ContractToolbar
      editor={editor}
      onExportPDF={handleExportPDF}
      onExportWord={handleExportWord}
    />
  );
}
```

**工具栏按钮**：
| 功能 | 图标 | 快捷键 | 说明 |
|-----|------|--------|------|
| 加粗 | **B** | Ctrl+B | 文本加粗 |
| 斜体 | *I* | Ctrl+I | 文本斜体 |
| 下划线 | <u>U</u> | Ctrl+U | 文本下划线 |
| 标题1 | H1 | Ctrl+Alt+1 | 一级标题 |
| 标题2 | H2 | Ctrl+Alt+2 | 二级标题 |
| 标题3 | H3 | Ctrl+Alt+3 | 三级标题 |
| 撤销 | ↶ | Ctrl+Z | 撤销操作 |
| 重做 | ↷ | Ctrl+Y | 重做操作 |
| 导出PDF | 📄 | - | 导出为PDF |
| 导出Word | 📝 | - | 导出为Word |

**导出功能实现**：
```typescript
// PDF导出
const exportToPDF = () => {
  const doc = new jsPDF();
  const content = editor.getText();
  const lines = content.split('\n');

  let y = 10;
  lines.forEach(line => {
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
    doc.text(line, 10, y);
    y += 7;
  });

  doc.save(`${fileName}.pdf`);
};

// Word导出（简化版）
const exportToWord = () => {
  const content = editor.getHTML();
  const blob = new Blob([content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

### RiskHighlightCard.tsx - 风险卡片组件

**职责**：展示单个风险项的详细信息

**核心功能**：
- ✅ 风险信息展示（等级、类型、描述）
- ✅ 法律依据显示
- ✅ 后果分析
- ✅ 处理建议
- ✅ 快速操作（定位、应用建议）

**技术实现**：
- **样式**：Tailwind CSS
- **图标**：lucide-react

**Props接口**：
```typescript
interface RiskHighlightCardProps {
  risk: Risk;                                    // 风险对象
  onJumpToPosition?: (position: { start: number; end: number }) => void;
  onApplySuggestion?: (suggestion: {
    originalText: string;
    suggestedText: string;
    position: { start: number; end: number };
  }) => void;
}
```

**使用示例**：
```typescript
import { RiskHighlightCard } from '@/components/contract/RiskHighlightCard';

function RiskList({ risks }) {
  return (
    <div>
      {risks.map(risk => (
        <RiskHighlightCard
          key={risk.id}
          risk={risk}
          onJumpToPosition={(pos) => {
            editor.jumpToPosition(pos);
          }}
          onApplySuggestion={(sug) => {
            editor.applySuggestion(sug);
          }}
        />
      ))}
    </div>
  );
}
```

**卡片布局**：
```
┌─────────────────────────────────────┐
│ 🔴 不公平条款 (高风险)               │
├─────────────────────────────────────┤
│ 风险原文                             │
│ "甲方有权随时单方面解除本合同"      │
├─────────────────────────────────────┤
│ 📋 风险描述                         │
│ 该条款赋予甲方单方解除权...         │
├─────────────────────────────────────┤
│ ⚖️ 法律依据                         │
│ 《合同法》第54条 - 显失公平的合同   │
├─────────────────────────────────────┤
│ ⚠️ 可能后果                         │
│ 甲方可随时终止合同，乙方权益无保障  │
├─────────────────────────────────────┤
│ 💡 处理建议                         │
│ 建议修改为双方对等的解除权...       │
├─────────────────────────────────────┤
│ [定位] [应用建议]                   │
└─────────────────────────────────────┘
```

**风险等级样式**：
```typescript
const riskLevelStyles = {
  high: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: '🔴',
  },
  medium: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    icon: '🟡',
  },
  low: {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: '🔵',
  },
};
```

---

## 🏗️ 组件架构设计

### 数据流

```
┌──────────────────────────────────────┐
│  用户操作                            │
│  (上传文件、编辑、点击按钮)          │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  UI组件层 (components/contract/)     │
│  ├── FileUploadZone                  │
│  ├── ContractEditor                  │
│  ├── AIAssistantPanel                │
│  └── ContractToolbar                 │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  状态管理层 (Zustand Store)          │
│  contractEditorStore                 │
│  ├── document: ContractDocument      │
│  ├── risks: Risk[]                   │
│  ├── clauseChecks: ClauseCheckResult[]│
│  └── messages: Message[]             │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  API层 (app/api/contract/analyze)    │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  服务层 (domains/contract-analysis/) │
│  ContractParsingService              │
└──────────────────────────────────────┘
```

### 组件依赖关系

```
ContractEditorPage (页面)
  ├── FileUploadZone
  ├── ContractEditor
  │     └── 依赖: Tiptap, contractEditorStore
  ├── ContractToolbar
  │     └── 依赖: Editor实例, jsPDF
  └── AIAssistantPanel
        ├── RiskHighlightCard
        └── 依赖: contractEditorStore
```

---

## 🎨 设计规范

### 颜色系统

**风险等级颜色**：
```typescript
const RISK_COLORS = {
  high: {
    bg: '#FEE2E2',      // 红色背景
    border: '#EF4444',  // 红色边框
    text: '#991B1B',    // 深红色文本
  },
  medium: {
    bg: '#FEF3C7',      // 黄色背景
    border: '#F59E0B',  // 黄色边框
    text: '#92400E',    // 深黄色文本
  },
  low: {
    bg: '#DBEAFE',      // 蓝色背景
    border: '#3B82F6',  // 蓝色边框
    text: '#1E40AF',    // 深蓝色文本
  },
};
```

**条款重要性颜色**：
```typescript
const IMPORTANCE_COLORS = {
  critical: 'border-red-500',    // 关键条款 - 红色
  important: 'border-yellow-500', // 重要条款 - 黄色
  recommended: 'border-blue-500', // 推荐条款 - 蓝色
};
```

### 间距规范

```typescript
// 组件间距
const SPACING = {
  xs: '4px',   // 0.25rem
  sm: '8px',   // 0.5rem
  md: '16px',  // 1rem
  lg: '24px',  // 1.5rem
  xl: '32px',  // 2rem
};

// 卡片内边距
padding: 'p-3' (12px) 或 'p-4' (16px)

// 卡片间距
margin-bottom: 'mb-2' (8px) 或 'mb-3' (12px)
```

### 字体规范

```typescript
// 标题
text-xl (20px) - 主标题
text-lg (18px) - 副标题
text-base (16px) - 正文标题

// 正文
text-sm (14px) - 正文
text-xs (12px) - 辅助文字

// 字重
font-bold (700) - 标题
font-semibold (600) - 次要标题
font-medium (500) - 强调文本
font-normal (400) - 正文
```

---

## 🛠️ 开发新组件指南

### 步骤1：定义组件职责

明确回答：
1. 这个组件**只**负责什么UI？
2. 它需要哪些数据（props）？
3. 它会触发哪些操作（callbacks）？
4. 它依赖哪些外部组件或服务？

### 步骤2：创建组件文件

```typescript
'use client';

/**
 * [组件名称]
 * 职责：[一句话描述]
 */

import { useState } from 'react';
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';

interface YourComponentProps {
  // Props定义
  data: YourDataType;
  onAction?: () => void;
}

export function YourComponent({ data, onAction }: YourComponentProps) {
  // 状态
  const [localState, setLocalState] = useState(false);

  // 全局状态
  const { document, risks } = useContractEditorStore();

  // 事件处理
  const handleClick = () => {
    // ...
    onAction?.();
  };

  // 渲染
  return (
    <div className="your-component">
      {/* JSX */}
    </div>
  );
}
```

### 步骤3：添加样式

使用 Tailwind CSS：
```typescript
<div className="
  flex flex-col            // 布局
  p-4 m-2                  // 间距
  bg-white                 // 背景
  border border-gray-200   // 边框
  rounded-lg               // 圆角
  shadow-sm                // 阴影
  hover:shadow-md          // 悬停效果
  transition-shadow        // 过渡动画
">
  {/* 内容 */}
</div>
```

### 步骤4：集成到页面

在 `app/contract/editor/page.tsx` 中使用：
```typescript
import { YourComponent } from '@/components/contract/YourComponent';

export default function ContractEditorPage() {
  return (
    <div>
      <YourComponent
        data={someData}
        onAction={handleAction}
      />
    </div>
  );
}
```

### 步骤5：更新文档

1. 在本README中添加组件说明
2. 更新组件清单
3. 添加使用示例

---

## 🧪 测试策略

### 组件测试（React Testing Library）

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent data={mockData} />);

    expect(screen.getByText('期望的文本')).toBeInTheDocument();
  });

  it('should call onAction when clicked', () => {
    const onAction = jest.fn();
    render(<YourComponent data={mockData} onAction={onAction} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onAction).toHaveBeenCalled();
  });
});
```

### 集成测试

测试组件间的交互：
```typescript
describe('Contract Editor Integration', () => {
  it('should highlight risks when analyzed', async () => {
    render(<ContractEditorPage />);

    // 上传文件
    const file = new File(['合同内容'], 'test.txt');
    fireEvent.drop(screen.getByTestId('upload-zone'), {
      dataTransfer: { files: [file] },
    });

    // 等待分析完成
    await waitFor(() => {
      expect(screen.getByText('风险列表')).toBeInTheDocument();
    });

    // 验证风险高亮
    expect(screen.getByTestId('risk-highlight')).toBeInTheDocument();
  });
});
```

---

## 🚀 性能优化

### 优化建议

#### 1. 避免不必要的重渲染
```typescript
// 使用 React.memo
export const YourComponent = React.memo(({ data }) => {
  // ...
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return prevProps.data.id === nextProps.data.id;
});

// 使用 useMemo
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// 使用 useCallback
const handleClick = useCallback(() => {
  // ...
}, [dependency]);
```

#### 2. 虚拟滚动（大列表）
```typescript
import { FixedSizeList } from 'react-window';

function RiskList({ risks }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={risks.length}
      itemSize={100}
    >
      {({ index, style }) => (
        <div style={style}>
          <RiskHighlightCard risk={risks[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

#### 3. 懒加载
```typescript
import { lazy, Suspense } from 'react';

const AIAssistantPanel = lazy(() => import('./AIAssistantPanel'));

function MyPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <AIAssistantPanel />
    </Suspense>
  );
}
```

---

## 📚 相关文档

- [主README](../../src/domains/contract-analysis/README.md) - 领域总览
- [类型定义](../../src/domains/contract-analysis/types/README.md) - 类型说明
- [状态管理](../../src/domains/contract-analysis/stores/README.md) - Store文档（计划）
- [页面路由](../../app/contract/README.md) - 页面文档（计划）

---

## 🔮 未来规划

### v0.2 计划
- [ ] 集成真实的PDF/Word文本提取
- [ ] 实现AI对话功能
- [ ] 添加条款模板库
- [ ] 支持合同版本对比
- [ ] 导出功能增强（保留格式）

### v0.3 计划
- [ ] 多人协作编辑
- [ ] 实时同步
- [ ] 移动端适配
- [ ] 无障碍优化

---

**最后更新**: 2025-10-21
**版本**: v0.1.0
**状态**: 🟢 Active Development
