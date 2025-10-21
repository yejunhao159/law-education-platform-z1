# Contract Analysis Types (合同分析类型定义)

## 📋 类型定义层概述

类型定义层是合同分析领域的**数据模型核心**，定义了所有业务对象的结构和关系。

**核心职责**：
- 📐 定义业务对象的结构（契约式设计）
- 🔒 保证类型安全（TypeScript严格模式）
- 📖 提供清晰的文档（类型即文档）
- 🔄 支持类型推导（开发体验）

**设计原则**：
- 不可变性：类型定义不包含业务逻辑
- 完整性：覆盖所有业务场景
- 扩展性：易于添加新字段
- 清晰性：命名直观，注释完整

---

## 🗂️ 文件组织

```
types/
├── README.md          # 本文件
├── analysis.ts        # 分析相关类型 ⭐核心
└── editor.ts          # 编辑器相关类型
```

### 文件职责划分

| 文件 | 职责 | 使用场景 |
|-----|------|---------|
| `analysis.ts` | 合同分析结果类型 | 服务层、API层 |
| `editor.ts` | 编辑器状态类型 | UI组件、状态管理 |

---

## 📐 核心类型详解

### analysis.ts - 分析相关类型

#### ParsedContract（解析后的合同）

**用途**：表示AI解析后的结构化合同数据

**结构**：
```typescript
export interface ParsedContract {
  metadata: ContractMetadata;  // 合同元数据
  clauses: Clause[];           // 条款列表
  rawText: string;             // 原始文本
  extractionConfidence: number; // 提取置信度（0-1）
}
```

**字段说明**：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `metadata` | `ContractMetadata` | 合同元数据 | 见下方详解 |
| `clauses` | `Clause[]` | 所有条款数组 | 见下方详解 |
| `rawText` | `string` | 合同原始文本 | "房屋租赁合同..." |
| `extractionConfidence` | `number` | AI提取置信度 | 0.85（表示85%） |

**使用示例**：
```typescript
import type { ParsedContract } from '@/src/domains/contract-analysis/types/analysis';

function displayContract(contract: ParsedContract) {
  console.log('合同类型:', contract.metadata.contractType);
  console.log('甲方:', contract.metadata.parties.partyA.name);
  console.log('条款数量:', contract.clauses.length);
  console.log('提取质量:', contract.extractionConfidence >= 0.7 ? '良好' : '较低');
}
```

---

#### ContractMetadata（合同元数据）

**用途**：存储合同的基本信息

**结构**：
```typescript
export interface ContractMetadata {
  contractType: '买卖' | '租赁' | '服务' | '劳动' | '加盟' | '其他';
  parties: {
    partyA: Party;
    partyB: Party;
  };
  signDate?: string;      // YYYY-MM-DD
  effectiveDate?: string; // YYYY-MM-DD
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `contractType` | `ContractType` | ✅ | 合同类型 |
| `parties.partyA` | `Party` | ✅ | 甲方信息 |
| `parties.partyB` | `Party` | ✅ | 乙方信息 |
| `signDate` | `string?` | ❌ | 签订日期 |
| `effectiveDate` | `string?` | ❌ | 生效日期 |

**扩展建议**：
```typescript
// 未来可能添加的字段
interface ContractMetadata {
  // ...现有字段

  // v0.2 可能添加
  expirationDate?: string;   // 到期日期
  renewalClause?: boolean;   // 是否有续约条款
  jurisdiction?: string;     // 管辖地

