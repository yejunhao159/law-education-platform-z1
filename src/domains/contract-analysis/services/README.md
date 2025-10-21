# Contract Analysis Services (合同分析服务层)

## 📋 服务层概述

服务层是合同分析领域的**业务逻辑核心**，负责将合同文本转化为结构化的、可理解的数据。

**核心职责**：
- 📄 合同文本解析（文本 → 结构化数据）
- 🔍 风险识别与分析（规则引擎 + AI）
- ⚖️ 条款检查与验证（6大核心条款）
- 💡 协商建议生成（基于分析结果）

**设计原则**：
- 单一职责：每个服务只做一件事
- 依赖倒置：依赖抽象（AICallProxy）而非具体实现
- 可测试性：纯函数逻辑，易于单元测试
- 可扩展性：新增服务不影响现有服务

---

## 🗂️ 当前服务清单

### ✅ 已实现（v0.1）

#### ContractParsingService.ts
**职责**：将合同文本解析为结构化的 ParsedContract 对象

**核心功能**：
- 识别合同类型（买卖/租赁/服务/劳动/加盟/其他）
- 提取双方当事人信息（甲方、乙方）
- 提取所有条款（标题、内容、分类）
- 提取签订日期、生效日期
- 计算提取置信度（extraction confidence）

**技术实现**：
- 使用 `callUnifiedAI` 进行AI解析
- 低温度（0.3）保证准确性
- JSON格式输出（强制 responseFormat: 'json'）
- 兜底机制：AI失败时返回基础结构

**使用示例**：
```typescript
import { ContractParsingService } from './ContractParsingService';

const service = new ContractParsingService();
const result = await service.parseContract(contractText);

console.log('合同类型:', result.metadata.contractType);
console.log('甲方:', result.metadata.parties.partyA.name);
console.log('条款数量:', result.clauses.length);
console.log('置信度:', result.extractionConfidence);
```

**性能指标**：
- 解析时间：3-5秒（1000字合同）
- Token消耗：2000-3000 tokens
- 成本：¥0.002-0.003（DeepSeek）
- 准确率：70-85%（基于extractionConfidence）

**输入**：
```typescript
contractText: string  // 合同纯文本内容
```

**输出**：
```typescript
ParsedContract {
  metadata: {
    contractType: '买卖' | '租赁' | '服务' | '劳动' | '加盟' | '其他';
    parties: {
      partyA: { name: string, role: '甲方' | '乙方' };
      partyB: { name: string, role: '甲方' | '乙方' };
    };
    signDate?: string;      // YYYY-MM-DD
    effectiveDate?: string; // YYYY-MM-DD
  };
  clauses: Clause[];        // 条款数组
  rawText: string;          // 原始文本
  extractionConfidence: number; // 0-1
}
```

**错误处理**：
- AI调用失败 → 返回兜底结构（extractionConfidence: 0.3）
- JSON解析失败 → 自动清理markdown标记后重试
- 数据验证失败 → 使用默认值补全

**已知限制**：
- 仅支持中文合同
- 超长合同（>50000字）会被截断
- 非标准格式合同准确率较低

---

### 🚧 规划中（v0.2）

#### ContractRuleEngine.ts
**职责**：基于规则的合同条款检查引擎

**规划功能**：
- 检查6大核心条款是否存在
- 验证条款的完整性和充分性
- 识别缺失的重要条款
- 生成条款检查报告

**技术方案**：
```typescript
export class ContractRuleEngine {
  /**
   * 检查合同是否包含所有核心条款
   */
  async checkEssentialClauses(
    clauses: Clause[]
  ): Promise<ClauseCheckResult[]> {
    // 规则引擎逻辑
    // 1. 遍历6大核心条款
    // 2. 检查每个条款是否存在
    // 3. 评估条款的充分性
    // 4. 返回检查结果
  }

  /**
   * 检查单个条款的完整性
   */
  private checkClauseAdequacy(
    clauseName: string,
    clauses: Clause[]
  ): 'sufficient' | 'partial' | 'missing' {
    // 规则匹配逻辑
  }
}
```

