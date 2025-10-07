import { test, expect } from '@playwright/test';

/**
 * 最小化测试 - 验证Playwright环境能否正常工作
 */
test('最基础的页面访问测试', async ({ page }) => {
  console.log('开始测试...');

  // 设置短超时
  test.setTimeout(30000);

  console.log('访问首页...');
  await page.goto('/', { timeout: 20000 });

  console.log('等待页面加载...');
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

  console.log('验证页面标题...');
  const title = await page.title();
  console.log('页面标题:', title);
  expect(title.length).toBeGreaterThan(0);

  console.log('✅ 测试通过！');
});
