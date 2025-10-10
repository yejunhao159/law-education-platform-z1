/**
 * 全量提示词构建器 V2
 *
 * 整合所有优化后的提示词：
 * 1. 法学方法论（12种方法）
 * 2. 法学教育Socratic流程（6阶段）
 * 3. ISSUE协作范式（DeepPractice标准）
 * 4. 记忆锚点自然化策略
 *
 * 设计理念：
 * - 取其精华：融合ISSUE的认知降负（提供选项）+ 苏格拉底的锋利追问
 * - 去其糟粕：删除重复的内容，保持简洁
 * - 深度绑定：与判决书提取信息深度结合
 */

// 苏格拉底核心模块（原版保留）
import { getSocraticIdentityPrompt } from '../prompts/core/SocraticIdentity';
import { getCognitiveConstraintsPrompt } from '../prompts/core/CognitiveConstraints';
import { getChineseLegalThinkingPrompt } from '../prompts/core/ChineseLegalThinking';
import { getTeachingPrinciplesPrompt } from '../prompts/core/TeachingPrinciples';

// 新增优化模块
import { getLegalMethodologyPrompt } from '../prompts/core/LegalMethodology';
import { getLegalEducationSocraticPrompt } from '../prompts/LegalEducationSocratic';
import { getISSUEDeepPracticePrompt } from '../prompts/protocols/ISSUE-DeepPractice-Style';
import { getMemoryAnchorStrategyPrompt } from '../prompts/core/MemoryAnchorStrategy';

export interface FullPromptContextV2 {
  /** 当前对话阶段 */
  phase: 'initial_analysis' | 'initiate' | 'structure' | 'socratic' | 'unify' | 'execute';

  /** 当前难度级别 */
  difficulty: 'basic' | 'intermediate' | 'advanced';

  /** 是否为初次对话（需要AI全局分析）*/
  isInitialQuestion?: boolean;

  /** 当前讨论主题 */
  topic?: string;

  /** 判决书提取信息（如果有）*/
  judgmentData?: {
    basicInfo?: any;
    facts?: any;
    evidence?: any;
    reasoning?: any;
  };

  /** 是否包含诊断信息（开发环境）*/
  includeDiagnostics?: boolean;
}

/**
 * 全量提示词构建器 V2
 */
export class FullPromptBuilderV2 {

  /**
   * 构建完整的System Prompt
   *
   * 融合架构（10个模块）：
   * 【苏格拉底核心】（原版保留，确保锋利本质）
   * M1. 苏格拉底身份（锋利+幽默+严肃）
   * M2. 认知约束（案件锚定、禁止软性引导）
   * M3. 中国法学思维（四层路径）
   * M4. 教学原则（三大武器+记忆锚点）
   *
   * 【ISSUE优化层】（新增，降低认知负担）
   * M5. ISSUE协作范式（DeepPractice标准）
   * M6. 法学方法论（12种方法）
   * M7. 法学教育流程（6阶段）
   * M8. 记忆锚点策略（自然化）
   *
   * 【执行层】（高注意力区）
   * M9. 当前阶段执行要求
   * M10. 诊断信息（可选）
   */
  static buildFullSystemPrompt(context: FullPromptContextV2): string {
    const sections: string[] = [];
    const separator = "\n\n" + "=".repeat(80) + "\n\n";

    // ========================================
    // 【苏格拉底核心】- 保留锋利本质
    // ========================================

    // M1. 苏格拉底身份
    sections.push(this.buildSectionHeader(
      "🎭 M1. 苏格拉底身份认知",
      "锋利+幽默+严肃的精神助产士"
    ));
    sections.push(getSocraticIdentityPrompt());

    // M2. 认知约束
    sections.push(this.buildSectionHeader(
      "⚖️ M2. 强制性认知约束",
      "案件锚定、禁止软性引导"
    ));
    sections.push(getCognitiveConstraintsPrompt());

    // M3. 中国法学思维
    sections.push(this.buildSectionHeader(
      "🧠 M3. 中国法学思维框架",
      "四层思维路径：案件事实 → 法条适用 → 法理依据 → 社会效果"
    ));
    sections.push(getChineseLegalThinkingPrompt());

    // M4. 教学原则（三大武器）
    sections.push(this.buildSectionHeader(
      "🎯 M4. 苏格拉底教学原则",
      "三大武器（助产术、反诘法、归谬法）+ 案件-法条链接"
    ));
    sections.push(getTeachingPrinciplesPrompt());

    // ========================================
    // 【ISSUE优化层】- 降低认知负担，保持锋利追问
    // ========================================

    // M5. ISSUE协作范式
    sections.push(this.buildSectionHeader(
      "🤝 M5. ISSUE协作范式",
      "DeepPractice标准：单点聚焦 + 提供选项 + 保持开放"
    ));
    sections.push(getISSUEDeepPracticePrompt());

    // M6. 法学方法论
    sections.push(this.buildSectionHeader(
      "📚 M6. 法学方法论完整体系",
      "12种专业分析方法：解释（6）+ 推理（3）+ 论证（3）"
    ));
    sections.push(getLegalMethodologyPrompt());

    // M7. 法学教育Socratic流程
    sections.push(this.buildSectionHeader(
      "📖 M7. 法学教育Socratic流程",
      "先分析讲解（阶段0）→ 后ISSUE探讨（阶段1-5）"
    ));

    // 将简化的phase名映射到完整的phase名
    const phaseMapping: Record<typeof context.phase, keyof typeof import('../prompts/LegalEducationSocratic').LEGAL_EDUCATION_SOCRATIC_FLOW> = {
      'initial_analysis': 'phase0_aiAnalysis',
      'initiate': 'phase1_initiate',
      'structure': 'phase2_structure',
      'socratic': 'phase3_socratic',
      'unify': 'phase4_unify',
      'execute': 'phase5_execute'
    };

    sections.push(getLegalEducationSocraticPrompt(phaseMapping[context.phase]));

    // M8. 记忆锚点策略
    sections.push(this.buildSectionHeader(
      "💡 M8. 记忆锚点自然化策略",
      "不机械要求，而是巧妙植入"
    ));
    sections.push(getMemoryAnchorStrategyPrompt());

    // ========================================
    // 【执行层】- 高注意力区
    // ========================================

    // M9. 当前阶段执行要求
    sections.push(this.buildSectionHeader(
      "🚀 M9. 当前阶段执行要求",
      "你现在要做什么（重要！）"
    ));
    sections.push(this.buildCurrentPhaseRequirements(context));

    // M10. 诊断信息（可选）
    if (context.includeDiagnostics) {
      sections.push(this.buildSectionHeader(
        "🔍 M10. 诊断信息",
        "开发模式 - Token使用和模块统计"
      ));
      sections.push(this.buildDiagnostics(context));
    }

    return sections.join(separator);
  }

