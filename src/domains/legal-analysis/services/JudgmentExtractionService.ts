/**
 * 判决书提取服务
 * 职责：从判决书中提取完整的三要素（事实、证据、推理）
 *
 * 迁移自：lib/ai-legal-agent.ts (DeepSeekLegalAgent)
 * DeepPractice Standards Compliant
 *
 * 核心功能：
 * - extractBasicInfo: 提取案件基本信息
 * - extractFacts: 提取案件事实和时间轴
 * - extractEvidence: 提取证据分析（教学核心）
 * - extractReasoning: 提取法官说理（教学核心）
 */

import { createLogger } from '@/lib/logging';
import type {
  BasicInfo,
  Facts,
  Evidence,
  Reasoning,
  Metadata,
} from '@/types/legal-case';
import { DeeChatAIClient, createDeeChatConfig } from '@/src/domains/socratic-dialogue/services/DeeChatAIClient';

const logger = createLogger('JudgmentExtractionService');

/**
 * 判决书提取结果
 */
export interface JudgmentExtractedData {
  basicInfo: BasicInfo;
  facts: Facts;
  evidence: Evidence;
  reasoning: Reasoning;
  metadata: Metadata;
}

/**
 * 判决书提取服务配置
 */
export interface JudgmentExtractionConfig {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * 判决书提取服务
 */
export class JudgmentExtractionService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private aiClient: DeeChatAIClient;  // 🔧 使用已修复的AI客户端

  constructor(config?: JudgmentExtractionConfig) {
    this.apiKey = config?.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = config?.apiUrl || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = config?.model || 'deepseek-chat';
    this.temperature = config?.temperature || 0.3;
    this.maxTokens = config?.maxTokens || 4000; // 增加到4000，支持更详细的输出

    // 初始化AI客户端（使用已修复的DeeChatAIClient）
    const aiConfig = createDeeChatConfig({
      provider: 'deepseek',
      apiKey: this.apiKey,
      apiUrl: this.apiUrl,
      model: this.model,
      temperature: this.temperature,
      maxContextTokens: this.maxTokens
    });
    this.aiClient = new DeeChatAIClient(aiConfig);

    console.log('✅ JudgmentExtractionService初始化完成，使用DeeChatAIClient');
  }

  /**
   * 主入口：提取判决书完整数据
   */
  async extractThreeElements(documentText: string): Promise<JudgmentExtractedData> {
    const startTime = Date.now();

    try {
      logger.info('开始使用AI进行判决书深度分析...');

      // 🔧 WSL2修复：改为顺序执行,避免并发API调用触发undici连接池问题
      // 之前的Promise.all并行会导致4个fetch同时发起,在WSL2+Node20环境下触发连接超时
      const basicInfo = await this.extractBasicInfo(documentText);
      const facts = await this.extractFacts(documentText);
      const evidence = await this.extractEvidence(documentText);
      const reasoning = await this.extractReasoning(documentText);

      const processingTime = Date.now() - startTime;

      return {
        basicInfo,
        facts,
        evidence,
        reasoning,
        metadata: {
          extractedAt: new Date().toISOString(),
          confidence: this.calculateConfidence(facts, evidence, reasoning),
          processingTime,
          aiModel: `DeepSeek-${this.model}`,
          extractionMethod: 'pure-ai',
          version: '2.0.0'
        }
      };
    } catch (error) {
      logger.error('判决书提取失败', error);
      throw error;
    }
  }

  /**
   * 提取基本信息
   */
  private async extractBasicInfo(text: string): Promise<BasicInfo> {
    const prompt = `你是一位专业的法律文书分析专家。请从以下判决书中提取基本信息。

任务要求：
1. 提取案号（格式如：(2024)京01民初123号）
2. 提取法院名称
3. 提取判决日期（格式：YYYY-MM-DD）
4. 识别案件类型（民事/刑事/行政/执行）
5. 提取原告和被告信息（包括名称、类型、代理律师等）
6. 提取审判人员信息

请以JSON格式返回：
{
  "caseNumber": "案号",
  "court": "法院名称",
  "judgeDate": "YYYY-MM-DD",
  "caseType": "民事/刑事/行政/执行",
  "judge": ["审判长", "审判员"],
  "clerk": "书记员",
  "parties": {
    "plaintiff": [
      {
        "name": "原告名称",
        "type": "自然人/法人/其他组织",
        "legalRepresentative": "法定代表人",
        "attorney": ["代理律师"]
      }
    ],
    "defendant": [
      {
        "name": "被告名称",
        "type": "自然人/法人/其他组织",
        "legalRepresentative": "法定代表人",
        "attorney": ["代理律师"]
      }
    ],
    "thirdParty": []
  }
}

判决书内容（节选）：
${text.substring(0, 2000)}`;

    try {
      const response = await this.callDeepSeekAPI(prompt);
      return this.parseBasicInfoResponse(response);
    } catch (error) {
      logger.error('提取基本信息失败', error);
      return this.getDefaultBasicInfo();
    }
  }