  // v0.3 可能添加
  currency?: string;         // 货币类型
  totalAmount?: number;      // 合同总金额
  attachments?: string[];    // 附件列表
}
```

---

#### Clause（合同条款）

**用途**：表示合同中的单个条款

**结构**：
```typescript
export interface Clause {
  id: string;                // 唯一标识
  title: string;             // 条款标题
  content: string;           // 条款内容
  category: ClauseCategory;  // 条款分类
  position: {                // 在原文中的位置
    start: number;
    end: number;
  };
}
```

**字段说明**：

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | `string` | 条款唯一ID | "clause-1" |
| `title` | `string` | 条款标题 | "第一条 租赁物业" |
| `content` | `string` | 条款完整内容 | "甲方同意将位于..." |
| `category` | `ClauseCategory` | 条款分类 | "交付履行" |
| `position` | `{start, end}` | 文本位置（字符索引） | {start: 100, end: 250} |

**position字段说明**：
- `start`: 条款在原文中的起始字符位置
- `end`: 条款在原文中的结束字符位置
- 用途：在编辑器中高亮显示、跳转定位

**使用示例**：
```typescript
function highlightClause(clause: Clause, editor: Editor) {
  // 使用position定位和高亮
  editor.jumpToPosition(clause.position);
  editor.highlight(clause.position.start, clause.position.end);
}
```

---

#### ClauseCategory（条款分类）

**用途**：标准化的条款分类枚举

**定义**：
```typescript
export type ClauseCategory =
  | '违约责任'    // 违约责任条款
  | '合同终止'    // 合同终止条款
  | '交付履行'    // 交付/履行条款
  | '管辖条款'    // 管辖条款
  | '争议解决'    // 争议解决条款
  | '费用承担'    // 法律费用承担条款
  | '其他';       // 其他条款
