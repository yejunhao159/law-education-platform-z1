/**
 * Context Formatter - 法学教育平台增强版
 * 模板驱动的AI消息数组生成器，针对法学教育场景优化
 */

import type {
  AIMessage,
  ContextTemplate,
  FormatterOptions,
  ContextBuildResult,
  LegalEducationContextData
} from "../types";
import { templateManager } from "./TemplateManager";
import { countTokens } from "../../token-calculator";

export class ContextFormatter {
  /**
   * 获取模板管理器
   */
  static get templates() {
    return templateManager;
  }

  /**
   * 使用模板构建AI消息数组 - 核心API（增强版）
   */
  static fromTemplateAsMessages<T>(
    templateId: string,
    input: T,
    options: FormatterOptions = {}
  ): ContextBuildResult {
    const startTime = Date.now();
    const template = templateManager.get(templateId);

    if (!template) {
      throw new Error(`Template '${templateId}' not found. Available templates: ${templateManager.list().map(t => t.id).join(', ')}`);
    }

    // 验证输入（如果模板支持）
    if (template.validate && !template.validate(input)) {
      throw new Error(`Invalid input for template '${templateId}'`);
    }

    // 构建消息数组
    const messages = template.buildMessages(input);

    // 优化处理
    const optimizedMessages = this.optimizeMessages(messages, options);

    // 计算token数量
    const tokenCount = this.calculateTokenCount(optimizedMessages);

    // 估算成本
    const estimatedCost = this.estimateCost(tokenCount);

    // 生成警告和建议
    const warnings = this.generateWarnings(optimizedMessages, options);
    const suggestions = this.generateSuggestions(optimizedMessages, tokenCount, options);

    const buildTime = Date.now() - startTime;

    return {
      messages: optimizedMessages,
      metadata: {
        templateId,
        buildTime,
        tokenCount,
        estimatedCost
      },
      warnings,
      suggestions
    };
  }

  /**
   * 格式化上下文数据为XML字符串 - 兼容原API（增强版）
   */
  static format(contextData: any, options: FormatterOptions = {}): string {
    const template = templateManager.get('standard');

    if (!template) {
      throw new Error('Standard template not found');
    }

    // 如果是 StandardTemplate，调用其 format 方法
    if ('format' in template) {
      const formatted = (template as any).format(contextData);

      if (options.optimizeTokens) {
        return this.optimizeXMLString(formatted);
      }

      return formatted;
    }

    throw new Error('Template does not support format method');
  }

  /**
   * 法学教育专用：构建苏格拉底对话上下文
   */
  static buildSocraticContext(input: {
    caseText: string;
    studentLevel: 'beginner' | 'intermediate' | 'advanced';
    currentTopic: string;
    dialogueHistory?: AIMessage[];
    focusAreas?: string[];
  }): ContextBuildResult {
    const socraticTemplate = templateManager.get('socratic-dialogue');

    if (!socraticTemplate) {
      // 如果没有专用模板，使用标准模板
      console.warn('Socratic dialogue template not found, using standard template');
      return this.fromTemplateAsMessages('standard', {
        role: this.buildSocraticRole(input.studentLevel, input.currentTopic),
        conversation: input.dialogueHistory?.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
        current: `当前案例：${input.caseText}\n\n请继续苏格拉底式引导教学。`,
        tools: ['法条查询', '案例分析', '逻辑推理']
      });
    }

    return this.fromTemplateAsMessages('socratic-dialogue', input);
  }

  /**
   * 法学教育专用：构建法律分析上下文
   */
  static buildLegalAnalysisContext(input: {
    documentText: string;
    analysisType: 'facts' | 'evidence' | 'reasoning' | 'timeline' | 'claims';
    depth: 'basic' | 'detailed' | 'comprehensive';
    priorAnalysis?: any;
  }): ContextBuildResult {
    const analysisTemplate = templateManager.get('legal-analysis');

    if (!analysisTemplate) {
      // 使用标准模板作为fallback
      return this.fromTemplateAsMessages('standard', {
        role: this.buildAnalysisRole(input.analysisType, input.depth),
        current: `请对以下${this.getAnalysisTypeDescription(input.analysisType)}进行${input.depth}分析：\n\n${input.documentText}`,
        tools: ['法条检索', '案例对比', '逻辑分析', '时间轴构建']
      });
    }

    return this.fromTemplateAsMessages('legal-analysis', input);
  }

  /**
   * 优化消息数组
   */
  private static optimizeMessages(messages: AIMessage[], options: FormatterOptions): AIMessage[] {
    if (!options.optimizeTokens) {
      return messages;
    }

    return messages.map(message => ({
      ...message,
      content: this.optimizeContent(message.content, options)
    }));
  }

  /**
   * 优化消息内容
   */
  private static optimizeContent(content: string, options: FormatterOptions): string {
    let optimized = content;

    // 移除多余空白
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // 压缩XML标签间的空白
    optimized = optimized.replace(/>\s+</g, '><');

    // 如果有长度限制
    if (options.maxLength && optimized.length > options.maxLength) {
      optimized = optimized.substring(0, options.maxLength - 3) + '...';
    }

    return optimized;
  }

  /**
   * 优化XML字符串
   */
  private static optimizeXMLString(xml: string): string {
    return xml
      .replace(/\s+/g, ' ') // 压缩空白
      .replace(/>\s+</g, '><') // 压缩标签间空白
      .trim();
  }

