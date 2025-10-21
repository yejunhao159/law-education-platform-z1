# 第四幕数据持久化问题分析与解决方案

**日期**：2025-10-14
**问题**：第四幕数据传递到PPT生成页面的持久性不强
**严重性**：🟡 中等 - 影响用户体验但有workaround

---

## 🔍 数据流向追踪

### 完整数据链路

```
┌──────────────────────────────────────────────────────────────────┐
│                      第四幕 (ActFour.tsx)                         │
├──────────────────────────────────────────────────────────────────┤
│ 1. 从 useTeachingStore 读取数据 (第42-50行)                      │
│    - uploadData.extractedElements (第一幕案例数据)               │
│    - analysisData.result (第二幕分析结果)                        │
│    - socraticData (第三幕对话数据)                                │
│                                                                   │
│ 2. 调用 API 生成学习报告 (第59-77行)                             │
│    POST /api/teaching-acts/summary                               │
│    → 返回 CaseLearningReport                                     │
│    → 保存到 summaryData.caseLearningReport                       │
│                                                                   │
│ 3. 用户点击"生成教学PPT" (第329行)                               │
│    router.push('/teaching/ppt/generate')  ← 路由跳转             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│              PPT生成页面 (app/teaching/ppt/generate/page.tsx)     │
├──────────────────────────────────────────────────────────────────┤
│ 1. 从 useTeachingStore 读取数据检查 (第43-52行)                  │
│    const hasData = store.uploadData.extractedElements            │
│                 || store.analysisData.result                     │
│    if (!hasData) → 报错：请先完成前四幕教学流程                  │
│                                                                   │
│ 2. 调用 PptGeneratorService.generateOutlineOnly() (第81-117行)  │
│    ↓                                                              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│         PPT生成服务 (PptGeneratorService.ts)                      │
├──────────────────────────────────────────────────────────────────┤
│ 1. generateOutlineOnly() 调用 collectData() (第202-204行)       │
│                                                                   │
│ 2. collectData() 从 Store 获取完整数据 (第242-284行)             │
│    const store = useTeachingStore.getState()                     │
│    ↓                                                              │
│    data = {                                                       │
│      caseInfo: store.uploadData.extractedElements,               │
│      analysisResult: store.analysisData.result,                  │
│      socraticLevel: store.socraticData.level,                    │
│      completedNodes: store.socraticData.completedNodes,          │
│      learningReport: store.summaryData.caseLearningReport,       │
│      fullData: { upload, analysis, socratic, summary }           │
│    }                                                              │
│                                                                   │
│ 3. 使用 PptPromptBuilder 构建AI Prompt (第289-356行)            │
│    → 调用 callUnifiedAI 生成PPT大纲                              │
│    → 返回 PptOutline 结构                                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ 已实现的持久化机制

### Zustand Persist 配置 (useTeachingStore.ts)

**存储方式**：localStorage
**存储键名**：`'teaching-store'`
**持久化范围** (第360-383行)：

```typescript
partialize: (state) => ({
  currentAct: state.currentAct,
  progress: state.progress,

  // ✅ 第一幕数据
  uploadData: state.uploadData,

  // ✅ 第二幕数据
  analysisData: {
    result: state.analysisData.result,
    isAnalyzing: false, // 不持久化loading状态
  },

  // ✅ 第三幕数据
  socraticData: {
    ...state.socraticData,
    completedNodes: Array.from(state.socraticData.completedNodes), // Set → Array
  },

  // ✅ 第四幕数据
  summaryData: {
    report: state.summaryData.report,
    caseLearningReport: state.summaryData.caseLearningReport,
    isGenerating: false, // 不持久化loading状态
  },
})
```

**恢复机制** (第385-394行)：
```typescript
onRehydrateStorage: () => (state) => {
  if (state?.socraticData?.completedNodes) {
    // Array → Set
    state.socraticData.completedNodes = new Set(
      state.socraticData.completedNodes as string[]
    );
  }
  if (!state?.editingFields) {
    state.editingFields = new Set();
  }
}
```

---

## 🚨 潜在问题分析

### 问题1：localStorage 大小限制

**现象**：
- 浏览器localStorage通常限制 **5MB**
- 完整判决书文本 + 分析结果 + 对话历史可能超出限制
- 超出限制时，`localStorage.setItem()`会抛出`QuotaExceededError`
- **Zustand persist 不会报错**，只是静默失败

**风险评估**：
- 典型判决书：5-20KB（文本）
- 深度分析结果：10-30KB（JSON）
- 苏格拉底对话历史：每条1-2KB × 20-50条 = 20-100KB
- 学习报告：5-10KB
- **总计**：40-160KB（正常范围）
- **风险**：如果用户上传PDF原文或包含图片，可能超标

### 问题2：浏览器隐私模式/清理缓存

**现象**：
- 用户使用隐私浏览模式 → localStorage数据关闭窗口即清空
- 浏览器清理缓存 → localStorage数据丢失
- **无法预防**，只能检测和提示

### 问题3：页面刷新时机

**现象**：
- 用户在PPT生成页面刷新浏览器
- **Zustand persist 是异步的**，可能还没来得及保存就刷新了
- 导致数据丢失

**代码证据**：
```typescript
// useTeachingStore.ts
persist(
  immer((set, get) => ({ ... })),
  { name: 'teaching-store', ... }
)
// persist中间件使用 debounce + requestIdleCallback 延迟保存
// 如果用户快速刷新，可能丢失最新数据
```

### 问题4：跨域/子域名问题

**现象**：
- localStorage 是按域名隔离的
- `example.com` 和 `app.example.com` 不共享localStorage
- 如果有子域名跳转，数据会丢失

### 问题5：Set类型序列化风险

**问题代码**：
```typescript
// 保存时：Set → Array
completedNodes: Array.from(state.socraticData.completedNodes)

