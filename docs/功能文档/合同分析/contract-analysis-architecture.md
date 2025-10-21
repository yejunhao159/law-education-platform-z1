# 合同分析领域 - 技术架构设计文档

> **项目定位**: 合同明白人 - 法律知情权平台
> **核心使命**: 让普通人3分钟看懂合同，从根源解决法律知识不平等
> **架构原则**: DDD领域驱动设计 + DeepPractice Standards Compliant

---

## 一、架构概览

### 1.1 整体定位

合同分析功能将作为**新增领域(Domain)**集成到现有法律教育平台，充分复用现有基础设施：

```
law-education-platform-z1/
├── src/domains/
│   ├── legal-analysis/          # 现有：判决书分析（三要素提取）
│   ├── socratic-dialogue/       # 现有：苏格拉底对话引擎
│   ├── document-processing/     # 现有：OCR文档处理
│   ├── contract-analysis/       # 🆕 新增：合同分析领域
│   │   ├── services/
│   │   │   ├── ContractParsingService.ts           # 合同解析服务
│   │   │   ├── RiskIdentificationService.ts        # 风险识别服务
│   │   │   ├── ClauseCheckerService.ts             # 条款检查服务（6大核心条款）
│   │   │   ├── NegotiationStrategyService.ts       # 协商策略服务
│   │   │   └── TransactionPurposeQuestioningService.ts  # 交易目的询问服务
│   │   ├── domain/
│   │   │   ├── Contract.ts                         # 合同聚合根
│   │   │   ├── Clause.ts                           # 条款值对象
│   │   │   ├── RiskLevel.ts                        # 风险等级枚举
│   │   │   └── NegotiationTip.ts                   # 协商提示值对象
│   │   ├── types/
│   │   │   └── index.ts                            # 类型定义
│   │   ├── repositories/
│   │   │   └── ContractRepository.ts               # 合同数据访问层
│   │   └── utils/
│   │       ├── LawyerExperienceExtractor.ts        # 律师经验萃取器
│   │       └── ContractRuleEngine.ts               # 合同规则引擎
│   └── shared/                   # 现有：共享基础设施
│       └── infrastructure/
│           └── ai/
│               ├── AICallProxy.ts      # 统一AI调用代理
│               └── AiInvocation.ts     # AI调用封装
└── app/
    └── api/
        └── contract/              # 🆕 合同分析API路由
            ├── analyze/
            │   └── route.ts       # POST /api/contract/analyze
            ├── risk-check/
            │   └── route.ts       # POST /api/contract/risk-check
            └── negotiation-tips/
                └── route.ts       # POST /api/contract/negotiation-tips
```

### 1.2 技术栈复用矩阵

| 功能模块 | 现有基础设施 | 复用方式 | 新增开发量 |
|---------|------------|---------|-----------|
| **AI调用** | `AICallProxy` + `DeeChatAIClient` | 直接复用 | 0% - 无需开发 |
| **OCR识别** | `document-processing` domain | 直接复用 | 0% - 已有OCR |
| **文档提取** | `JudgmentExtractionService` | 参考架构 | 30% - 改造为合同提取 |
| **对话引擎** | `SocraticDialogueService` | 复用对话逻辑 | 20% - 定制交易目的问询 |
| **成本控制** | `AICallProxy.getCallStats()` | 直接复用 | 0% - 已有统计 |
| **规则引擎** | 无现成 | 全新开发 | 100% - 律师经验规则库 |
| **条款检查** | 无现成 | 全新开发 | 100% - 6大条款检查器 |

**开发效率提升**: 通过复用现有基础设施，预计可减少 **60%** 的基础开发工作量。

---

## 二、核心服务设计（DDD Service Layer）

### 2.1 ContractParsingService - 合同解析服务

**职责**: 将上传的合同文档转换为结构化的合同对象

**输入**:
- PDF/图片文件 (通过OCR识别) 或
- 纯文本合同内容

**输出**:
```typescript
interface ParsedContract {
  metadata: {
    contractType: '买卖' | '租赁' | '服务' | '劳动' | '其他';
    parties: {
      partyA: { name: string; role: '甲方' | '乙方' };
      partyB: { name: string; role: '甲方' | '乙方' };
    };
    signDate?: string;
    effectiveDate?: string;
  };
  clauses: Array<{
    id: string;
    title: string;              // 如："第三条 违约责任"
    content: string;            // 条款完整内容
    category: ClauseCategory;   // 违约/终止/交付/管辖/争议/费用/其他
    position: { start: number; end: number }; // 在原文中的位置
  }>;
  rawText: string;
  extractionConfidence: number; // 0-1，提取置信度
}
```

**技术实现**:
```typescript
// src/domains/contract-analysis/services/ContractParsingService.ts

import { AICallProxy } from '@/src/infrastructure/ai/AICallProxy';
import type { ParsedContract } from '../types';

export class ContractParsingService {
  private aiProxy: AICallProxy;

  constructor() {
    this.aiProxy = AICallProxy.getInstance();
  }

  /**
   * 解析合同文本
   */
  async parseContract(contractText: string): Promise<ParsedContract> {
    const systemPrompt = `你是专业的合同分析专家。请将合同文本解析为结构化JSON。`;

    const userPrompt = `请解析以下合同，提取：
