import { test, expect } from '@playwright/test';

/**
 * 基础冒烟测试 - 验证应用能正常启动和访问
 */
test.describe('基础冒烟测试', () => {
  test.setTimeout(30000);

  test('应用能正常加载首页', async ({ page }) => {
    await page.goto('/');

    // 最基本的验证：页面加载成功
    await expect(page).not.toHaveTitle('');

    // 验证页面有内容
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });

  test('可以看到加载演示案例按钮', async ({ page }) => {
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 查找演示案例按钮
    const demoButton = page.locator('button:has-text("加载演示案例")');
    await expect(demoButton).toBeVisible({ timeout: 10000 });
  });
});