// 恢复时：Array → Set
onRehydrateStorage: () => (state) => {
  if (state?.socraticData?.completedNodes) {
    state.socraticData.completedNodes = new Set(
      state.socraticData.completedNodes as string[]
    );
  }
}
```

**风险**：
- 如果`onRehydrateStorage`执行失败（如数据损坏）
- `completedNodes`会保持为Array，导致后续代码崩溃

---

## 💡 解决方案对比

### 方案1：IndexedDB持久化（最可靠）

**优点**：
- ✅ 容量大（几百MB甚至GB）
- ✅ 异步API，不阻塞UI
- ✅ 支持复杂数据结构（Blob、ArrayBuffer）
- ✅ 事务支持，数据安全

**缺点**：
- ❌ API复杂，需要封装
- ❌ 兼容性略差（IE 10+）
- ❌ 开发成本高

**实施成本**：⭐⭐⭐⭐（高）

**推荐使用**：Dexie.js（IndexedDB封装库）

```typescript
import Dexie from 'dexie';

class TeachingDatabase extends Dexie {
  sessions: Dexie.Table<TeachingSession, number>;

  constructor() {
    super('TeachingDatabase');
    this.version(1).stores({
      sessions: '++id, userId, timestamp, *acts'
    });
  }
}

const db = new TeachingDatabase();

// 保存数据
await db.sessions.add({
  userId: 'user123',
  timestamp: Date.now(),
  acts: {
    upload: store.uploadData,
    analysis: store.analysisData,
    socratic: store.socraticData,
    summary: store.summaryData
  }
});

// 读取最新会话
const latestSession = await db.sessions
  .orderBy('timestamp')
  .reverse()
  .first();
