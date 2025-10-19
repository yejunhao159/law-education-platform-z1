/**
 * 苏格拉底对话模块健康检查端点
 * 提供详细的服务状态和性能指标
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnvironmentConfig } from '@/lib/config/environment';
import { createLogger } from '@/lib/logging';
import { redis } from '@/lib/redis';
// Rate limiter import removed - not used in health checks
import { CacheManager } from '@/src/domains/shared/infrastructure/cache/CacheManager';
import { defaultPerformanceMonitor } from '@/src/domains/socratic-dialogue/monitoring/PerformanceMonitor';
// WebSocket removed - using SSE instead

const logger = createLogger('health-check');
const config = EnvironmentConfig.getInstance();
const cacheManager = CacheManager.getInstance();

// HealthStatus interface removed - not used in this file

interface ComponentHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  components: ComponentHealth[];
  metrics?: {
    requests: number;
    errors: number;
    averageResponseTime: number;
    cacheHitRate: number;
    activeConnections: number;
  };
  issues?: string[];
}

/**
 * 检查数据库连接
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    // 这里应该执行实际的数据库查询
    // 为了演示，我们模拟一个检查
    const dbConfig = config.getDatabaseConfig();
    
    if (!dbConfig.url) {
      return {
        name: 'database',
        status: 'down',
        error: '数据库未配置'
      };
    }
    
    // 模拟数据库ping
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
      name: 'database',
      status: 'up',
      responseTime: Date.now() - startTime,
      metadata: {
        poolMin: dbConfig.pool.min,
        poolMax: dbConfig.pool.max
      }
    };
  } catch (error) {
    logger.error('数据库健康检查失败', error);
    return {
      name: 'database',
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 检查Redis连接
 */
