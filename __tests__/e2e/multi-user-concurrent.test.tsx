import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

test.describe('多用户并发测试', () => {
  let browser: Browser;
  let teacherContext: BrowserContext;
  let teacherPage: Page;
  let studentContexts: BrowserContext[] = [];
  let studentPages: Page[] = [];
  const classroomCode = 'CONCURRENT-TEST-123';

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.afterAll(async () => {
    // 清理所有上下文
    for (const context of studentContexts) {
      await context.close();
    }
    if (teacherContext) {
      await teacherContext.close();
    }
  });

  test('10个学生同时加入课堂', async () => {
    // 创建教师上下文
    teacherContext = await browser.newContext();
    teacherPage = await teacherContext.newPage();
    
    // 教师创建课堂
    await teacherPage.goto('/acts/5');
    const createBtn = teacherPage.locator('button:has-text("创建课堂")');
    await createBtn.click();
    
    // 获取课堂码
    const codeDisplay = teacherPage.locator('[data-testid="classroom-code"]');
    await expect(codeDisplay).toBeVisible();
    const actualCode = await codeDisplay.textContent();

    // 创建10个学生并发加入
    const studentPromises = [];
    for (let i = 0; i < 10; i++) {
      studentPromises.push(createAndJoinStudent(i, actualCode || classroomCode));
    }

    // 等待所有学生加入
    const results = await Promise.all(studentPromises);
    
    // 验证所有学生都成功加入
    for (const result of results) {
      expect(result.success).toBe(true);
    }

    // 验证教师端显示的学生数量
    const studentCount = teacherPage.locator('[data-testid="student-count"]');
    await expect(studentCount).toHaveText('10', { timeout: 10000 });

    // 验证学生列表
    const studentList = teacherPage.locator('[data-testid="student-list"]');
    for (let i = 0; i < 10; i++) {
      await expect(studentList).toContainText(`学生${i + 1}`);
    }
  });

  test('50个学生并发回答问题', async () => {
    // 准备50个学生
    const STUDENT_COUNT = 50;
    
    // 创建教师课堂
    teacherContext = await browser.newContext();
    teacherPage = await teacherContext.newPage();
    await teacherPage.goto('/acts/5');
    const createBtn = teacherPage.locator('button:has-text("创建课堂")');
    await createBtn.click();
    
    const codeDisplay = teacherPage.locator('[data-testid="classroom-code"]');
    await expect(codeDisplay).toBeVisible();
    const actualCode = await codeDisplay.textContent();

    // 创建并加入学生
    const joinPromises = [];
    for (let i = 0; i < STUDENT_COUNT; i++) {
      joinPromises.push(createAndJoinStudent(i, actualCode || classroomCode));
    }
    await Promise.all(joinPromises);

    // 教师发送问题
    const sendQuestionBtn = teacherPage.locator('button:has-text("发送问题")');
    await sendQuestionBtn.click();

    // 所有学生并发提交答案
    const answerPromises = [];
    for (let i = 0; i < STUDENT_COUNT; i++) {
      answerPromises.push(submitStudentAnswer(studentPages[i], `答案 ${i + 1}`));
    }

    const startTime = Date.now();
    await Promise.all(answerPromises);
    const endTime = Date.now();

    // 验证所有答案都被接收
    const answerCount = teacherPage.locator('[data-testid="answer-count"]');
    await expect(answerCount).toHaveText(String(STUDENT_COUNT), { timeout: 15000 });

    // 验证性能：50个并发提交应该在5秒内完成
    expect(endTime - startTime).toBeLessThan(5000);

    // 验证答案列表
    const answerList = teacherPage.locator('[data-testid="answer-list"]');
    await expect(answerList.locator('.answer-item')).toHaveCount(STUDENT_COUNT);
  });

  test('多个教师同时创建不同课堂', async () => {
    const TEACHER_COUNT = 5;
    const teacherContexts: BrowserContext[] = [];
    const teacherPages: Page[] = [];
    const classroomCodes: string[] = [];

    // 并发创建多个课堂
    const createPromises = [];
    for (let i = 0; i < TEACHER_COUNT; i++) {
      createPromises.push(createTeacherClassroom(i));
    }

    const results = await Promise.all(createPromises);

    // 验证所有课堂都创建成功且课堂码不同
    for (let i = 0; i < TEACHER_COUNT; i++) {
      expect(results[i].success).toBe(true);
      expect(results[i].code).toBeTruthy();
      classroomCodes.push(results[i].code);
      teacherContexts.push(results[i].context);
      teacherPages.push(results[i].page);
    }

    // 验证课堂码唯一性
    const uniqueCodes = new Set(classroomCodes);
    expect(uniqueCodes.size).toBe(TEACHER_COUNT);

    // 每个课堂加入不同的学生
    for (let i = 0; i < TEACHER_COUNT; i++) {
      const studentContext = await browser.newContext();
      const studentPage = await studentContext.newPage();
      
      await studentPage.goto('/acts/5');
      const joinInput = studentPage.locator('input[placeholder*="课堂码"]');
      await joinInput.fill(classroomCodes[i]);
      const joinBtn = studentPage.locator('button:has-text("加入课堂")');
      await joinBtn.click();

      // 验证加入正确的课堂
      const classroomInfo = studentPage.locator('[data-testid="classroom-info"]');
      await expect(classroomInfo).toContainText(`教师${i + 1}的课堂`);

      await studentContext.close();
    }

    // 清理
    for (const context of teacherContexts) {
      await context.close();
    }
  });

  test('学生断线重连压力测试', async () => {
    // 创建教师课堂
    teacherContext = await browser.newContext();
    teacherPage = await teacherContext.newPage();
    await teacherPage.goto('/acts/5');
    const createBtn = teacherPage.locator('button:has-text("创建课堂")');
    await createBtn.click();
    
    const codeDisplay = teacherPage.locator('[data-testid="classroom-code"]');
    await expect(codeDisplay).toBeVisible();
    const actualCode = await codeDisplay.textContent();

    // 创建20个学生
    const STUDENT_COUNT = 20;
    for (let i = 0; i < STUDENT_COUNT; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      studentContexts.push(context);
      studentPages.push(page);
      
      await page.goto('/acts/5');
      const joinInput = page.locator('input[placeholder*="课堂码"]');
      await joinInput.fill(actualCode || classroomCode);
      const joinBtn = page.locator('button:has-text("加入课堂")');
      await joinBtn.click();
    }

    // 验证初始连接
    const initialCount = teacherPage.locator('[data-testid="student-count"]');
    await expect(initialCount).toHaveText(String(STUDENT_COUNT));

    // 模拟10个学生断线
    const disconnectPromises = [];
    for (let i = 0; i < 10; i++) {
      disconnectPromises.push(studentPages[i].context().setOffline(true));
    }
    await Promise.all(disconnectPromises);

    // 等待断线检测
    await teacherPage.waitForTimeout(3000);
    
    // 验证在线人数减少
    const afterDisconnectCount = teacherPage.locator('[data-testid="online-count"]');
    await expect(afterDisconnectCount).toHaveText('10');

    // 模拟重连
    const reconnectPromises = [];
    for (let i = 0; i < 10; i++) {
      reconnectPromises.push(studentPages[i].context().setOffline(false));
    }
    await Promise.all(reconnectPromises);

    // 等待重连完成
    await teacherPage.waitForTimeout(3000);

    // 验证所有学生重新上线
    const afterReconnectCount = teacherPage.locator('[data-testid="online-count"]');
    await expect(afterReconnectCount).toHaveText(String(STUDENT_COUNT));
  });

  test('并发投票压力测试', async () => {
    // 创建教师课堂
    teacherContext = await browser.newContext();
    teacherPage = await teacherContext.newPage();
    await teacherPage.goto('/acts/5');
    const createBtn = teacherPage.locator('button:has-text("创建课堂")');
    await createBtn.click();
    
    const codeDisplay = teacherPage.locator('[data-testid="classroom-code"]');
    await expect(codeDisplay).toBeVisible();
    const actualCode = await codeDisplay.textContent();

    // 创建100个学生
    const STUDENT_COUNT = 100;
    const joinPromises = [];
    for (let i = 0; i < STUDENT_COUNT; i++) {
      joinPromises.push(createAndJoinStudent(i, actualCode || classroomCode));
    }
    await Promise.all(joinPromises);

    // 教师发起投票
    const startVoteBtn = teacherPage.locator('button:has-text("发起投票")');
    await startVoteBtn.click();

    // 所有学生并发投票
    const votePromises = [];
    for (let i = 0; i < STUDENT_COUNT; i++) {
      const voteOption = i % 4; // 分配到4个选项
      votePromises.push(submitVote(studentPages[i], voteOption));
    }

    const voteStartTime = Date.now();
    await Promise.all(votePromises);
    const voteEndTime = Date.now();

    // 验证投票结果
    const voteResults = teacherPage.locator('[data-testid="vote-results"]');
    await expect(voteResults).toBeVisible({ timeout: 10000 });

    // 验证总投票数
    const totalVotes = teacherPage.locator('[data-testid="total-votes"]');
    await expect(totalVotes).toHaveText(String(STUDENT_COUNT));

    // 验证每个选项的票数
    for (let i = 0; i < 4; i++) {
      const optionVotes = teacherPage.locator(`[data-testid="option-${i}-votes"]`);
      const expectedVotes = Math.floor(STUDENT_COUNT / 4) + (i < STUDENT_COUNT % 4 ? 1 : 0);
      await expect(optionVotes).toHaveText(String(expectedVotes));
    }

    // 验证性能：100个并发投票应该在10秒内完成
    expect(voteEndTime - voteStartTime).toBeLessThan(10000);
  });

  test('资源竞争和锁机制测试', async () => {
    // 创建教师课堂
    teacherContext = await browser.newContext();
    teacherPage = await teacherContext.newPage();
    await teacherPage.goto('/acts/5');
    const createBtn = teacherPage.locator('button:has-text("创建课堂")');
    await createBtn.click();
    
    const codeDisplay = teacherPage.locator('[data-testid="classroom-code"]');
    await expect(codeDisplay).toBeVisible();
    const actualCode = await codeDisplay.textContent();

    // 创建30个学生
    const STUDENT_COUNT = 30;
    for (let i = 0; i < STUDENT_COUNT; i++) {
      await createAndJoinStudent(i, actualCode || classroomCode);
    }

    // 同时抢答测试
    const rushAnswerBtn = teacherPage.locator('button:has-text("开始抢答")');
    await rushAnswerBtn.click();

    // 所有学生同时点击抢答
    const rushPromises = [];
    for (let i = 0; i < STUDENT_COUNT; i++) {
      rushPromises.push(clickRushAnswer(studentPages[i]));
    }

    const results = await Promise.all(rushPromises);

    // 验证只有一个学生抢答成功
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(1);

    // 验证教师端显示正确的抢答者
    const rushWinner = teacherPage.locator('[data-testid="rush-winner"]');
    await expect(rushWinner).toBeVisible();
    
    const winnerIndex = results.findIndex(r => r.success);
    await expect(rushWinner).toContainText(`学生${winnerIndex + 1}`);
  });

  // 辅助函数
  async function createAndJoinStudent(index: number, code: string) {
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      studentContexts.push(context);
      studentPages.push(page);
      
      await page.goto('/acts/5');
      
      // 设置学生名称
      const nameInput = page.locator('input[placeholder*="姓名"]');
      await nameInput.fill(`学生${index + 1}`);
      
      // 输入课堂码
      const joinInput = page.locator('input[placeholder*="课堂码"]');
      await joinInput.fill(code);
      
      // 加入课堂
      const joinBtn = page.locator('button:has-text("加入课堂")');
      await joinBtn.click();
      
      // 验证加入成功
      const successIndicator = page.locator('[data-testid="join-success"]');
      await expect(successIndicator).toBeVisible({ timeout: 5000 });
      
      return { success: true, page };
    } catch (error) {
      return { success: false, error };
    }
  }

  async function createTeacherClassroom(index: number) {
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/acts/5');
      
      // 设置教师名称
      const nameInput = page.locator('input[placeholder*="教师姓名"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill(`教师${index + 1}`);
      }
      
      // 创建课堂
      const createBtn = page.locator('button:has-text("创建课堂")');
      await createBtn.click();
      
      // 设置课堂名称
      const classNameInput = page.locator('input[placeholder*="课堂名称"]');
      if (await classNameInput.isVisible()) {
        await classNameInput.fill(`教师${index + 1}的课堂`);
      }
      
      // 获取课堂码
      const codeDisplay = page.locator('[data-testid="classroom-code"]');
      await expect(codeDisplay).toBeVisible({ timeout: 5000 });
      const code = await codeDisplay.textContent();
      
      return { success: true, code: code || '', context, page };
    } catch (error) {
      return { success: false, code: '', error, context: null, page: null };
    }
  }

  async function submitStudentAnswer(page: Page, answer: string) {
    try {
      const answerInput = page.locator('[data-testid="answer-input"]');
      await answerInput.fill(answer);
      
      const submitBtn = page.locator('button:has-text("提交答案")');
      await submitBtn.click();
      
      const successMsg = page.locator('[data-testid="answer-submitted"]');
      await expect(successMsg).toBeVisible({ timeout: 5000 });
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  async function submitVote(page: Page, option: number) {
    try {
      const voteOption = page.locator(`[data-testid="vote-option-${option}"]`);
      await voteOption.click();
      
      const confirmBtn = page.locator('button:has-text("确认投票")');
      await confirmBtn.click();
      
      const successMsg = page.locator('[data-testid="vote-submitted"]');
      await expect(successMsg).toBeVisible({ timeout: 5000 });
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  async function clickRushAnswer(page: Page) {
    try {
      const rushBtn = page.locator('button:has-text("抢答")');
      await rushBtn.click();
      
      // 检查是否抢答成功
      const successMsg = page.locator('[data-testid="rush-success"]');
      const failMsg = page.locator('[data-testid="rush-fail"]');
      
      const success = await successMsg.isVisible({ timeout: 2000 }).catch(() => false);
      
      return { success };
    } catch (error) {
      return { success: false, error };
    }
  }
});