  /**
   * 计算token数量
   */
  private static calculateTokenCount(messages: AIMessage[]): number {
    const totalContent = messages.map(msg => msg.content).join('\n');
    return countTokens(totalContent, 'deepseek', 'deepseek-chat');
  }

  /**
   * 估算成本
   */
  private static estimateCost(tokenCount: number): number {
    // 基于DeepSeek定价: $1.4 per 1M input tokens
    const inputCost = (tokenCount / 1000000) * 1.4;
    // 假设输出token是输入的0.5倍
    const outputCost = (tokenCount * 0.5 / 1000000) * 2.8;
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * 生成警告信息
   */
  private static generateWarnings(messages: AIMessage[], options: FormatterOptions): string[] {
    const warnings: string[] = [];

    // 检查消息长度
    const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    if (totalLength > 50000) {
      warnings.push(`消息总长度过长 (${totalLength} 字符)，可能影响AI响应质量`);
    }

    // 检查系统消息数量
    const systemMessages = messages.filter(msg => msg.role === 'system');
    if (systemMessages.length > 3) {
      warnings.push(`系统消息过多 (${systemMessages.length} 条)，建议合并`);
    }

    // 检查对话历史长度
    const conversationMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
    if (conversationMessages.length > 20) {
      warnings.push(`对话历史过长 (${conversationMessages.length} 轮)，建议进行上下文压缩`);
    }

    return warnings;
  }

  /**
   * 生成优化建议
   */
  private static generateSuggestions(
    messages: AIMessage[],
    tokenCount: number,
    options: FormatterOptions
  ): string[] {
    const suggestions: string[] = [];

    // Token使用建议
    if (tokenCount > 8000) {
      suggestions.push('Token使用量较高，建议启用上下文压缩或使用更大上下文的模型');
    }

    // 优化建议
    if (!options.optimizeTokens) {
      suggestions.push('启用token优化可以减少30-50%的token使用量');
    }

    // 模板选择建议
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage && systemMessage.content.length > 2000) {
      suggestions.push('考虑使用更精简的模板或将系统提示分解为多个部分');
    }

    return suggestions;
  }

  /**
   * 构建苏格拉底对话角色提示
   */
  private static buildSocraticRole(level: string, topic: string): string {
    const levelDescriptions = {
      beginner: '初学者水平，需要基础概念引导',
      intermediate: '中级水平，可以进行深入讨论',
      advanced: '高级水平，需要挑战性思考'
    };

    return `你是一位优秀的法学教授，正在使用苏格拉底式教学法指导${levelDescriptions[level as keyof typeof levelDescriptions]}的学生学习"${topic}"。

请遵循以下教学原则：
1. 通过问题引导学生思考，而不是直接给出答案
2. 根据学生回答调整问题难度和深度
3. 鼓励学生发现法律条文之间的逻辑关系
4. 当学生回答错误时，用引导性问题帮助其发现问题
5. 适时提供法理依据和实务经验

你的回应应该：
- 简洁明了，避免冗长的解释
- 包含启发性问题
- 结合具体的法条和案例
- 体现法学思维的严谨性`;
  }

  /**
   * 构建法律分析角色提示
   */
  private static buildAnalysisRole(analysisType: string, depth: string): string {
    const typeDescriptions = {
      facts: '事实梳理和认定',
      evidence: '证据收集和质证',
      reasoning: '法理分析和推理',
      timeline: '时间轴构建和分析',
      claims: '请求权分析和论证'
    };

    const depthDescriptions = {
      basic: '基础层面',
      detailed: '详细深入',
      comprehensive: '全面综合'
    };

    return `你是一位资深的法律分析专家，专门负责${typeDescriptions[analysisType as keyof typeof typeDescriptions]}。

请按照${depthDescriptions[depth as keyof typeof depthDescriptions]}的要求进行分析，确保：
1. 逻辑清晰，层次分明
2. 引用准确的法条和判例
3. 分析客观中立，避免主观臆断
4. 突出关键争议点和法律适用难点
5. 提供实务操作建议

分析结果应包含：
- 核心要点总结
- 详细分析过程
- 相关法条引用
- 风险提示和建议`;
  }

  /**
   * 获取分析类型描述
   */
  private static getAnalysisTypeDescription(type: string): string {
    const descriptions = {
      facts: '法律事实',
      evidence: '证据材料',
      reasoning: '法理推理',
      timeline: '案件时间轴',
      claims: '当事人请求权'
    };

    return descriptions[type as keyof typeof descriptions] || '法律文档';
  }

  /**
   * 批量构建上下文（用于大量文档处理）
   */
  static batchBuild<T>(
    templateId: string,
    inputs: T[],
    options: FormatterOptions = {}
  ): ContextBuildResult[] {
    return inputs.map(input =>
      this.fromTemplateAsMessages(templateId, input, options)
    );
  }

  /**
   * 获取模板使用统计
   */
  static getUsageStats(): {
    totalTemplates: number;
    mostUsedTemplate?: string;
    recommendations: string[];
  } {
    const templates = templateManager.list();
    return {
      totalTemplates: templates.length,
      mostUsedTemplate: 'standard', // 可以从实际使用中统计
      recommendations: [
        '建议为常用场景创建专用模板',
        '定期检查和优化模板性能',
        '考虑启用token优化以降低成本'
      ]
    };
  }
}