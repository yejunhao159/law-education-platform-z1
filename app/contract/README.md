# Contract Pages (合同分析页面层)

## 📋 页面层概述

页面层是合同分析功能的**路由和页面组织层**，基于 Next.js 15 App Router 实现。

**核心职责**：
- 🗺️ 路由管理（URL映射）
- 📄 页面组织（布局和结构）
- 🔄 数据流协调（组件 ↔ API）
- 🎯 用户流程编排（上传 → 分析 → 编辑）

**设计原则**：
- 清晰的URL结构
- 流畅的用户体验
- 合理的代码分割
- SEO友好（元数据）

---

## 🗂️ 路由结构

```
/contract                      # 合同分析功能根路径
└── /editor                    # 合同编辑器主页面 ⭐
```

### 当前页面清单（v0.1）

| 路由 | 页面文件 | 功能描述 | 状态 |
|-----|---------|---------|------|
| `/contract/editor` | `editor/page.tsx` | 合同编辑器主页面 | ✅ 已实现 |

### 未来规划（v0.2+）

| 路由 | 功能描述 | 优先级 |
|-----|---------|--------|
| `/contract` | 合同分析首页（功能介绍） | P1 |
| `/contract/dashboard` | 合同管理仪表板（历史记录） | P1 |
| `/contract/templates` | 合同模板库 | P2 |
| `/contract/compare` | 合同版本对比 | P2 |
| `/contract/share/[id]` | 分享链接页面 | P3 |

---

## 📐 页面详解

### /contract/editor - 合同编辑器主页面

**文件路径**：`app/contract/editor/page.tsx`

**功能描述**：合同智能分析和编辑的核心页面，提供完整的合同处理流程。

**核心功能**：
- ✅ 文件上传（PDF/Word）
- ✅ 合同解析（AI分析）
- ✅ 富文本编辑（Tiptap）
- ✅ 风险高亮显示
- ✅ 条款检查清单
- ✅ AI助手交互
- ✅ PDF/Word导出

**页面结构**：
```typescript
export default function ContractEditorPage() {
  // 状态管理
  const {
    document,          // 当前合同文档
    setDocument,       // 更新文档
    setIsAnalyzing,    // 分析状态
    setRisks,          // 风险列表
    setClauseChecks,   // 条款检查
  } = useContractEditorStore();

  // 本地状态
  const [currentEditor, setCurrentEditor] = useState<Editor | null>(null);
  const [showUpload, setShowUpload] = useState(true);

  // 页面布局
  return (
    <div className="h-screen flex flex-col">
      {/* 顶部标题栏 */}
      <header>...</header>

      {/* 主内容区域 */}
      {showUpload ? (
        // 上传界面
        <FileUploadZone />
      ) : (
        // 编辑器界面
        <div className="flex">
          {/* 左侧编辑器 (75%) */}
          <ContractEditor />

          {/* 右侧AI助手 (25%) */}
          <AIAssistantPanel />
        </div>
      )}
    </div>
  );
}
```

**用户流程**：
```
┌────────────────────────────────┐
│ Step 1: 文件上传                │
│ FileUploadZone                 │
│ - 拖拽或点击上传               │
│ - 支持 PDF/Word                │
└────────────┬───────────────────┘
             ↓
┌────────────────────────────────┐
│ Step 2: 文本提取                │
│ extractTextFromFile()          │
│ - PDF: pdfjs-dist (计划)       │
│ - Word: mammoth (计划)         │
└────────────┬───────────────────┘
             ↓
┌────────────────────────────────┐
│ Step 3: AI分析                 │
│ analyzeContract()              │
│ → POST /api/contract/analyze   │
│ → ContractParsingService       │
└────────────┬───────────────────┘
             ↓
┌────────────────────────────────┐
│ Step 4: 结果展示                │
│ - 合同元数据（类型、当事人）    │
│ - 风险高亮（三级分类）         │
│ - 条款检查（6大核心条款）       │
└────────────┬───────────────────┘
             ↓
┌────────────────────────────────┐
│ Step 5: 编辑和交互              │
│ - ContractEditor（富文本）     │
│ - AIAssistantPanel（助手）     │
│ - ContractToolbar（工具栏）    │
└────────────────────────────────┘
```

