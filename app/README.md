# 🌐 app/ - Next.js路由和页面

> **设计理念**：基于Next.js 15 App Router，文件系统即路由

## 📂 路由结构

```
app/
├── page.tsx                      # 首页 (/)
├── layout.tsx                    # 根布局
├── globals.css                   # 全局样式
│
├── login/                        # 登录页 (/login)
├── admin/                        # 管理员后台 (/admin)
├── dashboard/                    # 用户仪表盘 (/dashboard)
├── classroom/                    # 实时课堂 (/classroom)
├── teaching/                     # 教学相关 (/teaching)
├── contract/                     # 合同分析 (/contract)
│
└── api/                          # API路由 (/api/*)
    ├── socratic/                # 苏格拉底对话API
    ├── legal-analysis/          # 法律分析API
    ├── classroom/               # 课堂管理API
    ├── teaching-acts/           # 四幕教学API
    └── ...                      # 其他API端点
```

---

## 🎯 页面路由

### 🏠 核心页面

| 路径 | 组件 | 功能 |
|------|------|------|
| `/` | `page.tsx` | 首页/欢迎页 |
| `/login` | `login/page.tsx` | 用户登录 |
| `/dashboard` | `dashboard/page.tsx` | 用户仪表盘（主工作区） |

### 📚 教学功能页面

| 路径 | 功能 | 说明 |
|------|------|------|
| `/dashboard/courseware` | 课件管理 | 创建/编辑/管理课件 |
| `/dashboard/my-courseware` | 我的课件 | 个人课件列表 |
| `/dashboard/my-courseware/[id]` | 课件详情 | 编辑特定课件 |
| `/dashboard/judgment` | 判决分析 | 判决书智能分析 |
| `/dashboard/classroom` | 课堂管理 | 创建/管理教学课堂 |
| `/dashboard/courses` | 课程管理 | 课程列表和管理 |
| `/dashboard/favorites` | 收藏夹 | 收藏的案例/课件 |
| `/dashboard/contract` | 合同分析 | 合同智能分析入口 |

### 🎓 实时课堂

| 路径 | 功能 | 说明 |
|------|------|------|
| `/classroom/[code]` | 课堂大厅 | 通过邀请码加入课堂 |
| `/classroom/[code]/join` | 加入课堂 | 学生加入页面 |
| `/classroom/[code]/student` | 学生端 | 学生课堂界面 |
| `/classroom/[code]/teacher` | 教师端 | 教师课堂控制台 |

**设计特点**：
- ✅ 基于邀请码系统（无需提前注册）
- ✅ 实时通信（Socket.IO + SSE）
- ✅ 多学生并发支持

### 📝 合同分析

| 路径 | 功能 | 说明 |
|------|------|------|
| `/contract/editor` | 合同编辑器 | 合同智能审查和编辑 |

### 🎭 教学工具

| 路径 | 功能 | 说明 |
|------|------|------|
| `/teaching/ppt/generate` | PPT生成 | AI辅助生成教学PPT |

### 👨‍💼 管理员功能

| 路径 | 功能 | 说明 |
|------|------|------|
| `/admin/dashboard` | 管理员仪表盘 | 系统管理和监控 |

---

## 🔌 API路由

### 核心API端点

#### 1. 苏格拉底对话 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/socratic` | POST | 生成苏格拉底问题（主入口） |
| `/api/socratic/generate` | POST | 生成问题（备用） |
| `/api/socratic/view-prompt` | POST | 查看完整提示词（调试用） |
| `/api/socratic/stream-test` | POST | 流式输出测试 |

**典型请求**：
```typescript
POST /api/socratic
{
  "currentTopic": "合同效力",
  "caseContext": "案例描述...",
  "conversationHistory": [...],
  "level": "intermediate",
  "mode": "analysis"
}
```

---

#### 2. 法律分析 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/legal-analysis/intelligent-narrative` | POST | 智能叙事生成 |
| `/api/legal-analysis/stream` | POST | 流式分析 |
| `/api/legal-analysis/event-claim` | POST | 事件-请求权关联 |
| `/api/legal-intelligence/extract` | POST | 判决书提取 |
| `/api/dispute-analysis` | POST | 争议焦点分析 |
| `/api/evidence-quality` | POST | 证据质量评估 |
| `/api/timeline-analysis` | POST | 时间轴分析 |

