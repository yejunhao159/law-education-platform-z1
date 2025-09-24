/**
 * 节点级请求权分析器
 * 基于德国法学请求权分析法（Anspruchsmethode）
 * 对时间轴的每个节点进行专业的请求权法律分析
 */

import { createLogger } from '@/lib/logging';
import { ClaimAnalysisService } from './ClaimAnalysisService';
import type {
  TimelineEvent,
  ClaimAnalysisResult,
  ClaimStructure,
  DefenseStructure,
  ClaimElement,
  ClaimAnalysisRequest
} from '@/types/timeline-claim-analysis';

const logger = createLogger('NodeClaimAnalyzer');

export interface NodeClaimAnalysis {
  eventId: string;
  eventDate: string;
  eventTitle: string;

  // 请求权基础分析
  claimBasisAnalysis: {
    contractualClaims: ClaimBasisAssessment[];    // 合同请求权
    tortClaims: ClaimBasisAssessment[];          // 侵权请求权
    enrichmentClaims: ClaimBasisAssessment[];    // 不当得利请求权
    propertyClaims: ClaimBasisAssessment[];      // 物权请求权
    otherClaims: ClaimBasisAssessment[];         // 其他请求权
  };

  // 构成要件分析
  constitutiveElements: {
    satisfied: ClaimElement[];      // 已满足的构成要件
    disputed: ClaimElement[];       // 有争议的构成要件
    missing: ClaimElement[];        // 缺失的构成要件
  };

  // 排除消灭事由分析
  defenses: {
    substantiveDefenses: DefenseAssessment[];   // 实体抗辩
    proceduralDefenses: DefenseAssessment[];    // 程序抗辩
    limitationDefenses: DefenseAssessment[];    // 时效抗辩
  };

  // 举证责任分配
  burdenOfProof: {
    claimantBurden: string[];      // 申请人举证责任
    respondentBurden: string[];    // 应答人举证责任
    courtInquiry: string[];        // 法院调查事项
  };

  // 请求权竞合分析
  claimsConcurrence: {
    applicableClaims: string[];    // 可适用的请求权
    preferredClaim: string;        // 优先适用的请求权
    reasoning: string;             // 选择理由
  };

  // AI分析元数据
  metadata: {
    confidence: number;            // 分析置信度
    processingTime: number;        // 处理时间
    model: string;                 // 使用的模型
    analysisDepth: 'basic' | 'detailed' | 'comprehensive';
  };
}

export interface ClaimBasisAssessment {
  legalBasis: string;              // 法律条文基础
  description: string;             // 请求权描述
  applicability: 'high' | 'medium' | 'low' | 'none';  // 适用性评估
  elements: ClaimElement[];        // 构成要件
  reasoning: string;               // 分析理由
  relatedEvents: string[];         // 相关事件ID
}

export interface DefenseAssessment {
  type: string;                    // 抗辩类型
  description: string;             // 抗辩描述
  likelihood: 'high' | 'medium' | 'low';  // 成功可能性
  legalBasis: string[];           // 法律依据
  reasoning: string;               // 分析理由
}

export interface BatchAnalysisResult {
  analysisId: string;
  timestamp: string;
  caseContext: {
    totalEvents: number;
    dateRange: {
      start: string;
      end: string;
    };
    mainParties: string[];
    caseType: string;
  };
  nodeAnalyses: NodeClaimAnalysis[];
  globalInsights: {
    dominantClaimTypes: string[];     // 主要请求权类型
    keyTurningPoints: string[];       // 关键转折点
    evidenceGaps: string[];           // 证据缺口
    strategicRecommendations: string[]; // 策略建议
  };
  metadata: {
    totalProcessingTime: number;
    averageConfidence: number;
    analysisCompleteness: number; // 完整度百分比
  };
}

/**
 * 节点级请求权分析器
 */
