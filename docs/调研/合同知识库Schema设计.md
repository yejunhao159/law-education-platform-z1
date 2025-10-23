# 合同知识库Schema设计文档

> **设计日期**：2025-10-23
> **版本**：v1.0
> **设计者**：Sean（PromptX矛盾论分析）
> **状态**：已确认，待实施

---

## 一、设计原则

1. **复用现有类型**：最大化利用现有的 `ParsedContract`、`Clause` 等类型定义
2. **面向检索**：Schema支持高效的相似度检索和多维度过滤
3. **可扩展**：未来可增加字段，不破坏现有数据
4. **实用主义**：只存必要信息，避免过度设计

---

## 二、四层知识库架构

```
知识库系统
├── 📄 Layer 1: 合同文档层 (Contract Documents)
│   - 存储：完整合同的向量和元数据
│   - 用途：检索相似合同案例
│   - 数量：350份（初期）
│
├── 📝 Layer 2: 条款片段层 (Clause Fragments)
│   - 存储：单个条款的向量和分类
│   - 用途：精确的条款分类和匹配
│   - 数量：约2100条
│
├── 📚 Layer 3: 法律术语层 (Legal Terms Dictionary)
│   - 存储：结构化的术语定义和关系
│   - 用途：术语识别和关键词匹配
│   - 数量：500个术语
│
└── ⚠️ Layer 4: 风险案例层 (Risk Cases)
    - 存储：真实判例中的风险条款
    - 用途：风险识别和警示
    - 数量：50个案例
```

---

## 三、Layer 1: 合同文档层 Schema

### 3.1 数据结构定义

```typescript
/**
 * 知识库中的合同文档
 * 对应 Vector DB 中的一个 Document
 */
interface KBContractDocument {
  // ========== 基础标识 ==========
  id: string;                    // 唯一ID，如：kb_contract_sale_20250101_001
  version: string;               // Schema版本，如：1.0.0（便于未来迁移）

  // ========== 向量数据 ==========
  embedding: number[];           // 1536维向量（OpenAI text-embedding-3-small）
  embeddingModel: string;        // 'text-embedding-3-small'
  embeddedText: string;          // 实际向量化的文本（可能是摘要）

  // ========== 原始数据 ==========
  rawText: string;               // 合同完整文本
  parsedContract: ParsedContract; // 现有的解析结果（完整保留）

  // ========== 核心元数据（用于检索过滤） ==========
  metadata: {
    // --- 合同分类 ---
    contractType: ParsedContract['metadata']['contractType']; // 复用现有类型
    subType?: string;            // 子类型，如 "房屋买卖"、"车辆买卖"
    industry?: string;           // 行业，如 "房地产"、"互联网"、"制造业"

    // --- 当事人信息 ---
    partyA: {
      name: string;              // 甲方名称
      type: 'individual' | 'company'; // 个人/公司
    };
    partyB: {
      name: string;
      type: 'individual' | 'company';
    };

    // --- 时间信息 ---
    signDate?: string;           // 签订日期 YYYY-MM-DD
    effectiveDate?: string;      // 生效日期
    year?: number;               // 签订年份（用于过滤）

    // --- 地域信息 ---
    region?: string;             // 适用地区，如 "全国"、"北京"、"上海"
    jurisdiction?: string;       // 管辖法院/仲裁地

    // --- 数据来源 ---
    source: {
      type: 'official' | 'faxin' | 'court_case' | 'user_contributed';
      url?: string;              // 来源URL
      provider: string;          // 如 "国家市场监管总局"
      license?: string;          // 授权协议
      downloadDate: string;      // 下载日期
    };

    // --- 质量评分 ---
    quality: {
      score: number;             // 0-1，综合质量评分
      extractionConfidence: number; // 解析置信度
      completenessScore: number; // 条款完整度（0-100）
      isVerified: boolean;       // 是否人工审核
      verifiedBy?: string;       // 审核人
      verifiedAt?: string;       // 审核时间
    };

    // --- 内容统计 ---
    stats: {
      clauseCount: number;       // 条款数量
      wordCount: number;         // 字数
      hasRisks: boolean;         // 是否包含已知风险
      riskCount: number;         // 风险数量
      missingEssentialClauses: string[]; // 缺失的必备条款
    };

    // --- 标签和分类 ---
    tags: string[];              // 自定义标签，如 ["示范文本", "高质量", "无风险"]
    category: 'template' | 'real_case' | 'problematic'; // 合同性质

    // --- 系统元数据 ---
    createdAt: string;           // 入库时间
    updatedAt: string;           // 更新时间
    accessCount: number;         // 被检索次数（用于推荐热门合同）
    lastAccessedAt?: string;     // 最后访问时间
  };
}
```

### 3.2 embeddedText 生成策略