```

---

### 方案2：URL参数传递（最简单）

**优点**：
- ✅ 实施成本低
- ✅ 天然支持刷新和分享
- ✅ 无存储限制风险

**缺点**：
- ❌ 需要后端API支持
- ❌ 数据需要在后端存储
- ❌ URL长度限制（2000字符）
- ❌ 安全性问题（数据暴露在URL）

**实施成本**：⭐⭐（低）

**实施方案**：

```typescript
// ActFour.tsx - 第四幕生成报告后，保存到后端
const generateReport = async () => {
  // ... 现有逻辑 ...

  // 保存会话到后端
  const sessionId = await saveSessionToBackend({
    uploadData: store.uploadData,
    analysisData: store.analysisData,
    socraticData: store.socraticData,
    summaryData: store.summaryData
  });

  // 跳转时带上sessionId
  router.push(`/teaching/ppt/generate?session=${sessionId}`);
};

// PPT生成页面 - 从URL读取sessionId，调用API获取数据
useEffect(() => {
  const sessionId = searchParams.get('session');
  if (sessionId) {
    loadSessionFromBackend(sessionId).then(data => {
      // 恢复Store数据
      useTeachingStore.getState().setExtractedElements(data.uploadData);
      useTeachingStore.getState().setAnalysisResult(data.analysisData);
      // ...
    });
  }
}, []);
```

**后端API**：
```typescript
// app/api/sessions/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  const sessionId = generateUUID();

  // 存储到数据库（Redis或MongoDB）
  await saveToDatabase(sessionId, data, { ttl: 7200 }); // 2小时过期

  return Response.json({ sessionId });
}

export async function GET(request: Request) {
  const sessionId = request.nextUrl.searchParams.get('id');
  const data = await loadFromDatabase(sessionId);
  return Response.json(data);
}
```

---

### 方案3：localStorage增强（折中方案）✅ 推荐

**优点**：
- ✅ 无需引入新依赖
- ✅ 无需后端改动
- ✅ 实施成本低
- ✅ 向后兼容

**缺点**：
- ⚠️ 仍受5MB限制
- ⚠️ 仍受浏览器清理影响

**实施成本**：⭐（最低）

**实施步骤**：

#### 步骤1：添加localStorage监控工具

```typescript
// lib/storage/monitoring.ts
export class StorageMonitor {
  /**
   * 检测localStorage可用性
   */
  static isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取localStorage使用情况
   */
  static getUsage(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // localStorage通常限制5MB（字符数）
      const available = 5 * 1024 * 1024;

      return {
        used,
        available,
        percentage: Math.round((used / available) * 100)
      };
    } catch {
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * 压缩数据（可选：使用LZ-string库）
   */
  static compress(data: string): string {
    // 简单的压缩：移除空白
    return JSON.stringify(JSON.parse(data));
  }
}
```

#### 步骤2：增强useTeachingStore的persist配置

```typescript
// useTeachingStore.ts
import { StorageMonitor } from '@/lib/storage/monitoring';

export const useTeachingStore = create<TeachingStore>()(
  persist(
    immer((set, get) => ({ ... })),
    {
      name: 'teaching-store',

      partialize: (state) => {
        // ... 现有逻辑 ...
      },

      // ✅ 新增：存储前检查和压缩
      storage: createCustomStorage(),

      // ✅ 新增：恢复错误处理
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('恢复Store失败:', error);
          // 显示用户提示
          alert('数据恢复失败，请重新开始教学流程');
          return;
        }

        // 现有恢复逻辑
        if (state?.socraticData?.completedNodes) {
          state.socraticData.completedNodes = new Set(
            state.socraticData.completedNodes as string[]
          );
        }
        // ...
      }
    }
  )
);

/**
 * 自定义存储引擎（带监控和错误处理）
 */
