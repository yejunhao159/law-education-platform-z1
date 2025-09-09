import { test, expect, Page } from '@playwright/test';

test.describe('AI降级机制测试', () => {
  let page: Page;
  const classroomCode = 'TEST-FALLBACK-123';

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // 清理测试数据
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('AI服务不可用时应显示降级提示', async () => {
    // 模拟AI服务不可用
    await page.route('**/api/socratic**', async (route) => {
      await route.fulfill({
        status: 503,
        json: {
          success: false,
          error: {
            message: 'AI服务暂时不可用',
            code: 'AI_SERVICE_UNAVAILABLE'
          }
        }
      });
    });

    // 访问苏格拉底式问答页面
    await page.goto('/acts/5');
    
    // 尝试创建课堂
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    // 应该显示降级提示
    const fallbackMessage = page.locator('[data-testid="ai-fallback-message"]');
    await expect(fallbackMessage).toContainText('AI服务暂时不可用');
    
    // 应该提供备用选项
    const fallbackOptions = page.locator('[data-testid="fallback-options"]');
    await expect(fallbackOptions).toBeVisible();
    
    // 验证备用选项
    const manualMode = fallbackOptions.locator('button:has-text("手动模式")');
    const templateMode = fallbackOptions.locator('button:has-text("使用模板")');
    await expect(manualMode).toBeVisible();
    await expect(templateMode).toBeVisible();
  });

  test('使用手动模式继续课堂', async () => {
    // 模拟AI服务不可用
    await page.route('**/api/socratic**', async (route) => {
      if (route.request().url().includes('generate')) {
        await route.fulfill({
          status: 503,
          json: {
            success: false,
            error: {
              message: 'AI服务暂时不可用',
              code: 'AI_SERVICE_UNAVAILABLE'
            }
          }
        });
      } else {
        await route.continue();
      }
    });

    // 创建课堂
    await page.goto('/acts/5');
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    // 选择手动模式
    await page.waitForSelector('[data-testid="fallback-options"]');
    const manualMode = page.locator('button:has-text("手动模式")');
    await manualMode.click();

    // 验证进入手动模式
    const manualInput = page.locator('[data-testid="manual-question-input"]');
    await expect(manualInput).toBeVisible();
    
    // 输入手动问题
    await manualInput.fill('什么是法律的基本原则？');
    const submitBtn = page.locator('button:has-text("发送问题")');
    await submitBtn.click();

    // 验证问题已发送
    const questionDisplay = page.locator('[data-testid="current-question"]');
    await expect(questionDisplay).toContainText('什么是法律的基本原则？');
  });

  test('使用模板模式继续课堂', async () => {
    // 模拟AI服务不可用
    await page.route('**/api/socratic**', async (route) => {
      if (route.request().url().includes('generate')) {
        await route.fulfill({
          status: 503,
          json: {
            success: false,
            error: {
              message: 'AI服务暂时不可用',
              code: 'AI_SERVICE_UNAVAILABLE'
            }
          }
        });
      } else {
        await route.continue();
      }
    });

    // 创建课堂
    await page.goto('/acts/5');
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    // 选择模板模式
    await page.waitForSelector('[data-testid="fallback-options"]');
    const templateMode = page.locator('button:has-text("使用模板")');
    await templateMode.click();

    // 验证模板列表显示
    const templateList = page.locator('[data-testid="template-list"]');
    await expect(templateList).toBeVisible();
    
    // 选择一个模板
    const template = templateList.locator('[data-testid="template-item"]').first();
    await template.click();

    // 验证模板已加载
    const questionDisplay = page.locator('[data-testid="current-question"]');
    await expect(questionDisplay).toBeVisible();
    await expect(questionDisplay).not.toBeEmpty();
  });

  test('AI恢复后自动切换回AI模式', async () => {
    let aiCallCount = 0;
    
    // 模拟AI服务间歇性可用
    await page.route('**/api/socratic**', async (route) => {
      aiCallCount++;
      if (aiCallCount <= 2) {
        // 前两次调用失败
        await route.fulfill({
          status: 503,
          json: {
            success: false,
            error: {
              message: 'AI服务暂时不可用',
              code: 'AI_SERVICE_UNAVAILABLE'
            }
          }
        });
      } else {
        // 之后恢复正常
        await route.fulfill({
          status: 200,
          json: {
            success: true,
            data: {
              question: 'AI生成的问题：法律的本质是什么？',
              level: 2
            }
          }
        });
      }
    });

    // 创建课堂
    await page.goto('/acts/5');
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    // 首次调用失败，显示降级选项
    const fallbackOptions = page.locator('[data-testid="fallback-options"]');
    await expect(fallbackOptions).toBeVisible();

    // 选择手动模式
    const manualMode = page.locator('button:has-text("手动模式")');
    await manualMode.click();

    // 等待AI恢复提示
    await page.waitForTimeout(5000); // 模拟健康检查间隔

    // 验证AI恢复提示
    const recoveryNotice = page.locator('[data-testid="ai-recovery-notice"]');
    await expect(recoveryNotice).toContainText('AI服务已恢复');

    // 点击切换回AI模式
    const switchToAI = page.locator('button:has-text("切换到AI模式")');
    await switchToAI.click();

    // 验证已切换到AI模式
    const aiIndicator = page.locator('[data-testid="ai-mode-indicator"]');
    await expect(aiIndicator).toBeVisible();
    await expect(aiIndicator).toContainText('AI模式');
  });

  test('降级模式下保存问答记录', async () => {
    // 模拟AI服务不可用
    await page.route('**/api/socratic**', async (route) => {
      await route.fulfill({
        status: 503,
        json: {
          success: false,
          error: {
            message: 'AI服务暂时不可用',
            code: 'AI_SERVICE_UNAVAILABLE'
          }
        }
      });
    });

    // 创建课堂并使用手动模式
    await page.goto('/acts/5');
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    await page.waitForSelector('[data-testid="fallback-options"]');
    const manualMode = page.locator('button:has-text("手动模式")');
    await manualMode.click();

    // 发送多个手动问题
    const questions = [
      '什么是宪法？',
      '法律的作用是什么？',
      '如何理解法治？'
    ];

    for (const question of questions) {
      const manualInput = page.locator('[data-testid="manual-question-input"]');
      await manualInput.fill(question);
      const submitBtn = page.locator('button:has-text("发送问题")');
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }

    // 结束课堂
    const endBtn = page.locator('button:has-text("结束课堂")');
    await endBtn.click();

    // 验证降级模式标记
    const sessionSummary = page.locator('[data-testid="session-summary"]');
    await expect(sessionSummary).toBeVisible();
    
    const fallbackIndicator = sessionSummary.locator('[data-testid="fallback-mode-indicator"]');
    await expect(fallbackIndicator).toBeVisible();
    await expect(fallbackIndicator).toContainText('部分使用降级模式');

    // 验证问题记录
    const questionList = sessionSummary.locator('[data-testid="question-list"]');
    for (const question of questions) {
      await expect(questionList).toContainText(question);
    }
  });

  test('网络断开时的离线模式', async () => {
    // 先正常访问页面
    await page.goto('/acts/5');

    // 模拟网络断开
    await page.context().setOffline(true);

    // 尝试创建课堂
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    // 应该显示离线提示
    const offlineNotice = page.locator('[data-testid="offline-notice"]');
    await expect(offlineNotice).toBeVisible();
    await expect(offlineNotice).toContainText('网络连接已断开');

    // 验证离线模式功能
    const offlineMode = page.locator('[data-testid="offline-mode"]');
    await expect(offlineMode).toBeVisible();
    
    // 离线模式应该允许查看缓存内容
    const cachedContent = offlineMode.locator('[data-testid="cached-content"]');
    await expect(cachedContent).toBeVisible();

    // 恢复网络
    await page.context().setOffline(false);

    // 验证自动重连
    await page.waitForTimeout(3000);
    const onlineNotice = page.locator('[data-testid="online-notice"]');
    await expect(onlineNotice).toBeVisible();
    await expect(onlineNotice).toContainText('网络已恢复');
  });

  test('降级模式性能监控', async () => {
    // 记录性能指标
    const performanceMetrics: any[] = [];

    // 监听性能事件
    await page.on('console', (msg) => {
      if (msg.text().includes('PERFORMANCE:')) {
        const metric = JSON.parse(msg.text().replace('PERFORMANCE:', ''));
        performanceMetrics.push(metric);
      }
    });

    // 模拟AI服务不可用
    await page.route('**/api/socratic**', async (route) => {
      await route.fulfill({
        status: 503,
        json: {
          success: false,
          error: {
            message: 'AI服务暂时不可用',
            code: 'AI_SERVICE_UNAVAILABLE'
          }
        }
      });
    });

    // 执行降级流程
    await page.goto('/acts/5');
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    await page.waitForSelector('[data-testid="fallback-options"]');
    const manualMode = page.locator('button:has-text("手动模式")');
    await manualMode.click();

    // 发送多个问题测试性能
    for (let i = 0; i < 5; i++) {
      const manualInput = page.locator('[data-testid="manual-question-input"]');
      await manualInput.fill(`测试问题 ${i + 1}`);
      const submitBtn = page.locator('button:has-text("发送问题")');
      await submitBtn.click();
      await page.waitForTimeout(500);
    }

    // 验证性能指标已记录
    expect(performanceMetrics.length).toBeGreaterThan(0);
    
    // 验证降级模式下的响应时间
    const fallbackMetrics = performanceMetrics.filter(m => m.type === 'fallback');
    for (const metric of fallbackMetrics) {
      expect(metric.responseTime).toBeLessThan(1000); // 降级模式应该在1秒内响应
    }
  });
});