**典型请求**：
```typescript
POST /api/legal-analysis/intelligent-narrative
{
  "caseData": {
    "basicInfo": {...},
    "threeElements": {...}
  },
  "narrativeStyle": "story" | "academic" | "legal",
  "depth": "brief" | "detailed" | "comprehensive"
}
```

---

#### 3. 课堂管理 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/classroom/[code]/check` | GET | 检查课堂是否存在 |
| `/api/classroom/[code]/stream` | GET | SSE实时流 |
| `/api/classroom/[code]/answers` | GET/POST | 学生答案管理 |
| `/api/classroom/[code]/answer` | POST | 提交单个答案 |
| `/api/classroom/[code]/question` | POST | 发送问题 |

**实时通信**：
```typescript
// SSE流式连接
GET /api/classroom/ABC123/stream
// 返回：text/event-stream
```

---

#### 4. 教学会话 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/teaching-sessions` | POST | 创建/更新教学会话 |
| `/api/teaching-sessions` | GET | 获取会话列表 |

---

#### 5. 其他API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/teaching-acts/summary` | POST | 教学总结生成 |
| `/api/ppt/*` | * | PPT生成相关 |
| `/api/contract/*` | * | 合同分析相关 |
| `/api/auth/*` | * | 认证授权相关 |
| `/api/health/socratic` | GET | 苏格拉底服务健康检查 |
| `/api/test/*` | * | 测试接口 |

---

## 📐 路由设计原则

### 1. RESTful设计
- ✅ 资源导向：`/api/classroom/[code]`
- ✅ 语义化路径：`/dashboard/my-courseware`
- ✅ HTTP方法：GET查询、POST创建、PUT更新、DELETE删除

### 2. 动态路由
```
[code] - 课堂邀请码（字符串）
[id] - 资源ID（字符串/数字）
```

**示例**：
- `/classroom/ABC123` → `code="ABC123"`
- `/dashboard/my-courseware/123` → `id="123"`

### 3. API响应格式
```typescript
// 统一响应格式
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 成功示例
{
  "success": true,
  "data": {...}
}

// 失败示例
{
  "success": false,
  "error": "Invalid case data"
}
```

### 4. 流式响应
```typescript
// SSE (Server-Sent Events)
Content-Type: text/event-stream

data: {"type":"question","content":"..."}

data: {"type":"complete"}

// 流式JSON
Content-Type: application/x-ndjson
{"chunk":"..."}
{"chunk":"..."}
```

---

## 🎯 快速开始

### 添加新页面

1. **创建页面文件**
   ```bash
   # 示例：创建新功能页面
   mkdir app/new-feature
   touch app/new-feature/page.tsx
   ```

2. **编写页面组件**
   ```tsx
   // app/new-feature/page.tsx
   export default function NewFeaturePage() {
     return <div>新功能页面</div>;
   }
   ```

3. **访问页面**
   ```
   http://localhost:3000/new-feature
   ```

### 添加新API

1. **创建API文件**
   ```bash
   mkdir app/api/new-api
   touch app/api/new-api/route.ts
   ```

2. **编写Route Handler**
   ```tsx
   // app/api/new-api/route.ts
   import { NextRequest, NextResponse } from 'next/server';

   export async function POST(request: NextRequest) {
     try {
       const body = await request.json();
       // 业务逻辑
       return NextResponse.json({
         success: true,
         data: result
       });
     } catch (error) {
       return NextResponse.json({
         success: false,
         error: error.message
       }, { status: 500 });
     }
   }
   ```

3. **调用API**
   ```tsx
   const response = await fetch('/api/new-api', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data)
   });
   ```

### 使用动态路由

```tsx
// app/items/[id]/page.tsx
interface PageProps {
  params: { id: string };
}

export default function ItemPage({ params }: PageProps) {
  return <div>Item ID: {params.id}</div>;
}
```

---

## 🔒 权限控制

### Middleware（计划中）
```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  // 检查认证
  const token = request.cookies.get('token');
  if (!token) {
    return NextResponse.redirect('/login');
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
};
```

---

## 📚 扩展阅读

- [Next.js 15 文档](https://nextjs.org/docs) - App Router完整指南
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) - Route Handler文档
- [CLAUDE.md](../docs/CLAUDE.md) - 项目架构指南

---

**最后更新**：2025-10-21
**Next.js版本**：15.0.3
**维护原则**：约定优于配置，文件系统即路由
