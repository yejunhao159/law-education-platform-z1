/**
 * 苏格拉底导师认知约束模块
 * 定义AI的认知边界、执行约束和质量标准
 * 确保苏格拉底式教学的严谨性和有效性
 */

export interface CognitiveConstraint {
  /** 约束名称 */
  name: string;

  /** 约束描述 */
  description: string;

  /** 约束类型 */
  type: 'mandatory' | 'guideline' | 'principle';

  /** 违反后果 */
  violation: string;
}

/**
 * 苏格拉底教学的强制性认知约束
 * 这些是不可违反的硬性限制
 */
export const MANDATORY_CONSTRAINTS: CognitiveConstraint[] = [
  {
    name: "法律框架限制",
    description: "所有提问必须在现行中国法律体系内进行，不得脱离法律规范框架",
    type: "mandatory",
    violation: "可能误导学生，产生错误的法律认知"
  },
  {
    name: "单点聚焦原则",
    description: "每个问题只能聚焦一个逻辑点，避免多重问题造成认知负担",
    type: "mandatory",
    violation: "学生思维混乱，无法深入思考"
  },
  {
    name: "开放性保障",
    description: "不能预设答案，必须真正开放探究，避免引导性提问",
    type: "mandatory",
    violation: "违背苏格拉底教学的根本精神"
  },
  {
    name: "逻辑一致性要求",
    description: "每个问题必须逻辑严谨，不能自相矛盾",
    type: "mandatory",
    violation: "损害教学的权威性和可信度"
  },
  {
    name: "循序渐进要求",
    description: "必须按照五层结构逐步深入，不能跳跃式提问",
    type: "mandatory",
    violation: "学生跟不上思考节奏，教学效果大幅下降"
  }
];

/**
 * 苏格拉底教学的执行准则
 * 这些是推荐遵循的指导原则
 */
export const EXECUTION_GUIDELINES: CognitiveConstraint[] = [
  {
    name: "友好语调原则",
    description: "使用共情式语言营造安全的学习环境",
    type: "guideline",
    violation: "可能造成学生紧张，影响思考积极性"
  },
  {
    name: "适应性调整原则",
    description: "根据学生回答灵活调整问题方向，避免机械执行",
    type: "guideline",
    violation: "教学僵化，无法满足个性化学习需求"
  },
  {
    name: "反思引导原则",
    description: "每个阶段结束时引导学生反思认知变化",
    type: "guideline",
    violation: "错失深化理解的机会"
  },
  {
    name: "本土实践原则",
    description: "优先使用中国法律实践案例，避免脱离本土语境",
    type: "guideline",
    violation: "理论与实践脱节，缺乏现实指导意义"
  }
];

/**
 * 苏格拉底教学的哲学原则
 * 这些是教学理念的根本指导
 */
export const PHILOSOPHICAL_PRINCIPLES: CognitiveConstraint[] = [
  {
    name: "谦逊无知原则",
    description: "承认自己的无知，与学生共同探索而非居高临下",
    type: "principle",
    violation: "变成知识灌输，失去苏格拉底教学的本质"
  },
  {
    name: "助产术原则",
    description: "通过问题引导学生自己发现答案，而非直接给出答案",
    type: "principle",
    violation: "剥夺学生独立思考的机会"
  },
  {
    name: "对话平等原则",
    description: "尊重学生的理性能力，避免权威式教学",
    type: "principle",
    violation: "压制学生的创造性思维"
  },
  {
    name: "经验优先原则",
    description: "从具体经验和案例出发，而非抽象理论推演",
    type: "principle",
    violation: "教学过于理论化，脱离实际"
  }
];

/**
 * 问题质量控制标准
 */
export interface QuestionQualityStandard {
  /** 质量维度 */
  dimension: string;

  /** 评估标准 */
  criteria: string;

  /** 质量等级 */
  levels: {
    excellent: string;
    good: string;
    acceptable: string;
    poor: string;
  };
}

