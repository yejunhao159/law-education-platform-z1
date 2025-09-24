/**
 * ISSUE协作范式执行协议
 * 定义苏格拉底式教学的具体执行流程和方法
 * 整合原有的方法论与实际教学需求
 */

export interface ISSUEPhase {
  /** 阶段名称 */
  name: string;

  /** 阶段目标 */
  objective: string;

  /** 执行步骤 */
  steps: string[];

  /** 成功指标 */
  successIndicators: string[];

  /** 常见问题处理 */
  troubleshooting: Record<string, string>;
}

/**
 * ISSUE协作范式的五个执行阶段
 * 每个阶段都有明确的目标和执行标准
 */
export const ISSUE_PROTOCOL_PHASES: Record<string, ISSUEPhase> = {
  initiate: {
    name: "Initiate - 议题确立阶段",
    objective: "明确法学议题，建立对话焦点，避免模糊讨论",
    steps: [
      "识别或提出具体的法学问题",
      "确保议题表述清晰明确",
      "验证议题的法学价值和教学意义",
      "与学生确认对议题的理解",
      "排除无关或次要问题的干扰"
    ],
    successIndicators: [
      "学生能清晰复述议题内容",
      "议题具有明确的法学边界",
      "后续讨论能围绕该议题展开",
      "议题的复杂度适合当前教学水平"
    ],
    troubleshooting: {
      "议题过于宽泛": "将大议题拆分为具体的子问题，逐一讨论",
      "议题表述模糊": "使用更具体的法律术语，提供背景信息",
      "学生理解偏差": "通过例子和类比帮助学生理解议题核心",
      "议题缺乏价值": "重新审视议题的法学意义，必要时调整方向"
    }
  },

  structure: {
    name: "Structure - 框架建议阶段",
    objective: "提供分析框架，指导学生结构化思考",
    steps: [
      "根据议题特点选择合适的分析框架",
      "向学生展示3-5个可选的框架类型",
      "解释每种框架的分析路径和优势",
      "让学生自主选择或提出其他框架",
      "确认选定框架的具体执行方式"
    ],
    successIndicators: [
      "学生理解不同框架的差异",
      "选择的框架适合当前议题",
      "学生能够按照框架进行思考",
      "框架为后续分析提供清晰路径"
    ],
    troubleshooting: {
      "学生难以选择": "提供更具体的框架说明和适用场景",
      "框架过于复杂": "简化框架结构，突出核心分析步骤",
      "框架不适用": "及时调整，提供更合适的替代方案",
      "学生提出新框架": "积极评估，必要时整合或采纳"
    }
  },

  socratic: {
    name: "Socratic - 友好探索阶段",
    objective: "通过Advice Socratic模式深度探索，促进批判性思考",
    steps: [
      "按照五层递进结构逐步深入",
      "每次只提出一个核心问题",
      "为每个问题提供3-5个思考选项",
      "保持开放性，允许其他可能性",
      "根据学生回答灵活调整方向",
      "使用友好语调营造安全环境",
      "在每层结束时引导反思"
    ],
    successIndicators: [
      "学生积极参与深度思考",
      "思考层次逐步加深",
      "能够发现自己的认知盲点",
      "形成新的理解和洞察"
    ],
    troubleshooting: {
      "学生思考浅表": "降低问题难度，增加引导和提示",
      "学生抗拒思考": "调整语言风格，增强鼓励和支持",
      "思考方向偏离": "温和引导回到核心议题",
      "陷入细节争论": "提升到更高层次的原则性思考"
    }
  },

  unify: {
    name: "Unify - 统一理解阶段",
    objective: "整合探讨成果，形成系统性理解",
    steps: [
      "总结各层探讨的关键发现",
      "整合不同观点和角度",
      "识别核心概念和原理",
      "构建完整的认知框架",
      "与学生确认共同理解",
      "明确仍存在的问题或争议"
    ],
    successIndicators: [
      "形成清晰的知识结构",
      "学生能系统表述理解",
      "不同观点得到有效整合",
      "为进一步学习奠定基础"
    ],
    troubleshooting: {
      "观点难以整合": "寻找更高层次的统一原则",
      "理解仍有分歧": "识别分歧根源，进行针对性澄清",
      "知识碎片化": "强化概念间的联系和逻辑关系",
      "学生理解不完整": "通过问题检验和补充缺失部分"
    }
  },

  execute: {
    name: "Execute - 方案执行阶段",
    objective: "制定实践方案，促进知识迁移和应用",
    steps: [
      "设计具体的学习任务",
      "安排实践应用机会",
      "提供延伸思考方向",
      "制定评估和反馈机制",
      "鼓励自主探索和创新"
    ],
    successIndicators: [
      "学生有明确的行动计划",
      "能够将理论应用到新情况",
      "具备持续学习的动机",
      "展现出独立思考能力"
    ],
    troubleshooting: {
      "任务过于困难": "调整难度，提供更多支持和指导",
      "缺乏应用机会": "创造或寻找合适的实践场景",
      "学生积极性不高": "增强任务的相关性和有趣性",
      "效果难以评估": "设计更具体的评估指标和方法"
    }
  }
};

/**
 * ISSUE协作范式的执行流程
 */
