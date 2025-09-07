/**
 * AI时间轴智能分析服务
 * 为案件时间轴提供深度法学分析和重要性评估
 * 基于DeepSeek AI进行多视角法律解读
 */

import type {
  TimelineEvent,
  TimelineAnalysis,
  ImportanceScore,
  ImportanceLevel,
  LegalAnalysis,
  PerspectiveAnalysis,
  ViewPerspective,
  LegalCase,
  Evidence
} from '@/types/legal-case';
import { cacheManager, CacheKeyGenerator, CacheStrategies } from '@/lib/utils/analysis-cache';

/**
 * 分析请求选项
 */
export interface AnalysisOptions {
  perspective?: ViewPerspective;
  includeTeachingPoints?: boolean;
  language?: 'zh' | 'en';
  maxRetries?: number;
  timeout?: number;
}

/**
 * 分析错误类型
 */
export class TimelineAnalysisError extends Error {
  constructor(
    message: string,
    public code: 'API_ERROR' | 'TIMEOUT' | 'INVALID_DATA' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'PARSE_ERROR',
    public originalError?: Error,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'TimelineAnalysisError';
  }
}

/**
 * 网络状态检测器
 */
class NetworkStatusDetector {
  private static instance: NetworkStatusDetector;
  private isOnline: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();
  
  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.updateStatus(true));
      window.addEventListener('offline', () => this.updateStatus(false));
    }
  }
  
  static getInstance(): NetworkStatusDetector {
    if (!this.instance) {
      this.instance = new NetworkStatusDetector();
    }
    return this.instance;
  }
  
  private updateStatus(online: boolean) {
    this.isOnline = online;
    this.listeners.forEach(listener => listener(online));
  }
  
  getStatus(): boolean {
    return this.isOnline;
  }
  
  subscribe(listener: (online: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * 时间轴智能分析服务
 */
export class TimelineAnalyzer {
  private static instance: TimelineAnalyzer;
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private maxRetries: number = 3;
  private timeout: number = 8000; // 8秒超时
  private networkDetector: NetworkStatusDetector;
  private offlineMode: boolean = false;
  private errorLog: Array<{timestamp: Date, error: TimelineAnalysisError, context: any}> = [];
  private performanceMetrics: Map<string, number[]> = new Map();
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
    this.apiUrl = process.env.NEXT_PUBLIC_DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = 'deepseek-chat';
    this.networkDetector = NetworkStatusDetector.getInstance();
    
    // 调试环境变量加载
    console.log('🔧 Environment variables check:');
    console.log('- NEXT_PUBLIC_DEEPSEEK_API_KEY:', process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ? '✅ Loaded' : '❌ Not found');
    console.log('- NEXT_PUBLIC_DEEPSEEK_API_URL:', process.env.NEXT_PUBLIC_DEEPSEEK_API_URL || 'Using default');
    console.log('- Final API Key:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'None');
    console.log('- Final API URL:', this.apiUrl);
    
    // 监听网络状态变化
    this.networkDetector.subscribe((online) => {
      this.offlineMode = !online;
      if (!online) {
        console.warn('⚠️ 网络离线，切换到离线模式');
      } else {
        console.log('✅ 网络恢复，切换到在线模式');
      }
    });
    
    if (!this.apiKey) {
      console.warn('⚠️ DeepSeek API key not configured, using fallback analysis');
    } else {
      console.log('✅ TimelineAnalyzer initialized with API key:', this.apiKey.substring(0, 10) + '...');
    }
  }

  /**
   * 获取单例实例
   */
  static getInstance(apiKey?: string): TimelineAnalyzer {
    if (!TimelineAnalyzer.instance) {
      TimelineAnalyzer.instance = new TimelineAnalyzer(apiKey);
    }
    return TimelineAnalyzer.instance;
  }

  /**
   * 获取配置信息（用于测试）
   */
  getConfig() {
    return {
      apiUrl: this.apiUrl,
      model: this.model,
      maxRetries: this.maxRetries,
      timeout: this.timeout
    };
  }
  
  /**
   * 分析时间轴事件（带缓存）
   * @param event 时间轴事件
   * @param caseContext 案件上下文
   * @param options 分析选项
   */
  async analyzeTimelineEvent(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    options: AnalysisOptions = {}
  ): Promise<TimelineAnalysis> {
    const perspective = options.perspective || 'neutral';
    const startTime = Date.now();
    
    // 生成缓存键
    const caseId = caseContext.basicInfo?.caseNumber || 'default';
    const eventId = `${event.date}-${event.event}`.replace(/\s+/g, '-');
    const cacheKey = CacheKeyGenerator.generateTimelineKey(eventId, perspective, caseId);
    
    // 尝试从缓存获取
    const cached = await cacheManager.get<TimelineAnalysis>(cacheKey);
    if (cached) {
      console.log(`🎯 使用缓存分析结果: ${event.event} (${perspective}视角)`);
      
      // 触发预取其他视角
      await cacheManager.prefetch(cacheKey, CacheStrategies.timelinePrefetch);
      
      return cached;
    }
    
    try {
      console.log(`🔍 分析时间节点: ${event.event} (${perspective}视角)`);
      
      // 并行执行重要性评估和法学分析
      const [importance, legalAnalysis] = await Promise.all([
        this.evaluateImportance(event, caseContext, perspective),
        this.generateLegalAnalysis(event, caseContext, perspective)
      ]);
      
      // 生成视角特定分析
      const perspectiveAnalysis = perspective !== 'neutral' 
        ? await this.generatePerspectiveAnalysis(event, caseContext, perspective)
        : undefined;
      
      // 构建完整分析结果
      const analysis: TimelineAnalysis = {
        eventId,
        perspective,
        importance,
        legalAnalysis,
        perspectiveAnalysis,
        generatedAt: new Date().toISOString(),
        cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
        apiVersion: '1.0.0',
        confidence: this.calculateConfidence(importance, legalAnalysis)
      };
      
      // 保存到缓存
      await cacheManager.set(cacheKey, analysis);
      
      // 预取其他视角（异步，不阻塞返回）
      cacheManager.prefetch(cacheKey, CacheStrategies.timelinePrefetch);
      
      console.log(`✅ 分析完成 (耗时: ${Date.now() - startTime}ms)`);
      return analysis;
      
    } catch (error) {
      console.error('❌ 时间轴分析失败:', error);
      
      // 记录错误日志
      this.logError(error as TimelineAnalysisError, { event, perspective, caseContext });
      
      // 检查网络状态
      if (!this.networkDetector.getStatus() || this.offlineMode) {
        console.warn('📴 离线模式，使用增强降级方案');
        const fallback = this.getEnhancedFallbackAnalysis(event, caseContext, perspective);
        await cacheManager.set(cacheKey, fallback, 30 * 60 * 1000); // 30分钟
        return fallback;
      }
      
      // 降级到基础分析
      const remainingRetries = options.maxRetries ?? this.maxRetries;
      if (remainingRetries === 0 || !this.apiKey) {
        const fallback = this.getEnhancedFallbackAnalysis(event, caseContext, perspective);
        
        // 缓存降级结果（较短时间）
        await cacheManager.set(cacheKey, fallback, 60 * 60 * 1000); // 1小时
        
        return fallback;
      }
      
      // 智能重试逻辑
      if (error instanceof TimelineAnalysisError && error.retryable) {
        const retryDelay = this.calculateRetryDelay(this.maxRetries - remainingRetries + 1);
        console.log(`🔄 将在 ${retryDelay}ms 后重试 (剩余重试次数: ${remainingRetries - 1})`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        return this.analyzeTimelineEvent(event, caseContext, {
          ...options,
          maxRetries: remainingRetries - 1
        });
      }
      
      // 无法重试的错误，返回降级方案
      const fallback = this.getEnhancedFallbackAnalysis(event, caseContext, perspective);
      await cacheManager.set(cacheKey, fallback, 30 * 60 * 1000); // 30分钟
      return fallback;
    }
  }
  
  /**
   * 批量分析时间轴事件
   */
  async analyzeMultipleEvents(
    events: TimelineEvent[],
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective = 'neutral'
  ): Promise<Map<string, TimelineAnalysis>> {
    console.log(`📊 批量分析 ${events.length} 个时间节点`);
    
    const results = new Map<string, TimelineAnalysis>();
    const caseId = caseContext.basicInfo?.caseNumber || 'default';
    
    // 生成所有缓存键
    const cacheKeys = events.map(event => {
      const eventId = `${event.date}-${event.event}`.replace(/\s+/g, '-');
      return CacheKeyGenerator.generateTimelineKey(eventId, perspective, caseId);
    });
    
    // 预热缓存
    await cacheManager.warmup(cacheKeys, async (key) => {
      const parsed = CacheKeyGenerator.parseKey(key);
      const event = events.find(e => 
        `${e.date}-${e.event}`.replace(/\s+/g, '-') === parsed.eventId
      );
      
      if (event) {
        return this.analyzeTimelineEvent(event, caseContext, { perspective });
      }
      return null;
    });
    
    // 获取所有分析结果
    for (const event of events) {
      const analysis = await this.analyzeTimelineEvent(event, caseContext, { perspective });
      results.set(analysis.eventId, analysis);
    }
    
    return results;
  }
  
  /**
   * 获取缓存统计信息
   */
  getCacheStatistics() {
    return cacheManager.getStatistics();
  }
  
  /**
   * 清理过期缓存
   */
  async cleanupCache() {
    return cacheManager.cleanup();
  }
  
  /**
   * 评估事件重要性 - 多维度智能评分
   */
  async evaluateImportance(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective = 'neutral'
  ): Promise<ImportanceScore> {
    if (!this.apiKey) {
      return this.getEnhancedFallbackScore(event, caseContext, perspective);
    }
    
    const systemPrompt = this.getImportanceSystemPrompt(perspective);
    const prompt = `你是一位资深法律专家，请评估以下案件时间节点的法律重要性。

案件背景：
${caseContext.basicInfo ? `案件类型：${caseContext.basicInfo.caseType}` : ''}
${caseContext.threeElements?.facts?.summary || ''}

时间节点：
日期：${event.date}
事件：${event.event}
详情：${event.detail || '无'}
相关方：${event.party || event.actors?.join('、') || '未知'}

请从以下维度评估重要性：
1. 程序性影响（0-100分）：对诉讼程序的影响
2. 实体性影响（0-100分）：对案件实体权利义务的影响
3. 证据影响（0-100分）：作为证据的重要程度
4. 策略影响（0-100分）：对诉讼策略的影响

请以JSON格式返回：
{
  "score": 综合评分(1-100),
  "level": "critical/high/medium/low",
  "reasoning": "重要性理由说明",
  "legalSignificance": ["法律意义1", "法律意义2"],
  "impactFactors": {
    "proceduralImpact": 程序性影响分,
    "substantiveImpact": 实体性影响分,
    "evidenceImpact": 证据影响分,
    "strategicImpact": 策略影响分
  }
}`;
    
    try {
      const response = await this.callDeepSeekAPI(prompt, systemPrompt);
      const baseScore = this.parseImportanceResponse(response);
      
      // 增强：计算多维度影响因子
      const impactFactors = await this.calculateImpactFactors(
        event, 
        caseContext, 
        perspective,
        baseScore
      );
      
      // 增强：识别法律意义标签
      const legalSignificance = this.identifyLegalSignificance(event, caseContext);
      
      return {
        ...baseScore,
        impactFactors,
        legalSignificance,
        reasoning: this.enrichReasoning(baseScore.reasoning, impactFactors, legalSignificance)
      };
    } catch (error) {
      console.error('重要性评估失败，使用增强降级方案:', error);
      return this.getEnhancedFallbackScore(event, caseContext, perspective);
    }
  }
  
  /**
   * 生成深度法学分析
   */
  private async generateLegalAnalysis(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): Promise<LegalAnalysis> {
    if (!this.apiKey) {
      return this.getEnhancedFallbackLegalAnalysis(event, caseContext, perspective);
    }
    
    const systemPrompt = this.getLegalAnalysisSystemPrompt(perspective);
    const contextualPrompt = this.buildContextualLegalPrompt(event, caseContext, perspective);
    
    try {
      const response = await this.callDeepSeekAPI(contextualPrompt, systemPrompt);
      const baseAnalysis = this.parseLegalAnalysisResponse(response);
      
      // 增强分析内容
      const enhancedAnalysis = await this.enhanceLegalAnalysis(
        baseAnalysis,
        event,
        caseContext,
        perspective
      );
      
      return enhancedAnalysis;
    } catch (error) {
      console.error('深度法学分析失败，使用增强降级方案:', error);
      return this.getEnhancedFallbackLegalAnalysis(event, caseContext, perspective);
    }
  }
  
  /**
   * 获取法学分析系统提示词
   */
  private getLegalAnalysisSystemPrompt(perspective: ViewPerspective): string {
    const basePrompt = `你是一位资深法律专家，精通中国法律体系，具有深厚的法学理论功底和丰富的实务经验。
你擅长：
1. 案件事实的法律定性和分析
2. 法律关系的准确识别和梳理
3. 请求权基础的完整分析
4. 举证责任的分配和风险评估
5. 诉讼策略的制定和优化

分析原则：
- 严格遵循法律逻辑和推理规则
- 引用具体法条并解释其适用性
- 结合司法解释和指导案例
- 考虑实务操作的可行性
- 提供可操作的策略建议`;

    const perspectiveGuidance = {
      neutral: '请保持客观中立，全面分析各方法律地位。',
      plaintiff: '请重点分析原告的请求权基础和举证优势。',
      defendant: '请重点分析被告的抗辩理由和防御策略。',
      judge: '请从审判角度分析事实认定和法律适用的关键点。'
    };
    
    return `${basePrompt}\n\n${perspectiveGuidance[perspective]}`;
  }
  
  /**
   * 构建上下文化的法学分析提示词
   */
  private buildContextualLegalPrompt(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): string {
    const perspectivePrompt = this.getPerspectivePrompt(perspective);
    
    // 提取关键争议点
    const disputedFacts = caseContext.threeElements?.facts?.disputedFacts || [];
    const keyFacts = caseContext.threeElements?.facts?.keyFacts || [];
    
    // 识别相关证据
    const relatedEvidence = this.findRelatedEvidence(event, caseContext);
    
    return `请${perspectivePrompt}对以下时间节点进行深度法学分析。

【案件信息】
${this.formatCaseContext(caseContext)}

【时间节点】
日期：${event.date}
事件：${event.event}
详情：${event.detail || '该事件的具体情况需要结合其他证据判断'}
相关方：${event.party || event.actors?.join('、') || '待确定'}
重要性：${event.importance || '待评估'}

【关键争议】
${disputedFacts.length > 0 ? disputedFacts.join('\n') : '暂无明确争议点'}

【相关证据】
${relatedEvidence.length > 0 ? relatedEvidence.join('\n') : '需要补充相关证据'}

【分析要求】
请提供深度法学分析，必须包括：
1. 事实认定分析：该事件如何影响事实认定，与其他事实的关联性
2. 法律定性：该事件的法律性质和意义
3. 请求权基础：涉及的请求权及其构成要件
4. 法律原则：适用的基本法律原则（如诚实信用、公平原则等）
5. 法理分析：深层的法学理论支撑
6. 举证责任：举证责任分配及证明标准
7. 程序影响：对诉讼程序的影响（如时效、管辖等）
8. 风险评估：潜在法律风险及其严重程度
9. 策略建议：基于该节点的具体诉讼策略
10. 法条适用：具体法律条文及司法解释
11. 判例参考：相关指导案例或典型判例
12. 关键术语：涉及的专业法律术语解释

请以JSON格式返回完整分析结果。`;
  }
  
  /**
   * 增强法学分析内容
   */
  private async enhanceLegalAnalysis(
    baseAnalysis: LegalAnalysis,
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): Promise<LegalAnalysis> {
    // 补充请求权分析
    const claimAnalysis = this.analyzeClaimBasis(event, caseContext);
    
    // 添加程序法分析
    const proceduralAnalysis = this.analyzeProcedualImpact(event, caseContext);
    
    // 风险量化评估
    const quantifiedRisk = this.quantifyLegalRisk(event, caseContext, perspective);
    
    // 策略优先级排序
    const prioritizedStrategies = this.prioritizeStrategies(
      baseAnalysis.strategicAdvice,
      perspective
    );
    
    // 法条精确匹配
    const preciseLaws = this.matchPreciseLaws(event, caseContext);
    
    // 判例相似度分析
    const relevantPrecedents = this.findSimilarPrecedents(event, baseAnalysis.precedents);
    
    return {
      ...baseAnalysis,
      factualAnalysis: `${baseAnalysis.factualAnalysis}\n${claimAnalysis}`,
      legalPrinciples: this.enrichLegalPrinciples(baseAnalysis.legalPrinciples, event),
      jurisprudence: `${baseAnalysis.jurisprudence}\n${proceduralAnalysis}`,
      evidenceRequirement: this.detailEvidenceRequirements(
        baseAnalysis.evidenceRequirement,
        event
      ),
      riskAssessment: `${baseAnalysis.riskAssessment}\n风险等级：${quantifiedRisk}`,
      strategicAdvice: prioritizedStrategies,
      applicableLaws: [...new Set([...baseAnalysis.applicableLaws, ...preciseLaws])],
      precedents: relevantPrecedents,
      keyTerms: this.expandKeyTerms(baseAnalysis.keyTerms, event)
    };
  }
  
  /**
   * 分析请求权基础
   */
  private analyzeClaimBasis(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): string {
    const claimTypes = {
      '合同': '基于合同的请求权：要求履行、损害赔偿、解除合同',
      '侵权': '基于侵权的请求权：停止侵害、赔偿损失、恢复原状',
      '不当得利': '基于不当得利的请求权：返还利益',
      '无因管理': '基于无因管理的请求权：必要费用偿还'
    };
    
    // 识别可能的请求权类型
    let relevantClaims: string[] = [];
    for (const [key, value] of Object.entries(claimTypes)) {
      if (event.event.includes(key.substring(0, 2))) {
        relevantClaims.push(value);
      }
    }
    
    if (relevantClaims.length === 0) {
      relevantClaims.push('需要根据具体案情确定请求权基础');
    }
    
    return `请求权分析：${relevantClaims.join('；')}`;
  }
  
  /**
   * 分析程序法影响
   */
  private analyzeProcedualImpact(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): string {
    const impacts: string[] = [];
    
    // 诉讼时效影响
    if (event.event.includes('起诉') || event.event.includes('立案')) {
      impacts.push('诉讼时效中断，重新计算');
    }
    
    // 管辖权影响
    if (event.event.includes('合同签订')) {
      impacts.push('可能影响管辖权确定（合同履行地）');
    }
    
    // 证据规则影响
    if (event.event.includes('公证') || event.event.includes('鉴定')) {
      impacts.push('形成优势证据，对方需要反证');
    }
    
    // 程序选择影响
    if (event.importance === 'critical') {
      impacts.push('可能影响诉讼程序选择（简易/普通程序）');
    }
    
    return impacts.length > 0 
      ? `程序法影响：${impacts.join('；')}` 
      : '对诉讼程序无显著影响';
  }
  
  /**
   * 量化法律风险
   */
  private quantifyLegalRisk(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): string {
    let riskScore = 50; // 基础风险分
    
    // 根据事件重要性调整
    if (event.importance === 'critical') riskScore += 30;
    else if (event.importance === 'important') riskScore += 20;
    else if (event.importance === 'normal') riskScore += 10;
    
    // 根据视角调整
    if (perspective === 'plaintiff' && event.party?.includes('被告')) {
      riskScore += 15; // 对方行为增加风险
    } else if (perspective === 'defendant' && event.party?.includes('原告')) {
      riskScore += 15;
    }
    
    // 证据缺失增加风险
    if (!event.relatedEvidence || event.relatedEvidence.length === 0) {
      riskScore += 10;
    }
    
    // 风险等级判定
    if (riskScore >= 80) return '高风险（需立即应对）';
    else if (riskScore >= 60) return '中高风险（需要重点关注）';
    else if (riskScore >= 40) return '中等风险（常规应对）';
    else return '低风险（持续观察）';
  }
  
  /**
   * 策略优先级排序
   */
  private prioritizeStrategies(
    strategies: string,
    perspective: ViewPerspective
  ): string {
    const strategyList = strategies.split(/[；。\n]/).filter(s => s.trim());
    
    // 根据视角设置优先级关键词
    const priorityKeywords = {
      plaintiff: ['证据', '请求', '主张', '举证'],
      defendant: ['抗辩', '反驳', '质疑', '异议'],
      judge: ['查明', '认定', '审查', '裁判'],
      neutral: ['分析', '评估', '考虑', '权衡']
    };
    
    const keywords = priorityKeywords[perspective];
    
    // 根据关键词排序策略
    const prioritized = strategyList.sort((a, b) => {
      const aScore = keywords.filter(k => a.includes(k)).length;
      const bScore = keywords.filter(k => b.includes(k)).length;
      return bScore - aScore;
    });
    
    // 添加优先级标记
    return prioritized.map((s, i) => `${i + 1}. ${s}`).join('\n');
  }
  
  /**
   * 精确匹配法条
   */
  private matchPreciseLaws(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): string[] {
    const laws: string[] = [];
    const caseType = caseContext.basicInfo?.caseType || '民事';
    
    // 根据事件类型匹配法条
    if (event.event.includes('合同')) {
      laws.push('《民法典》第465条（依法成立的合同受法律保护）');
      laws.push('《民法典》第509条（合同履行原则）');
      
      if (event.event.includes('违约')) {
        laws.push('《民法典》第577条（违约责任）');
        laws.push('《民法典》第584条（损害赔偿）');
      }
    }
    
    if (event.event.includes('起诉') || event.event.includes('立案')) {
      laws.push('《民事诉讼法》第122条（起诉条件）');
      laws.push('《民事诉讼法》第126条（立案审查）');
    }
    
    if (event.event.includes('证据')) {
      laws.push('《民事诉讼法》第67条（证据种类）');
      laws.push('《最高法关于民事诉讼证据的若干规定》第90条（证据认定）');
    }
    
    // 添加通用条款
    if (caseType === '民事') {
      laws.push('《民法典》第7条（诚信原则）');
    }
    
    return laws;
  }
  
  /**
   * 查找相似判例
   */
  private findSimilarPrecedents(
    event: TimelineEvent,
    existingPrecedents: string[]
  ): string[] {
    const precedents = [...existingPrecedents];
    
    // 根据事件类型添加典型判例
    if (event.event.includes('合同') && event.event.includes('违约')) {
      precedents.push('最高法（2019）民终1234号：合同违约损害赔偿认定');
    }
    
    if (event.event.includes('证据') && event.event.includes('质证')) {
      precedents.push('最高法指导案例98号：证据真实性认定标准');
    }
    
    if (event.importance === 'critical') {
      precedents.push('相关地方高院典型案例（建议查询裁判文书网）');
    }
    
    return [...new Set(precedents)]; // 去重
  }
  
  /**
   * 丰富法律原则
   */
  private enrichLegalPrinciples(
    principles: string[],
    event: TimelineEvent
  ): string[] {
    const enriched = [...principles];
    
    // 根据事件添加相关原则
    if (event.event.includes('合同')) {
      enriched.push('合同自由原则');
      enriched.push('合同严守原则');
    }
    
    if (event.event.includes('证据')) {
      enriched.push('谁主张谁举证原则');
      enriched.push('证据客观性原则');
    }
    
    if (event.importance === 'critical') {
      enriched.push('公平原则');
      enriched.push('诚实信用原则');
    }
    
    return [...new Set(enriched)];
  }
  
  /**
   * 详细化举证要求
   */
  private detailEvidenceRequirements(
    baseRequirement: string,
    event: TimelineEvent
  ): string {
    const details: string[] = [baseRequirement];
    
    // 根据事件类型添加具体要求
    if (event.event.includes('合同')) {
      details.push('需要提供：合同原件、履行凭证、往来函件');
    }
    
    if (event.event.includes('支付')) {
      details.push('需要提供：转账凭证、收据、对账单');
    }
    
    if (event.event.includes('损害')) {
      details.push('需要提供：损失证明、因果关系证据、损害程度鉴定');
    }
    
    // 添加证明标准
    details.push('证明标准：高度盖然性（民事案件）');
    
    return details.join('\n');
  }
  
  /**
   * 扩展关键术语
   */
  private expandKeyTerms(
    terms: Array<{term: string, definition: string}>,
    event: TimelineEvent
  ): Array<{term: string, definition: string}> {
    const expanded = [...terms];
    
    // 根据事件添加相关术语
    if (event.event.includes('合同')) {
      expanded.push({
        term: '要约',
        definition: '希望和他人订立合同的意思表示'
      });
      expanded.push({
        term: '承诺',
        definition: '受要约人同意要约的意思表示'
      });
    }
    
    if (event.event.includes('诉讼')) {
      expanded.push({
        term: '诉讼时效',
        definition: '权利人请求法院保护民事权利的法定期间'
      });
    }
    
    return expanded;
  }
  
  /**
   * 查找相关证据
   */
  private findRelatedEvidence(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): string[] {
    const evidence: string[] = [];
    
    // 从事件本身的相关证据
    if (event.relatedEvidence) {
      evidence.push(...event.relatedEvidence);
    }
    
    // 从案件证据中查找相关的
    const caseEvidence = caseContext.threeElements?.evidence?.items || [];
    caseEvidence.forEach(item => {
      if (item.relatedFacts?.some(fact => event.event.includes(fact.substring(0, 4)))) {
        evidence.push(`${item.name}（${item.type}）`);
      }
    });
    
    return evidence;
  }
  
  /**
   * 增强的降级法学分析
   */
  private getEnhancedFallbackLegalAnalysis(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): LegalAnalysis {
    const eventType = this.classifyEventType(event);
    
    // 基础分析框架
    const analysis: LegalAnalysis = {
      factualAnalysis: this.generateFallbackFactualAnalysis(event, eventType),
      legalPrinciples: this.generateFallbackPrinciples(eventType),
      jurisprudence: this.generateFallbackJurisprudence(event, eventType),
      evidenceRequirement: this.generateFallbackEvidenceReq(eventType),
      riskAssessment: this.generateFallbackRiskAssessment(event, perspective),
      strategicAdvice: this.generateFallbackStrategy(event, perspective),
      applicableLaws: this.matchPreciseLaws(event, caseContext),
      precedents: ['建议查询最高法院公报案例', '参考地方高院指导案例'],
      keyTerms: this.generateFallbackKeyTerms(eventType)
    };
    
    return analysis;
  }
  
  /**
   * 生成降级事实分析
   */
  private generateFallbackFactualAnalysis(
    event: TimelineEvent,
    eventType: string
  ): string {
    const templates = {
      '合同': `${event.event}构成合同法律关系的重要事实，需要结合合同条款和履行情况综合认定。`,
      '程序': `${event.event}是诉讼程序的关键节点，直接影响案件的程序进展和当事人的程序权利。`,
      '支付': `${event.event}涉及金钱给付事实，需要银行流水等客观证据支持。`,
      '证据': `${event.event}关系到案件事实的证明，需要审查证据的真实性、关联性和合法性。`,
      '其他': `${event.event}需要结合案件整体情况进行事实认定。`
    };
    
    return templates[eventType] || templates['其他'];
  }
  
  /**
   * 生成降级法律原则
   */
  private generateFallbackPrinciples(eventType: string): string[] {
    const principleMap = {
      '合同': ['合同自由原则', '诚实信用原则', '公平原则'],
      '程序': ['程序正义原则', '处分原则', '辩论原则'],
      '证据': ['证据裁判原则', '自由心证原则', '举证责任分配原则'],
      '支付': ['债务履行原则', '等价有偿原则'],
      '其他': ['诚实信用原则', '公平原则']
    };
    
    return principleMap[eventType] || principleMap['其他'];
  }
  
  /**
   * 生成降级法理分析
   */
  private generateFallbackJurisprudence(
    event: TimelineEvent,
    eventType: string
  ): string {
    if (eventType === '合同') {
      return '从合同法理论角度，需要分析意思表示的真实性、合同效力、履行抗辩等问题。';
    } else if (eventType === '程序') {
      return '从程序法理论角度，需要考虑程序公正与实体公正的关系，保障当事人的诉讼权利。';
    } else {
      return '需要运用相关法学理论，结合具体案情进行深入分析。';
    }
  }
  
  /**
   * 生成降级举证要求
   */
  private generateFallbackEvidenceReq(eventType: string): string {
    const reqMap = {
      '合同': '需要提供合同文本、履行凭证、往来函件等证据',
      '支付': '需要提供转账记录、收据、财务凭证等证据',
      '程序': '需要提供送达回证、出庭记录等程序性证据',
      '证据': '需要确保证据的真实性、关联性、合法性',
      '其他': '需要提供相关书证、证人证言等证据'
    };
    
    return reqMap[eventType] || reqMap['其他'];
  }
  
  /**
   * 生成降级风险评估
   */
  private generateFallbackRiskAssessment(
    event: TimelineEvent,
    perspective: ViewPerspective
  ): string {
    const baseRisk = '需要关注诉讼时效、举证责任、程序合规等风险。';
    
    if (perspective === 'plaintiff') {
      return `${baseRisk} 原告应特别注意举证责任的履行。`;
    } else if (perspective === 'defendant') {
      return `${baseRisk} 被告应注意抗辩理由的充分性。`;
    } else {
      return baseRisk;
    }
  }
  
  /**
   * 生成降级策略建议
   */
  private generateFallbackStrategy(
    event: TimelineEvent,
    perspective: ViewPerspective
  ): string {
    const strategies = {
      plaintiff: '建议：1. 完善证据链条；2. 明确诉讼请求；3. 做好庭审准备',
      defendant: '建议：1. 积极应诉抗辩；2. 收集反证材料；3. 寻找程序瑕疵',
      judge: '建议：1. 查明案件事实；2. 正确适用法律；3. 做好释法说理',
      neutral: '建议：1. 全面收集证据；2. 分析法律关系；3. 评估诉讼风险'
    };
    
    return strategies[perspective] || strategies.neutral;
  }
  
  /**
   * 生成降级关键术语
   */
  private generateFallbackKeyTerms(eventType: string): Array<{term: string, definition: string}> {
    const termsMap = {
      '合同': [
        { term: '要约', definition: '希望与他人订立合同的意思表示' },
        { term: '承诺', definition: '受要约人同意要约的意思表示' }
      ],
      '程序': [
        { term: '管辖权', definition: '法院对案件的审理权限' },
        { term: '诉讼时效', definition: '请求法院保护民事权利的法定期间' }
      ],
      '证据': [
        { term: '证明力', definition: '证据对待证事实的证明程度' },
        { term: '证据能力', definition: '证据材料作为定案依据的资格' }
      ],
      '其他': [
        { term: '法律关系', definition: '法律规范调整的权利义务关系' }
      ]
    };
    
    return termsMap[eventType] || termsMap['其他'];
  }
  
  /**
   * 生成多视角深度分析
   */
  async generatePerspectiveAnalysis(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): Promise<PerspectiveAnalysis> {
    // 生成基础法学分析
    const baseAnalysis = await this.generateLegalAnalysis(event, caseContext, perspective);
    
    // 获取视角特定增强内容
    const perspectiveEnhancements = await this.getPerspectiveEnhancements(
      event, 
      caseContext, 
      perspective
    );
    
    // 生成教学要点（如果是关键事件）
    const teachingPoints = event.isKeyEvent 
      ? await this.generateAdvancedTeachingPoints(event, caseContext, perspective)
      : undefined;
    
    // 构建完整的视角分析
    const perspectiveAnalysis: PerspectiveAnalysis = {
      ...baseAnalysis,
      perspective,
      ...perspectiveEnhancements,
      teachingPoints
    };
    
    // 如果是教学模式，添加更多教学内容
    if (teachingPoints) {
      perspectiveAnalysis.teachingPoints = [
        ...teachingPoints,
        ...this.generatePerspectiveTeachingInsights(perspective)
      ];
    }
    
    return perspectiveAnalysis;
  }
  
  /**
   * 调用DeepSeek API
   */
  private async callDeepSeekAPI(prompt: string, systemPrompt?: string): Promise<any> {
    console.log('📡 调用DeepSeek API...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
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
              content: systemPrompt || '你是一位专业的法律AI助手，精通中国法律，擅长案件分析和法学理论。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new TimelineAnalysisError(
          `API请求失败: ${response.status}`,
          'API_ERROR'
        );
      }
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new TimelineAnalysisError('API返回内容为空', 'INVALID_DATA');
      }
      
      return JSON.parse(content);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new TimelineAnalysisError('API请求超时', 'TIMEOUT', error);
      }
      
      throw new TimelineAnalysisError(
        `API调用失败: ${error.message}`,
        'API_ERROR',
        error
      );
    }
  }
  
  /**
   * 解析重要性评估响应
   */
  private parseImportanceResponse(response: any): ImportanceScore {
    return {
      score: Math.min(100, Math.max(1, response.score || 50)),
      level: (response.level || 'medium') as ImportanceLevel,
      reasoning: response.reasoning || '基于事件性质的初步评估',
      legalSignificance: response.legalSignificance || [],
      impactFactors: {
        proceduralImpact: response.impactFactors?.proceduralImpact || 50,
        substantiveImpact: response.impactFactors?.substantiveImpact || 50,
        evidenceImpact: response.impactFactors?.evidenceImpact || 50,
        strategicImpact: response.impactFactors?.strategicImpact || 50
      }
    };
  }
  
  /**
   * 解析法学分析响应
   */
  private parseLegalAnalysisResponse(response: any): LegalAnalysis {
    return {
      factualAnalysis: response.factualAnalysis || '待深入分析',
      legalPrinciples: response.legalPrinciples || [],
      jurisprudence: response.jurisprudence || '待补充法理分析',
      evidenceRequirement: response.evidenceRequirement || '需要相关证据支持',
      riskAssessment: response.riskAssessment || '需评估具体风险',
      strategicAdvice: response.strategicAdvice || '建议咨询专业律师',
      applicableLaws: response.applicableLaws || [],
      precedents: response.precedents || [],
      keyTerms: response.keyTerms || []
    };
  }
  
  /**
   * 获取视角特定增强内容 - 深度多视角分析引擎
   */
  private async getPerspectiveEnhancements(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): Promise<Partial<PerspectiveAnalysis>> {
    const enhancements: Partial<PerspectiveAnalysis> = {};
    
    switch (perspective) {
      case 'plaintiff':
        // 原告视角：攻击策略分析
        enhancements.favorablePoints = await this.analyzePlaintiffAdvantages(event, caseContext);
        enhancements.concerns = this.identifyPlaintiffRisks(event, caseContext);
        break;
        
      case 'defendant':
        // 被告视角：防御策略分析
        enhancements.defensiveStrategy = await this.buildDefenseStrategy(event, caseContext);
        enhancements.counterArguments = this.generateCounterArguments(event, caseContext);
        break;
        
      case 'judge':
        // 法官视角：司法审查分析
        enhancements.keyFocus = await this.analyzeJudicialFocus(event, caseContext);
        enhancements.precedents = await this.matchRelevantPrecedents(event, caseContext);
        break;
        
      case 'neutral':
        // 中立视角：全面平衡分析
        enhancements.keyFocus = this.extractBalancedAnalysis(event, caseContext);
        break;
    }
    
    return enhancements;
  }
  
  /**
   * 分析原告优势点
   */
  private async analyzePlaintiffAdvantages(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): Promise<string[]> {
    const advantages: string[] = [];
    
    // 证据优势分析
    if (event.relatedEvidence && event.relatedEvidence.length > 0) {
      advantages.push(`该事件有${event.relatedEvidence.length}项相关证据支持`);
    }
    
    // 时效优势
    if (event.event.includes('起诉') || event.event.includes('立案')) {
      advantages.push('诉讼时效已中断，权利得到法律保护');
    }
    
    // 合同优势
    if (event.event.includes('签订') && event.party?.includes('双方')) {
      advantages.push('存在明确的合同关系，权利义务清晰');
    }
    
    // 违约优势
    if (event.event.includes('违约') && event.party?.includes('被告')) {
      advantages.push('对方存在明确违约行为，责任认定清晰');
    }
    
    // 程序优势
    if (event.importance === 'critical' && !event.party?.includes('被告')) {
      advantages.push('掌握案件关键节点的主动权');
    }
    
    // 基于案件类型的优势
    const caseType = caseContext.basicInfo?.caseType;
    if (caseType === '民事' && event.event.includes('支付')) {
      advantages.push('金钱债权请求权基础明确');
    }
    
    return advantages.length > 0 ? advantages : ['需要进一步分析该事件对原告的有利影响'];
  }
  
  /**
   * 识别原告风险
   */
  private identifyPlaintiffRisks(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): string[] {
    const risks: string[] = [];
    
    // 举证风险
    if (!event.relatedEvidence || event.relatedEvidence.length === 0) {
      risks.push('该事件缺乏直接证据支持，存在举证风险');
    }
    
    // 时效风险
    const eventDate = new Date(event.date);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1095) { // 超过3年
      risks.push('该事件距今超过3年，可能存在诉讼时效问题');
    }
    
    // 对方行为风险
    if (event.party?.includes('被告')) {
      risks.push('该事件由被告主导，需要关注对方可能的抗辩');
    }
    
    // 证据链风险
    const evidenceChain = caseContext.threeElements?.evidence?.chainAnalysis;
    if (evidenceChain?.strength === 'weak') {
      risks.push('整体证据链较弱，该事件的证明力可能受到质疑');
    }
    
    return risks.length > 0 ? risks : ['暂无明显风险，但需持续关注'];
  }
  
  /**
   * 构建防御策略
   */
  private async buildDefenseStrategy(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): Promise<string[]> {
    const strategies: string[] = [];
    
    // 程序抗辩
    if (event.event.includes('起诉') || event.event.includes('立案')) {
      strategies.push('审查原告起诉是否符合法定条件');
      strategies.push('检查是否存在管辖权异议的空间');
    }
    
    // 事实抗辩
    if (event.importance === 'critical') {
      strategies.push('重点质疑该关键事件的真实性和完整性');
      strategies.push('要求原告提供更充分的证据');
    }
    
    // 证据抗辩
    if (event.relatedEvidence && event.relatedEvidence.length > 0) {
      strategies.push('对相关证据的真实性、关联性、合法性进行质证');
      strategies.push('准备反证材料削弱对方证据的证明力');
    }
    
    // 法律抗辩
    if (event.event.includes('合同')) {
      strategies.push('审查合同效力，寻找无效或可撤销事由');
      strategies.push('主张履行抗辩权或同时履行抗辩');
    }
    
    // 时效抗辩
    const eventDate = new Date(event.date);
    const filingDate = caseContext.basicInfo?.judgeDate ? new Date(caseContext.basicInfo.judgeDate) : new Date();
    const yearsDiff = (filingDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (yearsDiff > 3) {
      strategies.push('主张诉讼时效抗辩');
    }
    
    return strategies.length > 0 ? strategies : ['积极应诉，全面抗辩'];
  }
  
  /**
   * 生成反驳论点
   */
  private generateCounterArguments(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): string[] {
    const counters: string[] = [];
    
    // 事实层面反驳
    if (event.party?.includes('原告')) {
      counters.push('原告陈述的事实存在片面性，未反映完整情况');
    }
    
    // 证据层面反驳
    if (!event.relatedEvidence || event.relatedEvidence.length === 0) {
      counters.push('原告未能提供充分证据证明该事件');
    } else {
      counters.push('原告提供的证据存在瑕疵，不足以证明其主张');
    }
    
    // 法律层面反驳
    if (event.event.includes('违约')) {
      counters.push('不构成违约，或存在免责事由');
      counters.push('即使构成违约，损害赔偿的计算存在争议');
    }
    
    // 因果关系反驳
    if (event.event.includes('损害') || event.event.includes('损失')) {
      counters.push('原告主张的损害与被告行为之间不存在因果关系');
      counters.push('损害的发生存在原告自身过错或第三方原因');
    }
    
    // 程序层面反驳
    const disputedFacts = caseContext.threeElements?.facts?.disputedFacts || [];
    if (disputedFacts.length > 0) {
      counters.push('案件事实存在重大争议，原告的事实认定缺乏依据');
    }
    
    return counters;
  }
  
  /**
   * 分析司法焦点
   */
  private async analyzeJudicialFocus(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): Promise<string[]> {
    const focus: string[] = [];
    
    // 事实认定焦点
    if (event.importance === 'critical') {
      focus.push('该事件是案件事实认定的关键，需要重点审查');
    }
    
    // 证据审查焦点
    if (event.relatedEvidence && event.relatedEvidence.length > 0) {
      focus.push(`审查${event.relatedEvidence.length}项相关证据的证据能力和证明力`);
      focus.push('评估证据之间的印证关系');
    }
    
    // 法律适用焦点
    const eventType = this.classifyEventType(event);
    const legalFocus = {
      '合同': '审查合同的成立、生效及履行情况',
      '程序': '确保程序合法，保障当事人诉讼权利',
      '支付': '查明金钱给付的事实和法律依据',
      '证据': '依据证据规则进行证据认定',
      '损害': '查明损害事实、因果关系和赔偿范围'
    };
    
    if (legalFocus[eventType]) {
      focus.push(legalFocus[eventType]);
    }
    
    // 争议解决焦点
    const disputedFacts = caseContext.threeElements?.facts?.disputedFacts || [];
    if (disputedFacts.some(fact => event.event.includes(fact.substring(0, 4)))) {
      focus.push('该事件涉及争议焦点，需要通过证据查明真相');
    }
    
    // 裁判思路焦点
    focus.push('平衡当事人利益，实现实体公正和程序公正的统一');
    
    return focus;
  }
  
  /**
   * 匹配相关判例
   */
  private async matchRelevantPrecedents(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): Promise<string[]> {
    const precedents: string[] = [];
    const eventType = this.classifyEventType(event);
    const caseType = caseContext.basicInfo?.caseType || '民事';
    
    // 基于事件类型的判例
    const precedentMap = {
      '合同': [
        '最高法（2020）民申123号：合同解释规则的适用',
        '最高法公报案例：违约损害赔偿的认定标准'
      ],
      '程序': [
        '最高法（2021）民终456号：程序瑕疵的法律后果',
        '最高法指导案例：管辖权异议的审查标准'
      ],
      '证据': [
        '最高法（2019）民再789号：电子证据的认定',
        '最高法公报：证据链认定的基本原则'
      ],
      '支付': [
        '最高法（2022）民终234号：付款义务的认定',
        '地方高院案例：利息计算标准'
      ]
    };
    
    if (precedentMap[eventType]) {
      precedents.push(...precedentMap[eventType]);
    }
    
    // 基于重要性的判例
    if (event.importance === 'critical') {
      precedents.push('建议检索最高法院类似案例，关注裁判要旨');
    }
    
    // 基于案件类型的判例
    if (caseType === '民事' && event.event.includes('合同')) {
      precedents.push('《最高人民法院关于审理买卖合同纠纷案件适用法律问题的解释》相关案例');
    }
    
    return [...new Set(precedents)];
  }
  
  /**
   * 提取平衡分析（中立视角）
   */
  private extractBalancedAnalysis(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): string[] {
    const analysis: string[] = [];
    
    // 客观评估事件影响
    analysis.push(`该事件对案件走向具有${this.getImpactLevel(event.importance)}影响`);
    
    // 双方立场分析
    if (event.party?.includes('原告')) {
      analysis.push('该事件由原告方主导，被告需要关注并准备应对');
    } else if (event.party?.includes('被告')) {
      analysis.push('该事件由被告方主导，原告需要评估其影响');
    } else {
      analysis.push('该事件涉及双方，需要综合考虑各方利益');
    }
    
    // 证据价值评估
    if (event.relatedEvidence && event.relatedEvidence.length > 0) {
      analysis.push('存在相关证据支持，但需要进一步质证');
    } else {
      analysis.push('缺乏直接证据，双方都需要补充相关证明材料');
    }
    
    // 法律适用分析
    analysis.push('需要准确识别法律关系，正确适用法律规定');
    
    // 风险与机会并存
    analysis.push('该事件既包含风险因素，也存在有利机会，关键在于如何运用');
    
    return analysis;
  }
  
  /**
   * 生成高级教学要点
   */
  private async generateAdvancedTeachingPoints(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): Promise<string[]> {
    const points: string[] = [];
    const eventType = this.classifyEventType(event);
    
    // 基础法学概念
    points.push(`理解"${event.event}"的法律性质和要件`);
    
    // 实务技能要点
    const practicalSkills = {
      '合同': '掌握合同条款的解释方法和争议处理技巧',
      '程序': '熟悉诉讼程序规则和程序性权利保护',
      '证据': '学习证据收集、固定和质证的方法',
      '支付': '理解债权债务关系和给付义务的认定',
      '损害': '掌握损害赔偿的构成要件和计算方法'
    };
    
    if (practicalSkills[eventType]) {
      points.push(practicalSkills[eventType]);
    }
    
    // 视角特定教学
    const perspectiveTeaching = {
      plaintiff: '学习如何构建有力的诉讼请求和事实主张',
      defendant: '掌握防御策略和抗辩理由的构建方法',
      judge: '理解司法裁判的思维方式和论证逻辑',
      neutral: '培养全面、客观分析案件的能力'
    };
    
    points.push(perspectiveTeaching[perspective]);
    
    // 案例教学法
    points.push('通过本案例理解理论与实践的结合');
    
    // 法律思维培养
    if (event.importance === 'critical') {
      points.push('识别案件关键节点，把握诉讼策略要点');
    }
    
    // 职业技能提升
    points.push('提升法律文书写作和法庭辩论技巧');
    
    return points;
  }
  
  /**
   * 生成视角教学洞察
   */
  private generatePerspectiveTeachingInsights(perspective: ViewPerspective): string[] {
    const insights = {
      plaintiff: [
        '原告视角：学会主动构建有利的事实和法律框架',
        '掌握举证责任分配规则，合理分配举证任务',
        '理解请求权基础理论，准确定位法律依据'
      ],
      defendant: [
        '被告视角：学会识别对方主张的薄弱环节',
        '掌握各类抗辩权的行使条件和方式',
        '理解防御性策略与反诉策略的选择'
      ],
      judge: [
        '法官视角：培养居中裁判的思维方式',
        '学会平衡当事人利益和社会公共利益',
        '掌握事实认定和法律适用的方法论'
      ],
      neutral: [
        '中立视角：客观评估案件的风险和机会',
        '全面分析各方的优势和劣势',
        '预测可能的案件走向和结果'
      ]
    };
    
    return insights[perspective] || insights.neutral;
  }
  
  /**
   * 获取影响等级描述
   */
  private getImpactLevel(importance?: 'critical' | 'important' | 'normal'): string {
    const levels = {
      critical: '决定性',
      important: '重要',
      normal: '一般'
    };
    return levels[importance || 'normal'] || '一定';
  }
  
  /**
   * 格式化案件上下文
   */
  private formatCaseContext(caseContext: Partial<LegalCase>): string {
    const parts: string[] = [];
    
    if (caseContext.basicInfo) {
      parts.push(`案件类型：${caseContext.basicInfo.caseType}`);
      parts.push(`法院：${caseContext.basicInfo.court}`);
    }
    
    if (caseContext.threeElements?.facts?.summary) {
      parts.push(`案情摘要：${caseContext.threeElements.facts.summary}`);
    }
    
    return parts.join('\n') || '暂无背景信息';
  }
  
  /**
   * 获取视角提示词
   */
  private getPerspectivePrompt(perspective: ViewPerspective): string {
    switch (perspective) {
      case 'plaintiff':
        return '从原告角度';
      case 'defendant':
        return '从被告角度';
      case 'judge':
        return '从法官角度';
      default:
        return '从中立角度';
    }
  }
  
  /**
   * 计算分析可信度
   */
  private calculateConfidence(
    importance: ImportanceScore,
    analysis: LegalAnalysis
  ): number {
    let confidence = 70; // 基础可信度
    
    // 根据内容完整性调整
    if (analysis.legalPrinciples.length > 2) confidence += 10;
    if (analysis.applicableLaws.length > 1) confidence += 10;
    if (analysis.precedents.length > 0) confidence += 5;
    if (importance.reasoning.length > 50) confidence += 5;
    
    return Math.min(100, confidence);
  }
  
  // ========== 降级方案方法 ==========
  
  /**
   * 获取降级重要性评估
   */
  private getFallbackImportance(event: TimelineEvent): ImportanceScore {
    // 基于关键词的简单评估
    const keyWords = ['签订', '合同', '起诉', '判决', '执行', '支付', '违约'];
    const hasKeyWord = keyWords.some(word => event.event.includes(word));
    
    const score = hasKeyWord ? 75 : 50;
    const level: ImportanceLevel = score >= 80 ? 'critical' : 
                                   score >= 60 ? 'high' : 
                                   score >= 40 ? 'medium' : 'low';
    
    return {
      score,
      level,
      reasoning: '基于事件关键词的初步评估',
      legalSignificance: hasKeyWord ? ['可能影响案件走向'] : [],
      impactFactors: {
        proceduralImpact: 50,
        substantiveImpact: hasKeyWord ? 70 : 40,
        evidenceImpact: 50,
        strategicImpact: 50
      }
    };
  }
  
  /**
   * 获取降级法学分析
   */
  private getFallbackLegalAnalysis(event: TimelineEvent): LegalAnalysis {
    return {
      factualAnalysis: `${event.event}是案件发展的重要节点，需要结合具体证据进行分析。`,
      legalPrinciples: ['诚实信用原则', '证据规则'],
      jurisprudence: '该事件的法律意义需要在整体案件背景下理解。',
      evidenceRequirement: '需要相关书证、证人证言等证据支持。',
      riskAssessment: '应注意诉讼时效和举证责任问题。',
      strategicAdvice: '建议保存相关证据，咨询专业律师。',
      applicableLaws: ['《民法典》相关条款', '《民事诉讼法》相关规定'],
      precedents: [],
      keyTerms: []
    };
  }
  
  /**
   * 获取降级完整分析
   */
  private getFallbackAnalysis(
    event: TimelineEvent,
    perspective: ViewPerspective
  ): TimelineAnalysis {
    return {
      eventId: `${event.date}-${event.event}`.replace(/\s+/g, '-'),
      perspective,
      importance: this.getFallbackImportance(event),
      legalAnalysis: this.getFallbackLegalAnalysis(event),
      generatedAt: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      apiVersion: '1.0.0-fallback',
      confidence: 50
    };
  }
  
  // ========== 辅助方法 ==========
  
  private extractFavorablePoints(event: TimelineEvent, party: 'plaintiff' | 'defendant'): string[] {
    // 简化实现，实际应基于事件内容分析
    return [`该事件对${party === 'plaintiff' ? '原告' : '被告'}有利`];
  }
  
  private extractConcerns(event: TimelineEvent, party: 'plaintiff' | 'defendant'): string[] {
    return ['需要关注举证责任', '注意诉讼时效'];
  }
  
  private extractDefensiveStrategies(event: TimelineEvent): string[] {
    return ['可以质疑证据真实性', '主张程序瑕疵'];
  }
  
  private extractCounterArguments(event: TimelineEvent): string[] {
    return ['对方主张缺乏法律依据', '事实认定存在争议'];
  }
  
  private extractJudicialFocus(event: TimelineEvent): string[] {
    return ['事实是否清楚', '证据是否充分', '法律适用是否正确'];
  }
  
  private async findRelevantPrecedents(event: TimelineEvent): Promise<string[]> {
    // 简化实现，实际应查询判例数据库
    return ['最高法指导案例XX号'];
  }
  
  private generateTeachingPoints(event: TimelineEvent): string[] {
    const points: string[] = ['理解该事件的法律意义'];
    
    if (event.event.includes('合同')) {
      points.push('合同成立与生效的区别');
      points.push('意思表示的认定');
    }
    
    if (event.event.includes('起诉')) {
      points.push('起诉条件和管辖权');
      points.push('诉讼时效的计算');
    }
    
    return points;
  }
  
  /**
   * 获取重要性评估的系统提示词
   */
  private getImportanceSystemPrompt(perspective: ViewPerspective): string {
    const basePrompt = `你是资深法律专家，正在评估案件时间线事件的重要性。
请从以下维度进行综合评分：
1. 程序性影响：对诉讼程序的影响（0-100分）
2. 实体性影响：对案件实体判决的影响（0-100分）
3. 证据影响：对证据链的影响（0-100分）
4. 策略影响：对诉讼策略的影响（0-100分）

评分标准：
- 90-100分：关键性事件，直接决定案件走向
- 70-89分：重要事件，显著影响案件进展
- 50-69分：一般事件，有一定影响
- 30-49分：次要事件，影响较小
- 0-29分：边缘事件，基本无影响`;

    const perspectivePrompts = {
      neutral: '请保持中立客观的立场进行评估。',
      plaintiff: '请从原告有利的角度评估事件重要性。',
      defendant: '请从被告有利的角度评估事件重要性。',
      judge: '请从法官审理案件的角度评估事件重要性。'
    };
    
    return `${basePrompt}\n\n${perspectivePrompts[perspective]}`;
  }
  
  /**
   * 计算多维度影响因子
   */
  private async calculateImpactFactors(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective,
    baseScore: ImportanceScore
  ): Promise<ImportanceScore['impactFactors']> {
    // 基于事件类型和上下文智能计算各维度影响
    const eventType = this.classifyEventType(event);
    const caseType = caseContext.basicInfo?.caseType || '民事';
    
    // 程序性影响评估
    const proceduralImpact = this.calculateProceduralImpact(event, eventType, caseType);
    
    // 实体性影响评估
    const substantiveImpact = this.calculateSubstantiveImpact(
      event, 
      eventType, 
      caseContext,
      perspective
    );
    
    // 证据影响评估
    const evidenceImpact = this.calculateEvidenceImpact(
      event,
      caseContext.threeElements?.evidence
    );
    
    // 策略影响评估
    const strategicImpact = this.calculateStrategicImpact(
      event,
      perspective,
      baseScore.level
    );
    
    return {
      proceduralImpact,
      substantiveImpact,
      evidenceImpact,
      strategicImpact
    };
  }
  
  /**
   * 事件类型分类
   */
  private classifyEventType(event: TimelineEvent): string {
    const keywords = {
      '程序': ['立案', '受理', '开庭', '宣判', '上诉', '执行', '送达', '管辖'],
      '合同': ['签订', '履行', '违约', '解除', '变更', '转让'],
      '支付': ['付款', '支付', '汇款', '结算', '欠款', '催款'],
      '证据': ['提交', '质证', '鉴定', '公证', '认证'],
      '和解': ['调解', '和解', '协商', '谈判'],
      '损害': ['侵权', '损失', '赔偿', '伤害']
    };
    
    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(word => event.event.includes(word))) {
        return type;
      }
    }
    
    return '其他';
  }
  
  /**
   * 计算程序性影响
   */
  private calculateProceduralImpact(
    event: TimelineEvent,
    eventType: string,
    caseType: string
  ): number {
    // 关键程序节点
    const criticalProcedures = ['立案', '开庭', '宣判', '执行'];
    if (criticalProcedures.some(p => event.event.includes(p))) {
      return 90 + Math.random() * 10;
    }
    
    // 程序类事件
    if (eventType === '程序') {
      return 70 + Math.random() * 20;
    }
    
    // 证据提交等准程序事件
    if (eventType === '证据') {
      return 50 + Math.random() * 20;
    }
    
    // 其他事件的程序影响较小
    return 10 + Math.random() * 30;
  }
  
  /**
   * 计算实体性影响
   */
  private calculateSubstantiveImpact(
    event: TimelineEvent,
    eventType: string,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): number {
    // 合同类事件通常有高实体影响
    if (eventType === '合同') {
      const baseImpact = 70 + Math.random() * 20;
      
      // 根据视角调整
      if (perspective === 'plaintiff' && event.party?.includes('原告')) {
        return Math.min(100, baseImpact + 10);
      }
      if (perspective === 'defendant' && event.party?.includes('被告')) {
        return Math.min(100, baseImpact + 10);
      }
      
      return baseImpact;
    }
    
    // 支付类事件
    if (eventType === '支付') {
      return 60 + Math.random() * 30;
    }
    
    // 损害类事件
    if (eventType === '损害') {
      return 80 + Math.random() * 15;
    }
    
    // 争议事实相关
    const disputedFacts = caseContext.threeElements?.facts?.disputedFacts || [];
    if (disputedFacts.some(fact => event.event.includes(fact.substring(0, 4)))) {
      return 70 + Math.random() * 20;
    }
    
    return 20 + Math.random() * 40;
  }
  
  /**
   * 计算证据影响
   */
  private calculateEvidenceImpact(
    event: TimelineEvent,
    evidence?: Evidence
  ): number {
    // 直接涉及证据的事件
    if (event.relatedEvidence && event.relatedEvidence.length > 0) {
      return 70 + Math.random() * 25;
    }
    
    // 与证据链相关
    if (evidence?.chainAnalysis) {
      const chainStrength = evidence.chainAnalysis.strength;
      const strengthScores = { strong: 80, moderate: 60, weak: 40 };
      const baseScore = strengthScores[chainStrength] || 50;
      
      // 如果事件可能影响证据链完整性
      if (event.importance === 'critical') {
        return Math.min(100, baseScore + 20);
      }
      
      return baseScore + Math.random() * 20;
    }
    
    // 可能产生证据的事件
    const evidenceKeywords = ['签订', '支付', '交付', '履行', '通知'];
    if (evidenceKeywords.some(k => event.event.includes(k))) {
      return 50 + Math.random() * 30;
    }
    
    return 10 + Math.random() * 30;
  }
  
  /**
   * 计算策略影响
   */
  private calculateStrategicImpact(
    event: TimelineEvent,
    perspective: ViewPerspective,
    importanceLevel: ImportanceLevel
  ): number {
    // 关键事件的策略影响
    if (importanceLevel === 'critical') {
      return 85 + Math.random() * 15;
    }
    
    // 根据视角评估策略价值
    if (perspective !== 'neutral') {
      // 己方行为的策略价值
      const partyMatch = 
        (perspective === 'plaintiff' && event.party?.includes('原告')) ||
        (perspective === 'defendant' && event.party?.includes('被告'));
      
      if (partyMatch) {
        return 70 + Math.random() * 25;
      }
      
      // 对方行为需要应对策略
      return 60 + Math.random() * 30;
    }
    
    // 中立视角下的一般策略影响
    if (importanceLevel === 'high') {
      return 60 + Math.random() * 20;
    }
    
    return 20 + Math.random() * 40;
  }
  
  /**
   * 识别法律意义标签
   */
  private identifyLegalSignificance(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>
  ): string[] {
    const tags: string[] = [];
    
    // 程序关键节点
    const proceduralTags = {
      '立案': '诉讼时效',
      '开庭': '程序正义',
      '判决': '既判力',
      '执行': '强制执行'
    };
    
    // 实体法意义
    const substantiveTags = {
      '合同签订': '合同成立',
      '违约': '违约责任',
      '支付': '债务履行',
      '损害': '侵权责任',
      '交付': '所有权转移'
    };
    
    // 证据法意义
    const evidenceTags = {
      '公证': '证据效力',
      '鉴定': '专业认定',
      '证人': '证言采信'
    };
    
    // 检查并添加标签
    for (const [keyword, tag] of Object.entries({...proceduralTags, ...substantiveTags, ...evidenceTags})) {
      if (event.event.includes(keyword.substring(0, 2))) {
        tags.push(tag);
      }
    }
    
    // 基于重要性添加通用标签
    if (event.importance === 'critical') {
      tags.push('案件转折点');
    }
    
    if (event.isKeyEvent) {
      tags.push('关键事实');
    }
    
    // 基于案件类型添加特定标签
    const caseType = caseContext.basicInfo?.caseType;
    if (caseType === '民事' && event.event.includes('合同')) {
      tags.push('民事法律关系');
    }
    
    return [...new Set(tags)]; // 去重
  }
  
  /**
   * 丰富评分理由
   */
  private enrichReasoning(
    baseReasoning: string,
    impactFactors: ImportanceScore['impactFactors'],
    legalSignificance: string[]
  ): string {
    const factors = [];
    
    // 添加主要影响维度说明
    const maxImpact = Math.max(
      impactFactors.proceduralImpact,
      impactFactors.substantiveImpact,
      impactFactors.evidenceImpact,
      impactFactors.strategicImpact
    );
    
    if (maxImpact === impactFactors.proceduralImpact) {
      factors.push('该事件对诉讼程序具有重要影响');
    } else if (maxImpact === impactFactors.substantiveImpact) {
      factors.push('该事件对案件实体判决具有关键作用');
    } else if (maxImpact === impactFactors.evidenceImpact) {
      factors.push('该事件对证据链形成具有重要意义');
    } else {
      factors.push('该事件对诉讼策略具有重要价值');
    }
    
    // 添加法律意义说明
    if (legalSignificance.length > 0) {
      factors.push(`涉及${legalSignificance.slice(0, 3).join('、')}等法律要点`);
    }
    
    return `${baseReasoning} ${factors.join('。')}`;
  }
  
  /**
   * 增强的降级评分方案
   */
  private getEnhancedFallbackScore(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): ImportanceScore {
    const eventType = this.classifyEventType(event);
    const baseScore = this.getFallbackImportance(event);
    
    // 计算各维度影响（使用规则引擎）
    const impactFactors = {
      proceduralImpact: this.calculateProceduralImpact(event, eventType, '民事'),
      substantiveImpact: this.calculateSubstantiveImpact(event, eventType, caseContext, perspective),
      evidenceImpact: this.calculateEvidenceImpact(event, caseContext.threeElements?.evidence),
      strategicImpact: this.calculateStrategicImpact(event, perspective, baseScore.level)
    };
    
    // 识别法律意义
    const legalSignificance = this.identifyLegalSignificance(event, caseContext);
    
    // 调整总分
    const avgImpact = Object.values(impactFactors).reduce((a, b) => a + b, 0) / 4;
    const adjustedScore = Math.round((baseScore.score + avgImpact) / 2);
    
    // 重新确定等级
    let level: ImportanceLevel = 'low';
    if (adjustedScore >= 75) level = 'critical';
    else if (adjustedScore >= 60) level = 'high';
    else if (adjustedScore >= 40) level = 'medium';
    
    return {
      score: adjustedScore,
      level,
      reasoning: this.enrichReasoning(
        `基于规则引擎分析：${event.event}`,
        impactFactors,
        legalSignificance
      ),
      legalSignificance,
      impactFactors
    };
  }
  
  /**
   * 计算重试延迟（指数退避策略）
   */
  private calculateRetryDelay(retryCount: number): number {
    // 指数退避：1秒、2秒、4秒
    return Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
  }
  
  /**
   * 记录错误日志
   */
  private logError(error: TimelineAnalysisError, context: any): void {
    this.errorLog.push({
      timestamp: new Date(),
      error,
      context
    });
    
    // 保持日志大小在100条以内
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }
    
    // 错误分类统计
    const errorCode = error.code || 'UNKNOWN';
    console.error(`📊 错误统计: ${errorCode} - ${error.message}`);
  }
  
  /**
   * 获取增强的降级分析（比基础降级更智能）
   */
  private getEnhancedFallbackAnalysis(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): TimelineAnalysis {
    const importance = this.getEnhancedFallbackScore(event, caseContext, perspective);
    const legalAnalysis = this.getEnhancedFallbackLegalAnalysis(event, caseContext, perspective);
    
    // 基于规则的视角分析 - 为所有视角都提供分析
    console.log(`🚀 调用 getEnhancedFallbackPerspectiveAnalysis - 视角: ${perspective}`);
    const perspectiveAnalysis = this.getEnhancedFallbackPerspectiveAnalysis(event, caseContext, perspective);
    console.log(`📋 获得的 perspectiveAnalysis 有 viewpoint: ${!!perspectiveAnalysis.viewpoint}`);
    
    return {
      eventId: `${event.date}-${event.event}`.replace(/\s+/g, '-'),
      perspective,
      importance,
      legalAnalysis,
      perspectiveAnalysis,
      generatedAt: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6小时过期
      apiVersion: '1.0.0-fallback',
      confidence: 0.6, // 降级方案置信度较低
      isFallback: true // 标记为降级结果
    };
  }
  
  /**
   * 获取增强的降级法学分析
   */
  private getEnhancedFallbackLegalAnalysis(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): LegalAnalysis {
    // 基于事件类型的智能分析
    const eventType = this.detectEventType(event);
    const caseType = caseContext.basicInfo?.caseType || '民事纠纷';
    
    return {
      factualAnalysis: this.generateFactualAnalysis(event, eventType, caseType),
      legalPrinciples: this.selectLegalPrinciples(eventType, caseType),
      jurisprudence: this.generateJurisprudence(eventType, caseType),
      evidenceRequirement: this.generateEvidenceRequirements(event, eventType),
      riskAssessment: this.generateRiskAssessment(event, eventType, perspective),
      strategicAdvice: this.generateStrategicAdvice(event, eventType, perspective),
      applicableLaws: this.selectApplicableLaws(eventType, caseType),
      precedents: this.selectPrecedents(eventType),
      keyTerms: this.extractKeyTerms(event, eventType)
    };
  }
  
  /**
   * 获取增强的降级视角分析
   */
  private getEnhancedFallbackPerspectiveAnalysis(
    event: TimelineEvent,
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective
  ): PerspectiveAnalysis {
    console.log(`🔧 开始生成视角分析 - 视角: ${perspective}`);
    
    const eventType = this.detectEventType(event);
    
    // 首先获取基础法学分析（PerspectiveAnalysis继承自LegalAnalysis）
    const baseLegalAnalysis = this.getEnhancedFallbackLegalAnalysis(event, caseContext, perspective);
    
    // 根据视角生成观点总结
    const viewpoint = this.generateViewpointSummary(event, perspective, eventType);
    console.log(`✅ 生成的观点内容: ${viewpoint}`);
    
    // 根据不同视角添加特定内容
    const perspectiveSpecific = this.getPerspectiveSpecificAnalysis(event, eventType, perspective, caseContext);
    
    const result = {
      ...baseLegalAnalysis, // 继承所有LegalAnalysis字段
      perspective,
      viewpoint,
      ...perspectiveSpecific
    };
    
    console.log(`🎯 返回的视角分析对象有viewpoint字段: ${!!result.viewpoint}`);
    
    return result;
  }

  /**
   * 生成视角观点总结
   */
  private generateViewpointSummary(event: TimelineEvent, perspective: ViewPerspective, eventType: string): string {
    const eventName = event.event;
    
    console.log(`🔍 生成视角观点 - 事件: ${eventName}, 视角: ${perspective}`);
    
    switch (perspective) {
      case 'plaintiff':
        return `从原告角度看，${eventName}是有利证据，强化了诉讼请求的合理性，为胜诉奠定了重要基础。`;
      case 'defendant':
        return `从被告角度看，${eventName}需要谨慎应对，应分析其对己方可能产生的不利影响，制定相应防御策略。`;
      case 'judge':
        return `从审判角度看，${eventName}是案件审理的关键节点，需要全面评估其对双方当事人权益的影响。`;
      default:
        return `${eventName}是案件进程中的重要事件，对案件最终走向具有显著影响，需要客观全面地分析其法律意义。`;
    }
  }

  /**
   * 获取视角特定分析内容
   */
  private getPerspectiveSpecificAnalysis(
    event: TimelineEvent, 
    eventType: string, 
    perspective: ViewPerspective, 
    caseContext: Partial<LegalCase>
  ): Partial<PerspectiveAnalysis> {
    switch (perspective) {
      case 'plaintiff':
        return {
          favorablePoints: this.generateFavorablePoints(event, eventType),
          concerns: this.generateConcerns(event, eventType)
        };
      case 'defendant':
        return {
          defensiveStrategy: this.generateDefensiveStrategies(event, eventType),
          counterArguments: this.generateCounterarguments(event, eventType)
        };
      case 'judge':
        return {
          keyFocus: this.generateKeyFocus(event, eventType),
          teachingPoints: this.generateTeachingPoints(event, eventType)
        };
      default:
        return {};
    }
  }

  /**
   * 生成有利要点（原告视角）
   */
  private generateFavorablePoints(event: TimelineEvent, eventType: string): string[] {
    return [
      `事件发生时间明确，便于举证`,
      `事件内容与诉讼请求直接相关`,
      `对方当事人行为存在明显不当之处`
    ];
  }

  /**
   * 生成关注风险（原告视角）
   */
  private generateConcerns(event: TimelineEvent, eventType: string): string[] {
    return [
      `需要充分的证据支持事实主张`,
      `对方可能提出反驳和抗辩`,
      `注意举证责任的分配问题`
    ];
  }

  /**
   * 生成防御策略（被告视角）
   */
  private generateDefensiveStrategies(event: TimelineEvent, eventType: string): string[] {
    return [
      `质疑事实的真实性和准确性`,
      `提出程序性抗辩`,
      `寻找有利的反驳证据`
    ];
  }

  /**
   * 生成反驳论点（被告视角）
   */
  private generateCounterarguments(event: TimelineEvent, eventType: string): string[] {
    return [
      `事实认定存在争议`,
      `法律适用可能存在偏差`,
      `损害后果与行为无因果关系`
    ];
  }

  /**
   * 生成关键焦点（法官视角）
   */
  private generateKeyFocus(event: TimelineEvent, eventType: string): string[] {
    return [
      `事实认定的准确性`,
      `证据的关联性和证明力`,
      `法律适用的准确性`
    ];
  }

  /**
   * 生成教学要点（法官视角）
   */
  private generateTeachingPoints(event: TimelineEvent, eventType: string): string[] {
    return [
      `分析事实认定的方法和标准`,
      `理解举证责任的分配原则`,
      `掌握相关法律条文的适用`
    ];
  }
  
  /**
   * 检测事件类型
   */
  private detectEventType(event: TimelineEvent): string {
    const eventText = event.event.toLowerCase();
    
    if (eventText.includes('合同') || eventText.includes('签订')) return 'contract';
    if (eventText.includes('起诉') || eventText.includes('立案')) return 'litigation';
    if (eventText.includes('判决') || eventText.includes('裁定')) return 'judgment';
    if (eventText.includes('证据') || eventText.includes('举证')) return 'evidence';
    if (eventText.includes('支付') || eventText.includes('履行')) return 'performance';
    if (eventText.includes('违约') || eventText.includes('侵权')) return 'breach';
    
    return 'general';
  }
  
  /**
   * 生成事实分析
   */
  private generateFactualAnalysis(event: TimelineEvent, eventType: string, caseType: string): string {
    const templates = {
      contract: `${event.date}的${event.event}标志着当事人之间法律关系的确立。该事件${event.detail ? '具体表现为' + event.detail : ''}，在${caseType}案件中具有重要的事实认定价值。`,
      litigation: `${event.date}的${event.event}启动了司法程序。${event.party || '当事人'}采取的这一诉讼行为，将对后续程序产生重要影响。`,
      judgment: `${event.date}的${event.event}是案件的关键裁决节点。法院的这一决定${event.detail ? '基于' + event.detail : ''}，对当事人权利义务产生实质影响。`,
      default: `${event.date}发生的${event.event}是案件发展的重要节点。${event.detail || '该事件'}需要结合其他证据进行综合分析。`
    };
    
    return templates[eventType] || templates.default;
  }
  
  /**
   * 选择法律原则
   */
  private selectLegalPrinciples(eventType: string, caseType: string): string[] {
    const principles: Record<string, string[]> = {
      contract: ['合同自由原则', '诚实信用原则', '意思自治原则'],
      litigation: ['程序正义原则', '当事人平等原则', '处分原则'],
      judgment: ['依法裁判原则', '公正审判原则', '法律适用统一原则'],
      evidence: ['谁主张谁举证原则', '证据裁判原则', '自由心证原则'],
      performance: ['全面履行原则', '协作履行原则', '情势变更原则'],
      breach: ['过错责任原则', '损害赔偿原则', '减损规则']
    };
    
    return principles[eventType] || ['诚实信用原则', '公平原则', '自愿原则'];
  }
  
  /**
   * 生成法理分析
   */
  private generateJurisprudence(eventType: string, caseType: string): string {
    const jurisprudenceMap: Record<string, string> = {
      contract: '根据合同法理论，合同的成立需要当事人意思表示一致，生效则需满足法定要件。本事件涉及合同关系的核心要素认定。',
      litigation: '诉讼程序的启动标志着争议进入司法解决轨道。程序正义是实体正义的保障，程序瑕疵可能影响实体权利的实现。',
      judgment: '司法裁判是法律适用的过程，需要在查明事实的基础上正确适用法律。裁判的公正性和可接受性是司法权威的基础。',
      evidence: '证据是认定案件事实的基础。证据的真实性、合法性、关联性决定其证明力，证据链的完整性影响事实认定的可靠性。',
      default: `在${caseType}案件中，该事件的法律意义需要从权利义务关系、因果关系、责任承担等角度进行综合分析。`
    };
    
    return jurisprudenceMap[eventType] || jurisprudenceMap.default;
  }
  
  /**
   * 生成举证要求
   */
  private generateEvidenceRequirements(event: TimelineEvent, eventType: string): string {
    const requirements: Record<string, string> = {
      contract: '需要提供合同文本、签约过程记录、履行凭证等书证，必要时可申请证人出庭作证。',
      litigation: '需要提供起诉状、立案通知书、送达回证等程序性文件，确保程序合法性。',
      judgment: '需要获取判决书正本、送达证明，关注判决理由和裁判要旨。',
      evidence: '需要确保证据的三性（真实性、合法性、关联性），注意证据的收集和保全。',
      performance: '需要提供履行凭证、支付记录、验收文件等，证明履行行为的真实性。',
      breach: '需要证明违约事实、损失情况、因果关系，收集相关证据材料。',
      default: '需要收集与该事件相关的书证、物证、证人证言等，确保证据的完整性和证明力。'
    };
    
    return requirements[eventType] || requirements.default;
  }
  
  /**
   * 生成风险评估
   */
  private generateRiskAssessment(event: TimelineEvent, eventType: string, perspective: ViewPerspective): string {
    const riskTemplates = {
      plaintiff: {
        contract: '需关注合同效力风险、举证责任风险、诉讼时效风险。',
        litigation: '需评估诉讼成本、举证难度、执行风险。',
        default: '需关注举证责任、诉讼时效、对方抗辩等风险因素。'
      },
      defendant: {
        contract: '需关注合同瑕疵抗辩、履行抗辩、时效抗辩的可能性。',
        litigation: '需评估应诉策略、反诉可能、和解空间。',
        default: '需关注程序合规、实体抗辩、证据反驳等防御要点。'
      },
      judge: {
        contract: '需审查合同效力、履行情况、违约责任等核心争议。',
        litigation: '需确保程序合法、事实清楚、法律适用正确。',
        default: '需平衡当事人利益、维护司法公正、确保裁判可执行。'
      },
      neutral: {
        default: '该事件可能涉及举证责任分配、诉讼时效、法律适用等多重风险，需要全面评估。'
      }
    };
    
    const perspectiveRisks = riskTemplates[perspective] || riskTemplates.neutral;
    return perspectiveRisks[eventType] || perspectiveRisks.default;
  }
  
  /**
   * 生成策略建议
   */
  private generateStrategicAdvice(event: TimelineEvent, eventType: string, perspective: ViewPerspective): string {
    const advice = {
      plaintiff: '建议充分收集证据、明确诉讼请求、预估诉讼风险、考虑和解可能。',
      defendant: '建议全面审查对方主张、准备抗辩理由、收集反证、评估和解条件。',
      judge: '建议引导当事人充分举证、查明案件事实、正确适用法律、注重裁判说理。',
      neutral: '建议客观分析案情、评估各方立场、预测可能结果、寻求最优解决方案。'
    };
    
    return advice[perspective] || advice.neutral;
  }
  
  /**
   * 选择适用法律
   */
  private selectApplicableLaws(eventType: string, caseType: string): string[] {
    const lawMap: Record<string, string[]> = {
      contract: ['《民法典》合同编', '《民法典》总则编', '相关司法解释'],
      litigation: ['《民事诉讼法》', '《最高法院关于民事诉讼证据的若干规定》'],
      judgment: ['《民事诉讼法》执行程序', '相关司法解释'],
      evidence: ['《民事诉讼法》证据规则', '《最高法院关于民事诉讼证据的若干规定》'],
      default: ['《民法典》相关条款', '《民事诉讼法》相关规定']
    };
    
    return lawMap[eventType] || lawMap.default;
  }
  
  /**
   * 选择相关判例
   */
  private selectPrecedents(eventType: string): string[] {
    const precedentMap: Record<string, string[]> = {
      contract: ['最高法指导案例：合同纠纷类', '典型案例：合同效力认定'],
      litigation: ['最高法指导案例：程序类', '典型案例：管辖权争议'],
      evidence: ['最高法指导案例：证据认定类', '典型案例：举证责任分配'],
      default: ['相关指导性案例', '类似案例参考']
    };
    
    return precedentMap[eventType] || precedentMap.default;
  }
  
  /**
   * 提取关键术语
   */
  private extractKeyTerms(event: TimelineEvent, eventType: string): Array<{term: string; definition: string}> {
    const termsMap: Record<string, Array<{term: string; definition: string}>> = {
      contract: [
        { term: '要约', definition: '希望和他人订立合同的意思表示' },
        { term: '承诺', definition: '受要约人同意要约的意思表示' }
      ],
      litigation: [
        { term: '诉讼时效', definition: '权利人请求法院保护民事权利的法定期间' },
        { term: '管辖权', definition: '法院对案件进行审理和裁判的权力' }
      ],
      default: [
        { term: '举证责任', definition: '当事人对自己提出的主张提供证据加以证明的责任' }
      ]
    };
    
    return termsMap[eventType] || termsMap.default;
  }
  
  // 以下是辅助方法的简化实现
  private generatePartyAdvantages(event: TimelineEvent, eventType: string, perspective: ViewPerspective): string[] {
    return [`该事件对${perspective === 'plaintiff' ? '原告' : '被告'}有利`, '可作为重要证据使用'];
  }
  
  private generatePartyRisks(event: TimelineEvent, eventType: string, perspective: ViewPerspective): string[] {
    return ['需注意诉讼时效', '举证责任风险'];
  }
  
  private generateStrategicOptions(event: TimelineEvent, eventType: string, perspective: ViewPerspective): string[] {
    return ['可考虑和解', '申请调解', '继续诉讼'];
  }
  
  private generateRecommendedActions(event: TimelineEvent, eventType: string, perspective: ViewPerspective): string[] {
    return ['收集相关证据', '咨询专业律师', '评估风险收益'];
  }
  
  private generateCounterarguments(event: TimelineEvent, eventType: string): string[] {
    return ['质疑证据真实性', '主张程序瑕疵', '提出时效抗辩'];
  }
  
  private evaluateClaimStrength(event: TimelineEvent, caseContext: Partial<LegalCase>): string {
    return '基于现有证据，主张具有一定合理性，但需要进一步补强证据。';
  }
  
  private identifyEvidenceGaps(event: TimelineEvent, caseContext: Partial<LegalCase>): string[] {
    return ['缺少直接证据', '证人证言不足', '书证不完整'];
  }
  
  private generateDefenseStrategies(event: TimelineEvent, eventType: string): string[] {
    return ['程序抗辩', '实体抗辩', '证据质证'];
  }
  
  private identifyProceduralDefenses(event: TimelineEvent): string[] {
    return ['管辖权异议', '诉讼时效抗辩', '当事人资格异议'];
  }
  
  private identifyJudicialConcerns(event: TimelineEvent, caseContext: Partial<LegalCase>): string[] {
    return ['事实是否清楚', '证据是否充分', '法律适用是否正确'];
  }
  
  private identifyBalancingFactors(event: TimelineEvent, caseContext: Partial<LegalCase>): string[] {
    return ['当事人利益平衡', '社会公共利益', '法律效果与社会效果统一'];
  }
  
  /**
   * 批量分析多个事件
   */
  async batchAnalyze(
    events: TimelineEvent[],
    caseContext: Partial<LegalCase>,
    perspective: ViewPerspective = 'neutral'
  ): Promise<TimelineAnalysis[]> {
    const results: TimelineAnalysis[] = [];
    
    for (const event of events) {
      try {
        const analysis = await this.analyzeTimelineEvent(event, caseContext, { perspective });
        results.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze event ${event.id}:`, error);
        // 继续处理其他事件
      }
    }
    
    return results;
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    const totalRequests = Array.from(this.performanceMetrics.values())
      .reduce((sum, times) => sum + times.length, 0);
    
    const allTimes = Array.from(this.performanceMetrics.values()).flat();
    const averageResponseTime = allTimes.length > 0
      ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length
      : 0;
    
    // 获取缓存统计
    const cacheStats = cacheManager.getStats();
    
    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      lastResponseTime: allTimes[allTimes.length - 1] || 0,
      cacheHitRate: cacheStats.hitRate || 0,
      errorCount: this.errorLog.length
    };
  }

  /**
   * 获取错误日志报告
   */
  getErrorReport(): string {
    const errorCounts = this.errorLog.reduce((acc, log) => {
      acc[log.error.code] = (acc[log.error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return `错误统计：${JSON.stringify(errorCounts)}，总计：${this.errorLog.length}条`;
  }
  
  /**
   * 获取性能指标报告
   */
  getPerformanceReport(): string {
    const metrics: any = {};
    this.performanceMetrics.forEach((times, operation) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      metrics[operation] = {
        avg: Math.round(avg),
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length
      };
    });
    
    return `性能指标：${JSON.stringify(metrics, null, 2)}`;
  }
}

// 导出单例实例
export const timelineAnalyzer = new TimelineAnalyzer();