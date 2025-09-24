/**
 * 苏格拉底问题质量控制协议
 * 确保每个问题都符合苏格拉底教学的高质量标准
 * 整合四大问题类型与质量评估机制
 */

export interface QuestionType {
  /** 问题类型名称 */
  name: string;

  /** 问题目的 */
  purpose: string;

  /** 标准结构 */
  structure: string;

  /** 触发条件 */
  triggers: string[];

  /** 典型例子 */
  examples: string[];

  /** 质量标准 */
  qualityStandards: {
    excellent: string;
    good: string;
    acceptable: string;
    poor: string;
  };
}

/**
 * 四大苏格拉底问题类型体系
 * 基于分析哲学的严格问题分类
 */
export const SOCRATIC_QUESTION_TYPES: Record<string, QuestionType> = {
  clarification: {
    name: "澄清型问题",
    purpose: "消除语义模糊，明确概念边界和术语含义",
    structure: "您所说的[概念]具体是指什么？",
    triggers: ["模糊概念", "歧义表达", "术语不明"],
    examples: [
      "当您说'合理'时，判断标准是什么？",
      "这里的'损害'与'损失'有何区别？",
      "您能举个具体例子来说明这个概念吗？",
      "这个术语在法律条文中是如何定义的？"
    ],
    qualityStandards: {
      excellent: "问题直接指向核心概念，能够有效消除歧义，引导精确理解",
      good: "问题明确指向概念澄清，表达清晰",
      acceptable: "问题涉及概念澄清，但可能稍显宽泛",
      poor: "问题模糊，无法有效澄清概念"
    }
  },

  assumption: {
    name: "假设型问题",
    purpose: "暴露隐含前提，检验论证的基础假设",
    structure: "您的观点是否假设了[前提]？",
    triggers: ["论证跳跃", "隐含前提", "价值预设"],
    examples: [
      "您的分析是否预设了当事人具有完全的理性？",
      "这个论证是否建立在'效率优先'的假设之上？",
      "如果没有这个假设，结论还会成立吗？",
      "您是否假设了法官会严格按照条文执行？"
    ],
    qualityStandards: {
      excellent: "精准识别关键隐含假设，有效检验论证基础",
      good: "能够识别重要假设，促进反思",
      acceptable: "涉及假设检验，但可能不够深入",
      poor: "未能有效识别或检验假设"
    }
  },

  evidence: {
    name: "证据型问题",
    purpose: "检验论证的事实基础和逻辑支撑",
    structure: "支持这个观点的证据是什么？",
    triggers: ["缺乏证据", "证据薄弱", "逻辑跳跃"],
    examples: [
      "有什么证据表明这种解释是正确的？",
      "这个推论的逻辑链条是什么？",
      "有没有反面的证据需要考虑？",
      "这些证据在法律上是否足够充分？"
    ],
    qualityStandards: {
      excellent: "有效检验证据充分性和逻辑严密性，促进严谨思维",
      good: "能够引导证据分析和逻辑检验",
      acceptable: "涉及证据或逻辑问题，但可能不够具体",
      poor: "未能有效检验证据或逻辑"
    }
  },

  implication: {
    name: "推演型问题",
    purpose: "探索观点的逻辑后果和适用边界",
    structure: "如果接受这个观点，会导致什么结果？",
    triggers: ["逻辑后果", "适用范围", "边界情况"],
    examples: [
      "如果这个原则普遍适用，会产生什么后果？",
      "这个解释在极端情况下还成立吗？",
      "这与其他法律原则是否存在冲突？",
      "这样的判决对未来类似案件有什么影响？"
    ],
    qualityStandards: {
      excellent: "深入探索逻辑后果，揭示潜在问题和边界",
      good: "能够引导后果思考和影响分析",
      acceptable: "涉及后果推演，但可能不够全面",
      poor: "未能有效探索逻辑后果"
    }
  }
};

/**
 * 问题质量评估维度
 */
export interface QualityDimension {
  /** 维度名称 */
  name: string;

  /** 评估标准 */
  criteria: string;

  /** 权重 */
  weight: number;

  /** 评估方法 */
  assessmentMethod: (question: string, context: any) => number;
}