1. 合同类型（买卖/租赁/服务/劳动/其他）
2. 双方当事人信息
3. 所有条款（标题+内容+分类）
4. 签订日期、生效日期

合同内容：
${contractText}

请以JSON格式返回ParsedContract对象。`;

    const result = await this.aiProxy.callAI(systemPrompt, userPrompt, {
      temperature: 0.3,  // 低温度保证准确性
      maxTokens: 4000,
      responseFormat: 'json'
    });

    return JSON.parse(result.content);
  }
}
```

### 2.2 RiskIdentificationService - 风险识别服务

**职责**: 识别合同中的不平等条款和高风险条款

**核心能力**:
1. **霸王条款识别**: 基于《合同法》《民法典》识别违法条款
2. **风险等级评估**: critical(高风险) / medium(中风险) / low(低风险)
3. **法律依据引用**: 每个风险点引用具体法条

**输入**: ParsedContract
**输出**:
```typescript
interface RiskAnalysisResult {
  overallRiskLevel: 'high' | 'medium' | 'low';
  riskyClauseCount: number;
  risks: Array<{
    clauseId: string;
    clauseTitle: string;
    clauseContent: string;
    riskType: '霸王条款' | '违约责任不对等' | '管辖不利' | '费用承担不公' | '其他';
    riskLevel: 'critical' | 'medium' | 'low';
    description: string;        // 为什么有风险
    legalBasis: string;         // 法律依据（如《民法典》第497条）
    consequence: string;        // 可能的后果
    negotiationSuggestion: string; // 协商建议
  }>;
  summary: string; // 风险总结（100字以内）
}
```

**技术实现**:
```typescript
// src/domains/contract-analysis/services/RiskIdentificationService.ts

export class RiskIdentificationService {
  private aiProxy: AICallProxy;
  private ruleEngine: ContractRuleEngine; // 规则引擎（律师经验库）

  /**
   * 识别合同风险
   */
  async identifyRisks(contract: ParsedContract): Promise<RiskAnalysisResult> {
    // 第一步：规则引擎快速筛查（基于律师经验库）
    const ruleBasedRisks = await this.ruleEngine.checkRisks(contract.clauses);

    // 第二步：AI深度分析（补充规则未覆盖的风险）
    const aiEnhancedRisks = await this.aiDeepAnalysis(contract, ruleBasedRisks);

    // 第三步：风险聚合和排序
    return this.aggregateRisks(ruleBasedRisks, aiEnhancedRisks);
  }

  private async aiDeepAnalysis(
    contract: ParsedContract,
    existingRisks: any[]
  ): Promise<any[]> {
    const systemPrompt = `你是资深律师，专注于合同风险识别。
请基于《民法典》《合同法》识别不平等条款。`;

    const userPrompt = `请深度分析以下合同条款，识别风险：

已识别风险（规则引擎）：
${JSON.stringify(existingRisks, null, 2)}

合同条款：
${JSON.stringify(contract.clauses, null, 2)}

请补充规则引擎未覆盖的风险点。`;

    const result = await this.aiProxy.callAI(systemPrompt, userPrompt, {
      temperature: 0.2,
      maxTokens: 3000,
      responseFormat: 'json'
    });

    return JSON.parse(result.content);
  }
}
```

### 2.3 ClauseCheckerService - 6大核心条款检查服务

**职责**: 检查合同是否包含6大必备条款

**6大核心条款**（来自律师访谈）:
1. 违约责任条款
2. 合同终止条款
3. 交付/履行条款
4. 管辖条款
5. 争议解决条款
6. 法律费用承担条款

**输出**:
```typescript
interface ClauseCheckResult {
  missingClauses: Array<{
    name: string;
    importance: 'critical' | 'important' | 'recommended';
    reason: string;           // 为什么重要
    risk: string;             // 缺失的风险
    suggestion: string;       // 建议增加的条款内容
  }>;
  presentClauses: Array<{
    name: string;
    clauseId: string;
    adequacy: 'sufficient' | 'needs-improvement' | 'inadequate';
    improvement?: string;     // 改进建议
  }>;
  completenessScore: number;  // 0-100，条款完整度评分
}
```

### 2.4 TransactionPurposeQuestioningService - 交易目的询问服务

**职责**: 通过苏格拉底式对话帮助用户理清交易目的

**核心思路**（来自律师洞察）:
> "用户最大的问题是不知道自己的交易目的是什么"

