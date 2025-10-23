/**
 * 合同智能体类型定义
 */

/**
 * 对话消息
 */
export interface ContractMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;

  // 扩展字段
  metadata?: {
    clauseId?: string;        // 关联的条款ID
    riskId?: string;          // 关联的风险ID
    toolCalls?: ToolCall[];   // MCP工具调用记录
  };
}

/**
 * MCP工具调用记录
 */
export interface ToolCall {
  toolId: string;             // 工具ID
  toolName: string;           // 工具名称
  input: Record<string, any>; // 输入参数
  output?: any;               // 输出结果
  status: 'pending' | 'success' | 'error';
  error?: string;
  timestamp: Date;
}

/**
 * 智能体对话请求
 */
export interface AgentRequest {
  // 基础信息
  sessionId: string;
  userId?: string;

  // 对话上下文
  messages: ContractMessage[];
  currentQuery: string;

  // 合同上下文
  contractContext: {
    contractId: string;
    contractText: string;
    parsedContract?: any;     // ParsedContract
    currentClause?: string;   // 当前聚焦的条款
    risks?: any[];            // 已识别的风险
  };

  // 配置
  config?: {
    enableMCP?: boolean;      // 是否启用MCP工具
    maxTokens?: number;
    temperature?: number;
    streaming?: boolean;
  };
}

/**
 * 智能体响应
 */
export interface AgentResponse {
  messageId: string;
  content: string;

  // 建议
  suggestions?: {
    quickReplies?: string[];  // 快捷回复
    relatedClauses?: string[]; // 相关条款
    actions?: AgentAction[];   // 可执行动作
  };

  // MCP工具调用结果
  toolCalls?: ToolCall[];

  // 元数据
  metadata: {
    tokensUsed: number;
    cost: number;
    duration: number;
  };
}

/**
 * 智能体可执行的动作
 */
export interface AgentAction {
  id: string;
  type: 'navigate' | 'highlight' | 'explain' | 'compare';
  label: string;
  description?: string;
  payload: Record<string, any>;
}

/**
 * 对话会话
 */
export interface ConversationSession {
  id: string;
  contractId: string;
  userId?: string;
  messages: ContractMessage[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
}
