/**
 * 分析数据适配器
 * 负责将TimelineAnalysis转换为DeepAnalysisResult格式
 *
 * 问题背景:
 * - 第二幕保存的是 TimelineAnalysis 类型
 * - PPT生成期望的是 DeepAnalysisResult 类型
 * - 数据结构不匹配导致PPT大纲无法获取真实数据
 */

import type { DeepAnalysisResult } from '@/src/types';

/**
 * TimelineAnalysis类型 (从第二幕API返回)
 */
export interface TimelineAnalysis {
  turningPoints?: Array<{
    date: string;
    description: string;
    legalSignificance: string;
    importance?: 'critical' | 'important' | 'normal';
  }>;
  keyTurningPoints?: Array<{
    date: string;
    description: string;
    legalSignificance: string;
    importance?: 'critical' | 'important' | 'normal';
  }>;
  legalRisks?: Array<{
    description: string;
    likelihood: 'high' | 'medium' | 'low';
    suggestion?: string;
  }>;
  risks?: Array<{
    description: string;
    likelihood: 'high' | 'medium' | 'low';
    suggestion?: string;
  }>;
  summary?: string;
  evidenceMapping?: any;
  [key: string]: any;
}

/**
 * 将TimelineAnalysis转换为DeepAnalysisResult
 */
export function adaptTimelineAnalysisToDeepAnalysisResult(
  timelineAnalysis: TimelineAnalysis | null
): DeepAnalysisResult {
  if (!timelineAnalysis) {
    return createEmptyDeepAnalysisResult();
  }

  console.log('🔄 [AnalysisDataAdapter] 开始转换TimelineAnalysis → DeepAnalysisResult');

  // 提取转折点 (兼容两种字段名)
  const turningPoints = timelineAnalysis.keyTurningPoints || timelineAnalysis.turningPoints || [];

  // 提取法律风险 (兼容两种字段名)
  const legalRisks = timelineAnalysis.legalRisks || timelineAnalysis.risks || [];

  // ========== 转换为DeepAnalysisResult格式 ==========

  const result: DeepAnalysisResult = {
    // 事实分析
    factAnalysis: {
      // 关键事实: 从转折点提取
      keyFacts: turningPoints
        .filter(tp => tp.importance === 'critical')
        .map(tp => `${tp.date}: ${tp.description}`)
        .slice(0, 5),

      // 争议焦点: 从重要转折点提取
      disputedPoints: turningPoints
        .filter(tp => tp.importance === 'critical' || tp.importance === 'important')
        .map(tp => tp.legalSignificance)
        .filter(Boolean)
        .slice(0, 5),

      // 时间轴: 从转折点转换
      timeline: turningPoints.map(tp => ({
        date: tp.date,
        event: tp.description,
        importance: tp.importance || 'normal'
      }))
    },

    // 证据分析
    evidenceAnalysis: {
      // 证据优势: 从summary中推断
      strengths: timelineAnalysis.summary
        ? [timelineAnalysis.summary]
        : turningPoints.length > 0
        ? [`案件包含${turningPoints.length}个关键转折点，事实脉络清晰`]
        : [],

      // 证据弱点: 从风险中提取
      weaknesses: legalRisks
        .filter(risk => risk.likelihood === 'high')
        .map(risk => risk.description)
        .slice(0, 3),

      // 改进建议: 从风险建议中提取
      recommendations: legalRisks
        .map(risk => risk.suggestion)
        .filter(Boolean)
        .slice(0, 3)
    },

    // 法律分析
    legalAnalysis: {
      // 适用法律: 从转折点的法律意义中提取
      applicableLaws: turningPoints
        .map(tp => tp.legalSignificance)
        .filter(sig => sig && (sig.includes('法') || sig.includes('条') || sig.includes('规定')))
        .slice(0, 5),

      // 判例参考: 暂时为空 (TimelineAnalysis不包含此数据)
      precedents: [],

      // 法律风险: 从legalRisks转换
      risks: legalRisks.map(risk =>
        `${risk.likelihood === 'high' ? '⚠️ 高风险' : risk.likelihood === 'medium' ? '⚡ 中风险' : 'ℹ️ 低风险'}: ${risk.description}`
      )
    }
  };

  console.log('✅ [AnalysisDataAdapter] 转换完成:', {
    keyFacts: result.factAnalysis.keyFacts.length,
    disputedPoints: result.factAnalysis.disputedPoints.length,
    timeline: result.factAnalysis.timeline.length,
    strengths: result.evidenceAnalysis.strengths.length,
    weaknesses: result.evidenceAnalysis.weaknesses.length,
    risks: result.legalAnalysis.risks.length
  });

  return result;
}

/**
 * 创建空的DeepAnalysisResult (兜底方案)
 */
function createEmptyDeepAnalysisResult(): DeepAnalysisResult {
  return {
    factAnalysis: {
      keyFacts: [],
      disputedPoints: [],
      timeline: []
    },
    evidenceAnalysis: {
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    legalAnalysis: {
      applicableLaws: [],
      precedents: [],
      risks: []
    }
  };
}
