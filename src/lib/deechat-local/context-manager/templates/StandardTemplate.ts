/**
 * 标准模板 - 法学教育平台增强版
 * 基于原始四层结构，针对法学教育场景优化
 */

import type {
  ContextData,
  AIMessage,
  ContextTemplate,
  LegalEducationContextData
} from "../types";

export interface StandardInput {
  /** 角色定义（必需） */
  role: string;
  /** 工具列表（可选） */
  tools?: string[];
  /** 对话历史（可选） */
  conversation?: string | string[];
  /** 当前消息（可选） */
  current?: string;
  /** 法学教育扩展信息（可选） */
  legalContext?: Partial<LegalEducationContextData>;
}

export class StandardTemplate implements ContextTemplate<StandardInput> {
  readonly id = "standard";
  readonly name = "标准四层模板";
  readonly description = "基于现有四层结构的标准模板：角色、工具、对话、当前消息";
  readonly scenarios = [
    "general",
    "basic-teaching",
    "document-analysis",
    "qa-session"
  ];
  readonly supportedModes = [
    "socratic",
    "analysis",
    "extraction",
    "timeline",
    "summary"
  ];

  build(input: StandardInput): ContextData {
    return {
      role: input.role,
      tools: input.tools,
      conversation: input.conversation,
      current: input.current,
    };
  }

  /**
   * 构建格式化的XML字符串
   */
  format(input: StandardInput): string {
    const parts: string[] = [];

    // 1. 角色层（必需）- 增强版
    parts.push(this.formatRole(input.role, input.legalContext));

    // 2. 工具层（可选）- 针对法学教育优化
    if (input.tools && input.tools.length > 0) {
      parts.push(this.formatTools(input.tools));
    }

    // 3. 对话历史层（可选）
    if (input.conversation) {
      parts.push(this.formatConversation(input.conversation));
    }

    // 4. 当前消息层（可选）
    if (input.current) {
      parts.push(this.formatCurrent(input.current));
    }

    // 5. 法学上下文层（如果提供）
    if (input.legalContext) {
      parts.push(this.formatLegalContext(input.legalContext));
    }

    return `<context>\n${parts.join('\n\n')}\n</context>`;
  }