**对话流程**:
```
用户上传合同
  ↓
系统：这份合同的交易是关于什么的？（房屋买卖/商品采购/服务外包...）
  ↓
用户：房屋买卖
  ↓
系统：你在这个交易中是买方还是卖方？
  ↓
用户：买方
  ↓
系统：你最担心的是什么？（房价涨跌/过不了户/房屋质量问题...）
  ↓
用户：担心付了钱，房子过不了户
  ↓
系统：明白了。那让我重点检查以下几点：
  1. 过户时间是否明确约定
  2. 卖方违约责任是否足够
  3. 款项支付与过户的先后顺序
  4. 如果过不了户，你能否要回钱
```

**技术实现** - 复用现有对话引擎:
```typescript
// src/domains/contract-analysis/services/TransactionPurposeQuestioningService.ts

import { SocraticDialogueService } from '@/src/domains/socratic-dialogue/services/SocraticDialogueService';

export class TransactionPurposeQuestioningService {
  private dialogueService: SocraticDialogueService;

  /**
   * 初始化交易目的询问对话
   */
  async startQuestioning(contractType: string): Promise<{
    sessionId: string;
    firstQuestion: string;
  }> {
    // 复用现有的苏格拉底对话服务
    const session = await this.dialogueService.createSession({
      mode: 'questioning',
      context: {
        contractType,
        questioningGoal: '理清用户的交易目的和主要担忧'
      }
    });

    return {
      sessionId: session.id,
      firstQuestion: this.getFirstQuestionByContractType(contractType)
    };
  }

  /**
   * 处理用户回答，生成下一个问题
   */
  async handleAnswer(sessionId: string, answer: string): Promise<{
    nextQuestion?: string;
    isComplete: boolean;
    extractedPurpose?: {
      role: '强势方' | '弱势方';
      concerns: string[];
      riskFocus: string[];
    };
  }> {
    // 调用对话服务继续对话
    const response = await this.dialogueService.continueDialogue(sessionId, answer);

    // 判断是否已收集足够信息
    if (response.dialogueComplete) {
      return {
        isComplete: true,
        extractedPurpose: this.extractPurposeFromDialogue(response.dialogueHistory)
      };
    }

    return {
      nextQuestion: response.nextQuestion,
      isComplete: false
    };
  }
}
```

### 2.5 NegotiationStrategyService - 协商策略服务

**职责**: 基于风险分析结果，生成具体的协商话术和策略

**输出**:
```typescript
interface NegotiationStrategy {
  targetClause: string;         // 目标条款
  currentRisk: string;          // 当前风险
  negotiationGoal: string;      // 协商目标
  scripts: Array<{
    scenario: string;           // 场景（如"对方不同意修改"）
    script: string;             // 具体话术
    fallbackOption?: string;    // 备选方案
  }>;
  redLines: string[];           // 不可让步的底线
  acceptableCompromises: string[]; // 可以妥协的点
}
```

**示例输出**（房屋买卖案例）:
```typescript
{
  targetClause: "第五条 违约责任",
  currentRisk: "卖方违约只需支付定金双倍，但房价上涨100万，违约成本过低",
  negotiationGoal: "提高卖方违约成本至实际损失赔偿",
  scripts: [
    {
      scenario: "正常协商",
      script: "李老板，这个违约条款咱们商量一下。现在房价变化大，如果到时候房价涨了，我怕您会不想卖了。咱们能不能把违约金提高到房屋总价的20%？这样对咱们双方都公平。"
    },
    {
      scenario: "对方不同意",
      script: "我理解您的担心。那这样，咱们在合同里加一条：如果因为您违约导致我买不到同等条件的房子，差价部分您得补给我。这样您也不用担心违约金太高，我也有保障。",
      fallbackOption: "至少加上'卖方违约需赔偿实际损失'的条款"
    }
  ],
  redLines: [
    "必须有违约赔偿机制",
    "赔偿不能低于定金双倍"
  ],
  acceptableCompromises: [
    "违约金比例可以从20%降到15%",
    "可以设置一个赔偿上限（如50万）"
  ]
}
```

---

## 三、数据流与API设计

### 3.1 核心业务流程

```
用户上传合同
    ↓
OCR识别（复用document-processing）
    ↓
合同解析（ContractParsingService）
    ↓
                  ┌────────────────────────┐
                  │  风险识别（RiskIdentificationService）  │
                  └────────────────────────┘
                  ↓
      ┌──────────┼──────────┐
      ↓          ↓          ↓
  6大条款检查   霸王条款识别   风险等级评估
      ↓          ↓          ↓
      └──────────┼──────────┘
                  ↓
           生成分析报告（免费版）
                  ↓
      用户查看风险点 + 解释
                  ↓
           [付费功能分界线]
                  ↓
    协商策略生成（NegotiationStrategyService）
                  ↓
    交易目的询问（TransactionPurposeQuestioningService）
                  ↓
    深度案例分析（类似判决书推理）
```

### 3.2 API路由设计

#### 3.2.1 免费API（公共普法）