**数据流**：
```typescript
// 1. 文件上传处理
const handleFileSelect = (file: File) => {
  setDocument({
    id: `doc-${Date.now()}`,
    fileName: file.name,
    uploadTime: new Date(),
    originalText: '',
    editedText: '',
  });
};

// 2. 文本提取完成
const handleExtractComplete = async (text: string) => {
  setDocument({
    ...document,
    originalText: text,
    editedText: text,
  });

  setShowUpload(false);  // 隐藏上传界面
  await analyzeContract(text);  // 触发AI分析
};

// 3. AI分析
const analyzeContract = async (text: string) => {
  setIsAnalyzing(true);
  setAnalysisProgress(0);

  try {
    // 调用API
    const response = await fetch('/api/contract/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractText: text }),
    });

    const result = await response.json();

    // 更新状态
    if (result.success && result.data) {
      const { contract, analysis } = result.data;

      // 更新合同元数据
      setDocument({
        ...document,
        contractType: contract.metadata.contractType,
        parties: contract.metadata.parties,
      });

      // 提取风险
      const detectedRisks = contract.clauses
        .filter(clause =>
          clause.category === '违约责任' ||
          clause.category === '合同终止'
        )
        .map(clause => ({
          id: `risk-${clause.id}`,
          text: clause.content.substring(0, 100),
          riskLevel: 'medium',
          // ... 更多风险属性
        }));

      setRisks(detectedRisks);

      // 生成条款检查结果
      const clauseCheckResults = ESSENTIAL_CLAUSES.map(clauseName => {
        // 检查条款是否存在
        // ...
      });

      setClauseChecks(clauseCheckResults);
    }
  } catch (error) {
    console.error('分析失败:', error);
    alert('合同分析失败，请稍后重试');
  } finally {
    setIsAnalyzing(false);
  }
};
```

**交互功能**：
```typescript
// PDF导出
const handleExportPDF = async () => {
  const doc = new jsPDF();
  const content = currentEditor.getText();

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

  doc.save(`${document?.fileName || 'contract'}.pdf`);
};

// Word导出
const handleExportWord = () => {
  const content = currentEditor.getHTML();
  const blob = new Blob([content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${document?.fileName || 'contract'}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

// 跳转到指定位置
const handleJumpToPosition = (position: { start: number; end: number }) => {
  (window as any).contractEditor?.jumpToPosition(position);
};

// 应用修改建议
const handleApplySuggestion = (suggestion: {
  originalText: string;
  suggestedText: string;
  position: { start: number; end: number };
}) => {
  (window as any).contractEditor?.applySuggestion(suggestion);
};
```

**性能优化**：
```typescript
// 1. 编辑器实例轮询优化
useEffect(() => {
  const checkEditor = () => {
    const editor = (window as any).contractEditor;
    if (editor) {
      setCurrentEditor(editor);
    }
  };

  checkEditor();
  const interval = setInterval(checkEditor, 500);

  return () => clearInterval(interval);
}, []);

// 2. 分析进度展示
setAnalysisProgress(20);  // 开始分析
setAnalysisProgress(50);  // API调用中
setAnalysisProgress(80);  // 处理结果
setAnalysisProgress(100); // 完成
```

**错误处理**：
```typescript
try {
  const response = await fetch('/api/contract/analyze', { ... });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || '分析失败');
  }

  // 处理成功结果
} catch (error) {
  console.error('❌ 分析失败:', error);
  alert('合同分析失败：' + (error instanceof Error ? error.message : '未知错误'));
} finally {
  setIsAnalyzing(false);
}
```

**已知限制**：
- 文本提取功能暂未完全实现（PDF/Word）
- AI对话功能暂为占位实现
- 导出功能较简单（不保留格式）
- 缺少历史记录和版本管理

---

## 🏗️ 页面架构设计

### 布局结构

