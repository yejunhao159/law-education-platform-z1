/**
 * Redis客户端
 * 提供Redis连接和操作接口
 */

export interface RedisClient {
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushdb(): Promise<string>;
  info(section?: string): Promise<string>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  hset(key: string, field: string, value: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hdel(key: string, field: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
}

// 在生产环境中，这里应该创建实际的Redis连接
// 为了测试，我们导出一个可以被mock的对象
export const redis: RedisClient | null = null;