**POST /api/contract/analyze** - 合同基础分析（免费版核心）
```typescript
// Request
{
  contractText?: string;     // 纯文本合同
  contractFile?: File;       // PDF/图片文件
  userId?: string;           // 用户ID（可选，未登录可用）
}

// Response
{
  contractId: string;
  analysis: {
    contractType: string;
    parties: { partyA: string; partyB: string };

    // 6大条款检查结果
    essentialClauses: {
      missingCount: number;
      missing: Array<{ name: string; importance: string; risk: string }>;
      present: Array<{ name: string; adequacy: string }>;
    };

    // 风险识别结果（免费版只显示高风险）
    risks: Array<{
      clauseTitle: string;
      riskType: string;
      riskLevel: 'critical' | 'medium';  // 免费版不显示low
      description: string;
      legalBasis: string;
      consequence: string;
    }>;

    // 总体评估
    summary: {
      overallRisk: 'high' | 'medium' | 'low';
      criticalRiskCount: number;
      completenessScore: number;
      recommendation: string;  // 如："建议修改3处高风险条款后再签"
    };
  };

  // 免费额度提示
  freeQuota: {
    used: number;
    remaining: number;
    resetDate: string;
  };
}
```

#### 3.2.2 付费API（深度服务）

**POST /api/contract/negotiation-strategy** - 生成协商策略（付费）
```typescript
// Request
{
  contractId: string;
  targetRisks: string[];  // 用户选择想要协商的风险点
}

// Response
{
  strategies: Array<NegotiationStrategy>;
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  successRate: number;  // 基于历史数据的成功率
}
```

**POST /api/contract/transaction-purpose** - 交易目的询问（付费）
```typescript
// Request
{
  contractId: string;
  action: 'start' | 'answer';
  sessionId?: string;
  answer?: string;
}

// Response
{
  sessionId: string;
  question?: string;
  isComplete: boolean;
  extractedPurpose?: {
    role: string;
    concerns: string[];
    riskFocus: string[];
    customizedAnalysis: string;  // 基于目的重新分析合同
  };
}
```

### 3.3 成本控制策略

基于现有 `AICallProxy` 的成本统计能力：

```typescript
// 免费版成本控制
const FREE_TIER_CONFIG = {
  scansPerMonth: 3,
  maxTokensPerScan: 4000,      // 约0.02元/次
  enableCostOptimization: true  // 开启成本优化
};

// 付费版成本控制
const PREMIUM_TIER_CONFIG = {
  scansPerMonth: Infinity,
  maxTokensPerScan: 8000,       // 约0.04元/次
  enableDeepAnalysis: true,     // 开启深度分析（更多token）
  enableCostOptimization: false // 关闭优化，保证质量
};

// API层成本拦截
export async function POST(req: Request) {
  const userId = getUserId(req);
  const userTier = await getUserTier(userId);

  // 检查免费额度
  if (userTier === 'free') {
    const quota = await checkFreeQuota(userId);
    if (quota.remaining <= 0) {
      return Response.json({
        error: 'FREE_QUOTA_EXCEEDED',
        message: '本月免费次数已用完，请升级到会员版',
        upgradeUrl: '/pricing'
      }, { status: 402 });
    }
  }

  // 调用分析服务
  // ...
}
```

---

## 四、律师经验萃取与规则引擎

### 4.1 ContractRuleEngine - 合同规则引擎

**核心理念**: 将律师的合同审查经验编码为可执行的规则

