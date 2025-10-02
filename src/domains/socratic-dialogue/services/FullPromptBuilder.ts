/**
 * 全量提示词构建器
 * 将所有prompts模块完整注入到System Prompt
 *
 * 设计理念：
 * 1. 基于AI注意力机制优化注入顺序（开头和结尾是高注意力区）
 * 2. 使用清晰的分隔符和标题结构
 * 3. 保持所有教学知识的完整性
 * 4. 适配DeepSeek 128K Context Window
 */

import { getSocraticIdentityPrompt } from '../prompts/core/SocraticIdentity';
import { getCognitiveConstraintsPrompt } from '../prompts/core/CognitiveConstraints';
import { getTeachingPrinciplesPrompt } from '../prompts/core/TeachingPrinciples';
import { getISSUEProtocolPrompt } from '../prompts/protocols/ISSUEProtocol';
import { getQuestionQualityProtocolPrompt } from '../prompts/protocols/QuestionQualityProtocol';
import { getTeachingModeStrategiesPrompt } from '../prompts/strategies/ModeStrategies';
import { getDifficultyStrategiesPrompt } from '../prompts/strategies/DifficultyStrategies';

export interface FullPromptContext {
  /** 当前教学模式 */
  mode: 'exploration' | 'analysis' | 'synthesis' | 'evaluation';

  /** 当前难度级别 */
  difficulty: 'basic' | 'intermediate' | 'advanced';

  /** 当前讨论主题（可选） */
  topic?: string;

  /** 当前ISSUE阶段（可选） */
  issuePhase?: 'initiate' | 'structure' | 'socratic' | 'unify' | 'execute';

  /** 是否包含诊断信息 */
  includeDiagnostics?: boolean;
}

/**
 * 全量提示词构建器类
 * 负责将所有教学知识注入到System Prompt
 */
export class FullPromptBuilder {
  /**
   * 构建完整的System Prompt
   *
   * 注入顺序说明：
   * 1. 核心身份 - AI首先需要知道"我是谁"
   * 2. 强制约束 - 明确"我不能做什么"
   * 3. 教学原则 - 详细的"我应该怎么做"
   * 4. ISSUE协议 - 执行流程指导
   * 5. 模式策略 - 当前模式的具体策略
   * 6. 难度策略 - 当前难度的具体策略
   * 7. 质量协议 - 问题质量自检标准
   * 8. 执行总结 - 重申当前任务（高注意力区）
   *
   * @param context - 当前教学上下文
   * @returns 完整的System Prompt字符串
   */
  static buildFullSystemPrompt(context: FullPromptContext): string {
    const sections: string[] = [];
    const separator = "\n\n" + "=".repeat(80) + "\n\n";

    // ========================================
    // 第一部分：高注意力区（开头）
    // ========================================

    sections.push(this.buildSectionHeader(
      "🎭 第一部分：核心身份认知",
      "这是你的基础身份，定义了你是谁、你的特质和核心使命"
    ));
    sections.push(getSocraticIdentityPrompt());

    sections.push(this.buildSectionHeader(
      "⚖️ 第二部分：强制性认知约束",
      "这些是不可违反的硬性限制，确保教学质量和法律准确性"
    ));
    sections.push(getCognitiveConstraintsPrompt());

    // ========================================
    // 第二部分：详细策略区（中间）
    // ========================================

    sections.push(this.buildSectionHeader(
      "📚 第三部分：ISSUE协作范式教学原则",
      "这是你的核心教学方法论，包含五个阶段和Advice Socratic标准"
    ));
    sections.push(getTeachingPrinciplesPrompt());

    sections.push(this.buildSectionHeader(
      "🔄 第四部分：ISSUE协作执行协议",
      "每个阶段的具体执行步骤、成功指标和故障处理"
    ));
    sections.push(getISSUEProtocolPrompt(context.issuePhase));

    sections.push(this.buildSectionHeader(
      "🎯 第五部分：教学模式策略",
      `当前模式：${context.mode.toUpperCase()} - 针对性的问题类型和教学重点`
    ));
    sections.push(getTeachingModeStrategiesPrompt(context.mode));

    sections.push(this.buildSectionHeader(
      "📊 第六部分：难度策略体系",
      `当前难度：${context.difficulty.toUpperCase()} - 适配学生水平的语言和复杂度`
    ));
    sections.push(getDifficultyStrategiesPrompt(context.difficulty));

    // ========================================
    // 第三部分：质量标准区（参考）
    // ========================================

    sections.push(this.buildSectionHeader(
      "✅ 第七部分：问题质量控制协议",
      "问题设计的质量标准和自检清单"
    ));
    sections.push(getQuestionQualityProtocolPrompt());

    // ========================================
    // 第四部分：高注意力区（结尾）
    // ========================================

    sections.push(this.buildSectionHeader(
      "🚀 第八部分：立即执行要求",
      "当前对话的核心任务和优先级（请重点关注此部分）"
    ));
    sections.push(this.buildExecutionSummary(context));

    // ========================================
    // 可选：诊断信息
    // ========================================

    if (context.includeDiagnostics) {
      sections.push(this.buildDiagnostics(context));
    }

    return sections.join(separator);
  }

  /**
   * 构建章节标题
   */
  private static buildSectionHeader(title: string, description: string): string {
    return `# ${title}

> ${description}
`;
  }

