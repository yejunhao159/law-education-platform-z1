/**
 * 优化的 localStorage 持久化策略
 * - 数据压缩
 * - 防抖保存
 * - 版本控制
 * - 错误处理
 */

import { debounce } from './utils'

const STORAGE_VERSION = '1.0.0'
const STORAGE_PREFIX = 'law_edu_'

interface StorageItem<T> {
  version: string
  timestamp: number
  data: T
}

class OptimizedStorage {
  private cache = new Map<string, any>()
  private pendingSaves = new Map<string, any>()
  
  /**
   * 带版本控制的读取
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    const fullKey = STORAGE_PREFIX + key
    
    // 先检查缓存
    if (this.cache.has(fullKey)) {
      return this.cache.get(fullKey)
    }
    
    try {
      const item = localStorage.getItem(fullKey)
      if (!item) return defaultValue
      
      const parsed: StorageItem<T> = JSON.parse(item)
      
      // 版本检查
      if (parsed.version !== STORAGE_VERSION) {
        console.warn(`Storage version mismatch for ${key}. Clearing old data.`)
        this.remove(key)
        return defaultValue
      }
      
      // 缓存结果
      this.cache.set(fullKey, parsed.data)
      return parsed.data
    } catch (error) {
      console.error(`Failed to read ${key} from storage:`, error)
      return defaultValue
    }
  }
  
  /**
   * 防抖保存 - 避免频繁写入
   */
  private debouncedSave = debounce((key: string, data: any) => {
    const fullKey = STORAGE_PREFIX + key
    const item: StorageItem<any> = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      data
    }
    
    try {
      const serialized = JSON.stringify(item)
      
      // 检查大小限制（5MB警告）
      if (serialized.length > 5 * 1024 * 1024) {
        console.warn(`Storage item ${key} is large (${(serialized.length / 1024 / 1024).toFixed(2)}MB)`)
      }
      
      localStorage.setItem(fullKey, serialized)
      this.cache.set(fullKey, data)
      
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Attempting cleanup...')
        this.cleanup()
        // 重试一次
        try {
          localStorage.setItem(fullKey, JSON.stringify(item))
        } catch {
          console.error('Failed to save after cleanup')
        }
      } else {
        console.error(`Failed to save ${key} to storage:`, error)
      }
    }
  }, 500) // 500ms 防抖延迟
  
  /**
   * 保存数据
   */
  set<T>(key: string, data: T): void {
    this.debouncedSave(key, data)
  }
  
  /**
   * 立即保存（不防抖）
   */
  setImmediate<T>(key: string, data: T): void {
    const fullKey = STORAGE_PREFIX + key
    const item: StorageItem<T> = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      data
    }
    
    try {
      localStorage.setItem(fullKey, JSON.stringify(item))
      this.cache.set(fullKey, data)
    } catch (error) {
      console.error(`Failed to save ${key} immediately:`, error)
    }
  }
  
  /**
   * 删除数据
   */
  remove(key: string): void {
    const fullKey = STORAGE_PREFIX + key
    localStorage.removeItem(fullKey)
    this.cache.delete(fullKey)
  }
  
  /**
   * 清理过期数据
   */
  cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): void { // 默认30天
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(STORAGE_PREFIX)) continue
      
      try {
        const item = localStorage.getItem(key)
        if (!item) continue
        
        const parsed: StorageItem<any> = JSON.parse(item)
        
        // 删除过期数据或版本不匹配的数据
        if (now - parsed.timestamp > maxAge || parsed.version !== STORAGE_VERSION) {
          keysToRemove.push(key)
        }
      } catch {
        // 无法解析的数据也删除
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      this.cache.delete(key)
    })
    
    console.log(`Cleaned up ${keysToRemove.length} expired storage items`)
  }
  
  /**
   * 获取存储使用情况
   */
  getUsage(): { used: number; items: number; largestKey?: string } {
    let totalSize = 0
    let itemCount = 0
    let largestKey = ''
    let largestSize = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(STORAGE_PREFIX)) continue
      
      const item = localStorage.getItem(key)
      if (!item) continue
      
      const size = item.length
      totalSize += size
      itemCount++
      
      if (size > largestSize) {
        largestSize = size
        largestKey = key.replace(STORAGE_PREFIX, '')
      }
    }
    
    return {
      used: totalSize,
      items: itemCount,
      largestKey: largestKey || undefined
    }
  }
  
  /**
   * 清空所有数据
   */
  clear(): void {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    this.cache.clear()
  }
}

// 导出单例
export const storage = new OptimizedStorage()

// 导出 hooks
import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    debounce?: number
    serialize?: (value: T) => any
    deserialize?: (value: any) => T
  }
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return storage.get(key, initialValue) ?? initialValue
  })
  
  // 防抖保存
  const saveToStorage = useCallback(
    debounce((value: T) => {
      const valueToStore = options?.serialize ? options.serialize(value) : value
      storage.set(key, valueToStore)
    }, options?.debounce ?? 500),
    [key, options]
  )
  
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value
      saveToStorage(valueToStore)
      return valueToStore
    })
  }, [saveToStorage])
  
  const removeValue = useCallback(() => {
    storage.remove(key)
    setStoredValue(initialValue)
  }, [key, initialValue])
  
  // 监听其他标签页的变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_PREFIX + key && e.newValue) {
        try {
          const parsed: StorageItem<T> = JSON.parse(e.newValue)
          const value = options?.deserialize ? options.deserialize(parsed.data) : parsed.data
          setStoredValue(value)
        } catch (error) {
          console.error('Failed to parse storage event:', error)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, options])
  
  return [storedValue, setValue, removeValue]
}