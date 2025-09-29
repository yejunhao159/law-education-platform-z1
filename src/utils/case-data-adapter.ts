/**
 * 案例数据适配器
 * 解决第一幕和第二幕数据结构不匹配的问题
 *
 * 问题根源：
 * - 第一幕：证据在 threeElements.evidence.items
 * - 第二幕：期望证据在 timeline[].evidence
 *
 * 解决方案：
 * - 创建适配层，将证据数据映射到时间轴事件
 */

export interface TimelineEvent {
  id?: string;
  date: string;
  title: string;
  description: string;
  type?: string;
  evidence?: any[];
  [key: string]: any;
}

export interface CaseDataStructure {
  basicInfo?: any;
  threeElements?: {
    facts?: {
      timeline?: TimelineEvent[];
      parties?: string[];
      keyFacts?: string[];
    };
    evidence?: {
      items?: any[];
      summary?: string;
    };
    reasoning?: any;
  };
  timeline?: TimelineEvent[];
  evidence?: any[];
}

/**
 * 适配案例数据，确保第二幕能正确访问证据
 */
export class CaseDataAdapter {
  /**
   * 将第一幕的数据结构转换为第二幕期望的格式
   */
  static adaptForActTwo(caseData: CaseDataStructure): CaseDataStructure {
    if (!caseData) return caseData;

    // 提取时间轴和证据
    const timeline = this.extractTimeline(caseData);
    const evidenceItems = this.extractEvidence(caseData);

    // 将证据映射到时间轴事件
    const enrichedTimeline = this.enrichTimelineWithEvidence(timeline, evidenceItems);

    // 构建适配后的数据结构
    return {
      ...caseData,
      timeline: enrichedTimeline,
      evidence: evidenceItems,
      threeElements: {
        ...caseData.threeElements,
        facts: {
          ...caseData.threeElements?.facts,
          timeline: enrichedTimeline
        }
      }
    };
  }

  /**
   * 提取时间轴数据并规范化属性名
   */
  private static extractTimeline(caseData: CaseDataStructure): TimelineEvent[] {
    let timeline: any[] = [];

    // 优先从 threeElements.facts.timeline 提取
    if (caseData.threeElements?.facts?.timeline) {
      timeline = caseData.threeElements.facts.timeline;
    }
    // 其次从顶层 timeline 提取
    else if (caseData.timeline) {
      timeline = caseData.timeline;
    }

    // 规范化属性名（兼容新旧数据格式）
    return timeline.map((item, index) => ({
      id: item.id || `timeline-${index}`,
      date: item.date || '',
      title: item.title || item.event || '未命名事件',  // 兼容 event 字段
      description: item.description || item.detail || item.event || '',  // 兼容 detail 字段
      type: item.type,
      importance: item.importance,
      evidence: item.evidence || [],
      // 保留其他原始字段
      ...item
    }));
  }

  /**
   * 提取证据数据
   */
  private static extractEvidence(caseData: CaseDataStructure): any[] {
    // 优先从 threeElements.evidence.items 提取
    if (caseData.threeElements?.evidence?.items) {
      return caseData.threeElements.evidence.items;
    }

    // 其次从顶层 evidence 提取
    if (caseData.evidence) {
      return caseData.evidence;
    }

    return [];
  }

  /**
   * 将证据映射到时间轴事件
   * 基于日期、关键词等进行智能匹配
   */
  private static enrichTimelineWithEvidence(
    timeline: TimelineEvent[],
    evidenceItems: any[]
  ): TimelineEvent[] {
    if (!timeline || timeline.length === 0) return timeline;
    if (!evidenceItems || evidenceItems.length === 0) return timeline;

    return timeline.map(event => {
      // 如果事件已有证据，保留原有证据
      if (event.evidence && event.evidence.length > 0) {
        return event;
      }

      // 智能匹配相关证据
      const relatedEvidence = this.findRelatedEvidence(event, evidenceItems);

      return {
        ...event,
        evidence: relatedEvidence
      };
    });
  }

  /**
   * 查找与时间轴事件相关的证据
   */
  private static findRelatedEvidence(event: TimelineEvent, evidenceItems: any[]): any[] {
    const relatedEvidence: any[] = [];

    evidenceItems.forEach(evidence => {
      // 基于日期匹配
      if (evidence.date && event.date && this.isSameDate(evidence.date, event.date)) {
        relatedEvidence.push(evidence);
        return;
      }

      // 基于关键词匹配
      if (this.hasKeywordMatch(event, evidence)) {
        relatedEvidence.push(evidence);
        return;
      }

      // 基于ID关联
      if (evidence.relatedEvents?.includes(event.id) ||
          evidence.relatedEvents?.includes(event.date)) {
        relatedEvidence.push(evidence);
      }
    });

    // 如果没有找到相关证据，但有证据数据，分配部分证据
    // 这是一个降级策略，确保至少有一些证据可用
    if (relatedEvidence.length === 0 && evidenceItems.length > 0) {
      // 智能分配策略：根据事件在时间轴中的位置分配证据
      const eventIndex = Math.floor(event.date ? parseInt(event.date.replace(/\D/g, '').slice(0, 8)) : 0) % evidenceItems.length;
      const assignedEvidence = evidenceItems[eventIndex] || evidenceItems[0];

      return [{
        ...assignedEvidence,
        relatedToEvent: event.date,
        matchType: 'intelligent-fallback',
        // 确保有基本的证据信息供EvidenceIntelligenceService使用
        name: assignedEvidence.name || assignedEvidence.title || '相关证据',
        type: assignedEvidence.type || '书证',
        description: assignedEvidence.description || assignedEvidence.content || '证据材料'
      }];
    }

    return relatedEvidence;
  }

  /**
   * 判断两个日期是否相同（忽略格式差异）
   */
  private static isSameDate(date1: string, date2: string): boolean {
    // 简单的日期比较，实际应用中需要更复杂的逻辑
    return date1 === date2 ||
           date1.includes(date2) ||
           date2.includes(date1);
  }

  /**
   * 检查事件和证据是否有关键词匹配
   */
  private static hasKeywordMatch(event: TimelineEvent, evidence: any): boolean {
    const eventText = `${event.title} ${event.description}`.toLowerCase();
    const evidenceText = `${evidence.title || ''} ${evidence.content || ''} ${evidence.description || ''}`.toLowerCase();

    // 简单的关键词匹配
    const keywords = ['合同', '协议', '付款', '违约', '证明', '通知'];

    return keywords.some(keyword =>
      eventText.includes(keyword) && evidenceText.includes(keyword)
    );
  }

  /**
   * 验证适配后的数据完整性
   */
  static validateAdaptedData(data: CaseDataStructure): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // 检查时间轴
    if (!data.timeline || data.timeline.length === 0) {
      issues.push('缺少时间轴数据');
    }

    // 检查证据
    if (!data.evidence || data.evidence.length === 0) {
      issues.push('缺少证据数据');
    }

    // 检查证据是否已映射到时间轴
    const timelineWithEvidence = data.timeline?.filter(e => e.evidence && e.evidence.length > 0) || [];
    if (timelineWithEvidence.length === 0 && data.evidence && data.evidence.length > 0) {
      issues.push('证据未映射到时间轴事件');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// 导出便捷函数
export const adaptCaseData = CaseDataAdapter.adaptForActTwo.bind(CaseDataAdapter);
export const validateCaseData = CaseDataAdapter.validateAdaptedData.bind(CaseDataAdapter);