**规则库结构**:
```typescript
// src/domains/contract-analysis/utils/ContractRuleEngine.ts

interface ContractRule {
  id: string;
  name: string;
  category: ClauseCategory;
  riskLevel: 'critical' | 'medium' | 'low';

  // 触发条件（正则表达式或关键词）
  trigger: {
    keywords?: string[];        // 如 ["霸王条款", "单方解除"]
    patterns?: RegExp[];        // 如 /甲方有权.*解除/
    antiPatterns?: RegExp[];    // 排除模式
  };

  // 检查逻辑
  check: (clause: Clause, contract: ParsedContract) => boolean;

  // 风险描述
  risk: {
    description: string;
    legalBasis: string;
    consequence: string;
  };

  // 修改建议
  suggestion: {
    negotiationPoint: string;
    suggestedClause: string;
    lawyerTip: string;
  };

  // 规则来源（可追溯）
  source: {
    lawyerName?: string;
    caseReference?: string;
    lawReference: string;
  };
}

export class ContractRuleEngine {
  private rules: ContractRule[] = [];

  constructor() {
    this.loadRules();
  }

  /**
   * 加载律师经验规则库
   */
  private loadRules() {
    // 规则1：单方解除权不对等
    this.rules.push({
      id: 'RULE_001',
      name: '单方解除权不对等',
      category: '终止条款',
      riskLevel: 'critical',
      trigger: {
        keywords: ['单方解除', '甲方有权解除'],
        antiPatterns: [/双方.*有权.*解除/]
      },
      check: (clause, contract) => {
        const text = clause.content;
        const hasUnilateralRight = /甲方.*有权.*解除/.test(text);
        const noReciprocal = !/乙方.*有权.*解除/.test(text);
        return hasUnilateralRight && noReciprocal;
      },
      risk: {
        description: '合同约定甲方可以单方解除，但乙方没有对等权利，权利义务严重不对等',
        legalBasis: '《民法典》第496条：格式条款如存在不合理地免除或减轻其责任、加重对方责任、限制对方主要权利的，该条款无效',
        consequence: '甲方可以随时解除合同，但你（乙方）不能，极其被动。如果你已投入大量成本，甲方突然解除，你的损失无法挽回'
      },
      suggestion: {
        negotiationPoint: '要求加上"乙方在XX情况下也有权解除合同"',
        suggestedClause: '双方均有权在对方违约且经催告后X日内未改正时解除本合同',
        lawyerTip: '强调互惠原则，提出"如果你能随时走，我也应该能走"'
      },
      source: {
        lawyerName: '李律师（15年合同经验）',
        lawReference: '《民法典》第496条、第563条'
      }
    });

    // 规则2：违约金过低
    this.rules.push({
      id: 'RULE_002',
      name: '违约金明显过低',
      category: '违约条款',
      riskLevel: 'critical',
      trigger: {
        keywords: ['违约金', '定金'],
        patterns: [/违约金.*\d+%/, /定金.*双倍/]
      },
      check: (clause, contract) => {
        const text = clause.content;
        // 提取违约金比例
        const percentMatch = text.match(/违约金.*?(\d+)%/);
        if (percentMatch) {
          const percent = parseInt(percentMatch[1]);
          return percent < 10;  // 低于10%视为过低
        }

        // 检查是否仅为定金双倍（在房价大幅波动时不足）
        const isOnlyDeposit = /定金.*双倍/.test(text) && !/实际损失/.test(text);
        return isOnlyDeposit;
      },
      risk: {
        description: '违约成本过低，如果标的物价格大幅上涨，对方违约成本远低于守约成本，极易违约',
        legalBasis: '《民法典》第585条：当事人可以约定违约金；约定的违约金低于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以增加',
        consequence: '如房价从200万涨到300万，对方只需赔10万定金即可违约，你损失90万却无法追偿'
      },
      suggestion: {
        negotiationPoint: '提高违约金至合同总价的15-20%，或增加"赔偿实际损失"条款',
        suggestedClause: '一方违约的，应向守约方支付合同总价20%的违约金；违约金不足以弥补实际损失的，违约方应赔偿实际损失',
        lawyerTip: '强调市场波动风险，用房价上涨的真实案例说服对方'
      },
      source: {
        lawyerName: '王律师（专注房地产交易）',
        caseReference: '(2023)京01民初XXX号 - 房价上涨卖方违约案',
        lawReference: '《民法典》第585条、第587条'
      }
    });

    // 规则3-20：管辖/争议/费用/交付等更多规则...
    // （此处省略，实际开发时补充完整的20+条核心规则）
  }

  /**
   * 检查合同条款风险
   */
  async checkRisks(clauses: Clause[]): Promise<RuleBasedRisk[]> {
    const risks: RuleBasedRisk[] = [];

    for (const clause of clauses) {
      for (const rule of this.rules) {
        // 先用trigger快速筛选
        if (this.matchesTrigger(clause, rule.trigger)) {
          // 再用check详细验证
          if (rule.check(clause, { clauses } as any)) {
            risks.push({
              ruleId: rule.id,
              ruleName: rule.name,
              clauseId: clause.id,
              clauseTitle: clause.title,
              riskLevel: rule.riskLevel,
              ...rule.risk,
              ...rule.suggestion,
              source: rule.source
            });
          }
        }
      }
    }

    return risks;
  }

  private matchesTrigger(clause: Clause, trigger: any): boolean {
    const text = clause.content;

    // 关键词匹配
    if (trigger.keywords) {
      const hasKeyword = trigger.keywords.some((kw: string) => text.includes(kw));
      if (!hasKeyword) return false;
    }

    // 正则匹配
    if (trigger.patterns) {
      const hasPattern = trigger.patterns.some((p: RegExp) => p.test(text));
      if (!hasPattern) return false;
    }

    // 排除模式
    if (trigger.antiPatterns) {
      const hasAntiPattern = trigger.antiPatterns.some((p: RegExp) => p.test(text));
      if (hasAntiPattern) return false;
    }

    return true;
  }
}
```

### 4.2 律师访谈萃取指南（为pending task准备）

**访谈目标**: 将律师的隐性知识（tacit knowledge）转化为显性规则（explicit rules）

**访谈结构化问题清单**:

#### 阶段1：交易目的识别（30分钟）
1. 当客户拿着合同来找您时，您第一个问题通常是什么？
2. 如何判断客户是否清楚自己的交易目的？
3. 对于不清楚目的的客户，您如何引导？（具体话术）
4. 不同交易目的（如买房自住 vs 投资）会如何影响您的审查重点？

#### 阶段2：6大核心条款深挖（60分钟）

