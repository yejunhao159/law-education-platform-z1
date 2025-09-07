/**
 * TDD Tests for Cache Service
 * Testing the caching functionality for analysis results
 */

import { CacheService } from '../cache-service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    cacheService.clear(); // Clear cache before each test
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      
      cacheService.set(key, value);
      const retrieved = cacheService.get(key);
      
      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      cacheService.set('existing-key', { data: 'value' });
      
      expect(cacheService.has('existing-key')).toBe(true);
      expect(cacheService.has('non-existing-key')).toBe(false);
    });

    it('should delete values', () => {
      const key = 'delete-test';
      cacheService.set(key, { data: 'value' });
      
      expect(cacheService.has(key)).toBe(true);
      
      cacheService.delete(key);
      
      expect(cacheService.has(key)).toBe(false);
      expect(cacheService.get(key)).toBeNull();
    });

    it('should clear all values', () => {
      cacheService.set('key1', { data: 1 });
      cacheService.set('key2', { data: 2 });
      cacheService.set('key3', { data: 3 });
      
      expect(cacheService.size()).toBe(3);
      
      cacheService.clear();
      
      expect(cacheService.size()).toBe(0);
      expect(cacheService.get('key1')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire values after TTL', async () => {
      const key = 'ttl-test';
      const value = { data: 'expires' };
      const ttl = 100; // 100ms
      
      cacheService.set(key, value, ttl);
      
      // Should exist immediately
      expect(cacheService.get(key)).toEqual(value);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(cacheService.get(key)).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const service = new CacheService({ defaultTTL: 1000 });
      
      service.set('default-ttl', { data: 'test' });
      const entry = service.getEntry('default-ttl');
      
      expect(entry).toBeDefined();
      expect(entry?.ttl).toBe(1000);
    });

    it('should override default TTL when specified', () => {
      const service = new CacheService({ defaultTTL: 1000 });
      
      service.set('custom-ttl', { data: 'test' }, 5000);
      const entry = service.getEntry('custom-ttl');
      
      expect(entry?.ttl).toBe(5000);
    });
  });

  describe('Size Limits', () => {
    it('should respect max size limit', () => {
      const service = new CacheService({ maxSize: 3 });
      
      service.set('key1', { data: 1 });
      service.set('key2', { data: 2 });
      service.set('key3', { data: 3 });
      
      expect(service.size()).toBe(3);
      
      // Adding a 4th item should evict the oldest
      service.set('key4', { data: 4 });
      
      expect(service.size()).toBe(3);
      expect(service.has('key1')).toBe(false); // Oldest was evicted
      expect(service.has('key4')).toBe(true);  // Newest exists
    });

    it('should use LRU eviction policy', () => {
      const service = new CacheService({ maxSize: 3 });
      
      service.set('key1', { data: 1 });
      service.set('key2', { data: 2 });
      service.set('key3', { data: 3 });
      
      // Access key1 to make it recently used
      service.get('key1');
      
      // Adding a 4th item should evict key2 (least recently used)
      service.set('key4', { data: 4 });
      
      expect(service.has('key1')).toBe(true);  // Recently accessed
      expect(service.has('key2')).toBe(false); // LRU, evicted
      expect(service.has('key3')).toBe(true);
      expect(service.has('key4')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      cacheService.set('key1', { data: 'value' });
      
      // Hit
      cacheService.get('key1');
      
      // Misses
      cacheService.get('non-existent');
      cacheService.get('another-missing');
      
      const stats = cacheService.getStatistics();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.333, 2);
    });

    it('should track evictions', () => {
      const service = new CacheService({ maxSize: 2 });
      
      service.set('key1', { data: 1 });
      service.set('key2', { data: 2 });
      service.set('key3', { data: 3 }); // Should evict key1
      
      const stats = service.getStatistics();
      
      expect(stats.evictions).toBe(1);
    });

    it('should reset statistics', () => {
      cacheService.set('key1', { data: 'value' });
      cacheService.get('key1');
      cacheService.get('missing');
      
      let stats = cacheService.getStatistics();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      
      cacheService.resetStatistics();
      
      stats = cacheService.getStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize cache', () => {
      cacheService.set('key1', { data: 'value1' });
      cacheService.set('key2', { data: 'value2' });
      
      const serialized = cacheService.serialize();
      
      const newCache = new CacheService();
      newCache.deserialize(serialized);
      
      expect(newCache.get('key1')).toEqual({ data: 'value1' });
      expect(newCache.get('key2')).toEqual({ data: 'value2' });
    });

    it('should handle invalid JSON gracefully', () => {
      const newCache = new CacheService();
      
      expect(() => {
        newCache.deserialize('invalid json');
      }).not.toThrow();
      
      expect(newCache.size()).toBe(0);
    });
  });

  describe('Key Patterns', () => {
    it('should find keys by pattern', () => {
      cacheService.set('user:1', { name: 'User 1' });
      cacheService.set('user:2', { name: 'User 2' });
      cacheService.set('post:1', { title: 'Post 1' });
      
      const userKeys = cacheService.keys('user:*');
      
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');
      expect(userKeys).not.toContain('post:1');
    });

    it('should delete keys by pattern', () => {
      cacheService.set('temp:1', { data: 1 });
      cacheService.set('temp:2', { data: 2 });
      cacheService.set('permanent:1', { data: 3 });
      
      cacheService.deletePattern('temp:*');
      
      expect(cacheService.has('temp:1')).toBe(false);
      expect(cacheService.has('temp:2')).toBe(false);
      expect(cacheService.has('permanent:1')).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should estimate memory usage', () => {
      cacheService.set('key1', { data: 'short' });
      cacheService.set('key2', { data: 'a very long string that takes more memory' });
      
      const memory1 = cacheService.getMemoryUsage();
      
      cacheService.set('key3', { data: new Array(100).fill('data') });
      
      const memory2 = cacheService.getMemoryUsage();
      
      expect(memory2).toBeGreaterThan(memory1);
    });

    it('should cleanup expired entries periodically', async () => {
      const service = new CacheService({ cleanupInterval: 100 });
      
      service.set('expires-soon', { data: 'test' }, 50);
      service.set('expires-later', { data: 'test' }, 200);
      
      expect(service.size()).toBe(2);
      
      // Wait for cleanup to run
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(service.has('expires-soon')).toBe(false);
      expect(service.has('expires-later')).toBe(true);
    });
  });
});