**使用场景**：
- 合同分析的第二步（解析后检查）
- 为用户生成条款检查清单
- 辅助风险识别

---

#### RiskIdentificationService.ts
**职责**：深度风险识别服务（AI + 规则引擎）

**规划功能**：
- 识别潜在的法律风险
- 分析不公平条款
- 检测违法条款
- 评估风险等级（低/中/高）
- 生成风险报告和建议

**技术方案**：
```typescript
export class RiskIdentificationService {
  constructor(
    private ruleEngine: ContractRuleEngine,
    private aiAnalyzer: ContractParsingService
  ) {}

  /**
   * 综合风险识别（规则 + AI）
   */
  async identifyRisks(
    parsedContract: ParsedContract
  ): Promise<Risk[]> {
    // 1. 规则引擎快速筛查
    const ruleBasedRisks = await this.ruleEngine.detectRisks(
      parsedContract.clauses
    );

    // 2. AI深度分析（只对疑似风险进行）
    const aiEnhancedRisks = await this.enhanceRisksWithAI(
      ruleBasedRisks
    );

    // 3. 合并和去重
    return this.mergeAndRankRisks(
      ruleBasedRisks,
      aiEnhancedRisks
    );
  }

  /**
   * 规则引擎风险检测（快速、低成本）
   */
  private async detectRisksByRules(
    clauses: Clause[]
  ): Promise<Risk[]> {
    // 规则库匹配
    // 例如：检测"甲方单方解除"、"乙方承担全部责任"等模式
  }

  /**
   * AI增强分析（深度、高成本）
   */
  private async enhanceRisksWithAI(
    suspectedRisks: Risk[]
  ): Promise<Risk[]> {
    // 只对疑似风险调用AI，降低成本
    // AI提供更详细的风险描述、法律依据、后果分析
  }
}
```

**使用场景**：
- 合同分析的第三步（检查后识别风险）
- 生成风险高亮标注
- 为协商建议提供依据

**成本优化**：
- 规则引擎优先（免费、快速）
- AI只用于深度分析（疑似风险）
- 智能缓存（相似条款复用结果）

---

#### NegotiationAdvisorService.ts
**职责**：协商策略和话术生成服务

**规划功能**：
- 基于风险生成协商策略
- 生成具体的谈判话术
- 提供法律依据和案例支持
- 模拟对方可能的反驳

**技术方案**：
```typescript
export class NegotiationAdvisorService {
  /**
   * 生成协商建议
   */
  async generateNegotiationAdvice(
    risks: Risk[],
    contractType: string
  ): Promise<NegotiationAdvice[]> {
    // 1. 按风险等级排序
    // 2. 为每个风险生成协商策略
    // 3. 提供具体的修改建议和话术
    // 4. 给出法律依据
  }

  /**
   * 生成具体话术
   */
  private generateScript(
    risk: Risk
  ): {
    opening: string;       // 开场白
    concern: string;       // 关切点
    request: string;       // 具体请求
    legalBasis: string;    // 法律依据
    fallback: string;      // 退让方案
  } {
    // 话术模板 + AI生成
  }
}
```

**使用场景**：
- 风险识别后的第四步
- 帮助普通人准备谈判
- 教育用户如何维护权益

---

## 🏗️ 服务架构设计

### 分层架构

```
┌─────────────────────────────────────┐
│  API Layer (app/api/contract/)      │  ← 接收HTTP请求
├─────────────────────────────────────┤
│  Service Layer (services/)          │  ← 业务逻辑层 ⭐
│  ├── ContractParsingService         │
│  ├── ContractRuleEngine (计划)      │
│  ├── RiskIdentificationService (计划)│
│  └── NegotiationAdvisorService (计划)│
├─────────────────────────────────────┤
│  Infrastructure Layer               │
│  ├── AICallProxy                    │  ← 统一AI调用
│  └── AI_DEFAULTS                    │  ← 配置管理
└─────────────────────────────────────┘
```

### 服务调用链

