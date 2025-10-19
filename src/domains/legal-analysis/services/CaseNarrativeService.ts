/**
 * 案情智能叙事服务
 * 基于案例三要素和时间轴生成专业法律叙事
 * 用于第二幕案情概括的AI增强
 * 已迁移至统一AI调用代理模式 - Issue #21
 */

import { createLogger } from '@/lib/logging';
import { interceptDeepSeekCall } from '../../../infrastructure/ai/AICallProxy';
import type {
  TimelineEvent,
} from '@/types/timeline-claim-analysis';

const logger = createLogger('CaseNarrativeService');

export interface StoryChapter {
  id: string;
  title: string;
  content: string;
  icon: string;
  color: 'blue' | 'orange' | 'green' | 'purple' | 'red';
  timelineEvents?: string[]; // 关联的时间轴事件ID
  legalSignificance?: string; // 法律意义
  keyParties?: string[]; // 关键当事人
  disputeElements?: string[]; // 争议要素
}

export interface NarrativeGenerationRequest {
  caseData: {
    basicInfo: {
      caseNumber?: string;
      court?: string;
      caseType?: string;
      level?: string;
      nature?: string;
    };
    threeElements: any; // 第一幕动态生成的数据，结构复杂，使用any简化类型检查
  };
  narrativeStyle?: 'story';
  depth: 'basic' | 'detailed' | 'comprehensive';
  focusAreas?: Array<'timeline' | 'parties' | 'disputes' | 'evidence' | 'legal-reasoning'>;
}

export interface NarrativeGenerationResponse {
  success: boolean;
  chapters: StoryChapter[];
  metadata: {
    generatedAt: string;
    processingTime: number;
    confidence: number;
    model: string;
    tokensUsed?: number;
    fallbackUsed?: boolean;
    errorMessage?: string;
  };
  error?: string;
}

/**
 * 案情智能叙事服务
 */
