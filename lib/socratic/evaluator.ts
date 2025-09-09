// 论证评估器 - Rubric评分系统
import { Turn, RubricScore, RubricDimension, ElementCoverage } from './types';
import { deepseekService } from '@/lib/ai/deepseek-service';

// ==================== 评分规则引擎 ====================

export class ArgumentEvaluator {
  // 评分权重配置
  private readonly weights = {
    relevance: 0.20,    // 相关性 20%
    rule: 0.20,         // 规则准确 20%
    application: 0.30,  // 应用深度 30%
    citation: 0.20,     // 证据引用 20%
    conclusion: 0.10    // 结论清晰 10%
  };

  /**
   * 评估学生论证质量
   */
  async evaluate(
    turn: Turn,
    context: {
      issue: string;
      elements: string[];
      previousTurns?: Turn[];
      facts: Map<string, string>;
      laws: Map<string, string>;
    }
  ): Promise<RubricScore> {
    // 并行执行各维度评估
    const [relevance, rule, application, citation, conclusion] = await Promise.all([
      this.evaluateRelevance(turn, context.issue),
      this.evaluateRuleAccuracy(turn, context.laws),
      this.evaluateApplication(turn, context.elements, context.facts),
      this.evaluateCitation(turn, context.facts, context.laws),
      this.evaluateConclusion(turn)
    ]);

    // 识别缺失要件
    const gaps = this.identifyGaps(turn, context.elements);
    
    // 生成可操作建议
    const actionable = this.generateActionableFeedback({
      relevance, rule, application, citation, conclusion
    }, gaps);

    // 计算总分
    const total = Math.round(
      relevance.score * this.weights.relevance +
      rule.score * this.weights.rule +
      application.score * this.weights.application +
      citation.score * this.weights.citation +
      conclusion.score * this.weights.conclusion
    );

    // 判断必须修正项
    const mustFix = this.identifyMustFix(turn, { relevance, rule, citation });

    return {
      total,
      dims: {
        relevance: { ...relevance, weight: this.weights.relevance },
        rule: { ...rule, weight: this.weights.rule },
        application: { ...application, weight: this.weights.application },
        citation: { ...citation, weight: this.weights.citation },
        conclusion: { ...conclusion, weight: this.weights.conclusion }
      },
      gaps,
      actionable: actionable.slice(0, 3), // 最多3条建议
      mustFix,
      overallLevel: this.getOverallLevel(total)
    };
  }

  /**
   * 评估相关性维度
   */
  private async evaluateRelevance(turn: Turn, issue: string): Promise<RubricDimension> {
    // 规则评估：是否围绕当前争议点
    const keywords = this.extractKeywords(issue);
    const turnKeywords = this.extractKeywords(turn.issue + ' ' + turn.application);
    const overlap = this.calculateOverlap(keywords, turnKeywords);

    let score = 0;
    let feedback = '';

    if (overlap > 0.7) {
      score = 90 + Math.round(overlap * 10);
      feedback = '论述高度聚焦核心争议点';
    } else if (overlap > 0.4) {
      score = 70 + Math.round(overlap * 20);
      feedback = '基本围绕争议点，但部分内容偏离主题';
    } else {
      score = 40 + Math.round(overlap * 30);
      feedback = '论述偏离核心争议，请重新聚焦问题';
    }

    return { score, weight: 0, feedback };
  }

  /**
   * 评估规则准确性
   */
  private async evaluateRuleAccuracy(turn: Turn, laws: Map<string, string>): Promise<RubricDimension> {
    let score = 100;
    let feedback = '法律规则引用准确';

    // 检查引用的法条是否存在
    for (const lawId of turn.citedLaws) {
      if (!laws.has(lawId)) {
        score -= 30;
        feedback = `引用了不存在的法条: ${lawId}`;
        break;
      }
    }

    // 检查规则描述是否准确（简化版）
    if (turn.rule.length < 20) {
      score = Math.min(score, 60);
      feedback = '法律规则描述过于简略，请展开说明';
    }

    // AI辅助检查（可选）
    if (score > 60 && turn.citedLaws.length > 0) {
      const lawContent = turn.citedLaws.map(id => laws.get(id)).join('\n');
      const isAccurate = await this.checkRuleAccuracy(turn.rule, lawContent);
      if (!isAccurate) {
        score = Math.min(score, 70);
        feedback = '法律规则理解有偏差，请仔细对照法条原文';
      }
    }

    return { score: Math.max(0, score), weight: 0, feedback };
  }