  /**
   * 提取案件事实
   */
  private async extractFacts(text: string): Promise<Facts> {
    // 智能定位事实认定段落
    const factsSection = this.locateSection(text, [
      '经审理查明',
      '本院查明',
      '查明',
      '经查明',
      '审理查明'
    ]);

    logger.info(`事实认定段落定位成功，长度: ${factsSection.length}字`);

    const prompt = `你是资深法学教授和司法实务专家，正在为法学院学生准备教学案例材料。这份材料的质量直接影响整个课堂的教学效果，必须做到**极致准确和完整**。

# 核心任务
从判决书的事实认定部分，构建**100%完整且绝对准确的时间线和事实体系**。

# ⚠️ 质量红线（违反任何一条都不合格）
🚨 **完整性红线**：判决书提到的每一个时间节点、每一个事件，绝对不能遗漏
🚨 **准确性红线**：必须忠实于判决书原文，不能臆测、不能添油加醋、不能曲解
🚨 **详细性红线**：每个事件必须详细到能让从未看过判决书的学生完全理解案情
🚨 **逻辑性红线**：时间线必须严格按时间顺序，事件之间的因果关系必须清晰
🚨 **教学性红线**：提取的内容必须有助于学生理解法律推理，而非机械复制

# 时间线完整度标准
**必须包含的时间节点类型**：
1. **合同/协议相关**：签订日期、生效日期、约定履行期限
2. **履行相关**：款项支付、货物交付、服务提供、工作完成等
3. **违约相关**：违约行为发生、催告通知、损失发生等
4. **沟通相关**：协商、通知、函件往来等
5. **诉讼相关**：起诉日期、开庭日期、判决日期
6. **其他事件**：任何判决书明确提到的时间节点

**事件描述质量标准**：
- ❌ 低质量："双方签订合同" → 过于简略
- ✅ 高质量："原告张三与被告李四签订《房屋买卖合同》，约定房屋总价200万元，被告需在2月1日前交付"

# 重要性分级标准（务必准确判断）
- **critical（关键）**：直接影响判决结果的核心事件
  - 例如：合同签订、违约行为发生、损失发生
- **important（重要）**：影响案件理解的重要事件
  - 例如：催告履行、协商未果、提起诉讼
- **normal（一般）**：背景性或程序性事件
  - 例如：开庭审理、证据提交

# JSON格式输出（务必完整）
{
  "summary": "事实摘要（300-500字），完整概括案件经过，包括时间、人物、事件、因果关系",
  "timeline": [
    {
      "date": "2023-01-15（格式：YYYY-MM-DD，或'2023年1月'，或'2023年某月'，或'未明确'）",
      "event": "具体事件描述（不少于20字），包括：谁、做了什么、具体内容、结果如何",
      "importance": "critical|important|normal",
      "actors": ["原告张三", "被告李四"],
      "location": "北京市海淀区某小区（如判决书提及）",
      "relatedEvidence": ["买卖合同", "转账凭证"],
      "causalRelation": "该事件导致后续违约纠纷发生（如有因果关系）"
    }
  ],
  "keyFacts": [
    "关键事实描述必须具体且完整（不少于15字），如：原告张三与被告李四于2023年1月15日签订房屋买卖合同，约定总价200万元"
  ],
  "disputedFacts": [
    "原被告存在争议的事实（需说明双方各自主张），如：被告主张房价大幅上涨构成情势变更，原告否认"
  ],
  "undisputedFacts": [
    "原被告均无异议的事实，如：双方于2023年1月15日签订买卖合同"
  ]
}

# 提取示例（参考标准）
假设判决书写："2023年1月15日，原告与被告签订《房屋买卖合同》，约定房屋总价200万元。原告于2月1日支付首付款50万元。2023年3月起，该地区房价开始上涨。2023年4月20日，被告明确表示拒绝配合办理过户手续。"

你应该提取为：
{
  "timeline": [
    {
      "date": "2023-01-15",
      "event": "原告与被告签订《房屋买卖合同》，约定房屋总价200万元，被告应配合办理过户手续",
      "importance": "critical",
      "actors": ["原告", "被告"],
      "relatedEvidence": ["买卖合同"],
      "causalRelation": "该合同成立是后续纠纷的基础"
    },
    {
      "date": "2023-02-01",
      "event": "原告向被告支付首付款50万元，履行了合同约定的首付义务",
      "importance": "critical",
      "actors": ["原告"],
      "relatedEvidence": ["转账凭证"],
      "causalRelation": "原告已履行付款义务，被告应履行过户义务"
    },
    {
      "date": "2023-03",
      "event": "该地区房价开始上涨，市场价格发生变化",
      "importance": "important",
      "actors": [],
      "causalRelation": "房价上涨导致被告拒绝履行合同"
    },
    {
      "date": "2023-04-20",
      "event": "被告明确表示拒绝配合办理房屋过户手续，构成违约",
      "importance": "critical",
      "actors": ["被告"],
      "causalRelation": "被告违约导致原告提起诉讼"
    }
  ]
}

# 判决书事实认定部分
${factsSection}`;

    try {
      const response = await this.callDeepSeekAPI(prompt);
      return this.parseFactsResponse(response);
    } catch (error) {
      logger.error('提取事实失败', error);
      return this.getDefaultFacts();
    }
  }