```
┌─────────────────────────────────────────────────┐
│  Header (顶部标题栏)                             │
│  - 页面标题                                     │
│  - 当前文档名                                   │
│  - 重新上传按钮                                 │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Main Content (主内容区域)                       │
│                                                 │
│  [状态1: 上传界面]                               │
│  ┌───────────────────────────────────────────┐ │
│  │  FileUploadZone                          │ │
│  │  - 拖拽上传                              │ │
│  │  - 支持 PDF/Word                         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [状态2: 编辑器界面]                             │
│  ┌─────────────────────┬────────────────────┐ │
│  │ Left Panel (75%)    │ Right Panel (25%) │ │
│  │                     │                    │ │
│  │ ContractToolbar     │ AIAssistantPanel   │ │
│  │ ├─ 格式化工具       │ ├─ 风险列表        │ │
│  │ ├─ 导出按钮         │ ├─ 条款检查        │ │
│  │ └─ 撤销/重做        │ └─ AI对话          │ │
│  │                     │                    │ │
│  │ ContractEditor      │                    │ │
│  │ - 富文本编辑        │                    │ │
│  │ - 风险高亮          │                    │ │
│  │ - 实时保存          │                    │ │
│  │                     │                    │ │
│  └─────────────────────┴────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 响应式设计（未来）

```typescript
// 断点设计
const breakpoints = {
  sm: '640px',   // 手机
  md: '768px',   // 平板
  lg: '1024px',  // 桌面
  xl: '1280px',  // 大屏
};

// 响应式布局
<div className="
  flex flex-col md:flex-row    // 手机竖向，平板横向
  w-full h-screen
">
  {/* 编辑器：桌面75%，平板100% */}
  <div className="w-full md:w-3/4">
    <ContractEditor />
  </div>

  {/* AI助手：桌面25%，平板隐藏 */}
  <div className="hidden md:block md:w-1/4">
    <AIAssistantPanel />
  </div>
</div>
```

---

## 🔄 状态管理

### 页面级状态

```typescript
interface PageState {
  currentEditor: Editor | null;       // Tiptap编辑器实例
  showUpload: boolean;                // 是否显示上传界面
}
```

### 全局状态（Zustand Store）

```typescript
// 由 contractEditorStore 管理
interface ContractEditorState {
  // 文档状态
  document: ContractDocument | null;

  // 分析结果
  risks: Risk[];
  clauseChecks: ClauseCheckResult[];

  // UI状态
  isAnalyzing: boolean;
  analysisProgress: number;

  // AI对话
  messages: Message[];

  // 操作方法
  setDocument: (doc: ContractDocument) => void;
  setRisks: (risks: Risk[]) => void;
  setClauseChecks: (checks: ClauseCheckResult[]) => void;
  updateEditedText: (text: string) => void;
  addMessage: (msg: Message) => void;
}
```

**为什么这样分？**
- ✅ 页面级状态：UI交互临时状态
- ✅ 全局状态：需要跨组件共享的业务数据
- ✅ 清晰的职责划分，便于维护

---

## 🛠️ 开发新页面指南

### 步骤1：规划页面路由

```
/contract/your-page
```

创建目录结构：
```
app/contract/your-page/
└── page.tsx
```

### 步骤2：创建页面文件

```typescript
'use client';

import { useState } from 'react';

export default function YourPage() {
  const [state, setState] = useState(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">页面标题</h1>
      {/* 页面内容 */}
    </div>
  );
}
```

### 步骤3：添加元数据（SEO）

```typescript
// 如果需要自定义metadata
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '页面标题 - 合同分析',
  description: '页面描述',
};

export default function YourPage() {
  // ...
}
```

### 步骤4：集成组件和API

```typescript
import { YourComponent } from '@/components/contract/YourComponent';

export default function YourPage() {
  const handleAction = async () => {
    // 调用API
    const response = await fetch('/api/contract/your-endpoint', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });

    const result = await response.json();
    // 处理结果
  };

  return (
    <YourComponent onAction={handleAction} />
  );
}
```

### 步骤5：更新导航

在主导航中添加链接：
```typescript
<Link href="/contract/your-page">
  您的页面
</Link>
```

---

## 🧪 测试策略

### E2E测试（Playwright）

```typescript
import { test, expect } from '@playwright/test';