export class NodeClaimAnalyzer {
  private readonly claimAnalysisService: ClaimAnalysisService;
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.claimAnalysisService = new ClaimAnalysisService();
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  /**
   * 分析单个时间轴节点的请求权结构
   */
  async analyzeEventClaims(
    event: TimelineEvent,
    caseContext: {
      allEvents: TimelineEvent[];
      caseType: string;
      mainParties: string[];
      contractualContext?: any;
    }
  ): Promise<NodeClaimAnalysis> {
    const startTime = Date.now();

    try {
      logger.info('开始节点级请求权分析', {
        eventId: event.id,
        eventDate: event.date,
        eventTitle: event.title
      });

      // 1. 构建节点专用的分析提示词
      const prompt = this.buildNodeAnalysisPrompt(event, caseContext);

      // 2. 调用AI服务
      const aiResponse = await this.callAIService(prompt);

      // 3. 解析AI响应
      const parsedAnalysis = this.parseNodeAnalysisResponse(aiResponse);

      // 4. 增强分析结果
      const enhancedAnalysis = await this.enhanceWithContextualAnalysis(
        parsedAnalysis,
        event,
        caseContext
      );

      const analysis: NodeClaimAnalysis = {
        eventId: event.id,
        eventDate: event.date,
        eventTitle: event.title,
        ...enhancedAnalysis,
        metadata: {
          confidence: this.calculateAnalysisConfidence(enhancedAnalysis),
          processingTime: Date.now() - startTime,
          model: 'deepseek-chat-node-claim',
          analysisDepth: 'detailed'
        }
      };

      logger.info('节点级请求权分析完成', {
        eventId: event.id,
        confidence: analysis.metadata.confidence,
        processingTime: analysis.metadata.processingTime
      });

      return analysis;

    } catch (error) {
      logger.error('节点级请求权分析失败', {
        eventId: event.id,
        error: error instanceof Error ? error.message : '未知错误'
      });

      // 返回默认分析结果
      return this.buildDefaultNodeAnalysis(event, Date.now() - startTime);
    }
  }

  /**
   * 批量分析整个时间轴的请求权结构
   */
  async batchAnalyzeTimeline(events: TimelineEvent[]): Promise<BatchAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info('开始批量时间轴请求权分析', {
        eventsCount: events.length,
        dateRange: {
          start: events[0]?.date,
          end: events[events.length - 1]?.date
        }
      });

      // 1. 构建案例上下文
      const caseContext = this.buildCaseContext(events);

      // 2. 并行分析每个节点（限制并发数以避免API限制）
      const batchSize = 3; // 每批处理3个节点
      const nodeAnalyses: NodeClaimAnalysis[] = [];

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const batchPromises = batch.map(event =>
          this.analyzeEventClaims(event, caseContext)
        );

        const batchResults = await Promise.all(batchPromises);
        nodeAnalyses.push(...batchResults);

