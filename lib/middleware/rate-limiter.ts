/**
 * API限流中间件
 * 提供多层级的请求频率限制
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '../utils/socratic-logger';

const logger = createLogger('rate-limiter');

export interface RateLimitConfig {
  windowMs: number;           // 时间窗口（毫秒）
  maxRequests: number;         // 最大请求数
  keyGenerator?: (req: NextRequest) => string; // 生成限流键的函数
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求
  skipFailedRequests?: boolean;     // 是否跳过失败请求
  message?: string;            // 限流时返回的消息
  standardHeaders?: boolean;   // 是否返回标准限流头
  legacyHeaders?: boolean;     // 是否返回旧版限流头
}

export interface RateLimitState {
  count: number;
  resetTime: number;
}

/**
 * 限流存储接口
 */
export interface IRateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitState>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  get(key: string): Promise<RateLimitState | null>;
}

/**
 * 内存存储实现
 */
export class MemoryStore implements IRateLimitStore {
  private store = new Map<string, RateLimitState>();
  private timers = new Map<string, NodeJS.Timeout>();

  async increment(key: string, windowMs: number): Promise<RateLimitState> {
    const now = Date.now();
    let state = this.store.get(key);

    if (!state || state.resetTime <= now) {
      // 创建新的时间窗口
      state = {
        count: 1,
        resetTime: now + windowMs
      };

      // 设置自动清理
      this.scheduleReset(key, windowMs);
    } else {
      // 增加计数
      state.count++;
    }

    this.store.set(key, state);
    return state;
  }

  async decrement(key: string): Promise<void> {
    const state = this.store.get(key);
    if (state && state.count > 0) {
      state.count--;
      this.store.set(key, state);
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async get(key: string): Promise<RateLimitState | null> {
    const state = this.store.get(key);
    if (!state) return null;
    
    if (state.resetTime <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return state;
  }

  private scheduleReset(key: string, windowMs: number) {
    // 清理旧的定时器
    const oldTimer = this.timers.get(key);
    if (oldTimer) {
      clearTimeout(oldTimer);
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, windowMs);

    this.timers.set(key, timer);
  }

  // 清理所有定时器（用于测试）
  clearAll() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.store.clear();
    this.timers.clear();
  }
}

/**
 * 创建限流中间件
 */
export function createRateLimiter(config: RateLimitConfig, store?: IRateLimitStore) {
  const limiterStore = store || new MemoryStore();
  
  const defaultConfig: RateLimitConfig = {
    windowMs: 60000,         // 默认1分钟
    maxRequests: 100,        // 默认100个请求
    message: '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false,
    ...config
  };

  return async function rateLimiter(
    req: NextRequest,
    res?: NextResponse
  ): Promise<NextResponse | null> {
    // 生成限流键
    const keyGenerator = defaultConfig.keyGenerator || defaultKeyGenerator;
    const key = keyGenerator(req);

    try {
      // 增加请求计数
      const state = await limiterStore.increment(key, defaultConfig.windowMs);
      
      // 检查是否超过限制
      if (state.count > defaultConfig.maxRequests) {
        logger.warn('限流触发', {
          key,
          count: state.count,
          limit: defaultConfig.maxRequests,
          resetTime: new Date(state.resetTime).toISOString()
        });

        // 返回限流响应
        return createRateLimitResponse(defaultConfig, state);
      }

      // 添加限流头信息
      if (res) {
        addRateLimitHeaders(res, defaultConfig, state);
      }

      return null; // 允许请求通过
    } catch (error) {
      logger.error('限流中间件错误', error);
      // 发生错误时允许请求通过
      return null;
    }
  };
}

/**
 * 默认的键生成器
 */
function defaultKeyGenerator(req: NextRequest): string {
  // 优先使用IP地址
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  // 结合路径创建键
  const path = new URL(req.url).pathname;
  return `${ip}:${path}`;
}

/**
 * 创建限流响应
 */
function createRateLimitResponse(
  config: RateLimitConfig,
  state: RateLimitState
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: config.message,
        retryAfter: Math.ceil((state.resetTime - Date.now()) / 1000)
      }
    },
    { status: 429 }
  );

  addRateLimitHeaders(response, config, state);
  return response;
}

