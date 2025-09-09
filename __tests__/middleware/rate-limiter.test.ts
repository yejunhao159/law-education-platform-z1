import { NextRequest, NextResponse } from 'next/server';
import {
  createRateLimiter,
  createTieredRateLimiter,
  createClassroomRateLimiter,
  createUserRateLimiter,
  createAIRateLimiter,
  MemoryStore,
  SlidingWindowRateLimiter
} from '../../lib/middleware/rate-limiter';

// Mock NextRequest
function createMockRequest(
  url: string = 'http://localhost:3000/api/test',
  headers: Record<string, string> = {}
): NextRequest {
  const request = new Request(url, {
    method: 'POST',
    headers: new Headers(headers)
  });
  return new NextRequest(request);
}

describe('RateLimiter中间件', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  afterEach(() => {
    store.clearAll();
  });

  describe('基本限流功能', () => {
    it('应该允许限制内的请求通过', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5
      }, store);

      const req = createMockRequest();
      
      for (let i = 0; i < 5; i++) {
        const result = await limiter(req);
        expect(result).toBeNull(); // 允许通过
      }
    });

    it('应该阻止超过限制的请求', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3
      }, store);

      const req = createMockRequest();
      
      // 前3个请求应该通过
      for (let i = 0; i < 3; i++) {
        const result = await limiter(req);
        expect(result).toBeNull();
      }
      
      // 第4个请求应该被阻止
      const result = await limiter(req);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it('应该在时间窗口后重置计数', async () => {
      jest.useFakeTimers();
      
      const limiter = createRateLimiter({
        windowMs: 1000, // 1秒窗口
        maxRequests: 2
      }, store);

      const req = createMockRequest();
      
      // 使用2个请求
      await limiter(req);
      await limiter(req);
      
      // 第3个应该被阻止
      let result = await limiter(req);
      expect(result).not.toBeNull();
      
      // 等待窗口过期
      jest.advanceTimersByTime(1001);
      
      // 现在应该允许新请求
      result = await limiter(req);
      expect(result).toBeNull();
      
      jest.useRealTimers();
    });

    it('应该基于IP地址进行限流', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2
      }, store);

      const req1 = createMockRequest('http://localhost/api/test', {
        'x-forwarded-for': '192.168.1.1'
      });
      
      const req2 = createMockRequest('http://localhost/api/test', {
        'x-forwarded-for': '192.168.1.2'
      });
      
      // 每个IP有独立的限制
      await limiter(req1);
      await limiter(req1);
      await limiter(req2);
      await limiter(req2);
      
      // IP1的第3个请求被阻止
      const result1 = await limiter(req1);
      expect(result1).not.toBeNull();
      
      // IP2的第3个请求也被阻止
      const result2 = await limiter(req2);
      expect(result2).not.toBeNull();
    });
  });

  describe('限流响应', () => {
    it('应该返回正确的错误信息', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        message: '自定义限流消息'
      }, store);

      const req = createMockRequest();
      
      await limiter(req); // 第1个请求
      const result = await limiter(req); // 第2个请求被阻止
      
      expect(result).not.toBeNull();
      const body = await result!.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.message).toBe('自定义限流消息');
      expect(body.error.retryAfter).toBeGreaterThan(0);
    });

    it('应该设置标准限流头', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        standardHeaders: true
      }, store);

      const req = createMockRequest();
      
      // 使用3个请求
      for (let i = 0; i < 3; i++) {
        await limiter(req);
      }
      
      // 第4个请求
      const result = await limiter(req);
      
      if (result) {
        expect(result.headers.get('RateLimit-Limit')).toBe('5');
        expect(result.headers.get('RateLimit-Remaining')).toBe('1');
        expect(result.headers.get('RateLimit-Reset')).toBeTruthy();
      }
    });

    it('应该设置Retry-After头', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1
      }, store);

      const req = createMockRequest();
      
      await limiter(req);
      const result = await limiter(req);
      
      expect(result).not.toBeNull();
      const retryAfter = result!.headers.get('Retry-After');
      expect(retryAfter).toBeTruthy();
      expect(parseInt(retryAfter!)).toBeGreaterThan(0);
    });
  });

  describe('分层限流', () => {
    it('应该应用多个限流层级', async () => {
      const tieredLimiter = createTieredRateLimiter([
        {
          windowMs: 1000,  // 1秒10个请求
          maxRequests: 10
        },
        {
          windowMs: 60000, // 1分钟50个请求
          maxRequests: 50
        }
      ]);

      const req = createMockRequest();
      
      // 在1秒内发送11个请求
      for (let i = 0; i < 10; i++) {
        const result = await tieredLimiter(req);
        expect(result).toBeNull();
      }
      
      // 第11个请求应该被第一层限制
      const result = await tieredLimiter(req);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it('应该在任一层触发时阻止请求', async () => {
      const store1 = new MemoryStore();
      const store2 = new MemoryStore();
      
      const limiter1 = createRateLimiter({
        windowMs: 1000,
        maxRequests: 5
      }, store1);
      
      const limiter2 = createRateLimiter({
        windowMs: 10000,
        maxRequests: 20
      }, store2);
      
      const tieredLimiter = async (req: NextRequest) => {
        const result1 = await limiter1(req);
        if (result1) return result1;
        
        const result2 = await limiter2(req);
        if (result2) return result2;
        
        return null;
      };

      const req = createMockRequest();
      
      // 触发第一层限制
      for (let i = 0; i < 5; i++) {
        await tieredLimiter(req);
      }
      
      const result = await tieredLimiter(req);
      expect(result).not.toBeNull();
    });
  });

  describe('特定场景限流器', () => {
    it('课堂限流器应该基于课堂ID', async () => {
      const classroom1Limiter = createClassroomRateLimiter('class1', {
        maxRequests: 2
      });
      
      const classroom2Limiter = createClassroomRateLimiter('class2', {
        maxRequests: 2
      });

      const req = createMockRequest();
      
      // 每个课堂有独立的限制
      await classroom1Limiter(req);
      await classroom1Limiter(req);
      await classroom2Limiter(req);
      await classroom2Limiter(req);
      
      // 各自的第3个请求都应该被阻止
      const result1 = await classroom1Limiter(req);
      const result2 = await classroom2Limiter(req);
      
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
    });

    it('用户限流器应该基于用户ID', async () => {
      const user1Limiter = createUserRateLimiter('user1', {
        maxRequests: 3
      });
      
      const user2Limiter = createUserRateLimiter('user2', {
        maxRequests: 3
      });

      const req = createMockRequest();
      
      // 用户1的请求
      for (let i = 0; i < 3; i++) {
        const result = await user1Limiter(req);
        expect(result).toBeNull();
      }
      
      // 用户1的第4个请求被阻止
      const result = await user1Limiter(req);
      expect(result).not.toBeNull();
      
      // 用户2仍然可以请求
      const result2 = await user2Limiter(req);
      expect(result2).toBeNull();
    });

    it('AI服务限流器应该有更严格的限制', async () => {
      const aiLimiter = createAIRateLimiter({
        maxRequests: 2 // 测试用更小的值
      });

      const req = createMockRequest();
      
      // 只允许2个请求
      await aiLimiter(req);
      await aiLimiter(req);
      
      // 第3个请求被阻止
      const result = await aiLimiter(req);
      expect(result).not.toBeNull();
      
      const body = await result!.json();
      expect(body.error.message).toContain('AI服务');
    });
  });

  describe('滑动窗口限流器', () => {
    it('应该使用滑动窗口计算请求数', async () => {
      jest.useFakeTimers();
      
      const limiter = new SlidingWindowRateLimiter(1000, 3); // 1秒3个请求
      
      // 时间0: 发送2个请求
      expect(await limiter.isAllowed('test')).toBe(true);
      expect(await limiter.isAllowed('test')).toBe(true);
      
      // 时间500ms: 发送1个请求（总共3个）
      jest.advanceTimersByTime(500);
      expect(await limiter.isAllowed('test')).toBe(true);
      
      // 时间600ms: 第4个请求被阻止
      jest.advanceTimersByTime(100);
      expect(await limiter.isAllowed('test')).toBe(false);
      
      // 时间1001ms: 前2个请求过期，允许新请求
      jest.advanceTimersByTime(401);
      expect(await limiter.isAllowed('test')).toBe(true);
      
      jest.useRealTimers();
    });

    it('应该自动清理过期数据', async () => {
      const limiter = new SlidingWindowRateLimiter(100, 5);
      
      // 添加多个键
      for (let i = 0; i < 100; i++) {
        await limiter.isAllowed(`key${i}`);
      }
      
      // 等待窗口过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 触发清理（通过随机概率）
      for (let i = 0; i < 200; i++) {
        await limiter.isAllowed('trigger-cleanup');
      }
      
      // 旧键应该可以重新使用
      expect(await limiter.isAllowed('key0')).toBe(true);
    });

    it('应该支持重置特定键或所有键', () => {
      const limiter = new SlidingWindowRateLimiter(60000, 10);
      
      limiter.isAllowed('key1');
      limiter.isAllowed('key2');
      
      // 重置特定键
      limiter.reset('key1');
      expect(limiter.isAllowed('key1')).resolves.toBe(true);
      
      // 重置所有键
      limiter.reset();
      expect(limiter.isAllowed('key2')).resolves.toBe(true);
    });
  });

  describe('并发请求处理', () => {
    it('应该正确处理并发请求', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 10
      }, store);

      const req = createMockRequest();
      
      // 并发发送15个请求
      const promises = Array(15).fill(null).map(() => limiter(req));
      const results = await Promise.all(promises);
      
      // 前10个应该通过，后5个应该被阻止
      const passed = results.filter(r => r === null).length;
      const blocked = results.filter(r => r !== null).length;
      
      expect(passed).toBe(10);
      expect(blocked).toBe(5);
    });

    it('应该在高并发下保持准确性', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        maxRequests: 100
      }, store);

      const requests = Array(200).fill(null).map((_, i) => 
        createMockRequest('http://localhost/api/test', {
          'x-forwarded-for': `192.168.1.${i % 10}` // 10个不同的IP
        })
      );
      
      // 并发处理所有请求
      const promises = requests.map(req => limiter(req));
      const results = await Promise.all(promises);
      
      // 每个IP应该有100个请求通过
      const blockedCount = results.filter(r => r !== null).length;
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('应该在存储错误时允许请求通过', async () => {
      // 创建一个会抛出错误的存储
      const errorStore = {
        increment: jest.fn().mockRejectedValue(new Error('Storage error')),
        decrement: jest.fn(),
        reset: jest.fn(),
        get: jest.fn()
      };

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1
      }, errorStore as any);

      const req = createMockRequest();
      const result = await limiter(req);
      
      // 即使存储出错，也应该允许请求通过
      expect(result).toBeNull();
      expect(errorStore.increment).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量请求', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1000
      }, store);

      const startTime = Date.now();
      const req = createMockRequest();
      
      // 处理1000个请求
      for (let i = 0; i < 1000; i++) {
        await limiter(req);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('滑动窗口应该高效处理请求', async () => {
      const limiter = new SlidingWindowRateLimiter(60000, 1000);
      
      const startTime = Date.now();
      
      // 处理10000个请求检查
      for (let i = 0; i < 10000; i++) {
        await limiter.isAllowed(`key${i % 100}`);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});