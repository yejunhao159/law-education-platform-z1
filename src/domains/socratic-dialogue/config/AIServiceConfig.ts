/**
 * AI服务配置管理
 * 统一管理多AI提供商配置、负载均衡、成本控制等
 * DeepPractice Standards Compliant
 */

// 移除对已删除的DeeChatAIClient的依赖
export interface DeeChatConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string;
}

export interface AIProviderConfig {
  provider: 'deepseek' | 'openai' | 'claude';
  apiKey: string;
  apiUrl?: string;
  model: string;
  priority: number; // 1最高优先级
  maxContextTokens: number;
  costThreshold: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  availability: {
    enabled: boolean;
    healthCheckUrl?: string;
    lastCheck?: Date;
    status: 'healthy' | 'degraded' | 'offline';
  };
}

export interface AIServiceGlobalConfig {
  // 全局设置
  enableLoadBalancing: boolean;
  enableCostOptimization: boolean;
  enableFallback: boolean;
  fallbackToRuleEngine: boolean;

  // 性能控制
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;

  // 成本控制
  globalCostThreshold: number; // 总成本阈值
  dailyCostLimit: number;
  alertThreshold: number;

  // 质量控制
  temperature: number;
  maxQuestionLength: number;
  enableStreaming: boolean;

  // 监控设置
  enableAnalytics: boolean;
  analyticsRetentionDays: number;
  enablePerformanceLogging: boolean;
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'weighted' | 'cost-optimized' | 'performance-based';
  weights?: Record<string, number>;
  cooldownPeriod: number; // 失败后的冷却时间（毫秒）
}

export class AIServiceConfigManager {
  private providers: Map<string, AIProviderConfig> = new Map();
  private globalConfig: AIServiceGlobalConfig;
  private loadBalancing: LoadBalancingStrategy;
  private currentProviderIndex = 0;
  private failedProviders: Set<string> = new Set();
  private lastHealthCheck = new Date();

  constructor(
    providers: AIProviderConfig[] = [],
    globalConfig?: Partial<AIServiceGlobalConfig>,
    loadBalancing?: Partial<LoadBalancingStrategy>
  ) {
    // 注册提供商
    providers.forEach(provider => {
      this.providers.set(provider.provider, provider);
    });

    // 如果没有配置提供商，使用默认配置
    if (providers.length === 0) {
      this.initializeDefaultProviders();
    }

    // 全局配置
    this.globalConfig = {
      enableLoadBalancing: true,
      enableCostOptimization: true,
      enableFallback: true,
      fallbackToRuleEngine: true,
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      globalCostThreshold: 0.50, // 50美分
      dailyCostLimit: 5.00, // 5美元/天
      alertThreshold: 0.80, // 80%阈值时告警
      temperature: 0.7,
      maxQuestionLength: 1000,
      enableStreaming: true,
      enableAnalytics: true,
      analyticsRetentionDays: 30,
      enablePerformanceLogging: true,
      ...globalConfig
    };

    // 负载均衡策略
    this.loadBalancing = {
      type: 'cost-optimized',
      cooldownPeriod: 300000, // 5分钟
      ...loadBalancing
    };
  }

  /**
   * 初始化默认AI提供商配置
   */
  private initializeDefaultProviders() {
    const defaultProviders: AIProviderConfig[] = [
      {
        provider: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        model: 'deepseek-chat',
        priority: 1,
        maxContextTokens: 8000,
        costThreshold: 0.01,
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 100000
        },
        availability: {
          enabled: true,
          status: 'healthy'
        }
      },
      {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4o-mini',
        priority: 2,
        maxContextTokens: 16000,
        costThreshold: 0.05,
        rateLimit: {
          requestsPerMinute: 30,
          tokensPerMinute: 50000
        },
        availability: {
          enabled: Boolean(process.env.OPENAI_API_KEY),
          status: 'healthy'
        }
      },
      {
        provider: 'claude',
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: 'claude-3-haiku-20240307',
        priority: 3,
        maxContextTokens: 8000,
        costThreshold: 0.03,
        rateLimit: {
          requestsPerMinute: 30,
          tokensPerMinute: 40000
        },
        availability: {
          enabled: Boolean(process.env.ANTHROPIC_API_KEY),
          status: 'healthy'
        }
      }
    ];

