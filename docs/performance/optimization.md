# 苏格拉底对话模块性能调优指南

## 📊 目录

- [性能指标基准](#性能指标基准)
- [性能监控工具](#性能监控工具)
- [前端优化](#前端优化)
- [后端优化](#后端优化)
- [数据库优化](#数据库优化)
- [缓存优化](#缓存优化)
- [AI服务优化](#ai服务优化)
- [WebSocket优化](#websocket优化)
- [资源优化](#资源优化)
- [性能测试](#性能测试)
- [优化检查清单](#优化检查清单)
- [案例研究](#案例研究)

## 性能指标基准

### 核心性能指标（KPI）

| 指标 | 目标值 | 警告阈值 | 严重阈值 |
|------|--------|----------|----------|
| **API响应时间(P50)** | < 200ms | > 500ms | > 1000ms |
| **API响应时间(P95)** | < 500ms | > 1000ms | > 3000ms |
| **AI响应时间** | < 2s | > 5s | > 10s |
| **首屏加载时间(FCP)** | < 1.5s | > 2.5s | > 4s |
| **可交互时间(TTI)** | < 3s | > 5s | > 8s |
| **缓存命中率** | > 80% | < 60% | < 40% |
| **WebSocket延迟** | < 50ms | > 100ms | > 200ms |
| **并发用户数** | > 1000 | < 500 | < 100 |
| **错误率** | < 0.1% | > 1% | > 5% |
| **内存使用** | < 512MB | > 1GB | > 2GB |

### 性能预算

```javascript
// performance-budget.json
{
  "bundles": {
    "main": { "maxSize": "300KB" },
    "vendor": { "maxSize": "500KB" },
    "lazy": { "maxSize": "200KB" }
  },
  "resources": {
    "scripts": { "maxSize": "1MB" },
    "styles": { "maxSize": "200KB" },
    "images": { "maxSize": "500KB" },
    "fonts": { "maxSize": "100KB" }
  },
  "metrics": {
    "fcp": { "max": 1500 },
    "lcp": { "max": 2500 },
    "tti": { "max": 3000 },
    "cls": { "max": 0.1 }
  }
}
```

## 性能监控工具

### 1. 内置性能监控

```typescript
// lib/monitoring/performance.ts
import { socraticPerformance } from '@/lib/services/socratic-performance';

// 启用性能监控
socraticPerformance.startMonitoring({
  sampleRate: 0.1, // 10%采样率
  reportInterval: 60000, // 每分钟上报
  metrics: ['api', 'render', 'resource', 'custom']
});

// 查看实时指标
const metrics = socraticPerformance.getMetrics();
console.log('性能指标:', {
  平均响应时间: metrics.averageResponseTime,
  P95响应时间: metrics.p95ResponseTime,
  缓存命中率: metrics.cacheHitRate,
  错误率: metrics.errorRate
});
```

### 2. 浏览器性能分析

```javascript
// 使用Performance API
const perfData = performance.getEntriesByType('navigation')[0];
console.log('页面加载性能:', {
  DNS查询: perfData.domainLookupEnd - perfData.domainLookupStart,
  TCP连接: perfData.connectEnd - perfData.connectStart,
  请求响应: perfData.responseEnd - perfData.requestStart,
  DOM解析: perfData.domInteractive - perfData.domLoading,
  DOM完成: perfData.domComplete - perfData.domContentLoadedEventStart,
  页面加载: perfData.loadEventEnd - perfData.loadEventStart
});
```

### 3. 性能监控仪表板

```bash
# 启动性能监控仪表板
npm run monitor:dashboard

# 实时查看指标
npm run monitor:realtime

# 生成性能报告
npm run performance:report
```

## 前端优化

### 1. 代码分割与懒加载

```typescript
// 路由级代码分割
const SocraticDialog = lazy(() => 
  import(/* webpackChunkName: "socratic" */ './components/SocraticDialog')
);

// 组件级懒加载
const TeacherPanel = lazy(() => 
  import(/* webpackChunkName: "teacher" */ './components/TeacherPanel')
);

// 条件加载
const loadHeavyComponent = async () => {
  if (userNeedsFeature) {
    const { HeavyComponent } = await import('./HeavyComponent');
    return HeavyComponent;
  }
  return null;
};
```

### 2. 组件优化

```typescript
// 使用React.memo优化
const MessageItem = React.memo(({ message }) => {
  return <div>{message.content}</div>;
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content;
});

// 使用useMemo缓存计算结果
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// 使用useCallback避免重复创建函数
const handleClick = useCallback((id) => {
  doSomething(id);
}, []);
```

### 3. 虚拟滚动实现

```typescript
// components/VirtualMessageList.tsx
import { FixedSizeList } from 'react-window';

const VirtualMessageList = ({ messages }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <MessageItem message={messages[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 4. 图片优化

```typescript
// 使用Next.js Image组件
import Image from 'next/image';

<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={50}
  height={50}
  loading="lazy" // 懒加载
  placeholder="blur" // 模糊占位符
  quality={75} // 压缩质量
/>

// 响应式图片
<picture>
  <source 
    media="(max-width: 768px)" 
    srcSet="/avatar-mobile.webp"
    type="image/webp"
  />
  <source 
    media="(min-width: 769px)" 
    srcSet="/avatar-desktop.webp"
    type="image/webp"
  />
  <img src="/avatar.jpg" alt="Avatar" />
</picture>
```

### 5. 状态管理优化

```typescript
// 使用状态分片避免不必要的渲染
const useOptimizedStore = create((set, get) => ({
  // 分片状态
  messages: [],
  userInfo: {},
  settings: {},
  
  // 使用选择器
  getVisibleMessages: () => {
    const { messages, filter } = get();
    return messages.filter(filter);
  },
  
  // 批量更新
  batchUpdate: (updates) => {
    set((state) => ({
      ...state,
      ...updates
    }));
  }
}));

// 使用浅比较选择器
const messages = useOptimizedStore(
  state => state.messages,
  shallow
);
```

## 后端优化

### 1. API响应优化

```typescript
// 使用流式响应
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // 异步写入数据
  (async () => {
    for await (const chunk of generateResponse()) {
      await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    }
    await writer.close();
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### 2. 并发处理优化

```typescript
// 使用Promise.all并行处理
async function processRequest(userId: string, caseId: string) {
  const [user, caseData, history, progress] = await Promise.all([
    getUserData(userId),
    getCaseData(caseId),
    getHistory(userId, caseId),
    getProgress(userId, caseId)
  ]);
  
  return { user, caseData, history, progress };
}

// 使用批处理减少数据库查询
async function batchProcess(ids: string[]) {
  const batchSize = 100;
  const results = [];
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
  }
  
  return results;
}
```

### 3. 中间件优化

```typescript
// 响应压缩
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    // 只压缩文本内容
    const type = res.getHeader('Content-Type');
    return /text|json|javascript/.test(type);
  },
  threshold: 1024 // 只压缩大于1KB的响应
}));

// 请求合并
const requestMerger = new Map();

async function mergeRequests(key: string, fn: Function) {
  if (requestMerger.has(key)) {
    return requestMerger.get(key);
  }
  
  const promise = fn();
  requestMerger.set(key, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    requestMerger.delete(key);
  }
}
```

### 4. 连接池优化

```typescript
// 数据库连接池配置
const pool = new Pool({
  max: 20, // 最大连接数
  min: 5,  // 最小连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // 连接池预热
  initializationFailTimeout: 30000,
});

// 连接池监控
pool.on('connect', (client) => {
  console.log('新连接建立');
});

pool.on('remove', (client) => {
  console.log('连接移除');
});

// 定期清理空闲连接
setInterval(() => {
  pool.query('SELECT 1'); // 保持连接活跃
}, 60000);
```

## 数据库优化

### 1. 查询优化

```sql
-- 添加必要的索引
CREATE INDEX idx_dialogues_user_case ON dialogues(user_id, case_id);
CREATE INDEX idx_dialogues_created ON dialogues(created_at DESC);
CREATE INDEX idx_messages_dialogue ON messages(dialogue_id, created_at);

-- 使用部分索引
CREATE INDEX idx_active_sessions ON sessions(user_id) 
WHERE expired_at > NOW();

-- 复合索引优化
CREATE INDEX idx_compound ON dialogues(user_id, case_id, level, created_at);

-- 分析查询计划
EXPLAIN ANALYZE 
SELECT * FROM dialogues 
WHERE user_id = $1 AND case_id = $2 
ORDER BY created_at DESC 
LIMIT 20;
```

### 2. 查询优化技巧

```typescript
// 使用投影减少数据传输
const messages = await db.query(
  `SELECT id, content, created_at 
   FROM messages 
   WHERE dialogue_id = $1 
   LIMIT 20`,
  [dialogueId]
);

// 使用批量插入
const values = messages.map((m, i) => 
  `($${i*3+1}, $${i*3+2}, $${i*3+3})`
).join(',');

await db.query(
  `INSERT INTO messages (content, user_id, dialogue_id) 
   VALUES ${values}`,
  messages.flat()
);

// 使用CTE优化复杂查询
const result = await db.query(`
  WITH user_stats AS (
    SELECT user_id, COUNT(*) as message_count
    FROM messages
    WHERE created_at > NOW() - INTERVAL '1 day'
    GROUP BY user_id
  )
  SELECT u.*, s.message_count
  FROM users u
  JOIN user_stats s ON u.id = s.user_id
  WHERE s.message_count > 10
`);
```

### 3. 数据库连接优化

```typescript
// 读写分离
class DatabaseManager {
  private readPool: Pool;
  private writePool: Pool;
  
  async read(query: string, params?: any[]) {
    return this.readPool.query(query, params);
  }
  
  async write(query: string, params?: any[]) {
    return this.writePool.query(query, params);
  }
}

// 连接复用
const dbManager = new DatabaseManager();

// 事务优化
async function bulkOperation(operations: any[]) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const op of operations) {
      await client.query(op.query, op.params);
    }
    
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
```

## 缓存优化

### 1. 多级缓存策略

```typescript
// lib/services/cache/multi-tier-cache.ts
class MultiTierCache {
  private l1Cache: MemoryCache;  // 内存缓存
  private l2Cache: RedisCache;   // Redis缓存
  private l3Cache: CDNCache;     // CDN缓存
  
  async get(key: string): Promise<any> {
    // L1查询
    let value = await this.l1Cache.get(key);
    if (value) {
      this.recordHit('L1');
      return value;
    }
    
    // L2查询
    value = await this.l2Cache.get(key);
    if (value) {
      this.recordHit('L2');
      await this.l1Cache.set(key, value, 300); // 回填L1
      return value;
    }
    
    // L3查询
    value = await this.l3Cache.get(key);
    if (value) {
      this.recordHit('L3');
      await this.promoteToUpperTiers(key, value);
      return value;
    }
    
    this.recordMiss();
    return null;
  }
  
  private async promoteToUpperTiers(key: string, value: any) {
    await Promise.all([
      this.l1Cache.set(key, value, 300),
      this.l2Cache.set(key, value, 3600)
    ]);
  }
}
```

### 2. 缓存预热策略

```typescript
// 启动时预热缓存
async function warmupCache() {
  const hotQuestions = [
    '什么是法人',
    '合同的基本要素',
    '民事行为能力',
    '侵权责任',
    '知识产权'
  ];
  
  console.log('开始缓存预热...');
  
  await Promise.all(
    hotQuestions.map(async (question) => {
      const response = await generateResponse(question);
      await cache.set(getCacheKey(question), response, 7200);
    })
  );
  
  console.log('缓存预热完成');
}

// 定期刷新热点数据
setInterval(async () => {
  const hotKeys = await cache.getHotKeys();
  
  for (const key of hotKeys) {
    const ttl = await cache.ttl(key);
    if (ttl < 600) { // 即将过期
      const newValue = await refreshData(key);
      await cache.set(key, newValue, 7200);
    }
  }
}, 60000);
```

### 3. 智能缓存失效

```typescript
// 基于依赖的缓存失效
class DependencyCache {
  private dependencies = new Map<string, Set<string>>();
  
  async set(key: string, value: any, deps: string[] = []) {
    await this.cache.set(key, value);
    
    // 记录依赖关系
    for (const dep of deps) {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(key);
    }
  }
  
  async invalidate(dependency: string) {
    const affected = this.dependencies.get(dependency);
    if (affected) {
      await Promise.all(
        Array.from(affected).map(key => this.cache.delete(key))
      );
      this.dependencies.delete(dependency);
    }
  }
}
```

## AI服务优化

### 1. Token优化

```typescript
// 优化prompt长度
function optimizePrompt(prompt: string, maxTokens: number = 500): string {
  // 移除多余空白
  prompt = prompt.replace(/\s+/g, ' ').trim();
  
  // 使用缩写
  const abbreviations = {
    '例如': 'eg',
    '也就是说': 'ie',
    '等等': 'etc'
  };
  
  for (const [full, abbr] of Object.entries(abbreviations)) {
    prompt = prompt.replace(new RegExp(full, 'g'), abbr);
  }
  
  // 截断过长内容
  const tokens = estimateTokens(prompt);
  if (tokens > maxTokens) {
    prompt = truncateToTokenLimit(prompt, maxTokens);
  }
  
  return prompt;
}

// 批量处理请求
async function batchAIRequests(questions: string[]) {
  const batchSize = 5;
  const results = [];
  
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(q => callAI(q))
    );
    results.push(...batchResults);
    
    // 避免触发限流
    if (i + batchSize < questions.length) {
      await delay(1000);
    }
  }
  
  return results;
}
```

### 2. 响应流优化

```typescript
// 使用流式响应减少延迟
async function* streamAIResponse(prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });
  
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

// 客户端处理流式响应
async function handleStream() {
  const response = await fetch('/api/socratic', {
    method: 'POST',
    headers: { 'Accept': 'text/event-stream' }
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    // 立即显示部分内容
    appendToUI(text);
  }
}
```

### 3. 模型选择优化

```typescript
// 根据任务复杂度选择模型
function selectOptimalModel(task: AITask) {
  const complexity = calculateComplexity(task);
  
  if (complexity < 0.3) {
    // 简单任务用小模型
    return {
      model: 'gpt-3.5-turbo',
      maxTokens: 200,
      temperature: 0.5
    };
  } else if (complexity < 0.7) {
    // 中等任务
    return {
      model: 'gpt-3.5-turbo-16k',
      maxTokens: 500,
      temperature: 0.7
    };
  } else {
    // 复杂任务用大模型
    return {
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.8
    };
  }
}
```

## WebSocket优化

### 1. 连接管理优化

```typescript
// 连接池管理
class WebSocketPool {
  private connections = new Map<string, WebSocket>();
  private maxConnections = 1000;
  
  async addConnection(userId: string, ws: WebSocket) {
    // 检查连接数限制
    if (this.connections.size >= this.maxConnections) {
      // 清理不活跃连接
      await this.cleanupInactive();
    }
    
    // 复用现有连接
    const existing = this.connections.get(userId);
    if (existing && existing.readyState === WebSocket.OPEN) {
      return existing;
    }
    
    this.connections.set(userId, ws);
    return ws;
  }
  
  private async cleanupInactive() {
    const now = Date.now();
    const timeout = 300000; // 5分钟
    
    for (const [userId, ws] of this.connections) {
      if (ws.lastActivity && now - ws.lastActivity > timeout) {
        ws.close();
        this.connections.delete(userId);
      }
    }
  }
}
```

### 2. 消息批处理

```typescript
// 批量发送消息
class MessageBatcher {
  private queue = new Map<string, any[]>();
  private interval = 100; // 100ms批处理间隔
  
  constructor() {
    setInterval(() => this.flush(), this.interval);
  }
  
  send(userId: string, message: any) {
    if (!this.queue.has(userId)) {
      this.queue.set(userId, []);
    }
    this.queue.get(userId)!.push(message);
  }
  
  private flush() {
    for (const [userId, messages] of this.queue) {
      if (messages.length > 0) {
        const ws = getWebSocket(userId);
        if (ws) {
          ws.send(JSON.stringify({
            type: 'batch',
            messages
          }));
        }
        this.queue.set(userId, []);
      }
    }
  }
}
```

### 3. 消息压缩

```typescript
// 使用消息压缩
import pako from 'pako';

function compressMessage(message: any): ArrayBuffer {
  const json = JSON.stringify(message);
  return pako.deflate(json);
}

function decompressMessage(data: ArrayBuffer): any {
  const json = pako.inflate(data, { to: 'string' });
  return JSON.parse(json);
}

// WebSocket配置
const wss = new WebSocketServer({
  perMessageDeflate: {
    zlibDeflateOptions: {
      level: 6, // 压缩级别
      memLevel: 8,
      strategy: 2
    },
    threshold: 1024 // 大于1KB才压缩
  }
});
```

## 资源优化

### 1. Bundle优化

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    // 代码分割配置
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        vendor: {
          name: 'vendor',
          chunks: 'all',
          test: /node_modules/,
          priority: 20
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true,
          enforce: true
        }
      }
    };
    
    // Tree shaking
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    return config;
  },
  
  // 启用SWC编译器
  swcMinify: true,
  
  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天
  }
};
```

### 2. 预加载关键资源

```html
<!-- 预连接到关键域名 -->
<link rel="preconnect" href="https://api.openai.com">
<link rel="dns-prefetch" href="https://api.openai.com">

<!-- 预加载关键资源 -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/css/critical.css" as="style">
<link rel="prefetch" href="/js/dialog.js" as="script">

<!-- 预渲染下一页 -->
<link rel="prerender" href="/next-page">
```

### 3. Service Worker缓存

```javascript
// sw.js
const CACHE_NAME = 'socratic-v1';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/offline.html'
];

// 安装时缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 网络优先，缓存备用
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 缓存新响应
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

## 性能测试

### 1. 负载测试脚本

```typescript
// __tests__/performance/load.test.ts
import { performance } from 'perf_hooks';

describe('负载测试', () => {
  it('应该支持100个并发用户', async () => {
    const users = 100;
    const duration = 60000; // 1分钟
    const results = [];
    
    const promises = Array(users).fill(0).map(async (_, i) => {
      const userId = `user-${i}`;
      const start = performance.now();
      
      while (performance.now() - start < duration) {
        const reqStart = performance.now();
        await makeRequest(userId);
        const reqDuration = performance.now() - reqStart;
        results.push(reqDuration);
        
        await delay(Math.random() * 1000); // 随机延迟
      }
    });
    
    await Promise.all(promises);
    
    // 分析结果
    const p50 = percentile(results, 50);
    const p95 = percentile(results, 95);
    const p99 = percentile(results, 99);
    
    expect(p50).toBeLessThan(200);
    expect(p95).toBeLessThan(500);
    expect(p99).toBeLessThan(1000);
  });
});
```

### 2. 性能基准测试

```bash
# 运行基准测试
npm run benchmark

# 使用k6进行压力测试
k6 run scripts/load-test.js

# 使用Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/socratic
```

### 3. 性能回归测试

```typescript
// 性能预算检查
const checkPerformanceBudget = async () => {
  const metrics = await collectMetrics();
  const budget = loadBudget();
  
  const violations = [];
  
  for (const [metric, limit] of Object.entries(budget)) {
    if (metrics[metric] > limit) {
      violations.push({
        metric,
        limit,
        actual: metrics[metric],
        exceeded: ((metrics[metric] - limit) / limit * 100).toFixed(2)
      });
    }
  }
  
  if (violations.length > 0) {
    console.error('性能预算超标:', violations);
    process.exit(1);
  }
};
```

## 优化检查清单

### 前端优化清单

- [ ] 启用代码分割和懒加载
- [ ] 实现虚拟滚动
- [ ] 优化图片加载（WebP、懒加载、响应式）
- [ ] 使用React.memo和useMemo
- [ ] 减少不必要的重渲染
- [ ] 优化Bundle大小
- [ ] 启用Gzip/Brotli压缩
- [ ] 使用CDN加速静态资源
- [ ] 实现Service Worker缓存
- [ ] 优化关键渲染路径

### 后端优化清单

- [ ] 实现API响应缓存
- [ ] 优化数据库查询（索引、批处理）
- [ ] 使用连接池
- [ ] 实现请求合并
- [ ] 启用响应压缩
- [ ] 优化中间件顺序
- [ ] 实现限流保护
- [ ] 使用流式响应
- [ ] 优化错误处理
- [ ] 实现健康检查

### 缓存优化清单

- [ ] 实现多级缓存
- [ ] 配置合理的TTL
- [ ] 实现缓存预热
- [ ] 监控缓存命中率
- [ ] 实现智能失效策略
- [ ] 优化缓存键设计
- [ ] 实现缓存压缩
- [ ] 配置缓存容量限制
- [ ] 实现缓存降级策略
- [ ] 监控缓存性能

## 案例研究

### 案例1：响应时间优化

**问题描述：**
API平均响应时间达到3秒，用户体验差。

**分析过程：**
1. 使用APM工具分析慢请求
2. 发现数据库查询占用2.5秒
3. 查询计划显示缺少索引

**优化方案：**
```sql
-- 添加复合索引
CREATE INDEX idx_dialogues_lookup 
ON dialogues(user_id, case_id, created_at DESC);

-- 优化查询
SELECT * FROM dialogues 
WHERE user_id = $1 AND case_id = $2 
ORDER BY created_at DESC 
LIMIT 20;
```

**优化结果：**
- 响应时间从3秒降到200ms
- 数据库CPU使用率降低60%
- 用户满意度提升40%

### 案例2：缓存优化

**问题描述：**
缓存命中率只有30%，AI服务调用频繁。

**分析过程：**
1. 分析缓存键分布
2. 发现相似问题使用不同缓存键
3. 缓存过期时间过短

**优化方案：**
```typescript
// 实现相似度匹配
const findSimilarCache = async (question: string) => {
  const allKeys = await cache.keys('question:*');
  
  for (const key of allKeys) {
    const cached = await cache.get(key);
    if (similarity(question, cached.question) > 0.85) {
      return cached.response;
    }
  }
  
  return null;
};

// 延长缓存时间
const CACHE_TTL = 7200; // 2小时
```

**优化结果：**
- 缓存命中率提升到85%
- AI服务调用减少70%
- 成本降低60%

### 案例3：并发优化

**问题描述：**
100个并发用户时系统崩溃。

**分析过程：**
1. 内存使用急剧上升
2. 数据库连接池耗尽
3. WebSocket连接数超限

**优化方案：**
```typescript
// 优化连接池
const pool = new Pool({
  max: 50, // 增加到50
  min: 10,
  idleTimeoutMillis: 30000
});

// 实现连接复用
const connectionManager = new ConnectionManager({
  maxPerUser: 1,
  maxTotal: 500,
  reuseConnections: true
});

// 内存优化
const cache = new LRUCache({
  max: 500, // 限制缓存条目
  maxAge: 1000 * 60 * 60,
  updateAgeOnGet: true
});
```

**优化结果：**
- 支持500+并发用户
- 内存使用稳定在512MB
- 响应时间保持在500ms以内

## 性能监控最佳实践

### 1. 建立基线

```typescript
// 记录性能基线
const baseline = {
  responseTime: { p50: 150, p95: 400, p99: 800 },
  throughput: 1000, // req/s
  errorRate: 0.001,
  cacheHitRate: 0.8
};

// 监控偏差
const checkDeviation = (current: Metrics) => {
  const deviation = {
    responseTime: (current.p95 - baseline.responseTime.p95) / baseline.responseTime.p95,
    errorRate: (current.errorRate - baseline.errorRate) / baseline.errorRate
  };
  
  if (Math.abs(deviation.responseTime) > 0.2) {
    alert('响应时间偏离基线20%');
  }
};
```

### 2. 实时告警

```typescript
// 配置告警规则
const alertRules = [
  {
    name: '响应时间过长',
    condition: (m) => m.p95ResponseTime > 1000,
    severity: 'warning'
  },
  {
    name: '错误率过高',
    condition: (m) => m.errorRate > 0.05,
    severity: 'critical'
  },
  {
    name: '内存泄漏',
    condition: (m) => m.memoryGrowthRate > 10, // MB/min
    severity: 'warning'
  }
];

// 定期检查
setInterval(() => {
  const metrics = collectMetrics();
  
  for (const rule of alertRules) {
    if (rule.condition(metrics)) {
      sendAlert(rule.name, rule.severity);
    }
  }
}, 60000);
```

### 3. 性能报告

```typescript
// 生成性能报告
async function generatePerformanceReport() {
  const report = {
    period: '2024-12-01 to 2024-12-07',
    summary: {
      avgResponseTime: 185,
      p95ResponseTime: 450,
      totalRequests: 1000000,
      errorRate: 0.08,
      cacheHitRate: 0.82,
      availability: 0.9998
    },
    improvements: [
      '实施缓存预热，命中率提升15%',
      '优化数据库索引，查询速度提升40%',
      '启用CDN，静态资源加载速度提升60%'
    ],
    issues: [
      '凌晨2-3点存在性能下降，需要调查',
      '某些API端点响应时间超标'
    ],
    recommendations: [
      '考虑升级数据库实例',
      '实施更激进的缓存策略',
      '优化前端Bundle大小'
    ]
  };
  
  return report;
}
```

## 总结

性能优化是一个持续的过程，需要：

1. **建立监控体系**：实时了解系统性能状态
2. **设定性能目标**：明确的性能指标和预算
3. **持续优化**：定期分析和改进
4. **自动化测试**：防止性能回归
5. **团队协作**：前后端共同努力

记住：
- 先测量，后优化
- 关注用户体验指标
- 平衡性能与成本
- 保持代码可维护性

---

*最后更新：2024年12月9日*
*版本：v1.1.0*