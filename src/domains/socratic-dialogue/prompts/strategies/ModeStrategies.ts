/**
 * 苏格拉底教学模式策略模块
 * 整合Domain层的四种教学模式与API层的三种响应模式
 * 提供灵活的教学模式切换和组合策略
 */

export interface TeachingMode {
  /** 模式名称 */
  name: string;

  /** 模式描述 */
  description: string;

  /** 核心目标 */
  coreObjectives: string[];

  /** 主要问题类型 */
  primaryQuestionTypes: string[];

  /** 问题类型配比 */
  questionRatio: Record<string, number>;

  /** 认知焦点 */
  cognitiveFocus: string;

  /** 适用场景 */
  applicableScenarios: string[];

  /** 成功指标 */
  successIndicators: string[];

  /** 典型问题示例 */
  exemplaryQuestions: string[];
}

/**
 * 四种核心教学模式策略
 * 保留Domain层的完整理论框架
 */
export const TEACHING_MODE_STRATEGIES: Record<string, TeachingMode> = {
  exploration: {
    name: "探索模式 (Exploration)",
    description: "通过澄清型和假设型问题激发思考，发现问题的复杂性，鼓励学生广泛思考和开放性探索",
    coreObjectives: [
      "激发学生的好奇心和探索欲",
      "发现问题的多面性和复杂性",
      "建立开放性思维习惯",
      "培养质疑和批判精神"
    ],
    primaryQuestionTypes: ["clarification", "assumption"],
    questionRatio: {
      clarification: 0.6,
      assumption: 0.4,
      evidence: 0.0,
      implication: 0.0
    },
    cognitiveFocus: "概念理解和前提识别，启发性思维训练",
    applicableScenarios: [
      "初次接触新概念或新问题",
      "学生思维固化需要突破",
      "复杂问题需要多角度思考",
      "创新性讨论和头脑风暴"
    ],
    successIndicators: [
      "学生能够提出多种可能性",
      "显示出对问题复杂性的认识",
      "主动质疑和探索",
      "思维的灵活性和开放性增强"
    ],
    exemplaryQuestions: [
      "您说这个判决'不公正'，能具体说明'公正'的标准是什么吗？",
      "除了这种理解方式，还有其他可能的解释吗？",
      "这个概念在不同情境下是否有不同含义？",
      "您的观点基于哪些假设？这些假设都合理吗？"
    ]
  },

  analysis: {
    name: "分析模式 (Analysis)",
    description: "通过证据型问题深入分析事实和规则的适用，培养系统性分析能力和细致的推理技能",
    coreObjectives: [
      "培养系统性分析能力",
      "训练证据评估和逻辑推理",
      "掌握法条适用方法",
      "形成严谨的法律思维"
    ],
    primaryQuestionTypes: ["evidence", "clarification"],
    questionRatio: {
      evidence: 0.7,
      clarification: 0.3,
      assumption: 0.0,
      implication: 0.0
    },
    cognitiveFocus: "事实认定和规则适用，分析性思维训练",
    applicableScenarios: [
      "案例事实需要深入梳理",
      "法条适用需要精确分析",
      "证据评估和论证构建",
      "复杂法律关系的厘清"
    ],
    successIndicators: [
      "能够系统梳理案例事实",
      "准确识别和适用法条",
      "构建完整的论证链条",
      "展现逻辑推理能力"
    ],
    exemplaryQuestions: [
      "您认为构成要件已满足，支持这个判断的具体证据是什么？",
      "这个法条的适用条件在本案中如何体现？",
      "您的推理过程中哪些环节最关键？",
      "有没有反向证据需要考虑？"
    ]
  },

  synthesis: {
    name: "综合模式 (Synthesis)",
    description: "通过推演型问题整合不同观点，构建完整理解，培养系统整合和关联思考能力",
    coreObjectives: [
      "整合多元观点和信息",
      "构建系统性理解框架",
      "培养关联思考能力",
      "形成完整的知识体系"
    ],
    primaryQuestionTypes: ["implication", "assumption"],
    questionRatio: {
      implication: 0.6,
      assumption: 0.4,
      clarification: 0.0,
      evidence: 0.0
    },
    cognitiveFocus: "系统整合和关联思考，综合性思维训练",
    applicableScenarios: [
      "多个观点需要整合",
      "知识点需要系统梳理",
      "理论与实践需要结合",
      "形成完整认知框架"
    ],
    successIndicators: [
      "能够有效整合不同观点",
      "构建清晰的知识框架",
      "发现概念间的内在联系",
      "形成系统性理解"
    ],
    exemplaryQuestions: [
      "如果同时适用这两个法律原则，会产生什么样的法律后果？",
      "这些不同的观点之间有什么共同点？",
      "如何将理论分析与实际案例结合起来？",
      "这个结论对整个法律体系有什么意义？"
    ]
  },

  evaluation: {
    name: "评估模式 (Evaluation)",
    description: "综合运用四类问题，进行批判性评价和价值判断，培养独立判断和决策能力",
    coreObjectives: [
      "培养批判性思维能力",
      "训练价值判断和权衡",
      "发展独立思考能力",
      "形成成熟的判断标准"
    ],
    primaryQuestionTypes: ["implication", "evidence", "assumption", "clarification"],
    questionRatio: {
      implication: 0.4,
      evidence: 0.3,
      assumption: 0.2,
      clarification: 0.1
    },
    cognitiveFocus: "批判评价和价值平衡，评判性思维训练",
    applicableScenarios: [
      "需要做出价值判断",
      "评估不同方案优劣",
      "处理价值冲突问题",
      "形成独立见解"
    ],
    successIndicators: [
      "能够进行深入的批判分析",
      "具备成熟的价值判断能力",
      "能够权衡不同利益和观点",
      "形成有根据的独立见解"
    ],
    exemplaryQuestions: [
      "这个解释方案的长远后果是什么？有没有更好的替代方案？",
      "在效率与公平之间，您认为应该如何平衡？",
      "这个判决体现了什么样的价值取向？您如何评价？",
      "从社会整体利益考虑，这个做法是否妥当？"
    ]
  }
};

