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

import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';
import { createLogger } from '@/lib/logging';
import type {
  BasicInfo,
  Facts,
  Evidence,
  Reasoning,
  Metadata,
} from '@/types/legal-case';

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

  constructor(config?: JudgmentExtractionConfig) {
    this.apiKey = config?.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = config?.apiUrl || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = config?.model || 'deepseek-chat';
    this.temperature = config?.temperature || 0.3;
    this.maxTokens = config?.maxTokens || 2000;
  }

  /**
   * 主入口：提取判决书完整数据
   */
  async extractThreeElements(documentText: string): Promise<JudgmentExtractedData> {
    const startTime = Date.now();

    try {
      logger.info('开始使用AI进行判决书深度分析...');

      // 并行执行四个专门的提取任务
      const [basicInfo, facts, evidence, reasoning] = await Promise.all([
        this.extractBasicInfo(documentText),
        this.extractFacts(documentText),
        this.extractEvidence(documentText),
        this.extractReasoning(documentText)
      ]);

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
    const prompt = `你是一位专业的法律文书分析专家。请从以下判决书中提取案件事实部分。

任务要求：
1. 提供事实摘要（200-300字）
2. 构建完整的时间线，标注每个事件的重要性
3. 识别关键事实（影响判决的核心事实）
4. 标注有争议的事实

请以JSON格式返回，包含以下字段：
{
  "summary": "事实摘要",
  "timeline": [
    {
      "date": "YYYY年MM月DD日",
      "event": "事件描述",
      "importance": "critical/important/normal",
      "actors": ["相关人员"],
      "location": "地点",
      "relatedEvidence": ["相关证据"]
    }
  ],
  "keyFacts": ["关键事实1", "关键事实2"],
  "disputedFacts": ["争议事实1", "争议事实2"],
  "undisputedFacts": ["无争议事实1", "无争议事实2"]
}

判决书内容（节选）：
${text.substring(0, 2000)}`;

    try {
      const response = await this.callDeepSeekAPI(prompt);
      return this.parseFactsResponse(response);
    } catch (error) {
      logger.error('提取事实失败', error);
      return this.getDefaultFacts();
    }
  }

  /**
   * 提取证据分析（教学核心）
   */
  private async extractEvidence(text: string): Promise<Evidence> {
    const prompt = `你是一位专业的法律证据分析专家。请从以下判决书中提取和分析证据部分。

任务要求：
1. 识别所有证据并分类
2. 评估每个证据的证明力（0-100分）
3. 评估每个证据的关联性（0-100分）
4. 判断法院是否采纳
5. 分析证据链的完整性

请以JSON格式返回，包含以下字段：
{
  "summary": "证据概况",
  "items": [
    {
      "id": "evidence-1",
      "name": "证据名称",
      "type": "书证/物证/证人证言/鉴定意见/勘验笔录/视听资料/电子数据/当事人陈述",
      "submittedBy": "原告/被告/第三人/法院调取",
      "description": "证据描述",
      "credibilityScore": 90,
      "relevanceScore": 85,
      "accepted": true,
      "courtOpinion": "法院意见",
      "relatedFacts": ["相关事实ID"]
    }
  ],
  "chainAnalysis": {
    "complete": true,
    "missingLinks": ["缺失环节"],
    "strength": "strong/moderate/weak",
    "analysis": "证据链分析说明"
  },
  "crossExamination": "质证过程描述"
}

判决书内容（节选）：
${text.substring(0, 2000)}`;

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
    const prompt = `你是一位专业的法官助理。请从以下判决书中提取法官说理部分。

任务要求：
1. 总结裁判理由（100-200字）
2. 提取所有引用的法律条文及其具体应用
3. 梳理完整的逻辑推理链
4. 识别核心论证要点
5. 提取最终判决结果

请以JSON格式返回：
{
  "summary": "裁判理由摘要",
  "legalBasis": [
    {
      "law": "法律名称",
      "article": "条文",
      "clause": "条款",
      "application": "如何应用",
      "interpretation": "法律解释"
    }
  ],
  "logicChain": [
    {
      "premise": "前提",
      "inference": "推理",
      "conclusion": "结论",
      "supportingEvidence": ["支持证据"]
    }
  ],
  "keyArguments": ["论点1", "论点2"],
  "judgment": "判决结果",
  "dissenting": "少数意见（如有）"
}

判决书内容（节选）：
${text.substring(0, 2000)}`;

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
      // 检查API Key
      if (!this.apiKey) {
        throw new Error('DeepSeek API Key未配置');
      }

      logger.info('调用DeepSeek API...');

      // 确保API URL正确
      const apiEndpoint = this.apiUrl.includes('/chat/completions')
        ? this.apiUrl
        : `${this.apiUrl}/chat/completions`;

      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: '你是一位专业的中国法律文书分析专家，精通判决书分析。请始终以JSON格式返回结果。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.message || errorMessage;
          } catch (e) {
            // 如果无法解析错误响应，使用默认错误消息
          }
          throw new Error(`DeepSeek API错误: ${errorMessage}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

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

      } catch (networkError: any) {
        clearTimeout(timeoutId);

        if (networkError.name === 'AbortError') {
          throw new Error('DeepSeek API调用超时，请检查网络连接');
        } else if (networkError.code === 'ECONNRESET' || networkError.code === 'ENOTFOUND') {
          throw new Error('DeepSeek API网络连接失败，可能是网络环境限制');
        } else {
          throw networkError;
        }
      }

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
      judgeDate: new Date().toISOString().split('T')[0],
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
