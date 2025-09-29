'use client';

import { useEffect } from 'react';
import { initCacheManager } from '@/src/utils/cache-manager';

export function CacheProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化缓存管理器
    initCacheManager();

    // 监听存储变化，如果是其他标签页清理了缓存，当前页面也要响应
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-cache-version' && e.newValue !== e.oldValue) {
        console.log('🔄 检测到缓存版本变化，刷新页面...');
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return <>{children}</>;
}