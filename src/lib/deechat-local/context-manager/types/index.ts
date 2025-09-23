/**
 * DeeChat Context Manager - 法学教育平台增强版本
 * 在原始功能基础上添加法学教育特有的上下文管理能力
 */

// 基础类型
export interface ContextData {
  /** 角色定义（必需） */
  role: string;
  /** 工具列表（可选） */
  tools?: string[];
  /** 对话历史（可选） */
  conversation?: string | string[];
  /** 当前消息（可选） */
  current?: string;
}

/**
 * AI 生态标准角色类型
 */
export type AIRole = "system" | "user" | "assistant" | "tool";

/**
 * AI 消息对象 - 兼容 OpenAI、Anthropic、DeepSeek 等主流 AI 服务
 */
export interface AIMessage {
  /** 消息角色 */
  role: AIRole;
  /** 消息内容 */
  content: string;
  /** 可选元数据 */
  metadata?: {
    timestamp?: string;
    tokenCount?: number;
    [key: string]: any;
  };
}

// 法学教育平台增强类型

/**
 * 法学教育上下文数据 - 扩展基础ContextData
 */
export interface LegalEducationContextData extends ContextData {
  /** 案例信息 */
  caseInfo?: {
    caseNumber?: string;
    court?: string;
    date?: string;
    parties?: string[];
    caseType?: string;
  };
  /** 法律领域 */
  legalDomain?: string[]; // 民法、刑法、商法等
  /** 教学等级 */
  educationLevel?: 'undergraduate' | 'graduate' | 'professional';
  /** 教学模式 */
  teachingMode?: 'socratic' | 'analysis' | 'extraction' | 'timeline' | 'summary';
  /** 文档类型 */
  documentType?: 'judgment' | 'contract' | 'statute' | 'case-brief' | 'academic';
  /** 分析焦点 */
  focusAreas?: string[]; // 争议焦点、法律适用、证据分析等
  /** 学生信息 */
  studentContext?: {
    level: 'beginner' | 'intermediate' | 'advanced';
    previousKnowledge?: string[];
    learningObjectives?: string[];
  };
}

/**
 * 苏格拉底对话特有上下文
 */
export interface SocraticDialogueContext extends LegalEducationContextData {
  /** 对话历史 */
  dialogueHistory?: SocraticMessage[];
  /** 当前教学目标 */
  currentObjective?: string;
  /** 引导策略 */
  guidanceStrategy?: 'questioning' | 'challenging' | 'clarifying' | 'synthesizing';
  /** 难度等级 */
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * 苏格拉底对话消息
 */
export interface SocraticMessage extends AIMessage {
  /** 消息类型 */
  messageType: 'question' | 'response' | 'guidance' | 'feedback';
  /** 教学意图 */
  pedagogicalIntent?: string;
  /** 相关法条或案例 */
  legalReference?: string[];
}

/**
 * 法律分析上下文
 */
export interface LegalAnalysisContext extends LegalEducationContextData {
  /** 分析类型 */
  analysisType: 'facts' | 'evidence' | 'reasoning' | 'timeline' | 'claims';
  /** 已分析内容 */
  analyzedContent?: {
    facts?: string[];
    evidence?: string[];
    disputes?: string[];
    timeline?: Array<{ date: string; event: string; significance: string }>;
  };
  /** 分析深度 */
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
}

/**
 * 模板接口 - 法学教育增强版
 */
export interface ContextTemplate<TInput = any> {
  /** 模板唯一标识 */
  readonly id: string;
  /** 模板名称 */
  readonly name: string;
  /** 模板描述 */
  readonly description: string;
  /** 适用场景 */
  readonly scenarios?: string[];
  /** 支持的教学模式 */
  readonly supportedModes?: string[];

  /** 将特定输入转换为标准的 ContextData */
  build(input: TInput): ContextData;
  /** 将特定输入直接构建为 AI 消息数组 */
  buildMessages(input: TInput): AIMessage[];
  /** 验证输入数据的有效性 */
  validate?(input: TInput): boolean;
  /** 获取模板的token估算 */
  estimateTokens?(input: TInput): number;
}

/**
 * 法学教育专用模板接口
 */
export interface LegalEducationTemplate<TInput = any> extends ContextTemplate<TInput> {
  /** 构建法学教育增强上下文 */
  buildLegalContext(input: TInput): LegalEducationContextData;
  /** 生成教学反馈 */
  generateFeedback?(input: TInput, response: string): string;
  /** 评估学习进度 */
  assessProgress?(dialogueHistory: AIMessage[]): {
    level: 'beginner' | 'intermediate' | 'advanced';
    strengths: string[];
    improvements: string[];
  };
}

/**
 * 模板管理器接口
 */
export interface TemplateManager {
  /** 注册模板 */
  register<T>(template: ContextTemplate<T>): void;
  /** 获取模板 */
  get<T>(id: string): ContextTemplate<T> | undefined;
  /** 列出所有模板 */
  list(): Array<{ id: string; name: string; description: string; scenarios?: string[] }>;
  /** 检查模板是否存在 */
  has(id: string): boolean;
  /** 移除模板 */
  unregister(id: string): boolean;
  /** 清空所有模板 */
  clear(): void;
  /** 按场景查找模板 */
  findByScenario?(scenario: string): ContextTemplate<any>[];
  /** 按教学模式查找模板 */
  findByMode?(mode: string): ContextTemplate<any>[];
}

/**
 * 上下文格式化器选项
 */
export interface FormatterOptions {
  /** 是否包含元数据 */
  includeMetadata?: boolean;
  /** 输出格式 */
  format?: 'xml' | 'json' | 'yaml' | 'markdown';
  /** 压缩输出 */
  compress?: boolean;
  /** 最大长度限制 */
  maxLength?: number;
  /** 是否启用token优化 */
  optimizeTokens?: boolean;
}

/**
 * 上下文构建结果
 */
export interface ContextBuildResult {
  /** 构建的消息数组 */
  messages: AIMessage[];
  /** 元数据信息 */
  metadata: {
    templateId: string;
    buildTime: number;
    tokenCount?: number;
    estimatedCost?: number;
  };
  /** 警告信息 */
  warnings?: string[];
  /** 优化建议 */
  suggestions?: string[];
}