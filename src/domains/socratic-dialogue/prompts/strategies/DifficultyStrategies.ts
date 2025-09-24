/**
 * 苏格拉底教学难度策略模块
 * 整合Domain层的三级难度系统与API层的水平描述
 * 提供适应性教学策略和动态难度调节
 */

export interface DifficultyLevel {
  /** 难度等级名称 */
  name: string;

  /** 学生特征描述 */
  studentCharacteristics: string;

  /** 教学重点 */
  teachingFocus: string[];

  /** 问题复杂度要求 */
  questionComplexity: string;

  /** 语言风格要求 */
  languageStyle: string;

  /** 概念处理方式 */
  conceptHandling: string;

  /** 案例选择标准 */
  caseSelectionCriteria: string[];

  /** 反馈频率和深度 */
  feedbackStrategy: string;

  /** 进阶条件 */
  advancementCriteria: string[];
}

/**
 * 三级难度策略配置
 * 融合原有的EASY/MEDIUM/HARD与API层的basic/intermediate/advanced
 */
export const DIFFICULTY_STRATEGIES: Record<string, DifficultyLevel> = {
  basic: {
    name: "基础水平（观察层-事实层）",
    studentCharacteristics: "法学初学者，需要引导观察案例细节，识别基本事实，理清时间线和因果关系",
    teachingFocus: [
      "基本事实认定",
      "简单法律概念理解",
      "常见法律关系识别",
      "时间顺序梳理",
      "因果关系理解"
    ],
    questionComplexity: "简单直接，重点关注具体事实和基本概念，避免复杂的法理分析",
    languageStyle: "用词简单明了，多举生活化例子，充分解释法律术语，语速适中",
    conceptHandling: "一个概念一个概念地解释，提供具体例子和类比，反复确认理解",
    caseSelectionCriteria: [
      "事实清晰简单的案例",
      "涉及常见法律关系",
      "争议点相对明确",
      "贴近生活实际的情况"
    ],
    feedbackStrategy: "高频率正面反馈，及时纠错，多鼓励思考过程而非仅仅结果",
    advancementCriteria: [
      "能准确识别案例基本事实",
      "理解常用法律术语含义",
      "能简单描述法律关系",
      "显示出逻辑思维的萌芽"
    ]
  },

  intermediate: {
    name: "中等水平（分析层-应用层）",
    studentCharacteristics: "具备一定法学基础，能够进行法律关系分析、权利义务梳理，开始应用具体法条进行推理",
    teachingFocus: [
      "法律关系深度分析",
      "权利义务准确梳理",
      "法条适用能力培养",
      "简单推理应用",
      "多角度思考训练"
    ],
    questionComplexity: "适度复杂，涉及多个概念的关联分析和法条适用，需要一定的推理能力",
    languageStyle: "使用适量法律专业术语，语言严谨但仍需适当解释，注重逻辑表达",
    conceptHandling: "可以同时处理相关概念，引导概念间的区别和联系，强调体系性理解",
    caseSelectionCriteria: [
      "具有一定复杂度的案例",
      "涉及多个法律关系",
      "需要综合多个法条",
      "具有一定争议性的问题"
    ],
    feedbackStrategy: "适度反馈，重点指出分析的优缺点，鼓励深度思考和多元化视角",
    advancementCriteria: [
      "能系统分析法律关系",
      "准确适用相关法条",
      "展现一定的推理能力",
      "能从多个角度分析问题"
    ]
  },

  advanced: {
    name: "高级水平（价值层）",
    studentCharacteristics: "法学功底扎实，能够进行深度的价值判断、利益平衡考量，思考法律背后的公平正义问题",
    teachingFocus: [
      "复杂法理分析",
      "价值判断权衡",
      "利益平衡考量",
      "边界案例讨论",
      "法律政策思考",
      "国际比较视野"
    ],
    questionComplexity: "高度复杂，涉及深层次的法理思辨、价值冲突和政策考量，需要批判性思维",
    languageStyle: "使用专业法律术语，语言精确严谨，期待深度和创新性的思考表达",
    conceptHandling: "处理抽象概念和复杂理论，引导概念的深层含义和哲学思辨",
    caseSelectionCriteria: [
      "具有理论深度的复杂案例",
      "涉及价值冲突的疑难问题",
      "需要政策考量的边界案例",
      "具有前沿性和挑战性的问题"
    ],
    feedbackStrategy: "深度反馈，挑战性评价，鼓励批判质疑和创新思维，追求思维的深度和广度",
    advancementCriteria: [
      "能进行深层次法理分析",
      "具备成熟的价值判断能力",
      "能处理复杂的利益冲突",
      "展现出创新思维和批判精神"
    ]
  }
};

