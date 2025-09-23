/**
 * 苏格拉底对话模板 - 专为法学教育苏格拉底式教学设计
 * 优化问题引导、思辨激发和深度思考
 */

import type {
  AIMessage,
  LegalEducationTemplate,
  SocraticDialogueContext,
  LegalEducationContextData
} from "../types";

export interface SocraticInput {
  /** 案例文本 */
  caseText: string;
  /** 学生水平 */
  studentLevel: 'beginner' | 'intermediate' | 'advanced';
  /** 当前讨论主题 */
  currentTopic: string;
  /** 对话历史 */
  dialogueHistory?: AIMessage[];
  /** 教学焦点 */
  focusAreas?: string[];
  /** 难度等级 */
  difficulty?: 'easy' | 'medium' | 'hard';
  /** 引导策略 */
  guidanceStrategy?: 'questioning' | 'challenging' | 'clarifying' | 'synthesizing';
  /** 案例信息 */
  caseInfo?: {
    caseNumber?: string;
    court?: string;
    parties?: string[];
    caseType?: string;
  };
}

export class SocraticDialogueTemplate implements LegalEducationTemplate<SocraticInput> {
  readonly id = "socratic-dialogue";
  readonly name = "苏格拉底对话模板";
  readonly description = "专为法学教育设计的苏格拉底式对话模板，通过问题引导促进深度思考";
  readonly scenarios = [
    "socratic-teaching",
    "case-discussion",
    "legal-reasoning",
    "critical-thinking"
  ];
  readonly supportedModes = [
    "socratic",
    "questioning",
    "case-analysis"
  ];

  build(input: SocraticInput) {
    return {
      role: this.buildSocraticRole(input),
      conversation: this.formatDialogueHistory(input.dialogueHistory),
      current: this.buildCurrentContext(input),
      tools: this.getSocraticTools()
    };
  }

  buildLegalContext(input: SocraticInput): LegalEducationContextData {
    return {
      role: this.buildSocraticRole(input),
      teachingMode: 'socratic',
      educationLevel: this.mapStudentLevel(input.studentLevel),
      focusAreas: input.focusAreas,
      caseInfo: input.caseInfo,
      legalDomain: this.inferLegalDomain(input.caseText),
      documentType: 'case-brief',
      studentContext: {
        level: input.studentLevel,
        learningObjectives: this.generateLearningObjectives(input.currentTopic, input.studentLevel)
      }
    };
  }

  buildMessages(input: SocraticInput): AIMessage[] {
    const messages: AIMessage[] = [];

    // 1. 系统提示 - 苏格拉底教学角色
    messages.push({
      role: "system",
      content: this.buildSystemPrompt(input),
      metadata: {
        templateId: this.id,
        timestamp: new Date().toISOString(),
        studentLevel: input.studentLevel,
        difficulty: input.difficulty || 'medium'
      }
    });

    // 2. 案例介绍
    messages.push({
      role: "system",
      content: this.buildCaseIntroduction(input),
      metadata: {
        messageType: 'case-introduction'
      }
    });

    // 3. 对话历史
    if (input.dialogueHistory && input.dialogueHistory.length > 0) {
      messages.push(...input.dialogueHistory);
    }

    // 4. 当前教学引导
    const guidanceMessage = this.generateGuidanceMessage(input);
    if (guidanceMessage) {
      messages.push(guidanceMessage);
    }

    return messages;
  }

  validate(input: SocraticInput): boolean {
    if (!input.caseText || input.caseText.trim().length === 0) {
      console.error('苏格拉底对话需要提供案例文本');
      return false;
    }

    if (!input.currentTopic || input.currentTopic.trim().length === 0) {
      console.error('苏格拉底对话需要明确当前讨论主题');
      return false;
    }

    if (!['beginner', 'intermediate', 'advanced'].includes(input.studentLevel)) {
      console.error('学生水平必须是 beginner、intermediate 或 advanced');
      return false;
    }

    return true;
  }

  estimateTokens(input: SocraticInput): number {
    let totalTokens = 0;

    // 系统提示
    totalTokens += this.estimateChineseTokens(this.buildSystemPrompt(input));

    // 案例文本
    totalTokens += this.estimateChineseTokens(input.caseText);

    // 对话历史
    if (input.dialogueHistory) {
      totalTokens += input.dialogueHistory.reduce((sum, msg) =>
        sum + this.estimateChineseTokens(msg.content), 0);
    }

    return totalTokens;
  }