    defaultProviders.forEach(provider => {
      this.providers.set(provider.provider, provider);
    });
  }

  /**
   * 获取最优AI提供商
   */
  getOptimalProvider(): AIProviderConfig | null {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.availability.enabled && p.availability.status !== 'offline')
      .filter(p => !this.failedProviders.has(p.provider))
      .sort((a, b) => a.priority - b.priority);

    if (availableProviders.length === 0) {
      return null;
    }

    switch (this.loadBalancing.type) {
      case 'round-robin':
        return this.getRoundRobinProvider(availableProviders);

      case 'weighted':
        return this.getWeightedProvider(availableProviders);

      case 'cost-optimized':
        return this.getCostOptimizedProvider(availableProviders);

      case 'performance-based':
        return this.getPerformanceBasedProvider(availableProviders);

      default:
        return availableProviders[0];
    }
  }

  /**
   * 获取备用提供商
   */
  getFallbackProvider(excludeProvider?: string): AIProviderConfig | null {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.availability.enabled && p.availability.status !== 'offline')
      .filter(p => p.provider !== excludeProvider)
      .filter(p => !this.failedProviders.has(p.provider))
      .sort((a, b) => a.priority - b.priority);

    return availableProviders[0] || null;
  }

  /**
   * 轮询选择提供商
   */
  private getRoundRobinProvider(providers: AIProviderConfig[]): AIProviderConfig {
    const provider = providers[this.currentProviderIndex % providers.length];
    this.currentProviderIndex++;
    return provider;
  }

  /**
   * 加权选择提供商
   */
  private getWeightedProvider(providers: AIProviderConfig[]): AIProviderConfig {
    if (!this.loadBalancing.weights) {
      return providers[0];
    }

    const totalWeight = providers.reduce((sum, p) =>
      sum + (this.loadBalancing.weights![p.provider] || 1), 0);

    let random = Math.random() * totalWeight;

    for (const provider of providers) {
      const weight = this.loadBalancing.weights[provider.provider] || 1;
      random -= weight;
      if (random <= 0) {
        return provider;
      }
    }

    return providers[0];
  }

  /**
   * 成本优化选择
   */
  private getCostOptimizedProvider(providers: AIProviderConfig[]): AIProviderConfig {
    return providers.sort((a, b) => a.costThreshold - b.costThreshold)[0];
  }

  /**
   * 性能优化选择
   */
  private getPerformanceBasedProvider(providers: AIProviderConfig[]): AIProviderConfig {
    // 简单实现：按优先级选择，未来可集成性能数据
    return providers[0];
  }

  /**
   * 创建DeeChat配置
   */
  createDeeChatConfig(providerConfig: AIProviderConfig): DeeChatConfig {
    return {
      provider: providerConfig.provider,
      apiKey: providerConfig.apiKey,
      apiUrl: providerConfig.apiUrl,
      model: providerConfig.model,
      maxContextTokens: providerConfig.maxContextTokens,
      reserveTokens: 100,
      costThreshold: providerConfig.costThreshold,
      temperature: this.globalConfig.temperature,
      enableStreaming: this.globalConfig.enableStreaming,
      enableCostOptimization: this.globalConfig.enableCostOptimization
    };
  }

  /**
   * 标记提供商失败
   */
  markProviderFailed(provider: string) {
    this.failedProviders.add(provider);

    // 设置冷却定时器
    setTimeout(() => {
      this.failedProviders.delete(provider);
    }, this.loadBalancing.cooldownPeriod);

    // 更新提供商状态
    const providerConfig = this.providers.get(provider);
    if (providerConfig) {
      providerConfig.availability.status = 'degraded';
    }
  }

  /**
   * 恢复提供商
   */
  markProviderHealthy(provider: string) {
    this.failedProviders.delete(provider);

    const providerConfig = this.providers.get(provider);
    if (providerConfig) {
      providerConfig.availability.status = 'healthy';
      providerConfig.availability.lastCheck = new Date();
    }
  }

  /**
   * 健康检查
   */
  async performHealthCheck(): Promise<void> {
    const now = new Date();

    for (const [name, provider] of Array.from(this.providers.entries())) {
      if (!provider.availability.enabled) continue;

      try {
        // 简单的API可用性检查
        if (provider.availability.healthCheckUrl) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(provider.availability.healthCheckUrl, {
            method: 'HEAD',
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            this.markProviderHealthy(name);
          } else {
            this.markProviderFailed(name);
          }
        } else {
          // 如果没有健康检查URL，检查API密钥
          if (provider.apiKey) {
            this.markProviderHealthy(name);
          } else {
            provider.availability.status = 'offline';
          }
        }
      } catch (error) {
        this.markProviderFailed(name);
      }
    }

    this.lastHealthCheck = now;
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    return {
      providers: Array.from(this.providers.entries()).map(([name, config]) => ({
        name,
        status: config.availability.status,
        enabled: config.availability.enabled,
        priority: config.priority,
        lastCheck: config.availability.lastCheck
      })),
      failedProviders: Array.from(this.failedProviders),
      globalConfig: this.globalConfig,
      loadBalancing: this.loadBalancing,
      lastHealthCheck: this.lastHealthCheck
    };
  }

  /**
   * 更新全局配置
   */
  updateGlobalConfig(updates: Partial<AIServiceGlobalConfig>) {
    this.globalConfig = { ...this.globalConfig, ...updates };
  }

  /**
   * 更新负载均衡策略
   */
  updateLoadBalancingStrategy(strategy: Partial<LoadBalancingStrategy>) {
    this.loadBalancing = { ...this.loadBalancing, ...strategy };
  }

  /**
   * 添加或更新提供商
   */
  upsertProvider(config: AIProviderConfig) {
    this.providers.set(config.provider, config);
  }

  /**
   * 移除提供商
   */
  removeProvider(provider: string) {
    this.providers.delete(provider);
    this.failedProviders.delete(provider);
  }

  /**
   * 获取所有提供商配置
   */
  getAllProviders(): AIProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取全局配置
   */
  getGlobalConfig(): AIServiceGlobalConfig {
    return { ...this.globalConfig };
  }
}

// 默认配置管理器实例
export const defaultAIServiceConfig = new AIServiceConfigManager();

// 配置工厂函数
export function createAIServiceConfig(
  providers?: AIProviderConfig[],
  globalConfig?: Partial<AIServiceGlobalConfig>,
  loadBalancing?: Partial<LoadBalancingStrategy>
): AIServiceConfigManager {
  return new AIServiceConfigManager(providers, globalConfig, loadBalancing);
}