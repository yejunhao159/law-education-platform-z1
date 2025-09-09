import { test, expect, Page } from '@playwright/test';

/**
 * E2E测试：完整课堂流程
 * 测试苏格拉底式问答的完整用户旅程
 * 包括：创建课堂 → 加入课堂 → 问答互动 → 结束课堂
 */

test.describe('苏格拉底式问答课堂完整流程', () => {
  let teacherPage: Page;
  let studentPage: Page;
  let classroomCode: string;

  test.beforeEach(async ({ browser }) => {
    // 创建教师和学生的浏览器上下文
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();
    
    teacherPage = await teacherContext.newPage();
    studentPage = await studentContext.newPage();
  });

  test.afterEach(async () => {
    // 清理资源
    await teacherPage.close();
    await studentPage.close();
  });

  test('完整课堂流程测试', async () => {
    // ========== Step 1: 教师创建课堂 ==========
    await test.step('教师创建课堂', async () => {
      // 导航到苏格拉底式问答页面
      await teacherPage.goto('/acts/5');
      
      // 等待页面加载
      await teacherPage.waitForLoadState('networkidle');
      
      // 点击创建课堂按钮
      const createClassroomBtn = teacherPage.locator('button:has-text("创建课堂")');
      await expect(createClassroomBtn).toBeVisible();
      await createClassroomBtn.click();
      
      // 获取生成的6位课堂码
      const codeElement = await teacherPage.waitForSelector('[data-testid="classroom-code"]');
      classroomCode = await codeElement.textContent() || '';
      expect(classroomCode).toMatch(/^\d{6}$/); // 验证是6位数字
      
      // 验证教师控制面板显示
      await expect(teacherPage.locator('[data-testid="teacher-panel"]')).toBeVisible();
    });

    // ========== Step 2: 学生加入课堂 ==========
    await test.step('学生加入课堂', async () => {
      // 学生导航到加入页面
      await studentPage.goto('/acts/5');
      
      // 输入课堂码
      const joinInput = studentPage.locator('input[placeholder*="课堂码"]');
      await expect(joinInput).toBeVisible();
      await joinInput.fill(classroomCode);
      
      // 点击加入按钮
      const joinBtn = studentPage.locator('button:has-text("加入课堂")');
      await joinBtn.click();
      
      // 验证成功加入
      await expect(studentPage.locator('[data-testid="student-view"]')).toBeVisible();
      
      // 教师端应该看到学生加入通知
      await expect(teacherPage.locator('text=/当前在线.*1/')).toBeVisible();
    });

    // ========== Step 3: AI提问和学生回答 ==========
    await test.step('问答互动流程', async () => {
      // 教师启动问答
      const startBtn = teacherPage.locator('button:has-text("开始问答")');
      await startBtn.click();
      
      // 等待AI生成第一个问题
      const aiQuestion = studentPage.locator('[data-testid="ai-question"]');
      await expect(aiQuestion).toBeVisible({ timeout: 10000 });
      const questionText = await aiQuestion.textContent();
      expect(questionText).toBeTruthy();
      
      // 学生输入答案
      const answerInput = studentPage.locator('textarea[placeholder*="输入你的答案"]');
      await answerInput.fill('根据《合同法》第52条，该合同因违反法律强制性规定而无效。');
      
      // 提交答案
      const submitBtn = studentPage.locator('button:has-text("提交答案")');
      await submitBtn.click();
      
      // 等待AI反馈
      const aiFeedback = studentPage.locator('[data-testid="ai-feedback"]');
      await expect(aiFeedback).toBeVisible({ timeout: 10000 });
      
      // 验证进度更新
      const progressBar = studentPage.locator('[data-testid="level-progress"]');
      await expect(progressBar).toBeVisible();
    });

    // ========== Step 4: 教师介入控制 ==========
    await test.step('教师介入和控制', async () => {
      // 教师切换到引导模式
      const modeSelector = teacherPage.locator('select[data-testid="mode-selector"]');
      await modeSelector.selectOption('guided');
      
      // 教师发送自定义问题
      const customQuestionInput = teacherPage.locator('textarea[placeholder*="输入自定义问题"]');
      await customQuestionInput.fill('请解释合同无效的法律后果是什么？');
      
      const sendCustomBtn = teacherPage.locator('button:has-text("发送问题")');
      await sendCustomBtn.click();
      
      // 学生端应该收到教师的问题
      const teacherQuestion = studentPage.locator('[data-testid="teacher-question"]');
      await expect(teacherQuestion).toBeVisible();
      await expect(teacherQuestion).toContainText('合同无效的法律后果');
    });

    // ========== Step 5: 投票功能测试 ==========
    await test.step('课堂投票功能', async () => {
      // 教师发起投票
      const voteBtn = teacherPage.locator('button:has-text("发起投票")');
      await voteBtn.click();
      
      // 设置投票问题
      const voteQuestionInput = teacherPage.locator('input[placeholder*="投票问题"]');
      await voteQuestionInput.fill('本案例中合同是否有效？');
      
      // 添加选项
      await teacherPage.locator('input[placeholder*="选项1"]').fill('有效');
      await teacherPage.locator('input[placeholder*="选项2"]').fill('无效');
      await teacherPage.locator('input[placeholder*="选项3"]').fill('部分有效');
      
      // 发起投票
      await teacherPage.locator('button:has-text("开始投票")').click();
      
      // 学生端投票
      const votePanel = studentPage.locator('[data-testid="voting-panel"]');
      await expect(votePanel).toBeVisible();
      
      // 选择选项
      await studentPage.locator('label:has-text("无效")').click();
      await studentPage.locator('button:has-text("提交投票")').click();
      
      // 教师端查看投票结果
      const voteResults = teacherPage.locator('[data-testid="vote-results"]');
      await expect(voteResults).toBeVisible();
      await expect(voteResults).toContainText('1票');
    });

    // ========== Step 6: 层级进度测试 ==========
    await test.step('层级进度验证', async () => {
      // 模拟多轮问答以提升层级
      for (let i = 0; i < 3; i++) {
        // 等待新问题
        await studentPage.waitForSelector('[data-testid="ai-question"]:not(:has-text("合同无效"))');
        
        // 回答问题
        const answerInput = studentPage.locator('textarea[placeholder*="输入你的答案"]');
        await answerInput.fill(`这是第${i + 2}轮的详细法律分析...`);
        await studentPage.locator('button:has-text("提交答案")').click();
        
        // 等待反馈
        await studentPage.waitForTimeout(2000);
      }
      
      // 验证层级提升
      const levelIndicator = studentPage.locator('[data-testid="current-level"]');
      const currentLevel = await levelIndicator.textContent();
      expect(parseInt(currentLevel || '1')).toBeGreaterThan(1);
    });

    // ========== Step 7: 结束课堂 ==========
    await test.step('结束课堂', async () => {
      // 教师结束课堂
      const endBtn = teacherPage.locator('button:has-text("结束课堂")');
      await endBtn.click();
      
      // 确认对话框
      const confirmBtn = teacherPage.locator('button:has-text("确认结束")');
      await confirmBtn.click();
      
      // 验证课堂已结束
      await expect(teacherPage.locator('text=/课堂已结束/')).toBeVisible();
      
      // 学生端应该显示课堂结束
      await expect(studentPage.locator('text=/课堂已结束/')).toBeVisible();
      
      // 验证统计数据显示
      const stats = teacherPage.locator('[data-testid="classroom-stats"]');
      await expect(stats).toBeVisible();
      await expect(stats).toContainText('总问答轮数');
      await expect(stats).toContainText('平均回答质量');
    });
  });

  test('课堂码验证和错误处理', async () => {
    await test.step('无效课堂码处理', async () => {
      await studentPage.goto('/acts/5');
      
      // 输入无效的课堂码
      const joinInput = studentPage.locator('input[placeholder*="课堂码"]');
      await joinInput.fill('123'); // 少于6位
      
      const joinBtn = studentPage.locator('button:has-text("加入课堂")');
      await joinBtn.click();
      
      // 应该显示错误提示
      await expect(studentPage.locator('text=/请输入6位课堂码/')).toBeVisible();
      
      // 输入不存在的课堂码
      await joinInput.fill('999999');
      await joinBtn.click();
      
      // 应该显示课堂不存在
      await expect(studentPage.locator('text=/课堂不存在或已结束/')).toBeVisible();
    });
  });

  test('网络断线重连测试', async () => {
    await test.step('断线重连机制', async () => {
      // 创建课堂
      await teacherPage.goto('/acts/5');
      await teacherPage.locator('button:has-text("创建课堂")').click();
      
      const codeElement = await teacherPage.waitForSelector('[data-testid="classroom-code"]');
      const code = await codeElement.textContent() || '';
      
      // 学生加入
      await studentPage.goto('/acts/5');
      await studentPage.locator('input[placeholder*="课堂码"]').fill(code);
      await studentPage.locator('button:has-text("加入课堂")').click();
      
      // 模拟网络断开
      await studentPage.context().setOffline(true);
      
      // 应该显示断线提示
      await expect(studentPage.locator('text=/连接已断开/')).toBeVisible({ timeout: 5000 });
      
      // 恢复网络
      await studentPage.context().setOffline(false);
      
      // 应该自动重连
      await expect(studentPage.locator('text=/已重新连接/')).toBeVisible({ timeout: 10000 });
    });
  });

  test('并发用户测试', async ({ browser }) => {
    await test.step('多个学生同时加入', async () => {
      // 教师创建课堂
      await teacherPage.goto('/acts/5');
      await teacherPage.locator('button:has-text("创建课堂")').click();
      
      const codeElement = await teacherPage.waitForSelector('[data-testid="classroom-code"]');
      const code = await codeElement.textContent() || '';
      
      // 创建5个学生并发加入
      const students: Page[] = [];
      const studentPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        students.push(page);
        
        studentPromises.push((async () => {
          await page.goto('/acts/5');
          await page.locator('input[placeholder*="课堂码"]').fill(code);
          await page.locator('button:has-text("加入课堂")').click();
          await expect(page.locator('[data-testid="student-view"]')).toBeVisible();
        })());
      }
      
      // 等待所有学生加入
      await Promise.all(studentPromises);
      
      // 验证教师端显示5个学生
      await expect(teacherPage.locator('text=/当前在线.*5/')).toBeVisible();
      
      // 清理
      for (const page of students) {
        await page.close();
      }
    });
  });

  test('性能测试', async () => {
    await test.step('响应时间验证', async () => {
      await teacherPage.goto('/acts/5');
      
      // 测量创建课堂的响应时间
      const startTime = Date.now();
      await teacherPage.locator('button:has-text("创建课堂")').click();
      await teacherPage.waitForSelector('[data-testid="classroom-code"]');
      const createTime = Date.now() - startTime;
      
      // 创建课堂应该在3秒内完成
      expect(createTime).toBeLessThan(3000);
      
      // 测量AI响应时间
      const aiStartTime = Date.now();
      await teacherPage.locator('button:has-text("开始问答")').click();
      await teacherPage.waitForSelector('[data-testid="ai-question"]');
      const aiResponseTime = Date.now() - aiStartTime;
      
      // AI响应应该在5秒内
      expect(aiResponseTime).toBeLessThan(5000);
    });
  });

  test('降级模式测试', async () => {
    await test.step('AI服务不可用时的降级处理', async () => {
      // 设置环境变量模拟AI服务不可用
      await teacherPage.addInitScript(() => {
        (window as any).MOCK_AI_FAILURE = true;
      });
      
      await teacherPage.goto('/acts/5');
      await teacherPage.locator('button:has-text("创建课堂")').click();
      await teacherPage.locator('button:has-text("开始问答")').click();
      
      // 应该使用预设问题库
      const fallbackQuestion = teacherPage.locator('[data-testid="ai-question"]');
      await expect(fallbackQuestion).toBeVisible();
      
      // 验证降级提示
      await expect(teacherPage.locator('text=/使用预设问题库/')).toBeVisible();
    });
  });
});