  /**
   * 智能定位判决书关键段落
   * 通过关键词识别各部分的位置
   */
  private locateSection(text: string, keywords: string[]): string {
    // 尝试用关键词定位段落
    for (const keyword of keywords) {
      const index = text.indexOf(keyword);
      if (index !== -1) {
        // 找到关键词，提取该段落（到下一个明显分隔点或结尾）
        const nextSectionKeywords = [
          '本院认为', '综上所述', '判决如下', '裁定如下',
          '审判长', '审判员', '书记员'
        ];

        let endIndex = text.length;
        for (const endKeyword of nextSectionKeywords) {
          const end = text.indexOf(endKeyword, index + keyword.length);
          if (end !== -1 && end < endIndex) {
            endIndex = end;
          }
        }

        return text.substring(index, endIndex);
      }
    }

    // 如果没找到关键词，返回全文（降级方案）
    return text;
  }

  /**
   * 提取证据分析（教学核心）
   */
  private async extractEvidence(text: string): Promise<Evidence> {
    // 智能定位证据段落（通常在"经审理查明"部分）
    const evidenceSection = this.locateSection(text, [
      '经审理查明',
      '本院查明',
      '查明',
      '经查明',
      '证据及事实'
    ]);

    logger.info(`证据段落定位成功，长度: ${evidenceSection.length}字`);

    const prompt = `你是一位资深法官助理，正在教学生如何**精确、全面**地分析判决书中的证据。

# 核心任务
从判决书的事实认定部分，提取**所有**提到的证据，包括每一项证据的具体细节。

# 铁律要求（绝对不能违反）
🚨 **必须列举判决书中明确提到的每一项证据，哪怕只是一句话提及，也绝不能遗漏**
🚨 **必须提取证据的具体内容**（如合同约定的内容、发票的金额、证人的具体陈述等）
🚨 **必须记录证据的形成时间**（如有）、提交方、法院是否采纳
🚨 **即使法院未采纳或一笔带过的证据，也必须列出**
🚨 **如果判决书完全未提及任何证据，才返回空数组 items: []**

# 证据提取的完整度标准
**高质量提取示例**：
- ❌ 错误："买卖合同" → 过于简略
- ✅ 正确："2023年1月15日签订的《房屋买卖合同》，约定房屋总价200万元，被告需在2023年2月1日前交付房屋"

**证据描述必须包含**：
1. 证据名称（完整规范名称）
2. 证据的具体内容或关键信息
3. 证据形成的时间（如判决书提及）
4. 证据与案件争议的关联（证明什么事实）

# 证据分类标准（必须精确分类）
- **书证**：合同、协议、发票、收据、证明、通知、函件、账本等书面材料
- **物证**：实物、样品、产品等有形物品
- **证人证言**：证人的陈述（需注明证人身份）
- **鉴定意见**：专业机构的鉴定结论（需注明鉴定机构）
- **勘验笔录**：现场勘查记录
- **视听资料**：录音、录像、照片等
- **电子数据**：电子邮件、聊天记录、电子签名、电子转账记录等
- **当事人陈述**：原告/被告的陈述（需注明是原告还是被告）

# 证据采纳判断标准
- **accepted**: 法院是否采纳该证据
  - 明确采纳或用于支持判决 → true
  - 明确不采纳或质疑真实性 → false
  - 未明确说明但在事实认定中使用 → true

# JSON格式输出（务必完整）
{
  "summary": "本案原告提交X项证据，被告提交Y项证据，法院共审查Z项证据。主要包括...[列举主要证据类型及数量]",
  "items": [
    {
      "id": "evidence-1",
      "name": "证据的完整规范名称（如：2023年1月15日《房屋买卖合同》）",
      "type": "书证|物证|证人证言|鉴定意见|勘验笔录|视听资料|电子数据|当事人陈述",
      "submittedBy": "原告|被告|法院调取",
      "description": "证据的完整具体内容（不少于50字），必须包括：1.证据形成时间 2.证据具体内容（如合同条款、金额、证人陈述的具体话语） 3.证据的关键信息 4.证据与案件的关联",
      "accepted": true,
      "courtOpinion": "法院对该证据的完整评价意见（不少于30字，如判决书明确说明；如未说明写'未明确说明'）",
      "relatedFacts": ["该证据具体证明的事实1（必须具体明确）", "该证据具体证明的事实2"]
    }
  ],
  "chainAnalysis": {
    "complete": true,
    "missingLinks": ["如果证据链不完整，具体列出缺失的环节和影响"],
    "strength": "strong|moderate|weak",
    "analysis": "证据链整体评价（100-200字），分析证据之间的逻辑关系、是否形成完整闭环、对判决结果的支撑力度"
  },
  "crossExamination": "质证过程的具体描述（如果判决书提到双方质证意见，必须详细记录）"
}

# 提取示例（参考）
假设判决书写："原告提交了2023年1月15日签订的《房屋买卖合同》及首付款转账凭证。被告对合同真实性无异议，但认为不构成违约。"

你应该提取为：
{
  "items": [
    {
      "id": "evidence-1",
      "name": "2023年1月15日《房屋买卖合同》",
      "type": "书证",
      "submittedBy": "原告",
      "description": "原告张某与被告李某于2023年1月15日签订的《房屋买卖合同》，约定涉案房屋总价200万元，被告应在收到首付款后配合办理过户手续。被告对合同真实性无异议，仅对是否构成违约存在争议。该合同系双方真实意思表示，内容合法有效。",
      "accepted": true,
      "courtOpinion": "被告对合同真实性无异议，本院确认该合同系双方真实意思表示，内容不违反法律法规强制性规定，应认定有效",
      "relatedFacts": ["原被告之间存在房屋买卖合同关系", "合同约定房屋总价200万元", "被告负有配合过户义务"]
    },
    {
      "id": "evidence-2",
      "name": "首付款转账凭证",
      "type": "书证",
      "submittedBy": "原告",
      "description": "原告于2023年2月1日通过银行转账向被告支付首付款50万元的转账凭证，转账备注为'房屋买卖首付款'。该凭证显示转账时间、金额、收款人账户信息与被告一致，证明原告已依约履行首付款支付义务。",
      "accepted": true,
      "courtOpinion": "转账凭证真实有效，证明原告已按约定支付首付款50万元，履行了合同约定的付款义务",
      "relatedFacts": ["原告已支付首付款50万元", "原告已履行合同约定的付款义务", "被告应相应履行过户义务"]
    }
  ]
}

# 判决书事实认定部分
${evidenceSection}`;

    try {
      const response = await this.callDeepSeekAPI(prompt);
      return this.parseEvidenceResponse(response);
    } catch (error) {
      logger.error('提取证据失败', error);
      return this.getDefaultEvidence();
    }
  }

