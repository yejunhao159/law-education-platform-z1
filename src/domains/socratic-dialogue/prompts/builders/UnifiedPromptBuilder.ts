/**
 * 统一提示词构建器
 * 整合所有模块化组件，构建完整的苏格拉底教学提示词
 * 替代原有的420行单一文件，提供灵活可扩展的构建机制
 */

import { getSocraticIdentityPrompt, getAdaptiveSocraticIdentity } from '../core/SocraticIdentity';
import { getCognitiveConstraintsPrompt } from '../core/CognitiveConstraints';
import { getTeachingPrinciplesPrompt } from '../core/TeachingPrinciples';
import { getISSUEProtocolPrompt } from '../protocols/ISSUEProtocol';
import { getQuestionQualityProtocolPrompt } from '../protocols/QuestionQualityProtocol';
import { getDifficultyStrategiesPrompt } from '../strategies/DifficultyStrategies';
import { getTeachingModeStrategiesPrompt } from '../strategies/ModeStrategies';

export interface PromptBuildConfiguration {
  /** 基础配置 */
  identity: {
    level: 'basic' | 'intermediate' | 'advanced';
    focus: 'theory' | 'practice' | 'mixed';
  };

  /** 教学策略配置 */
  teaching: {
    mode: 'exploration' | 'analysis' | 'synthesis' | 'evaluation';
    difficulty: 'basic' | 'intermediate' | 'advanced';
    apiMode?: 'response' | 'suggestions' | 'analysis';
  };

  /** 协议配置 */
  protocols: {
    includeISSUE: boolean;
    includeQualityControl: boolean;
    currentISSUEPhase?: 'initiate' | 'structure' | 'socratic' | 'unify' | 'execute';
  };

  /** 输出控制 */
  output: {
    maxLength?: number;
    includeDiagnostics?: boolean;
    includeExamples?: boolean;
    verbosity: 'minimal' | 'standard' | 'detailed';
  };

  /** 上下文信息 */
  context?: {
    topic?: string;
    caseInfo?: string;
    previousInteractions?: number;
  };
}

/**
 * 统一提示词构建器类
 * 提供灵活的提示词组装和定制功能
 */
export class UnifiedPromptBuilder {
  private config: PromptBuildConfiguration;

  constructor(config: PromptBuildConfiguration) {
    this.config = config;
  }

  /**
   * 构建完整的苏格拉底教学提示词
   */
  build(): string {
    const sections: string[] = [];

    // 1. 核心身份部分
    sections.push(this.buildIdentitySection());

    // 2. 认知约束部分
    if (this.config.output.verbosity !== 'minimal') {
      sections.push(this.buildConstraintsSection());
    }

    // 3. 教学原则部分
    sections.push(this.buildPrinciplesSection());

    // 4. 执行协议部分
    if (this.config.protocols.includeISSUE) {
      sections.push(this.buildISSUEProtocolSection());
    }

    // 5. 教学策略部分
    sections.push(this.buildTeachingStrategySection());

    // 6. 问题质量控制部分
    if (this.config.protocols.includeQualityControl) {
      sections.push(this.buildQualityControlSection());
    }

    // 7. 上下文信息部分
    if (this.config.context) {
      sections.push(this.buildContextSection());
    }

    // 8. 执行要求部分
    sections.push(this.buildExecutionRequirementsSection());

    // 9. 诊断信息部分（可选）
    if (this.config.output.includeDiagnostics) {
      sections.push(this.buildDiagnosticsSection());
    }

    const fullPrompt = sections.join('\n\n---\n\n');

    // 长度控制
    if (this.config.output.maxLength && fullPrompt.length > this.config.output.maxLength) {
      return this.truncatePrompt(fullPrompt, this.config.output.maxLength);
    }

    return fullPrompt;
  }

  /**
   * 构建身份认知部分
   */
  private buildIdentitySection(): string {
    return getAdaptiveSocraticIdentity({
      level: this.config.identity.level,
      focus: this.config.identity.focus
    });
  }

  /**
   * 构建认知约束部分
   */
  private buildConstraintsSection(): string {
    return getCognitiveConstraintsPrompt();
  }

  /**
   * 构建教学原则部分
   */
  private buildPrinciplesSection(): string {
    if (this.config.output.verbosity === 'minimal') {
      return `## 核心教学原则
- 一次只问一个核心问题，提供3-5个思考选项
- 保持开放性，永远包含"其他"选项
- 使用友好共情的语言营造安全环境
- 根据学生回答灵活调整问题方向
- 每个阶段结束时引导反思认知变化`;
    }
    return getTeachingPrinciplesPrompt();
  }

  /**
   * 构建ISSUE协作范式部分
   */
  private buildISSUEProtocolSection(): string {
    return getISSUEProtocolPrompt(this.config.protocols.currentISSUEPhase);
  }