/**
 * 难度动态调节策略
 */
export interface AdaptiveStrategy {
  /** 触发条件 */
  trigger: string;

  /** 调节方向 */
  direction: 'increase' | 'decrease' | 'maintain';

  /** 调节幅度 */
  intensity: 'slight' | 'moderate' | 'significant';

  /** 具体调节措施 */
  adjustmentMeasures: string[];
}

/**
 * 基于学生表现的难度自适应调节规则
 */
export const ADAPTIVE_ADJUSTMENT_RULES: AdaptiveStrategy[] = [
  {
    trigger: "学生回答过于简单，缺乏深度思考",
    direction: "increase",
    intensity: "moderate",
    adjustmentMeasures: [
      "提出更具挑战性的问题",
      "引入复杂概念或多重关系",
      "要求更高层次的分析",
      "鼓励批判性思考"
    ]
  },
  {
    trigger: "学生明显跟不上，表现困惑",
    direction: "decrease",
    intensity: "moderate",
    adjustmentMeasures: [
      "回到更基础的概念",
      "简化问题表达",
      "提供更多解释和例子",
      "降低推理复杂度"
    ]
  },
  {
    trigger: "学生积极参与，理解准确深入",
    direction: "increase",
    intensity: "slight",
    adjustmentMeasures: [
      "逐步增加问题深度",
      "引入边界案例讨论",
      "鼓励创新观点表达",
      "增加开放性探索"
    ]
  },
  {
    trigger: "学生回答正确但缺乏信心",
    direction: "maintain",
    intensity: "slight",
    adjustmentMeasures: [
      "给予更多正面反馈",
      "确认学生理解的正确性",
      "逐步增强难度以建立信心",
      "鼓励深入表达观点"
    ]
  },
  {
    trigger: "学生出现明显错误理解",
    direction: "decrease",
    intensity: "significant",
    adjustmentMeasures: [
      "立即进行概念澄清",
      "回到基础原理讲解",
      "通过具体例子重新说明",
      "确认理解后再推进"
    ]
  }
];

/**
 * 难度策略执行器
 */
export class DifficultyStrategyExecutor {
  private currentLevel: keyof typeof DIFFICULTY_STRATEGIES = 'intermediate';
  private adjustmentHistory: Array<{
    timestamp: Date;
    fromLevel: string;
    toLevel: string;
    reason: string;
  }> = [];

  /**
   * 获取当前难度策略
   */
  getCurrentStrategy(): DifficultyLevel {
    return DIFFICULTY_STRATEGIES[this.currentLevel];
  }

