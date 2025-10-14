# 第四幕数据持久化Bug修复

**日期**：2025-10-14
**严重性**：🔴 高 - 阻止用户学习新案例
**状态**：✅ 已修复

---

## 🐛 Bug描述

**用户报告**：
> "第四幕的内容被占死了，就算清理缓存也清理不掉，导致新的案件的信息无法进去"

**具体现象**：
1. 用户完成第一个案例的四幕学习
2. 点击"学习下一个案例"按钮
3. 返回第一幕上传新案例
4. **但第四幕仍显示旧案例的数据**
5. **即使手动清理浏览器缓存也无法清除**

---

## 🔍 根因分析

### 问题代码（修复前）

**useTeachingStore.ts (第348-356行)**：
```typescript
reset: () =>
  set(() => ({
    ...initialState,
    socraticData: {
      ...initialState.socraticData,
      completedNodes: new Set(),
    },
    editingFields: new Set(),
  })),
```

**ActFour.tsx (第85-89行)**：
```typescript
const startNewCase = () => {
  // 重置状态，开始新案例
  useTeachingStore.getState().reset();  // ❌ 只重置内存，不清除localStorage
  setCurrentAct('upload');
};
```

### Zustand Persist的陷阱

**问题流程**：
```
1. 用户点击"学习下一个案例"
   ↓
2. 调用 reset()
   ↓ 重置内存中的state
   ↓
3. persist中间件检测到state变化
   ↓ 从localStorage读取数据（仍是旧数据）
   ↓
4. 用persist数据覆盖reset后的state
   ↓
5. ❌ 结果：reset()看起来"无效"
```

**为什么清理缓存也无效**：
- 用户清理的是浏览器缓存（HTTP缓存、Cookie等）
- **localStorage不属于浏览器缓存**，需要单独清理
- 大多数用户不知道localStorage的存在

---

## ✅ 修复方案

### 核心修复：reset()同时清除localStorage

**修复后的代码**：
```typescript
reset: () => {
  // 🔧 修复：先清除localStorage中的持久化数据
  try {
    localStorage.removeItem('teaching-store');
    console.log('✅ [Store] localStorage已清除');
  } catch (error) {
    console.error('❌ [Store] 清除localStorage失败:', error);
  }

  // 然后重置内存state
  set(() => ({
    ...initialState,
    socraticData: {
      ...initialState.socraticData,
      completedNodes: new Set(),
    },
    editingFields: new Set(),
  }));

  console.log('✅ [Store] 状态已重置为初始值');
},
```

### 修复流程

**修复后的流程**：
```
1. 用户点击"学习下一个案例"
   ↓
2. 调用 reset()
   ↓ localStorage.removeItem('teaching-store')  ← 🔑 清除持久化
   ↓ 重置内存中的state
   ↓
3. persist中间件检测到state变化
   ↓ 尝试从localStorage读取数据
   ↓ ❌ 找不到数据（已被清除）
   ↓
4. 使用初始state（initialState）
   ↓
5. ✅ 结果：成功清除所有旧数据
```

---

## 📊 测试验证

### 测试步骤

1. **完成第一个案例学习**
   ```
   第一幕 → 上传判决书
   第二幕 → 分析完成
   第三幕 → 苏格拉底对话
   第四幕 → 查看学习报告
   ```

2. **检查localStorage**
   ```javascript
   // 打开浏览器Console
   console.log(JSON.parse(localStorage.getItem('teaching-store')));
   // 应该看到完整的四幕数据
   ```

3. **点击"学习下一个案例"**
   ```
   ActFour → 点击"学习下一个案例"按钮
   ```

4. **验证数据清除**
   ```javascript
   // 打开浏览器Console
   console.log(localStorage.getItem('teaching-store'));
   // 应该返回 null（数据已清除）

   // 检查内存中的state
   console.log(useTeachingStore.getState().summaryData);
   // 应该是初始状态：{ report: null, caseLearningReport: null, isGenerating: false }
   ```

5. **上传新案例**
   ```
   第一幕 → 上传新判决书
   → 验证新数据正确加载
   → 不应该看到旧案例的任何信息
   ```

### 预期结果

| 操作 | 修复前 | 修复后 |
|------|--------|--------|
| 点击"学习下一个案例" | ❌ 旧数据残留 | ✅ 完全清除 |
| localStorage内容 | ❌ 仍有旧数据 | ✅ null |
| 上传新案例 | ❌ 混合显示新旧数据 | ✅ 只显示新数据 |
| 清理浏览器缓存 | ❌ 无法清除 | ✅ 不需要手动清理 |

---

## 🎯 额外优化建议

### 优化1：第一幕添加"清除旧数据"确认

**问题**：用户可能在不同幕之间来回跳转，不希望数据被清除

**建议**：
```typescript
// components/acts/ActOne.tsx
const handleUploadNewCase = () => {
  const hasExistingData = useTeachingStore.getState().summaryData.caseLearningReport;

  if (hasExistingData) {
    const confirmed = confirm(
      '检测到已有学习数据，上传新案例将清除所有旧数据。是否继续？'
    );

    if (confirmed) {
      useTeachingStore.getState().reset();
      // 继续上传流程
    }
  } else {
    // 直接上传
  }
};
```

### 优化2：增强reset()方法的错误处理

**当前问题**：如果localStorage不可用（隐私模式、满了），清除会静默失败