  /**
   * 构建教学策略部分
   */
  private buildTeachingStrategySection(): string {
    const strategyPrompt = getTeachingModeStrategiesPrompt(
      this.config.teaching.mode,
      this.config.teaching.apiMode
    );

    const difficultyPrompt = getDifficultyStrategiesPrompt(
      this.config.teaching.difficulty
    );

    return `${strategyPrompt}\n\n${difficultyPrompt}`;
  }

  /**
   * 构建问题质量控制部分
   */
  private buildQualityControlSection(): string {
    if (this.config.output.verbosity === 'minimal') {
      return `## 问题质量要求
- **聚焦性**：每个问题只针对一个认知目标
- **逻辑性**：推理严密，无内在矛盾
- **开放性**：避免预设答案和引导性表述
- **适切性**：匹配学生当前认知水平`;
    }
    return getQuestionQualityProtocolPrompt();
  }

  /**
   * 构建上下文信息部分
   */
  private buildContextSection(): string {
    const context = this.config.context!;
    let contextInfo = '## 当前对话上下文\n';

    if (context.topic) {
      contextInfo += `**讨论主题**：${context.topic}\n`;
    }

    if (context.caseInfo) {
      contextInfo += `**案例信息**：${context.caseInfo}\n`;
    }

    if (context.previousInteractions) {
      contextInfo += `**对话轮次**：这是第${context.previousInteractions + 1}轮对话\n`;
    }

    return contextInfo;
  }

  /**
   * 构建执行要求部分
   */
  private buildExecutionRequirementsSection(): string {
    const maxLength = this.config.output.maxLength || 1000;

    return `## 立即执行要求

**当前任务优先级**：
1. **聚焦当前${this.config.teaching.mode}模式**：${this.getModeDescription()}
2. **适应${this.config.teaching.difficulty}难度水平**：${this.getDifficultyDescription()}
3. **严格执行Advice Socratic模式**：一次一问，提供选项，保持开放

**输出格式要求**：
- 控制回答长度在${maxLength}字以内
- 使用友好的中文表达
- 每个问题后提供3-5个思考选项
- 始终保留"您觉得还有其他可能吗？"的开放选项

**质量检查清单**：
- [ ] 问题是否只聚焦一个认知点？
- [ ] 是否避免了预设答案的表述？
- [ ] 语言是否友好和共情？
- [ ] 是否适合学生的认知水平？

现在，请基于以上完整配置，开始您的苏格拉底式教学对话。`;
  }

  /**
   * 构建诊断信息部分
   */
  private buildDiagnosticsSection(): string {
    return `## 构建诊断信息

**配置摘要**：
- 身份配置：${this.config.identity.level}水平，${this.config.identity.focus}导向
- 教学策略：${this.config.teaching.mode}模式，${this.config.teaching.difficulty}难度
- 协议启用：${this.config.protocols.includeISSUE ? '✓' : '✗'} ISSUE范式，${this.config.protocols.includeQualityControl ? '✓' : '✗'} 质量控制
- 输出控制：${this.config.output.verbosity}详细度，${this.config.output.maxLength || '无'}字符限制

**提示词统计**：
- 估计长度：约${this.estimatePromptLength()}字符
- 主要组件：${this.getActiveComponents().join('、')}
- API模式：${this.config.teaching.apiMode || '无'}

*此诊断信息仅供调试使用，不影响教学对话。*`;
  }

  /**
   * 获取当前模式描述
   */
  private getModeDescription(): string {
    const descriptions = {
      exploration: '通过澄清和假设型问题激发思考',
      analysis: '通过证据型问题深入分析事实和规则',
      synthesis: '通过推演型问题整合不同观点',
      evaluation: '综合运用各类问题进行批判性评价'
    };
    return descriptions[this.config.teaching.mode];
  }

  /**
   * 获取当前难度描述
   */
  private getDifficultyDescription(): string {
    const descriptions = {
      basic: '简单直接，重点关注基本概念',
      intermediate: '适度复杂，涉及多概念关联',
      advanced: '高度复杂，涉及深层法理思辨'
    };
    return descriptions[this.config.teaching.difficulty];
  }

  /**
   * 估算提示词长度
   */
  private estimatePromptLength(): number {
    // 简化的长度估算
    let length = 2000; // 基础身份部分

    if (this.config.output.verbosity === 'detailed') length += 1500;
    if (this.config.protocols.includeISSUE) length += 1000;
    if (this.config.protocols.includeQualityControl) length += 1200;
    if (this.config.context) length += 200;

    return length;
  }

  /**
   * 获取激活的组件列表
   */
  private getActiveComponents(): string[] {
    const components = ['身份认知', '教学原则', '策略配置'];

    if (this.config.protocols.includeISSUE) components.push('ISSUE协议');
    if (this.config.protocols.includeQualityControl) components.push('质量控制');
    if (this.config.context) components.push('上下文信息');
    if (this.config.output.includeDiagnostics) components.push('诊断信息');

    return components;
  }