  generateFeedback(input: SocraticInput, response: string): string {
    const feedback: string[] = [];

    // 分析回答质量
    if (response.length < 50) {
      feedback.push("建议提供更详细的分析和论证");
    }

    // 检查是否使用了法律术语
    const legalTerms = ['法条', '判例', '当事人', '证据', '事实', '争议', '权利', '义务'];
    const usedTerms = legalTerms.filter(term => response.includes(term));

    if (usedTerms.length === 0) {
      feedback.push("尝试使用更多法律专业术语来表达观点");
    } else if (usedTerms.length >= 3) {
      feedback.push("很好，使用了专业的法律术语");
    }

    // 检查逻辑结构
    if (response.includes('因为') || response.includes('所以') || response.includes('因此')) {
      feedback.push("逻辑推理清晰");
    } else {
      feedback.push("建议加强逻辑推理和因果关系的表达");
    }

    return feedback.join('；');
  }

  assessProgress(dialogueHistory: AIMessage[]) {
    const userMessages = dialogueHistory.filter(msg => msg.role === 'user');
    const totalMessages = userMessages.length;

    let level: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (totalMessages === 0) {
      return { level, strengths: ['开始参与对话'], improvements: ['积极参与讨论'] };
    }

    // 分析参与度
    if (totalMessages >= 5) {
      strengths.push('积极参与讨论');
    } else {
      improvements.push('增加参与讨论的频率');
    }

    // 分析回答质量
    const averageLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / totalMessages;

    if (averageLength > 100) {
      strengths.push('回答详细充分');
      level = totalMessages > 8 ? 'advanced' : 'intermediate';
    } else if (averageLength > 50) {
      strengths.push('回答比较详细');
      level = 'intermediate';
    } else {
      improvements.push('提供更详细的分析和论证');
    }

    // 分析法律思维
    const legalThinkingWords = ['法条', '条款', '规定', '判例', '先例', '法理', '原则'];
    const hasLegalThinking = userMessages.some(msg =>
      legalThinkingWords.some(word => msg.content.includes(word))
    );

    if (hasLegalThinking) {
      strengths.push('具备法律思维');
      if (level === 'beginner') level = 'intermediate';
    } else {
      improvements.push('加强法律思维和专业表达');
    }

    return { level, strengths, improvements };
  }

  private buildSystemPrompt(input: SocraticInput): string {
    const levelPrompts = {
      beginner: '初学者水平，需要基础概念引导和耐心解释',
      intermediate: '中级水平，可以进行深入讨论和适度挑战',
      advanced: '高级水平，需要复杂推理和批判性思考'
    };

    const strategyPrompts = {
      questioning: '主要通过问题引导思考',
      challenging: '通过挑战性问题促进深度思考',
      clarifying: '帮助学生澄清概念和逻辑',
      synthesizing: '引导学生综合分析和总结'
    };

    const difficultyPrompts = {
      easy: '使用简单清晰的问题，逐步引导',
      medium: '使用适中难度的问题，平衡引导和挑战',
      hard: '使用复杂深入的问题，激发批判性思考'
    };

    return `你是一位经验丰富的法学教授，正在使用苏格拉底式教学法指导学生学习"${input.currentTopic}"。

学生特征：${levelPrompts[input.studentLevel]}
教学策略：${strategyPrompts[input.guidanceStrategy || 'questioning']}
难度等级：${difficultyPrompts[input.difficulty || 'medium']}

苏格拉底教学原则：
1. 通过问题引导学生思考，而不是直接给出答案
2. 根据学生回答调整问题的深度和方向
3. 鼓励学生发现法律原理和逻辑关系
4. 当学生回答有误时，用引导性问题帮助其自我纠正
5. 适时提供必要的法律背景和案例支持
6. 保持苏格拉底式的质疑和探索精神

回应要求：
- 主要以问题形式回应，而非陈述
- 问题要有层次性和逻辑性
- 结合具体的法条和案例
- 语言简洁明了，避免冗长解释
- 体现法学思维的严谨性和批判性

焦点领域：${input.focusAreas?.join('、') || '案件整体分析'}`;
  }

  private buildCaseIntroduction(input: SocraticInput): string {
    let introduction = `<案例背景>\n${input.caseText}\n</案例背景>`;

    if (input.caseInfo) {
      introduction += '\n\n<案例信息>';
      if (input.caseInfo.caseNumber) introduction += `\n案号：${input.caseInfo.caseNumber}`;
      if (input.caseInfo.court) introduction += `\n审理法院：${input.caseInfo.court}`;
      if (input.caseInfo.caseType) introduction += `\n案件类型：${input.caseInfo.caseType}`;
      if (input.caseInfo.parties) introduction += `\n当事人：${input.caseInfo.parties.join('、')}`;
      introduction += '\n</案例信息>';
    }

    introduction += `\n\n<讨论主题>${input.currentTopic}</讨论主题>`;

    return introduction;
  }