export const QUALITY_DIMENSIONS: QualityDimension[] = [
  {
    name: "聚焦度",
    criteria: "问题是否明确指向单一认知目标",
    weight: 0.25,
    assessmentMethod: (question: string) => {
      // 简化评估：检查问题是否包含多个问号或'and'连接
      const questionMarks = (question.match(/？|\?/g) || []).length;
      const andConnections = (question.match(/和|与|以及|并且/g) || []).length;

      if (questionMarks === 1 && andConnections === 0) return 5;
      if (questionMarks === 1 && andConnections <= 1) return 4;
      if (questionMarks <= 2) return 3;
      return 2;
    }
  },

  {
    name: "逻辑性",
    criteria: "问题是否符合逻辑推理规律",
    weight: 0.25,
    assessmentMethod: (question: string) => {
      // 简化评估：检查逻辑连接词和推理结构
      const logicWords = ['如果', '那么', '因为', '所以', '由于', '因此'];
      const hasLogicStructure = logicWords.some(word => question.includes(word));

      // 检查是否有矛盾表述
      const contradictions = ['不是但是', '既不也不'];
      const hasContradiction = contradictions.some(phrase => question.includes(phrase));

      if (hasLogicStructure && !hasContradiction) return 5;
      if (hasLogicStructure) return 4;
      if (!hasContradiction) return 3;
      return 2;
    }
  },

  {
    name: "开放性",
    criteria: "问题是否避免了预设答案和引导性",
    weight: 0.3,
    assessmentMethod: (question: string) => {
      // 检查引导性词汇
      const guidingWords = ['应该', '必须', '显然', '当然', '肯定'];
      const hasGuidingWords = guidingWords.some(word => question.includes(word));

      // 检查开放性表述
      const openWords = ['您认为', '您觉得', '可能', '也许', '是否'];
      const hasOpenWords = openWords.some(word => question.includes(word));

      if (hasOpenWords && !hasGuidingWords) return 5;
      if (hasOpenWords) return 4;
      if (!hasGuidingWords) return 3;
      return 2;
    }
  },

  {
    name: "适切性",
    criteria: "问题是否适合学生当前的认知水平",
    weight: 0.2,
    assessmentMethod: (question: string, context: any) => {
      // 简化评估：基于问题复杂度和学生水平匹配
      const complexWords = ['体系', '范式', '本质', '逻辑', '哲学'];
      const complexityScore = complexWords.filter(word => question.includes(word)).length;

      const level = context?.studentLevel || 'intermediate';
      const expectedComplexity = level === 'basic' ? 0 : level === 'intermediate' ? 1 : 2;

      if (Math.abs(complexityScore - expectedComplexity) <= 1) return 5;
      if (Math.abs(complexityScore - expectedComplexity) <= 2) return 3;
      return 2;
    }
  }
];

/**
 * 问题质量评估器
 */
export class QuestionQualityAssessor {
  /**
   * 评估单个问题的整体质量
   */
  assessQuestionQuality(
    question: string,
    questionType: keyof typeof SOCRATIC_QUESTION_TYPES,
    context: {
      studentLevel?: 'basic' | 'intermediate' | 'advanced';
      currentLayer?: number;
      hasOptions?: boolean;
    }
  ): {
    overallScore: number;
    dimensionScores: Record<string, number>;
    qualityLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
    suggestions: string[];
  } {
    // 计算各维度得分
    const dimensionScores: Record<string, number> = {};
    let weightedSum = 0;
    let totalWeight = 0;

    for (const dimension of QUALITY_DIMENSIONS) {
      const score = dimension.assessmentMethod(question, context);
      dimensionScores[dimension.name] = score;
      weightedSum += score * dimension.weight;
      totalWeight += dimension.weight;
    }

    const overallScore = weightedSum / totalWeight;

    // 确定质量等级
    let qualityLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
    if (overallScore >= 4.5) qualityLevel = 'excellent';
    else if (overallScore >= 3.5) qualityLevel = 'good';
    else if (overallScore >= 2.5) qualityLevel = 'acceptable';
    else qualityLevel = 'poor';

    // 生成改进建议
    const suggestions = this.generateImprovementSuggestions(dimensionScores, questionType, context);

    return {
      overallScore,
      dimensionScores,
      qualityLevel,
      suggestions
    };
  }