```

**分类说明**：

| 分类 | 重要性 | 说明 | 示例关键词 |
|-----|--------|------|----------|
| 违约责任 | ⭐⭐⭐ | 规定违约后果 | "违约"、"赔偿"、"损失" |
| 合同终止 | ⭐⭐⭐ | 合同如何结束 | "解除"、"终止"、"到期" |
| 交付履行 | ⭐⭐⭐ | 履行义务规定 | "交付"、"履行"、"验收" |
| 管辖条款 | ⭐⭐ | 法院管辖规定 | "管辖"、"法院"、"仲裁" |
| 争议解决 | ⭐⭐⭐ | 纠纷解决方式 | "争议"、"仲裁"、"诉讼" |
| 费用承担 | ⭐⭐ | 费用承担规定 | "费用"、"律师费"、"诉讼费" |
| 其他 | ⭐ | 其他类型条款 | - |

**为什么是这6+1类？**
- 基于律师实践经验总结
- 覆盖合同纠纷的核心要素
- 符合普通人的理解习惯
- 便于风险识别和检查

---

#### ESSENTIAL_CLAUSES（核心条款清单）

**用途**：定义合同必须包含的6大核心条款

**定义**：
```typescript
export const ESSENTIAL_CLAUSES = [
  '违约责任条款',
  '合同终止条款',
  '交付/履行条款',
  '管辖条款',
  '争议解决条款',
  '法律费用承担条款',
] as const;
```

**使用场景**：
```typescript
// 检查合同是否包含所有核心条款
function checkEssentialClauses(clauses: Clause[]): ClauseCheckResult[] {
  return ESSENTIAL_CLAUSES.map(essential => {
    const found = clauses.find(c =>
      essential.includes(c.category)
    );

    return {
      clauseName: essential,
      present: !!found,
      importance: 'critical',
    };
  });
}
```

---

#### RiskAnalysisResult（风险分析结果）

**用途**：表示合同的完整风险分析结果

**结构**：
```typescript
export interface RiskAnalysisResult {
  risks: Risk[];                      // 识别的风险列表
  clauseChecks: ClauseCheckResult[];  // 条款检查结果
  overallRiskLevel: 'low' | 'medium' | 'high'; // 整体风险等级
  summary: string;                    // 风险总结
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `risks` | `Risk[]` | 具体风险列表 |
| `clauseChecks` | `ClauseCheckResult[]` | 6大条款检查结果 |
| `overallRiskLevel` | `'low' \| 'medium' \| 'high'` | 整体风险评级 |
| `summary` | `string` | 风险摘要说明 |

**使用示例**：
```typescript
function displayRiskAnalysis(analysis: RiskAnalysisResult) {
  // 显示整体风险
  const riskColor = {
    low: 'green',
    medium: 'yellow',
    high: 'red',
  }[analysis.overallRiskLevel];

  console.log(`整体风险: ${analysis.overallRiskLevel}`, riskColor);

  // 显示具体风险
  analysis.risks.forEach(risk => {
    console.log(`- ${risk.riskType}: ${risk.description}`);
  });

  // 显示条款检查
  analysis.clauseChecks.forEach(check => {
    console.log(`- ${check.clauseName}: ${check.present ? '✅' : '❌'}`);
  });
}
```

---

#### Risk（风险项）

**用途**：表示单个识别出的风险

**结构**：
```typescript
export interface Risk {
  id: string;                        // 风险唯一ID
  text: string;                      // 风险原文摘录
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
  riskType: string;                  // 风险类型
  description: string;               // 风险描述
  legalBasis: string;                // 法律依据
  consequence: string;               // 可能后果
  position?: {                       // 位置（可选）
    start: number;
    end: number;
  };
  suggestion: string;                // 处理建议
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | `string` | ✅ | 唯一标识 |
| `text` | `string` | ✅ | 风险条款原文 |
| `riskLevel` | `'low' \| 'medium' \| 'high'` | ✅ | 风险等级 |
| `riskType` | `string` | ✅ | 风险类型（如"不公平条款"） |
| `description` | `string` | ✅ | 详细描述 |
| `legalBasis` | `string` | ✅ | 法律依据 |
| `consequence` | `string` | ✅ | 可能后果 |
| `position` | `{start, end}?` | ❌ | 在原文中的位置 |
| `suggestion` | `string` | ✅ | 处理建议 |

**风险等级判定**：
- `high`: 严重风险，可能导致重大损失
- `medium`: 中等风险，需要注意但可协商
- `low`: 轻微风险，提醒注意即可

**使用示例**：
```typescript
const risk: Risk = {
  id: 'risk-1',
  text: '甲方有权随时单方面解除本合同',
  riskLevel: 'high',
  riskType: '不公平条款',
  description: '该条款赋予甲方单方解除权，而未给予乙方对等权利',
  legalBasis: '《合同法》第54条 - 显失公平的合同',
  consequence: '甲方可随时终止合同，乙方权益无保障',
  position: { start: 500, end: 530 },
  suggestion: '建议修改为双方对等的解除权，或明确解除条件',
};
```

---

#### ClauseCheckResult（条款检查结果）

**用途**：表示单个核心条款的检查结果

**联合类型定义**：
```typescript
export type ClauseCheckResult = PresentClause | MissingClause;
```

**PresentClause（存在的条款）**：
```typescript
export interface PresentClause {
  clauseName: string;                    // 条款名称
  present: true;                         // 是否存在
  adequacy: 'sufficient' | 'partial';    // 充分性
  importance: 'critical' | 'important';  // 重要性
}
```

**MissingClause（缺失的条款）**：
```typescript
export interface MissingClause {
  clauseName: string;                    // 条款名称
  present: false;                        // 是否存在
  importance: 'critical' | 'important';  // 重要性
  reason: string;                        // 缺失原因
  risk: string;                          // 缺失风险
  suggestion: string;                    // 补充建议
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|-----|------|------|
| `clauseName` | `string` | 条款名称（如"违约责任条款"） |
| `present` | `boolean` | 是否存在（true/false） |
| `adequacy` | `'sufficient' \| 'partial'` | 充分性（仅present=true） |
| `importance` | `'critical' \| 'important'` | 重要性等级 |
| `reason` | `string` | 缺失原因（仅present=false） |
| `risk` | `string` | 缺失风险（仅present=false） |
| `suggestion` | `string` | 补充建议（仅present=false） |

**使用示例**：
```typescript
// 存在但不充分的条款
const partialClause: PresentClause = {
  clauseName: '违约责任条款',
  present: true,
  adequacy: 'partial',  // 存在但不完整
  importance: 'critical',
};

// 完全缺失的条款
const missingClause: MissingClause = {
  clauseName: '争议解决条款',
  present: false,
  importance: 'critical',
  reason: '未找到明确的争议解决条款',
  risk: '发生纠纷时缺乏明确的解决途径',
  suggestion: '建议补充争议解决条款，明确仲裁或诉讼程序',
};

// 类型守卫
function displayClauseCheck(check: ClauseCheckResult) {
  if (check.present) {
    // TypeScript 知道这是 PresentClause
    console.log(`✅ ${check.clauseName}: ${check.adequacy}`);
  } else {
    // TypeScript 知道这是 MissingClause
    console.log(`❌ ${check.clauseName}: ${check.risk}`);
  }
}
```

---

### editor.ts - 编辑器相关类型

#### ContractDocument（合同文档）

**用途**：表示编辑器中的合同文档状态

**结构**：
```typescript
export interface ContractDocument {
  id: string;                // 文档唯一ID
  fileName: string;          // 文件名
  uploadTime: Date;          // 上传时间
  originalText: string;      // 原始文本
  editedText: string;        // 编辑后文本

  // AI分析结果（可选）
  contractType?: string;     // 合同类型
  parties?: {                // 当事人信息
    partyA: Party;
    partyB: Party;
  };
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `id` | `string` | ✅ | 文档ID（如"doc-123456"） |
| `fileName` | `string` | ✅ | 文件名 |
| `uploadTime` | `Date` | ✅ | 上传时间 |
| `originalText` | `string` | ✅ | 原始文本（不可修改） |
| `editedText` | `string` | ✅ | 编辑后文本（可修改） |
| `contractType` | `string?` | ❌ | AI识别的合同类型 |
| `parties` | `object?` | ❌ | AI提取的当事人信息 |

**使用场景**：
- Zustand store 存储
- 编辑器组件状态
- 版本对比（original vs edited）

---

## 🔄 类型关系图

```
ParsedContract (AI解析结果)
  ├── metadata: ContractMetadata (合同元数据)
  │     ├── contractType: ContractType
  │     └── parties: { partyA, partyB }
  ├── clauses: Clause[] (条款列表)
  │     ├── id: string
  │     ├── title: string
  │     ├── content: string
  │     ├── category: ClauseCategory
  │     └── position: {start, end}
  ├── rawText: string
  └── extractionConfidence: number

RiskAnalysisResult (风险分析结果)
  ├── risks: Risk[] (风险列表)
  │     ├── id, text, riskLevel
  │     ├── description, legalBasis
  │     └── suggestion
  ├── clauseChecks: ClauseCheckResult[] (条款检查)
  │     ├── PresentClause (存在)
  │     └── MissingClause (缺失)
  ├── overallRiskLevel: 'low' | 'medium' | 'high'
  └── summary: string

ContractDocument (编辑器文档)
  ├── id, fileName, uploadTime
  ├── originalText, editedText
  └── contractType?, parties? (AI结果)
```

---

## 🛠️ 类型使用指南

### 1. 在服务层使用

```typescript
// services/ContractParsingService.ts
import type { ParsedContract, Clause } from '../types/analysis';

export class ContractParsingService {
  async parseContract(text: string): Promise<ParsedContract> {
    // 返回类型自动检查
    return {
      metadata: { ... },
      clauses: [ ... ],
      rawText: text,
      extractionConfidence: 0.85,
    };
  }
}
```

### 2. 在API层使用

```typescript
// app/api/contract/analyze/route.ts
import type { ParsedContract } from '@/src/domains/contract-analysis/types/analysis';

export async function POST(req: NextRequest) {
  const result: ParsedContract = await parsingService.parseContract(text);

  return NextResponse.json({
    success: true,
    data: {
      contract: result, // 类型安全
    },
  });
}
```

### 3. 在UI组件使用

```typescript
// components/contract/ContractEditor.tsx
import type { Risk, ClauseCheckResult } from '@/src/domains/contract-analysis/types/analysis';

interface Props {
  risks: Risk[];
  clauseChecks: ClauseCheckResult[];
}

export function RiskPanel({ risks, clauseChecks }: Props) {
  // 类型安全的使用
  risks.forEach(risk => {
    console.log(risk.riskLevel); // TypeScript 自动补全
  });
}
```

### 4. 在状态管理使用

```typescript
// stores/contractEditorStore.ts
import type { ContractDocument, Risk } from '../types/analysis';
import type { ContractDocument } from '../types/editor';

interface ContractEditorState {
  document: ContractDocument | null;
  risks: Risk[];
  isAnalyzing: boolean;
}

export const useContractEditorStore = create<ContractEditorState>((set) => ({
  document: null,
  risks: [],
  isAnalyzing: false,
  // ...
}));
```

---

## 📝 类型扩展指南

### 添加新字段

**步骤**：
1. 在类型定义文件中添加新字段
2. 标记为可选（`?`）以保持向后兼容
3. 更新相关服务的实现
4. 更新测试用例
5. 更新文档

**示例**：
```typescript
// 在 ContractMetadata 中添加新字段
export interface ContractMetadata {
  contractType: ContractType;
  parties: { ... };
  signDate?: string;
  effectiveDate?: string;

