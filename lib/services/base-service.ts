/**
 * AI服务基础抽象类
 * 提供统一的服务接口，支持同步和流式响应
 */

export interface ServiceConfig {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    model: string;
    processingTime: number;
    tokensUsed?: number;
  };
}

/**
 * AI服务基类
 */
export abstract class BaseAIService {
  protected config: ServiceConfig;
  
  constructor(config: ServiceConfig = {}) {
    this.config = {
      temperature: 0.3,
      maxTokens: 2000,
      ...config
    };
  }
  
  /**
   * 同步分析
   */
  abstract analyze<T>(prompt: string, options?: any): Promise<ServiceResponse<T>>;
  
  /**
   * 流式响应
   */
  abstract stream(prompt: string, options?: any): AsyncGenerator<any>;
  
  /**
   * 批量处理
   */
  async batch<T>(prompts: string[], options?: any): Promise<ServiceResponse<T>[]> {
    return Promise.all(prompts.map(p => this.analyze<T>(p, options)));
  }
  
  /**
   * 健康检查
   */
  abstract healthCheck(): Promise<boolean>;
}

/**
 * 服务工厂
 */
export class AIServiceFactory {
  private static services = new Map<string, BaseAIService>();
  
  /**
   * 注册服务
   */
  static register(name: string, service: BaseAIService): void {
    this.services.set(name, service);
    console.log(`✅ 注册AI服务: ${name}`);
  }
  
  /**
   * 获取服务
   */
  static get(name: string): BaseAIService {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`未找到AI服务: ${name}`);
    }
    return service;
  }
  
  /**
   * 获取默认服务
   */
  static getDefault(): BaseAIService {
    return this.get('deepseek');
  }
  
  /**
   * 列出所有服务
   */
  static list(): string[] {
    return Array.from(this.services.keys());
  }
}