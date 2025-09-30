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

      let fallbackUsed = false;
      let fallbackReason: string | undefined;
      let chapters: StoryChapter[] = [];

      try {
        const parsedChapters = this.parseAIResponse(aiResponse, request.caseData);
        if (parsedChapters.length === 0) {
          throw new Error('AI响应未包含章节数据');
        }
        chapters = parsedChapters;
      } catch (parseError) {
        fallbackUsed = true;
        fallbackReason = parseError instanceof Error ? parseError.message : 'AI响应解析失败';
        logger.warn('AI响应解析失败，尝试降级处理', {
          reason: fallbackReason,
          preview: typeof aiResponse === 'string' ? aiResponse.slice(0, 200) : '[非文本响应]'
        });

        const textChapters = this
          .parseTextResponse(aiResponse, request.caseData)
          .filter(chapter => this.isMeaningfulChapter(chapter));

        if (textChapters.length > 0) {
          chapters = textChapters;
        } else {
          chapters = this.buildFallbackNarrative(request.caseData);
        }
      }

      if (!chapters.length) {
        fallbackUsed = true;
        fallbackReason = fallbackReason || 'AI响应为空';
        chapters = this.buildFallbackNarrative(request.caseData);
      }

      // 增强章节内容
      const enhancedChapters = await this.enhanceChaptersWithAnalysis(chapters, request.caseData);

      const baseConfidence = this.calculateConfidence(enhancedChapters);
      const confidence = fallbackUsed ? Math.min(baseConfidence, 0.6) : baseConfidence;

      const response: NarrativeGenerationResponse = {
        success: true,
        chapters: enhancedChapters,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          confidence,
          model: fallbackUsed ? 'rule-based-fallback' : 'deepseek-chat-narrative',
          tokensUsed: 0,
          fallbackUsed,
          errorMessage: fallbackReason
        }
      };

      if (fallbackUsed && fallbackReason) {
        logger.warn('智能叙事已使用回退策略', {
          reason: fallbackReason,
          chapterCount: enhancedChapters.length
        });
        response.error = fallbackReason;
      } else {
        logger.info('智能案情叙事生成完成', {
          chaptersCount: enhancedChapters.length,
          processingTime: response.metadata.processingTime
        });
      }

      return response;

    } catch (error) {
      logger.error('智能案情叙事生成失败，触发规则化回退', error);

      const fallbackChapters = this.buildFallbackNarrative(request.caseData);
      const enhancedFallback = await this.enhanceChaptersWithAnalysis(fallbackChapters, request.caseData);
      const confidence = Math.min(this.calculateConfidence(enhancedFallback), 0.6);
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      return {
        success: true,
        chapters: enhancedFallback,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          confidence,
          model: 'rule-based-fallback',
          tokensUsed: 0,
          fallbackUsed: true,
          errorMessage
        },
        error: errorMessage
      };
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
   * 调用AI服务
   */
  private async callAIService(prompt: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('AI API密钥未配置');
    }

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
          temperature: 0.7, // 适度创造性，保持专业性
          max_tokens: 8000, // Phase B修复: 提升到8000支持更详细的故事生成
          top_p: 0.9
        })
      });

      if (!response.ok) {
        logger.error('AI API调用失败', { status: response.status, statusText: response.statusText });
        throw new Error(`AI API调用失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      const finishReason = result.choices?.[0]?.finish_reason;
      const proxyHeader = response.headers.get('X-AI-Proxy');
      const isProxyFallback = response.headers.get('X-Error') === 'true' || proxyHeader === 'DeeChatAI-Fallback';

      // Phase B修复: 检测token限制导致的截断
      if (finishReason === 'length') {
        logger.warn('智能故事生成被max_tokens截断', {
          finishReason,
          maxTokens: 8000,
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
      // 记录错误信息
      logger.error('callAIService失败', error);
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
  private parseTextResponse(text: string, caseData: any): StoryChapter[] {
    // 简单的文本分割逻辑
    const sections = text.split(/(?:第?[一二三四五]\s*[章节]|Chapter\s*\d+)/i).filter(s => s.trim());

    return sections.slice(0, 4).map((section, index) => {
      const lines = section.trim().split('\n').filter(line => line.trim());
      const title = lines[0]?.trim() || `案情发展第${index + 1}阶段`;
      const content = lines.slice(1).join('\n').trim() || '基于时间轴事件的案情发展...';

      return {
        id: `chapter-${index + 1}`,
        title,
        content,
        icon: this.getChapterIcon(index),
        color: this.getChapterColor(index),
        legalSignificance: `第${index + 1}阶段的法律意义分析`,
        keyParties: caseData.threeElements?.facts?.parties || [],
        disputeElements: []
      };
    });
  }

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
   * 构建规则化回退叙事
   */
  private buildFallbackNarrative(caseData: any): StoryChapter[] {
    const timeline: TimelineEvent[] = Array.isArray(caseData?.threeElements?.facts?.timeline)
      ? caseData.threeElements.facts.timeline
      : [];
    const parties: string[] = Array.isArray(caseData?.threeElements?.facts?.parties)
      ? caseData.threeElements.facts.parties
      : [];
    const keyFacts: string[] = Array.isArray(caseData?.threeElements?.facts?.keyFacts)
      ? caseData.threeElements.facts.keyFacts
      : [];
    const disputesRaw: any[] = Array.isArray(caseData?.threeElements?.disputes)
      ? caseData.threeElements.disputes
      : [];
    const reasoningSummary: string | undefined = caseData?.threeElements?.reasoning?.summary;

    const normalizedDisputes = this.normalizeDisputes(disputesRaw);
    const partyText = parties.length ? parties.join('、') : '当事人双方';
    const caseLabel = caseData?.basicInfo?.caseNumber ? `案号${caseData.basicInfo.caseNumber}` : '本案';
    const court = caseData?.basicInfo?.court || '相关法院';

    const timelineChunks = this.chunkTimelineIndices(timeline.length, 3);
    const timelineEventMap = timelineChunks.map(chunk =>
      chunk.map(index => this.getEventIdentifier(timeline[index]!, index))
    );

    const earlyTimelineSummaryRaw = timeline.length
      ? this.formatTimelineChunk(timeline, timelineChunks[0] || [])
      : '';
    const earlyTimelineSummary = earlyTimelineSummaryRaw || '当前缺少案件发生过程的时间信息';

    const chapterTwoTimelineSummary = timeline.length
      ? this.formatTimelineChunk(timeline, timelineChunks[1] || [])
      : '';

    const keyFactsText = keyFacts.length ? keyFacts.join('；') : '关键事实有待进一步梳理';
    const chapterTwoTimelineText = chapterTwoTimelineSummary || earlyTimelineSummary;
    const fullTimelineSummary = timeline.length
      ? timeline.map((event, index) => this.formatTimelineEvent(event, index)).join('；')
      : '程序进展信息尚未补充';

    const chapterOneContent = [
      `${caseLabel}由${court}受理，涉及${partyText}之间的纠纷。`,
      keyFacts.length
        ? `判决材料披露的关键事实包括：${keyFactsText}。`
        : '目前需要结合判决书进一步补充案件的核心事实。',
      timeline.length
        ? `案件早期的重要节点包括：${earlyTimelineSummary}。`
        : '由于缺少详细的时间轴，需要补充案件发生的时间顺序。'
    ].join(' ');

    const chapterTwoContent = [
      normalizedDisputes.length
        ? `目前争议主要集中在：${normalizedDisputes.join('；')}。`
        : '当前资料尚未明确列出主要争议点，需要结合时间轴和证据进一步梳理。',
      timeline.length
        ? `与上述争议相关的关键节点包含：${chapterTwoTimelineText}。`
        : '请补充与争议对应的关键事件和证据材料。'
    ].join(' ');

    const chapterThreeContent = [
      timeline.length ? `程序推进概览：${fullTimelineSummary}。` : '程序推进情况需要重新梳理。',
      reasoningSummary
        ? `判决理由中的核心法律观点：${reasoningSummary}`
        : '后续分析应关注法律适用逻辑与潜在风险点。'
    ].join(' ');

    const fallbackChapters: StoryChapter[] = [
      {
        id: 'chapter-1',
        title: '案件背景与基本事实',
        content: chapterOneContent,
        icon: '📋',
        color: 'blue',
        timelineEvents: timelineEventMap[0] || [],
        legalSignificance: '梳理案件背景与当事人关系，为后续争议分析奠定基础。',
        keyParties: parties,
        disputeElements: []
      },
      {
        id: 'chapter-2',
        title: '争议焦点与证据方向',
        content: chapterTwoContent,
        icon: '⚖️',
        color: 'orange',
        timelineEvents: timelineEventMap[1] || [],
        legalSignificance: '概述核心争议并提示所需证据，为教学讨论提供线索。',
        keyParties: parties,
        disputeElements: normalizedDisputes
      },
      {
        id: 'chapter-3',
        title: '程序进展与法律分析',
        content: chapterThreeContent,
        icon: '🏛️',
        color: 'green',
        timelineEvents: timelineEventMap[2] || [],
        legalSignificance: '结合程序节点与法律推理，明确后续分析的重点方向。',
        keyParties: parties,
        disputeElements: []
      }
    ];

    return fallbackChapters;
  }

  /**
   * 将争议数据标准化为简洁摘要
   */
  private normalizeDisputes(disputes: any[]): string[] {
    return disputes
      .map((dispute, index) => {
        if (!dispute) return null;
        if (typeof dispute === 'string') {
          return dispute;
        }
        if (typeof dispute === 'object') {
          const candidate = [
            dispute.title,
            dispute.summary,
            dispute.description,
            dispute.focus,
            dispute.content
          ].find(value => typeof value === 'string' && value.trim().length > 0);

          if (candidate) {
            return candidate.trim();
          }

          if (Array.isArray(dispute.keyPoints) && dispute.keyPoints.length > 0) {
            return dispute.keyPoints.join('、');
          }
        }
        return `争议焦点${index + 1}`;
      })
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim());
  }

  /**
   * 将时间轴拆分为若干区段
   */
  private chunkTimelineIndices(total: number, parts: number): number[][] {
    if (parts <= 0) {
      return [];
    }
    if (total <= 0) {
      return Array.from({ length: parts }, () => []);
    }

    const chunkSize = Math.max(1, Math.ceil(total / parts));
    const buckets: number[][] = [];

    for (let i = 0; i < parts; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, total);
      const bucket: number[] = [];
      for (let index = start; index < end; index++) {
        bucket.push(index);
      }
      buckets.push(bucket);
    }

    return buckets;
  }

  /**
   * 生成事件ID（若缺失则回退）
   */
  private getEventIdentifier(event: TimelineEvent, index: number): string {
    return event.id || `event-${index + 1}`;
  }

  /**
   * 格式化时间轴事件
   */
  private formatTimelineEvent(event: TimelineEvent, index: number): string {
    const date = event.date || `节点${index + 1}`;
    const title = event.title || (event as unknown as { event?: string }).event || '关键事件';
    const description = event.description || (event as unknown as { detail?: string }).detail;
    return description ? `${date} ${title}：${description}` : `${date} ${title}`;
  }

  /**
   * 格式化时间轴区段摘要
   */
  private formatTimelineChunk(timeline: TimelineEvent[], indices: number[]): string {
    if (!indices || indices.length === 0) {
      return '';
    }
    return indices
      .map(index => this.formatTimelineEvent(timeline[index]!, index))
      .join('；');
  }

  /**
   * 判断章节内容是否具有实际教学价值
   */
  private isMeaningfulChapter(chapter: StoryChapter): boolean {
    if (!chapter || !chapter.content) {
      return false;
    }

    const text = chapter.content.trim();
    if (!text) {
      return false;
    }

    const apologyKeywords = ['抱歉', '无法提供', '暂时不可用', '错误', '请稍后', '未能生成'];
    return !apologyKeywords.some(keyword => text.includes(keyword));
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