/**
 * API层响应模式映射
 * 将API层的三种模式映射到Domain层的四种模式
 */
export const API_MODE_MAPPING = {
  response: {
    domainMode: 'analysis',
    description: '回应学生问题，主要使用分析模式深入解析',
    adaptations: [
      '更注重具体问题的分析解答',
      '增加证据型问题的比重',
      '提供结构化的分析框架'
    ]
  },
  suggestions: {
    domainMode: 'exploration',
    description: '为教学场景提供建议，主要使用探索模式激发思考',
    adaptations: [
      '更注重问题的发现和提出',
      '增加澄清型和假设型问题',
      '鼓励多角度思考和创新'
    ]
  },
  analysis: {
    domainMode: 'evaluation',
    description: '深入分析问题，使用评估模式进行综合判断',
    adaptations: [
      '综合运用各类问题类型',
      '注重批判性分析和价值判断',
      '提供深层次的思维指导'
    ]
  }
};

/**
 * 教学模式执行器
 */
export class TeachingModeExecutor {
  private currentMode: keyof typeof TEACHING_MODE_STRATEGIES = 'exploration';
  private modeHistory: Array<{
    mode: string;
    duration: number;
    effectiveness: number;
    timestamp: Date;
  }> = [];

  /**
   * 获取当前教学模式策略
   */
  getCurrentModeStrategy(): TeachingMode {
    return TEACHING_MODE_STRATEGIES[this.currentMode];
  }