**对每个条款依次提问**:
```
以"违约责任条款"为例：

Q1: 什么样的违约责任条款是合格的？（最低标准）
A: [律师回答] → 转化为规则check逻辑

Q2: 您见过最离谱的违约条款是什么样的？
A: [律师回答] → 转化为高风险规则

Q3: 如果您发现违约责任条款有问题，您会怎么跟客户的交易对方谈？（话术）
A: [律师回答] → 转化为协商脚本

Q4: 如果对方不同意改，您的底线是什么？可以接受什么样的妥协？
A: [律师回答] → 转化为redLines和acceptableCompromises

Q5: 有没有真实案例，客户因为违约条款不当吃了大亏？
A: [律师回答] → 转化为consequence警示案例
```

**重复以上5个问题，依次针对**:
- 违约责任条款
- 合同终止条款
- 交付/履行条款
- 管辖条款
- 争议解决条款
- 法律费用承担条款

#### 阶段3：风险识别启发式（30分钟）
1. 除了上述6大条款，还有哪些条款是您一定会仔细看的？
2. 您如何快速识别"霸王条款"？（关键词、句式、逻辑）
3. 对于不同合同类型（买卖/租赁/服务/劳动），风险点有何不同？
4. 如何判断客户在交易中处于强势还是弱势地位？

#### 阶段4：协商策略萃取（30分钟）
1. 面对强势的交易对方（如大公司/开发商），您的协商策略是什么？
2. 如果是普通人vs普通人（如二手房买卖），协商策略有何不同？
3. 有哪些"万能协商话术"您会反复使用？
4. 对方说"这是公司统一格式合同，改不了"时，您如何应对？

**访谈记录格式**:
```markdown
## 律师：李XX，执业15年，专注合同纠纷

### Q1: 什么样的违约责任条款是合格的？
**律师回答**（原话）：
"至少要有三个要素：1）违约情形要明确，不能是'一方违约'这种模糊表述，要具体到'逾期交付超过X天'；2）违约金或损失赔偿的计算方式要清晰；3）双方的违约责任要对等，不能甲方违约赔5%，乙方违约赔20%。"

**规则萃取**：
- Rule ID: RULE_XXX
- Trigger: 违约条款
- Check Logic:
  - 检查是否明确违约情形（非模糊表述）
  - 检查是否明确违约金计算方式
  - 检查双方违约责任是否对等（比例差异<5%）
- Risk Level: critical（如不满足）
- Legal Basis: 《民法典》第584-585条
```

### 4.3 规则库持续更新机制

```typescript
// 用户反馈驱动的规则优化

interface UserFeedback {
  contractId: string;
  ruleId: string;
  feedbackType: 'false-positive' | 'missed-risk' | 'suggestion-helpful' | 'suggestion-useless';
  comment?: string;
}

// 当用户反馈"这个风险点其实不存在"（false-positive）时
// → 自动标记规则需要优化
// → 人工复核后调整trigger或check逻辑

// 当用户反馈"你们漏了一个重要风险"（missed-risk）时
// → 提交给律师团队复核
// → 转化为新规则加入规则库
```

---

## 五、MVP功能范围界定

### 5.1 第一版MVP（2周开发周期）

**包含功能**（免费版核心）:
1. ✅ 合同上传（PDF/图片OCR）
2. ✅ 合同解析（ContractParsingService）
3. ✅ 6大条款检查（ClauseCheckerService）
4. ✅ 风险识别（RiskIdentificationService）
   - 仅规则引擎（20条核心规则）
   - 不含AI深度分析（成本控制）
5. ✅ 风险解释（为什么有风险 + 法律依据 + 可能后果）
6. ✅ 免费额度管理（3次/月）

**不包含**（留待后续版本）:
- ❌ 协商策略生成（付费功能）
- ❌ 交易目的询问（付费功能）
- ❌ 深度AI分析（成本高）
- ❌ 案例库检索（数据未准备）
- ❌ 合同修改建议的具体文本（仅给方向）

### 5.2 第二版功能（MVP验证后）

**条件触发**: 第一版用户反馈良好 + 有100+真实合同分析数据

**新增功能**:
1. ✅ 协商策略生成（NegotiationStrategyService）
2. ✅ 交易目的询问（TransactionPurposeQuestioningService）
3. ✅ AI深度分析增强（AICallProxy高token模式）
4. ✅ 案例库（基于100+真实合同建立）

### 5.3 成本估算（第一版MVP）

假设用户量: 1000人/月（免费版）

**成本构成**:
```
OCR成本:
- 假设50%用户上传图片/PDF
- 500次OCR × 0.01元/次 = 5元

AI调用成本（合同解析）:
- 1000次合同解析
- 平均4000 tokens/次 × 0.001元/1K tokens × 1000 = 4元

AI调用成本（风险识别 - 规则引擎为主）:
- 规则引擎免费（本地计算）
- AI补充分析（可选）: 0元（第一版不启用）

总成本: 9元/1000用户 = 0.009元/用户
```

