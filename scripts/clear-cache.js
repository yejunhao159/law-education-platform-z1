/**
 * 清理所有缓存数据的脚本
 * 用于测试故事模式缓存问题的修复
 */

console.log('🧹 清理所有缓存数据...');

// 如果在浏览器环境中运行（开发者控制台）
if (typeof window !== 'undefined' && window.localStorage) {
  // 清理 localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('teaching-store') || key.includes('case-management'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    console.log(`  - 删除 localStorage: ${key}`);
    localStorage.removeItem(key);
  });

  // 清理 sessionStorage
  sessionStorage.clear();
  console.log('  - 清理 sessionStorage');

  console.log('✅ 缓存清理完成！');
  console.log('📝 请刷新页面以应用更改');
} else {
  console.log('⚠️  请在浏览器控制台中运行此脚本');
  console.log('    复制以下代码到浏览器控制台执行：');
  console.log(`
// 清理教学存储缓存
localStorage.removeItem('teaching-store');
localStorage.removeItem('case-management-store');
sessionStorage.clear();
console.log('✅ 缓存已清理，请刷新页面');
  `);
}