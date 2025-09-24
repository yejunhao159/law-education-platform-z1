/**
 * 案情智能叙事服务
 * 基于案例三要素和时间轴生成专业法律叙事
 * 用于第二幕案情概括的AI增强
 */

import { createLogger } from '@/lib/logging';
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
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
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

      // 增强章节内容
      const enhancedChapters = await this.enhanceChaptersWithAnalysis(chapters, request.caseData);

      const response: NarrativeGenerationResponse = {
        success: true,
        chapters: enhancedChapters,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          confidence: this.calculateConfidence(enhancedChapters),
          model: 'deepseek-chat-narrative',
          tokensUsed: 0 // 将由AI API填充
        }
      };

      logger.info('智能案情叙事生成完成', {
        chaptersCount: enhancedChapters.length,
        processingTime: response.metadata.processingTime
      });

      return response;

    } catch (error) {
      logger.error('智能案情叙事生成失败', error);
      return this.buildErrorResponse(error, startTime);
    }
  }

  /**
   * 构建专业叙事提示词
   */
  private buildNarrativePrompt(request: NarrativeGenerationRequest): string {
    const { caseData, narrativeStyle, depth } = request;
    const timeline = caseData.threeElements.facts.timeline;
    const parties = caseData.threeElements.facts.parties;

    // 构建时间轴摘要
    const timelineSummary = timeline.map((event, index) =>
      `${index + 1}. ${event.date} - ${event.title}: ${event.description}`
    ).join('\n');

    // 构建当事人关系
    const partiesContext = parties.length > 0 ?
      `主要当事人：${parties.join('、')}` :
      '当事人信息待完善';

    return `你是一位资深的法律专家和教育工作者，精通法律案例的叙事艺术。请基于以下案例信息生成专业的法律案情叙事。

## 案例基本信息
- 案件编号：${caseData.basicInfo.caseNumber || '待补充'}
- 审理法院：${caseData.basicInfo.court || '待补充'}
- 案件类型：${caseData.basicInfo.caseType || '待补充'}
- ${partiesContext}

## 时间轴事件
${timelineSummary}

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
        temperature: 0.7, // 适度创造性，保持专业性
        max_tokens: 3000, // 支持长文本生成
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
   * 解析AI响应
   */
  private parseAIResponse(aiResponse: string, caseData: any): StoryChapter[] {
    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(aiResponse);

      if (parsed.chapters && Array.isArray(parsed.chapters)) {
        return parsed.chapters.map((chapter: any, index: number) => ({
          id: `chapter-${index + 1}`,
          title: chapter.title || `章节${index + 1}`,
          content: chapter.content || '内容生成中...',
          icon: this.getChapterIcon(index),
          color: this.getChapterColor(index),
          legalSignificance: chapter.legalSignificance,
          keyParties: Array.isArray(chapter.keyParties) ? chapter.keyParties : [],
          disputeElements: Array.isArray(chapter.disputeElements) ? chapter.disputeElements : []
        }));
      }
    } catch (parseError) {
      logger.warn('AI响应非标准JSON格式，使用文本解析', { error: parseError });
    }

    // 如果JSON解析失败，使用文本解析作为备选
    return this.parseTextResponse(aiResponse, caseData);
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