  /**
   * 评估要件适用深度
   */
  private evaluateApplication(
    turn: Turn,
    elements: string[],
    facts: Map<string, string>
  ): Promise<RubricDimension> {
    let score = 60; // 基础分
    let feedback = '';

    // 检查要件逐一比对
    const coveredElements = elements.filter(elem => 
      turn.application.includes(elem) || 
      this.fuzzyMatch(turn.application, elem)
    );

    const coverageRate = coveredElements.length / elements.length;
    
    if (coverageRate >= 0.8) {
      score = 85 + Math.round(coverageRate * 15);
      feedback = '要件分析全面深入';
    } else if (coverageRate >= 0.5) {
      score = 70 + Math.round(coverageRate * 15);
      feedback = `已覆盖${Math.round(coverageRate * 100)}%要件，继续补充其他要件分析`;
    } else {
      score = 50 + Math.round(coverageRate * 20);
      feedback = '要件分析不足，请逐一对照法条要件进行论证';
    }

    // 检查是否结合事实
    const citedFactsContent = turn.citedFacts
      .map(id => facts.get(id))
      .filter(Boolean)
      .join(' ');
    
    if (citedFactsContent && turn.application.length > 50) {
      score = Math.min(100, score + 10);
      feedback += '；事实与要件结合紧密';
    }

    return Promise.resolve({ score, weight: 0, feedback });
  }

  /**
   * 评估证据引用质量
   */
  private evaluateCitation(
    turn: Turn,
    facts: Map<string, string>,
    laws: Map<string, string>
  ): Promise<RubricDimension> {
    let score = 100;
    let feedback = '';

    // 检查引用数量
    if (turn.citedFacts.length === 0) {
      score = 0;
      feedback = '未引用任何事实证据';
    } else if (turn.citedFacts.length === 1) {
      score = 70;
      feedback = '建议引用更多相关事实增强论证';
    }

    if (turn.citedLaws.length === 0) {
      score = Math.min(score, 0);
      feedback = '未引用任何法律依据';
    }

    // 检查引用有效性
    const invalidFacts = turn.citedFacts.filter(id => !facts.has(id));
    const invalidLaws = turn.citedLaws.filter(id => !laws.has(id));

    if (invalidFacts.length > 0 || invalidLaws.length > 0) {
      score = Math.max(0, score - 30);
      feedback = '存在无效引用，请检查引用标识';
    }

    // 检查引用相关性（是否在正文中提及）
    const mentioned = turn.citedFacts.some(id => 
      turn.application.includes(`[F${id}]`) || 
      turn.application.includes(id)
    );

    if (score > 0 && !mentioned) {
      score = Math.max(50, score - 20);
      feedback += '；引用未在论述中体现，请明确标注';
    }

    if (score >= 90) {
      feedback = '引用充分且准确，论证有力';
    }

    return Promise.resolve({ score, weight: 0, feedback });
  }

  /**
   * 评估结论清晰度
   */
  private evaluateConclusion(turn: Turn): Promise<RubricDimension> {
    let score = 80; // 基础分
    let feedback = '';

    // 长度检查
    if (turn.conclusion.length < 10) {
      score = 60;
      feedback = '结论过于简略';
    } else if (turn.conclusion.length > 200) {
      score = 70;
      feedback = '结论冗长，请简明扼要';
    }

    // 立场一致性检查
    const hasProWords = /支持|赞成|应当|构成/.test(turn.conclusion);
    const hasConWords = /反对|不应|不构成|缺乏/.test(turn.conclusion);

    if (turn.stance === 'pro' && hasConWords && !hasProWords) {
      score = Math.min(score, 50);
      feedback = '结论与所选立场不一致';
    } else if (turn.stance === 'con' && hasProWords && !hasConWords) {
      score = Math.min(score, 50);
      feedback = '结论与所选立场不一致';
    }

    // 可验证性检查
    if (turn.conclusion.includes('因此') || turn.conclusion.includes('故')) {
      score = Math.min(100, score + 10);
      feedback = feedback || '结论逻辑清晰';
    }

    if (score >= 80) {
      feedback = feedback || '结论明确有力';
    }

    return Promise.resolve({ score, weight: 0, feedback });
  }

