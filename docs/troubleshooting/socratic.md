# 苏格拉底对话模块故障排除指南

## 📋 目录

- [常见问题快速索引](#常见问题快速索引)
- [诊断工具](#诊断工具)
- [AI服务问题](#ai服务问题)
- [缓存相关问题](#缓存相关问题)
- [WebSocket连接问题](#websocket连接问题)
- [性能问题](#性能问题)
- [数据库问题](#数据库问题)
- [前端显示问题](#前端显示问题)
- [课堂功能问题](#课堂功能问题)
- [调试技巧](#调试技巧)
- [日志分析](#日志分析)
- [紧急处理流程](#紧急处理流程)

## 常见问题快速索引

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| AI响应超时 | API密钥问题/限流 | [查看AI服务问题](#ai响应超时) |
| 消息不显示 | WebSocket断开 | [查看WebSocket问题](#websocket断开连接) |
| 响应很慢 | 缓存未命中 | [查看缓存问题](#缓存未生效) |
| 课堂码无效 | 会话过期 | [查看课堂问题](#课堂码无法使用) |
| 页面白屏 | 组件错误 | [查看前端问题](#页面白屏) |
| 数据丢失 | 数据库连接 | [查看数据库问题](#数据库连接失败) |

## 诊断工具

### 1. 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/api/health/socratic

# 检查具体组件
curl http://localhost:3000/api/health/socratic | jq '.components'

# 持续监控
watch -n 5 'curl -s http://localhost:3000/api/health/socratic | jq .status'
```

### 2. 日志查看

```bash
# 查看实时日志
npm run logs:watch

# 查看错误日志
npm run logs:error

# 搜索特定错误
grep -r "ERROR" logs/app.log | tail -20

# 查看特定模块日志
grep -r "socratic-agent" logs/app.log
```

### 3. 性能监控

```bash
# 查看性能指标
npm run metrics

# 监控内存使用
npm run monitor:memory

# 查看响应时间
npm run monitor:response-time
```

## AI服务问题

### AI响应超时

**症状：**
- API调用超过30秒无响应
- 频繁出现"AI服务暂时不可用"

**诊断步骤：**

1. 检查API密钥配置
```bash
# 验证环境变量
echo $OPENAI_API_KEY | head -c 10
echo $DEEPSEEK_API_KEY | head -c 10
```

2. 测试API连接
```bash
# 测试OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 测试DeepSeek
curl https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY"
```

3. 检查限流状态
```typescript
// 查看限流指标
const metrics = await fetch('/api/health/socratic');
const data = await metrics.json();
console.log('AI请求状态:', data.components.find(c => c.name === 'ai-service'));
```

**解决方案：**

1. **API密钥问题**
```bash
# 更新API密钥
export OPENAI_API_KEY="sk-new-key"
# 重启服务
npm run restart
```

2. **限流处理**
```typescript
// 调整限流配置
// .env
AI_RATE_LIMIT_MAX_REQUESTS=5  # 降低请求频率
RATE_LIMIT_WINDOW_MS=120000   # 延长时间窗口
```

3. **启用降级模式**
```typescript
// 强制使用降级策略
FEATURE_AI_FALLBACK_ENABLED=true
AI_FALLBACK_THRESHOLD=3  # 3次失败后自动降级
```

### AI响应质量差

**症状：**
- 回答不相关
- 重复相同内容
- 语言不通顺

**诊断步骤：**

1. 检查Prompt模板
```typescript
// 查看当前使用的prompt
const templates = require('./lib/agents/prompt-templates');
console.log('当前模板:', templates.getTemplate(level));
```

2. 检查上下文长度
```typescript
// 上下文可能过长
const context = contextManager.build();
console.log('上下文token数:', context.tokenCount);
```

**解决方案：**

1. **优化Prompt**
```typescript
// lib/agents/prompt-templates.ts
const improvedTemplate = {
  systemPrompt: `您是一位经验丰富的法律教师，专门教授${subject}。
    请用清晰、准确的中文回答，避免重复。
    重点：${keyPoints}`,
  maxTokens: 300  // 限制回复长度
};
```

2. **压缩上下文**
```typescript
// 启用上下文压缩
const compressedContext = contextManager.compress({
  maxMessages: 5,  // 只保留最近5条
  summarize: true  // 启用摘要
});
```

## 缓存相关问题

### 缓存未生效

**症状：**
- 相同问题重复调用AI
- 缓存命中率很低
- 响应时间没有改善

**诊断步骤：**

1. 检查缓存配置
```bash
# 查看缓存状态
npm run cache:stats

# 检查Redis连接（如果使用）
redis-cli ping
```

2. 查看缓存指标
```typescript
const cacheStats = cacheManager.getStats();
console.log('缓存统计:', {
  hitRate: cacheStats.hitRate,
  size: cacheStats.size,
  hits: cacheStats.hits,
  misses: cacheStats.misses
});
```

**解决方案：**

1. **启用缓存**
```bash
# .env
CACHE_ENABLED=true
CACHE_TTL=7200  # 2小时
CACHE_MAX_SIZE=200
```

2. **优化缓存键**
```typescript
// 改进缓存键生成
const cacheKey = generateCacheKey({
  question: normalizeQuestion(question),  // 标准化问题
  level: level,
  context: hashContext(context)  // 上下文哈希
});
```

3. **预热缓存**
```typescript
// 预加载常见问题
await cacheOptimizer.preload([
  '什么是法人',
  '合同的基本要素',
  '侵权责任的构成要件'
]);
```

### 缓存溢出

**症状：**
- 内存使用过高
- 频繁的缓存淘汰
- localStorage满了

**解决方案：**

1. **调整缓存大小**
```typescript
// lib/services/cache/memory-cache.service.ts
const config = {
  maxSize: 50,  // 减少缓存条目
  ttl: 1800,    // 缩短过期时间
  strategy: 'LFU'  // 改用LFU策略
};
```

2. **清理缓存**
```bash
# 手动清理缓存
npm run cache:clear

# 清理localStorage
localStorage.clear();
```

## WebSocket连接问题

### WebSocket断开连接

**症状：**
- 实时消息不更新
- "连接已断开"提示
- 投票功能失效

**诊断步骤：**

1. 检查WebSocket服务
```bash
# 检查端口占用
lsof -i :3001

# 查看WebSocket日志
grep "websocket" logs/app.log | tail -20
```

2. 浏览器控制台检查
```javascript
// 在浏览器控制台
console.log('Socket状态:', socket.connected);
console.log('Socket ID:', socket.id);
```

**解决方案：**

1. **重启WebSocket服务**
```bash
# 重启WebSocket服务器
npm run ws:restart
```

2. **配置防火墙**
```bash
# 开放WebSocket端口
sudo ufw allow 3001
```

3. **调整心跳配置**
```typescript
// .env
WS_PING_INTERVAL=25000  # 25秒心跳
WS_PING_TIMEOUT=60000   # 60秒超时
```

### WebSocket消息丢失

**症状：**
- 部分消息未收到
- 消息顺序错乱
- 状态不同步

**解决方案：**

1. **启用消息确认**
```typescript
// 发送消息时要求确认
socket.emit('message', data, (ack) => {
  if (!ack) {
    // 重发消息
    retry(data);
  }
});
```

2. **实现消息队列**
```typescript
// 使用消息队列确保顺序
const messageQueue = new Queue();
messageQueue.process(async (msg) => {
  await sendMessage(msg);
});
```

## 性能问题

### 响应时间过长

**症状：**
- API响应超过3秒
- 页面加载缓慢
- 用户体验卡顿

**诊断步骤：**

1. 性能分析
```bash
# 运行性能测试
npm run test:performance

# 查看慢查询
npm run analyze:slow-queries
```

2. 分析瓶颈
```typescript
// 使用性能监控
import { performance } from 'perf_hooks';

const start = performance.now();
// ... 执行操作
const duration = performance.now() - start;
console.log(`操作耗时: ${duration}ms`);
```

**解决方案：**

1. **优化数据库查询**
```sql
-- 添加索引
CREATE INDEX idx_user_case ON dialogues(user_id, case_id);
CREATE INDEX idx_created_at ON dialogues(created_at DESC);
```

2. **启用并发处理**
```typescript
// 并行处理多个请求
const results = await Promise.all([
  fetchUserData(userId),
  fetchCaseData(caseId),
  fetchProgress(userId, caseId)
]);
```

3. **实现分页**
```typescript
// 分页加载消息
const messages = await getMessages({
  limit: 20,
  offset: page * 20,
  order: 'DESC'
});
```

### 内存泄漏

**症状：**
- 内存持续增长
- 页面越用越卡
- 最终崩溃

**诊断步骤：**

1. 监控内存
```bash
# 查看Node.js内存
node --inspect app.js
# 打开 chrome://inspect 查看

# 监控进程内存
top -p $(pgrep node)
```

2. 检查组件卸载
```typescript
// 确保清理副作用
useEffect(() => {
  const timer = setInterval(update, 1000);
  return () => clearInterval(timer);  // 清理定时器
}, []);
```

**解决方案：**

1. **修复事件监听器泄漏**
```typescript
// 正确移除监听器
componentWillUnmount() {
  socket.off('message');
  window.removeEventListener('resize', this.handleResize);
}
```

2. **清理大对象**
```typescript
// 及时释放大对象
let largeData = processData();
// 使用完后
largeData = null;
```

## 数据库问题

### 数据库连接失败

**症状：**
- "数据库连接失败"错误
- 数据无法保存
- 查询超时

**诊断步骤：**

1. 测试连接
```bash
# PostgreSQL
psql $DATABASE_URL -c "SELECT 1"

# 检查连接池
npm run db:pool:status
```

2. 查看连接数
```sql
-- 查看当前连接数
SELECT count(*) FROM pg_stat_activity;

-- 查看连接详情
SELECT pid, usename, application_name, state 
FROM pg_stat_activity;
```

**解决方案：**

1. **修复连接字符串**
```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname?schema=public
```

2. **调整连接池**
```typescript
// 配置连接池
const pool = new Pool({
  max: 20,        // 最大连接数
  min: 5,         // 最小连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

3. **处理连接重试**
```typescript
// 实现重连机制
async function connectWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await connect();
    } catch (error) {
      console.log(`连接失败，重试 ${i + 1}/${retries}`);
      await delay(1000 * Math.pow(2, i));
    }
  }
  throw new Error('数据库连接失败');
}
```

## 前端显示问题

### 页面白屏

**症状：**
- 页面完全空白
- 控制台有错误
- 组件未渲染

**诊断步骤：**

1. 检查控制台错误
```javascript
// 浏览器控制台
console.error  // 查看错误信息
```

2. 检查网络请求
```javascript
// Network标签查看失败的请求
// 特别注意404和500错误
```

**解决方案：**

1. **添加错误边界**
```tsx
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('组件错误:', error, errorInfo);
    // 发送错误报告
    reportError(error);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>出错了，请刷新页面重试</div>;
    }
    return this.props.children;
  }
}
```

2. **检查依赖版本**
```bash
# 检查包版本冲突
npm ls

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### 样式错乱

**症状：**
- 布局混乱
- 样式未加载
- 响应式失效

**解决方案：**

1. **清除缓存**
```bash
# 清除构建缓存
rm -rf .next
npm run build
```

2. **检查CSS模块**
```css
/* 确保CSS模块正确导入 */
.container {
  /* 使用具体的类名避免冲突 */
  display: flex;
}
```

## 课堂功能问题

### 课堂码无法使用

**症状：**
- "课堂不存在"错误
- 无法加入课堂
- 课堂码过期

**诊断步骤：**

1. 检查课堂状态
```typescript
// 查询课堂信息
const classroom = await getClassroom(code);
console.log('课堂状态:', {
  exists: !!classroom,
  expired: classroom?.expiredAt < Date.now(),
  studentCount: classroom?.students.length
});
```

**解决方案：**

1. **延长课堂时效**
```typescript
// .env
CLASSROOM_DURATION=7200000  // 2小时
CLASSROOM_MAX_IDLE=1800000  // 30分钟无活动过期
```

2. **手动延长课堂**
```typescript
// 管理员延长课堂时间
await extendClassroom(classroomId, {
  duration: 3600000  // 延长1小时
});
```

### 投票功能失效

**症状：**
- 投票按钮无响应
- 结果不更新
- 统计错误

**解决方案：**

1. **检查WebSocket事件**
```typescript
// 确保事件正确绑定
socket.on('vote:started', handleVoteStart);
socket.on('vote:update', handleVoteUpdate);
socket.on('vote:ended', handleVoteEnd);
```

2. **重置投票状态**
```typescript
// 清理投票缓存
await clearVoteCache(classroomId);
// 重新初始化
await initializeVoting(classroomId);
```

## 调试技巧

### 1. 启用调试模式

```bash
# 开发环境调试
DEBUG=* npm run dev

# 特定模块调试
DEBUG=socratic:* npm run dev

# 详细日志
LOG_LEVEL=debug npm run dev
```

### 2. 使用断点调试

```typescript
// VS Code调试配置
{
  "type": "node",
  "request": "launch",
  "name": "Debug Socratic",
  "program": "${workspaceFolder}/server.ts",
  "envFile": "${workspaceFolder}/.env.local"
}
```

### 3. 网络请求调试

```typescript
// 拦截请求查看详情
if (process.env.NODE_ENV === 'development') {
  console.log('请求详情:', {
    url: request.url,
    method: request.method,
    headers: request.headers,
    body: request.body
  });
}
```

### 4. 状态调试

```typescript
// 使用Redux DevTools
const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && 
  window.__REDUX_DEVTOOLS_EXTENSION__()
);

// Zustand调试
import { devtools } from 'zustand/middleware';
const useStore = create(devtools(store));
```

## 日志分析

### 日志级别说明

```typescript
// 日志级别从低到高
DEBUG: '详细调试信息',
INFO: '一般信息',
WARN: '警告信息',
ERROR: '错误信息',
FATAL: '致命错误'
```

### 搜索关键日志

```bash
# 查找错误
grep -E "ERROR|FATAL" logs/*.log

# 查找特定用户
grep "userId:user-123" logs/*.log

# 查找慢查询
grep "duration.*[0-9]{4,}ms" logs/*.log

# 统计错误频率
grep ERROR logs/*.log | cut -d' ' -f4 | sort | uniq -c | sort -rn
```

### 日志聚合分析

```typescript
// 使用日志聚合服务
const aggregator = new LogAggregator();

// 分析错误模式
const patterns = await aggregator.analyzePatterns({
  timeRange: '1h',
  level: 'ERROR',
  groupBy: 'message'
});

console.log('Top错误:', patterns.top(5));
```

## 紧急处理流程

### 1. 服务完全不可用

```bash
# 1. 检查服务状态
systemctl status socratic-service

# 2. 查看错误日志
tail -f logs/error.log

# 3. 重启服务
npm run restart:prod

# 4. 如果还不行，启用维护模式
export MAINTENANCE_MODE=true
export MAINTENANCE_MESSAGE="系统维护中，预计30分钟后恢复"

# 5. 回滚到上一版本
git checkout previous-version
npm run deploy:rollback
```

### 2. 数据丢失应急

```bash
# 1. 停止写入
export READ_ONLY_MODE=true

# 2. 备份当前数据
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. 检查备份
npm run backup:verify

# 4. 恢复数据
psql $DATABASE_URL < backup_latest.sql

# 5. 验证数据完整性
npm run data:integrity:check
```

### 3. AI服务故障

```typescript
// 1. 立即启用降级
process.env.FEATURE_AI_FALLBACK_ENABLED = 'true';

// 2. 切换备用服务
if (openAIFailed) {
  process.env.USE_DEEPSEEK = 'true';
}

// 3. 通知用户
notifyUsers({
  message: 'AI服务暂时降级，部分功能可能受限',
  severity: 'warning'
});
```

### 4. 性能危机处理

```bash
# 1. 限制并发
export MAX_CONCURRENT_REQUESTS=10

# 2. 清理缓存
redis-cli FLUSHDB

# 3. 重启连接池
npm run db:pool:restart

# 4. 临时扩容
npm run scale:up

# 5. 启用CDN
export USE_CDN=true
```

## 监控告警设置

### 配置告警规则

```yaml
# monitoring/alerts.yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 0.05
    action: notify_oncall
    
  - name: slow_response
    condition: p95_latency > 3000ms
    action: page_team
    
  - name: database_down
    condition: db_health == 'down'
    action: immediate_alert
    
  - name: cache_miss_high
    condition: cache_hit_rate < 0.5
    action: warning_notification
```

### 告警响应脚本

```bash
#!/bin/bash
# scripts/alert-response.sh

case $1 in
  "high_error_rate")
    # 自动重启服务
    npm run restart:safe
    ;;
  "database_down")
    # 切换到备库
    npm run db:failover
    ;;
  "memory_high")
    # 清理内存
    npm run memory:gc
    ;;
esac
```

## 预防措施

### 1. 定期维护

```bash
# 每日任务
0 2 * * * npm run maintenance:daily
- 清理过期缓存
- 压缩日志文件
- 更新统计信息

# 每周任务
0 3 * * 0 npm run maintenance:weekly
- 数据库优化
- 完整备份
- 性能报告
```

### 2. 容量规划

```typescript
// 监控资源使用趋势
const trends = await analyzeResourceTrends({
  period: '30d',
  metrics: ['cpu', 'memory', 'storage', 'bandwidth']
});

if (trends.growth > 0.2) {
  console.warn('需要扩容规划');
}
```

### 3. 灾备演练

```bash
# 每月灾备演练
npm run dr:drill

# 验证备份可恢复性
npm run backup:test:restore

# 测试故障转移
npm run failover:test
```

## 联系支持

### 技术支持渠道

- 🚨 **紧急热线**: +86-xxx-xxxx (7x24)
- 📧 **技术邮箱**: tech-support@law-education.com
- 💬 **Slack频道**: #socratic-support
- 📱 **微信群**: 扫码加入技术支持群

### 上报问题模板

```markdown
## 问题描述
[简要描述问题]

## 复现步骤
1. 
2. 
3. 

## 期望行为
[应该发生什么]

## 实际行为
[实际发生了什么]

## 环境信息
- 版本：
- 浏览器：
- 操作系统：

## 日志/截图
[附加相关信息]
```

---

*最后更新：2024年12月9日*
*版本：v1.1.0*