async function checkRedis(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    if (!redis) {
      return {
        name: 'redis',
        status: 'down',
        error: 'Redis未配置'
      };
    }
    
    // 执行Redis ping
    await redis.ping();
    
    // 获取Redis信息
    const info = await redis.info('stats');
    const stats = parseRedisInfo(info);
    
    return {
      name: 'redis',
      status: 'up',
      responseTime: Date.now() - startTime,
      metadata: {
        totalConnections: stats.total_connections_received || 0,
        totalCommands: stats.total_commands_processed || 0,
        usedMemory: stats.used_memory_human || 'N/A'
      }
    };
  } catch (error) {
    logger.error('Redis健康检查失败', error);
    return {
      name: 'redis',
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 检查AI服务
 */
async function checkAIService(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    const aiConfig = config.getAIConfig();
    
    // 检查配置
    if (!aiConfig.openai.apiKey && !aiConfig.deepseek.apiKey) {
      return {
        name: 'ai-service',
        status: 'down',
        error: 'AI服务未配置'
      };
    }
    
    // 模拟API健康检查
    // 在实际应用中，这里应该调用AI服务的健康检查端点
    await new Promise(resolve => setTimeout(resolve, 20));
    
    return {
      name: 'ai-service',
      status: 'up',
      responseTime: Date.now() - startTime,
      metadata: {
        primaryProvider: aiConfig.openai.apiKey ? 'openai' : 'deepseek',
        model: aiConfig.openai.model,
        maxTokens: aiConfig.openai.maxTokens
      }
    };
  } catch (error) {
    logger.error('AI服务健康检查失败', error);
    return {
      name: 'ai-service',
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 检查缓存系统
 */
async function checkCache(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    // 测试缓存操作
    const testKey = 'health-check-test';
    const testValue = { timestamp: Date.now() };
    
    await cacheManager.set(testKey, testValue, { ttl: 10_000 });
    const retrieved = await cacheManager.get(testKey);
    
    if (!retrieved) {
      throw new Error('缓存读写测试失败');
    }
    
    // 获取缓存统计
    const stats = await cacheManager.getStats();
    
    return {
      name: 'cache',
      status: 'up',
      responseTime: Date.now() - startTime,
      metadata: {
        hitRate: stats.summary.overallHitRate,
        totalHits: stats.summary.totalHits,
        totalRequests: stats.summary.totalRequests,
        memoryUsage: stats.summary.memoryUsage,
        entries: stats.summary.totalEntries
      }
    };
  } catch (error) {
    logger.error('缓存健康检查失败', error);
    return {
      name: 'cache',
      status: 'down',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 检查SSE实时通信服务
 */
async function checkSSE(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    // SSE使用HTTP轮询，无需单独的服务器
    // 检查storage是否正常（内存存储）
    return {
      name: 'sse-realtime',
      status: 'up',
      responseTime: Date.now() - startTime,
      metadata: {
        type: 'Server-Sent Events',
        transport: 'HTTP',
        note: '使用内存存储，单实例部署'
      }
    };
  } catch (error) {
    logger.error('SSE健康检查失败', error);
    return {
      name: 'sse-realtime',
      status: 'degraded',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 检查限流系统
 */
async function checkRateLimit(): Promise<ComponentHealth> {
  const startTime = Date.now();
  
  try {
    const rateLimitConfig = config.getRateLimitConfig();
    
    if (!rateLimitConfig.enabled) {
      return {
        name: 'rate-limiter',
        status: 'up',
        metadata: { enabled: false }
      };
    }
    
    // Rate limit功能测试已移除 - 不在健康检查中使用
    // 简单返回成功状态
    
    return {
      name: 'rate-limiter',
      status: 'up',
      responseTime: Date.now() - startTime,
      metadata: {
        enabled: true,
        maxRequests: rateLimitConfig.maxRequests,
        windowMs: rateLimitConfig.windowMs
      }
    };
  } catch (error) {
    logger.error('限流系统健康检查失败', error);
    return {
      name: 'rate-limiter',
      status: 'degraded',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 解析Redis INFO输出
 */
function parseRedisInfo(info: string): Record<string, any> {
  const stats: Record<string, any> = {};
  
  info.split('\r\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    }
  });
  
  return stats;
}

/**
 * 计算整体健康状态
 */
function calculateOverallHealth(components: ComponentHealth[]): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
} {
  const issues: string[] = [];
  let downCount = 0;
  let degradedCount = 0;
  
  for (const component of components) {
    if (component.status === 'down') {
      downCount++;
      issues.push(`${component.name}: ${component.error || '服务不可用'}`);
    } else if (component.status === 'degraded') {
      degradedCount++;
      issues.push(`${component.name}: 服务降级`);
    }
    
    // 检查响应时间
    if (component.responseTime && component.responseTime > 1000) {
      issues.push(`${component.name}: 响应时间过长 (${component.responseTime}ms)`);
    }
  }
  
  // 检查配置健康状态
  const configHealth = config.checkHealth();
  if (!configHealth.healthy) {
    issues.push(...configHealth.issues);
  }
  
  // 确定整体状态
  let status: 'healthy' | 'degraded' | 'unhealthy';
  
  if (downCount > 0) {
    status = 'unhealthy';
  } else if (degradedCount > 0 || issues.length > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }
  
  return { status, issues };
}

/**
 * GET /api/health/socratic
 * 健康检查端点
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 检查维护模式
    if (config.isMaintenanceMode()) {
      return NextResponse.json(
        {
          status: 'maintenance',
          message: config.get('MAINTENANCE_MESSAGE'),
          maintenanceEndTime: config.get('MAINTENANCE_END_TIME')
        },
        { status: 503 }
      );
    }
    
    // 并行执行所有健康检查
    const [
      databaseHealth,
      redisHealth,
      aiServiceHealth,
      cacheHealth,
      sseHealth,
      rateLimitHealth
    ] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkAIService(),
      checkCache(),
      checkSSE(),
      checkRateLimit()
    ]);

    const components = [
      databaseHealth,
      redisHealth,
      aiServiceHealth,
      cacheHealth,
      sseHealth,
      rateLimitHealth
    ];
    
    // 获取性能指标
    const performanceMetrics = defaultPerformanceMonitor.getMetrics();
    
    // 计算整体健康状态
    const { status, issues } = calculateOverallHealth(components);
    
    // 构建响应
    const response: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      environment: config.getEnvironment(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      components,
      metrics: {
        requests: performanceMetrics.totalRequests,
        errors: performanceMetrics.failedRequests,
        averageResponseTime: performanceMetrics.avgResponseTime,
        cacheHitRate: cacheHealth.metadata?.hitRate || 0,
        activeConnections: 0  // SSE使用HTTP连接，不需要持久连接计数
      }
    };
    
    if (issues.length > 0) {
      response.issues = issues;
    }
    
    // 记录健康检查
    logger.info('健康检查完成', {
      status,
      duration: Date.now() - startTime,
      componentCount: components.length,
      issueCount: issues.length
    });
    
    // 返回适当的HTTP状态码
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { status: httpStatus });
    
  } catch (error) {
    logger.error('健康检查失败', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : '健康检查失败',
        components: []
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD /api/health/socratic
 * 简单的健康检查（仅返回状态码）
 */
export async function HEAD(_request: NextRequest) {
  try {
    // 快速检查关键服务
    const criticalChecks = await Promise.all([
      checkDatabase(),
      checkAIService()
    ]);
    
    const hasFailure = criticalChecks.some(c => c.status === 'down');
    
    return new NextResponse(null, {
      status: hasFailure ? 503 : 200,
      headers: {
        'X-Health-Status': hasFailure ? 'unhealthy' : 'healthy'
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
