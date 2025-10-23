/**
 * MCP工具集成类型定义
 * 预留MCP工具调用接口
 */

/**
 * MCP工具定义
 */
export interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: 'memory' | 'search' | 'analysis' | 'reasoning';

  // 工具能力
  capabilities: {
    canRead: boolean;
    canWrite: boolean;
    needsApproval: boolean;  // 是否需要用户批准
  };

  // 参数定义
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  // 执行器
  execute: (input: any) => Promise<any>;
}

/**
 * MCP工具注册表
 */
export interface MCPRegistry {
  // 已注册的工具
  tools: Map<string, MCPTool>;

  // 注册新工具
  register: (tool: MCPTool) => void;

  // 获取工具
  get: (toolId: string) => MCPTool | undefined;

  // 按类别获取工具
  getByCategory: (category: MCPTool['category']) => MCPTool[];

  // 执行工具
  execute: (toolId: string, input: any) => Promise<any>;
}

/**
 * 预定义的MCP工具ID（未来集成）
 */
export enum KnownMCPTools {
  // Knowledge Graph Memory
  MEMORY_CREATE_ENTITY = 'memory:create-entity',
  MEMORY_CREATE_RELATION = 'memory:create-relation',
  MEMORY_SEARCH = 'memory:search',

  // ChromaDB
  CHROMA_ADD_DOCUMENT = 'chroma:add-document',
  CHROMA_QUERY = 'chroma:query',

  // Sequential Thinking
  SEQUENTIAL_THINK = 'sequential:think',

  // Tavily Search
  TAVILY_SEARCH = 'tavily:search',
}

/**
 * MCP工具配置
 */
export interface MCPConfig {
  // Knowledge Graph Memory配置
  memory?: {
    enabled: boolean;
    storagePath: string;
  };

  // ChromaDB配置
  chroma?: {
    enabled: boolean;
    clientType: 'persistent' | 'http';
    path?: string;
    host?: string;
    port?: number;
  };

  // Sequential Thinking配置
  sequentialThinking?: {
    enabled: boolean;
  };

  // Tavily配置
  tavily?: {
    enabled: boolean;
    apiKey?: string;
  };
}
