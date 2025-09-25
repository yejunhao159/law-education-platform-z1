/**
 * 请求权分析应用服务
 * 基于德国法学请求权分析法（Anspruchsmethode）
 * 迁移自 lib/ai-claim-analyzer.ts，适配DDD架构
 */

import type {
  TimelineEvent,
  ClaimAnalysisResult,
  ClaimAnalysisRequest,
  ClaimStructure,
  DefenseStructure,
  ClaimElement,
  TimelineKeyPoint,
  LimitationPeriod
} from '@/types/timeline-claim-analysis';

/**
 * 请求权分析应用服务
 */
export class ClaimAnalysisService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  /**
   * 主入口：分析时间轴事件的请求权结构
   */
  async analyzeClaimStructure(request: ClaimAnalysisRequest): Promise<ClaimAnalysisResult> {
    const startTime = Date.now();

    try {
      console.log('🎯 开始AI请求权分析...');
      console.log('📊 分析参数:', {
        eventCount: request.events.length,
        focusAreas: request.focusAreas,
        depth: request.depth
      });

      // 并行执行分析任务
      const [claims, timeline, burdenOfProof, legalRelations] = await Promise.all([
        this.analyzeClaims(request.events, request.depth || 'detailed'),
        this.analyzeTimeline(request.events),
        this.analyzeBurdenOfProof(request.events),
        this.analyzeLegalRelations(request.events)
      ]);

      // 生成策略建议
      const strategy = await this.generateStrategy(claims, timeline, burdenOfProof);

      const result: ClaimAnalysisResult = {
        id: `analysis-${Date.now()}`,
        timestamp: new Date().toISOString(),
        caseId: request.events[0]?.id || undefined,
        claims,
        timeline,
        legalRelations,
        burdenOfProof,
        strategy,
        metadata: {
          model: 'deepseek-chat-claim-analysis',
          confidence: this.calculateAnalysisConfidence(claims, timeline),
          processingTime: Date.now() - startTime,
          tokensUsed: 0 // 将由API返回填充
        }
      };

      console.log('✅ 请求权分析完成');
      return result;

    } catch (error) {
      console.error('❌ 请求权分析失败:', error);
      throw new Error(`请求权分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 分析请求权结构
   */
  private async analyzeClaims(events: TimelineEvent[], depth: string): Promise<{
    primary: ClaimStructure[]
    alternative: ClaimStructure[]
    defense: DefenseStructure[]
  }> {
    const prompt = this.buildClaimAnalysisPrompt(events, depth);

    try {
      const response = await this.callDeepSeekAPI(prompt);
      return this.parseClaimsResponse(response);
    } catch (error) {
      console.error('请求权分析失败:', error);
      return this.getDefaultClaimsStructure();
    }
  }

  /**
   * 构建请求权分析的prompt模板
   */
  private buildClaimAnalysisPrompt(events: TimelineEvent[], depth: string): string {
    const eventsSummary = events.map((e, i) =>
      `${i + 1}. ${e.date} - ${e.title}: ${e.description}${e.claims ? ` [涉及${e.claims.type}请求权]` : ''}`
    ).join('\n');

    return `你是一位精通德国法学请求权分析法（Anspruchsmethode）的专业法律分析师。请基于以下时间轴事件进行系统的请求权分析。

## 分析方法论
采用德国法学的请求权分析法（Anspruchsmethode），按以下步骤：
1. 识别可能的请求权基础（Anspruchsgrundlage）
2. 检验请求权的构成要件（Tatbestandsmerkmale）
3. 考虑排除和消灭事由（Einwendungen und Einreden）
4. 分析抗辩事由（Einwände）
5. 确定请求权的成立与否

## 请求权类型体系
- 合同请求权（Vertragliche Ansprüche）
- 侵权请求权（Deliktsrechtliche Ansprüche）
- 不当得利请求权（Bereicherungsrechtliche Ansprüche）
- 物权请求权（Sachenrechtliche Ansprüche）
- 其他请求权

## 时间轴事件
${eventsSummary}

## 分析深度
${depth === 'comprehensive' ? '进行全面深度分析，包含详细的法条引用和构成要件检验' :
  depth === 'detailed' ? '进行详细分析，重点关注主要请求权和抗辩事由' :
  '进行基础分析，识别主要请求权结构'}

请以JSON格式返回分析结果，包含primary、alternative、defense三个部分。`;
  }

  /**
   * 调用DeepSeek API
   */
  private async callDeepSeekAPI(prompt: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API Key未配置');
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
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI响应为空');
    }

    // 尝试解析JSON响应，支持markdown包装格式
    try {
      // 处理markdown包装的JSON响应
      let jsonContent = content;
      if (content.includes('```json')) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      return JSON.parse(jsonContent);
    } catch {
      console.warn('AI响应不是有效JSON，返回原始文本');
      return { raw: content };
    }
  }

  // 其他私有方法的简化实现...
  private async analyzeTimeline(events: TimelineEvent[]): Promise<any> {
    return {
      keyPoints: [],
      limitations: [],
      sequence: []
    };
  }

  private async analyzeBurdenOfProof(events: TimelineEvent[]): Promise<any[]> {
    return [];
  }

  private async analyzeLegalRelations(events: TimelineEvent[]): Promise<any[]> {
    return [];
  }

  private async generateStrategy(claims: any, timeline: any, burdenOfProof: any[]): Promise<any> {
    return {
      recommendations: ['建议寻求专业法律意见'],
      risks: ['分析可能不完整，请谨慎使用'],
      opportunities: []
    };
  }

  private parseClaimsResponse(response: any): {
    primary: ClaimStructure[]
    alternative: ClaimStructure[]
    defense: DefenseStructure[]
  } {
    if (!response || typeof response === 'string') {
      return this.getDefaultClaimsStructure();
    }

    return {
      primary: Array.isArray(response.primary) ? response.primary : [],
      alternative: Array.isArray(response.alternative) ? response.alternative : [],
      defense: Array.isArray(response.defense) ? response.defense : []
    };
  }

  private calculateAnalysisConfidence(claims: any, timeline: any): number {
    let confidence = 0;

    if (claims.primary.length > 0) confidence += 30;
    if (claims.defense.length > 0) confidence += 20;
    if (timeline.keyPoints.length > 0) confidence += 25;
    if (timeline.limitations.length > 0) confidence += 25;

    return Math.min(confidence, 100);
  }

  private getDefaultClaimsStructure(): {
    primary: ClaimStructure[]
    alternative: ClaimStructure[]
    defense: DefenseStructure[]
  } {
    return {
      primary: [],
      alternative: [],
      defense: []
    };
  }
}

/**
 * 便捷函数导出 - 兼容原有接口
 */
export async function analyzeTimelineClaimsWithAI(
  request: ClaimAnalysisRequest
): Promise<ClaimAnalysisResult> {
  const service = new ClaimAnalysisService();
  return service.analyzeClaimStructure(request);
}

/**
 * 创建请求权分析请求的辅助函数
 */
export function createClaimAnalysisRequest(
  events: TimelineEvent[],
  options?: {
    caseType?: string
    focusAreas?: Array<'claims' | 'defenses' | 'limitations' | 'burden-of-proof'>
    depth?: 'basic' | 'detailed' | 'comprehensive'
  }
): ClaimAnalysisRequest {
  return {
    events: events.filter(e => e.description && e.date), // 过滤无效事件
    caseType: options?.caseType,
    focusAreas: options?.focusAreas || ['claims', 'defenses', 'limitations', 'burden-of-proof'],
    depth: options?.depth || 'detailed'
  };
}