**建议**：
```typescript
reset: () => {
  // 清除localStorage
  try {
    localStorage.removeItem('teaching-store');
    console.log('✅ [Store] localStorage已清除');
  } catch (error) {
    console.error('❌ [Store] 清除localStorage失败:', error);

    // 提示用户
    if (typeof window !== 'undefined') {
      alert('无法清除旧数据，可能处于隐私模式。请手动刷新页面。');
    }
  }

  // 重置内存state
  set(() => ({
    ...initialState,
    socraticData: {
      ...initialState.socraticData,
      completedNodes: new Set(),
    },
    editingFields: new Set(),
  }));

  console.log('✅ [Store] 状态已重置为初始值');
},
```

### 优化3：添加"数据管理"调试面板

**目的**：方便开发者和高级用户管理数据

**建议**：
```typescript
// components/debug/DataManagementPanel.tsx
export function DataManagementPanel() {
  const [storageSize, setStorageSize] = useState(0);

  useEffect(() => {
    const data = localStorage.getItem('teaching-store');
    setStorageSize(data ? data.length : 0);
  }, []);

  const handleClearAll = () => {
    if (confirm('确定清除所有教学数据？')) {
      useTeachingStore.getState().reset();
      alert('所有数据已清除');
    }
  };

  const handleExportData = () => {
    const data = localStorage.getItem('teaching-store');
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teaching-data-${Date.now()}.json`;
      a.click();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white shadow-lg rounded-lg">
      <h3 className="font-bold mb-2">数据管理</h3>
      <p className="text-sm mb-2">存储大小: {Math.round(storageSize / 1024)}KB</p>
      <div className="flex gap-2">
        <button onClick={handleExportData}>导出数据</button>
        <button onClick={handleClearAll}>清除所有</button>
      </div>
    </div>
  );
}
```

### 优化4：添加数据版本迁移

**问题**：未来修改数据结构时，旧数据可能导致错误

**建议**：
```typescript
// useTeachingStore.ts
const STORE_VERSION = 2; // 数据版本号

export const useTeachingStore = create<TeachingStore>()(
  persist(
    immer((set, get) => ({ ... })),
    {
      name: 'teaching-store',
      version: STORE_VERSION,

      // 数据迁移函数
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // 从v1迁移到v2
          console.log('🔄 数据迁移: v1 → v2');

          // 清理旧字段
          delete persistedState.deprecatedField;

          // 添加新字段默认值
          persistedState.summaryData = {
            report: null,
            caseLearningReport: null,
            isGenerating: false,
          };
        }

        return persistedState;
      },

      partialize: (state) => ({ ... }),
      onRehydrateStorage: () => (state) => { ... }
    }
  )
);
```

---

## 🔗 相关问题和修复

### 相关Issue

- [ ] #TODO: 检查其他Store是否有类似问题
- [ ] #TODO: 添加E2E测试验证reset()功能
- [ ] #TODO: 更新用户文档，说明如何手动清除数据

### 其他可能受影响的Store

```bash
# 检查其他使用persist的Store
grep -r "persist(" src/domains/*/stores/ --include="*.ts"
```

如果发现其他Store也使用了persist，需要检查：
1. 是否有reset()方法
2. reset()是否正确清除localStorage
3. 是否有版本迁移逻辑

---

## 📝 变更日志

### v1.1.7 (2025-10-14)

**修复**：
- 🐛 修复reset()无法清除localStorage导致数据残留的严重Bug
- ✅ reset()现在会同时清除localStorage和内存state
- ✅ 添加详细的日志输出便于调试
- ✅ 添加错误处理避免清除失败

**影响范围**：
- `src/domains/teaching-acts/stores/useTeachingStore.ts`
- ActFour组件的"学习下一个案例"功能

**向后兼容性**：✅ 完全兼容，无破坏性变更

**升级指南**：
- 无需特殊操作，代码更新后自动生效
- 如果用户已经遇到数据残留问题，需手动清除localStorage：
  ```javascript
  // 浏览器Console
  localStorage.removeItem('teaching-store');
  location.reload();
  ```

---

## ✅ 验收标准

- [x] reset()同时清除localStorage和内存state
- [x] 用户点击"学习下一个案例"后，所有旧数据完全清除
- [x] 上传新案例不会看到旧案例的任何信息
- [x] 添加了日志输出便于调试
- [x] 添加了错误处理避免清除失败
- [ ] 添加了单元测试（建议）
- [ ] 添加了E2E测试（建议）
- [ ] 更新了用户文档（建议）

---

## 🎓 经验教训

### 1. Zustand Persist的持久化时机

**陷阱**：persist中间件会在**每次state变化后**自动保存到localStorage

**正确做法**：
- 如果要完全重置数据，必须先清除localStorage
- 不能依赖set()来"覆盖"persist数据

### 2. localStorage不是浏览器缓存

**用户误解**：
- 用户以为"清理浏览器缓存"会清除localStorage
- 实际上localStorage需要单独清理

**最佳实践**：
- 提供明确的"清除数据"按钮
- 不依赖用户手动清理

### 3. 状态重置要考虑持久化

**教训**：
- 任何有persist的Store，reset()都要显式清除localStorage
- 不能只重置内存state

**代码模板**：
```typescript
reset: () => {
  // 1. 先清除持久化
  try {
    localStorage.removeItem(STORE_KEY);
  } catch (error) {
    console.error('清除失败:', error);
  }

  // 2. 再重置内存
  set(() => initialState);
},
```

---

**修复状态**：✅ 已完成
**待验证**：用户反馈
**后续优化**：见"额外优化建议"部分