  /**
   * 截断过长的提示词
   */
  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) return prompt;

    // 找到合适的截断点（避免在句子中间截断）
    const truncated = prompt.substring(0, maxLength - 100); // 留出缓冲区
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('？'),
      truncated.lastIndexOf('\n')
    );

    const finalPrompt = truncated.substring(0, lastSentenceEnd + 1);
    return `${finalPrompt}\n\n*注：提示词已因长度限制而截断，但核心功能保持完整。*`;
  }

  /**
   * 创建快速构建器实例（常用配置）
   */
  static createQuickBuilder(
    level: 'basic' | 'intermediate' | 'advanced',
    mode: 'exploration' | 'analysis' | 'synthesis' | 'evaluation',
    apiMode?: 'response' | 'suggestions' | 'analysis'
  ): UnifiedPromptBuilder {
    return new UnifiedPromptBuilder({
      identity: {
        level,
        focus: 'mixed'
      },
      teaching: {
        mode,
        difficulty: level,
        apiMode
      },
      protocols: {
        includeISSUE: true,
        includeQualityControl: mode === 'evaluation'
      },
      output: {
        verbosity: 'standard',
        includeDiagnostics: false,
        includeExamples: true
      }
    });
  }

  /**
   * 创建最小化构建器（用于字符限制严格的场景）
   */
  static createMinimalBuilder(
    level: 'basic' | 'intermediate' | 'advanced',
    apiMode?: 'response' | 'suggestions' | 'analysis'
  ): UnifiedPromptBuilder {
    return new UnifiedPromptBuilder({
      identity: {
        level,
        focus: 'practice'
      },
      teaching: {
        mode: 'exploration',
        difficulty: level,
        apiMode
      },
      protocols: {
        includeISSUE: false,
        includeQualityControl: false
      },
      output: {
        verbosity: 'minimal',
        maxLength: 800,
        includeDiagnostics: false,
        includeExamples: false
      }
    });
  }

  /**
   * 创建完整功能构建器（用于复杂教学场景）
   */
  static createFullFeaturedBuilder(
    level: 'basic' | 'intermediate' | 'advanced',
    mode: 'exploration' | 'analysis' | 'synthesis' | 'evaluation',
    context: {
      topic?: string;
      caseInfo?: string;
      issuePhase?: 'initiate' | 'structure' | 'socratic' | 'unify' | 'execute';
    }
  ): UnifiedPromptBuilder {
    return new UnifiedPromptBuilder({
      identity: {
        level,
        focus: 'mixed'
      },
      teaching: {
        mode,
        difficulty: level
      },
      protocols: {
        includeISSUE: true,
        includeQualityControl: true,
        currentISSUEPhase: context.issuePhase
      },
      output: {
        verbosity: 'detailed',
        includeDiagnostics: true,
        includeExamples: true
      },
      context: {
        topic: context.topic,
        caseInfo: context.caseInfo
      }
    });
  }
}

/**
 * 便捷函数：构建标准苏格拉底提示词
 * 兼容原有的 buildSocraticRolePrompt 接口
 */
export function buildUnifiedSocraticPrompt(
  mode: 'exploration' | 'analysis' | 'synthesis' | 'evaluation' = 'exploration',
  difficulty: 'basic' | 'intermediate' | 'advanced' = 'intermediate',
  maxLength: number = 1000,
  apiMode?: 'response' | 'suggestions' | 'analysis'
): string {
  const builder = new UnifiedPromptBuilder({
    identity: {
      level: difficulty,
      focus: 'mixed'
    },
    teaching: {
      mode,
      difficulty,
      apiMode
    },
    protocols: {
      includeISSUE: true,
      includeQualityControl: false
    },
    output: {
      maxLength,
      verbosity: 'standard',
      includeDiagnostics: false,
      includeExamples: true
    }
  });

  return builder.build();
}

/**
 * 便捷函数：构建API兼容的提示词
 * 专门用于与现有API层集成
 */
export function buildAPICompatiblePrompt(
  level: 'basic' | 'intermediate' | 'advanced',
  apiMode: 'response' | 'suggestions' | 'analysis',
  context?: {
    topic?: string;
    caseInfo?: string;
  }
): string {
  // 根据API模式映射到Domain层模式
  const modeMapping = {
    response: 'analysis' as const,
    suggestions: 'exploration' as const,
    analysis: 'evaluation' as const
  };

  const builder = new UnifiedPromptBuilder({
    identity: {
      level,
      focus: 'practice'
    },
    teaching: {
      mode: modeMapping[apiMode],
      difficulty: level,
      apiMode
    },
    protocols: {
      includeISSUE: true,
      includeQualityControl: apiMode === 'analysis'
    },
    output: {
      maxLength: 1200,
      verbosity: 'standard',
      includeDiagnostics: false,
      includeExamples: true
    },
    context
  });

  return builder.build();
}