function createCustomStorage() {
  return {
    getItem: (name: string) => {
      try {
        const value = localStorage.getItem(name);
        if (!value) return null;

        // 检查数据完整性
        JSON.parse(value); // 验证JSON格式
        return value;
      } catch (error) {
        console.error('读取localStorage失败:', error);
        return null;
      }
    },

    setItem: (name: string, value: string) => {
      try {
        // 检查存储空间
        const usage = StorageMonitor.getUsage();
        if (usage.percentage > 80) {
          console.warn('localStorage使用率过高:', usage);
          // 可以选择清理旧数据或提示用户
        }

        localStorage.setItem(name, value);

        console.log('✅ Store数据已保存', {
          size: `${Math.round(value.length / 1024)}KB`,
          usage: `${usage.percentage}%`
        });
      } catch (error) {
        console.error('保存localStorage失败:', error);

        if (error.name === 'QuotaExceededError') {
          // 存储空间不足
          alert('存储空间不足，请清理浏览器缓存或使用其他浏览器');
        } else {
          alert('数据保存失败，可能处于隐私模式');
        }

        throw error;
      }
    },

    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.error('删除localStorage失败:', error);
      }
    }
  };
}
```

#### 步骤3：在PPT生成页面添加数据检测

```typescript
// app/teaching/ppt/generate/page.tsx
useEffect(() => {
  // 检查localStorage可用性
  if (!StorageMonitor.isAvailable()) {
    setError('浏览器不支持数据存储，请检查是否处于隐私模式');
    setStage('error');
    return;
  }

  // 检查数据完整性
  if (!hasData) {
    // 尝试从URL参数恢复（如果未来实现方案2）
    const sessionId = searchParams.get('session');
    if (sessionId) {
      loadSessionFromBackend(sessionId).then(/* ... */);
    } else {
      setError('教学数据丢失，请返回重新开始');
      setStage('error');
    }
  }
}, [hasData]);
```

---

### 方案4：数据分片存储（兼容性最好）

**适用场景**：数据量特别大时（>1MB）

**原理**：
- 将大数据分成多个小块（如每块100KB）
- 分别存储为多个localStorage key
- 读取时合并

```typescript
// lib/storage/chunked-storage.ts
export class ChunkedStorage {
  private static CHUNK_SIZE = 100 * 1024; // 100KB per chunk

  static set(key: string, data: string): void {
    const chunks = [];
    for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
      chunks.push(data.slice(i, i + this.CHUNK_SIZE));
    }

    // 保存分片信息
    localStorage.setItem(`${key}_meta`, JSON.stringify({
      totalChunks: chunks.length,
      totalSize: data.length
    }));

    // 保存每个分片
    chunks.forEach((chunk, index) => {
      localStorage.setItem(`${key}_chunk_${index}`, chunk);
    });
  }

  static get(key: string): string | null {
    const meta = localStorage.getItem(`${key}_meta`);
    if (!meta) return null;

    const { totalChunks } = JSON.parse(meta);
    const chunks: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunk = localStorage.getItem(`${key}_chunk_${i}`);
      if (!chunk) return null; // 数据不完整
      chunks.push(chunk);
    }

    return chunks.join('');
  }

  static remove(key: string): void {
    const meta = localStorage.getItem(`${key}_meta`);
    if (!meta) return;

    const { totalChunks } = JSON.parse(meta);
    for (let i = 0; i < totalChunks; i++) {
      localStorage.removeItem(`${key}_chunk_${i}`);
    }
    localStorage.removeItem(`${key}_meta`);
  }
}
```

---

## 🎯 推荐实施方案

### 短期方案（1-2天）：方案3（localStorage增强）✅

**优先级**：🔴 高
**成本**：低
**收益**：立即解决大部分问题

**实施步骤**：
1. ✅ 添加`lib/storage/monitoring.ts`（存储监控工具）
2. ✅ 增强`useTeachingStore`的persist配置（错误处理）
3. ✅ 在PPT页面添加数据检测和友好提示
4. ✅ 添加E2E测试验证数据持久性

### 中期方案（1-2周）：方案2（URL参数传递）

**优先级**：🟡 中
**成本**：中
**收益**：支持分享链接，彻底解决刷新问题

**实施步骤**：
1. 添加`POST /api/sessions`接口（保存会话）
2. 添加`GET /api/sessions/:id`接口（读取会话）
3. 修改ActFour组件（保存并传递sessionId）
4. 修改PPT页面（从URL恢复数据）
5. 添加会话TTL机制（Redis，2小时过期）

### 长期方案（1-2月）：方案1（IndexedDB）

**优先级**：🟢 低
**成本**：高
**收益**：最可靠，支持离线使用

**实施步骤**：
1. 引入Dexie.js
2. 设计数据库Schema
3. 迁移现有localStorage逻辑
4. 添加数据导出/导入功能
5. 添加离线模式支持

---

## 📊 数据流优化建议

### 优化1：减少数据冗余

**问题**：
- Store中同时存储`extractedElements`和`caseLearningReport`
- 两者包含大量重复信息

**解决**：
```typescript
// 只存储必要数据
partialize: (state) => ({
  // 不持久化中间状态，只持久化最终结果
  summaryData: {
    caseLearningReport: state.summaryData.caseLearningReport,
    // 移除 report（已被 caseLearningReport 取代）
  },

  // uploadData 和 analysisData 可以从 caseLearningReport 重建
  // 考虑只持久化 caseLearningReport
})
```

### 优化2：懒加载大数据

**问题**：
- 判决书原文可能很大（100KB+）
- PPT生成不需要完整原文

**解决**：
```typescript
// 只传递必要字段
const keyElements = extractor.extract({
  caseInfo: {
    title: data.caseInfo.title,
    caseNumber: data.caseInfo.caseNumber,
    // 不传递 fullText
  },
  analysisResult: data.analysisResult,
  learningReport: data.learningReport
});
```

### 优化3：数据压缩

**使用LZ-String库压缩JSON**：

```bash
npm install lz-string
```

```typescript
import LZString from 'lz-string';