  /**
   * 生成问题改进建议
   */
  private generateImprovementSuggestions(
    scores: Record<string, number>,
    questionType: keyof typeof SOCRATIC_QUESTION_TYPES,
    context: any
  ): string[] {
    const suggestions: string[] = [];

    if (scores['聚焦度'] < 3) {
      suggestions.push("问题聚焦度不足，建议拆分为单一目标的简单问题");
    }

    if (scores['逻辑性'] < 3) {
      suggestions.push("问题逻辑性有待提高，检查推理结构和因果关系");
    }

    if (scores['开放性'] < 3) {
      suggestions.push("问题开放性不足，避免使用'应该'、'必须'等预设性词汇");
    }

    if (scores['适切性'] < 3) {
      suggestions.push("问题难度与学生水平不匹配，需要调整复杂度");
    }

    // 根据问题类型给出特定建议
    const typeStandards = SOCRATIC_QUESTION_TYPES[questionType];
    if (typeStandards) {
      suggestions.push(`作为${typeStandards.name}，确保问题${typeStandards.purpose}`);
    }

    return suggestions;
  }

  /**
   * 批量评估问题序列的质量
   */
  assessQuestionSequence(
    questions: Array<{
      question: string;
      type: keyof typeof SOCRATIC_QUESTION_TYPES;
      layer: number;
    }>,
    context: any
  ): {
    averageQuality: number;
    sequenceCoherence: number;
    progressionLogic: number;
    recommendations: string[];
  } {
    // 评估每个问题
    const individualScores = questions.map(q =>
      this.assessQuestionQuality(q.question, q.type, { ...context, currentLayer: q.layer })
    );

    const averageQuality = individualScores.reduce((sum, score) => sum + score.overallScore, 0) / individualScores.length;

    // 评估序列连贯性（简化版）
    let sequenceCoherence = 5;
    for (let i = 1; i < questions.length; i++) {
      if (questions[i].layer < questions[i - 1].layer) {
        sequenceCoherence -= 1; // 逆序扣分
      }
    }

    // 评估递进逻辑
    const layerProgression = questions.map(q => q.layer);
    const hasProgression = layerProgression.some((layer, i) => i > 0 && layer > layerProgression[i - 1]);
    const progressionLogic = hasProgression ? 5 : 3;

    // 生成序列改进建议
    const recommendations: string[] = [];
    if (averageQuality < 3.5) {
      recommendations.push("整体问题质量需要提升，重点关注聚焦度和开放性");
    }
    if (sequenceCoherence < 4) {
      recommendations.push("问题序列缺乏连贯性，建议按照五层递进结构组织");
    }
    if (progressionLogic < 4) {
      recommendations.push("缺乏递进逻辑，建议从简单到复杂逐步深入");
    }

    return {
      averageQuality,
      sequenceCoherence,
      progressionLogic,
      recommendations
    };
  }
}

/**
 * 智能问题生成器
 * 根据对话上下文和质量标准生成高质量问题
 */
export class IntelligentQuestionGenerator {
  private qualityAssessor = new QuestionQualityAssessor();

  /**
   * 根据上下文生成优质问题
   */
  generateQuestion(
    context: {
      type: keyof typeof SOCRATIC_QUESTION_TYPES;
      concept?: string;
      claim?: string;
      topic?: string;
      studentLevel: 'basic' | 'intermediate' | 'advanced';
      currentLayer: number;
    },
    options: string[]
  ): {
    question: string;
    qualityScore: number;
    alternatives: string[];
  } {
    const questionType = SOCRATIC_QUESTION_TYPES[context.type];

    // 基于模板生成主问题
    let baseQuestion = questionType.structure.replace(
      /\[概念\]|\[前提\]|\[观点\]/g,
      context.concept || context.claim || '这个问题'
    );

    // 添加选项
    if (options.length > 0) {
      const optionsText = options.map((opt, i) =>
        `${String.fromCharCode(65 + i)}) ${opt}`
      ).join('\n');

      baseQuestion += `\n\n可能的思考方向：\n${optionsText}\n\n您觉得还有其他可能吗？`;
    }

    // 评估质量并生成替代方案
    const qualityResult = this.qualityAssessor.assessQuestionQuality(baseQuestion, context.type, context);

    // 如果质量不达标，尝试改进
    let finalQuestion = baseQuestion;
    if (qualityResult.qualityLevel === 'poor' || qualityResult.qualityLevel === 'acceptable') {
      finalQuestion = this.improveQuestion(baseQuestion, qualityResult.suggestions);
    }

    // 生成替代问题
    const alternatives = this.generateAlternativeQuestions(context, 2);

    return {
      question: finalQuestion,
      qualityScore: qualityResult.overallScore,
      alternatives
    };
  }