  /**
   * M9. 当前阶段执行要求
   */
  private static buildCurrentPhaseRequirements(context: FullPromptContextV2): string {
    const phaseDescriptions = {
      initial_analysis: "阶段0：AI全局分析",
      initiate: "阶段1：确认探讨议题",
      structure: "阶段2：选择法学方法论框架",
      socratic: "阶段3：锋利追问，层层深入（五层递进）",
      unify: "阶段4：整合理解",
      execute: "阶段5：练习应用"
    };

    const currentPhase = phaseDescriptions[context.phase] || "未知阶段";

    return `# 当前阶段：${currentPhase}

## 你现在要做什么

${this.getPhaseSpecificRequirements(context)}

---

## 核心原则（贯穿所有阶段）

1. **锋利追问**：一针见血暴露矛盾 + 提供选项降低认知负担 + 保持逻辑开放性
2. **专业严谨**：准确术语 + 严密逻辑 + 方法论明确
3. **自然记忆**：巧妙追问，而非机械要求"创造记忆锚点"
4. **因材施教**：根据学生回答质量调整难度

---

## 质量自检（生成回答前问自己）

- [ ] 我是否提供了选项？（ISSUE原则）
- [ ] 我是否只聚焦一个问题？（单点原则）
- [ ] 我是否使用了准确的法学术语？（专业性）
- [ ] 我是否明确了使用的方法论？（方法意识）
- [ ] 我是否自然地植入了记忆锚点？（不机械）

${context.includeDiagnostics ? `

---

## 🔍 诊断信息（开发模式）

- 当前阶段：${context.phase}
- 难度级别：${context.difficulty}
- 是否初次对话：${context.isInitialQuestion ? '是' : '否'}
- 讨论主题：${context.topic || '未指定'}
- 判决书数据：${context.judgmentData ? '已加载' : '未加载'}
` : ''}
`;
  }

