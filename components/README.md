# 🧩 components/ - React组件库

> **设计理念**：按功能模块组织组件，复用shadcn/ui设计系统，保持UI一致性

## 📂 组件结构

```
components/
├── acts/                      # 四幕教学组件
├── socratic/                  # 苏格拉底对话组件
├── evidence/                  # 证据分析组件
├── legal/                     # 法律专业组件
├── contract/                  # 合同分析组件
├── ppt/                       # PPT生成组件
├── auth/                      # 认证授权组件
├── feedback/                  # 反馈组件
├── ui/                        # 基础UI组件（shadcn/ui）
├── providers/                 # React上下文提供者
└── *.tsx                      # 通用工具组件
```

---

## 🎭 核心组件分类

### 1. acts/ - 四幕教学组件

**四幕教学法UI实现**：

| 组件 | 职责 | 路由 |
|------|------|------|
| `ActOne.tsx` | 第一幕：案例导入和文档上传 | - |
| `ActTwo.tsx` | 第二幕：AI深度分析展示 | - |
| `ActThree.tsx` | 第三幕：苏格拉底对话界面 | - |
| `Act5TeacherMode.tsx` | 第五幕：教师模式总结 | - |
| `Act6JudgmentSummary.tsx` | 第六幕：判决总结 | - |
| `ActFour.tsx` | 第四幕：教学总结 | - |
| `DeepAnalysis.tsx` | 深度分析组件 | - |

**使用示例**：
```tsx
import { ActTwo } from '@/components/acts/ActTwo';

<ActTwo caseData={caseData} onAnalysisComplete={handleComplete} />
```

---

### 2. socratic/ - 苏格拉底对话组件

**实时对话和课堂互动**：

| 组件 | 职责 |
|------|------|
| `TeacherSocratic.tsx` | 教师端对话界面（核心） |
| `RealtimeClassroomPanel.tsx` | 实时课堂面板 |
| `ClassroomCode.tsx` | 课堂邀请码组件 |
| `ArgumentTree.tsx` | 论证树可视化 |
| `MessageItem.tsx` | 对话消息项 |

**使用示例**：
```tsx
import { TeacherSocratic } from '@/components/socratic/TeacherSocratic';

<TeacherSocratic
  sessionId={sessionId}
  caseContext={caseContext}
  mode="analysis"
  level="intermediate"
/>
```

---

### 3. evidence/ - 证据分析组件

**证据链条和关系图**：

| 组件 | 职责 |
|------|------|
| `EvidenceCard.tsx` | 证据卡片展示 |
| `EvidenceRelationship.tsx` | 证据关系图可视化 |

**使用示例**：
```tsx
import { EvidenceCard } from '@/components/evidence/EvidenceCard';

<EvidenceCard evidence={evidenceData} />
```

---

### 4. ui/ - 基础UI组件

> **基于 shadcn/ui**：所有基础组件都来自Radix UI + Tailwind CSS

**常用组件**：
- `Button` - 按钮（多种变体）
- `Dialog` - 对话框
- `Card` - 卡片容器
- `Input` - 输入框
- `Select` - 选择器
- `Tabs` - 标签页
- `Toast` - 通知消息
- `Popover` - 弹出层
- `Sheet` - 侧边栏
- ...等40+组件

**使用示例**：
```tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

<Button variant="default" size="lg">提交分析</Button>
```

**设计原则**：
- ✅ 优先使用 ui/ 下的组件（已验证无障碍性）
- ✅ 遵循shadcn/ui设计系统（保持一致性）
- ❌ 不要重复造轮子（除非现有组件真的不满足）

---

### 5. ppt/ - PPT生成组件

**教学PPT生成功能**：

| 组件 | 职责 |
|------|------|
| `PptGeneratorPanel.tsx` | PPT生成面板 |
| `PptDebugPanel.tsx` | PPT调试面板 |

---

### 6. contract/ - 合同分析组件