  /**
   * 根据学生表现动态调整难度
   */
  adjustDifficulty(
    studentPerformance: {
      comprehension: 'poor' | 'fair' | 'good' | 'excellent';
      engagement: 'passive' | 'active' | 'enthusiastic';
      accuracy: 'low' | 'medium' | 'high';
      depth: 'shallow' | 'moderate' | 'deep';
    }
  ): {
    newLevel: keyof typeof DIFFICULTY_STRATEGIES;
    adjustmentReason: string;
    specificMeasures: string[];
  } {
    const currentStrategy = this.getCurrentStrategy();
    let newLevel = this.currentLevel;
    let adjustmentReason = "维持当前难度";
    let specificMeasures: string[] = [];

    // 判断是否需要降低难度
    if (studentPerformance.comprehension === 'poor' || studentPerformance.accuracy === 'low') {
      if (this.currentLevel === 'advanced') {
        newLevel = 'intermediate';
      } else if (this.currentLevel === 'intermediate') {
        newLevel = 'basic';
      }
      adjustmentReason = "理解困难，降低难度";
      specificMeasures = [
        "简化问题表达",
        "增加基础概念解释",
        "提供更多具体例子",
        "降低推理要求"
      ];
    }
    // 判断是否需要提高难度
    else if (
      studentPerformance.comprehension === 'excellent' &&
      studentPerformance.engagement === 'enthusiastic' &&
      studentPerformance.depth === 'deep'
    ) {
      if (this.currentLevel === 'basic') {
        newLevel = 'intermediate';
      } else if (this.currentLevel === 'intermediate') {
        newLevel = 'advanced';
      }
      adjustmentReason = "表现优秀，提高难度";
      specificMeasures = [
        "引入更复杂概念",
        "增加思维挑战",
        "鼓励批判性分析",
        "探讨边界问题"
      ];
    }

    // 记录调整历史
    if (newLevel !== this.currentLevel) {
      this.adjustmentHistory.push({
        timestamp: new Date(),
        fromLevel: this.currentLevel,
        toLevel: newLevel,
        reason: adjustmentReason
      });
      this.currentLevel = newLevel;
    }

    return {
      newLevel,
      adjustmentReason,
      specificMeasures
    };
  }

  /**
   * 获取适合当前难度的问题模板
   */
  getQuestionTemplate(
    questionType: 'clarification' | 'assumption' | 'evidence' | 'implication',
    context: {
      concept?: string;
      claim?: string;
      topic?: string;
    }
  ): string {
    const strategy = this.getCurrentStrategy();

    const templates = {
      basic: {
        clarification: `您刚才提到"${context.concept || '[概念]'}"，能简单说说这是什么意思吗？`,
        assumption: `您这样想是不是因为觉得"${context.claim || '[观点]'}"？`,
        evidence: `您能举个例子来说明"${context.claim || '[观点]'}"吗？`,
        implication: `如果"${context.claim || '[观点]'}"是对的，会怎么样呢？`
      },
      intermediate: {
        clarification: `您所说的"${context.concept || '[概念]'}"在法律上的准确含义是什么？与相关概念有何区别？`,
        assumption: `您的分析是否基于"${context.claim || '[观点]'}"这一假设？这个假设在法律实践中是否成立？`,
        evidence: `支持"${context.claim || '[观点]'}"的法律依据和事实证据是什么？证据链条是否完整？`,
        implication: `如果采纳"${context.claim || '[观点]'}"，对类似案例的处理会产生什么影响？`
      },
      advanced: {
        clarification: `"${context.concept || '[概念]'}"这一概念的理论内涵与外延边界如何界定？在不同法理学派中是否存在争议？`,
        assumption: `您的论证隐含了哪些价值预设？这些预设与我国法治理念的契合度如何？`,
        evidence: `"${context.claim || '[观点]'}"在实证层面的支撑如何？是否考虑了反向证据和边界情况？`,
        implication: `该观点的法理逻辑延伸会带来怎样的制度后果？对法律体系的一致性有何影响？`
      }
    };

    return templates[this.currentLevel][questionType];
  }

  /**
   * 获取调整历史和趋势分析
   */
  getAdjustmentAnalysis(): {
    totalAdjustments: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    suggestions: string[];
  } {
    const recentAdjustments = this.adjustmentHistory.slice(-5);
    const totalAdjustments = this.adjustmentHistory.length;

    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    const suggestions: string[] = [];

    if (recentAdjustments.length >= 3) {
      const levelOrder = { basic: 1, intermediate: 2, advanced: 3 };
      const recentLevels = recentAdjustments.map(adj => levelOrder[adj.toLevel as keyof typeof levelOrder]);

      if (recentLevels.every((level, i) => i === 0 || level >= recentLevels[i - 1])) {
        trendDirection = 'increasing';
        suggestions.push("学生能力在稳步提升，可以考虑适度增加挑战");
      } else if (recentLevels.every((level, i) => i === 0 || level <= recentLevels[i - 1])) {
        trendDirection = 'decreasing';
        suggestions.push("注意学生理解困难，可能需要加强基础概念讲解");
      }
    }

    if (totalAdjustments > 10) {
      suggestions.push("调整频率较高，建议分析学生的具体学习特点，制定更稳定的教学策略");
    }

    return {
      totalAdjustments,
      trendDirection,
      suggestions
    };
  }
}