  /**
   * 构建执行要求总结（放在结尾，高注意力区）
   */
  private static buildExecutionSummary(context: FullPromptContext): string {
    return `
## 📋 当前教学配置

- **教学模式**：${this.getModeName(context.mode)}
- **难度级别**：${this.getDifficultyName(context.difficulty)}
- **讨论主题**：${context.topic || '法学基础讨论'}
- **ISSUE阶段**：${context.issuePhase ? this.getISSUEPhaseName(context.issuePhase) : '待确定'}

---

## 🎯 核心执行要求（最高优先级）

### 1. 严格执行 Advice Socratic 模式

**这是标准要求，不是可选项：**

- ✅ **一次一问**：每个回合只问一个核心问题
- ✅ **提供选项**：必须主动提供3-5个可能的回答选项
- ✅ **保持开放**：永远包含"您觉得还有其他可能吗？"或类似的开放选项
- ✅ **友好语调**：使用共情式语言："咱们看看..."、"我理解..."
- ✅ **灵活调整**：根据学生回答动态调整后续问题方向

### 2. 遵循 ISSUE 协作范式

**当前阶段：${context.issuePhase ? this.getISSUEPhaseName(context.issuePhase) : 'Initiate（议题确立）'}**

请严格按照该阶段的执行步骤和成功指标进行操作。

### 3. 保持五层递进逻辑

按照以下层级逐步深入，不跳跃：

1. **概念澄清层**：明确基本概念的含义和边界
2. **前提识别层**：暴露隐含前提，检验论证基础
3. **证据检验层**：检验论证的事实基础和逻辑支撑
4. **规则适用层**：将法律规范正确适用于具体情况
5. **后果推演层**：探索观点的逻辑后果和实际影响

### 4. 质量自检清单（每个问题前必须检查）

- [ ] 问题是否只聚焦**一个**认知点？
- [ ] 是否**避免**了预设答案和引导性表述？
- [ ] 语言是否**友好和共情**？
- [ ] 是否**适合**学生当前的认知水平？
- [ ] 是否提供了**3-5个思考选项**？
- [ ] 是否保留了**开放性选项**？

---

## 🔥 关键提醒

**你不是在"考试"学生，而是在与他们共同探索中国法律问题。**

你的目标是通过结构化的友好对话，引导学生发现自己思维中的盲点，最终让他们自己构建完整的法律理解。

保持苏格拉底的谦逊："我知道我什么都不知道"，同时运用ISSUE范式的力量和中国法学的智慧，让每次对话都产生真正的价值。

---

**现在，请基于以上完整的教学指导，开始生成下一个苏格拉底式引导问题。**
`.trim();
  }

  /**
   * 构建诊断信息（可选）
   */
  private static buildDiagnostics(context: FullPromptContext): string {
    // 估算各模块的token数
    const tokenEstimates = {
      identity: 6500,
      constraints: 10800,
      principles: 13600,
      issueProtocol: 12500,
      modeStrategies: 25000,
      difficultyStrategies: 18700,
      qualityProtocol: 7200,
      executionSummary: 1500
    };

    const totalTokens = Object.values(tokenEstimates).reduce((sum, val) => sum + val, 0);
    const contextUsage = (totalTokens / 128000 * 100).toFixed(1);
    const remainingTokens = 128000 - totalTokens;

    return `
---

# 📊 构建诊断信息

> 此信息仅供调试使用，不影响教学对话

## Token使用统计

- **总Token数**：${totalTokens.toLocaleString()} tokens
- **Context占用**：${contextUsage}% (共128K)
- **剩余空间**：${remainingTokens.toLocaleString()} tokens

## 模块分布

${Object.entries(tokenEstimates)
  .map(([module, tokens]) => `- ${module}: ${tokens.toLocaleString()} tokens`)
  .join('\n')}

## 配置信息

- 教学模式: ${context.mode}
- 难度级别: ${context.difficulty}
- ISSUE阶段: ${context.issuePhase || 'auto'}
- 讨论主题: ${context.topic || '未指定'}

---

*Prompt构建完成，所有教学知识已完整注入。*
`.trim();
  }

  /**
   * 获取模式名称（中文）
   */
  private static getModeName(mode: string): string {
    const names: Record<string, string> = {
      exploration: 'Exploration（探索模式）',
      analysis: 'Analysis（分析模式）',
      synthesis: 'Synthesis（综合模式）',
      evaluation: 'Evaluation（评估模式）'
    };
    return names[mode] || mode;
  }

  /**
   * 获取难度名称（中文）
   */
  private static getDifficultyName(difficulty: string): string {
    const names: Record<string, string> = {
      basic: 'Basic（基础水平）',
      intermediate: 'Intermediate（中等水平）',
      advanced: 'Advanced（高级水平）'
    };
    return names[difficulty] || difficulty;
  }

  /**
   * 获取ISSUE阶段名称（中文）
   */
  private static getISSUEPhaseName(phase: string): string {
    const names: Record<string, string> = {
      initiate: 'Initiate（议题确立）',
      structure: 'Structure（框架建议）',
      socratic: 'Socratic（友好探索）',
      unify: 'Unify（统一理解）',
      execute: 'Execute（方案执行）'
    };
    return names[phase] || phase;
  }

  /**
   * 估算提示词的Token数量
   * 使用简单的启发式估算：中文约1.5字符/token，英文约4字符/token
   */
  static estimateTokens(text: string): number {
    // 统计中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 统计英文和其他字符
    const otherChars = text.length - chineseChars;

    // 中文：1.5字符/token，其他：3字符/token
    return Math.round(chineseChars / 1.5 + otherChars / 3);
  }
}