```
用户上传合同文本
    ↓
API Layer (/api/contract/analyze)
    ↓
┌─────────────────────────────────────┐
│ Step 1: 合同解析                     │
│ ContractParsingService.parseContract()
│ → 输出: ParsedContract
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Step 2: 条款检查 (v0.2)              │
│ ContractRuleEngine.checkEssentialClauses()
│ → 输出: ClauseCheckResult[]
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Step 3: 风险识别 (v0.2)              │
│ RiskIdentificationService.identifyRisks()
│ → 输出: Risk[]
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Step 4: 协商建议 (v0.3)              │
│ NegotiationAdvisorService.generateNegotiationAdvice()
│ → 输出: NegotiationAdvice[]
└─────────────────────────────────────┘
    ↓
返回完整分析结果
```

### 依赖关系

```
ContractParsingService
  ↓ 依赖
AICallProxy (统一AI调用)
  ↓ 依赖
AI_DEFAULTS (配置)

ContractRuleEngine
  ↓ 依赖
（无外部依赖，纯规则引擎）

RiskIdentificationService
  ↓ 依赖
ContractRuleEngine + ContractParsingService

NegotiationAdvisorService
  ↓ 依赖
RiskIdentificationService
```

**设计原则**：
- ✅ 高内聚：每个服务职责单一
- ✅ 低耦合：服务间依赖最小化
- ✅ 可测试：纯函数逻辑，易于mock
- ✅ 可扩展：新增服务不影响现有服务

---

## 📐 开发新服务的指南

### 步骤1：定义服务职责

明确回答以下问题：
1. 这个服务**只**做什么？（单一职责）
2. 它的输入和输出是什么？（类型定义）
3. 它依赖哪些其他服务？（依赖关系）
4. 它的性能指标是什么？（时间、成本）

### 步骤2：创建服务文件

```typescript
/**
 * [服务名称]
 * 职责：[一句话描述]
 */

import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';
import type { InputType, OutputType } from '../types/analysis';

/**
 * [服务类名]
 */
export class YourService {
  /**
   * 核心方法
   * @param input 输入描述
   * @returns 输出描述
   */
  async yourMethod(input: InputType): Promise<OutputType> {
    console.log('🔍 开始处理...');

    try {
      // 1. 参数验证

      // 2. 核心逻辑

      // 3. 返回结果

      console.log('✅ 处理完成');
      return result;
    } catch (error) {
      console.error('❌ 处理失败:', error);
      throw error;
    }
  }

  /**
   * 私有辅助方法
   */
  private helperMethod() {
    // ...
  }
}
```

### 步骤3：定义输入输出类型

在 `types/analysis.ts` 中添加：

```typescript
/**
 * 服务输入类型
 */
export interface YourServiceInput {
  field1: string;
  field2: number;
}

/**
 * 服务输出类型
 */
export interface YourServiceOutput {
  result: string;
  confidence: number;
}
```

### 步骤4：编写单元测试

在 `services/__tests__/` 中创建测试：

```typescript
import { YourService } from '../YourService';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService();
  });

  it('should handle valid input', async () => {
    const input = { field1: 'test', field2: 123 };
    const result = await service.yourMethod(input);

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should handle invalid input', async () => {
    const input = { field1: '', field2: -1 };

    await expect(service.yourMethod(input)).rejects.toThrow();
  });
});
```

### 步骤5：集成到API

在 `app/api/contract/analyze/route.ts` 中集成：

```typescript
import { YourService } from '@/src/domains/contract-analysis/services/YourService';

export async function POST(req: NextRequest) {
  // ...

  // 调用新服务
  const yourService = new YourService();
  const yourResult = await yourService.yourMethod(input);

  // 返回结果
  return NextResponse.json({
    success: true,
    data: {
      // ... 其他数据
      yourResult,
    },
  });
}
```

### 步骤6：更新文档

1. 在本README中添加服务说明
2. 在类型定义README中添加类型说明
3. 在主README中更新功能清单

---

## 🧪 测试策略

### 单元测试

**测试重点**：
- 输入验证逻辑
- 数据转换逻辑
- 错误处理逻辑
- 兜底机制

