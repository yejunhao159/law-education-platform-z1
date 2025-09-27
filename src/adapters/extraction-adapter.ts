/**
 * 提取结果格式适配器
 * 用于新旧两套提取服务的数据格式转换
 * 支持双向转换，实现平滑迁移
 */

import type { ExtractedData } from '@/types/legal-intelligence';

/**
 * 三要素格式（旧版API输出，前端依赖）
 */
export interface ThreeElementsFormat {
  basicInfo: {
    caseNumber: string;
    court: string;
    date: string;
    parties: {
      plaintiff: string;
      defendant: string;
    };
  };
  threeElements: {
    facts: {
      summary: string;
      timeline: any[];
      keyFacts: string[];
      disputedFacts: string[];
      undisputedFacts: string[];
    };
    evidence: {
      summary: string;
      items: any[];
    };
    reasoning: {
      summary: string;
      legalBasis: string[];
      logicChain: string[];
      keyArguments: string[];
      judgment: string;
    };
  };
  metadata: {
    confidence: number;
    processingTime: number;
    aiModel: string;
  };
}

/**
 * 提取结果双向适配器
 */
export class ExtractionAdapter {
  /**
   * 将新版ExtractedData转换为旧版三要素格式
   * 用于：新服务输出给现有前端
   */
  static toThreeElements(data: ExtractedData): ThreeElementsFormat {
    return {
      basicInfo: {
        caseNumber: data.basicInfo?.caseNumber || '',
        court: data.basicInfo?.court || '',
        date: this.extractFirstDate(data.dates) || data.basicInfo?.date || '',
        parties: this.extractParties(data.parties)
      },
      threeElements: {
        facts: {
          summary: data.facts?.summary || this.generateFactsSummary(data),
          timeline: data.timeline || [],
          keyFacts: data.facts?.keyPoints || [],
          disputedFacts: data.disputes?.map(d => d.description) || [],
          undisputedFacts: data.facts?.undisputedFacts || []
        },
        evidence: {
          summary: this.generateEvidenceSummary(data.evidence),
          items: this.normalizeEvidenceItems(data.evidence)
        },
        reasoning: {
          summary: data.analysis?.legalReasoning || '法官说理分析',
          legalBasis: data.legalProvisions || [],
          logicChain: data.analysis?.logicChain || [],
          keyArguments: data.analysis?.keyPoints || [],
          judgment: data.analysis?.conclusion || ''
        }
      },
      metadata: {
        confidence: data.metadata?.confidence || 0.8,
        processingTime: data.metadata?.processingTime || 0,
        aiModel: data.metadata?.method || 'hybrid'
      }
    };
  }

  /**
   * 将旧版三要素格式转换为新版ExtractedData
   * 用于：旧服务输出给新模块使用
   */
  static toExtractedData(threeElements: ThreeElementsFormat): ExtractedData {
    return {
      basicInfo: {
        caseNumber: threeElements.basicInfo.caseNumber,
        court: threeElements.basicInfo.court,
        date: threeElements.basicInfo.date
      },
      parties: [
        {
          role: 'plaintiff',
          name: threeElements.basicInfo.parties.plaintiff
        },
        {
          role: 'defendant',
          name: threeElements.basicInfo.parties.defendant
        }
      ].filter(p => p.name),
      dates: [threeElements.basicInfo.date].filter(Boolean),
      facts: {
        summary: threeElements.threeElements.facts.summary,
        keyPoints: threeElements.threeElements.facts.keyFacts,
        undisputedFacts: threeElements.threeElements.facts.undisputedFacts
      },
      timeline: threeElements.threeElements.facts.timeline,
      disputes: threeElements.threeElements.facts.disputedFacts.map((d, i) => ({
        id: `dispute-${i}`,
        description: d,
        severity: 'medium' as const
      })),
      evidence: threeElements.threeElements.evidence.items,
      legalProvisions: threeElements.threeElements.reasoning.legalBasis,
      analysis: {
        legalReasoning: threeElements.threeElements.reasoning.summary,
        keyPoints: threeElements.threeElements.reasoning.keyArguments,
        logicChain: threeElements.threeElements.reasoning.logicChain,
        conclusion: threeElements.threeElements.reasoning.judgment
      },
      metadata: {
        confidence: threeElements.metadata.confidence,
        processingTime: threeElements.metadata.processingTime,
        method: threeElements.metadata.aiModel
      }
    };
  }