/**
 * 添加限流头信息
 */
function addRateLimitHeaders(
  res: NextResponse,
  config: RateLimitConfig,
  state: RateLimitState
) {
  if (config.standardHeaders) {
    res.headers.set('RateLimit-Limit', config.maxRequests.toString());
    res.headers.set('RateLimit-Remaining', 
      Math.max(0, config.maxRequests - state.count).toString());
    res.headers.set('RateLimit-Reset', 
      new Date(state.resetTime).toISOString());
  }

  if (config.legacyHeaders) {
    res.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    res.headers.set('X-RateLimit-Remaining', 
      Math.max(0, config.maxRequests - state.count).toString());
    res.headers.set('X-RateLimit-Reset', state.resetTime.toString());
  }

  // 如果已超限，添加Retry-After头
  if (state.count > config.maxRequests) {
    const retryAfter = Math.ceil((state.resetTime - Date.now()) / 1000);
    res.headers.set('Retry-After', retryAfter.toString());
  }
}

/**
 * 创建分层限流器（不同层级的限制）
 */
export function createTieredRateLimiter(tiers: RateLimitConfig[]) {
  const limiters = tiers.map(config => createRateLimiter(config));
  
  return async function tieredRateLimiter(
    req: NextRequest,
    res?: NextResponse
  ): Promise<NextResponse | null> {
    // 检查所有层级的限制
    for (const limiter of limiters) {
      const result = await limiter(req, res);
      if (result) {
        // 任何一层触发限制就返回
        return result;
      }
    }
    
    return null;
  };
}

/**
 * 创建课堂级别的限流器
 */
export function createClassroomRateLimiter(
  classroomId: string,
  config?: Partial<RateLimitConfig>
) {
  return createRateLimiter({
    windowMs: 60000,      // 1分钟
    maxRequests: 200,     // 课堂级别200个请求
    keyGenerator: (req) => `classroom:${classroomId}`,
    message: '课堂请求过于频繁，请稍后再试',
    ...config
  });
}

/**
 * 创建用户级别的限流器
 */
export function createUserRateLimiter(
  userId: string,
  config?: Partial<RateLimitConfig>
) {
  return createRateLimiter({
    windowMs: 60000,      // 1分钟
    maxRequests: 60,      // 用户级别60个请求
    keyGenerator: (req) => `user:${userId}`,
    message: '您的请求过于频繁，请稍后再试',
    ...config
  });
}

/**
 * 创建AI服务限流器（更严格）
 */
export function createAIRateLimiter(config?: Partial<RateLimitConfig>) {
  return createRateLimiter({
    windowMs: 60000,      // 1分钟
    maxRequests: 10,      // AI服务每分钟10个请求
    keyGenerator: (req) => {
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      return `ai:${ip}`;
    },
    message: 'AI服务请求过于频繁，请稍后再试',
    ...config
  });
}

/**
 * 滑动窗口限流器（更精确的限流）
 */
export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}

  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // 获取或创建请求记录
    let timestamps = this.requests.get(key) || [];
    
    // 过滤掉窗口外的请求
    timestamps = timestamps.filter(t => t > windowStart);
    
    // 检查是否超过限制
    if (timestamps.length >= this.maxRequests) {
      return false;
    }
    
    // 添加当前请求
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    // 定期清理旧数据
    if (Math.random() < 0.01) { // 1%概率触发清理
      this.cleanup();
    }
    
    return true;
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }

  reset(key?: string) {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

// 导出预配置的限流器
export const defaultRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 20
});

export const aiServiceRateLimiter = createAIRateLimiter();