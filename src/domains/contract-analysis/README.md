# Contract Analysis Domain (合同分析领域)

## 📋 领域概述

合同分析领域是法律教育平台的核心功能模块之一，采用DDD（领域驱动设计）架构。

**核心目标**：让普通人3分钟看懂合同，识别风险，学会谈判。

**产品定位**：合同普法教练（不是AI律师），教育导向而非替代律师。

---

## 🏗️ 目录结构

```
contract-analysis/
├── README.md                    # 本文件：领域总览
├── services/                    # 服务层：核心业务逻辑
│   ├── README.md
│   └── ContractParsingService.ts
├── types/                       # 类型定义层
│   ├── README.md
│   ├── analysis.ts             # 分析相关类型
│   └── editor.ts               # 编辑器相关类型
└── stores/                      # 状态管理层
    ├── README.md
    └── contractEditorStore.ts  # Zustand全局状态
```

---

## 🎯 核心功能

### 当前版本 (v0.1)

#### ✅ 已实现
- **合同解析**：AI驱动的合同文本结构化
- **条款分类**：自动识别6大核心条款
- **基础风险识别**：检测缺失条款和潜在风险
- **实时编辑**：富文本编辑器 + 风险高亮

#### 🚧 规划中（v0.2）
- **规则引擎**：基于律师经验的风险识别
- **深度风险分析**：AI + 规则引擎双重检测
- **PDF/Word支持**：文档上传和文本提取
- **协商建议**：生成谈判话术和策略

---

## 📦 依赖关系

### 基础设施依赖
```typescript
// 统一AI调用
import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';

// 配置管理
import { AI_DEFAULTS } from '@/src/config/ai-defaults';
```

### 外部依赖
- `zustand` - 状态管理
- `@tiptap/react` - 富文本编辑器
- `jspdf` - PDF导出（计划）
- `pdfjs-dist` - PDF解析（计划）
- `mammoth` - Word解析（计划）

---

## 🚀 快速开始

### 1. 解析合同（服务端）

```typescript
import { ContractParsingService } from '@/src/domains/contract-analysis/services/ContractParsingService';

const service = new ContractParsingService();
const result = await service.parseContract(contractText);

console.log('合同类型:', result.metadata.contractType);
console.log('甲方:', result.metadata.parties.partyA.name);
console.log('条款数量:', result.clauses.length);
```

### 2. 使用状态管理（客户端）

```typescript
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';

function MyComponent() {
  const { document, risks, setDocument } = useContractEditorStore();

  // 使用状态...
}
```

### 3. 调用API（前端）

```typescript
const response = await fetch('/api/contract/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contractText: '...' })
});

const result = await response.json();
```

---

## 📐 架构设计原则

### DDD分层架构

```
┌─────────────────────────────────┐
│  Presentation Layer             │  ← components/contract/
│  (UI组件、页面)                  │     app/contract/
├─────────────────────────────────┤
│  Application Layer              │  ← app/api/contract/
│  (API路由、请求处理)             │
├─────────────────────────────────┤
│  Domain Layer                   │  ← src/domains/contract-analysis/
│  (业务逻辑、领域服务)            │     services/, types/, stores/
├─────────────────────────────────┤
│  Infrastructure Layer           │  ← src/infrastructure/ai/
│  (基础设施、AI调用、工具)        │
└─────────────────────────────────┘
```

### 核心原则

1. **单一职责**：每个服务只做一件事
   - `ContractParsingService`：只负责解析合同
   - `RiskIdentificationService`（计划）：只负责识别风险

2. **依赖倒置**：依赖抽象而非具体实现
   - 使用`AICallProxy`统一AI调用，方便切换AI Provider

3. **最小化依赖**：领域层不依赖表现层
   - `services/` 不依赖 `components/`
   - `types/` 保持纯粹的类型定义

---

## 🔄 数据流

### 完整的合同分析流程

```
用户上传合同
    ↓
FileUploadZone (components)
    ↓
POST /api/contract/analyze (API Layer)
    ↓
ContractParsingService.parseContract() (Domain Layer)
    ↓
callUnifiedAI() → DeepSeek API (Infrastructure)
    ↓
返回ParsedContract
    ↓
contractEditorStore.setDocument() (State Management)
    ↓
ContractEditor显示结果 (Presentation)
```

---

## 📊 性能指标

### 当前版本 (v0.1)

| 指标 | 数值 | 说明 |
|-----|------|------|
| **单次分析时间** | 3-5秒 | 1000字合同 |
| **Token消耗** | 2000-3000 | 每次分析 |
| **成本** | ¥0.002-0.003 | DeepSeek定价 |
| **准确率** | 70-85% | extractionConfidence |

### 优化目标（v0.2）

- 分析时间：< 3秒
- 准确率：> 90%
- 成本：< ¥0.001/次（通过缓存和规则引擎）

---

## 🧪 测试

### 测试文件位置
```
docs/contract-test-sample.md    # 测试用例和示例合同
```

### 运行测试
```bash
# 启动开发服务器
npm run dev

# 访问测试页面
http://localhost:3000/contract/editor

# 使用示例合同进行测试
# 见 docs/contract-test-sample.md
```

---

## 📚 相关文档

- [完整架构设计](../../../docs/contract-analysis-architecture.md) - 详细的技术方案
- [产品讨论记录](../../../docs/contract-agent-discussion.md) - 产品定位和策略
- [编辑器安装指南](../../../docs/contract-editor-setup.md) - 前端组件安装
- [测试样本](../../../docs/contract-test-sample.md) - 测试用例和示例

---

## 🛠️ 开发指南

### 添加新的服务

1. 在 `services/` 创建新服务类
2. 使用 `callUnifiedAI` 进行AI调用
3. 在 `types/` 定义输入输出类型
4. 更新本README的功能清单

### 添加新的类型

1. 在 `types/` 创建或更新类型文件
2. 导出类型供其他模块使用
3. 更新本README的类型说明

### 添加新的状态

1. 在 `stores/contractEditorStore.ts` 添加状态和操作
2. 在组件中使用 `useContractEditorStore()` 访问
3. 遵循Zustand的最佳实践

---

## 🐛 常见问题

### Q: AI分析返回空结果？
A: 检查 `.env.local` 是否配置了 `DEEPSEEK_API_KEY`

### Q: 类型错误提示？
A: 确保从 `types/` 正确导入类型：
```typescript
import type { ParsedContract } from '../types/analysis';
```

### Q: 状态更新不生效？
A: Zustand状态是不可变的，使用set函数更新：
```typescript
setDocument({ ...document, newField: 'value' });
```

---

## 🚀 下一步计划

参考 [项目看板](../../../docs/contract-analysis-architecture.md#九、下一步行动计划)

### 本周
- [ ] 实现 `ContractRuleEngine` - 规则引擎
- [ ] 实现 `RiskIdentificationService` - 风险识别
- [ ] 添加更多测试用例

### 下周
- [ ] 集成PDF文本提取
- [ ] 集成Word文本提取
- [ ] 完善风险识别规则库

---

## 👥 贡献者

- **架构设计**：基于DDD领域驱动设计
- **产品策略**：Sean的矛盾论指导（见产品讨论记录）
- **技术栈**：Next.js 15 + TypeScript + Zustand + Tiptap

---

## 📄 许可证

本项目是法律教育平台的一部分，遵循项目整体许可证。

---

**最后更新**: 2025-10-21
**版本**: v0.1.0
**状态**: 🟢 Active Development