/**
 * 获取难度策略的完整提示词
 */
export function getDifficultyStrategiesPrompt(currentLevel: keyof typeof DIFFICULTY_STRATEGIES): string {
  const strategy = DIFFICULTY_STRATEGIES[currentLevel];

  return `## 当前教学难度策略：${strategy.name}

**学生特征**：${strategy.studentCharacteristics}

**教学重点**：
${strategy.teachingFocus.map(focus => `- ${focus}`).join('\n')}

**问题复杂度要求**：${strategy.questionComplexity}

**语言风格要求**：${strategy.languageStyle}

**概念处理方式**：${strategy.conceptHandling}

**案例选择标准**：
${strategy.caseSelectionCriteria.map(criteria => `- ${criteria}`).join('\n')}

**反馈策略**：${strategy.feedbackStrategy}

**进阶评估标准**：
${strategy.advancementCriteria.map(criteria => `- ${criteria}`).join('\n')}

## 难度自适应调节

根据学生表现动态调整：
- **理解困难**：降低复杂度，增加解释和例子
- **轻松胜任**：适度提高挑战，深化思考要求
- **积极参与**：保持或略微增加难度
- **消极应对**：简化问题，增强鼓励

记住：难度调节的目标是让学生在"最近发展区"内进行有效学习，既有挑战性又不会超出能力范围。`;
}

/**
 * 快速难度评估函数
 * 根据学生回答快速判断当前难度是否合适
 */
export function quickDifficultyAssessment(
  studentResponse: string,
  currentLevel: keyof typeof DIFFICULTY_STRATEGIES
): {
  isAppropriate: boolean;
  suggestedAdjustment: 'increase' | 'decrease' | 'maintain';
  confidence: number;
} {
  // 简化版评估逻辑
  const responseLength = studentResponse.length;
  const legalTerms = ['法条', '条款', '规定', '判例', '法理', '原则', '权利', '义务'].filter(term =>
    studentResponse.includes(term)
  ).length;

  const reasoning = ['因为', '所以', '由于', '因此', '如果', '那么'].filter(word =>
    studentResponse.includes(word)
  ).length;

  let suggestedAdjustment: 'increase' | 'decrease' | 'maintain' = 'maintain';
  let isAppropriate = true;
  let confidence = 0.7;

  // 根据当前难度和回答特征判断
  if (currentLevel === 'basic') {
    if (responseLength > 100 && legalTerms >= 3 && reasoning >= 2) {
      suggestedAdjustment = 'increase';
      confidence = 0.8;
    } else if (responseLength < 30 && legalTerms === 0) {
      isAppropriate = false;
      confidence = 0.6;
    }
  } else if (currentLevel === 'intermediate') {
    if (responseLength > 200 && legalTerms >= 5 && reasoning >= 3) {
      suggestedAdjustment = 'increase';
      confidence = 0.8;
    } else if (responseLength < 50 && legalTerms <= 1) {
      suggestedAdjustment = 'decrease';
      isAppropriate = false;
      confidence = 0.7;
    }
  } else if (currentLevel === 'advanced') {
    if (responseLength < 80 && legalTerms <= 2 && reasoning <= 1) {
      suggestedAdjustment = 'decrease';
      isAppropriate = false;
      confidence = 0.8;
    }
  }

  return {
    isAppropriate,
    suggestedAdjustment,
    confidence
  };
}