  /**
   * 获取各阶段的具体要求
   */
  private static getPhaseSpecificRequirements(context: FullPromptContextV2): string {
    switch (context.phase) {
      case 'initial_analysis':
        return `
**阶段0的任务**：基于提取的判决书信息，进行全局分析并讲解

**输出格式**（严格遵守）：

\`\`\`markdown
📋 **案件全局分析**

**争议焦点**：[从keyArguments中提取，简洁讲解原被告的核心分歧]

**适用法条**：
- 《民法典》第X条：[法条内容]
  构成要件：①... ②... ③...
  法律效果：...

**法条与案件的关系**（三段论）：
- 大前提：法条规定...
- 小前提：本案中...[案件事实]...符合法条要件
- 结论：因此...[法律效果]

**法院判决**：[判决结果]

---

💡 **现在，你想深入探讨哪个方面？**
A) 为什么适用这个法条而不是其他法条？
B) 案件事实如何符合法条的构成要件？
C) 法院的推理逻辑有哪些亮点或争议？
D) 其他方面？
\`\`\`

**数据来源**：${context.judgmentData ? '使用context.judgmentData中的数据' : '⚠️ 未提供判决书数据'}
        `;

      case 'initiate':
        return `
**阶段1的任务**：确认学生选择的探讨方向，聚焦具体议题

**交互模式**：

学生选择了X → AI确认并聚焦：

\`\`\`
好的，我们来探讨[具体议题]。

这个问题的核心在于：[用一句话说明核心]

你准备好了吗？我们开始。
\`\`\`
        `;

      case 'structure':
        return `
**阶段2的任务**：推荐法学方法论框架，让学生选择

**交互模式**（提供2-3个框架）：

\`\`\`
分析这个问题，我建议用以下方法之一：

**方法A：[方法名]**
思维路径：[步骤]
适合：[场景]

**方法B：[方法名]**
思维路径：[步骤]
适合：[场景]

你倾向于用哪个方法？或者你有其他想法？
\`\`\`

**可选方法**：见M3（法学方法论体系）
        `;

      case 'socratic':
        return `
**阶段3的任务**：五层递进探索

**五层结构**：
1. 第1层：事实确认
2. 第2层：法条选择
3. 第3层：要件分析
4. 第4层：法理探讨
5. 第5层：边界探讨

**核心原则**：
- 锋利追问：一针见血，单点聚焦，直击逻辑漏洞
- 降低认知负担：提供2-4个选项，但不降低锋利度
- 保持逻辑开放：必须加"或者你有其他想法？"
- 暴露矛盾后重建：学生卡住时提供脚手架，而非继续追问到死

详细说明见M4（法学教育Socratic流程）的阶段3。
        `;

      case 'unify':
        return `
**阶段4的任务**：整合碎片理解，形成系统认知

**输出格式**：

\`\`\`
我们一起梳理一下刚才的探讨：

**议题**：[核心议题]

**方法论**：[使用的法学方法论]

**分析过程**：
1. 事实确认：[关键事实]
2. 法条选择：《民法典》第X条，因为...[理由]
3. 要件分析：[逐一检验]
4. 法理依据：[法条背后的法理]
5. 适用边界：[法条的适用边界]

**你记住的关键点**（请补充）：
- 这个案件 ↔ 《民法典》第X条（案件-法条绑定）
- X条与Y条的区别是...[请你说]
- 适用X条的边界是...[请你说]

你觉得还有哪里需要补充或修正？
\`\`\`
        `;

      case 'execute':
        return `
**阶段5的任务**：设计练习，测试知识迁移

**练习类型**（选择1-2个）：
1. 变式案件：改变案件事实，测试理解
2. 对比分析：找相似但结论不同的案例
3. 主动recall：测试记忆锚定强度
4. 角色扮演：假如你是法官...

详细示例见M4（法学教育Socratic流程）的阶段5。
        `;

      default:
        return "未知阶段，请检查phase参数";
    }
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
   * 构建诊断信息（开发环境）
   */
  private static buildDiagnostics(context: FullPromptContextV2): string {
    return `
---

# 🔍 诊断信息（开发模式）

## 上下文信息
- 当前阶段：${context.phase}
- 难度级别：${context.difficulty}
- 是否初次对话：${context.isInitialQuestion ? '是' : '否'}
- 讨论主题：${context.topic || '未指定'}

## 数据加载状态
- 基本信息：${context.judgmentData?.basicInfo ? '✓' : '✗'}
- 案件事实：${context.judgmentData?.facts ? '✓' : '✗'}
- 证据分析：${context.judgmentData?.evidence ? '✓' : '✗'}
- 裁判理由：${context.judgmentData?.reasoning ? '✓' : '✗'}

## Prompt模块加载
【苏格拉底核心】
- M1 苏格拉底身份：✓
- M2 认知约束：✓
- M3 中国法学思维：✓
- M4 教学原则：✓

【ISSUE优化层】
- M5 ISSUE协作范式：✓
- M6 法学方法论：✓
- M7 法学教育流程：✓
- M8 记忆锚点策略：✓

【执行层】
- M9 当前阶段执行：✓
- M10 诊断信息：✓（当前模块）

---
`;
  }
}
