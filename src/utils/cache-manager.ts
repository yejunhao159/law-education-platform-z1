/**
 * 全局缓存管理器
 * 统一管理所有localStorage缓存，支持版本控制和强制刷新
 */

// 缓存版本号 - 修改此值将强制清理所有旧缓存
const CACHE_VERSION = '2.0.0'; // 升级版本号来强制清理缓存

const VERSION_KEY = 'app-cache-version';

/**
 * 缓存键列表 - 所有可能的缓存键
 */
const CACHE_KEYS = [
  'teaching-store',
  'case-management-store',
  'analysis-cache',
  'analysis-cache-stats',
  'socratic-sessions',
  'case-files',
  'conversation-cache',
  'ai-response-cache'
];

/**
 * 检查并清理过期缓存
 */
export function checkAndClearExpiredCache(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 获取当前存储的版本号
    const storedVersion = localStorage.getItem(VERSION_KEY);

    // 如果版本号不匹配，清理所有缓存
    if (storedVersion !== CACHE_VERSION) {
      console.log(`📦 缓存版本更新: ${storedVersion || '未知'} -> ${CACHE_VERSION}`);
      clearAllCache();

      // 更新版本号
      localStorage.setItem(VERSION_KEY, CACHE_VERSION);
      return true;
    }

    return false;
  } catch (error) {
    console.error('检查缓存版本失败:', error);
    return false;
  }
}

/**
 * 清理所有缓存
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;

  console.log('🧹 开始清理所有缓存...');

  try {
    // 清理已知的缓存键
    CACHE_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`  - 删除缓存: ${key}`);
        localStorage.removeItem(key);
      }
    });

    // 清理所有包含特定模式的键
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('cache') ||
        key.includes('store') ||
        key.includes('session') ||
        key.includes('analysis')
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      console.log(`  - 删除缓存: ${key}`);
      localStorage.removeItem(key);
    });

    // 清理sessionStorage
    sessionStorage.clear();
    console.log('  - 清理 sessionStorage');

    console.log('✅ 所有缓存已清理');
  } catch (error) {
    console.error('清理缓存失败:', error);
  }
}

/**
 * 清理特定域的缓存
 */
export function clearDomainCache(domain: 'teaching' | 'case' | 'analysis' | 'socratic'): void {
  if (typeof window === 'undefined') return;

  const domainKeys: Record<string, string[]> = {
    teaching: ['teaching-store'],
    case: ['case-management-store', 'case-files'],
    analysis: ['analysis-cache', 'analysis-cache-stats', 'ai-response-cache'],
    socratic: ['socratic-sessions', 'conversation-cache']
  };

  const keys = domainKeys[domain] || [];
  keys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🗑️ 删除 ${domain} 缓存: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

/**
 * 获取缓存使用情况
 */
export function getCacheUsage(): {
  totalSize: number;
  items: { key: string; size: number }[];
} {
  if (typeof window === 'undefined') {
    return { totalSize: 0, items: [] };
  }

  const items: { key: string; size: number }[] = [];
  let totalSize = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const size = new Blob([value]).size;
        items.push({ key, size });
        totalSize += size;
      }
    }
  } catch (error) {
    console.error('获取缓存使用情况失败:', error);
  }

  return { totalSize, items: items.sort((a, b) => b.size - a.size) };
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 打印缓存使用报告
 */
export function printCacheReport(): void {
  const usage = getCacheUsage();

  console.log(`
📊 缓存使用报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━
总大小: ${formatBytes(usage.totalSize)}
条目数: ${usage.items.length}

前5大缓存项:
${usage.items.slice(0, 5).map(item =>
  `  ${item.key}: ${formatBytes(item.size)}`
).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim());
}

/**
 * 初始化缓存管理器（在应用启动时调用）
 */
export function initCacheManager(): void {
  // 检查并清理过期缓存
  const cleared = checkAndClearExpiredCache();

  if (cleared) {
    console.log('🎉 缓存已更新到最新版本');
  } else {
    console.log('✅ 缓存版本检查通过');
  }

  // 打印缓存使用报告
  printCacheReport();
}

// 导出给浏览器控制台使用
if (typeof window !== 'undefined') {
  (window as any).cacheManager = {
    clearAll: clearAllCache,
    clearDomain: clearDomainCache,
    getUsage: getCacheUsage,
    printReport: printCacheReport,
    init: initCacheManager
  };

  console.log(`
💾 缓存管理器已加载
可在控制台使用以下命令:
- cacheManager.clearAll() - 清理所有缓存
- cacheManager.clearDomain('teaching') - 清理特定域缓存
- cacheManager.printReport() - 打印缓存报告
- cacheManager.init() - 初始化并检查版本
  `);
}