**Mock策略**：
- Mock `callUnifiedAI`（避免真实AI调用）
- Mock 外部依赖（如其他服务）
- 使用测试数据而非真实合同

**示例**：
```typescript
jest.mock('@/src/infrastructure/ai/AICallProxy', () => ({
  callUnifiedAI: jest.fn().mockResolvedValue({
    content: '{"metadata": {...}}',
    tokensUsed: 2000,
    cost: 0.002,
  }),
}));
```

### 集成测试

**测试重点**：
- 服务间协作
- 完整的分析流程
- 实际AI调用效果

**测试用例**：
- 标准合同分析流程
- 边界情况处理
- 性能基准测试

---

## 🚀 性能优化

### 当前性能指标（v0.1）

| 指标 | 数值 | 说明 |
|-----|------|------|
| 解析时间 | 3-5秒 | 1000字合同 |
| Token消耗 | 2000-3000 | 每次解析 |
| 成本 | ¥0.002-0.003 | DeepSeek定价 |
| 准确率 | 70-85% | extractionConfidence |

### 优化方向（v0.2）

#### 1. 智能缓存
```typescript
// 缓存策略
export class ContractParsingService {
  private cache = new Map<string, ParsedContract>();

  async parseContract(text: string): Promise<ParsedContract> {
    const cacheKey = this.generateCacheKey(text);

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      console.log('🎯 命中缓存');
      return this.cache.get(cacheKey)!;
    }

    // AI解析
    const result = await this.parseWithAI(text);

    // 缓存结果
    this.cache.set(cacheKey, result);

    return result;
  }
}
```

#### 2. 规则引擎优先
```typescript
// 先用规则引擎（免费、快速）
const ruleBasedResult = await ruleEngine.quickCheck(text);

// 只在必要时调用AI（成本高）
if (ruleBasedResult.needsAIAnalysis) {
  const aiResult = await callUnifiedAI(...);
}
```

#### 3. 并行处理
```typescript
// 多个独立任务并行执行
const [metadata, clauses, risks] = await Promise.all([
  extractMetadata(text),
  extractClauses(text),
  detectRisks(text),
]);
```

### 优化目标（v0.2）

- 分析时间：< 3秒
- 准确率：> 90%
- 成本：< ¥0.001/次（通过缓存和规则引擎）

---

## 🐛 常见问题

### Q: AI返回的JSON格式不正确？
A: 检查以下几点：
1. `responseFormat: 'json'` 是否设置
2. System Prompt 是否明确要求JSON格式
3. 使用JSON清理逻辑（去除markdown标记）
4. 实在不行用兜底机制

### Q: 如何降低AI调用成本？
A: 采用以下策略：
1. 智能缓存（相同内容不重复调用）
2. 规则引擎优先（能用规则就不用AI）
3. 降低温度（temperature: 0.3）
4. 精简提示词（只要必要信息）

### Q: 如何提高解析准确率？
A: 改进方向：
1. 优化提示词（更明确的指令）
2. 提供示例（few-shot learning）
3. 后处理验证（检查和修正）
4. 人工反馈（收集错误样本）

### Q: 如何处理超长合同？
A: 两种方案：
1. 分段处理（每段独立解析，最后合并）
2. 提取关键部分（只解析重要条款）

---

## 📚 相关文档

- [主README](../README.md) - 领域总览
- [类型定义README](../types/README.md) - 类型说明
- [API路由README](../../../../app/api/contract/README.md) - API文档
- [测试样本](../../../../docs/contract-test-sample.md) - 测试用例

---

## 🛠️ 下一步开发

### 本周计划
- [ ] 实现 `ContractRuleEngine` 类
- [ ] 编写6大核心条款检查规则
- [ ] 添加规则引擎单元测试

### 下周计划
- [ ] 实现 `RiskIdentificationService` 类
- [ ] 集成规则引擎和AI分析
- [ ] 完善风险识别规则库

### 未来计划
- [ ] 实现 `NegotiationAdvisorService` 类
- [ ] 添加更多合同类型支持
- [ ] 优化性能和成本

---

**最后更新**: 2025-10-21
**版本**: v0.1.0
**状态**: 🟢 Active Development