**合同智能分析UI**：

| 组件 | 职责 |
|------|------|
| （待补充） | 合同分析相关组件 |

---

### 7. auth/ - 认证授权组件

**用户登录和权限管理**：

| 组件 | 职责 |
|------|------|
| `UserNav.tsx` | 用户导航栏 |

---

## 🛠️ 通用工具组件

### 核心工具组件

| 组件 | 职责 | 路径 |
|------|------|------|
| `ThreeElementsExtractor.tsx` | 三要素提取器（当事人/事实/证据） | `components/` |
| `SimpleFileUploader.tsx` | 简单文件上传器 | `components/` |
| `InlineEditor.tsx` | 内联编辑器 | `components/` |
| `ErrorBoundary.tsx` | 错误边界组件 | `components/` |
| `sidebar.tsx` | 侧边栏导航 | `components/` |
| `login-form.tsx` | 登录表单 | `components/` |

---

## 📐 组件开发规范

### 1. 文件命名
- **组件文件**：PascalCase，如 `ActTwo.tsx`
- **工具文件**：kebab-case，如 `login-form.tsx`
- **类型文件**：类型定义在组件内部或 `lib/types/`

### 2. 组件结构
```tsx
import { FC } from 'react';

interface ActTwoProps {
  caseData: CaseData;
  onComplete?: (result: AnalysisResult) => void;
}

export const ActTwo: FC<ActTwoProps> = ({ caseData, onComplete }) => {
  // 1. Hooks
  const [state, setState] = useState();

  // 2. 事件处理
  const handleAction = () => { ... };

  // 3. 渲染
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### 3. Props类型定义
- ✅ 必须用 interface 定义 Props
- ✅ 导出 Props 接口（便于复用）
- ❌ 禁止使用 `any`（用 `unknown` + 类型守卫）

### 4. 样式管理
- ✅ 优先使用 Tailwind CSS
- ✅ 复杂样式用 `cn()` 工具函数
- ❌ 避免内联样式（除非动态计算）

**示例**：
```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "flex items-center gap-2",
  isActive && "bg-primary text-white",
  className
)} />
```

### 5. 状态管理
- **组件内部状态**：`useState`/`useReducer`
- **全局状态**：Zustand store（在 `src/domains/*/stores/`）
- **服务端数据**：不直接在组件里调API，通过domain service

---

## 🎯 快速开始

### 添加新组件

1. **确定组件类别**
   - 属于四幕教学？→ `acts/`
   - 属于苏格拉底对话？→ `socratic/`
   - 基础UI组件？→ `ui/`
   - 通用工具？→ 根目录

2. **创建组件文件**
   ```bash
   # 示例：创建新的证据组件
   touch components/evidence/EvidenceTimeline.tsx
   ```

3. **编写组件**
   - 参考同类组件的结构
   - 遵循组件开发规范
   - 使用 ui/ 基础组件

4. **导出组件**（如需全局使用）
   ```tsx
   // components/evidence/index.ts
   export * from './EvidenceCard';
   export * from './EvidenceTimeline';
   ```

### 修改现有组件

1. 找到对应组件文件
2. 修改逻辑
3. 测试UI效果：`npm run dev`
4. 检查类型：`npm run type-check`

### 使用ui/基础组件

```tsx
// 1. 查看可用组件
// ls components/ui/

// 2. 导入使用
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3. 使用
<Card>
  <Button onClick={handleClick}>提交</Button>
</Card>
```

---

## 📚 扩展阅读

- [shadcn/ui 文档](https://ui.shadcn.com/) - 基础组件库
- [Radix UI 文档](https://www.radix-ui.com/) - 无障碍组件原语
- [Tailwind CSS 文档](https://tailwindcss.com/) - 样式系统
- [功能文档](../docs/功能文档/) - 各功能模块详细说明

---

**最后更新**：2025-10-21
**维护原则**：组件复用 > 重新开发，简洁 > 复杂
