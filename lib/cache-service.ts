/**
 * Cache Service
 * Provides caching functionality for analysis results
 */

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  lastAccessed: number;
}

export interface CacheOptions {
  defaultTTL?: number;      // Default time-to-live in milliseconds
  maxSize?: number;          // Maximum number of entries
  cleanupInterval?: number;  // Cleanup interval in milliseconds
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry>;
  private options: Required<CacheOptions>;
  private statistics: Omit<CacheStatistics, 'hitRate' | 'size'>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.options = {
      defaultTTL: options.defaultTTL || 3600000, // 1 hour default
      maxSize: options.maxSize || 100,
      cleanupInterval: options.cleanupInterval || 60000 // 1 minute default
    };
    
    this.statistics = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    // Start cleanup timer if interval is set
    if (this.options.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    
    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: ttl || this.options.defaultTTL,
      lastAccessed: now
    };

    this.cache.set(key, entry);
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.statistics.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if entry has expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.statistics.misses++;
      return null;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = now;
    this.statistics.hits++;
    
    return entry.value as T;
  }

  /**
   * Get the raw cache entry (for testing)
   */
  getEntry(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if entry has expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    const total = this.statistics.hits + this.statistics.misses;
    const hitRate = total > 0 ? this.statistics.hits / total : 0;

    return {
      ...this.statistics,
      hitRate,
      size: this.cache.size
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Serialize cache to JSON
   */
  serialize(): string {
    const entries: Array<[string, CacheEntry]> = [];
    
    for (const [key, value] of this.cache.entries()) {
      entries.push([key, value]);
    }

    return JSON.stringify(entries);
  }

  /**
   * Deserialize cache from JSON
   */
  deserialize(json: string): void {
    try {
      const entries = JSON.parse(json) as Array<[string, CacheEntry]>;
      
      this.cache.clear();
      
      for (const [key, entry] of entries) {
        this.cache.set(key, entry);
      }
    } catch {
      // Invalid JSON, do nothing
    }
  }

  /**
   * Find keys matching a pattern
   */
  keys(pattern: string): string[] {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    const matchingKeys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /**
   * Delete keys matching a pattern
   */
  deletePattern(pattern: string): number {
    const keysToDelete = this.keys(pattern);
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * Estimate memory usage in bytes
   */
  getMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Estimate key size
      totalSize += key.length * 2; // Assuming 2 bytes per character

      // Estimate value size (rough approximation)
      const valueStr = JSON.stringify(entry.value);
      totalSize += valueStr.length * 2;

      // Add overhead for entry metadata
      totalSize += 32; // timestamp, ttl, lastAccessed
    }

    return totalSize;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.statistics.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}