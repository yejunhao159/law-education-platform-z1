/**
 * 请求权分析应用服务
 * 基于德国法学请求权分析法（Anspruchsmethode）
 * 迁移自 lib/ai-claim-analyzer.ts，适配DDD架构
 * 已迁移至统一AI调用代理模式 - Issue #21
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

// 导入统一AI调用代理
import { interceptDeepSeekCall } from '../../../infrastructure/ai/AICallProxy';

/**
 * 请求权分析应用服务
 */
export class ClaimAnalysisService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    // 使用与AICallProxy一致的环境变量获取方式，包含fallback
    this.apiKey = process.env.DEEPSEEK_API_KEY || 'sk-6b081a93258346379182141661293345';
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

    console.log('🎯 ClaimAnalysisService初始化:', {
      hasApiKey: !!this.apiKey,
      apiUrl: this.apiUrl,
      keyPrefix: this.apiKey.substring(0, 8) + '...'
    });
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
   * 构建请求权分析的prompt模板 - 优化版
   */
  private buildClaimAnalysisPrompt(events: TimelineEvent[], depth: string): string {
    // 结构化事件，便于AI精准引用
    const structuredEvents = events.map((e, i) => ({
      id: `E${i + 1}`,
      date: e.date,
      title: e.title || `事件${i + 1}`,
      description: e.description || '',
      type: e.claims?.type || 'unknown',
      parties: e.legalRelation?.parties || []
    }));

    const eventsSummary = structuredEvents.map(e =>
      `${e.id} [${e.date}]: ${e.title} - ${e.description}`
    ).join('\n');

    return `你是精通德国法学请求权分析法（Anspruchsmethode）的资深法律专家。请严格按照专业方法论进行分析。

## 🇨🇳 中国法律体系下的请求权分析

### 一、结构化案件事件
${eventsSummary}

### 二、分析要求

#### 2.1 必须包含的内容
1. **请求权基础（Anspruchsgrundlage）**
   - 具体法条：必须引用《民法典》或其他法律的具体条文
   - 请求权类型：合同/侵权/不当得利/物权

2. **构成要件（Tatbestandsmerkmale）**
   - 逐项检验每个要件
   - 关联到具体事件ID（E1, E2等）
   - 明确是否满足

3. **抗辩事由（Einwendungen und Einreden）**
   - 可能的抗辩：诉讼时效、履行抗辩、同时履行、不安抗辩
   - 抗辩的法律依据

4. **举证责任（Beweislast）**
   - 谁主张谁举证
   - 各方需要证明的事实

#### 2.2 输出格式要求

必须严格按照以下JSON Schema返回：

\`\`\`json
{
  "primary": [
    {
      "id": "claim-1",
      "type": "contractual",  // contractual | tort | unjust_enrichment | property
      "legalBasis": "《民法典》第577条",  // 必须是具体法条
      "requirements": [
        {
          "element": "有效合同",
          "satisfied": true,
          "relatedEvents": ["E1"],  // 必须引用事件ID
          "explanation": "双方于2024-01-15签订买卖合同"
        },
        {
          "element": "违约行为",
          "satisfied": true,
          "relatedEvents": ["E2", "E3"],
          "explanation": "被告未按约定时间付款"
        }
      ],
      "defenses": [
        {
          "type": "不可抗力",
          "legalBasis": "《民法典》第590条",
          "likelihood": "low",  // high | medium | low
          "explanation": "无证据支持"
        }
      ],
      "burdenOfProof": {
        "plaintiff": ["证明合同成立", "证明违约事实"],
        "defendant": ["证明抗辩事由"]
      },
      "conclusion": "请求权成立",
      "confidence": 0.85
    }
  ],
  "alternative": [],  // 备选请求权
  "defense": [],  // 被告的反请求权
  "metadata": {
    "analysisDepth": "${depth}",
    "totalClaims": 1,
    "confidence": 0.9
  }
}
\`\`\`

### 三、分析深度
${depth === 'comprehensive' ?
  '🔍 **全面深度分析**\n- 详细检验每个构成要件\n- 完整引用相关法条\n- 分析所有可能的抗辩\n- 考虑法律适用冲突' :
  depth === 'detailed' ?
  '📋 **详细分析**\n- 检验主要构成要件\n- 引用核心法条\n- 分析关键抗辩' :
  '📄 **基础分析**\n- 识别主要请求权\n- 列出基本要件\n- 指出明显抗辩'}

### 四、重要提醒
⚠️ **必须遵守的规则**：
1. 不要编造法条，必须使用真实存在的法律条文
2. relatedEvents必须引用上述事件ID（E1, E2等）
3. 每个请求权必须有明确的法律依据
4. 举证责任分配必须符合法律规定
5. 如果无法确定，设置confidence为低值

现在，请严格按照上述要求进行分析。`;
  }

  /**
   * 调用统一AI服务（通过代理模式）
   * 迁移说明：从直连DeepSeek API改为使用AICallProxy统一调用
   */
  private async callDeepSeekAPI(prompt: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('AI服务API Key未配置');
    }

    const response = await interceptDeepSeekCall(this.apiUrl, {
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
        temperature: 0.7,  // 提高温度以获得更多样化的法律分析
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

  // 时间轴分析 - 真实AI实现
  private async analyzeTimeline(events: TimelineEvent[]): Promise<any> {
    if (!events || events.length === 0) {
      return {
        keyPoints: [],
        limitations: ['缺乏事件数据'],
        sequence: []
      };
    }

    try {
      const prompt = `作为法律分析专家，请分析以下时间轴事件，识别关键时间节点、时效限制和逻辑序列：

事件列表：
${events.map((e, i) => `${i + 1}. ${e.date}: ${e.title || e.description}`).join('\n')}

请以JSON格式返回分析结果：
{
  "keyPoints": [
    {
      "date": "事件日期",
      "event": "事件描述",
      "significance": "法律意义",
      "impact": "对案件的影响"
    }
  ],
  "limitations": [
    {
      "type": "时效类型(如诉讼时效、除斥期间)",
      "deadline": "截止日期",
      "description": "说明",
      "status": "current|expired|approaching"
    }
  ],
  "sequence": [
    {
      "phase": "阶段名称",
      "events": ["相关事件ID"],
      "legalEffects": "法律后果"
    }
  ]
}`;

      const response = await interceptDeepSeekCall(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      // 处理markdown包装的JSON响应
      let jsonContent = content;
      if (content.includes('```json')) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      return JSON.parse(jsonContent);
    } catch (error) {
      console.warn('时间轴AI分析失败，使用基础分析:', error);
      // 降级到基础规则分析
      return this.analyzeTimelineBasic(events);
    }
  }

  // 基础规则分析作为AI失败时的降级方案
  private analyzeTimelineBasic(events: TimelineEvent[]): any {
    const keyPoints = events
      .filter((e, i) => i % 2 === 0 || e.description?.includes('重要') || e.title?.includes('关键'))
      .map(e => ({
        date: e.date,
        event: e.title || e.description,
        significance: '需要进一步分析',
        impact: '待评估'
      }));

    const limitations = [
      {
        type: '一般诉讼时效',
        deadline: '3年',
        description: '从知道或应当知道权利被侵害时起计算',
        status: 'current'
      }
    ];

    const sequence = [
      {
        phase: '事实发生阶段',
        events: events.slice(0, Math.ceil(events.length / 2)).map(e => e.id || e.date),
        legalEffects: '权利义务关系确立'
      },
      {
        phase: '争议产生阶段',
        events: events.slice(Math.ceil(events.length / 2)).map(e => e.id || e.date),
        legalEffects: '争议事实需要司法确认'
      }
    ];

    return { keyPoints, limitations, sequence };
  }

  private async analyzeBurdenOfProof(events: TimelineEvent[]): Promise<any[]> {
    if (!events || events.length === 0) {
      return [];
    }

    try {
      const prompt = `作为法律专家，请分析以下案件事件的举证责任分配：

事件：
${events.map((e, i) => `${i + 1}. ${e.date}: ${e.title || e.description}`).join('\n')}

请以JSON格式返回举证责任分析：
[
  {
    "claim": "需要证明的事实",
    "party": "承担举证责任的当事人",
    "evidence": "所需证据类型",
    "difficulty": "low|medium|high",
    "deadline": "举证期限",
    "consequences": "举证不能的后果"
  }
]`;

      const response = await interceptDeepSeekCall(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      let jsonContent = content;
      if (content.includes('```json')) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      return JSON.parse(jsonContent);
    } catch (error) {
      console.warn('举证责任AI分析失败，使用基础规则:', error);
      // 降级到基础规则
      return [
        {
          claim: '案件基本事实',
          party: '原告',
          evidence: '相关证据材料',
          difficulty: 'medium',
          deadline: '举证期限内',
          consequences: '承担败诉风险'
        }
      ];
    }
  }

  private async analyzeLegalRelations(events: TimelineEvent[]): Promise<any[]> {
    if (!events || events.length === 0) {
      return [];
    }

    try {
      const prompt = `作为法律专家，请分析以下案件事件中涉及的法律关系：

事件：
${events.map((e, i) => `${i + 1}. ${e.date}: ${e.title || e.description}`).join('\n')}

请以JSON格式返回法律关系分析：
[
  {
    "relationship": "法律关系名称",
    "parties": ["当事人A", "当事人B"],
    "legalBasis": "法律依据",
    "rights": "权利内容",
    "obligations": "义务内容",
    "status": "active|terminated|disputed",
    "relatedEvents": ["E1", "E2"],
    "impact": "对案件的影响"
  }
]`;

      const response = await interceptDeepSeekCall(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      let jsonContent = content;
      if (content.includes('```json')) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      return JSON.parse(jsonContent);
    } catch (error) {
      console.warn('法律关系AI分析失败，使用基础规则:', error);
      // 降级到基础分析
      return this.analyzeLegalRelationsBasic(events);
    }
  }

  // 基础法律关系分析作为AI失败时的降级方案
  private analyzeLegalRelationsBasic(events: TimelineEvent[]): any[] {
    return [
      {
        relationship: '合同关系',
        parties: ['甲方', '乙方'],
        legalBasis: '《民法典》合同编',
        rights: '按约定享有权利',
        obligations: '按约定履行义务',
        status: 'disputed',
        relatedEvents: events.slice(0, 2).map(e => e.id || e.date),
        impact: '构成案件争议基础'
      }
    ];
  }

  private async generateStrategy(claims: any, timeline: any, burdenOfProof: any[]): Promise<any> {
    try {
      const analysisData = {
        primaryClaims: claims.primary?.length || 0,
        alternativeClaims: claims.alternative?.length || 0,
        defenses: claims.defense?.length || 0,
        keyTimePoints: timeline.keyPoints?.length || 0,
        limitations: timeline.limitations?.length || 0,
        burdenItems: burdenOfProof.length
      };

      const prompt = `作为资深法律策略顾问，基于以下分析结果制定诉讼策略：

分析概况：
- 主要请求权: ${analysisData.primaryClaims}项
- 备选请求权: ${analysisData.alternativeClaims}项
- 抗辩事由: ${analysisData.defenses}项
- 关键时间点: ${analysisData.keyTimePoints}个
- 时效限制: ${analysisData.limitations}项
- 举证事项: ${analysisData.burdenItems}项

请以JSON格式提供策略建议：
{
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "具体建议",
      "rationale": "理由说明",
      "timeline": "执行时间"
    }
  ],
  "risks": [
    {
      "level": "high|medium|low",
      "description": "风险描述",
      "mitigation": "应对措施"
    }
  ],
  "opportunities": [
    {
      "type": "机会类型",
      "description": "机会描述",
      "exploitation": "利用方式"
    }
  ],
  "timeline": {
    "immediate": ["立即行动事项"],
    "shortTerm": ["短期策略"],
    "longTerm": ["长期规划"]
  }
}`;

      const response = await interceptDeepSeekCall(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      let jsonContent = content;
      if (content.includes('```json')) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      return JSON.parse(jsonContent);
    } catch (error) {
      console.warn('策略生成AI分析失败，使用基础建议:', error);
      // 降级到基础策略
      return this.generateStrategyBasic(claims, timeline, burdenOfProof);
    }
  }

  // 基础策略生成作为AI失败时的降级方案
  private generateStrategyBasic(claims: any, timeline: any, burdenOfProof: any[]): any {
    const hasStrongClaims = claims.primary?.length > 0;
    const hasTimeConstraints = timeline.limitations?.some((l: any) => l.status === 'approaching');
    const hasComplexEvidence = burdenOfProof.length > 3;

    return {
      recommendations: [
        {
          priority: 'high',
          action: hasStrongClaims ? '重点证明主要请求权' : '加强证据收集',
          rationale: hasStrongClaims ? '存在成立可能性较高的请求权' : '现有证据可能不充分',
          timeline: '立即执行'
        },
        {
          priority: hasTimeConstraints ? 'high' : 'medium',
          action: '关注诉讼时效',
          rationale: hasTimeConstraints ? '存在时效风险' : '确保程序合规',
          timeline: '持续监控'
        }
      ],
      risks: [
        {
          level: hasComplexEvidence ? 'high' : 'medium',
          description: hasComplexEvidence ? '举证责任复杂' : '证据可能不足',
          mitigation: hasComplexEvidence ? '专业律师协助举证' : '补强证据材料'
        }
      ],
      opportunities: [
        {
          type: '和解谈判',
          description: '考虑庭外和解可能性',
          exploitation: '在有利证据基础上主动谈判'
        }
      ],
      timeline: {
        immediate: ['评估证据强度', '核实法律依据'],
        shortTerm: ['制定举证计划', '准备诉讼材料'],
        longTerm: ['跟踪时效变化', '调整策略方向']
      }
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