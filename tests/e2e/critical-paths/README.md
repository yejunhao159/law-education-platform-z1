# E2E测试执行指南

## 任务分工

### 👤 开发者A：四幕教学法流程测试
**文件**：`four-acts-flow.spec.ts`
**目标**：验证用户能完整走完四幕教学流程

### 👤 开发者B：AI错误处理测试
**文件**：`ai-error-handling.spec.ts`
**目标**：验证系统在AI服务失败时的容错能力

---

## 开发者A：执行步骤

### 1. 准备测试数据（15分钟）

```bash
# 创建fixtures目录（如果还没有）
mkdir -p tests/fixtures

# 下载一个真实判决书并转换为Word格式
# 方式1：从裁判文书网下载
# 访问：https://wenshu.court.gov.cn/
# 搜索"买卖合同纠纷"，下载一个简单案例
# 转换为 .docx 格式

# 方式2：如果项目已有测试案例，直接复制
# cp /path/to/existing/case.docx tests/fixtures/test-judgment.docx

# 验证文件存在
ls -lh tests/fixtures/test-judgment.docx
```

### 2. 调整测试代码中的选择器（重要！）

测试中使用的选择器（如 `data-testid`）需要根据实际组件调整：

```typescript
// 示例：如果你的输入框不是 data-testid="student-input"
// 而是 id="chat-input"，需要修改为：
await page.locator('#chat-input').fill('...');

// 或者使用文本选择器
await page.locator('textarea[placeholder="输入您的回答"]').fill('...');
```

**需要检查的关键选择器**：
- `[data-testid="extraction-result"]` → 判决书提取结果容器
- `[data-testid="fact-analysis"]` → 事实分析结果
- `[data-testid="chat-container"]` → 对话容器
- `[data-testid="student-input"]` → 学生输入框
- `[data-testid="ai-message"]` → AI消息

**如何找到正确的选择器**：
```bash
# 启动开发服务器
npm run dev

# 在另一个终端启动Playwright UI模式
npx playwright test --ui

# 使用Pick Locator功能点击元素，自动生成选择器
```

### 3. 运行测试

```bash
# 方式1：运行所有测试
npx playwright test tests/e2e/critical-paths/four-acts-flow.spec.ts

# 方式2：使用UI模式（推荐，可以看到执行过程）
npx playwright test tests/e2e/critical-paths/four-acts-flow.spec.ts --ui

# 方式3：调试模式（逐步执行）
npx playwright test tests/e2e/critical-paths/four-acts-flow.spec.ts --debug

# 方式4：headed模式（看到浏览器界面）
npx playwright test tests/e2e/critical-paths/four-acts-flow.spec.ts --headed
```

### 4. 调试常见问题

#### 问题1：找不到元素
```
Error: locator.click: Timeout 30000ms exceeded.
```

**解决方案**：
1. 检查选择器是否正确
2. 增加等待时间：`{ timeout: 60000 }`
3. 使用 `--headed` 模式看实际页面

#### 问题2：AI调用超时
```
Error: Test timeout of 120000ms exceeded.
```

**解决方案**：
1. 增加测试超时：`test.setTimeout(180000);`
2. 检查 DeepSeek API key 是否配置正确
3. 检查网络连接

#### 问题3：路由不匹配
```
Error: expect(page).toHaveURL(/.*act-one/)
```

**解决方案**：
1. 检查实际路由是什么：`console.log(await page.url())`
2. 修改测试中的路由匹配规则

### 5. 验收标准

✅ **通过标准**：
- 所有测试步骤全部通过（绿色）
- 从第一幕到第四幕流程完整
- 最终能导出报告

❌ **失败处理**：
- 截图保存在 `test-results/` 目录
- 查看失败的步骤，调整代码或测试
- 修复后重新运行

---

## 开发者B：执行步骤

### 1. 理解测试场景

你的任务是验证系统在各种AI服务失败场景下的表现：
- API超时
- API返回错误
- 网络断开
- 返回空结果
- 连续失败（熔断器）

### 2. 不需要准备测试数据

这些测试使用**Mock（模拟）**的方式，不需要真实文档。

### 3. 调整Mock策略

测试中使用了 `context.route()` 来拦截API请求：

```typescript
// 示例：拦截苏格拉底对话API
await context.route('**/api/socratic/**', async (route) => {
  // 模拟超时
  route.abort('timedout');
});
```