**营收预测**（5%转化率）:
```
免费用户: 1000人
付费用户: 50人 × 9.9元/月 = 495元/月

毛利润: 495 - 9 = 486元/月
毛利率: 98.2%

（注：未计入服务器成本，假设复用现有服务器）
```

---

## 六、技术风险与应对

### 6.1 AI识别准确率风险

**风险**: AI可能误判或漏判风险条款

**应对策略**:
1. **双层检查机制**:
   - 第一层：规则引擎（高精确度，基于律师经验）
   - 第二层：AI补充（高召回率，发现规则未覆盖的风险）
2. **置信度标注**:
   - 每个风险点附带置信度（0-1）
   - 低置信度风险标注"建议咨询专业律师"
3. **用户反馈闭环**:
   - 允许用户标记误报/漏报
   - 反馈数据用于优化规则和AI模型

### 6.2 法律责任风险

**风险**: 用户依据AI分析结果签约后仍然受损，是否承担责任？

**应对策略**:
1. **免责声明**（用户协议）:
   ```
   本平台提供的合同分析结果仅供参考，不构成法律意见。
   如涉及重大交易，建议咨询专业律师。
   用户使用本平台服务即表示理解并接受上述限制。
   ```
2. **风险分级提示**:
   - critical风险 → "强烈建议咨询律师"
   - medium风险 → "建议谨慎考虑"
   - low风险 → "注意即可"
3. **律师咨询导流**（Expert tier）:
   - 提供付费律师咨询入口
   - 将高风险用户导流给真人律师

### 6.3 规则库维护成本

**风险**: 法律法规更新，规则库需要持续维护

**应对策略**:
1. **法律订阅服务**:
   - 订阅法律法规更新推送
   - 每季度复核规则库
2. **律师顾问机制**:
   - 聘请1-2名律师作为顾问
   - 每月复核规则库 + 新增规则
3. **众包优化**:
   - 开放"律师纠错"通道
   - 律师用户可提交规则优化建议

### 6.4 成本失控风险

**风险**: AI调用成本随用户增长而线性增长

**应对策略**:
1. **免费版严格限流**:
   - 3次/月硬性限制
   - 超出后必须付费
2. **规则引擎优先**:
   - 80%风险通过规则引擎识别（本地计算，成本为0）
   - 仅复杂情况才调用AI
3. **Token优化**:
   - 合同预处理（去除无关段落）
   - 分段分析（而非全文一次性分析）
   - 使用DeepSeek（成本仅为GPT-4的1/10）

---

## 七、集成方案

### 7.1 集成到现有平台 vs 独立部署

**方案A：集成到现有平台**（推荐）

优势:
- 复用现有基础设施（AICallProxy, OCR, 对话引擎）
- 复用用户体系和支付系统
- 开发成本低（2周MVP）
- 品牌协同（法律教育平台 + 普法工具）

劣势:
- 用户群体不同（法学生 vs 普通人）
- 可能混淆产品定位

**方案B：独立部署**

优势:
- 产品定位清晰
- 独立品牌运营
- 可快速迭代不影响主平台

劣势:
- 需要重复搭建基础设施
- 开发成本高（4-6周）
- 用户体系割裂

**最终建议**: 采用**方案A（集成）+ 独立域名**的混合方案

```
主平台: law-education.com（法学生教育）
├── 四幕教学
├── 判决书分析
└── 苏格拉底对话

合同分析: contract.law-education.com（普通人普法）
├── 合同上传
├── 风险分析
├── 协商建议
└── 律师咨询

技术实现:
- 共享同一个Next.js项目
- 通过域名路由区分UI
- 共享domains/基础设施
- 独立的前端页面和用户流程
```

### 7.2 前后端协作方案

```typescript
// 前端调用示例（app/contract/page.tsx）

'use client';

import { useState } from 'react';

export default function ContractAnalysisPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (file: File) => {
    setAnalyzing(true);

    const formData = new FormData();
    formData.append('contractFile', file);

    try {
      const response = await fetch('/api/contract/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else if (response.status === 402) {
        // 免费额度用完
        alert(data.message);
        window.location.href = '/pricing';
      } else {
        alert('分析失败：' + data.error);
      }
    } catch (error) {
      alert('网络错误，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      <h1>合同明白人 - 3分钟看懂合同风险</h1>

      {!result && (
        <FileUploader
          onUpload={handleFileUpload}
          accept=".pdf,.jpg,.png,.docx"
          maxSize={10 * 1024 * 1024}  // 10MB
        />
      )}

      {analyzing && <LoadingSpinner text="AI正在分析合同..." />}

      {result && (
        <ContractAnalysisResult
          analysis={result.analysis}
          freeQuota={result.freeQuota}
        />
      )}
    </div>
  );
}
```