  // v0.2 新增字段
  expirationDate?: string;  // 到期日期
  renewalClause?: boolean;  // 是否有续约条款
}
```

### 添加新类型

**步骤**：
1. 在合适的文件中定义新类型
2. 导出类型供其他模块使用
3. 更新本README的类型说明
4. 添加使用示例

**示例**：
```typescript
// types/analysis.ts

/**
 * 协商建议
 */
export interface NegotiationAdvice {
  riskId: string;           // 关联的风险ID
  strategy: string;         // 协商策略
  script: {                 // 协商话术
    opening: string;
    concern: string;
    request: string;
    legalBasis: string;
    fallback: string;
  };
  priority: 'high' | 'medium' | 'low'; // 优先级
}
```

### 类型重命名或废弃

**步骤**：
1. 创建新类型
2. 标记旧类型为 `@deprecated`
3. 逐步迁移代码
4. 几个版本后删除旧类型
5. 更新文档

**示例**：
```typescript
/**
 * @deprecated 使用 ParsedContract 代替
 */
export type ContractAnalysisResult = ParsedContract;

// 迁移代码
// 旧：function analyze(): ContractAnalysisResult
// 新：function analyze(): ParsedContract
```

---

## 🔒 类型安全最佳实践

### 1. 始终使用类型注解

```typescript
// ❌ 错误：类型隐式推导
function processContract(contract) {
  // ...
}

// ✅ 正确：显式类型注解
function processContract(contract: ParsedContract): RiskAnalysisResult {
  // ...
}
```

### 2. 避免使用 `any`

```typescript
// ❌ 错误
function handleData(data: any) {
  // ...
}

// ✅ 正确
function handleData(data: unknown) {
  // 使用类型守卫
  if (isRisk(data)) {
    // TypeScript 知道 data 是 Risk 类型
  }
}
```

### 3. 使用类型守卫

```typescript
// 类型守卫函数
function isRisk(value: unknown): value is Risk {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'riskLevel' in value
  );
}

// 使用
if (isRisk(data)) {
  console.log(data.riskLevel); // 类型安全
}
```

### 4. 使用联合类型的判别式

```typescript
// ClauseCheckResult 使用 present 作为判别式
function handle(check: ClauseCheckResult) {
  if (check.present) {
    // TypeScript 自动推断为 PresentClause
    console.log(check.adequacy);
  } else {
    // TypeScript 自动推断为 MissingClause
    console.log(check.reason);
  }
}
```

---

## 🧪 类型测试

### 使用 TypeScript 类型测试

```typescript
// types/__tests__/analysis.test-d.ts (类型测试)
import { expectType } from 'tsd';
import type { ParsedContract, Risk, ClauseCheckResult } from '../analysis';

// 测试类型推导
const contract: ParsedContract = {
  metadata: {
    contractType: '买卖',
    parties: {
      partyA: { name: '甲方', role: '甲方' },
      partyB: { name: '乙方', role: '乙方' },
    },
  },
  clauses: [],
  rawText: '',
  extractionConfidence: 0.8,
};

expectType<ParsedContract>(contract);

// 测试联合类型
const presentClause: ClauseCheckResult = {
  clauseName: '违约责任条款',
  present: true,
  adequacy: 'sufficient',
  importance: 'critical',
};

expectType<ClauseCheckResult>(presentClause);
```

---

## 📚 相关文档

- [主README](../README.md) - 领域总览
- [服务层README](../services/README.md) - 服务实现
- [状态管理README](../stores/README.md) - 状态管理（计划）
- [API文档](../../../../app/api/contract/README.md) - API接口

---

## 🔮 未来规划

### v0.2 计划新增类型

```typescript
// 协商建议类型
export interface NegotiationAdvice {
  riskId: string;
  strategy: string;
  script: NegotiationScript;
  priority: 'high' | 'medium' | 'low';
}

// 合同比较结果
export interface ContractComparison {
  original: ParsedContract;
  modified: ParsedContract;
  changes: ContractChange[];
  riskDelta: RiskDelta;
}

// 条款模板
export interface ClauseTemplate {
  id: string;
  category: ClauseCategory;
  title: string;
  template: string;
  variables: TemplateVariable[];
}
```

---

**最后更新**: 2025-10-21
**版本**: v0.1.0
**状态**: 🟢 Active Development