  /**
   * 根据教学目标和学生状态选择最佳模式
   */
  selectOptimalMode(context: {
    teachingGoal: 'concept_learning' | 'skill_development' | 'critical_thinking' | 'knowledge_integration';
    studentState: {
      understanding: 'confused' | 'partial' | 'clear' | 'advanced';
      engagement: 'passive' | 'active' | 'enthusiastic';
      complexity_handling: 'simple' | 'moderate' | 'complex';
    };
    content: {
      type: 'new_concept' | 'case_analysis' | 'theory_application' | 'value_judgment';
      complexity: 'basic' | 'intermediate' | 'advanced';
    };
  }): keyof typeof TEACHING_MODE_STRATEGIES {

    // 基于教学目标的模式选择
    if (context.teachingGoal === 'concept_learning' && context.studentState.understanding === 'confused') {
      return 'exploration';
    }

    if (context.teachingGoal === 'skill_development' && context.content.type === 'case_analysis') {
      return 'analysis';
    }

    if (context.teachingGoal === 'knowledge_integration' && context.studentState.understanding === 'clear') {
      return 'synthesis';
    }

    if (context.teachingGoal === 'critical_thinking' && context.studentState.complexity_handling === 'complex') {
      return 'evaluation';
    }

    // 默认基于内容类型选择
    const contentModeMap: Record<string, keyof typeof TEACHING_MODE_STRATEGIES> = {
      new_concept: 'exploration',
      case_analysis: 'analysis',
      theory_application: 'synthesis',
      value_judgment: 'evaluation'
    };

    return contentModeMap[context.content.type] || 'exploration';
  }

  /**
   * 模式动态切换
   */
  switchMode(
    newMode: keyof typeof TEACHING_MODE_STRATEGIES,
    reason: string
  ): {
    success: boolean;
    transition: string;
    adjustments: string[];
  } {
    const oldMode = this.currentMode;
    const oldStrategy = TEACHING_MODE_STRATEGIES[oldMode];
    const newStrategy = TEACHING_MODE_STRATEGIES[newMode];

    // 记录模式历史
    this.modeHistory.push({
      mode: oldMode,
      duration: Date.now(), // 简化处理
      effectiveness: 0.8, // 默认效果评估
      timestamp: new Date()
    });

    this.currentMode = newMode;

    // 生成过渡策略
    const transition = `从${oldStrategy.name}切换到${newStrategy.name}：${reason}`;

    // 生成调整建议
    const adjustments = [
      `调整问题类型重点：从[${oldStrategy.primaryQuestionTypes.join(', ')}]转向[${newStrategy.primaryQuestionTypes.join(', ')}]`,
      `改变认知焦点：从"${oldStrategy.cognitiveFocus}"转向"${newStrategy.cognitiveFocus}"`,
      `适应新的成功指标：${newStrategy.successIndicators[0]}`
    ];

    return {
      success: true,
      transition,
      adjustments
    };
  }

  /**
   * 混合模式策略
   * 根据具体需要组合不同模式的优势
   */
  createHybridStrategy(
    primaryMode: keyof typeof TEACHING_MODE_STRATEGIES,
    secondaryMode: keyof typeof TEACHING_MODE_STRATEGIES,
    ratio: number = 0.7
  ): {
    name: string;
    questionRatio: Record<string, number>;
    cognitiveFocus: string;
    hybridObjectives: string[];
  } {
    const primary = TEACHING_MODE_STRATEGIES[primaryMode];
    const secondary = TEACHING_MODE_STRATEGIES[secondaryMode];

    // 混合问题类型配比
    const hybridRatio: Record<string, number> = {};
    Object.keys(primary.questionRatio).forEach(type => {
      hybridRatio[type] =
        (primary.questionRatio[type] * ratio) +
        (secondary.questionRatio[type] * (1 - ratio));
    });

    return {
      name: `混合模式：${primary.name} + ${secondary.name}`,
      questionRatio: hybridRatio,
      cognitiveFocus: `${primary.cognitiveFocus} 结合 ${secondary.cognitiveFocus}`,
      hybridObjectives: [
        ...primary.coreObjectives.slice(0, 2),
        ...secondary.coreObjectives.slice(0, 2)
      ]
    };
  }