**需要根据实际API路由调整**：
```bash
# 查看项目的API路由
ls -R app/api/

# 找到苏格拉底对话相关的API
# 例如：app/api/socratic/route.ts
# 那么拦截路径就是：**/api/socratic
```

### 4. 运行测试

```bash
# UI模式（推荐）
npx playwright test tests/e2e/critical-paths/ai-error-handling.spec.ts --ui

# 调试模式
npx playwright test tests/e2e/critical-paths/ai-error-handling.spec.ts --debug

# 运行单个测试
npx playwright test -g "AI调用超时时显示友好提示"
```

### 5. 调试常见问题

#### 问题1：Mock不生效
```
Error: 期望显示错误提示，但实际调用了真实API
```

**解决方案**：
1. 检查路由匹配是否正确
2. 使用 `--headed` 模式，打开DevTools查看Network面板
3. 确认拦截路径与实际API路径一致

#### 问题2：错误提示元素找不到
```
Error: locator('[data-testid="error-message"]') not found
```

**解决方案**：
1. 检查实际的错误提示UI是什么
2. 可能是 `<div class="error">` 或其他
3. 调整选择器：`page.locator('.error')`

#### 问题3：测试逻辑需要调整

很多测试假设了特定的错误处理逻辑，例如：
- 重试按钮
- 熔断器
- 降级内容

**如果实际产品还没实现这些功能**：
- 标记为 `test.skip()` 暂时跳过
- 或者修改测试验证当前的行为

### 6. 验收标准

✅ **通过标准**：
- 至少通过50%的测试（核心的错误处理场景）
- AI服务失败时，用户不会看到白屏或500错误
- 关键场景有友好的错误提示

📝 **记录未通过的测试**：
- 如果某些测试失败是因为功能未实现，记录下来
- 这些就是上线前必须补充的错误处理逻辑

---

## 两个人的协作点

### 1. 共享测试配置

如果发现有共同的配置需求（如登录、数据初始化），可以创建：

```typescript
// tests/e2e/helpers/setup.ts
export async function loginAsTeacher(page) {
  // 登录逻辑
}

export async function createTestCase(page) {
  // 创建测试案例
}
```

### 2. 并行运行

两个人的测试可以同时运行，互不影响：

```bash
# 终端1（开发者A）
npx playwright test four-acts-flow.spec.ts

# 终端2（开发者B）
npx playwright test ai-error-handling.spec.ts
```

### 3. 问题沟通

如果遇到共同的问题（如测试环境配置、API Mock策略），及时沟通。

---

## 预计时间安排

### Day 1
- **开发者A**：准备测试数据，调整选择器，运行第一幕和第二幕测试
- **开发者B**：理解Mock机制，调整API拦截路径，运行超时和错误测试

### Day 2
- **开发者A**：运行第三幕和第四幕测试，处理失败case
- **开发者B**：运行网络断开、空结果、熔断器测试

### Day 3
- **开发者A**：优化测试稳定性，补充边界case
- **开发者B**：补充降级逻辑测试，错误边界测试
- **两人**：代码review，整理测试报告

---

## 最终交付物

1. **测试代码**：
   - `four-acts-flow.spec.ts` 全部通过
   - `ai-error-handling.spec.ts` 至少50%通过

2. **测试报告**：
   ```bash
   # 生成HTML报告
   npx playwright show-report
   ```

3. **问题清单**：
   - 哪些测试失败了？
   - 失败原因是功能缺失还是测试问题？
   - 需要补充哪些错误处理逻辑？

4. **测试数据**：
   - `tests/fixtures/test-judgment.docx` 提交到仓库
   - 添加 `.gitignore` 规则（如果文档太大）

---

## 常见命令速查

```bash
# 运行所有E2E测试
npm run test:e2e

# 运行特定文件
npx playwright test four-acts-flow.spec.ts

# UI模式（最好用）
npx playwright test --ui

# 调试模式
npx playwright test --debug

# 只运行失败的测试
npx playwright test --last-failed

# 生成代码（自动录制操作）
npx playwright codegen http://localhost:3000
```

---

## 需要帮助？

1. 查看Playwright官方文档：https://playwright.dev/
2. 查看项目的 `playwright.config.ts` 配置
3. 联系Sean或技术负责人

**记住Sean的原则**：
- ✅ 简洁的通过方案 > 复杂的完美方案
- ✅ 先让核心路径通过，再补充边界case
- ✅ 测试失败不可怕，找到问题就是价值