test.describe('错误恢复测试', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('部分服务失败时的优雅降级', async () => {
    // 模拟部分服务失败
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/api/socratic/generate')) {
        // AI生成服务失败
        await route.fulfill({
          status: 500,
          json: { success: false, error: { message: '服务错误' } }
        });
      } else if (url.includes('/api/socratic/validate')) {
        // 验证服务正常
        await route.fulfill({
          status: 200,
          json: { success: true, data: { isValid: true } }
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/acts/5');
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    // 应该显示部分功能可用提示
    const partialServiceNotice = page.locator('[data-testid="partial-service-notice"]');
    await expect(partialServiceNotice).toBeVisible();
    await expect(partialServiceNotice).toContainText('部分功能暂时不可用');

    // 可用功能应该正常工作
    const availableFeatures = page.locator('[data-testid="available-features"]');
    await expect(availableFeatures).toBeVisible();
  });

  test('自动重试机制', async () => {
    let retryCount = 0;
    
    // 模拟前两次失败，第三次成功
    await page.route('**/api/socratic/generate', async (route) => {
      retryCount++;
      if (retryCount < 3) {
        await route.fulfill({
          status: 500,
          json: { success: false, error: { message: '临时错误' } }
        });
      } else {
        await route.fulfill({
          status: 200,
          json: {
            success: true,
            data: {
              question: '重试成功后的问题',
              level: 1
            }
          }
        });
      }
    });

    await page.goto('/acts/5');
    const createBtn = page.locator('button:has-text("创建课堂")');
    await createBtn.click();

    // 等待自动重试完成
    const question = page.locator('[data-testid="ai-question"]');
    await expect(question).toContainText('重试成功后的问题', { timeout: 10000 });

    // 验证重试次数
    expect(retryCount).toBe(3);
  });
});