```typescript
/**
 * 生成用于向量化的文本摘要
 * 原因：完整合同可能很长（10000+字），全文向量化成本高且语义不聚焦
 */
function generateEmbeddedText(contract: ParsedContract): string {
  // 策略：合同摘要（前500字 + 关键条款）
  const intro = contract.rawText.substring(0, 500);

  const keyClauses = contract.clauses
    .filter(c => ['违约责任', '合同终止', '争议解决'].includes(c.category))
    .map(c => c.content.substring(0, 100))
    .join('\n');

  return `${intro}\n${keyClauses}`;
}
```

### 3.3 设计决策说明

#### 为什么存完整的 parsedContract？

**矛盾**：
- 存完整数据 → 占空间大
- 只存摘要 → 检索到后还要重新解析

**解决**：
- 存完整数据（JSON格式）
- 好处：检索到后直接使用，不需要重新调用LLM
- 成本：350份 × 10KB ≈ 3.5MB（可接受）

#### 为什么需要这么多元数据字段？

**原因**：支持**混合检索**（语义 + 过滤）

```typescript
// 场景1：纯语义检索
searchSimilar(embedding)

// 场景2：过滤 + 语义检索
searchSimilar(embedding, {
  contractType: '买卖',
  year: 2024,
  quality: { min: 0.8 }
})

// 场景3：多条件组合
searchSimilar(embedding, {
  contractType: '买卖',
  industry: '房地产',
  region: '北京',
  hasRisks: false
})
```

---

## 四、Layer 2: 条款片段层 Schema

### 4.1 为什么需要条款层？

**问题**：合同级检索粒度太粗

**对比**：
- 用户问："违约金条款怎么写？"
- 合同级检索：返回整份合同（信息过载）
- 条款级检索：直接返回3个优秀的违约金条款（精准）

### 4.2 数据结构定义

```typescript
/**
 * 知识库中的条款文档
 */
interface KBClauseDocument {
  // ========== 基础标识 ==========
  id: string;                    // kb_clause_contract001_clause003
  contractId: string;            // 所属合同ID

  // ========== 向量数据 ==========
  embedding: number[];           // 1536维向量
  embeddingModel: string;        // 'text-embedding-3-small'

  // ========== 原始数据 ==========
  clause: Clause;                // 复用现有的Clause类型

  // ========== 元数据 ==========
  metadata: {
    // --- 条款属性 ---
    category: ClauseCategory;    // 条款分类
    title: string;               // 条款标题
    isEssential: boolean;        // 是否必备条款
    length: number;              // 字数

    // --- 所属合同信息（冗余存储，便于过滤） ---
    contractType: string;
    contractIndustry?: string;
    contractSource: string;

    // --- 质量评估 ---
    quality: {
      score: number;             // 条款质量 0-1
      isStandard: boolean;       // 是否标准条款（来自官方示范）
      hasRisk: boolean;          // 是否有风险
      riskLevel?: 'critical' | 'medium' | 'low';
    };

    // --- 法律关联 ---
    legalBasis?: string[];       // 相关法条，如 ["民法典第497条"]
    precedents?: string[];       // 相关判例编号

    // --- 标签 ---
    tags: string[];              // 如 ["标准条款", "无风险", "推荐使用"]

    // --- 统计 ---
    usageCount: number;          // 被引用次数
    recommendScore: number;      // 推荐分数（综合质量和使用次数）

    // --- 时间 ---
    createdAt: string;
    updatedAt: string;
  };
}
```

### 4.3 条款检索示例

```typescript
/**
 * 根据用户输入的条款，找相似的高质量条款
 */
async function findSimilarClauses(userClause: string) {
  const embedding = await embed(userClause);

  return await searchClauses(embedding, {
    category: detectCategory(userClause),  // 自动检测分类
    contractType: '买卖',
    quality: { min: 0.8 },                // 高质量
    isStandard: true,                     // 标准条款
    hasRisk: false,                       // 无风险
    topK: 5
  });
}
```

---

## 五、Layer 3: 法律术语层 Schema

### 5.1 设计说明

**重要**：这一层**不使用向量检索**，使用**结构化存储**（PostgreSQL/JSON）

### 5.2 数据结构定义