  /**
   * 识别缺失要件
   */
  private identifyGaps(turn: Turn, elements: string[]): string[] {
    const content = turn.issue + turn.rule + turn.application;
    return elements.filter(elem => 
      !content.includes(elem) && !this.fuzzyMatch(content, elem)
    );
  }

  /**
   * 生成可操作建议
   */
  private generateActionableFeedback(
    dims: Record<string, RubricDimension>,
    gaps: string[]
  ): string[] {
    const suggestions: Array<{ score: number; text: string }> = [];

    // 基于各维度生成建议
    if (dims.relevance.score < 70) {
      suggestions.push({
        score: dims.relevance.score,
        text: '请重新阅读争议焦点，确保论述紧扣核心问题'
      });
    }

    if (dims.rule.score < 70) {
      suggestions.push({
        score: dims.rule.score,
        text: '请准确引用法条原文，避免主观解读'
      });
    }

    if (dims.application.score < 70) {
      suggestions.push({
        score: dims.application.score,
        text: `请补充论证以下要件：${gaps.slice(0, 2).join('、')}`
      });
    }

    if (dims.citation.score < 70) {
      suggestions.push({
        score: dims.citation.score,
        text: '请在论述中明确标注引用的事实和法条，如[F1]、[L2]'
      });
    }

    if (dims.conclusion.score < 70) {
      suggestions.push({
        score: dims.conclusion.score,
        text: '请用一句话明确表达你的立场和理由'
      });
    }

    // 按严重程度排序，返回前3条
    return suggestions
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(s => s.text);
  }

  /**
   * 判断必须修正的问题
   */
  private identifyMustFix(
    turn: Turn,
    dims: { relevance: RubricDimension; rule: RubricDimension; citation: RubricDimension }
  ): RubricScore['mustFix'] {
    if (turn.citedFacts.length === 0 || turn.citedLaws.length === 0) {
      return 'MISSING_CITATION';
    }
    if (dims.rule.score < 50) {
      return 'WRONG_RULE';
    }
    if (dims.relevance.score < 40) {
      return 'ELEMENT_GAP';
    }
    return null;
  }

  /**
   * 获取总体水平
   */
  private getOverallLevel(total: number): RubricScore['overallLevel'] {
    if (total >= 85) return 'excellent';
    if (total >= 70) return 'good';
    if (total >= 55) return 'fair';
    return 'poor';
  }

  // ==================== 辅助方法 ====================

  private extractKeywords(text: string): Set<string> {
    // 简单的中文分词（生产环境建议用jieba等）
    const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    return new Set(words.filter(w => w.length > 1));
  }

  private calculateOverlap(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private fuzzyMatch(text: string, keyword: string): boolean {
    // 简单的模糊匹配
    const chars = keyword.split('');
    return chars.every(char => text.includes(char));
  }

  private async checkRuleAccuracy(rule: string, lawContent: string): Promise<boolean> {
    // 使用AI检查规则准确性（简化版）
    try {
      const prompt = `
判断以下法律规则描述是否准确：
法条原文：${lawContent}
学生描述：${rule}
仅回答：准确/不准确
`;
      const result = await deepseekService.analyze(prompt, { temperature: 0.1 });
      return result.includes('准确') && !result.includes('不准确');
    } catch {
      return true; // 失败时默认通过
    }
  }
}

// 导出单例
export const argumentEvaluator = new ArgumentEvaluator();