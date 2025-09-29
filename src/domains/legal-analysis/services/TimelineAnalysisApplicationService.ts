/**
 * 时间轴分析应用服务
 * 核心业务逻辑，从API层分离
 * DeepPractice Standards Compliant
 * 已迁移至统一AI调用代理模式 - Issue #21
 */

import { DocumentPreprocessor } from '../intelligence/preprocessor';
import { RuleExtractor } from '../intelligence/rule-extractor';
import { SmartMerger } from '../intelligence/smart-merger';
import { ProvisionMapper } from '../intelligence/provision-mapper';
import { callUnifiedAI } from '../../../infrastructure/ai/AICallProxy';

import {
  RiskType,
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
    this.apiUrl = 'https://api.deepseek.com/v1';
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
      const usedAI = Boolean(aiAnalysis && aiAnalysis.analysis);
      const result = this.buildSuccessResponse(
        timelineAnalysis,
        request.events,
        suggestions,
        startTime,
        usedAI
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
    for (let i = 0; i < request.events.length; i++) {
      const event = request.events[i];
      if (!event) {
        throw new Error(`事件 ${i + 1} 是空值`);
      }
      if (!event.date) {
        console.warn(`事件 ${i + 1} 缺少日期，使用默认值`);
        event.date = '未知日期';
      }
      if (!event.title && !event.event) {
        throw new Error(`事件 ${i + 1} 必须包含标题或事件描述`);
      }
      // 如果没有title，使用event字段
      if (!event.title) {
        event.title = event.event || '未知事件';
      }
    }
  }

  /**
   * Step 2: 预处理事件数据
   */
  private preprocessEvents(events: TimelineEvent[]): ProcessedDocument {
    // 安全地将事件转换为文本
    const eventTexts = events
      .filter(e => e && (e.date || e.title || e.event))  // 过滤掉无效事件
      .map(e => {
        // 确保所有字段都有值
        const safeDate = e.date || '未知日期';
        const safeTitle = e.title || e.event || '未知事件';
        const safeDesc = e.description || '';
        return `${safeDate}：${safeTitle}。${safeDesc}`;
      })
      .join('\n');

    // 如果没有有效的事件文本，提供一个默认值
    const textToProcess = eventTexts || '无有效事件数据';

    // 使用文档预处理器
    const processedDoc = DocumentPreprocessor.processDocument(textToProcess);

    // 增强元数据，安全地处理dates数组
    const dates = events
      .map(e => e?.date)
      .filter(Boolean)
      .sort();

    const parties = events
      .flatMap(e => e?.parties || [])
      .filter((p, i, arr) => p && arr.indexOf(p) === i);

    (processedDoc as any).metadata = {
      ...processedDoc.metadata,
      eventCount: events.length,
      dateRange: {
        start: dates.length > 0 ? dates[0] : '',
        end: dates.length > 0 ? dates[dates.length - 1] : ''
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
    if (!request.includeAI) {
      return null;
    }

    if (!this.isAIAvailable()) {
      return {
        analysis: null,
        confidence: 0,
        warnings: ['未检测到有效的DEEPSEEK_API_KEY，已回退到规则分析。']
      };
    }

    console.log('Step 4: AI增强分析...');

    try {
      const aiRequest: AITimelineRequest = {
        eventText: processedDoc.cleanedText,
        events: request.events,
        analysisType: request.analysisType || AnalysisType.COMPREHENSIVE,
        focusAreas: request.focusAreas
      };

      return await this.callAIService(aiRequest);
    } catch (error) {
      console.error('AI分析失败:', error);
      const message = error instanceof Error ? error.message : 'AI分析失败';
      return {
        analysis: null,
        confidence: 0,
        warnings: [message],
        rawContent: undefined
      };
    }
  }

  /**
   * Step 5: 合并分析结果
   */
  private combineAnalysisResults(ruleAnalysis: any, aiAnalysis: AITimelineResponse | null): any {
    console.log('Step 5: 合并分析结果...');

    if (!aiAnalysis || !aiAnalysis.analysis) {
      const ruleOnly = { ...ruleAnalysis };
      if (aiAnalysis?.warnings?.length) {
        (ruleOnly as any).aiWarnings = aiAnalysis.warnings;
      }
      return ruleOnly;
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
      source: 'rule' as 'rule'
    };

    const aiExtracted = aiAnalysis?.analysis || {};

    const formattedAiData = {
      dates: aiExtracted?.dates || [],
      parties: aiExtracted?.parties || [],
      amounts: aiExtracted?.amounts || [],
      legalClauses: aiExtracted?.legalClauses || [],
      facts: aiExtracted?.facts || [],
      metadata: aiExtracted?.metadata || {},
      confidence: aiAnalysis?.confidence || aiExtracted?.confidence || 0.7,
      source: 'ai' as 'ai'
    };

    // 使用智能合并器
    const merged = SmartMerger.merge(formattedRuleData, formattedAiData, {
      strategy: 'confidence-based',
      aiWeight: 0.6,
      ruleWeight: 0.4
    });

    if (aiAnalysis?.analysis) {
      (merged as any).aiInsights = aiAnalysis.analysis;

      // 调试日志：检查AI返回的数据
      console.log('📊 AI分析数据:', {
        turningPointsCount: aiAnalysis.analysis?.turningPoints?.length || 0,
        behaviorPatternsCount: aiAnalysis.analysis?.behaviorPatterns?.length || 0,
        legalRisksCount: aiAnalysis.analysis?.legalRisks?.length || 0,
        hasEvidenceChain: !!aiAnalysis.analysis?.evidenceChain,
        hasSummary: !!aiAnalysis.analysis?.summary
      });

      if (aiAnalysis.rawContent) {
        (merged as any).rawAIResponse = aiAnalysis.rawContent;
      }
    }
    if (aiAnalysis?.warnings?.length) {
      (merged as any).aiWarnings = aiAnalysis.warnings;
    }

    return merged;
  }

  /**
   * Step 6: 生成时间轴分析
   */
  private generateTimelineAnalysis(combinedAnalysis: any, events: TimelineEvent[]): TimelineAnalysis {
    console.log('Step 6: 生成时间轴分析...');

    const keyTurningPoints = this.identifyTurningPoints(events, combinedAnalysis);
    const behaviorPatterns = this.analyzeBehaviorPatterns(events, combinedAnalysis);
    const evidenceChain = this.analyzeEvidenceChain(events, combinedAnalysis);
    const legalRisks = this.analyzeLegalRisks(combinedAnalysis);
    const predictions = this.generatePredictions(events, combinedAnalysis);

    const aiWarnings = (combinedAnalysis as any).aiWarnings;
    const analysisSource: 'ai' | 'rule' = (combinedAnalysis as any).aiInsights ? 'ai' : 'rule';

    // 调试日志：检查生成的分析结果
    console.log('🎯 生成的时间轴分析结果:', {
      turningPointsCount: keyTurningPoints.length,
      behaviorPatternsCount: behaviorPatterns.length,
      legalRisksCount: legalRisks.length,
      predictionsCount: predictions.length,
      evidenceChainCompleteness: evidenceChain.completeness,
      analysisSource,
      hasAIInsights: !!(combinedAnalysis as any).aiInsights
    });

    return {
      keyTurningPoints,  // 保留旧字段名以向后兼容
      turningPoints: keyTurningPoints,  // 添加新字段名以匹配AI响应
      behaviorPatterns,
      evidenceChain,
      legalRisks,
      predictions,
      summary: this.generateSummary(events, combinedAnalysis),
      confidence: combinedAnalysis.confidence || 0.8,
      aiWarnings,
      analysisSource
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
   * 迁移说明：从直连DeepSeek API改为使用AICallProxy统一调用
   */
  private async callAIService(aiRequest: AITimelineRequest): Promise<AITimelineResponse> {
    const prompt = this.buildAIPrompt(aiRequest);

    try {
      const result = await callUnifiedAI(
        '你是专业的法律时间轴分析专家，擅长从复杂的法律文档中提取和分析时间线索。',
        prompt,
        {
          temperature: 0.3,
          maxTokens: 5000
        }
      );

      const rawContent = result.content?.trim();
      if (!rawContent) {
        throw new Error('AI返回内容为空');
      }

      if (/抱歉，AI分析服务暂时不可用/.test(rawContent)) {
        throw new Error(rawContent);
      }

      const jsonPayload = this.extractJsonPayload(rawContent);
      const parsed = JSON.parse(jsonPayload);

      return {
        analysis: parsed,
        structuredData: parsed,
        rawContent,
        confidence: parsed?.metadata?.confidence ?? parsed?.confidence ?? 0.85,
        warnings: parsed?.warnings || []
      };
    } catch (error) {
      throw new Error(`AI API错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 构建AI提示词
   */
  private buildAIPrompt(aiRequest: AITimelineRequest): string {
    const focusAreas = aiRequest.focusAreas?.length
      ? `分析重点：${aiRequest.focusAreas.join(', ')}`
      : '';

    const indexedEvents = (aiRequest.events || []).map((event, index) => {
      const eventId = event.id || `E${index + 1}`;
      const safeTitle = (event.title || event.event || '未命名事件').replace(/\n/g, ' ');
      const safeDescription = (event.description || event.detail || event.event || '').replace(/\n/g, ' ');
      const safeType = event.type || 'unknown';
      return `  {
    "id": "${eventId}",
    "date": "${event.date}",
    "title": "${safeTitle}",
    "description": "${safeDescription}",
    "type": "${safeType}"
  }`;
    }).join(',\n');

    return `请根据以下案件时间轴事件进行法律分析。

案件事件时间轴（JSON数组）：
[
${indexedEvents}
]

${focusAreas}

分析要求：
1. 识别关键转折点、当事人行为模式、证据链、法律风险和可能的案件走向；
2. 引用上方事件ID（如E1、E2），不要编造不存在的事件；
3. 所有评分应为0-1之间的小数，百分比请使用小数表示（例如0.75）；
4. 输出必须是有效的JSON，禁止添加额外文本或反引号。

输出格式：
{
  "dates": [...],
  "parties": [...],
  "amounts": [...],
  "legalClauses": [...],
  "facts": [...],
  "turningPoints": [
    {
      "eventId": "E1",
      "date": "2024-01-10",
      "title": "关键事件",
      "legalSignificance": "说明法律意义",
      "impact": "high",
      "consequences": ["后果1"]
    }
  ],
  "behaviorPatterns": [
    {
      "party": "原告",
      "pattern": "行为模式",
      "motivation": "主要动机",
      "consistency": 0.8,
      "implications": ["影响1"]
    }
  ],
  "evidenceChain": {
    "completeness": 0.7,
    "logicalConsistency": 0.8,
    "gaps": ["缺口描述"],
    "strengths": ["优势描述"],
    "weaknesses": ["弱点描述"]
  },
  "legalRisks": [
    {
      "type": "legal",
      "description": "风险说明",
      "likelihood": "medium",
      "impact": "high",
      "mitigation": "应对策略"
    }
  ],
  "predictions": [
    {
      "scenario": "预测场景",
      "probability": 0.65,
      "reasoning": "推理依据",
      "factors": ["因素1"]
    }
  ],
  "summary": "整体摘要",
  "metadata": {
    "confidence": 0.8,
    "analysisType": "${aiRequest.analysisType}"
  }
}`;
  }

  private extractJsonPayload(rawContent: string): string {
    const trimmed = rawContent.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }

    const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1];
    }

    const genericMatch = trimmed.match(/```\s*([\s\S]*?)```/i);
    if (genericMatch && genericMatch[1]?.trim().startsWith('{')) {
      return genericMatch[1];
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }

    throw new Error('AI未返回有效JSON结构');
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
    const insights = (analysis as any)?.aiInsights;

    if (insights?.turningPoints?.length) {
      return insights.turningPoints.map((tp: any) => ({
        date: tp.date || '',
        description: tp.title || tp.description || '关键事件',
        legalSignificance: tp.legalSignificance || '需要进一步法律分析',
        impact: this.normalizeImpact(tp.impact),
        consequences: Array.isArray(tp.consequences) && tp.consequences.length > 0
          ? tp.consequences
          : Array.isArray(tp.effects) ? tp.effects : []
      }));
    }

    // 基于事件重要性和分析结果识别转折点
    return events
      .filter(event => event.importance === 'critical' || event.importance === 'high')
      .slice(0, 5)
      .map(event => ({
        date: event.date,
        description: event.title,
        legalSignificance: this.determineLegalSignificance(event),
        impact: event.importance === 'critical' ? 'high' : 'medium',
        consequences: [event.description || ''].filter(Boolean)
      }));
  }

  /**
   * 分析行为模式
   */
  private analyzeBehaviorPatterns(events: TimelineEvent[], analysis: any): BehaviorPattern[] {
    const insights = (analysis as any)?.aiInsights;
    if (Array.isArray(insights?.behaviorPatterns) && insights.behaviorPatterns.length > 0) {
      return insights.behaviorPatterns.map((pattern: any) => ({
        party: pattern.party || '相关方',
        pattern: pattern.pattern || '行为模式待分析',
        motivation: pattern.motivation || '待确定',
        consistency: typeof pattern.consistency === 'number' ? pattern.consistency : 0.7,
        implications: Array.isArray(pattern.implications) && pattern.implications.length > 0
          ? pattern.implications
          : ['需要进一步评估']
      }));
    }

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
    const insights = (analysis as any)?.aiInsights;
    if (insights?.evidenceChain) {
      return {
        completeness: typeof insights.evidenceChain.completeness === 'number'
          ? insights.evidenceChain.completeness
          : 0.6,
        logicalConsistency: typeof insights.evidenceChain.logicalConsistency === 'number'
          ? insights.evidenceChain.logicalConsistency
          : 0.7,
        gaps: Array.isArray(insights.evidenceChain.gaps) ? insights.evidenceChain.gaps : [],
        strengths: Array.isArray(insights.evidenceChain.strengths) ? insights.evidenceChain.strengths : [],
        weaknesses: Array.isArray(insights.evidenceChain.weaknesses) ? insights.evidenceChain.weaknesses : []
      };
    }

    const evidenceCount = events.reduce((count, event) => count + (event.evidence?.length || 0), 0);
    const completeness = Math.min(evidenceCount / Math.max(events.length, 1), 1.0);

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
    const insights = (analysis as any)?.aiInsights;
    if (Array.isArray(insights?.legalRisks) && insights.legalRisks.length > 0) {
      return insights.legalRisks.map((risk: any) => ({
        type: risk.type || RiskType.LEGAL,
        description: risk.description || '需要进一步法律审查',
        likelihood: this.normalizeProbabilityLabel(risk.likelihood),
        impact: this.normalizeProbabilityLabel(risk.impact),
        mitigation: risk.mitigation || '制定风险应对策略'
      }));
    }

    return [
      {
        type: RiskType.LEGAL,
        description: '需要进一步法律审查',
        likelihood: 'medium',
        impact: 'medium',
        mitigation: '咨询专业律师'
      }
    ];
  }

  /**
   * 生成预测
   */
  private generatePredictions(events: TimelineEvent[], analysis: any): CasePrediction[] {
    const insights = (analysis as any)?.aiInsights;
    if (Array.isArray(insights?.predictions) && insights.predictions.length > 0) {
      return insights.predictions.map((prediction: any) => ({
        scenario: prediction.scenario || '案件走势预测',
        probability: typeof prediction.probability === 'number' ? prediction.probability : 0.6,
        reasoning: prediction.reasoning || '基于现有事实的评估',
        factors: Array.isArray(prediction.factors) ? prediction.factors : []
      }));
    }

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
    const insights = (analysis as any)?.aiInsights;
    if (typeof insights?.summary === 'string' && insights.summary.trim().length > 0) {
      return insights.summary.trim();
    }

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

  private normalizeImpact(value: any): 'high' | 'medium' | 'low' {
    if (typeof value === 'number') {
      if (value >= 0.66) return 'high';
      if (value <= 0.33) return 'low';
      return 'medium';
    }

    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('high') || normalized.includes('高')) return 'high';
    if (normalized.includes('low') || normalized.includes('低')) return 'low';
    return 'medium';
  }

  private normalizeProbabilityLabel(value: any): 'high' | 'medium' | 'low' {
    if (typeof value === 'number') {
      if (value >= 0.66) return 'high';
      if (value <= 0.33) return 'low';
      return 'medium';
    }

    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('high') || normalized.includes('高')) return 'high';
    if (normalized.includes('low') || normalized.includes('低')) return 'low';
    if (normalized.includes('medium') || normalized.includes('中')) return 'medium';
    return 'medium';
  }

  /**
   * 构建成功响应
   */
  private buildSuccessResponse(
    analysis: TimelineAnalysis,
    events: TimelineEvent[],
    suggestions: string[],
    startTime: number,
    usedAI: boolean
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
        analysisMethod: usedAI ? 'ai-enhanced' : 'rule-based',
        confidence: analysis.confidence,
        version: '1.0.0',
        aiWarnings: analysis.aiWarnings || []
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