  /**
   * 构建 AI 消息数组
   */
  buildMessages(input: StandardInput): AIMessage[] {
    const messages: AIMessage[] = [];

    // 1. 系统消息：使用格式化的XML上下文
    const systemContent = this.format(input);
    messages.push({
      role: "system",
      content: systemContent,
      metadata: {
        timestamp: new Date().toISOString(),
        templateId: this.id
      }
    });

    // 2. 对话历史
    if (input.conversation) {
      const conversationMessages = this.parseConversation(input.conversation);
      messages.push(...conversationMessages);
    }

    // 3. 当前消息
    if (input.current) {
      messages.push({
        role: "user",
        content: input.current,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    }

    return messages;
  }

  /**
   * 验证输入数据
   */
  validate(input: StandardInput): boolean {
    // 角色是必需的
    if (!input.role || input.role.trim().length === 0) {
      return false;
    }

    // 至少需要提供role或current之一
    if (!input.current && !input.conversation) {
      console.warn('建议提供current或conversation以获得更好的效果');
    }

    return true;
  }

  /**
   * 估算token数量
   */
  estimateTokens(input: StandardInput): number {
    const formatted = this.format(input);
    // 简单估算：中文约2字符/token，英文约4字符/token
    const chineseChars = (formatted.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishChars = (formatted.match(/[a-zA-Z]/g) || []).length;

    return Math.ceil(chineseChars / 2) + Math.ceil(englishChars / 4);
  }

  /**
   * 格式化角色信息（增强版）
   */
  private formatRole(role: string, legalContext?: Partial<LegalEducationContextData>): string {
    let roleContent = `<role>\n${role}`;

    if (legalContext?.educationLevel) {
      roleContent += `\n\n学生水平：${this.translateEducationLevel(legalContext.educationLevel)}`;
    }

    if (legalContext?.legalDomain && legalContext.legalDomain.length > 0) {
      roleContent += `\n法律领域：${legalContext.legalDomain.join('、')}`;
    }

    if (legalContext?.teachingMode) {
      roleContent += `\n教学模式：${this.translateTeachingMode(legalContext.teachingMode)}`;
    }

    roleContent += '\n</role>';
    return roleContent;
  }

  /**
   * 格式化工具列表（法学教育优化）
   */
  private formatTools(tools: string[]): string {
    const enhancedTools = tools.map(tool => {
      // 为法学工具添加描述
      const descriptions: { [key: string]: string } = {
        '法条查询': '查询相关法律条文和司法解释',
        '案例检索': '检索相关判例和案例分析',
        '逻辑推理': '进行法律逻辑推理和论证',
        '时间轴构建': '构建案件事实时间线',
        '争议焦点分析': '识别和分析法律争议焦点',
        '证据分析': '分析证据的证明力和关联性',
        '请求权分析': '分析当事人的请求权基础'
      };

      const description = descriptions[tool];
      return description ? `${tool}：${description}` : tool;
    });

    return `<tools>\n${enhancedTools.join('\n')}\n</tools>`;
  }

  /**
   * 格式化对话历史
   */
  private formatConversation(conversation: string | string[]): string {
    const content = Array.isArray(conversation) ? conversation.join('\n') : conversation;
    return `<conversation>\n${content}\n</conversation>`;
  }

  /**
   * 格式化当前消息
   */
  private formatCurrent(current: string): string {
    return `<current>\n${current}\n</current>`;
  }

  /**
   * 格式化法学上下文
   */
  private formatLegalContext(context: Partial<LegalEducationContextData>): string {
    const parts: string[] = [];

    if (context.caseInfo) {
      parts.push('<case-info>');
      if (context.caseInfo.caseNumber) parts.push(`案号：${context.caseInfo.caseNumber}`);
      if (context.caseInfo.court) parts.push(`法院：${context.caseInfo.court}`);
      if (context.caseInfo.date) parts.push(`日期：${context.caseInfo.date}`);
      if (context.caseInfo.caseType) parts.push(`案件类型：${context.caseInfo.caseType}`);
      parts.push('</case-info>');
    }

    if (context.focusAreas && context.focusAreas.length > 0) {
      parts.push(`<focus-areas>\n${context.focusAreas.join('\n')}\n</focus-areas>`);
    }

    if (context.documentType) {
      parts.push(`<document-type>${this.translateDocumentType(context.documentType)}</document-type>`);
    }

    return parts.length > 0 ? `<legal-context>\n${parts.join('\n')}\n</legal-context>` : '';
  }

  /**
   * 解析对话历史为消息数组
   */
  private parseConversation(conversation: string | string[]): AIMessage[] {
    const content = Array.isArray(conversation) ? conversation.join('\n') : conversation;
    const messages: AIMessage[] = [];

    // 简单解析：寻找角色标识符
    const lines = content.split('\n');
    let currentRole: 'user' | 'assistant' = 'user';
    let currentContent = '';

    for (const line of lines) {
      if (line.startsWith('用户:') || line.startsWith('user:') || line.startsWith('学生:')) {
        if (currentContent.trim()) {
          messages.push({
            role: currentRole,
            content: currentContent.trim()
          });
        }
        currentRole = 'user';
        currentContent = line.replace(/^(用户:|user:|学生:)\s*/, '');
      } else if (line.startsWith('助手:') || line.startsWith('assistant:') || line.startsWith('教师:')) {
        if (currentContent.trim()) {
          messages.push({
            role: currentRole,
            content: currentContent.trim()
          });
        }
        currentRole = 'assistant';
        currentContent = line.replace(/^(助手:|assistant:|教师:)\s*/, '');
      } else {
        currentContent += (currentContent ? '\n' : '') + line;
      }
    }

    // 添加最后一条消息
    if (currentContent.trim()) {
      messages.push({
        role: currentRole,
        content: currentContent.trim()
      });
    }

    return messages;
  }

  /**
   * 翻译教育水平
   */
  private translateEducationLevel(level: string): string {
    const translations: { [key: string]: string } = {
      'undergraduate': '本科生',
      'graduate': '研究生',
      'professional': '法律专业人员'
    };
    return translations[level] || level;
  }

  /**
   * 翻译教学模式
   */
  private translateTeachingMode(mode: string): string {
    const translations: { [key: string]: string } = {
      'socratic': '苏格拉底式对话',
      'analysis': '案例分析',
      'extraction': '要素提取',
      'timeline': '时间轴分析',
      'summary': '总结提升'
    };
    return translations[mode] || mode;
  }

  /**
   * 翻译文档类型
   */
  private translateDocumentType(type: string): string {
    const translations: { [key: string]: string } = {
      'judgment': '判决书',
      'contract': '合同',
      'statute': '法条',
      'case-brief': '案例简报',
      'academic': '学术文档'
    };
    return translations[type] || type;
  }
}