```typescript
/**
 * 法律术语词典
 */
interface LegalTerm {
  // ========== 基础信息 ==========
  id: string;                    // term_bkjl_001
  term: string;                  // "不可抗力"
  aliases: string[];             // 同义词 ["force majeure", "不可抗拒"]

  // ========== 定义 ==========
  definition: string;            // 法律定义
  laypersonDefinition: string;   // 通俗解释

  // ========== 法律依据 ==========
  legalBasis: {
    law: string;                 // "民法典"
    article: string;             // "第180条"
    content: string;             // 条文内容
  }[];

  // ========== 使用场景 ==========
  relatedClauses: ClauseCategory[]; // 常见于哪些条款
  typicalWording: string[];      // 典型表述

  // ========== 风险提示 ==========
  risks: {
    type: string;                // 风险类型
    description: string;         // 风险描述
    avoidance: string;           // 规避建议
  }[];

  // ========== 关联信息 ==========
  relatedTerms: string[];        // 相关术语ID
  oppositeTerms: string[];       // 对立术语

  // ========== 元数据 ==========
  category: '实体法' | '程序法' | '合同特有';
  frequency: number;             // 出现频率（从数据中统计）
  importance: 'high' | 'medium' | 'low';

  // ========== 使用示例 ==========
  examples: {
    contractId: string;
    clauseId: string;
    context: string;             // 上下文片段
  }[];

  // ========== 时间 ==========
  createdAt: string;
  updatedAt: string;
}
```

### 5.3 术语匹配逻辑

```typescript
/**
 * 识别文本中的法律术语
 */
function extractLegalTerms(text: string, termDictionary: LegalTerm[]): LegalTerm[] {
  const foundTerms: LegalTerm[] = [];

  for (const term of termDictionary) {
    // 1. 精确匹配
    if (text.includes(term.term)) {
      foundTerms.push(term);
      continue;
    }

    // 2. 同义词匹配
    for (const alias of term.aliases) {
      if (text.includes(alias)) {
        foundTerms.push(term);
        break;
      }
    }
  }

  return foundTerms;
}
```

---

## 六、Layer 4: 风险案例层 Schema

### 6.1 数据来源

真实判例中败诉的案例，从人民法院案例库提取

### 6.2 数据结构定义

```typescript
/**
 * 风险案例
 */
interface RiskCase {
  // ========== 基础信息 ==========
  id: string;                    // risk_case_001
  caseNumber: string;            // 案号，如 "(2023)京01民终1234号"

  // ========== 案例概述 ==========
  summary: string;               // 案例摘要（200字）
  plaintiff: string;             // 原告
  defendant: string;             // 被告
  court: string;                 // 审理法院
  judgmentDate: string;          // 判决日期

  // ========== 风险条款 ==========
  problematicClause: {
    content: string;             // 问题条款原文
    category: ClauseCategory;
    riskType: Risk['riskType'];  // 复用现有类型
    riskLevel: Risk['riskLevel'];
  };

  // ========== 判决结果 ==========
  judgment: {
    result: '原告胜' | '被告胜' | '部分胜诉';
    reason: string;              // 判决理由（重点）
    legalBasis: string[];        // 引用的法条
    compensation?: number;       // 赔偿金额（如果有）
  };

  // ========== 风险分析 ==========
  riskAnalysis: {
    why: string;                 // 为什么这个条款有风险
    consequence: string;         // 导致了什么后果
    howToAvoid: string;          // 如何规避
    betterWording: string;       // 更好的表述
  };

  // ========== 关联信息 ==========
  relatedTerms: string[];        // 涉及的法律术语
  similarCases: string[];        // 类似案例ID

  // ========== 向量（用于检索） ==========
  embedding: number[];           // 条款内容的向量
  embeddingModel: string;

  // ========== 元数据 ==========
  metadata: {
    contractType: string;
    industry?: string;
    severity: number;            // 严重程度 0-1
    frequency: number;           // 常见程度 0-1
    tags: string[];
    source: {
      url: string;               // 判决书URL
      reliability: number;       // 可靠性 0-1
    };
  };

  createdAt: string;
  updatedAt: string;
}
```

### 6.3 风险检索逻辑

```typescript
/**
 * 根据条款内容检索相关风险案例
 */
async function checkClauseRisk(clause: Clause, contractType: string): Promise<RiskCase[]> {
  const embedding = await embed(clause.content);

  return await searchRiskCases(embedding, {
    category: clause.category,
    contractType: contractType,
    severity: { min: 0.6 },      // 只看中高风险
    topK: 3
  });
}
```

---

## 七、数据规模估算

### 7.1 初期数据量（MVP阶段）

```
📄 合同文档层：350份
├── 买卖合同：70份
├── 租赁合同：70份
├── 服务合同：105份
├── 劳动合同：70份
└── 其他：35份

📝 条款片段层：约2100条
└── 350份 × 平均6条关键条款/份 = 2100条

📚 法律术语层：500个
└── 从THUOCL + 人工整理核心术语

⚠️ 风险案例层：50个
└── 从人民法院案例库提取真实败诉案例
```

### 7.2 存储空间估算

