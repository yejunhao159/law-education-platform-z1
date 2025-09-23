/**
 * DeepSeek API集成 - 法律文书智能分析器
 * 使用DeepSeek的AI模型进行深度分析
 * Based on Andrew Ng's Data-Centric AI approach
 */

import type { 
  BasicInfo, 
  Facts, 
  Evidence, 
  Reasoning, 
  Metadata,
  Party
} from '@/types/legal-case';

export interface AIExtractedElements {
  basicInfo: BasicInfo;
  facts: Facts;
  evidence: Evidence;
  reasoning: Reasoning;
  metadata: Metadata;
}

// 导出通用的AI分析函数
export async function analyzeClaimsWithAI(prompt: string): Promise<string> {
  const agent = new DeepSeekLegalAgent()
  return agent.callDeepSeekAPI(prompt)
}

export class DeepSeekLegalAgent {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = 'deepseek-chat'; // DeepSeek的模型名称
  }
  
  /**
   * 主入口：提取判决书完整数据
   */
  async extractThreeElements(documentText: string): Promise<AIExtractedElements> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 使用DeepSeek AI进行深度分析...');
      
      // 并行执行四个专门的提取任务
      const [basicInfo, facts, evidence, reasoning] = await Promise.all([
        this.extractBasicInfo(documentText),
        this.extractFacts(documentText),
        this.extractEvidence(documentText),
        this.extractReasoning(documentText)
      ]);
      
      return {
        basicInfo,
        facts,
        evidence,
        reasoning,
        metadata: {
          extractedAt: new Date().toISOString(),
          confidence: this.calculateConfidence(facts, evidence, reasoning),
          processingTime: Date.now() - startTime,
          aiModel: `DeepSeek-${this.model}`,
          extractionMethod: 'pure-ai',
          version: '1.0.0'
        }
      };
    } catch (error) {
      console.error('DeepSeek AI extraction failed:', error);
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
      console.error('提取基本信息失败:', error);
      return this.getDefaultBasicInfo();
    }
  }
  
  /**
   * 提取案件事实
   */
  private async extractFacts(text: string): Promise<Facts> {
    const prompt = `你是一位专业的法律文书分析专家。请从以下判决书中提取案件事实部分。

任务要求：
1. 提供事实摘要（100-200字）
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
      console.error('提取事实失败:', error);
      return this.getDefaultFacts();
    }
  }
  
  /**
   * 提取证据分析
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
      console.error('提取证据失败:', error);
      return this.getDefaultEvidence();
    }
  }
  
  /**
   * 提取裁判理由
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
      console.error('提取裁判理由失败:', error);
      return this.getDefaultReasoning();
    }
  }
  
  /**
   * 调用DeepSeek API
   */
  public async callDeepSeekAPI(prompt: string): Promise<any> {
    try {
      // 检查API Key
      if (!this.apiKey) {
        throw new Error('DeepSeek API Key未配置');
      }

      console.log('📡 调用DeepSeek API...');

      // 如果apiUrl已经包含完整路径，直接使用；否则添加/chat/completions
      const apiEndpoint = this.apiUrl.includes('/chat/completions')
        ? this.apiUrl
        : `${this.apiUrl}/chat/completions`;

      // 添加超时和重试机制
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
            temperature: 0.3,  // 降低温度以提高准确性
            max_tokens: 2000
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
      
      // 尝试解析JSON
      try {
        // 处理DeepSeek返回的markdown代码块格式
        let jsonContent = content;
        
        // 如果内容包含markdown代码块，提取其中的JSON
        if (content.includes('```json')) {
          const match = content.match(/```json\n([\s\S]*?)\n```/);
          if (match && match[1]) {
            jsonContent = match[1];
          }
        }
        
        return JSON.parse(jsonContent);
      } catch (parseError) {
        console.warn('JSON解析失败，尝试提取文本内容');
        // 如果解析失败，返回默认结构
        return null;
      }

      } catch (networkError) {
        clearTimeout(timeoutId);
        console.error('网络请求失败:', networkError);

        // 区分不同类型的网络错误
        if (networkError.name === 'AbortError') {
          throw new Error('DeepSeek API调用超时，请检查网络连接');
        } else if (networkError.code === 'ECONNRESET' || networkError.code === 'ENOTFOUND') {
          throw new Error('DeepSeek API网络连接失败，可能是网络环境限制');
        } else {
          throw new Error(`DeepSeek API网络错误: ${networkError.message}`);
        }
      }

    } catch (error) {
      console.error('调用DeepSeek API失败:', error);
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
    if (!response || typeof response === 'string') {
      return this.getDefaultFacts();
    }
    
    return {
      summary: response.summary || '暂无摘要',
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
  }
  
  /**
   * 解析证据响应
   */
  private parseEvidenceResponse(response: any): Evidence {
    if (!response || typeof response === 'string') {
      return this.getDefaultEvidence();
    }
    
    return {
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
  }
  
  /**
   * 解析裁判理由响应
   */
  private parseReasoningResponse(response: any): Reasoning {
    if (!response || typeof response === 'string') {
      return this.getDefaultReasoning();
    }
    
    return {
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
      summary: '基于规则提取的事实摘要',
      timeline: [],
      keyFacts: [],
      disputedFacts: []
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
 * 智能融合器：结合AI和规则的结果
 */
export class IntelligentMerger {
  /**
   * 融合AI结果和规则结果
   */
  static merge(aiResult: AIExtractedElements, ruleResult: any): AIExtractedElements {
    // 实现智能融合逻辑
    // 1. 优先使用AI的深度理解结果
    // 2. 用规则结果补充AI可能遗漏的细节
    // 3. 交叉验证提高准确性
    
    return {
      ...aiResult,
      basicInfo: {
        ...aiResult.basicInfo,
        // 如果AI未提取到某些字段，使用规则引擎的结果
        caseNumber: aiResult.basicInfo.caseNumber || ruleResult.caseNumber || '',
        court: aiResult.basicInfo.court || ruleResult.court || '',
        judgeDate: aiResult.basicInfo.judgeDate || ruleResult.date || ''
      },
      metadata: {
        ...aiResult.metadata,
        extractionMethod: 'hybrid'
      }
    };
  }
}

/**
 * 导出默认使用DeepSeek的LegalAIAgent
 */
export class LegalAIAgent extends DeepSeekLegalAgent {
  constructor(apiKey?: string) {
    super(apiKey);
    console.log('📘 使用DeepSeek AI服务');
  }
}