export class CaseNarrativeService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    // 使用与AICallProxy一致的环境变量获取方式，包含fallback
    this.apiKey = process.env.DEEPSEEK_API_KEY || 'sk-6b081a93258346379182141661293345';
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

    console.log('📖 CaseNarrativeService初始化:', {
      hasApiKey: !!this.apiKey,
      apiUrl: this.apiUrl,
      keyPrefix: this.apiKey.substring(0, 8) + '...'
    });
  }

  /**
   * 生成智能案情叙事
   */
  async generateIntelligentNarrative(request: NarrativeGenerationRequest): Promise<NarrativeGenerationResponse> {
    const startTime = Date.now();

    try {
      logger.info('开始生成智能案情叙事', {
        caseNumber: request.caseData.basicInfo.caseNumber,
        timelineLength: request.caseData.threeElements.facts.timeline.length,
        style: 'story'
      });

      // 构建专业提示词
      const prompt = this.buildNarrativePrompt(request);

      // 调用AI服务
      const aiResponse = await this.callAIService(prompt);

      // 解析AI响应
      const chapters = this.parseAIResponse(aiResponse, request.caseData);

      if (!chapters || chapters.length === 0) {
        throw new Error('AI响应未包含有效章节数据');
      }

      // 增强章节内容
      const enhancedChapters = await this.enhanceChaptersWithAnalysis(chapters, request.caseData);
      const confidence = this.calculateConfidence(enhancedChapters);

      logger.info('智能案情叙事生成完成', {
        chaptersCount: enhancedChapters.length,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        chapters: enhancedChapters,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          confidence,
          model: 'deepseek-chat-narrative',
          tokensUsed: 0,
          fallbackUsed: false
        }
      };

    } catch (error) {
      logger.error('智能案情叙事生成失败', error);
      throw error;
    }
  }

  /**
   * 构建专业叙事提示词
   */
  private buildNarrativePrompt(request: NarrativeGenerationRequest): string {
    const { caseData, depth, focusAreas = [] } = request;

    // 🔍 完整提取所有第一幕数据
    const facts = caseData?.threeElements?.facts || {};
    const timeline = Array.isArray(facts.timeline) ? facts.timeline : [];
    const factsSummary = facts.summary || facts.main || '';
    const keyFacts = Array.isArray(facts.keyFacts) ? facts.keyFacts : [];
    const disputedFacts = Array.isArray(facts.disputedFacts) ? facts.disputedFacts : [];

    // 提取证据信息
    const evidence = caseData?.threeElements?.evidence || {};
    const evidenceSummary = evidence.summary || '';
    const evidenceItems = Array.isArray(evidence.items) ? evidence.items : [];

    // 提取法理推理
    const reasoning = caseData?.threeElements?.reasoning || {};
    const reasoningSummary = reasoning.summary || '';
    const legalBasis = Array.isArray(reasoning.legalBasis) ? reasoning.legalBasis : [];
    const keyArguments = Array.isArray(reasoning.keyArguments) ? reasoning.keyArguments : [];
    const judgment = reasoning.judgment || '';

    // 构建时间轴摘要
    const timelineSummary = timeline.length > 0
      ? timeline.map((event: TimelineEvent, index: number) => {
          const date = event.date || '日期未明';
          const description = event.event || event.detail || '事件描述缺失';
          const importance = event.importance ? `【${event.importance}】` : '';
          return `${index + 1}. ${importance}${date} - ${description}`;
        }).join('\n')
      : '';

    // 构建当事人关系（从基础信息中解析）
    const partiesFromBasicInfo = caseData?.basicInfo?.parties;
    const partyNames: string[] = [];
    if (partiesFromBasicInfo) {
      ['plaintiff', 'defendant', 'thirdParty'].forEach((role) => {
        const list = (partiesFromBasicInfo as any)?.[role];
        if (Array.isArray(list)) {
          list.forEach((party: any) => {
            if (party?.name) partyNames.push(party.name);
          });
        }
      });
    }
    const uniqueParties = Array.from(new Set(partyNames));
    const partiesContext = uniqueParties.length > 0
      ? `主要当事人：${uniqueParties.join('、')}`
      : '主要当事人：未在数据中完整提供，如信息缺失请在叙事中说明。';

    // 构建关键事实
    const keyFactsContext = keyFacts.length > 0
      ? keyFacts.map((fact: string, i: number) => `${i + 1}. ${fact}`).join('\n')
      : '';

    // 构建争议焦点
    const disputesContext = disputedFacts.length > 0
      ? disputedFacts.map((dispute: string, i: number) => `${i + 1}. ${dispute}`).join('\n')
      : '';

    // 构建证据链
    const evidenceContext = evidenceItems.length > 0
      ? evidenceItems.slice(0, 5).map((item: any, i: number) => {
          const name = item.name || `证据${i + 1}`;
          const type = item.type || '类型未明';
          const submittedBy = item.submittedBy || '提交方未明';
          const description = item.description ? `，要点：${item.description}` : '';
          return `${i + 1}. ${name}（${type}，提交方：${submittedBy}${description}）`;
        }).join('\n')
      : '';

    // 构建法律依据
    const legalBasisContext = legalBasis.length > 0
      ? legalBasis.map((basis: any) => {
          const law = basis.law || '法律未明';
          const article = basis.article || '';
          const application = basis.application || '适用理由未提供';
          return `- ${law} ${article}：${application}`;
        }).join('\n')
      : '';

    const depthInstructionMap: Record<NarrativeGenerationRequest['depth'], string> = {
      basic: '生成 3 个章节，侧重梳理案情主线、核心争议和最终结论，每章控制在 200-300 字；如果数据缺失，请明确说明。',
      detailed: '生成 4 个章节，按照案情起源、事实发展、争议焦点、法律分析的顺序展开，每章约 300-400 字。',
      comprehensive: '生成至少 5 个章节，全面覆盖案情背景、关键事实、证据链、争议焦点、法律适用与裁判观点，每章 400-500 字。'
    };
    const depthInstruction = depthInstructionMap[depth] || depthInstructionMap['detailed'];

    const focusInstructionMap: Record<string, string> = {
      timeline: '突出时间轴事件之间的因果链条，解释每个阶段如何推动纠纷演进。',
      parties: '刻画当事人之间的身份、诉求和策略变化，揭示利益冲突的根源。',
      disputes: '深入分析争议焦点的形成过程、双方观点及其法律依据。',
      evidence: '强调关键证据的内容、来源、采信情况以及对判决的影响。',
      'legal-reasoning': '详细呈现法院的法律推理过程，说明法条适用与裁判逻辑。'
    };

    const focusInstructions = focusAreas
      .map((area) => focusInstructionMap[area])
      .filter(Boolean);

    const focusSection = focusInstructions.length > 0
      ? focusInstructions.map((instruction, idx) => `${idx + 1}. ${instruction}`).join('\n')
      : '1. 基于已知数据构建完整的案情故事；若信息缺失，请在叙事中标注并合理推断，但不得杜撰。';

    return `你是一位资深的法律专家和教育工作者，精通法律案例的叙事艺术。请基于以下案例信息生成专业的法律案情叙事。

## 案例基本信息
- 案件编号：${caseData.basicInfo.caseNumber || '待补充'}
- 审理法院：${caseData.basicInfo.court || '待补充'}
- 案件类型：${caseData.basicInfo.caseType || '待补充'}
- ${partiesContext}

## 案件事实概况
${factsSummary || '数据中未提供事实摘要，如信息缺失，请在叙事中结合时间轴和证据信息推断。'}

## 关键事实要点
${keyFactsContext || '未提供关键事实列表，如信息缺失，请结合已有事实合理提炼。'}

## 争议焦点
${disputesContext || '未提供争议焦点，如信息缺失，请根据事实和诉辩立场总结可能的争议。'}

## 时间轴事件
${timelineSummary || '未提供时间轴，如信息缺失，请根据事实发展自行总结时间顺序，并在叙事中标明是假设。'}

## 证据概况
${evidenceSummary || '未提供证据摘要，如信息缺失，请根据案件背景说明证据使用情况。'}

### 主要证据清单
${evidenceContext || '未提供证据清单，如信息缺失，请在叙事中说明证据空缺及其影响。'}

## 法理分析
### 法院认定
${reasoningSummary || '未提供法院认定，如信息缺失，请说明法院可能的观点或分析路径。'}

### 法律依据
${legalBasisContext || '未提供适用法律，如信息缺失，请结合常见法条推理并标注是假设。'}

### 核心论点
${keyArguments.length > 0 ? keyArguments.map((arg: any, i: number) => `${i + 1}. ${arg}`).join('\n') : '未提供关键论点，如信息缺失，请根据案情分析可能的法律争论。'}

### 判决结果
${judgment || '未提供判决结果，如信息缺失，请说明可能的裁判方向或尚未审结。'}

## 叙事要求
请采用沉浸式的故事叙述方式，在保持法律专业性的前提下，让读者仿佛置身于案件发展现场。
${depthInstruction}

## 专业要求
1. **法律准确性**：确保所有法律术语和分析准确无误
2. **逻辑清晰**：按照时间顺序和逻辑关系组织内容
3. **教学价值**：突出案例的教学意义和法律原理
4. **争议导向**：重点展现争议焦点的形成和发展
5. **证据意识**：强调关键证据在案件中的作用

## 特别关注
${focusSection}

## 输出格式
请生成3-5个故事章节，每个章节包含：
- title: 章节标题（简洁有力）
- content: 详细内容（300-500字）
- legalSignificance: 法律意义（100-200字）
- keyParties: 涉及的关键当事人
- disputeElements: 争议要素（如有）

请以JSON格式返回结果，格式如下：
{
  "chapters": [
    {
      "title": "案件起源",
      "content": "详细的案情叙述...",
      "legalSignificance": "法律意义分析...",
      "keyParties": ["当事人A", "当事人B"],
      "disputeElements": ["争议点1", "争议点2"]
    }
  ]
}

现在开始生成专业的法律案情叙事：`;
  }

  /**
   * 调用AI服务（带重试）
   */
  private async callAIService(prompt: string, retryCount = 0): Promise<any> {
    if (!this.apiKey) {
      throw new Error('AI API密钥未配置');
    }

    const maxRetries = 2;
    const maxTokens = 4000; // 修复: 从8000降到4000避免JSON截断

    try {
      // 使用代理模式调用AI服务
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
              role: 'system',
              content: '你是一位专业的法律叙事专家，擅长将复杂的法律案件转化为引人入胜的故事。请严格按照JSON格式返回响应。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: maxTokens, // 修复: 降低到4000避免截断和网络失败
          top_p: 0.9
        })
      });

      if (!response.ok) {
        logger.error('AI API调用失败', {
          status: response.status,
          statusText: response.statusText,
          retryCount
        });

        // 重试逻辑
        if (retryCount < maxRetries && (response.status === 503 || response.status === 500)) {
          logger.info(`重试 AI 调用 (${retryCount + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 指数退避
          return this.callAIService(prompt, retryCount + 1);
        }

        throw new Error(`AI API调用失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      const finishReason = result.choices?.[0]?.finish_reason;
      const proxyHeader = response.headers.get('X-AI-Proxy');
      const isProxyFallback = response.headers.get('X-Error') === 'true' || proxyHeader === 'DeeChatAI-Fallback';

      // 检测token限制导致的截断
      if (finishReason === 'length') {
        logger.warn('智能故事生成被max_tokens截断', {
          finishReason,
          maxTokens,
          contentLength: content?.length
        });
        // 不抛出错误,允许使用截断的内容,但记录警告
      }

      // 检测降级响应
      if (isProxyFallback || finishReason === 'error') {
        logger.warn('检测到AI服务降级', {
          finishReason,
          proxyHeader,
          contentPreview: content?.slice(0, 100)
        });
        throw new Error('AI服务降级，使用规则生成');
      }

      if (!content) {
        throw new Error('AI响应内容为空');
      }

      // 检查内容是否为降级提示
      const lowerContent = content.toLowerCase();
      if (
        content.includes('抱歉') ||
        content.includes('无法生成') ||
        content.includes('错误') ||
        lowerContent.includes('sorry') ||
        lowerContent.includes('unable to generate') ||
        lowerContent.includes('error')
      ) {
        logger.warn('AI返回降级内容', { contentPreview: content.slice(0, 200) });
        throw new Error('AI服务返回降级内容');
      }

      return content;
    } catch (error) {
      // 网络错误重试
      if (retryCount < maxRetries && error instanceof Error &&
          (error.message.includes('fetch failed') || error.message.includes('network'))) {
        logger.info(`网络错误，重试 AI 调用 (${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.callAIService(prompt, retryCount + 1);
      }

      // 记录错误信息
      logger.error('callAIService失败', { error, retryCount });
      throw error;
    }
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(aiResponse: string, _caseData: any): StoryChapter[] {
    try {
      // 首先检查是否为降级提示或错误消息
      const lowerResponse = aiResponse.toLowerCase();
      if (
        aiResponse.includes('抱歉') ||
        aiResponse.includes('无法生成') ||
        aiResponse.includes('错误') ||
        lowerResponse.includes('sorry') ||
        lowerResponse.includes('error') ||
        lowerResponse.includes('unable')
      ) {
        logger.warn('检测到AI降级响应', { preview: aiResponse.slice(0, 200) });
        throw new Error('AI服务返回降级响应');
      }

      // 处理markdown包装的JSON响应
      let jsonContent = aiResponse;
      if (aiResponse.includes('```json')) {
        const match = aiResponse.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      // 尝试解析JSON响应
      const parsed = JSON.parse(jsonContent);

      if (parsed.chapters && Array.isArray(parsed.chapters)) {
        const chapters = parsed.chapters.map((chapter: any, index: number) => ({
          id: `chapter-${index + 1}`,
          title: chapter.title || `章节${index + 1}`,
          content: chapter.content || '内容生成中...',
          icon: this.getChapterIcon(index),
          color: this.getChapterColor(index),
          legalSignificance: chapter.legalSignificance,
          keyParties: Array.isArray(chapter.keyParties) ? chapter.keyParties : [],
          disputeElements: Array.isArray(chapter.disputeElements) ? chapter.disputeElements : []
        }));

        // 验证章节内容是否有效
        if (chapters.length > 0 && chapters.every((ch: StoryChapter) => ch.content && ch.content.length > 10)) {
          return chapters;
        } else {
          throw new Error('AI生成的章节内容不完整');
        }
      }
    } catch (parseError) {
      logger.error('AI响应解析失败', {
        error: parseError,
        responsePreview: aiResponse.slice(0, 500)
      });
      // 抛出错误，让上层处理fallback
      throw parseError;
    }

    // 如果没有chapters，说明响应格式不对
    throw new Error('AI响应格式错误: 缺少chapters字段');
  }

  /**
   * 文本响应解析（备选方案）
   */
  /**
   * 已删除 parseTextResponse 方法
   * 原因: 降级处理会隐藏AI响应解析失败的真实问题
   * 现在解析失败时直接抛出错误
   */

  /**
   * 增强章节内容
   */
  private async enhanceChaptersWithAnalysis(chapters: StoryChapter[], caseData: any): Promise<StoryChapter[]> {
    const timeline = caseData.threeElements?.facts?.timeline || [];

    return chapters.map((chapter, index) => {
      // 为每个章节关联相关的时间轴事件
      const relevantEvents = timeline
        .filter((event: TimelineEvent) => {
          const eventIndex = timeline.indexOf(event);
          const chapterStart = Math.floor((eventIndex / timeline.length) * chapters.length);
          return chapterStart === index;
        })
        .map((event: TimelineEvent) => event.id);

      return {
        ...chapter,
        timelineEvents: relevantEvents,
        // 如果没有法律意义，提供默认分析
        legalSignificance: chapter.legalSignificance ||
          `在案件发展的第${index + 1}阶段，涉及的法律关系和争议焦点对整体案情具有重要影响。`
      };
    });
  }

  /**
   * 获取章节图标
   */
  private getChapterIcon(index: number): string {
    const icons = ['📋', '⚖️', '🏛️', '📜', '🔍'];
    return icons[index] || '📄';
  }

  /**
   * 获取章节颜色
   */
  private getChapterColor(index: number): 'blue' | 'orange' | 'green' | 'purple' | 'red' {
    const colors: Array<'blue' | 'orange' | 'green' | 'purple' | 'red'> =
      ['blue', 'orange', 'green', 'purple', 'red'];
    return colors[index] || 'blue';
  }

  /**
   * 计算叙事质量置信度
   */
  private calculateConfidence(chapters: StoryChapter[]): number {
    let confidence = 0.5; // 基础置信度

    // 基于章节数量
    if (chapters.length >= 3) confidence += 0.2;

    // 基于内容丰富度
    const avgContentLength = chapters.reduce((sum, ch) => sum + (ch.content?.length || 0), 0) / chapters.length;
    if (avgContentLength > 200) confidence += 0.2;

    // 基于法律分析质量
    const hasLegalAnalysis = chapters.every(ch => ch.legalSignificance);
    if (hasLegalAnalysis) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * 生成故事章节的便捷方法（向后兼容）
   */
  async generateStoryChapters(caseData: any): Promise<StoryChapter[]> {
    const request: NarrativeGenerationRequest = {
      caseData,
      narrativeStyle: 'story',
      depth: 'detailed',
      focusAreas: ['timeline', 'parties', 'disputes']
    };

    const response = await this.generateIntelligentNarrative(request);
    return response.chapters;
  }
}

/**
 * 便捷函数导出
 */
export async function generateIntelligentCaseNarrative(caseData: any): Promise<StoryChapter[]> {
  const service = new CaseNarrativeService();
  return service.generateStoryChapters(caseData);
}

/**
 * 单例实例导出
 */
export const caseNarrativeService = new CaseNarrativeService();
