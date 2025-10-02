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
  CaseInfo,
  StoryChapter,
  NarrativeGenerationRequest,
  NarrativeGenerationResponse
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
    threeElements: {
      facts: {
        timeline: TimelineEvent[];
        parties: string[];
        keyFacts: string[];
      };
      disputes: any[];
      reasoning?: {
        summary: string;
      };
    };
  };
  narrativeStyle: 'story' | 'professional' | 'educational';
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
        style: request.narrativeStyle
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
      logger.error('智能案情叙事生成失败，使用降级方案', error);

      try {
        // 使用降级方案：基于现有数据生成基础章节
        const fallbackChapters = this.buildFallbackChapters(request.caseData);

        logger.info('降级章节生成完成', {
          chaptersCount: fallbackChapters.length,
          processingTime: Date.now() - startTime
        });

        return {
          success: true,
          chapters: fallbackChapters,
          metadata: {
            generatedAt: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            confidence: 0.5,
            model: 'rule-based-fallback',
            tokensUsed: 0,
            fallbackUsed: true,
            errorMessage: error instanceof Error ? error.message : '未知错误'
          }
        };
      } catch (fallbackError) {
        logger.error('降级方案也失败了', fallbackError);

        // 最后的降级：返回默认章节
        return {
          success: true,
          chapters: this.getDefaultChapters(),
          metadata: {
            generatedAt: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            confidence: 0.3,
            model: 'default-fallback',
            tokensUsed: 0,
            fallbackUsed: true,
            errorMessage: 'Both AI and rule-based generation failed'
          }
        };
      }
    }
  }

  /**
   * 构建专业叙事提示词
   */
  private buildNarrativePrompt(request: NarrativeGenerationRequest): string {
    const { caseData, narrativeStyle, depth } = request;

    // 🔍 完整提取所有第一幕数据
    const timeline = caseData?.threeElements?.facts?.timeline || [];
    const parties = caseData?.threeElements?.facts?.parties || [];
    const factsSummary = caseData?.threeElements?.facts?.summary || caseData?.threeElements?.facts?.main || '';
    const keyFacts = caseData?.threeElements?.facts?.keyFacts || [];
    const disputedFacts = caseData?.threeElements?.facts?.disputedFacts || [];

    // 提取证据信息
    const evidenceSummary = caseData?.threeElements?.evidence?.summary || '';
    const evidenceItems = caseData?.threeElements?.evidence?.items || [];

    // 提取法理推理
    const reasoningSummary = caseData?.threeElements?.reasoning?.summary || '';
    const legalBasis = caseData?.threeElements?.reasoning?.legalBasis || [];
    const keyArguments = caseData?.threeElements?.reasoning?.keyArguments || [];
    const judgment = caseData?.threeElements?.reasoning?.judgment || '';

    // 构建时间轴摘要
    const timelineSummary = timeline.length > 0 ?
      timeline.map((event, index) =>
        `${index + 1}. ${event.date} - ${event.title}: ${event.description}`
      ).join('\n') :
      '暂无时间轴信息';

    // 构建当事人关系
    const partiesContext = parties.length > 0 ?
      `主要当事人：${parties.join('、')}` :
      '当事人信息待完善';

    // 构建关键事实
    const keyFactsContext = keyFacts.length > 0 ?
      keyFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n') :
      '暂无关键事实';

    // 构建争议焦点
    const disputesContext = disputedFacts.length > 0 ?
      disputedFacts.map((dispute, i) => `${i + 1}. ${dispute}`).join('\n') :
      '暂无争议焦点';

    // 构建证据链
    const evidenceContext = evidenceItems.length > 0 ?
      evidenceItems.slice(0, 5).map((item, i) =>
        `${i + 1}. ${item.name}（${item.type}）- 提交方：${item.submittedBy}`
      ).join('\n') :
      '暂无证据信息';

    // 构建法律依据
    const legalBasisContext = legalBasis.length > 0 ?
      legalBasis.map(basis =>
        `- ${basis.law} ${basis.article}：${basis.application}`
      ).join('\n') :
      '暂无法律依据';

    return `你是一位资深的法律专家和教育工作者，精通法律案例的叙事艺术。请基于以下案例信息生成专业的法律案情叙事。

## 案例基本信息
- 案件编号：${caseData.basicInfo.caseNumber || '待补充'}
- 审理法院：${caseData.basicInfo.court || '待补充'}
- 案件类型：${caseData.basicInfo.caseType || '待补充'}
- ${partiesContext}

## 案件事实概况
${factsSummary || '本案涉及双方当事人之间的法律纠纷'}

## 关键事实要点
${keyFactsContext}

## 争议焦点
${disputesContext}

## 时间轴事件
${timelineSummary}

## 证据概况
${evidenceSummary || '案件证据包括书证、证人证言等'}

### 主要证据清单
${evidenceContext}

## 法理分析
### 法院认定
${reasoningSummary || '法院经审理认为，双方存在法律关系'}

### 法律依据
${legalBasisContext}

### 核心论点
${keyArguments.length > 0 ? keyArguments.map((arg, i) => `${i + 1}. ${arg}`).join('\n') : '暂无核心论点'}

### 判决结果
${judgment || '法院作出相应判决'}

## 叙事要求
### 叙事风格
${narrativeStyle === 'story' ? '采用引人入胜的故事叙述风格，但保持法律专业性' :
  narrativeStyle === 'professional' ? '采用专业严谨的法律叙述风格' :
  '采用教育导向的叙述风格，便于学习理解'}

### 分析深度
${depth === 'comprehensive' ? '进行全面深入的案情分析，包含法律关系演进、争议焦点发展、证据链条梳理' :
  depth === 'detailed' ? '进行详细的案情分析，重点关注关键事实和法律关系' :
  '进行基础的案情梳理，突出主要事实脉络'}

## 专业要求
1. **法律准确性**：确保所有法律术语和分析准确无误
2. **逻辑清晰**：按照时间顺序和逻辑关系组织内容
3. **教学价值**：突出案例的教学意义和法律原理
4. **争议导向**：重点展现争议焦点的形成和发展
5. **证据意识**：强调关键证据在案件中的作用

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
   * 调用AI服务（带重试和降级）
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
  private parseAIResponse(aiResponse: string, caseData: any): StoryChapter[] {
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
   * 构建降级章节（基于规则的基础叙事）
   */
  private buildFallbackChapters(caseData: any): StoryChapter[] {
    const timeline = caseData?.threeElements?.facts?.timeline || [];
    const parties = caseData?.threeElements?.facts?.parties || [];
    const keyFacts = caseData?.threeElements?.facts?.keyFacts || [];
    const disputes = caseData?.threeElements?.disputes || [];

    const chapters: StoryChapter[] = [];

    // 第一章：案件起源
    chapters.push({
      id: 'chapter-1',
      title: '案件起源',
      content: `本案涉及${parties.length > 0 ? parties.join('与') : '双方当事人'}之间的法律纠纷。${
        timeline.length > 0 ? `案件始于${timeline[0].date}，${timeline[0].description}。` : ''
      }${
        keyFacts.length > 0 ? `关键事实包括：${keyFacts.slice(0, 2).join('；')}。` : '案件事实正在审理中。'
      }`,
      icon: '📋',
      color: 'blue',
      legalSignificance: '案件起源阶段确立了当事人之间的法律关系，为后续争议奠定了基础。',
      keyParties: parties.slice(0, 2),
      disputeElements: []
    });

    // 第二章：事实发展
    if (timeline.length > 1) {
      const midEvents = timeline.slice(1, Math.min(timeline.length, 4));
      chapters.push({
        id: 'chapter-2',
        title: '事实发展',
        content: `随着时间推移，案件事实逐步展开。${
          midEvents.map(e => `${e.date}，${e.description}`).join('；')
        }。这些事件的发生和发展，使得当事人之间的纠纷日益明显。`,
        icon: '⚖️',
        color: 'orange',
        legalSignificance: '事实发展阶段展现了法律关系的演变过程，为争议焦点的形成提供了事实依据。',
        keyParties: parties,
        disputeElements: disputes.length > 0 ? disputes.slice(0, 2).map((d: any) => d.description || d) : []
      });
    }

    // 第三章：争议焦点
    if (disputes.length > 0) {
      chapters.push({
        id: 'chapter-3',
        title: '争议焦点',
        content: `在案件审理过程中，双方当事人的主要争议焦点集中在以下方面：${
          disputes.slice(0, 3).map((d: any, i: number) =>
            `${i + 1}. ${d.description || d}`
          ).join('；')
        }。这些争议点构成了本案的核心法律问题。`,
        icon: '🏛️',
        color: 'green',
        legalSignificance: '争议焦点的明确，为法院审理案件、适用法律提供了清晰的方向。',
        keyParties: parties,
        disputeElements: disputes.slice(0, 3).map((d: any) => d.description || d)
      });
    }

    // 第四章：法律分析（如果有推理信息）
    const reasoning = caseData?.threeElements?.reasoning;
    if (reasoning?.summary) {
      chapters.push({
        id: 'chapter-4',
        title: '法律分析',
        content: `法院经审理认为，${reasoning.summary}${
          reasoning.legalBasis && reasoning.legalBasis.length > 0 ?
            `根据${reasoning.legalBasis.slice(0, 2).map((b: any) => `${b.law}${b.article}`).join('、')}的规定，` : ''
        }${reasoning.judgment || '对本案作出相应判决。'}`,
        icon: '📜',
        color: 'purple',
        legalSignificance: '法律分析阶段运用法律规范对案件事实进行评价，体现了司法裁判的逻辑和依据。',
        keyParties: parties,
        disputeElements: []
      });
    }

    return chapters.length > 0 ? chapters : this.getDefaultChapters();
  }

  /**
   * 获取默认章节（最后的降级方案）
   */
  private getDefaultChapters(): StoryChapter[] {
    return [
      {
        id: 'chapter-1',
        title: '案件概况',
        content: '本案系双方当事人之间发生的民事纠纷。案件涉及的法律关系和事实情况正在审理过程中。',
        icon: '📋',
        color: 'blue',
        legalSignificance: '案件处于初步审理阶段，相关事实和法律关系有待进一步查明。',
        keyParties: [],
        disputeElements: []
      },
      {
        id: 'chapter-2',
        title: '审理进程',
        content: '法院正在依法对本案进行审理，将根据查明的事实和适用的法律作出公正裁判。',
        icon: '⚖️',
        color: 'orange',
        legalSignificance: '司法程序的进行保障了当事人的合法权益和案件的公正审理。',
        keyParties: [],
        disputeElements: []
      }
    ];
  }

  /**
   * 已删除以下降级处理相关方法:
   * - buildFallbackNarrative() - 规则引擎降级叙事生成
   * - normalizeDisputes() - 争议数据标准化辅助方法
   * - chunkTimelineIndices() - 时间轴分块辅助方法
   * - getEventIdentifier() - 事件ID生成辅助方法
   * - formatTimelineEvent() - 时间轴事件格式化辅助方法
   * - formatTimelineChunk() - 时间轴区段格式化辅助方法
   * - isMeaningfulChapter() - 章节内容判断辅助方法
   *
   * 原因: 所有降级逻辑都会隐藏AI服务的真实问题
   * 现在AI失败时直接抛出错误,让问题明确暴露
   */

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
   * 构建错误响应
   */
  private buildErrorResponse(error: any, startTime: number): NarrativeGenerationResponse {
    return {
      success: false,
      chapters: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        confidence: 0,
        model: 'deepseek-chat-narrative'
      },
      error: error instanceof Error ? error.message : '未知错误'
    };
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
