/**
 * Timeline Analyzer 兼容性导出
 * 提供与原 lib/ai-timeline-analyzer.ts 兼容的接口
 * 内部使用新的DDD架构实现
 */

import { TimelineAnalysisApplicationService } from './TimelineAnalysisApplicationService';
import type { TimelineEvent, TimelineAnalysisRequest } from './types/TimelineTypes';

// 兼容旧接口的类型定义
export interface AnalysisOptions {
  includeAI?: boolean;
  analysisType?: 'basic' | 'detailed' | 'comprehensive';
  focusAreas?: string[];
}

export class TimelineAnalysisError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'TIMELINE_ANALYSIS_ERROR') {
    super(message);
    this.name = 'TimelineAnalysisError';
    this.code = code;
  }
}

/**
 * Timeline Analyzer 兼容类
 * 内部使用 TimelineAnalysisApplicationService 实现
 */
export class TimelineAnalyzer {
  private service: TimelineAnalysisApplicationService;

  constructor() {
    this.service = new TimelineAnalysisApplicationService();
  }

  /**
   * 分析时间轴事件
   * 兼容原 ai-timeline-analyzer 接口
   */
  async analyzeTimeline(
    events: TimelineEvent[],
    options: AnalysisOptions = {}
  ) {
    try {
      const request: TimelineAnalysisRequest = {
        events,
        includeAI: options.includeAI ?? true,
        analysisType: options.analysisType || 'detailed',
        focusAreas: options.focusAreas
      };

      const response = await this.service.analyzeTimeline(request);

      if (!response.success) {
        throw new TimelineAnalysisError(
          response.error?.message || '时间轴分析失败',
          response.error?.code || 'ANALYSIS_FAILED'
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof TimelineAnalysisError) {
        throw error;
      }

      throw new TimelineAnalysisError(
        `时间轴分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'INTERNAL_ERROR'
      );
    }
  }

  /**
   * 获取分析器状态
   */
  getStatus() {
    return {
      ready: true,
      version: '2.0.0-ddd',
      capabilities: ['rule-based', 'ai-enhanced', 'pattern-matching']
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    // 清理工作
    console.log('TimelineAnalyzer disposed');
  }
}

// 提供单例实例，兼容原有的使用方式
export const timelineAnalyzer = new TimelineAnalyzer();

// 默认导出
export default TimelineAnalyzer;