```typescript
// 后端API实现（app/api/contract/analyze/route.ts）

import { NextRequest, NextResponse } from 'next/server';
import { ContractParsingService } from '@/src/domains/contract-analysis/services/ContractParsingService';
import { RiskIdentificationService } from '@/src/domains/contract-analysis/services/RiskIdentificationService';
import { ClauseCheckerService } from '@/src/domains/contract-analysis/services/ClauseCheckerService';

export async function POST(req: NextRequest) {
  try {
    // 1. 用户认证和额度检查
    const userId = getUserIdFromSession(req);
    const userTier = await getUserTier(userId);

    if (userTier === 'free') {
      const quota = await checkFreeQuota(userId);
      if (quota.remaining <= 0) {
        return NextResponse.json({
          error: 'FREE_QUOTA_EXCEEDED',
          message: '本月免费次数已用完，请升级到会员版',
          upgradeUrl: '/pricing'
        }, { status: 402 });
      }
    }

    // 2. 解析上传的文件
    const formData = await req.formData();
    const file = formData.get('contractFile') as File;

    let contractText: string;
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      // 调用OCR服务（复用document-processing domain）
      contractText = await ocrService.extractText(file);
    } else {
      contractText = await file.text();
    }

    // 3. 合同解析
    const parsingService = new ContractParsingService();
    const parsedContract = await parsingService.parseContract(contractText);

    // 4. 6大条款检查
    const clauseChecker = new ClauseCheckerService();
    const clauseCheckResult = await clauseChecker.checkEssentialClauses(parsedContract);

    // 5. 风险识别
    const riskService = new RiskIdentificationService();
    const riskAnalysis = await riskService.identifyRisks(parsedContract);

    // 6. 保存分析记录
    const contractId = await saveContractAnalysis({
      userId,
      parsedContract,
      clauseCheckResult,
      riskAnalysis
    });

    // 7. 扣减免费额度
    if (userTier === 'free') {
      await deductFreeQuota(userId);
    }

    // 8. 返回结果
    return NextResponse.json({
      contractId,
      analysis: {
        contractType: parsedContract.metadata.contractType,
        parties: parsedContract.metadata.parties,
        essentialClauses: clauseCheckResult,
        risks: riskAnalysis.risks.filter(r =>
          userTier === 'free' ? r.riskLevel !== 'low' : true  // 免费版隐藏低风险
        ),
        summary: {
          overallRisk: riskAnalysis.overallRiskLevel,
          criticalRiskCount: riskAnalysis.risks.filter(r => r.riskLevel === 'critical').length,
          completenessScore: clauseCheckResult.completenessScore,
          recommendation: generateRecommendation(riskAnalysis, clauseCheckResult)
        }
      },
      freeQuota: userTier === 'free' ? await getFreeQuota(userId) : null
    });

  } catch (error) {
    console.error('合同分析失败:', error);
    return NextResponse.json({
      error: 'ANALYSIS_FAILED',
      message: '分析失败，请稍后重试或联系客服'
    }, { status: 500 });
  }
}
```

---

## 八、下一步行动计划（基于当前架构设计）

### Week 1: 核心服务开发
- [ ] Day 1-2: ContractParsingService + 类型定义
- [ ] Day 3-4: ContractRuleEngine + 20条核心规则
- [ ] Day 5: ClauseCheckerService（6大条款检查）
- [ ] Day 6-7: RiskIdentificationService集成

### Week 2: API与前端集成
- [ ] Day 1-2: API路由开发（/api/contract/analyze）
- [ ] Day 3-4: 前端上传页面 + 结果展示页面
- [ ] Day 5: 免费额度管理系统
- [ ] Day 6-7: 测试 + Bug修复

### Week 3: 律师访谈与规则优化
- [ ] 完成3场律师深度访谈（使用访谈指南）
- [ ] 萃取访谈内容为20+条规则
- [ ] 补充协商话术库
- [ ] 优化规则引擎准确率

### Week 4: MVP上线与验证
- [ ] 邀请10位真实用户测试
- [ ] 收集反馈并快速迭代
- [ ] 准备第二版功能开发

---

## 九、总结

本技术架构设计实现了以下目标：

✅ **充分复用现有基础设施**（减少60%开发工作）:
- AICallProxy（统一AI调用）
- DeeChatAIClient（成本优化）
- OCR服务（文档处理）
- 苏格拉底对话引擎（交易目的询问）

✅ **DDD领域驱动设计**:
- 清晰的领域边界（contract-analysis domain）
- 聚合根（Contract）和值对象（Clause, RiskLevel）
- 领域服务（ContractParsingService等5个核心服务）
- 基础设施层隔离（AICallProxy, OCR）

✅ **成本可控**:
- 规则引擎优先（80%风险识别成本为0）
- AI调用严格限流（免费版3次/月）
- Token优化策略（DeepSeek模型）
- 预计成本：0.009元/用户

✅ **快速MVP验证**:
- 2周开发周期（Week 1-2）
- 核心功能完整（解析+6大条款+风险识别）
- 免费版满足80%用户需求

✅ **可持续迭代**:
- 律师访谈驱动的规则库优化
- 用户反馈闭环
- 清晰的V2路线图（协商策略+交易目的询问）

下一步，准备开始律师访谈提纲的编写，并更新战略讨论文档。