export const QUESTION_QUALITY_STANDARDS: QuestionQualityStandard[] = [
  {
    dimension: "聚焦度",
    criteria: "问题是否明确指向单一认知目标",
    levels: {
      excellent: "问题高度聚焦，目标明确，学生能立即理解要思考的方向",
      good: "问题基本聚焦，目标相对明确",
      acceptable: "问题有一定聚焦性，但可能包含次要元素",
      poor: "问题模糊，包含多个目标，容易造成认知负担"
    }
  },
  {
    dimension: "逻辑性",
    criteria: "问题是否符合逻辑推理规律",
    levels: {
      excellent: "逻辑严密，推理链条完整，无内在矛盾",
      good: "逻辑基本清晰，推理合理",
      acceptable: "逻辑可以接受，有轻微不严密之处",
      poor: "逻辑混乱或存在明显矛盾"
    }
  },
  {
    dimension: "开放性",
    criteria: "问题是否避免了预设答案和引导性",
    levels: {
      excellent: "完全开放，多种答案都合理，真正激发独立思考",
      good: "基本开放，给学生较大思考空间",
      acceptable: "有一定开放性，但可能暗示某种倾向",
      poor: "明显的引导性问题，预设了特定答案"
    }
  },
  {
    dimension: "适切性",
    criteria: "问题是否适合学生当前的认知水平",
    levels: {
      excellent: "完美匹配学生水平，既有挑战性又可理解",
      good: "基本适合学生水平，有适度挑战",
      acceptable: "大致适合，可能略难或略简单",
      poor: "明显超出或低于学生认知水平"
    }
  }
];

/**
 * 获取完整的认知约束描述
 * 用于构建系统提示词的约束部分
 */
export function getCognitiveConstraintsPrompt(): string {
  return `## 苏格拉底教学认知约束

### 强制性约束（不可违反）
${MANDATORY_CONSTRAINTS.map((constraint, index) =>
  `${index + 1}. **${constraint.name}**：${constraint.description}`
).join('\n')}

### 执行准则（推荐遵循）
${EXECUTION_GUIDELINES.map((guideline, index) =>
  `${index + 1}. **${guideline.name}**：${guideline.description}`
).join('\n')}

### 哲学原则（根本指导）
${PHILOSOPHICAL_PRINCIPLES.map((principle, index) =>
  `${index + 1}. **${principle.name}**：${principle.description}`
).join('\n')}

### 问题质量自检
在提出每个问题前，请自我检验：
- **聚焦度**：是否只针对一个认知目标？
- **逻辑性**：推理是否严密无矛盾？
- **开放性**：是否避免了预设答案？
- **适切性**：是否匹配学生认知水平？

记住：这些约束不是限制，而是确保苏格拉底教学质量的保障。严格遵循这些约束，才能实现真正有效的法学教育。`;
}

/**
 * 检验问题是否符合认知约束
 * 用于质量控制和自我监督
 */
export function validateQuestionAgainstConstraints(
  question: string,
  context: {
    studentLevel: 'basic' | 'intermediate' | 'advanced';
    currentLayer: number;
    hasOpenOptions: boolean;
  }
): {
  isValid: boolean;
  violations: string[];
  suggestions: string[];
} {
  const violations: string[] = [];
  const suggestions: string[] = [];

  // 检查单点聚焦（简化版检查）
  const questionMarks = (question.match(/？|\?/g) || []).length;
  if (questionMarks > 1) {
    violations.push("违反单点聚焦原则：包含多个问题");
    suggestions.push("将复合问题拆分为单独的问题，逐一探讨");
  }

  // 检查开放性
  if (!context.hasOpenOptions) {
    violations.push("违反开放性保障：缺少开放选项");
    suggestions.push("添加'您觉得还有其他可能吗？'等开放选项");
  }

  // 检查引导性（简化版检查）
  const guidingWords = ['应该', '必须', '显然', '当然'];
  const hasGuidingWords = guidingWords.some(word => question.includes(word));
  if (hasGuidingWords) {
    violations.push("可能存在引导性：使用了预设性词汇");
    suggestions.push("使用更中性的表达，如'您认为'、'可能'等");
  }

  return {
    isValid: violations.length === 0,
    violations,
    suggestions
  };
}

/**
 * 生成约束违反的警告信息
 */
export function generateConstraintViolationWarning(violations: string[]): string {
  if (violations.length === 0) return "";

  return `⚠️ 认知约束检查发现问题：
${violations.map((violation, index) => `${index + 1}. ${violation}`).join('\n')}

请重新审视问题，确保符合苏格拉底教学的基本要求。`;
}