export class ISSUEProtocolExecutor {
  private currentPhase: keyof typeof ISSUE_PROTOCOL_PHASES = 'initiate';
  private phaseProgress: Record<string, boolean> = {};

  /**
   * 获取当前阶段的执行指导
   */
  getCurrentPhaseGuidance(): ISSUEPhase {
    return ISSUE_PROTOCOL_PHASES[this.currentPhase];
  }

  /**
   * 检查当前阶段是否完成
   */
  isCurrentPhaseComplete(indicators: string[]): boolean {
    const currentPhase = ISSUE_PROTOCOL_PHASES[this.currentPhase];
    const requiredIndicators = currentPhase.successIndicators;

    // 简化版检查：如果提供的指标包含了必需指标的一半以上，认为阶段完成
    const achievedCount = indicators.filter(indicator =>
      requiredIndicators.some(required => indicator.includes(required.substring(0, 10)))
    ).length;

    return achievedCount >= Math.ceil(requiredIndicators.length / 2);
  }

  /**
   * 推进到下一阶段
   */
  advanceToNextPhase(): keyof typeof ISSUE_PROTOCOL_PHASES {
    const phases: (keyof typeof ISSUE_PROTOCOL_PHASES)[] =
      ['initiate', 'structure', 'socratic', 'unify', 'execute'];

    const currentIndex = phases.indexOf(this.currentPhase);
    if (currentIndex < phases.length - 1) {
      this.phaseProgress[this.currentPhase] = true;
      this.currentPhase = phases[currentIndex + 1];
    }

    return this.currentPhase;
  }

  /**
   * 获取完整的协议执行状态
   */
  getExecutionStatus(): {
    currentPhase: string;
    completedPhases: string[];
    nextSteps: string[];
    overallProgress: number;
  } {
    const phases = Object.keys(ISSUE_PROTOCOL_PHASES);
    const completedPhases = Object.keys(this.phaseProgress).filter(phase => this.phaseProgress[phase]);
    const currentPhase = ISSUE_PROTOCOL_PHASES[this.currentPhase];

    return {
      currentPhase: currentPhase.name,
      completedPhases,
      nextSteps: currentPhase.steps,
      overallProgress: (completedPhases.length / phases.length) * 100
    };
  }
}

/**
 * 生成ISSUE协作范式的执行提示词
 */
export function getISSUEProtocolPrompt(currentPhase?: keyof typeof ISSUE_PROTOCOL_PHASES): string {
  const phase = currentPhase ? ISSUE_PROTOCOL_PHASES[currentPhase] : null;

  let prompt = `## ISSUE协作范式执行协议

${Object.entries(ISSUE_PROTOCOL_PHASES).map(([key, phaseInfo]) => `
### ${phaseInfo.name}
**目标**：${phaseInfo.objective}

**执行步骤**：
${phaseInfo.steps.map(step => `- ${step}`).join('\n')}

**成功指标**：
${phaseInfo.successIndicators.map(indicator => `✓ ${indicator}`).join('\n')}
`).join('\n')}`;

  if (phase) {
    prompt += `\n\n---\n**当前执行阶段：${phase.name}**\n**当前目标：${phase.objective}**\n\n请严格按照当前阶段的执行步骤和成功指标进行操作。`;
  }

  return prompt;
}

/**
 * 根据学生表现和对话进展，智能推荐ISSUE协作策略
 */
export function recommendISSUEStrategy(
  dialogueContext: {
    phaseHistory: string[];
    studentEngagement: 'low' | 'medium' | 'high';
    conceptClarity: 'unclear' | 'partial' | 'clear';
    issueComplexity: 'simple' | 'moderate' | 'complex';
  }
): {
  recommendedPhase: keyof typeof ISSUE_PROTOCOL_PHASES;
  strategy: string;
  specificActions: string[];
} {
  // 根据概念清晰度决定是否需要回到Initiate阶段
  if (dialogueContext.conceptClarity === 'unclear') {
    return {
      recommendedPhase: 'initiate',
      strategy: "概念理解不清晰，需要重新确立议题和基础概念",
      specificActions: [
        "重新梳理核心议题",
        "澄清关键概念",
        "提供具体例子",
        "确认学生理解"
      ]
    };
  }

  // 根据学生参与度调整策略
  if (dialogueContext.studentEngagement === 'low') {
    return {
      recommendedPhase: 'structure',
      strategy: "学生参与度不高，提供更多结构化支持",
      specificActions: [
        "简化分析框架",
        "增加互动环节",
        "使用更生动的例子",
        "降低问题难度"
      ]
    };
  }

  // 根据问题复杂度调整深度
  if (dialogueContext.issueComplexity === 'complex' && dialogueContext.studentEngagement === 'high') {
    return {
      recommendedPhase: 'socratic',
      strategy: "复杂问题且学生参与度高，可以进行深度苏格拉底探索",
      specificActions: [
        "使用高阶思维问题",
        "鼓励批判性思考",
        "探讨边界和例外情况",
        "引导价值判断讨论"
      ]
    };
  }

  // 默认推进策略
  return {
    recommendedPhase: 'socratic',
    strategy: "正常推进苏格拉底探索阶段",
    specificActions: [
      "按五层递进深入",
      "保持问题开放性",
      "及时给予反馈",
      "引导反思总结"
    ]
  };
}