# 苏格拉底对话模块集成指南

## 📚 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [架构说明](#架构说明)
- [集成步骤](#集成步骤)
- [配置说明](#配置说明)
- [API参考](#api参考)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 概述

苏格拉底对话模块是一个基于AI的法律教育对话系统，通过渐进式提问引导学生深入理解法律概念。本指南将帮助您将该模块集成到现有系统中。

### 核心特性

- 🤖 **AI驱动的智能对话**：基于OpenAI/DeepSeek的法律专业对话
- 📚 **五层递进式教学**：从基础到深度的渐进式引导
- 👥 **实时多人协作**：支持课堂模式的实时互动
- 📊 **学习分析**：全面的学习进度跟踪和分析
- 🔄 **智能缓存**：高效的响应缓存机制
- 🛡️ **降级保护**：AI服务故障时的自动降级

## 快速开始

### 前置要求

```bash
# Node.js版本要求
node >= 18.0.0
npm >= 9.0.0

# 必需的环境变量
OPENAI_API_KEY=sk-xxx  # 或 DEEPSEEK_API_KEY
DATABASE_URL=postgresql://xxx
REDIS_URL=redis://xxx  # 可选，用于分布式缓存
```

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-org/law-education-platform.git
cd law-education-platform
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置
```

4. **运行开发服务器**
```bash
npm run dev
```

## 架构说明

### 系统架构

```
┌─────────────────┐
│   前端应用      │
│  (React/Next)   │
└────────┬────────┘
         │
    ┌────▼────┐
    │  API层   │
    │ (Next.js)│
    └────┬────┘
         │
    ┌────▼────────────┐
    │   业务逻辑层     │
    │  ┌──────────┐   │
    │  │ Agent    │   │
    │  │ Service  │   │
    │  └──────────┘   │
    └─────────────────┘
         │
    ┌────▼────────────┐
    │   数据层        │
    │  ┌──────────┐   │
    │  │ Cache    │   │
    │  │ Database │   │
    │  └──────────┘   │
    └─────────────────┘
```

### 核心模块

1. **Agent模块** (`/lib/agents/`)
   - 法律对话Agent
   - Prompt模板管理
   - 上下文管理

2. **服务层** (`/lib/services/`)
   - 缓存服务
   - 会话管理
   - WebSocket通信

3. **API路由** (`/app/api/`)
   - 苏格拉底对话API
   - 课堂管理API
   - 健康检查API

4. **前端组件** (`/components/socratic/`)
   - 对话界面
   - 进度展示
   - 教师控制面板

## 集成步骤

### 1. 基础集成

#### 1.1 引入核心组件

```tsx
// 在您的页面中引入苏格拉底对话组件
import Act5SocraticDiscussion from '@/components/acts/Act5SocraticDiscussion';

export default function LegalEducationPage() {
  return (
    <div>
      <Act5SocraticDiscussion 
        caseId="case-001"
        userId="user-123"
        mode="individual" // 或 "classroom"
      />
    </div>
  );
}
```

#### 1.2 配置Store

```tsx
// 在您的应用中配置状态管理
import { useSocraticStore } from '@/lib/stores/socraticStore';

function MyApp({ Component, pageProps }) {
  // Store会自动初始化
  return <Component {...pageProps} />;
}
```

### 2. API集成

#### 2.1 对话API调用

```typescript
// 发起对话请求
const response = await fetch('/api/socratic', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    caseId: 'case-001',
    userId: 'user-123',
    message: '什么是法人？',
    level: 1,
    context: {
      previousMessages: [],
      caseContext: '公司法相关案例'
    }
  })
});

const data = await response.json();
```

#### 2.2 流式响应处理

```typescript
// 处理流式响应
const response = await fetch('/api/socratic', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify(requestData)
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // 处理流式数据
  console.log('Received:', chunk);
}
```

### 3. 课堂模式集成

#### 3.1 创建课堂

```typescript
// 教师创建课堂
const classroom = await fetch('/api/classroom', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'create',
    teacherId: 'teacher-123',
    config: {
      maxStudents: 30,
      duration: 3600000, // 1小时
      features: {
        voting: true,
        handRaising: true
      }
    }
  })
});