  private generateGuidanceMessage(input: SocraticInput): AIMessage | null {
    // 如果没有对话历史，生成开场引导
    if (!input.dialogueHistory || input.dialogueHistory.length === 0) {
      return {
        role: "assistant",
        content: this.generateOpeningQuestion(input),
        metadata: {
          messageType: 'opening-question',
          guidanceStrategy: input.guidanceStrategy || 'questioning'
        }
      };
    }

    return null; // 有对话历史时让模型自然响应
  }

  private generateOpeningQuestion(input: SocraticInput): string {
    const openingQuestions = {
      beginner: [
        `让我们从基础开始思考这个案例。首先，你能告诉我在"${input.currentTopic}"这个问题上，案例中的主要争议是什么吗？`,
        `在阅读这个案例时，你注意到了哪些关键的事实？这些事实为什么重要？`,
        `从法律角度来看，你认为这个案例涉及哪些基本的法律概念？`
      ],
      intermediate: [
        `这个案例在"${input.currentTopic}"方面提出了一个有趣的法律问题。你认为解决这个问题的关键法律原则是什么？为什么？`,
        `如果你是法官，在处理这个案例时你会重点关注哪些方面？你的理由是什么？`,
        `这个案例的事实构成是否满足相关法条的构成要件？请详细分析。`
      ],
      advanced: [
        `这个案例在"${input.currentTopic}"领域揭示了法律适用的复杂性。你如何评价现有法律框架处理此类问题的充分性？`,
        `考虑到法律的确定性和灵活性之间的张力，你认为这个案例应该如何在先例价值和个案正义之间取得平衡？`,
        `从比较法的角度，你认为其他法系对类似问题的处理方式能给我们什么启示？`
      ]
    };

    const questions = openingQuestions[input.studentLevel];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  private buildSocraticRole(input: SocraticInput): string {
    return `法学教授 - 苏格拉底式教学专家，专门指导${input.studentLevel}水平学生学习${input.currentTopic}`;
  }

  private formatDialogueHistory(history?: AIMessage[]): string[] {
    if (!history || history.length === 0) return [];

    return history.map(msg => {
      const role = msg.role === 'user' ? '学生' : '教师';
      return `${role}: ${msg.content}`;
    });
  }

  private buildCurrentContext(input: SocraticInput): string {
    return `当前正在讨论：${input.currentTopic}\n\n请继续苏格拉底式引导教学，通过问题启发学生思考。`;
  }

  private getSocraticTools(): string[] {
    return [
      '问题设计：设计启发性问题',
      '逻辑引导：引导逻辑推理过程',
      '案例对比：对比相关案例',
      '法条解释：解释相关法条',
      '概念澄清：澄清法律概念',
      '思维导图：构建思维框架'
    ];
  }

  private mapStudentLevel(level: string): 'undergraduate' | 'graduate' | 'professional' {
    const mapping = {
      beginner: 'undergraduate' as const,
      intermediate: 'graduate' as const,
      advanced: 'professional' as const
    };
    return mapping[level as keyof typeof mapping] || 'undergraduate';
  }

  private inferLegalDomain(caseText: string): string[] {
    const domains: string[] = [];

    if (caseText.includes('合同') || caseText.includes('违约')) domains.push('合同法');
    if (caseText.includes('侵权') || caseText.includes('损害赔偿')) domains.push('侵权法');
    if (caseText.includes('婚姻') || caseText.includes('离婚')) domains.push('婚姻家庭法');
    if (caseText.includes('公司') || caseText.includes('股东')) domains.push('公司法');
    if (caseText.includes('刑事') || caseText.includes('犯罪')) domains.push('刑法');
    if (caseText.includes('行政') || caseText.includes('政府')) domains.push('行政法');

    return domains.length > 0 ? domains : ['民法'];
  }

  private generateLearningObjectives(topic: string, level: string): string[] {
    const baseObjectives = [
      `理解${topic}的基本概念和法律原理`,
      `掌握${topic}相关的法条适用`,
      `能够分析${topic}涉及的案例事实`
    ];

    if (level === 'intermediate' || level === 'advanced') {
      baseObjectives.push(
        `能够进行${topic}的比较分析`,
        `掌握${topic}的争议问题和解决方案`
      );
    }

    if (level === 'advanced') {
      baseObjectives.push(
        `能够批判性思考${topic}的理论基础`,
        `掌握${topic}的前沿发展和改革方向`
      );
    }

    return baseObjectives;
  }

  private estimateChineseTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    return Math.ceil(chineseChars / 1.8) + Math.ceil(englishChars / 4);
  }
}