```
合同文档层：
- 文本数据：350份 × 10KB = 3.5MB
- 向量数据：350份 × 1536维 × 4字节 = 2.1MB
- 小计：约 6MB

条款片段层：
- 文本数据：2100条 × 2KB = 4.2MB
- 向量数据：2100条 × 1536维 × 4字节 = 12.6MB
- 小计：约 17MB

法律术语层：
- 结构化数据：500个 × 2KB = 1MB

风险案例层：
- 50个 × 5KB = 0.25MB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总计：约 25MB（非常小！）
```

**结论**：存储空间完全不是问题，可以全部加载到内存。

---

## 八、检索策略设计

### 8.1 混合检索策略

```typescript
/**
 * 三阶段检索策略
 */
async function hybridSearch(query: string, filters: SearchFilters) {
  // 阶段1：向量语义检索（召回）
  const embedding = await embed(query);
  const semanticResults = await vectorSearch(embedding, { topK: 20 });

  // 阶段2：元数据过滤（精准）
  const filteredResults = semanticResults.filter(result =>
    matchFilters(result.metadata, filters)
  );

  // 阶段3：重排序（优化）
  const reranked = rerank(filteredResults, {
    weights: {
      similarity: 0.6,      // 语义相似度权重
      quality: 0.3,         // 质量分数权重
      recency: 0.1          // 时间新近性权重
    }
  });

  return reranked.slice(0, filters.topK || 5);
}
```

### 8.2 多层级检索组合

```typescript
/**
 * 根据查询类型选择检索层级
 */
function selectSearchLayer(queryType: 'contract' | 'clause' | 'term' | 'risk') {
  switch (queryType) {
    case 'contract':
      return searchContractLayer();    // Layer 1
    case 'clause':
      return searchClauseLayer();      // Layer 2
    case 'term':
      return searchTermLayer();        // Layer 3 (非向量)
    case 'risk':
      return searchRiskLayer();        // Layer 4
  }
}
```

---

## 九、数据质量保障

### 9.1 质量评分算法

```typescript
/**
 * 计算合同质量分数
 */
function calculateQualityScore(contract: ParsedContract): number {
  let score = 0;

  // 1. 解析置信度（40%权重）
  score += contract.extractionConfidence * 0.4;

  // 2. 条款完整度（30%权重）
  const completeness = contract.clauses.length / 10; // 假设理想10条
  score += Math.min(completeness, 1) * 0.3;

  // 3. 必备条款检查（20%权重）
  const hasEssential = ESSENTIAL_CLAUSES.every(ec =>
    contract.clauses.some(c => matchesEssentialClause(c, ec))
  );
  score += (hasEssential ? 1 : 0.5) * 0.2;

  // 4. 数据来源可靠性（10%权重）
  const sourceReliability = {
    'official': 1.0,
    'faxin': 0.9,
    'court_case': 0.95,
    'user_contributed': 0.6
  };
  score += sourceReliability[contract.source.type] * 0.1;

  return Math.min(score, 1);
}
```

### 9.2 人工审核标准

**必须审核的情况**：
- ✅ 质量分数 < 0.7
- ✅ 来源为 user_contributed
- ✅ 包含风险条款
- ✅ 随机抽样（10%）

**审核检查项**：
1. 条款分类是否准确
2. 必备条款是否完整
3. 风险识别是否正确
4. 文本是否清晰可读

---

## 十、实施路线

### 阶段1：Schema实现（1周）

```typescript
// 1. 定义TypeScript类型
// 位置：src/domains/contract-analysis/types/knowledge-base.ts

// 2. 实现数据导入脚本
// 位置：scripts/import-knowledge-base.ts

// 3. 实现质量评分
// 位置：src/infrastructure/knowledge-base/services/QualityScorer.ts
```

### 阶段2：数据采集（2-3周）

- [ ] 下载官方合同350份
- [ ] 清洗和格式化
- [ ] 人工审核样本
- [ ] 导入知识库

### 阶段3：检索优化（1-2周）

- [ ] 实现混合检索
- [ ] 调优检索参数
- [ ] A/B测试效果

---

## 十一、附录

### 附录A：复用的现有类型

```typescript
// src/domains/contract-analysis/types/analysis.ts
- ParsedContract
- Clause
- ClauseCategory
- Risk
- ESSENTIAL_CLAUSES
```

### 附录B：新增类型清单

```typescript
// 需要新建的类型文件
src/domains/contract-analysis/types/knowledge-base.ts
├── KBContractDocument
├── KBClauseDocument
├── LegalTerm
└── RiskCase
```

### 附录C：技术栈

- **向量数据库**：ChromaDB
- **Embedding模型**：OpenAI text-embedding-3-small
- **结构化存储**：PostgreSQL (术语层)
- **编程语言**：TypeScript

---

**文档版本**：v1.0
**最后更新**：2025-10-23
**审核状态**：已确认
**下一步**：数据源采集方案设计
