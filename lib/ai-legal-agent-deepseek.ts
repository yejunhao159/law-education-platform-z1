/**
 * DeepSeek API集成 - 法律文书智能分析器
 * 使用DeepSeek的AI模型进行深度分析
 * Based on Andrew Ng's Data-Centric AI approach
 */

export interface AIExtractedElements {
  facts: {
    summary: string;
    timeline: Array<{
      date: string;
      event: string;
      importance: 'critical' | 'important' | 'normal';
      actors: string[];
    }>;
    keyFacts: string[];
    disputedFacts: string[];
  };
  
  evidence: {
    summary: string;
    items: Array<{
      name: string;
      type: '书证' | '物证' | '证人证言' | '鉴定意见' | '勘验笔录' | '视听资料' | '电子数据';
      submittedBy: '原告' | '被告' | '第三人';
      credibilityScore: number;
      relevanceScore: number;
      accepted: boolean;
      courtOpinion?: string;
    }>;
    chainAnalysis: {
      complete: boolean;
      missingLinks: string[];
      strength: 'strong' | 'moderate' | 'weak';
    };
  };
  
  reasoning: {
    summary: string;
    legalBasis: Array<{
      law: string;
      article: string;
      application: string;
    }>;
    logicChain: Array<{
      premise: string;
      inference: string;
      conclusion: string;
    }>;
    keyArguments: string[];
    judgment: string;
  };
  
  metadata: {
    confidence: number;
    processingTime: number;
    aiModel: string;
    extractionMethod: 'pure-ai' | 'hybrid' | 'rule-enhanced';
  };
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
   * 主入口：提取判决书三要素
   */
  async extractThreeElements(documentText: string): Promise<AIExtractedElements> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 使用DeepSeek AI进行深度分析...');
      
      // 并行执行三个专门的提取任务
      const [facts, evidence, reasoning] = await Promise.all([
        this.extractFacts(documentText),
        this.extractEvidence(documentText),
        this.extractReasoning(documentText)
      ]);
      
      return {
        facts,
        evidence,
        reasoning,
        metadata: {
          confidence: this.calculateConfidence(facts, evidence, reasoning),
          processingTime: Date.now() - startTime,
          aiModel: `DeepSeek-${this.model}`,
          extractionMethod: 'pure-ai'
        }
      };
    } catch (error) {
      console.error('DeepSeek AI extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * 提取案件事实
   */
  private async extractFacts(text: string): Promise<AIExtractedElements['facts']> {
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
      "actors": ["相关人员"]
    }
  ],
  "keyFacts": ["关键事实1", "关键事实2"],
  "disputedFacts": ["争议事实1", "争议事实2"]
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
  private async extractEvidence(text: string): Promise<AIExtractedElements['evidence']> {
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
      "name": "证据名称",
      "type": "书证/物证/证人证言/鉴定意见/勘验笔录/视听资料/电子数据",
      "submittedBy": "原告/被告/第三人",
      "credibilityScore": 90,
      "relevanceScore": 85,
      "accepted": true,
      "courtOpinion": "法院意见"
    }
  ],
  "chainAnalysis": {
    "complete": true,
    "missingLinks": ["缺失环节"],
    "strength": "strong/moderate/weak"
  }
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
  private async extractReasoning(text: string): Promise<AIExtractedElements['reasoning']> {
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
      "application": "如何应用"
    }
  ],
  "logicChain": [
    {
      "premise": "前提",
      "inference": "推理",
      "conclusion": "结论"
    }
  ],
  "keyArguments": ["论点1", "论点2"],
  "judgment": "判决结果"
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
  private async callDeepSeekAPI(prompt: string): Promise<any> {
    try {
      // 检查API Key
      if (!this.apiKey) {
        throw new Error('DeepSeek API Key未配置');
      }
      
      console.log('📡 调用DeepSeek API...');
      
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
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
        })
      });
      
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
      
    } catch (error) {
      console.error('调用DeepSeek API失败:', error);
      throw error;
    }
  }
  
  /**
   * 解析事实响应
   */
  private parseFactsResponse(response: any): AIExtractedElements['facts'] {
    if (!response || typeof response === 'string') {
      // 如果是字符串或null，返回默认值
      return this.getDefaultFacts();
    }
    
    return {
      summary: response.summary || '暂无摘要',
      timeline: Array.isArray(response.timeline) ? response.timeline : [],
      keyFacts: Array.isArray(response.keyFacts) ? response.keyFacts : [],
      disputedFacts: Array.isArray(response.disputedFacts) ? response.disputedFacts : []
    };
  }
  
  /**
   * 解析证据响应
   */
  private parseEvidenceResponse(response: any): AIExtractedElements['evidence'] {
    if (!response || typeof response === 'string') {
      return this.getDefaultEvidence();
    }
    
    return {
      summary: response.summary || '暂无摘要',
      items: Array.isArray(response.items) ? response.items.map((item: any) => ({
        name: item.name || '未知证据',
        type: item.type || '书证',
        submittedBy: item.submittedBy || '原告',
        credibilityScore: item.credibilityScore || 50,
        relevanceScore: item.relevanceScore || 50,
        accepted: item.accepted !== false,
        courtOpinion: item.courtOpinion
      })) : [],
      chainAnalysis: {
        complete: response.chainAnalysis?.complete || false,
        missingLinks: response.chainAnalysis?.missingLinks || [],
        strength: response.chainAnalysis?.strength || 'moderate'
      }
    };
  }
  
  /**
   * 解析裁判理由响应
   */
  private parseReasoningResponse(response: any): AIExtractedElements['reasoning'] {
    if (!response || typeof response === 'string') {
      return this.getDefaultReasoning();
    }
    
    return {
      summary: response.summary || '暂无摘要',
      legalBasis: Array.isArray(response.legalBasis) ? response.legalBasis : [],
      logicChain: Array.isArray(response.logicChain) ? response.logicChain : [],
      keyArguments: Array.isArray(response.keyArguments) ? response.keyArguments : [],
      judgment: response.judgment || ''
    };
  }
  
  /**
   * 默认事实结构
   */
  private getDefaultFacts(): AIExtractedElements['facts'] {
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
  private getDefaultEvidence(): AIExtractedElements['evidence'] {
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
  private getDefaultReasoning(): AIExtractedElements['reasoning'] {
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
 * 导出默认使用DeepSeek的LegalAIAgent
 */
export class LegalAIAgent extends DeepSeekLegalAgent {
  constructor(apiKey?: string) {
    super(apiKey);
    console.log('📘 使用DeepSeek AI服务');
  }
}