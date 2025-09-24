/**
 * 时间轴分析应用服务
 * 核心业务逻辑，从API层分离
 * DeepPractice Standards Compliant
 */

import { DocumentPreprocessor } from '../intelligence/preprocessor';
import { RuleExtractor } from '../intelligence/rule-extractor';
import { SmartMerger } from '../intelligence/smart-merger';
import { ProvisionMapper } from '../intelligence/provision-mapper';

import {
  TimelineAnalysisRequest,
  TimelineAnalysisResponse,
  TimelineAnalysis,
  TimelineEvent,
  TurningPoint,
  BehaviorPattern,
  EvidenceChainAnalysis,
  LegalRisk,
  CasePrediction,
  AnalysisType,
  TimelineErrorCode,
  ProcessedDocument,
  AITimelineRequest,
  AITimelineResponse
} from './types/TimelineTypes';

export class TimelineAnalysisApplicationService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  /**
   * 主要业务流程：时间轴智能分析
   */
  async analyzeTimeline(request: TimelineAnalysisRequest): Promise<TimelineAnalysisResponse> {
    const startTime = Date.now();

    try {
      console.log('🚀 开始时间轴智能分析...');

      // Step 1: 验证输入
      this.validateRequest(request);

      // Step 2: 预处理事件数据
      const processedDoc = this.preprocessEvents(request.events);

      // Step 3: 规则分析
      const ruleAnalysis = this.performRuleAnalysis(processedDoc);

      // Step 4: AI增强分析（如果启用）
      const aiAnalysis = await this.performAIAnalysis(processedDoc, request);

      // Step 5: 合并分析结果
      const combinedAnalysis = this.combineAnalysisResults(ruleAnalysis, aiAnalysis);

      // Step 6: 生成时间轴分析
      const timelineAnalysis = this.generateTimelineAnalysis(combinedAnalysis, request.events);

      // Step 7: 生成建议
      const suggestions = this.generateSuggestions(timelineAnalysis, request.events);

      // Step 8: 构建响应
      const result = this.buildSuccessResponse(
        timelineAnalysis,
        request.events,
        suggestions,
        startTime
      );

      console.log('✅ 时间轴智能分析完成');
      return result;

    } catch (error) {
      console.error('❌ 时间轴分析错误:', error);
      return this.buildErrorResponse(error, startTime);
    }
  }

  // ========== 私有业务方法 ==========

  /**
   * Step 1: 验证请求
   */
  private validateRequest(request: TimelineAnalysisRequest): void {
    if (!request.events || !Array.isArray(request.events)) {
      throw new Error('请提供时间轴事件数据');
    }

    if (request.events.length === 0) {
      throw new Error('事件列表不能为空');
    }

    // 验证每个事件的基本字段
    for (const event of request.events) {
      if (!event.date || !event.title) {
        throw new Error('每个事件必须包含日期和标题');
      }
    }
  }

  /**
   * Step 2: 预处理事件数据
   */
  private preprocessEvents(events: TimelineEvent[]): ProcessedDocument {
    // 将事件转换为文本
    const eventTexts = events.map(e =>
      `${e.date}：${e.title}。${e.description || ''}`
    ).join('\n');

    // 使用文档预处理器
    const processedDoc = DocumentPreprocessor.processDocument(eventTexts);

    // 增强元数据
    const dates = events.map(e => e.date).filter(Boolean).sort();
    const parties = events.flatMap(e => e.parties || []).filter((p, i, arr) => arr.indexOf(p) === i);

    (processedDoc as any).metadata = {
      ...processedDoc.metadata,
      eventCount: events.length,
      dateRange: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || ''
      },
      mainParties: parties,
      documentType: 'timeline'
    };

    return processedDoc;
  }

  /**
   * Step 3: 规则分析
   */
  private performRuleAnalysis(processedDoc: ProcessedDocument): any {
    console.log('Step 3: 规则分析...');
    return RuleExtractor.extract(processedDoc);
  }

  /**
   * Step 4: AI增强分析
   */
  private async performAIAnalysis(
    processedDoc: ProcessedDocument,
    request: TimelineAnalysisRequest
  ): Promise<AITimelineResponse | null> {
    if (!request.includeAI || !this.isAIAvailable()) {
      return null;
    }

    console.log('Step 4: AI增强分析...');

    try {
      const aiRequest: AITimelineRequest = {
        eventText: processedDoc.cleanedText,
        analysisType: request.analysisType || AnalysisType.COMPREHENSIVE,
        focusAreas: request.focusAreas
      };

      return await this.callAIService(aiRequest);
    } catch (error) {
      console.error('AI分析失败:', error);
      return null;
    }
  }

  /**
   * Step 5: 合并分析结果
   */
  private combineAnalysisResults(ruleAnalysis: any, aiAnalysis: AITimelineResponse | null): any {
    console.log('Step 5: 合并分析结果...');

    if (!aiAnalysis) {
      return ruleAnalysis;
    }

    // 确保数据结构兼容 SmartMerger
    const formattedRuleData = {
      dates: ruleAnalysis?.dates || [],
      parties: ruleAnalysis?.parties || [],
      amounts: ruleAnalysis?.amounts || [],
      legalClauses: ruleAnalysis?.legalClauses || [],
      facts: ruleAnalysis?.facts || [],
      metadata: ruleAnalysis?.metadata || {},
      confidence: ruleAnalysis?.confidence || 0.8,
      source: 'rule'
    };

    const formattedAiData = {
      dates: aiAnalysis?.analysis?.dates || [],
      parties: aiAnalysis?.analysis?.parties || [],
      amounts: aiAnalysis?.analysis?.amounts || [],
      legalClauses: aiAnalysis?.analysis?.legalClauses || [],
      facts: aiAnalysis?.analysis?.facts || [],
      metadata: aiAnalysis?.analysis?.metadata || {},
      confidence: aiAnalysis?.confidence || 0.7,
      source: 'ai'
    };

    // 使用智能合并器
    return SmartMerger.merge(formattedRuleData, formattedAiData, {
      strategy: 'confidence-based',
      aiWeight: 0.6,
      ruleWeight: 0.4
    });
  }

  /**
   * Step 6: 生成时间轴分析
   */
  private generateTimelineAnalysis(combinedAnalysis: any, events: TimelineEvent[]): TimelineAnalysis {
    console.log('Step 6: 生成时间轴分析...');

    // 分析关键转折点
    const keyTurningPoints = this.identifyTurningPoints(events, combinedAnalysis);

    // 分析行为模式
    const behaviorPatterns = this.analyzeBehaviorPatterns(events, combinedAnalysis);

    // 分析证据链
    const evidenceChain = this.analyzeEvidenceChain(events, combinedAnalysis);

    // 分析法律风险
    const legalRisks = this.analyzeLegalRisks(combinedAnalysis);

    // 生成预测
    const predictions = this.generatePredictions(events, combinedAnalysis);

    return {
      keyTurningPoints,
      behaviorPatterns,
      evidenceChain,
      legalRisks,
      predictions,
      summary: this.generateSummary(events, combinedAnalysis),
      confidence: combinedAnalysis.confidence || 0.8
    };
  }

  /**
   * Step 7: 生成建议
   */
  private generateSuggestions(analysis: TimelineAnalysis, events: TimelineEvent[]): string[] {
    const suggestions: string[] = [];

    // 基于转折点的建议
    if (analysis.keyTurningPoints.length > 0) {
      suggestions.push(`发现${analysis.keyTurningPoints.length}个关键转折点，建议重点关注这些时间节点`);
    }

    // 基于证据链的建议
    if (analysis.evidenceChain.completeness < 0.7) {
      suggestions.push('证据链存在明显缺口，建议补充相关证据材料');
    }

    // 基于风险的建议
    const highRisks = analysis.legalRisks.filter(r => r.likelihood === 'high');
    if (highRisks.length > 0) {
      suggestions.push(`发现${highRisks.length}个高风险点，建议制定应对策略`);
    }

    // 基于时间跨度的建议
    if (events.length > 20) {
      suggestions.push('事件较多，建议按阶段分组分析');
    }

    return suggestions;
  }

  /**
   * AI服务调用
   */
  private async callAIService(aiRequest: AITimelineRequest): Promise<AITimelineResponse> {
    const prompt = this.buildAIPrompt(aiRequest);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`AI API错误: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '分析失败';

    return {
      analysis: content,
      confidence: 0.85
    };
  }

  /**
   * 构建AI提示词
   */
  private buildAIPrompt(aiRequest: AITimelineRequest): string {
    return `分析以下法律案件时间轴，提供专业见解：

时间轴事件：
${aiRequest.eventText}

请分析：
1. 关键转折点和其法律意义
2. 当事人行为模式和动机
3. 证据链的完整性和逻辑性
4. 可能的法律风险和机会
5. 案件发展趋势预测

请提供结构化的专业分析，重点关注法律层面的意义。`;
  }

  /**
   * 检查AI服务是否可用
   */
  private isAIAvailable(): boolean {
    return !!this.apiKey && !!this.apiUrl;
  }

  /**
   * 识别关键转折点
   */
  private identifyTurningPoints(events: TimelineEvent[], analysis: any): TurningPoint[] {
    // 基于事件重要性和分析结果识别转折点
    return events
      .filter(event => event.importance === 'critical' || event.importance === 'high')
      .slice(0, 5) // 最多5个转折点
      .map(event => ({
        date: event.date,
        description: event.title,
        legalSignificance: this.determineLegalSignificance(event),
        impact: event.importance === 'critical' ? 'high' as const : 'medium' as const,
        consequences: [event.description || ''].filter(Boolean)
      }));
  }

  /**
   * 分析行为模式
   */
  private analyzeBehaviorPatterns(events: TimelineEvent[], analysis: any): BehaviorPattern[] {
    // 简化的行为模式分析
    const parties = events.flatMap(e => e.parties || []).filter((p, i, arr) => arr.indexOf(p) === i);

    return parties.slice(0, 3).map(party => ({
      party,
      pattern: '需要进一步分析',
      motivation: '待确定',
      consistency: 0.7,
      implications: ['需要详细调查']
    }));
  }

  /**
   * 分析证据链
   */
  private analyzeEvidenceChain(events: TimelineEvent[], analysis: any): EvidenceChainAnalysis {
    const evidenceCount = events.reduce((count, event) => count + (event.evidence?.length || 0), 0);
    const completeness = Math.min(evidenceCount / events.length, 1.0);

    return {
      completeness,
      logicalConsistency: 0.8,
      gaps: evidenceCount < events.length ? ['部分事件缺少证据支撑'] : [],
      strengths: ['时间顺序清晰'],
      weaknesses: completeness < 0.5 ? ['证据材料不足'] : []
    };
  }

  /**
   * 分析法律风险
   */
  private analyzeLegalRisks(analysis: any): LegalRisk[] {
    // 基于分析结果生成风险评估
    return [
      {
        type: 'legal' as const,
        description: '需要进一步法律审查',
        likelihood: 'medium' as const,
        impact: 'medium' as const,
        mitigation: '咨询专业律师'
      }
    ];
  }

  /**
   * 生成预测
   */
  private generatePredictions(events: TimelineEvent[], analysis: any): CasePrediction[] {
    return [
      {
        scenario: '基于当前时间轴的发展预测',
        probability: 0.7,
        reasoning: '根据事件发展模式分析',
        factors: ['事件发展趋势', '当事人行为模式']
      }
    ];
  }

  /**
   * 生成摘要
   */
  private generateSummary(events: TimelineEvent[], analysis: any): string {
    return `时间轴包含${events.length}个事件，跨越${this.calculateTimeSpan(events)}。分析发现关键转折点和潜在法律风险点，建议进一步深入调查。`;
  }

  /**
   * 计算时间跨度
   */
  private calculateTimeSpan(events: TimelineEvent[]): string {
    const dates = events.map(e => e.date).filter(Boolean).sort();
    if (dates.length < 2) return '较短时期';

    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 30) return `${daysDiff}天`;
    if (daysDiff < 365) return `约${Math.round(daysDiff/30)}个月`;
    return `约${Math.round(daysDiff/365)}年`;
  }

  /**
   * 确定法律意义
   */
  private determineLegalSignificance(event: TimelineEvent): string {
    if (event.legalRelevance) return event.legalRelevance;
    if (event.type === 'contract_signing') return '合同关系确立';
    if (event.type === 'breach') return '违约行为发生';
    return '需要进一步法律分析';
  }

  /**
   * 构建成功响应
   */
  private buildSuccessResponse(
    analysis: TimelineAnalysis,
    events: TimelineEvent[],
    suggestions: string[],
    startTime: number
  ): TimelineAnalysisResponse {
    return {
      success: true,
      data: {
        analysis,
        processedEvents: events,
        suggestions
      },
      metadata: {
        processingTime: Date.now() - startTime,
        eventCount: events.length,
        analysisMethod: this.isAIAvailable() ? 'ai-enhanced' : 'rule-based',
        confidence: analysis.confidence,
        version: '1.0.0'
      }
    };
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(error: unknown, startTime: number): TimelineAnalysisResponse {
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    let errorCode = TimelineErrorCode.INTERNAL_ERROR;
    if (errorMessage.includes('事件数据')) {
      errorCode = TimelineErrorCode.INVALID_EVENTS;
    } else if (errorMessage.includes('字段')) {
      errorCode = TimelineErrorCode.MISSING_DATA;
    }

    return {
      success: false,
      error: {
        message: errorMessage,
        code: errorCode
      },
      metadata: {
        processingTime: Date.now() - startTime,
        eventCount: 0,
        analysisMethod: 'rule-based',
        confidence: 0,
        version: '1.0.0'
      }
    };
  }
}