// 自定义存储引擎
storage: {
  getItem: (name: string) => {
    const compressed = localStorage.getItem(name);
    if (!compressed) return null;
    return LZString.decompressFromUTF16(compressed);
  },
  setItem: (name: string, value: string) => {
    const compressed = LZString.compressToUTF16(value);
    localStorage.setItem(name, compressed);

    console.log('压缩效果:', {
      original: value.length,
      compressed: compressed.length,
      ratio: Math.round((1 - compressed.length / value.length) * 100) + '%'
    });
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  }
}
```

**预期效果**：压缩率 **60-80%**

---

## 🔧 实施清单

### Phase 1：紧急修复（今天）

- [ ] 添加`lib/storage/monitoring.ts`
- [ ] 增强`useTeachingStore`错误处理
- [ ] PPT页面添加数据检测
- [ ] 添加用户友好的错误提示

### Phase 2：稳定性增强（本周）

- [ ] 添加LZ-String压缩
- [ ] 添加存储使用率监控
- [ ] 添加数据恢复提示
- [ ] 编写E2E测试

### Phase 3：长期优化（下个月）

- [ ] 实施URL参数传递方案
- [ ] 添加会话管理后端API
- [ ] 考虑IndexedDB迁移
- [ ] 添加离线支持

---

## 📈 性能指标

### 当前状态（无优化）

| 指标 | 值 | 说明 |
|------|-----|------|
| localStorage使用 | 40-160KB | 典型案例 |
| 数据丢失率 | ~5% | 用户反馈估算 |
| 刷新后恢复成功率 | ~95% | Zustand persist |

### 优化后目标

| 指标 | 目标值 | 改进 |
|------|--------|------|
| localStorage使用 | 10-50KB | 压缩后 ↓70% |
| 数据丢失率 | <1% | 错误处理 + 提示 |
| 刷新后恢复成功率 | >99% | 增强持久化 |
| 错误提示友好度 | 100% | 明确告知用户问题 |

---

## 🎓 相关文档

- [Zustand Persist文档](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [IndexedDB使用指南](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [localStorage最佳实践](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [LZ-String压缩库](https://github.com/pieroxy/lz-string)

---

**状态**：✅ 分析完成
**下一步**：实施方案3（localStorage增强）