const { classroomCode } = await classroom.json();
// 返回6位课堂码，如: "A1B2C3"
```

#### 3.2 加入课堂

```typescript
// 学生加入课堂
const joinResponse = await fetch('/api/classroom', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'join',
    classroomCode: 'A1B2C3',
    userId: 'student-456',
    userName: '张三'
  })
});
```

### 4. WebSocket实时通信

#### 4.1 建立连接

```typescript
import { useWebSocket } from '@/lib/hooks/useWebSocket';

function ClassroomComponent() {
  const { socket, connected, error } = useWebSocket({
    classroomId: 'classroom-123',
    userId: 'user-456',
    onMessage: (event, data) => {
      console.log('Received event:', event, data);
    }
  });

  // 发送消息
  const sendMessage = (message: string) => {
    socket.emit('message', {
      content: message,
      timestamp: Date.now()
    });
  };

  return (
    <div>
      {connected ? '已连接' : '连接中...'}
    </div>
  );
}
```

#### 4.2 事件处理

```typescript
// WebSocket事件类型
interface SocketEvents {
  'user:joined': { userId: string; userName: string };
  'user:left': { userId: string };
  'message': { userId: string; content: string; timestamp: number };
  'vote:started': { question: string; options: string[] };
  'vote:result': { results: Record<string, number> };
  'hand:raised': { userId: string };
  'level:changed': { level: number };
}

// 监听事件
socket.on('vote:started', (data) => {
  console.log('投票开始:', data);
});
```

## 配置说明

### 环境变量配置

```bash
# AI服务配置（二选一）
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# 或使用DeepSeek
DEEPSEEK_API_KEY=ds-xxx
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# 数据库配置
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis配置（可选）
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=xxx
REDIS_TTL=3600

# WebSocket配置
WS_PORT=3001
WS_CORS_ORIGIN=http://localhost:3000
WS_MAX_CONNECTIONS=1000
WS_PING_INTERVAL=30000

# 缓存配置
CACHE_ENABLED=true
CACHE_TTL=3600
CACHE_MAX_SIZE=100

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_MAX_REQUESTS=10

# 功能开关
FEATURE_SOCRATIC_ENABLED=true
FEATURE_CLASSROOM_ENABLED=true
FEATURE_VOTING_ENABLED=true
FEATURE_AI_FALLBACK_ENABLED=true

# 监控配置
MONITORING_ENABLED=true
LOG_LEVEL=info
LOG_FORMAT=json

# 维护模式
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=系统维护中，请稍后再试
MAINTENANCE_END_TIME=2024-12-31T23:59:59Z
```

### 缓存策略配置

```typescript
// lib/services/cache/optimizer.ts
const cacheConfig = {
  // L1缓存（内存）
  memory: {
    maxSize: 100,
    ttl: 300, // 5分钟
    strategy: 'LRU'
  },
  
  // L2缓存（localStorage）
  localStorage: {
    maxSize: 50,
    ttl: 3600, // 1小时
    compress: true
  },
  
  // 相似度匹配
  similarity: {
    threshold: 0.85,
    algorithm: 'cosine'
  },
  
  // 预加载策略
  preload: {
    enabled: true,
    threshold: 3, // 访问3次后预加载相关内容
    maxPreloadSize: 10
  }
};
```

## API参考

### 苏格拉底对话API

#### POST /api/socratic

发起苏格拉底式对话。

**请求体：**
```json
{
  "caseId": "string",
  "userId": "string",
  "message": "string",
  "level": 1-5,
  "mode": "individual|classroom",
  "context": {
    "previousMessages": [],
    "caseContext": "string",
    "userProfile": {}
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "question": "string",
    "hints": ["string"],
    "level": 1-5,
    "progress": 0.0-1.0,
    "feedback": "string",
    "nextSteps": ["string"]
  },
  "metadata": {
    "responseTime": 123,
    "cached": false,
    "model": "gpt-3.5-turbo"
  }
}
```

### 课堂管理API

#### POST /api/classroom

管理课堂会话。

**创建课堂：**
```json
{
  "action": "create",
  "teacherId": "string",
  "config": {
    "maxStudents": 30,
    "duration": 3600000,
    "features": {
      "voting": true,
      "handRaising": true
    }
  }
}
```

**加入课堂：**
```json
{
  "action": "join",
  "classroomCode": "string",
  "userId": "string",
  "userName": "string"
}
```

### 健康检查API

#### GET /api/health/socratic

检查服务健康状态。

**响应：**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 3600,
  "components": [
    {
      "name": "database",
      "status": "up",
      "responseTime": 5
    },
    {
      "name": "ai-service",
      "status": "up",
      "responseTime": 150
    }
  ],
  "metrics": {
    "requests": 1000,
    "errors": 5,
    "averageResponseTime": 200,
    "cacheHitRate": 0.85
  }
}
```