test('合同编辑器完整流程', async ({ page }) => {
  // 1. 访问页面
  await page.goto('/contract/editor');

  // 2. 上传文件
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-contract.pdf');

  // 3. 等待分析完成
  await expect(page.locator('text=分析完成')).toBeVisible({ timeout: 10000 });

  // 4. 验证风险列表
  const riskList = page.locator('[data-testid="risk-list"]');
  await expect(riskList).toBeVisible();

  // 5. 点击风险定位
  await page.locator('[data-testid="risk-item-1"]').click();

  // 6. 验证编辑器跳转
  await expect(page.locator('.ProseMirror')).toBeFocused();

  // 7. 导出PDF
  const downloadPromise = page.waitForEvent('download');
  await page.locator('button:has-text("导出PDF")').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.pdf');
});
```

### 组件集成测试

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractEditorPage from './page';

describe('ContractEditorPage', () => {
  it('should show upload zone initially', () => {
    render(<ContractEditorPage />);

    expect(screen.getByText('拖拽上传')).toBeInTheDocument();
  });

  it('should analyze contract after upload', async () => {
    render(<ContractEditorPage />);

    const file = new File(['合同内容'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('上传文件');

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('风险列表')).toBeInTheDocument();
    });
  });
});
```

---

## 🚀 性能优化

### 代码分割

```typescript
import dynamic from 'next/dynamic';

// 动态导入AI助手面板（非首屏必需）
const AIAssistantPanel = dynamic(
  () => import('@/components/contract/AIAssistantPanel'),
  {
    loading: () => <div>加载中...</div>,
    ssr: false,  // 不需要SSR
  }
);
```

### 预加载关键资源

```typescript
import { useEffect } from 'react';

export default function ContractEditorPage() {
  useEffect(() => {
    // 预加载AI模型配置
    fetch('/api/contract/config').then(res => res.json());
  }, []);

  // ...
}
```

### 缓存策略

```typescript
// 使用SWR进行数据缓存
import useSWR from 'swr';

const { data, error } = useSWR('/api/contract/templates', fetcher, {
  revalidateOnFocus: false,  // 不在焦点时重新验证
  dedupingInterval: 60000,   // 1分钟内不重复请求
});
```

---

## 📊 用户行为追踪

### 关键指标

```typescript
// 记录页面访问
useEffect(() => {
  analytics.track('page_view', {
    page: '/contract/editor',
    timestamp: new Date().toISOString(),
  });
}, []);

// 记录功能使用
const analyzeContract = async (text: string) => {
  analytics.track('contract_analyzed', {
    text_length: text.length,
    timestamp: new Date().toISOString(),
  });

  // 分析逻辑...
};

// 记录错误
catch (error) {
  analytics.track('analysis_error', {
    error: error.message,
    timestamp: new Date().toISOString(),
  });
}
```

### 性能监控

```typescript
// 记录分析耗时
const startTime = Date.now();

await analyzeContract(text);

const duration = Date.now() - startTime;
analytics.track('analysis_performance', {
  duration_ms: duration,
  text_length: text.length,
});
```

---

## 📚 相关文档

- [主README](../../src/domains/contract-analysis/README.md) - 领域总览
- [UI组件](../../components/contract/README.md) - 组件文档
- [API路由](../api/contract/README.md) - API文档
- [测试样本](../../docs/contract-test-sample.md) - 测试用例

---

## 🔮 未来规划

### v0.2 页面功能增强
- [ ] 添加合同管理仪表板（历史记录、统计）
- [ ] 实现合同模板库（常见合同类型）
- [ ] 支持合同版本对比功能

### v0.3 新页面开发
- [ ] 合同分享功能（生成分享链接）
- [ ] 协作编辑页面（多人实时编辑）
- [ ] 移动端适配页面

### UX优化
- [ ] 引导流程优化（新手引导）
- [ ] 快捷键支持（提升效率）
- [ ] 暗色模式（护眼）
- [ ] 无障碍优化（ARIA标签）

---

**最后更新**: 2025-10-21
**版本**: v0.1.0
**状态**: 🟢 Active Development