  /**
   * 模式效果评估
   */
  evaluateModeEffectiveness(
    dialogueData: {
      questionsAsked: Array<{
        type: string;
        studentResponse: string;
        engagement: number;
        understanding: number;
      }>;
      overallProgress: number;
    }
  ): {
    effectivenessScore: number;
    strengths: string[];
    improvements: string[];
    recommendedAdjustments: string[];
  } {
    const currentStrategy = this.getCurrentModeStrategy();
    let effectivenessScore = 0;
    const strengths: string[] = [];
    const improvements: string[] = [];
    const recommendedAdjustments: string[] = [];

    // 评估问题类型匹配度
    const expectedTypes = currentStrategy.primaryQuestionTypes;
    const actualTypes = dialogueData.questionsAsked.map(q => q.type);
    const typeMatchRate = expectedTypes.filter(type =>
      actualTypes.includes(type)
    ).length / expectedTypes.length;

    effectivenessScore += typeMatchRate * 0.3;

    if (typeMatchRate > 0.8) {
      strengths.push("问题类型与模式策略高度匹配");
    } else {
      improvements.push("问题类型与预期策略存在偏差");
      recommendedAdjustments.push(`增加${expectedTypes.join('和')}类型的问题`);
    }

    // 评估学生参与度
    const avgEngagement = dialogueData.questionsAsked.reduce((sum, q) => sum + q.engagement, 0) / dialogueData.questionsAsked.length;
    effectivenessScore += (avgEngagement / 5) * 0.4; // 假设满分5分

    if (avgEngagement > 4) {
      strengths.push("学生参与度高，模式策略有效");
    } else if (avgEngagement < 3) {
      improvements.push("学生参与度不足");
      recommendedAdjustments.push("考虑切换到更具吸引力的教学模式");
    }

    // 评估理解程度
    const avgUnderstanding = dialogueData.questionsAsked.reduce((sum, q) => sum + q.understanding, 0) / dialogueData.questionsAsked.length;
    effectivenessScore += (avgUnderstanding / 5) * 0.3;

    if (avgUnderstanding > 4) {
      strengths.push("学生理解程度高，认知目标达成");
    } else if (avgUnderstanding < 3) {
      improvements.push("学生理解程度有待提高");
      recommendedAdjustments.push("增加澄清型问题，确保概念理解");
    }

    return {
      effectivenessScore: Math.min(effectivenessScore, 1),
      strengths,
      improvements,
      recommendedAdjustments
    };
  }

  /**
   * 获取模式历史和趋势分析
   */
  getModeAnalysis(): {
    mostUsedMode: string;
    averageEffectiveness: number;
    switchingPattern: string[];
    recommendations: string[];
  } {
    if (this.modeHistory.length === 0) {
      return {
        mostUsedMode: this.currentMode,
        averageEffectiveness: 0,
        switchingPattern: [],
        recommendations: ["开始记录模式使用情况以获得更好的分析"]
      };
    }

    // 统计最常用模式
    const modeCount: Record<string, number> = {};
    this.modeHistory.forEach(record => {
      modeCount[record.mode] = (modeCount[record.mode] || 0) + 1;
    });

    const mostUsedMode = Object.keys(modeCount).reduce((a, b) =>
      modeCount[a] > modeCount[b] ? a : b
    );

    // 计算平均效果
    const averageEffectiveness = this.modeHistory.reduce((sum, record) =>
      sum + record.effectiveness, 0
    ) / this.modeHistory.length;

    // 分析切换模式
    const switchingPattern = this.modeHistory.slice(-5).map(record => record.mode);

    // 生成建议
    const recommendations: string[] = [];
    if (averageEffectiveness < 0.6) {
      recommendations.push("整体教学模式效果偏低，建议分析学生特点调整策略");
    }
    if (switchingPattern.length > 3 && new Set(switchingPattern).size === switchingPattern.length) {
      recommendations.push("模式切换频繁，建议保持相对稳定的策略");
    }

    return {
      mostUsedMode,
      averageEffectiveness,
      switchingPattern,
      recommendations
    };
  }
}

/**
 * 获取教学模式策略的完整提示词
 */