## 最佳实践

### 1. 性能优化

- **启用缓存**：利用多级缓存减少AI调用
- **批量请求**：合并多个请求减少网络开销
- **懒加载**：按需加载组件和资源
- **虚拟滚动**：处理大量消息时使用虚拟滚动

### 2. 错误处理

```typescript
try {
  const response = await fetch('/api/socratic', options);
  
  if (!response.ok) {
    // 处理HTTP错误
    if (response.status === 429) {
      // 限流，等待后重试
      await delay(1000);
      return retry();
    }
    
    if (response.status === 503) {
      // 服务不可用，使用降级方案
      return useFallback();
    }
  }
  
  const data = await response.json();
  return data;
  
} catch (error) {
  // 网络错误处理
  console.error('API调用失败:', error);
  return useOfflineMode();
}
```

### 3. 安全考虑

- **输入验证**：所有用户输入都需要验证和清理
- **限流保护**：防止API滥用
- **权限控制**：教师功能需要权限验证
- **数据加密**：敏感数据传输使用HTTPS

### 4. 监控建议

```typescript
// 记录关键指标
import { socraticPerformance } from '@/lib/services/socratic-performance';

// 记录API响应时间
socraticPerformance.recordAPIRequest({
  endpoint: '/api/socratic',
  method: 'POST',
  duration: responseTime,
  status: response.status,
  error: error?.message
});

// 记录用户行为
socraticPerformance.recordUserAction({
  action: 'submit_answer',
  userId: 'user-123',
  level: currentLevel,
  success: true
});
```

## 常见问题

### Q1: AI服务调用失败怎么办？

系统会自动启用降级策略，使用预设问题库继续对话。您可以通过以下方式检查：

```typescript
const health = await fetch('/api/health/socratic');
const { components } = await health.json();
const aiStatus = components.find(c => c.name === 'ai-service');

if (aiStatus.status === 'down') {
  console.log('AI服务不可用，已启用降级模式');
}
```

### Q2: 如何提高缓存命中率？

1. 启用相似度匹配
2. 调整缓存TTL
3. 启用预加载功能
4. 优化问题标准化

### Q3: WebSocket连接不稳定怎么办？

系统已实现自动重连机制，您也可以手动配置：

```typescript
const socketOptions = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
};
```

### Q4: 如何处理大班级（>100人）？

1. 使用Redis分布式缓存
2. 启用消息批处理
3. 限制实时功能（如实时投票）
4. 考虑分组教学模式

### Q5: 如何自定义AI行为？

修改Prompt模板：

```typescript
// lib/agents/prompt-templates.ts
const customTemplates = {
  level1: {
    systemPrompt: '您是一位温和的法律教师...',
    userPrompt: '请用简单的语言解释{concept}...'
  }
};
```

## 技术支持

- 📧 邮箱：support@law-education.com
- 📖 文档：https://docs.law-education.com
- 🐛 问题追踪：https://github.com/your-org/law-education-platform/issues
- 💬 社区讨论：https://forum.law-education.com

## 更新日志

### v1.1.0 (2024-12-09)
- ✨ 新增：健康检查端点
- ✨ 新增：环境配置管理
- 🐛 修复：WebSocket重连问题
- ⚡ 优化：缓存命中率提升30%

### v1.0.0 (2024-12-01)
- 🎉 首次发布
- ✨ 核心功能：苏格拉底对话
- ✨ 课堂模式支持
- ✨ 实时协作功能

---

*最后更新：2024年12月9日*