        // 添加延时以避免API速率限制
        if (i + batchSize < events.length) {
          await this.delay(1000); // 1秒延时
        }
      }

      // 3. 生成全局洞察
      const globalInsights = await this.generateGlobalInsights(nodeAnalyses, events);

      const result: BatchAnalysisResult = {
        analysisId: `batch-${Date.now()}`,
        timestamp: new Date().toISOString(),
        caseContext,
        nodeAnalyses,
        globalInsights,
        metadata: {
          totalProcessingTime: Date.now() - startTime,
          averageConfidence: this.calculateAverageConfidence(nodeAnalyses),
          analysisCompleteness: this.calculateCompleteness(nodeAnalyses)
        }
      };

      logger.info('批量时间轴分析完成', {
        totalEvents: events.length,
        successfulAnalyses: nodeAnalyses.length,
        totalTime: result.metadata.totalProcessingTime,
        avgConfidence: result.metadata.averageConfidence
      });

      return result;

    } catch (error) {
      logger.error('批量时间轴分析失败', error);
      throw new Error(`批量分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 构建节点分析专用提示词
   */
  private buildNodeAnalysisPrompt(
    event: TimelineEvent,
    caseContext: {
      allEvents: TimelineEvent[];
      caseType: string;
      mainParties: string[];
      contractualContext?: any;
    }
  ): string {
    const eventIndex = caseContext.allEvents.findIndex(e => e.id === event.id);
    const precedingEvents = caseContext.allEvents.slice(0, eventIndex);
    const followingEvents = caseContext.allEvents.slice(eventIndex + 1, eventIndex + 3); // 接下来的2个事件作为上下文

    return `你是一位精通德国法学请求权分析法（Anspruchsmethode）的专业法官和法学教授。请对以下时间轴节点进行深入的请求权法律分析。

## 分析方法论
严格按照德国法学请求权分析法进行分析：

1. **请求权基础识别**（Anspruchsgrundlage）
   - 合同请求权（§§ 433 ff. BGB等）
   - 侵权请求权（§§ 823 ff. BGB等）
   - 不当得利请求权（§§ 812 ff. BGB等）
   - 物权请求权（§§ 985 ff. BGB等）

2. **构成要件检验**（Tatbestandsmerkmale）
   - 逐一检验每个构成要件是否满足
   - 识别有争议的构成要件
   - 标注缺失的构成要件

3. **排除消灭事由**（Einwendungen und Einreden）
   - 合同无效、可撤销
   - 履行、抵销、免除
   - 诉讼时效等

## 当前分析节点
**日期**: ${event.date}
**事件**: ${event.title}
**描述**: ${event.description}
**重要性**: ${event.importance}
**参与方**: ${event.actor || '未指明'}
**事件类型**: ${event.type}

## 案例背景上下文
**案件类型**: ${caseContext.caseType}
**主要当事人**: ${caseContext.mainParties.join('、')}

### 前序事件（提供法律关系发展脉络）
${precedingEvents.map((e, i) => `${i + 1}. ${e.date}: ${e.title}`).join('\n')}

### 后续事件（影响分析）
${followingEvents.map((e, i) => `${i + 1}. ${e.date}: ${e.title}`).join('\n')}

## 分析要求
请对该节点进行以下维度的专业分析：

1. **请求权基础分析**: 识别本事件可能触发的所有请求权类型
2. **构成要件检验**: 分析各请求权的构成要件是否满足
3. **排除消灭事由**: 评估可能的抗辩事由
4. **举证责任**: 明确各方的举证责任分配
5. **请求权竞合**: 如有多个请求权，分析优先适用原则

## 输出格式
请以JSON格式返回分析结果：

\`\`\`json
{
  "claimBasisAnalysis": {
    "contractualClaims": [
      {
        "legalBasis": "具体法条",
        "description": "请求权描述",
        "applicability": "high|medium|low|none",
        "elements": [
          {
            "name": "构成要件名称",
            "satisfied": true|false,
            "evidence": "证据描述",
            "disputed": true|false
          }
        ],
        "reasoning": "分析理由"
      }
    ],
    "tortClaims": [...],
    "enrichmentClaims": [...],
    "propertyClaims": [...]
  },
  "constitutiveElements": {
    "satisfied": [...],
    "disputed": [...],
    "missing": [...]
  },
  "defenses": {
    "substantiveDefenses": [...],
    "proceduralDefenses": [...],
    "limitationDefenses": [...]
  },
  "burdenOfProof": {
    "claimantBurden": [...],
    "respondentBurden": [...],
    "courtInquiry": [...]
  },
  "claimsConcurrence": {
    "applicableClaims": [...],
    "preferredClaim": "...",
    "reasoning": "..."
  }
}
\`\`\`

现在开始专业分析：`;
  }

  /**
   * 调用AI服务
   */
  private async callAIService(prompt: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('AI API密钥未配置');
    }

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
        temperature: 0.3, // 较低的创造性，保持分析精确性
        max_tokens: 3000,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`AI API调用失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI响应内容为空');
    }

    return content;
  }

  /**
   * 解析节点分析响应
   */
  private parseNodeAnalysisResponse(aiResponse: string): any {
    try {
      // 尝试从AI响应中提取JSON
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
                       aiResponse.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      // 如果没有找到JSON格式，尝试直接解析
      return JSON.parse(aiResponse);

    } catch (parseError) {
      logger.warn('AI响应解析失败，使用默认结构', { parseError });

      // 返回基础结构
      return {
        claimBasisAnalysis: {
          contractualClaims: [],
          tortClaims: [],
          enrichmentClaims: [],
          propertyClaims: [],
          otherClaims: []
        },
        constitutiveElements: {
          satisfied: [],
          disputed: [],
          missing: []
        },
        defenses: {
          substantiveDefenses: [],
          proceduralDefenses: [],
          limitationDefenses: []
        },
        burdenOfProof: {
          claimantBurden: [],
          respondentBurden: [],
          courtInquiry: []
        },
        claimsConcurrence: {
          applicableClaims: [],
          preferredClaim: '',
          reasoning: 'AI分析解析失败，需要人工复审'
        }
      };
    }
  }

  /**
   * 使用上下文信息增强分析结果
   */
  private async enhanceWithContextualAnalysis(
    parsedAnalysis: any,
    event: TimelineEvent,
    caseContext: any
  ): Promise<any> {
    // 基于事件类型提供默认分析增强
    if (event.type === 'legal' || event.type === 'fact') {
      // 为法律事件或事实事件提供更细致的分析
    }

    // 基于时间序列提供上下文增强
    // 这里可以添加更复杂的上下文分析逻辑

    return parsedAnalysis;
  }

  /**
   * 构建案例上下文
   */
  private buildCaseContext(events: TimelineEvent[]): any {
    const parties = Array.from(new Set(
      events.flatMap(e => e.legalRelation?.parties || [])
    ));

    const dateRange = {
      start: events[0]?.date || '',
      end: events[events.length - 1]?.date || ''
    };

    return {
      totalEvents: events.length,
      dateRange,
      mainParties: parties,
      caseType: this.inferCaseType(events)
    };
  }

  /**
   * 推断案例类型
   */
  private inferCaseType(events: TimelineEvent[]): string {
    // 基于事件内容推断案例类型的简化逻辑
    const descriptions = events.map(e => e.description).join(' ').toLowerCase();

    if (descriptions.includes('合同') || descriptions.includes('买卖')) {
      return '合同纠纷';
    } else if (descriptions.includes('侵权') || descriptions.includes('损害')) {
      return '侵权纠纷';
    } else if (descriptions.includes('婚姻') || descriptions.includes('继承')) {
      return '婚姻家庭纠纷';
    } else {
      return '一般民事纠纷';
    }
  }

  /**
   * 生成全局洞察
   */
  private async generateGlobalInsights(
    nodeAnalyses: NodeClaimAnalysis[],
    events: TimelineEvent[]
  ): Promise<any> {
    // 分析主要请求权类型
    const dominantClaimTypes = this.analyzeDominantClaimTypes(nodeAnalyses);

    // 识别关键转折点
    const keyTurningPoints = this.identifyKeyTurningPoints(nodeAnalyses, events);

    // 分析证据缺口
    const evidenceGaps = this.analyzeEvidenceGaps(nodeAnalyses);

    // 生成策略建议
    const strategicRecommendations = this.generateStrategicRecommendations(nodeAnalyses);

    return {
      dominantClaimTypes,
      keyTurningPoints,
      evidenceGaps,
      strategicRecommendations
    };
  }

  /**
   * 分析主要请求权类型
   */
  private analyzeDominantClaimTypes(nodeAnalyses: NodeClaimAnalysis[]): string[] {
    const claimTypeCounts: Record<string, number> = {};

    nodeAnalyses.forEach(analysis => {
      // 统计各种请求权类型的出现频次
      if (analysis.claimBasisAnalysis?.contractualClaims?.length > 0) {
        claimTypeCounts['合同请求权'] = (claimTypeCounts['合同请求权'] || 0) + 1;
      }
      if (analysis.claimBasisAnalysis?.tortClaims?.length > 0) {
        claimTypeCounts['侵权请求权'] = (claimTypeCounts['侵权请求权'] || 0) + 1;
      }
      // 类似地处理其他请求权类型
    });

    return Object.entries(claimTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  /**
   * 识别关键转折点
   */
  private identifyKeyTurningPoints(
    nodeAnalyses: NodeClaimAnalysis[],
    events: TimelineEvent[]
  ): string[] {
    return nodeAnalyses
      .filter(analysis => analysis.metadata.confidence > 0.8)
      .slice(0, 3)
      .map(analysis => analysis.eventTitle);
  }

  /**
   * 分析证据缺口
   */
  private analyzeEvidenceGaps(nodeAnalyses: NodeClaimAnalysis[]): string[] {
    const gaps = new Set<string>();

    nodeAnalyses.forEach(analysis => {
      analysis.constitutiveElements?.missing?.forEach(element => {
        gaps.add(`${analysis.eventTitle}: ${element.name}`);
      });
    });

    return Array.from(gaps).slice(0, 5);
  }

  /**
   * 生成策略建议
   */
  private generateStrategicRecommendations(nodeAnalyses: NodeClaimAnalysis[]): string[] {
    const recommendations: string[] = [];

    const highConfidenceAnalyses = nodeAnalyses.filter(a => a.metadata.confidence > 0.8);
    if (highConfidenceAnalyses.length > 0) {
      recommendations.push('重点关注高置信度分析的法律节点');
    }

    const disputedElements = nodeAnalyses.flatMap(a => a.constitutiveElements?.disputed || []);
    if (disputedElements.length > 0) {
      recommendations.push('需要进一步澄清有争议的构成要件');
    }

    return recommendations.slice(0, 5);
  }

  /**
   * 计算分析置信度
   */
  private calculateAnalysisConfidence(analysis: any): number {
    let confidence = 0.5; // 基础置信度

    // 基于分析内容的完整性
    if (analysis.claimBasisAnalysis) confidence += 0.2;
    if (analysis.constitutiveElements) confidence += 0.2;
    if (analysis.defenses) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * 计算平均置信度
   */
  private calculateAverageConfidence(nodeAnalyses: NodeClaimAnalysis[]): number {
    if (nodeAnalyses.length === 0) return 0;

    const totalConfidence = nodeAnalyses.reduce((sum, analysis) =>
      sum + analysis.metadata.confidence, 0
    );

    return Math.round((totalConfidence / nodeAnalyses.length) * 100) / 100;
  }

  /**
   * 计算分析完整度
   */
  private calculateCompleteness(nodeAnalyses: NodeClaimAnalysis[]): number {
    if (nodeAnalyses.length === 0) return 0;

    let totalSections = 0;
    let completedSections = 0;

    nodeAnalyses.forEach(analysis => {
      totalSections += 5; // 5个主要分析维度

      if (analysis.claimBasisAnalysis) completedSections++;
      if (analysis.constitutiveElements) completedSections++;
      if (analysis.defenses) completedSections++;
      if (analysis.burdenOfProof) completedSections++;
      if (analysis.claimsConcurrence) completedSections++;
    });

    return Math.round((completedSections / totalSections) * 100);
  }

  /**
   * 构建默认节点分析
   */
  private buildDefaultNodeAnalysis(event: TimelineEvent, processingTime: number): NodeClaimAnalysis {
    return {
      eventId: event.id,
      eventDate: event.date,
      eventTitle: event.title,
      claimBasisAnalysis: {
        contractualClaims: [],
        tortClaims: [],
        enrichmentClaims: [],
        propertyClaims: [],
        otherClaims: []
      },
      constitutiveElements: {
        satisfied: [],
        disputed: [],
        missing: []
      },
      defenses: {
        substantiveDefenses: [],
        proceduralDefenses: [],
        limitationDefenses: []
      },
      burdenOfProof: {
        claimantBurden: ['基础事实举证'],
        respondentBurden: ['抗辩事由举证'],
        courtInquiry: []
      },
      claimsConcurrence: {
        applicableClaims: [],
        preferredClaim: '需要进一步分析',
        reasoning: 'AI分析失败，建议人工复审'
      },
      metadata: {
        confidence: 0.3,
        processingTime,
        model: 'fallback',
        analysisDepth: 'basic'
      }
    };
  }

  /**
   * 延时工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 便捷函数导出
 */
export async function analyzeTimelineNodeClaims(
  events: TimelineEvent[]
): Promise<BatchAnalysisResult> {
  const analyzer = new NodeClaimAnalyzer();
  return analyzer.batchAnalyzeTimeline(events);
}

/**
 * 单例实例导出
 */
export const nodeClaimAnalyzer = new NodeClaimAnalyzer();