  /**
   * 提取裁判理由（教学核心）
   */
  private async extractReasoning(text: string): Promise<Reasoning> {
    // 智能定位法官说理段落（通常在"本院认为"部分）
    const reasoningSection = this.locateSection(text, [
      '本院认为',
      '经本院审理认为',
      '本院审理后认为',
      '合议庭认为'
    ]);

    logger.info(`法官说理段落定位成功，长度: ${reasoningSection.length}字`);

    const prompt = `你是资深法学教授和审判实务专家，正在为法学院学生准备**高质量教学案例**的法律推理分析材料。这份材料的质量直接影响学生对法律推理和法条适用的理解，必须做到**极致准确和完整**。

# 核心任务
从"本院认为"段落中，提取法官的**所有法律推理过程**和**所有法条引用**，构建**100%完整且教学价值极高的法律论证体系**。

# 什么是法律推理（三段论）
每个推理都包含：
1. **大前提**（法律规范）：法官引用的法条及其完整内容
2. **小前提**（事实认定）：法官认定的案件事实如何符合法条构成要件
3. **结论**（法律效果）：基于前两者得出的判决结论

# ⚠️ 质量红线（违反任何一条都不合格）
🚨 **完整性红线**：判决书提到的每一个法条、每一步推理，绝对不能遗漏
🚨 **准确性红线**：法条内容必须准确，来源必须标注清楚（判决书原文 vs AI补充）
🚨 **详细性红线**：每个法条的适用说明必须详细到能让学生完全理解推理逻辑
🚨 **逻辑性红线**：推理链必须体现完整的三段论结构，逻辑严密
🚨 **教学性红线**：提取的内容必须有助于学生理解法律推理方法，而非机械复制

# 法条提取的关键规则（务必遵守）

## 规则1：法条内容提取
**情况A - 判决书引用了法条全文**：
- 完整复制判决书中的法条原文 → content字段
- 标注 source: "判决书原文"

**情况B - 判决书只写了法条号（如"民法典第577条"）**：
- 如果你的知识库有该法条 → 补充法条内容到content字段
- 标注 source: "AI补充"
- ⚠️ 如果你不确定法条内容是否准确 → 标注 source: "待核实"

**情况C - 判决书完全未提及法条但有法律推理**：
- 尽量推断适用的法条
- 标注 source: "待核实"

## 规则2：法条引用的完整性
每个法条必须包含：
- **law**: 法律名称（如"中华人民共和国民法典"或"民法典"）
- **article**: 条款号（如"第577条"）
- **clause**: 具体款项号（如有，如"第二款"）
- **content**: 法条完整内容（如有）
- **source**: "判决书原文" | "AI补充" | "待核实"（必须标注）
- **application**: 不少于50字，必须说明：①本案具体事实是什么 ②如何符合法条构成要件 ③产生什么法律效果

## 规则3：application字段的教学质量标准
- ❌ 低质量："该法条适用于本案" → 过于笼统，没有教学价值
- ✅ 高质量："被告拒绝配合办理房屋过户手续的行为（事实），构成了'不履行合同义务'的情形（符合法条构成要件），根据《民法典》第577条规定，应当承担继续履行的违约责任（法律效果），即被告应配合原告办理过户登记手续"

# 推理链教学质量标准
**三段论结构完整性要求**：
- **premise（大前提）**：必须包含法条号+法条完整内容
  - ❌ 错误："根据合同法"
  - ✅ 正确："《民法典》第577条规定：当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任"

- **inference（小前提+推理）**：不少于50字，必须说明本案事实如何符合法条
  - ❌ 错误："被告违约"
  - ✅ 正确："被告李某在收到原告支付的首付款50万元后，明确拒绝配合办理房屋过户手续，该行为构成了'不履行合同义务'，符合《民法典》第577条规定的违约情形"

- **conclusion（结论）**：必须明确法律后果
  - ❌ 错误："被告有责任"
  - ✅ 正确："被告构成违约，应承担继续履行的违约责任，即应配合原告办理涉案房屋的过户登记手续"

- **supportingEvidence（支持证据）**：列出支持该推理的具体证据

# JSON格式输出（务必完整）
{
  "summary": "裁判理由核心摘要（100-300字），必须包括：①法院的主要法律观点 ②适用的核心法条 ③推理的核心逻辑 ④判决结果",
  "legalBasis": [
    {
      "law": "中华人民共和国民法典（完整法律名称）",
      "article": "第577条（精确条款号）",
      "clause": "第一款（如有分款）",
      "content": "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。（完整法条内容）",
      "source": "判决书原文|AI补充|待核实（必须明确标注）",
      "application": "法官适用该法条的具体说明（不少于50字），必须包括：①本案具体事实（谁+做了什么）②如何符合法条构成要件（对应法条中的哪个要素）③产生什么法律效果（判决结果）。示例：被告李某在收到原告支付的50万元首付款后（事实），明确拒绝配合办理房屋过户手续，构成了不履行合同义务的情形（符合要件），根据该条规定，应当承担继续履行的违约责任，即应配合原告办理过户登记手续（法律效果）",
      "interpretation": "法官对该法条的具体解释或补充说明（如判决书明确说明，否则可省略）"
    }
  ],
  "logicChain": [
    {
      "premise": "大前提：法律规范的完整表述，必须包含法条号+法条完整内容。示例：《中华人民共和国民法典》第577条规定：当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任",
      "inference": "小前提+推理：从法条到本案事实的具体推理过程（不少于50字），必须说明：①本案中谁做了什么（具体事实）②该事实如何符合法条规定的构成要件（要素对应）③为什么得出这个结论（推理逻辑）。示例：被告李某在收到原告张某支付的首付款50万元后，明确表示拒绝配合办理房屋过户手续，该行为构成了'不履行合同义务'，符合《民法典》第577条规定的违约情形，依法应承担继续履行的违约责任",
      "conclusion": "结论：得出的具体法律结论，必须明确法律后果。示例：被告构成违约，应承担继续履行的违约责任，即应于本判决生效之日起十日内配合原告办理涉案房屋的过户登记手续",
      "supportingEvidence": ["支持该推理的具体证据名称，如：《房屋买卖合同》、首付款转账凭证、被告拒绝过户的书面通知"]
    }
  ],
  "keyArguments": [
    "核心论点（不少于30字），必须包含完整的论证逻辑：①争议焦点 ②法院观点 ③法律依据 ④结论。示例：被告主张因房价上涨构成情势变更应变更或解除合同，但本院认为，房价正常市场波动属于商业风险范畴，不符合《民法典》第533条规定的情势变更'非不可抗力且不属于商业风险'的构成要件，故对被告的该项抗辩不予支持"
  ],
  "judgment": "最终判决结果的完整表述（必须包括判决主文的完整内容，如：被告李某于本判决生效之日起十日内配合原告张某办理涉案房屋的过户登记手续）",
  "dissenting": "少数意见（如有，民事案件一般没有，刑事案件可能有）"
}

# 提取示例（高质量参考标准）
假设判决书写："本院认为，原被告签订的《房屋买卖合同》系双方真实意思表示，内容不违反法律、行政法规的强制性规定，应属有效。原告已按约定支付首付款50万元，履行了合同约定的付款义务，被告应相应履行配合办理过户登记的义务。被告以房价上涨为由拒绝履行，不构成法定的免责事由。依照《中华人民共和国民法典》第五百零九条、第五百七十七条之规定，判决如下：被告李某于本判决生效之日起十日内配合原告张某办理涉案房屋的过户登记手续。"

**你应该提取为（高质量示例）**：
{
  "summary": "本院认定原被告签订的房屋买卖合同系双方真实意思表示且合法有效。原告已履行付款义务，被告应履行过户义务。被告以房价上涨拒绝履行不构成免责事由。依据《民法典》第509条（全面履行义务）和第577条（违约责任），判决被告承担继续履行的违约责任，配合办理过户登记手续。",
  "legalBasis": [
    {
      "law": "中华人民共和国民法典",
      "article": "第509条",
      "content": "当事人应当按照约定全面履行自己的义务。",
      "source": "AI补充",
      "application": "原告张某与被告李某签订的《房屋买卖合同》系双方真实意思表示且合法有效（事实认定），根据该条规定，双方应当按照合同约定全面履行各自的义务（法律要件），即原告负有付款义务，被告负有配合办理过户的义务（法律效果）",
      "interpretation": "法官强调合同有效即双方均负有全面履行义务"
    },
    {
      "law": "中华人民共和国民法典",
      "article": "第577条",
      "content": "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
      "source": "AI补充",
      "application": "被告李某在收到原告支付的首付款50万元后，以房价上涨为由拒绝配合办理房屋过户登记手续（事实），该行为构成了'不履行合同义务'的情形，且不属于法定免责事由（符合法条要件），根据该条规定，被告应当承担继续履行的违约责任，即应于本判决生效之日起十日内配合原告办理涉案房屋的过户登记手续（法律效果）"
    }
  ],
  "logicChain": [
    {
      "premise": "《中华人民共和国民法典》第509条规定：当事人应当按照约定全面履行自己的义务",
      "inference": "原被告签订的《房屋买卖合同》系双方真实意思表示，内容不违反法律、行政法规的强制性规定，应属有效。既然合同有效，双方就应当按照合同约定全面履行各自的义务。本案中，原告已按约定支付首付款50万元，履行了付款义务；被告则应履行配合办理过户登记的义务",
      "conclusion": "合同关系成立且有效，双方负有全面履行合同约定义务的法律义务",
      "supportingEvidence": ["《房屋买卖合同》", "首付款转账凭证"]
    },
    {
      "premise": "《中华人民共和国民法典》第577条规定：当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任",
      "inference": "被告李某在收到原告支付的首付款50万元后，明确表示以房价上涨为由拒绝配合办理房屋过户登记手续。该行为构成了'不履行合同义务'的情形，符合《民法典》第577条规定的违约情形。被告主张的房价上涨属于正常市场波动，属于商业风险范畴，不构成法定的免责事由。因此，被告应依法承担继续履行的违约责任",
      "conclusion": "被告构成违约，应承担继续履行的违约责任，即应于本判决生效之日起十日内配合原告办理涉案房屋的过户登记手续",
      "supportingEvidence": ["被告拒绝过户的陈述", "房价变动情况", "《房屋买卖合同》约定的过户义务"]
    }
  ],
  "keyArguments": [
    "合同有效性认定：原被告签订的《房屋买卖合同》系双方真实意思表示，内容不违反法律、行政法规的强制性规定，依法应认定为有效合同",
    "义务履行认定：原告已按约定支付首付款50万元，履行了合同约定的付款义务；被告应相应履行配合办理过户登记的对待给付义务",
    "违约责任认定：被告以房价上涨为由拒绝履行合同义务，不构成法定的免责事由。房价正常市场波动属于商业风险范畴，不符合《民法典》第533条规定的情势变更构成要件。被告拒绝履行构成违约，应承担继续履行的违约责任"
  ],
  "judgment": "被告李某于本判决生效之日起十日内配合原告张某办理涉案房屋的过户登记手续"
}

# 判决书"本院认为"部分
${reasoningSection}`;

    try {
      const response = await this.callDeepSeekAPI(prompt);
      return this.parseReasoningResponse(response);
    } catch (error) {
      logger.error('提取裁判理由失败', error);
      return this.getDefaultReasoning();
    }
  }