export function getTeachingModeStrategiesPrompt(
  currentMode: keyof typeof TEACHING_MODE_STRATEGIES,
  apiMode?: 'response' | 'suggestions' | 'analysis'
): string {
  const strategy = TEACHING_MODE_STRATEGIES[currentMode];
  let prompt = `## 当前教学模式：${strategy.name}

**模式描述**：${strategy.description}

**核心目标**：
${strategy.coreObjectives.map(obj => `- ${obj}`).join('\n')}

**主要问题类型**：${strategy.primaryQuestionTypes.join('、')}

**问题类型配比**：
${Object.entries(strategy.questionRatio)
  .filter(([_, ratio]) => ratio > 0)
  .map(([type, ratio]) => `- ${type}: ${(ratio * 100).toFixed(0)}%`)
  .join('\n')}

**认知焦点**：${strategy.cognitiveFocus}

**适用场景**：
${strategy.applicableScenarios.map(scenario => `- ${scenario}`).join('\n')}

**成功指标**：
${strategy.successIndicators.map(indicator => `✓ ${indicator}`).join('\n')}

**典型问题示例**：
${strategy.exemplaryQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;

  // 如果有API模式映射，添加相关说明
  if (apiMode && API_MODE_MAPPING[apiMode]) {
    const mapping = API_MODE_MAPPING[apiMode];
    prompt += `\n\n**API模式适配**：当前为 ${apiMode} 模式，${mapping.description}

**特殊适配要求**：
${mapping.adaptations.map(adaptation => `- ${adaptation}`).join('\n')}`;
  }

  return prompt;
}

/**
 * 智能模式推荐器
 * 基于对话历史和学生表现推荐最佳教学模式
 */
export function recommendTeachingMode(
  context: {
    dialogueHistory: Array<{
      question: string;
      studentResponse: string;
      engagement: 'low' | 'medium' | 'high';
      understanding: 'poor' | 'fair' | 'good';
    }>;
    currentTopic: string;
    studentLevel: 'basic' | 'intermediate' | 'advanced';
    sessionGoal: 'learning' | 'practice' | 'assessment';
  }
): {
  recommendedMode: keyof typeof TEACHING_MODE_STRATEGIES;
  confidence: number;
  reasoning: string;
  specificStrategies: string[];
} {
  // 分析对话历史
  const recentResponses = context.dialogueHistory.slice(-3);
  const avgEngagement = recentResponses.length > 0
    ? recentResponses.reduce((sum, r) => sum + (r.engagement === 'high' ? 3 : r.engagement === 'medium' ? 2 : 1), 0) / recentResponses.length
    : 2;

  const avgUnderstanding = recentResponses.length > 0
    ? recentResponses.reduce((sum, r) => sum + (r.understanding === 'good' ? 3 : r.understanding === 'fair' ? 2 : 1), 0) / recentResponses.length
    : 2;

  let recommendedMode: keyof typeof TEACHING_MODE_STRATEGIES = 'exploration';
  let confidence = 0.7;
  let reasoning = "基于默认策略";
  let specificStrategies: string[] = [];

  // 基于参与度和理解程度推荐
  if (avgUnderstanding < 1.5) {
    // 理解困难，使用探索模式
    recommendedMode = 'exploration';
    confidence = 0.8;
    reasoning = "学生理解困难，需要通过探索模式澄清基础概念";
    specificStrategies = [
      "多使用澄清型问题",
      "降低问题复杂度",
      "增加具体例子",
      "鼓励开放性思考"
    ];
  } else if (avgUnderstanding > 2.5 && avgEngagement > 2.5) {
    // 理解好且参与度高，使用评估模式
    recommendedMode = 'evaluation';
    confidence = 0.9;
    reasoning = "学生理解程度和参与度都很高，可以进行批判性思维训练";
    specificStrategies = [
      "增加推演型问题",
      "鼓励价值判断",
      "探讨边界情况",
      "培养独立见解"
    ];
  } else if (context.sessionGoal === 'practice') {
    // 实践目标，使用分析模式
    recommendedMode = 'analysis';
    confidence = 0.8;
    reasoning = "会话目标为实践训练，适合使用分析模式";
    specificStrategies = [
      "重点使用证据型问题",
      "训练案例分析能力",
      "强化逻辑推理",
      "提供结构化指导"
    ];
  } else if (recentResponses.length > 0 && recentResponses.every(r => r.understanding === 'fair')) {
    // 理解中等，需要整合
    recommendedMode = 'synthesis';
    confidence = 0.7;
    reasoning = "学生理解程度中等，需要整合已有知识形成系统认识";
    specificStrategies = [
      "使用综合型问题",
      "整合不同观点",
      "构建知识框架",
      "强化关联思考"
    ];
  }

  return {
    recommendedMode,
    confidence,
    reasoning,
    specificStrategies
  };
}