  /**
   * 根据建议改进问题
   */
  private improveQuestion(originalQuestion: string, suggestions: string[]): string {
    let improvedQuestion = originalQuestion;

    // 简单的改进逻辑
    suggestions.forEach(suggestion => {
      if (suggestion.includes('聚焦度')) {
        // 移除多余的并列结构
        improvedQuestion = improvedQuestion.replace(/和|与|以及|并且/g, '，重点考虑');
      }

      if (suggestion.includes('开放性')) {
        // 替换预设性词汇
        improvedQuestion = improvedQuestion
          .replace(/应该/g, '可能')
          .replace(/必须/g, '需要')
          .replace(/显然/g, '看起来')
          .replace(/当然/g, '也许');
      }
    });

    return improvedQuestion;
  }

  /**
   * 生成替代问题
   */
  private generateAlternativeQuestions(
    context: {
      type: keyof typeof SOCRATIC_QUESTION_TYPES;
      concept?: string;
      claim?: string;
      topic?: string;
    },
    count: number
  ): string[] {
    const questionType = SOCRATIC_QUESTION_TYPES[context.type];
    const alternatives: string[] = [];

    // 从例子中选择合适的替代问题
    for (let i = 0; i < Math.min(count, questionType.examples.length); i++) {
      let alternative = questionType.examples[i];

      // 根据上下文调整例子
      if (context.concept) {
        alternative = alternative.replace(/这个概念|该概念/g, context.concept);
      }
      if (context.claim) {
        alternative = alternative.replace(/这个观点|该观点/g, context.claim);
      }

      alternatives.push(alternative);
    }

    return alternatives;
  }
}

/**
 * 获取问题质量控制协议的完整提示词
 */
export function getQuestionQualityProtocolPrompt(): string {
  return `## 苏格拉底问题质量控制协议

### 四大问题类型标准
${Object.entries(SOCRATIC_QUESTION_TYPES).map(([key, type]) => `
**${type.name}**：${type.purpose}
- 标准结构：${type.structure}
- 触发条件：${type.triggers.join('、')}
- 质量标准：${type.qualityStandards.excellent}
- 典型例子：${type.examples[0]}
`).join('\n')}

### 问题质量四维评估
${QUALITY_DIMENSIONS.map(dim => `
**${dim.name}**（权重${(dim.weight * 100).toFixed(0)}%）：${dim.criteria}
`).join('')}

### 质量控制检查清单
在提出每个问题前，请自检：
- [ ] **单一焦点**：问题只针对一个认知目标
- [ ] **逻辑严密**：推理结构清晰，无内在矛盾
- [ ] **真正开放**：避免预设答案和引导性表述
- [ ] **难度适切**：匹配学生当前认知水平
- [ ] **类型匹配**：符合选定问题类型的标准结构

### 问题改进策略
- **聚焦不足**：拆分复合问题为单一问题
- **逻辑混乱**：梳理因果关系和推理链条
- **过度引导**：使用中性表达，增加开放选项
- **难度失衡**：调整术语复杂度和概念深度

记住：高质量的问题是苏格拉底教学成功的关键。每个问题都应该是精心设计的思维工具。`;
}

/**
 * 快速质量检查函数
 * 用于实时检验问题质量
 */
export function quickQualityCheck(question: string): {
  passed: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let score = 5;

  // 检查问题数量
  const questionCount = (question.match(/？|\?/g) || []).length;
  if (questionCount > 1) {
    issues.push("包含多个问题，违反单点聚焦原则");
    score -= 1;
  }

  // 检查引导性词汇
  const guidingWords = ['应该', '必须', '显然', '当然'];
  const hasGuiding = guidingWords.some(word => question.includes(word));
  if (hasGuiding) {
    issues.push("包含引导性词汇，可能预设答案");
    score -= 1;
  }

  // 检查是否过于简单
  if (question.length < 10) {
    issues.push("问题过于简单，缺乏思考深度");
    score -= 1;
  }

  // 检查是否过于复杂
  if (question.length > 200) {
    issues.push("问题过于复杂，可能造成认知负担");
    score -= 0.5;
  }

  return {
    passed: issues.length === 0,
    issues,
    score: Math.max(1, score)
  };
}