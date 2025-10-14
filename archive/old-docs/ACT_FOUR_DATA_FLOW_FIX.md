# 第四幕数据流修复说明

## 🐛 问题根源

**核心问题**: 服务端API无法访问客户端的localStorage，导致前三幕数据丢失

### 问题详情

```
浏览器(客户端)                      服务器(Next.js API)
┌─────────────────┐                ┌──────────────────┐
│  localStorage   │                │   API Route      │
│  ✅ 有完整数据   │                │   ❌ 读取为空    │
│                 │                │                  │
│ - uploadData    │   HTTP POST    │ useTeachingStore │
│ - analysisData  ├───────────────►│  .getState()     │
│ - socraticData  │ (无body数据)   │  → 初始状态(空)  │
└─────────────────┘                └──────────────────┘
```

**原因分析**:
1. `useTeachingStore` 使用 `persist` 中间件将数据存储到 localStorage
2. localStorage 只存在于浏览器环境
3. Next.js API 路由运行在 Node.js 服务端
4. 服务端的 `useTeachingStore.getState()` 返回初始状态（全是空数据）

## ✅ 解决方案

**核心思路**: 客户端调用API时，将Store数据作为请求体传递给服务端

### 修复的文件

#### 1. `components/acts/ActFour.tsx`

**修改前**:
```typescript
const response = await fetch('/api/teaching-acts/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
```

**修改后**:
```typescript
// 从客户端Store读取数据
const store = useTeachingStore.getState();
const requestData = {
  uploadData: store.uploadData,
  analysisData: store.analysisData,
  socraticData: {
    level: store.socraticData.level,
    completedNodes: Array.from(store.socraticData.completedNodes),
  }
};

// 将数据作为请求体发送
const response = await fetch('/api/teaching-acts/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestData)
});
```

#### 2. `app/api/teaching-acts/summary/route.ts`

**修改前**:
```typescript
export async function POST() {
  const report = await caseSummaryService.generateCaseSummary();
  // ...
}
```

**修改后**:
```typescript
export async function POST(request: Request) {
  // 接收客户端传递的Store数据
  const storeData = await request.json();

  // 传递给Service
  const report = await caseSummaryService.generateCaseSummary(storeData);
  // ...
}
```

#### 3. `src/domains/teaching-acts/services/CaseSummaryService.ts`

**修改前**:
```typescript
async generateCaseSummary(): Promise<CaseLearningReport> {
  const store = useTeachingStore.getState(); // 服务端读取为空
  // ...
}
```

**修改后**:
```typescript
async generateCaseSummary(clientStoreData?: any): Promise<CaseLearningReport> {
  // 优先使用客户端传递的数据
  const storeData = clientStoreData || useTeachingStore.getState();

  console.log('📦 数据来源:', clientStoreData ? '客户端传递' : '服务端Store');
  // ...
}
```

## 📊 修复后的数据流

```
浏览器(客户端)                      服务器(Next.js API)
┌─────────────────┐                ┌──────────────────┐
│  localStorage   │                │   API Route      │
│  ✅ 有完整数据   │                │                  │
│                 │                │                  │
│ useTeachingStore│   HTTP POST    │ request.json()   │
│  .getState()    ├───────────────►│  ✅ 接收数据     │
│  → 读取数据     │ (body含数据)   │                  │
│  → 打包发送     │                │  ↓ 传递         │
└─────────────────┘                │ CaseSummaryService
                                   │  ✅ 使用真实数据 │
                                   └──────────────────┘
```

## 🔍 验证方法

### 1. 检查控制台日志

**客户端日志** (浏览器Console):
```javascript
📤 [ActFour] 发送Store数据到API: {
  uploadData存在: true,        // ✅ 应该是 true
  analysisData存在: true,      // ✅ 应该是 true
  socraticLevel: 1,
  completedNodes: 0
}
```

**服务端日志** (终端):
```javascript
📥 [API] 接收到客户端Store数据: {
  uploadData存在: true,        // ✅ 应该是 true
  analysisData存在: true,      // ✅ 应该是 true
  socraticLevel: 1,
  completedNodes: 0
}

📦 [CaseSummaryService] 数据来源: 客户端传递  // ✅ 关键!

📊 [CaseSummaryService] 收集到的前三幕数据: {
  提取后的caseInfo大小: 15,         // ✅ 不再是0
  caseInfo中的案例名称: "某某案",    // ✅ 不再是'未知'
  analysisResult大小: 8,            // ✅ 不再是0
}
```

### 2. 检查UI显示

**修复成功的标志**:
- ❌ 不再显示 "案件概要生成中..."
- ✅ 显示真实的案例标题
- ✅ 显示具体的学习要点（而非占位符）
- ✅ 显示基于实际案例的分析内容

## 🎯 关键要点

1. **Next.js API路由是服务端代码**
   - 无法访问浏览器的 localStorage
   - 无法访问客户端的 Zustand store 状态

2. **数据传递原则**
   - 客户端状态需要显式传递给服务端
   - 通过 HTTP 请求体(body)传递数据

3. **向后兼容**
   - `generateCaseSummary(clientStoreData?)` 参数可选
   - 如果不传参数，回退到服务端Store读取
   - 保证了代码的向后兼容性

## 📝 相关问题排查

如果修复后仍然有问题，检查：

1. **localStorage是否有数据**
   ```javascript
   JSON.parse(localStorage.getItem("teaching-store") || "{}")
   ```

2. **是否完成了前三幕**
   - 必须依次完成第一、二、三幕
   - 不能直接跳到第四幕

3. **控制台日志**
   - 客户端：`[ActFour] 发送Store数据`
   - 服务端：`[API] 接收到客户端Store数据`
   - 服务端：`数据来源: 客户端传递`

## 🚀 后续优化建议

1. **类型安全**
   - 为 `clientStoreData` 定义明确的 TypeScript 类型
   - 避免使用 `any`

2. **错误处理**
   - 验证客户端传递的数据完整性
   - 如果数据缺失，返回明确的错误提示

3. **性能优化**
   - 考虑只传递必要的数据字段
   - 减少HTTP请求体大小

---

**修复日期**: 2025-10-14
**问题追踪**: ACT_FOUR_TROUBLESHOOTING.md
**相关文档**: ACT_FOUR_FIX_AND_VERIFY.md