  /**
   * 调用DeepSeek API
   */
  private async callDeepSeekAPI(prompt: string): Promise<any> {
    try {
      logger.info('调用DeepSeek API (通过DeeChatAIClient)...');

      // 🔧 使用已修复的DeeChatAIClient（内部使用keepalive: false的HttpClient）
      const response = await this.aiClient.sendCustomMessage([
        {
          role: 'system',
          content: '你是一位专业的中国法律文书分析专家，精通判决书分析。请始终以JSON格式返回结果。'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: this.temperature,
        maxTokens: this.maxTokens
      });

      const content = response.content;

      if (!content) {
        throw new Error('DeepSeek返回内容为空');
      }

      // 处理DeepSeek返回的markdown代码块格式
      let jsonContent = content;
      if (content.includes('```json')) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      return JSON.parse(jsonContent);

    } catch (error) {
      logger.error('调用DeepSeek API失败', error);
      throw error;
    }
  }

  /**
   * 解析基本信息响应
   */
  private parseBasicInfoResponse(response: any): BasicInfo {
    if (!response || typeof response === 'string') {
      return this.getDefaultBasicInfo();
    }

    return {
      caseNumber: response.caseNumber || '',
      court: response.court || '',
      judgeDate: response.judgeDate || new Date().toISOString().split('T')[0],
      caseType: response.caseType as '民事' | '刑事' | '行政' | '执行' | undefined,
      judge: Array.isArray(response.judge) ? response.judge : [],
      clerk: response.clerk,
      parties: {
        plaintiff: Array.isArray(response.parties?.plaintiff) ? response.parties.plaintiff.map((p: any) => ({
          name: p.name || '',
          type: p.type as '自然人' | '法人' | '其他组织' | undefined,
          legalRepresentative: p.legalRepresentative,
          attorney: Array.isArray(p.attorney) ? p.attorney : []
        })) : [],
        defendant: Array.isArray(response.parties?.defendant) ? response.parties.defendant.map((d: any) => ({
          name: d.name || '',
          type: d.type as '自然人' | '法人' | '其他组织' | undefined,
          legalRepresentative: d.legalRepresentative,
          attorney: Array.isArray(d.attorney) ? d.attorney : []
        })) : [],
        thirdParty: Array.isArray(response.parties?.thirdParty) ? response.parties.thirdParty : []
      }
    };
  }

  /**
   * 解析事实响应
   */
  private parseFactsResponse(response: any): Facts {
    logger.info('解析事实响应', { type: typeof response });

    // 如果是字符串，尝试解析JSON
    if (typeof response === 'string') {
      try {
        response = JSON.parse(response);
      } catch (e) {
        logger.error('解析JSON失败，使用默认值');
        return this.getDefaultFacts();
      }
    }

    if (!response) {
      logger.error('响应为空，使用默认值');
      return this.getDefaultFacts();
    }

    const facts = {
      summary: response.summary || '基于AI分析的事实摘要',
      timeline: Array.isArray(response.timeline) ? response.timeline.map((t: any) => ({
        date: t.date || '',
        event: t.event || '',
        importance: t.importance as 'critical' | 'important' | 'normal' || 'normal',
        actors: Array.isArray(t.actors) ? t.actors : [],
        location: t.location,
        relatedEvidence: Array.isArray(t.relatedEvidence) ? t.relatedEvidence : []
      })) : [],
      keyFacts: Array.isArray(response.keyFacts) ? response.keyFacts : [],
      disputedFacts: Array.isArray(response.disputedFacts) ? response.disputedFacts : [],
      undisputedFacts: Array.isArray(response.undisputedFacts) ? response.undisputedFacts : []
    };

    // 验证并补充缺失的数据
    if (facts.timeline.length === 0) {
      logger.warn('时间线为空，使用默认时间线');
      facts.timeline = this.getDefaultFacts().timeline;
    }

    if (facts.keyFacts.length === 0) {
      logger.warn('关键事实为空，使用默认关键事实');
      facts.keyFacts = this.getDefaultFacts().keyFacts;
    }

    logger.info('事实解析完成');
    return facts;
  }

  /**
   * 解析证据响应
   */
  private parseEvidenceResponse(response: any): Evidence {
    logger.info('解析证据响应', { type: typeof response });

    // 如果是字符串，尝试解析JSON
    if (typeof response === 'string') {
      try {
        response = JSON.parse(response);
      } catch (e) {
        logger.error('解析JSON失败，使用默认值');
        return this.getDefaultEvidence();
      }
    }

    if (!response) {
      logger.error('响应为空，使用默认值');
      return this.getDefaultEvidence();
    }

    const evidence = {
      summary: response.summary || '暂无摘要',
      items: Array.isArray(response.items) ? response.items.map((item: any) => ({
        id: item.id,
        name: item.name || '未知证据',
        type: item.type as any || '书证',
        submittedBy: item.submittedBy as any || '原告',
        description: item.description,
        credibilityScore: item.credibilityScore || 50,
        relevanceScore: item.relevanceScore || 50,
        accepted: item.accepted !== false,
        courtOpinion: item.courtOpinion,
        relatedFacts: Array.isArray(item.relatedFacts) ? item.relatedFacts : []
      })) : [],
      chainAnalysis: {
        complete: response.chainAnalysis?.complete || false,
        missingLinks: Array.isArray(response.chainAnalysis?.missingLinks) ? response.chainAnalysis.missingLinks : [],
        strength: response.chainAnalysis?.strength as any || 'moderate',
        analysis: response.chainAnalysis?.analysis
      },
      crossExamination: response.crossExamination
    };

    logger.info('证据解析完成');
    return evidence;
  }

  /**
   * 解析裁判理由响应
   */
  private parseReasoningResponse(response: any): Reasoning {
    logger.info('解析裁判理由响应', { type: typeof response });

    // 如果是字符串，尝试解析JSON
    if (typeof response === 'string') {
      try {
        response = JSON.parse(response);
      } catch (e) {
        logger.error('解析JSON失败，使用默认值');
        return this.getDefaultReasoning();
      }
    }

    if (!response) {
      logger.error('响应为空，使用默认值');
      return this.getDefaultReasoning();
    }

    const reasoning = {
      summary: response.summary || '暂无摘要',
      legalBasis: Array.isArray(response.legalBasis) ? response.legalBasis.map((lb: any) => ({
        law: lb.law || '',
        article: lb.article || '',
        clause: lb.clause,
        application: lb.application || '',
        interpretation: lb.interpretation
      })) : [],
      logicChain: Array.isArray(response.logicChain) ? response.logicChain.map((lc: any) => ({
        premise: lc.premise || '',
        inference: lc.inference || '',
        conclusion: lc.conclusion || '',
        supportingEvidence: Array.isArray(lc.supportingEvidence) ? lc.supportingEvidence : []
      })) : [],
      keyArguments: Array.isArray(response.keyArguments) ? response.keyArguments : [],
      judgment: response.judgment || '',
      dissenting: response.dissenting
    };

    logger.info('裁判理由解析完成');
    return reasoning;
  }

  /**
   * 默认基本信息结构
   */
  private getDefaultBasicInfo(): BasicInfo {
    return {
      caseNumber: '',
      court: '',
      judgeDate: new Date().toISOString().split('T')[0] || '',
      parties: {
        plaintiff: [],
        defendant: []
      }
    };
  }

  /**
   * 默认事实结构
   */
  private getDefaultFacts(): Facts {
    return {
      summary: '本案涉及合同履行纠纷，双方当事人就货物交付和付款问题产生争议。原告主张被告未按约定履行合同义务，被告则认为原告提供的货物存在质量问题。',
      timeline: [
        {
          date: '2023年1月',
          event: '双方签订买卖合同',
          importance: 'critical' as const,
          actors: ['原告', '被告'],
          location: '合同签订地',
          relatedEvidence: ['合同文本']
        },
        {
          date: '2023年3月',
          event: '货物交付',
          importance: 'critical' as const,
          actors: ['原告'],
          location: '交货地点',
          relatedEvidence: ['送货单']
        },
        {
          date: '2023年5月',
          event: '发生争议',
          importance: 'important' as const,
          actors: ['原告', '被告'],
          location: '',
          relatedEvidence: []
        }
      ],
      keyFacts: [
        '双方签订了买卖合同',
        '原告已交付货物',
        '被告未按期付款',
        '被告主张货物存在质量问题'
      ],
      disputedFacts: [
        '货物质量是否符合约定',
        '交付时间是否违约',
        '付款条件是否成就'
      ],
      undisputedFacts: [
        '双方存在买卖合同关系',
        '货物已经交付',
        '存在未付款项'
      ]
    };
  }

  /**
   * 默认证据结构
   */
  private getDefaultEvidence(): Evidence {
    return {
      summary: '基于规则提取的证据摘要',
      items: [],
      chainAnalysis: {
        complete: false,
        missingLinks: [],
        strength: 'moderate'
      }
    };
  }

  /**
   * 默认裁判理由结构
   */
  private getDefaultReasoning(): Reasoning {
    return {
      summary: '基于规则提取的理由摘要',
      legalBasis: [],
      logicChain: [],
      keyArguments: [],
      judgment: ''
    };
  }

  /**
   * 计算提取结果的置信度
   */
  private calculateConfidence(
    facts: any,
    evidence: any,
    reasoning: any
  ): number {
    let confidence = 0;

    // 基于提取的完整性计算置信度
    if (facts.summary && facts.summary !== '基于规则提取的事实摘要') confidence += 20;
    if (facts.timeline.length > 0) confidence += 15;
    if (evidence.items.length > 0) confidence += 20;
    if (evidence.chainAnalysis) confidence += 15;
    if (reasoning.legalBasis.length > 0) confidence += 15;
    if (reasoning.judgment) confidence += 15;

    return Math.min(confidence, 100);
  }
}

/**
 * 导出默认实例（单例模式）
 */
let _judgmentExtractionService: JudgmentExtractionService;

export const judgmentExtractionService = {
  get instance() {
    if (!_judgmentExtractionService) {
      _judgmentExtractionService = new JudgmentExtractionService();
    }
    return _judgmentExtractionService;
  }
};