  /**
   * 统一请求格式处理
   */
  static normalizeRequest(input: any): {
    text: string;
    options: {
      enableAI: boolean;
      elementType: string;
      enhanceWithProvisions: boolean;
      cacheEnabled: boolean;
      outputFormat?: 'three-elements' | 'extracted-data';
    };
  } {
    return {
      text: input.text || input.content || '',
      options: {
        enableAI: input.useAI !== false,
        elementType: input.elementType || 'all',
        enhanceWithProvisions: input.enhanceWithProvisions !== false,
        cacheEnabled: input.cacheEnabled !== false,
        outputFormat: input.format || input.outputFormat
      }
    };
  }

  // ========== 私有辅助方法 ==========

  private static extractFirstDate(dates?: string[]): string {
    if (!dates || dates.length === 0) return '';
    return dates[0];
  }

  private static extractParties(parties?: Array<{ role: string; name: string }>): {
    plaintiff: string;
    defendant: string;
  } {
    const plaintiff = parties?.find(p =>
      p.role === 'plaintiff' || p.role === '原告'
    )?.name || '';

    const defendant = parties?.find(p =>
      p.role === 'defendant' || p.role === '被告'
    )?.name || '';

    return { plaintiff, defendant };
  }

  private static generateFactsSummary(data: ExtractedData): string {
    if (data.facts?.summary) return data.facts.summary;

    const keyPoints = data.facts?.keyPoints || [];
    if (keyPoints.length > 0) {
      return `本案涉及${keyPoints.length}个关键事实：${keyPoints.slice(0, 3).join('；')}`;
    }

    return '事实摘要待完善';
  }

  private static generateEvidenceSummary(evidence?: any[]): string {
    if (!evidence || evidence.length === 0) {
      return '暂无证据信息';
    }
    return `共${evidence.length}项证据，包括书证、证人证言等`;
  }

  private static normalizeEvidenceItems(evidence?: any[]): any[] {
    if (!evidence) return [];

    return evidence.map((item, index) => {
      // 如果已经是标准格式，直接返回
      if (item.id && item.type && item.content) {
        return item;
      }

      // 否则尝试规范化
      return {
        id: item.id || `evidence-${index}`,
        type: item.type || 'documentary',
        content: item.content || item.description || '',
        party: item.party || 'unknown',
        accepted: item.accepted !== false
      };
    });
  }

  /**
   * 检测输入数据格式
   */
  static detectFormat(data: any): 'three-elements' | 'extracted-data' | 'unknown' {
    // 检查是否为三要素格式
    if (data.threeElements && data.basicInfo) {
      return 'three-elements';
    }

    // 检查是否为ExtractedData格式
    if (data.parties && Array.isArray(data.parties)) {
      return 'extracted-data';
    }

    return 'unknown';
  }

  /**
   * 智能格式转换（自动检测并转换）
   */
  static autoConvert(data: any, targetFormat: 'three-elements' | 'extracted-data'): any {
    const sourceFormat = this.detectFormat(data);

    if (sourceFormat === targetFormat) {
      return data;
    }

    if (sourceFormat === 'three-elements' && targetFormat === 'extracted-data') {
      return this.toExtractedData(data);
    }

    if (sourceFormat === 'extracted-data' && targetFormat === 'three-elements') {
      return this.toThreeElements(data);
    }

    // 无法识别格式，返回原数据
    console.warn('无法识别数据格式，返回原始数据');
    return data;
  }
}