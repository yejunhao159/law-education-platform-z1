/**
 * 健康检查端点测试
 */

import { GET, HEAD } from '@/app/api/health/socratic/route';
import { NextRequest } from 'next/server';
import { EnvironmentConfig } from '@/lib/config/environment';
import { CacheManager } from '@/lib/services/cache/manager';
import { WebSocketManager } from '@/lib/services/websocket/manager';
import { socraticPerformance } from '@/lib/services/socratic-performance';
import { redis } from '@/lib/redis';

// Mock依赖
jest.mock('@/lib/config/environment');
jest.mock('@/lib/services/cache/manager');
jest.mock('@/lib/services/websocket/manager');
jest.mock('@/lib/services/socratic-performance');
jest.mock('@/lib/redis');
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

describe('健康检查端点', () => {
  let mockConfig: jest.Mocked<EnvironmentConfig>;
  let mockCacheManager: jest.Mocked<CacheManager>;
  let mockWsManager: jest.Mocked<WebSocketManager>;
  
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 设置EnvironmentConfig mock
    mockConfig = {
      getInstance: jest.fn(),
      get: jest.fn(),
      getEnvironment: jest.fn().mockReturnValue('test'),
      isMaintenanceMode: jest.fn().mockReturnValue(false),
      getDatabaseConfig: jest.fn().mockReturnValue({
        url: 'postgresql://localhost/test',
        pool: { min: 2, max: 10 }
      }),
      getAIConfig: jest.fn().mockReturnValue({
        openai: {
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo',
          maxTokens: 500
        },
        deepseek: { apiKey: '', apiUrl: '' }
      }),
      getWebSocketConfig: jest.fn().mockReturnValue({
        port: 3001,
        maxConnections: 1000
      }),
      getRateLimitConfig: jest.fn().mockReturnValue({
        enabled: true,
        maxRequests: 100,
        windowMs: 60000
      }),
      checkHealth: jest.fn().mockReturnValue({
        healthy: true,
        issues: []
      })
    } as any;
    
    (EnvironmentConfig.getInstance as jest.Mock).mockReturnValue(mockConfig);
    
    // 设置CacheManager mock
    mockCacheManager = {
      getInstance: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ timestamp: Date.now() }),
      getStats: jest.fn().mockReturnValue({
        hitRate: 0.85,
        hits: 850,
        misses: 150,
        evictions: 10
      })
    } as any;
    
    (CacheManager.getInstance as jest.Mock).mockReturnValue(mockCacheManager);
    
    // 设置WebSocketManager mock
    mockWsManager = {
      getInstance: jest.fn(),
      getActiveConnectionCount: jest.fn().mockReturnValue(42)
    } as any;
    
    (WebSocketManager.getInstance as jest.Mock).mockReturnValue(mockWsManager);
    
    // 设置性能监控mock
    const mockPerformance = require('@/lib/services/socratic-performance');
    mockPerformance.socraticPerformance = {
      getMetrics: jest.fn().mockReturnValue({
        totalRequests: 1000,
        errorCount: 5,
        averageResponseTime: 150
      })
    };
    
    // 设置Redis mock
    const mockRedis = require('@/lib/redis');
    mockRedis.redis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      info: jest.fn().mockResolvedValue(
        '# Stats\r\ntotal_connections_received:100\r\ntotal_commands_processed:1000\r\nused_memory_human:10M\r\n'
      )
    };
    
    // 设置process.uptime
    jest.spyOn(process, 'uptime').mockReturnValue(3600);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('GET /api/health/socratic', () => {
    it('应该返回健康状态', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.environment).toBe('test');
      expect(data.uptime).toBe(3600);
      expect(data.components).toHaveLength(6);
      
      // 验证组件状态
      const componentNames = data.components.map((c: any) => c.name);
      expect(componentNames).toContain('database');
      expect(componentNames).toContain('redis');
      expect(componentNames).toContain('ai-service');
      expect(componentNames).toContain('cache');
      expect(componentNames).toContain('websocket');
      expect(componentNames).toContain('rate-limiter');
      
      // 验证指标
      expect(data.metrics).toEqual({
        requests: 1000,
        errors: 5,
        averageResponseTime: 150,
        cacheHitRate: 0.85,
        activeConnections: 42
      });
    });
    
    it('应该在维护模式下返回503', async () => {
      mockConfig.isMaintenanceMode.mockReturnValue(true);
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'MAINTENANCE_MESSAGE') return '系统维护中';
        if (key === 'MAINTENANCE_END_TIME') return '2024-12-31T23:59:59Z';
        return null;
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.status).toBe('maintenance');
      expect(data.message).toBe('系统维护中');
      expect(data.maintenanceEndTime).toBe('2024-12-31T23:59:59Z');
    });
    
    it('应该处理数据库连接失败', async () => {
      mockConfig.getDatabaseConfig.mockReturnValue({
        url: null,
        pool: { min: 2, max: 10 }
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      
      const dbComponent = data.components.find((c: any) => c.name === 'database');
      expect(dbComponent.status).toBe('down');
      expect(dbComponent.error).toBe('数据库未配置');
      
      expect(data.issues).toContain('database: 数据库未配置');
    });
    
    it('应该处理Redis连接失败', async () => {
      const mockRedis = require('@/lib/redis');
      mockRedis.redis.ping = jest.fn().mockRejectedValue(new Error('连接失败'));
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      
      const redisComponent = data.components.find((c: any) => c.name === 'redis');
      expect(redisComponent.status).toBe('down');
      expect(redisComponent.error).toBe('连接失败');
    });
    
    it('应该处理AI服务未配置', async () => {
      mockConfig.getAIConfig.mockReturnValue({
        openai: { apiKey: '', model: '', maxTokens: 0 },
        deepseek: { apiKey: '', apiUrl: '' }
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      
      const aiComponent = data.components.find((c: any) => c.name === 'ai-service');
      expect(aiComponent.status).toBe('down');
      expect(aiComponent.error).toBe('AI服务未配置');
    });
    
    it('应该检测缓存系统故障', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      
      const cacheComponent = data.components.find((c: any) => c.name === 'cache');
      expect(cacheComponent.status).toBe('down');
      expect(cacheComponent.error).toBe('缓存读写测试失败');
    });
    
    it('应该返回降级状态', async () => {
      // 设置配置健康检查返回问题
      mockConfig.checkHealth.mockReturnValue({
        healthy: false,
        issues: ['监控已启用但未配置监控后端']
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.issues).toContain('监控已启用但未配置监控后端');
    });
    
    it('应该检测响应时间过长', async () => {
      // Mock一个组件返回长响应时间
      const mockRedis = require('@/lib/redis');
      const originalRedisInfo = mockRedis.redis.info;
      mockRedis.redis.info = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return '# Stats\r\ntotal_connections_received:100\r\ntotal_commands_processed:1000\r\nused_memory_human:10M\r\n';
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.status).toBe('degraded');
      expect(data.issues).toContainEqual(expect.stringContaining('响应时间过长'));
    });
    
    it('应该处理健康检查异常', async () => {
      // 模拟异常
      mockConfig.isMaintenanceMode.mockImplementation(() => {
        throw new Error('配置读取失败');
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('配置读取失败');
      expect(data.components).toEqual([]);
    });
  });
  
  describe('HEAD /api/health/socratic', () => {
    it('应该返回200状态码当服务健康', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await HEAD(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Health-Status')).toBe('healthy');
      expect(response.body).toBeNull();
    });
    
    it('应该返回503状态码当关键服务故障', async () => {
      mockConfig.getDatabaseConfig.mockReturnValue({
        url: null,
        pool: { min: 2, max: 10 }
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await HEAD(request);
      
      expect(response.status).toBe(503);
      expect(response.headers.get('X-Health-Status')).toBe('unhealthy');
    });
    
    it('应该处理HEAD请求异常', async () => {
      mockConfig.getDatabaseConfig.mockImplementation(() => {
        throw new Error('配置错误');
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await HEAD(request);
      
      expect(response.status).toBe(503);
    });
  });
  
  describe('组件健康检查详情', () => {
    it('应该包含数据库连接池信息', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      const dbComponent = data.components.find((c: any) => c.name === 'database');
      expect(dbComponent.metadata).toEqual({
        poolMin: 2,
        poolMax: 10
      });
    });
    
    it('应该包含Redis统计信息', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      const redisComponent = data.components.find((c: any) => c.name === 'redis');
      expect(redisComponent.metadata).toEqual({
        totalConnections: '100',
        totalCommands: '1000',
        usedMemory: '10M'
      });
    });
    
    it('应该包含AI服务配置信息', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      const aiComponent = data.components.find((c: any) => c.name === 'ai-service');
      expect(aiComponent.metadata).toEqual({
        primaryProvider: 'openai',
        model: 'gpt-3.5-turbo',
        maxTokens: 500
      });
    });
    
    it('应该包含缓存命中率信息', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      const cacheComponent = data.components.find((c: any) => c.name === 'cache');
      expect(cacheComponent.metadata).toEqual({
        hitRate: 0.85,
        totalHits: 850,
        totalMisses: 150,
        totalEvictions: 10
      });
    });
    
    it('应该包含WebSocket连接信息', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      const wsComponent = data.components.find((c: any) => c.name === 'websocket');
      expect(wsComponent.metadata).toEqual({
        port: 3001,
        activeConnections: 42,
        maxConnections: 1000
      });
    });
    
    it('应该包含限流配置信息', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      const rateLimitComponent = data.components.find((c: any) => c.name === 'rate-limiter');
      expect(rateLimitComponent.metadata).toEqual({
        enabled: true,
        maxRequests: 100,
        windowMs: 60000
      });
    });
    
    it('应该正确处理禁用的限流器', async () => {
      mockConfig.getRateLimitConfig.mockReturnValue({
        enabled: false,
        maxRequests: 0,
        windowMs: 0
      });
      
      const request = new NextRequest('http://localhost:3000/api/health/socratic');
      const response = await GET(request);
      const data = await response.json();
      
      const rateLimitComponent = data.components.find((c: any) => c.name === 'rate-limiter');
      expect(rateLimitComponent.status).toBe('up');
      expect(rateLimitComponent.metadata).toEqual({ enabled: false });
    });
  });
});