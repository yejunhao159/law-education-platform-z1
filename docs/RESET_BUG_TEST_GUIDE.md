# 🐛 "学习下一个案例"Bug修复 - 测试指南

**修复日期**：2025-10-14
**Bug编号**：#RESET-001
**严重性**：🔴 高 - 阻止用户学习新案例

---

## 📝 Bug描述

**用户报告**：
> "第四幕的内容被占死了，就算清理缓存也清理不掉，导致新的案件的信息无法进去"

**修复内容**：
- ✅ 修复了`reset()`方法只重置内存state，不清除localStorage的问题
- ✅ 现在点击"学习下一个案例"会同时清除localStorage和内存数据
- ✅ 添加了详细的日志输出便于调试

---

## 🧪 快速测试（5分钟）

### 1. 打开浏览器Console

- Chrome/Edge: 按 `F12` 或 `Ctrl+Shift+J`
- 选择 "Console" 标签

### 2. 访问应用

```
http://localhost:3002
```

### 3. 完整测试流程

```javascript
// 【步骤1】粘贴以下代码到Console，自动化测试整个流程

(async function testResetBug() {
  console.log('\n🧪 开始测试reset()修复\n' + '='.repeat(60));

  // 检查初始状态
  console.log('\n📊 步骤1: 检查初始localStorage状态');
  const before = localStorage.getItem('teaching-store');
  console.log('初始数据存在:', !!before);

  if (!before) {
    console.warn('⚠️  localStorage无数据，需要先完成一个案例学习');
    console.log('\n请手动操作：');
    console.log('1. 完成第一幕~第四幕');
    console.log('2. 再次运行此测试脚本');
    return;
  }

  // 解析现有数据
  const storeData = JSON.parse(before);
  const oldTitle = storeData?.state?.summaryData?.caseLearningReport?.caseOverview?.title;
  console.log('当前案件:', oldTitle || '未知');
  console.log('数据大小:', Math.round(before.length / 1024), 'KB');

  // 模拟点击"学习下一个案例"
  console.log('\n🔄 步骤2: 模拟点击"学习下一个案例"按钮');
  console.log('执行: useTeachingStore.getState().reset()');

  try {
    // 调用reset()
    useTeachingStore.getState().reset();

    // 等待一下确保操作完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 检查localStorage是否被清除
    console.log('\n✅ 步骤3: 验证localStorage已清除');
    const after = localStorage.getItem('teaching-store');

    if (after === null) {
      console.log('✅ localStorage已成功清除');
    } else {
      console.error('❌ localStorage未被清除！修复失败！');
      console.log('残留数据:', after.substring(0, 100) + '...');
      return;
    }

    // 检查内存state是否重置
    console.log('\n✅ 步骤4: 验证内存state已重置');
    const store = useTeachingStore.getState();
    const checks = {
      'uploadData': !store.uploadData.extractedElements,
      'analysisData': !store.analysisData.result,
      'socraticData': store.socraticData.completedNodes.size === 0,
      'summaryData': !store.summaryData.caseLearningReport,
      'currentAct': store.currentAct === 'upload'
    };

    console.table(checks);

    const allReset = Object.values(checks).every(v => v === true);

    if (allReset) {
      console.log('\n🎉 测试通过！reset()修复成功！');
      console.log('✅ localStorage已清除');
      console.log('✅ 内存state已重置');
      console.log('✅ 可以上传新案例了');
    } else {
      console.error('\n❌ 测试失败！部分数据未重置');
      console.log('未重置的字段:', Object.entries(checks).filter(([k,v]) => !v).map(([k]) => k));
    }

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error);
    console.log('可能原因: useTeachingStore未定义或reset()方法出错');
  }

  console.log('\n' + '='.repeat(60) + '\n');
})();
```

---

## 🎯 详细测试步骤

### 测试前准备

1. **完成一个完整的案例学习**：
   - 第一幕：上传判决书
   - 第二幕：等待深度分析
   - 第三幕：进行几轮苏格拉底对话
   - 第四幕：查看学习报告（记住案件标题）

2. **打开浏览器开发者工具**：
   - 按 `F12`
   - 切换到 "Console" 标签

---

### 测试案例1：验证reset()清除localStorage

#### 步骤1：检查修复前的数据

```javascript
// 查看localStorage中的数据
const data = localStorage.getItem('teaching-store');
console.log('数据存在:', !!data);
console.log('数据大小:', Math.round(data.length / 1024), 'KB');

// 查看第四幕数据
const store = JSON.parse(data);
console.log('案件标题:', store?.state?.summaryData?.caseLearningReport?.caseOverview?.title);
```

**预期结果**：
- ✅ 应该看到完整的案件数据
- ✅ 案件标题应该是刚才学习的案件

#### 步骤2：点击"学习下一个案例"

在第四幕页面，点击**"学习下一个案例"**按钮

#### 步骤3：检查Console日志

**预期输出**：
```
✅ [Store] localStorage已清除
✅ [Store] 状态已重置为初始值
```

如果看到这两行日志，说明修复生效了。

#### 步骤4：验证数据已清除

```javascript
// 检查localStorage
console.log('localStorage内容:', localStorage.getItem('teaching-store'));
// 预期结果：null

// 检查内存store
const store = useTeachingStore.getState();
console.log('第四幕数据:', store.summaryData.caseLearningReport);
// 预期结果：null
```

**预期结果**：
- ✅ `localStorage.getItem('teaching-store')` 返回 `null`
- ✅ `store.summaryData.caseLearningReport` 是 `null`

---

### 测试案例2：验证上传新案例不受影响

#### 步骤1：完成reset()后，上传新案例

1. 应该自动跳转到第一幕
2. 上传一个**不同的**判决书（或同一个也可以）
3. 等待解析完成

#### 步骤2：查看第二幕和第四幕

1. 进入第二幕查看分析结果
2. 完成第三幕（可跳过）
3. 进入第四幕查看学习报告

#### 步骤3：验证数据

```javascript
// 查看当前案件标题
const store = useTeachingStore.getState();
const currentTitle = store.summaryData?.caseLearningReport?.caseOverview?.title;
console.log('当前案件标题:', currentTitle);

// 应该是新上传的案件，不是旧案件
```

**预期结果**：
- ✅ 第四幕显示的是新案件的数据
- ❌ 不应该看到旧案件的任何信息
- ❌ 不应该看到新旧混合的情况

---

### 测试案例3：刷新页面后验证

#### 步骤1：在第四幕页面刷新

按 `F5` 或 `Ctrl+R`

#### 步骤2：检查数据

```javascript
// 刷新后检查localStorage
const data = localStorage.getItem('teaching-store');
console.log('刷新后数据存在:', !!data);

if (data) {
  const store = JSON.parse(data);
  console.log('案件标题:', store?.state?.summaryData?.caseLearningReport?.caseOverview?.title);
}
```

**预期结果**：
- ✅ 如果在reset()后刷新，数据应该仍然是null（没有恢复旧数据）
- ✅ 如果在上传新案例后刷新，数据应该是新案件

---

## ❌ 测试失败场景

### 场景1：localStorage没有被清除

**现象**：
```javascript
localStorage.getItem('teaching-store') !== null
```

**可能原因**：
1. 修复代码未生效（检查 `useTeachingStore.ts` 第348-368行）
2. 浏览器禁用了localStorage
3. 处于隐私模式

**解决方法**：
```javascript
// 手动强制清除
localStorage.clear();
location.reload();
```

### 场景2：Console没有日志输出

**现象**：
点击"学习下一个案例"后，Console没有显示：
```
✅ [Store] localStorage已清除
✅ [Store] 状态已重置为初始值
```

**可能原因**：
1. Console过滤设置（检查是否勾选了"Info"）
2. 代码未生效（需要重启开发服务器）

**解决方法**：
```bash
# 重启开发服务器
npm run dev
```

### 场景3：新旧数据混合显示

**现象**：
上传新案件后，第四幕显示的是旧案件+新案件的混合数据

**可能原因**：
- Store的数据覆盖逻辑有问题
- setExtractedElements没有正确覆盖

**调试方法**：
```javascript
// 查看完整的Store状态
console.log('完整Store:', useTeachingStore.getState());

// 逐个检查每幕的数据
const store = useTeachingStore.getState();
console.log('第一幕:', store.uploadData);
console.log('第二幕:', store.analysisData);
console.log('第三幕:', store.socraticData);
console.log('第四幕:', store.summaryData);
```

---

## ✅ 测试通过标准

所有以下条件必须满足：

- [x] Console输出"localStorage已清除"和"状态已重置"
- [x] `localStorage.getItem('teaching-store')` 返回 `null`
- [x] 内存中的所有幕数据都重置为初始值
- [x] 上传新案例后，第四幕只显示新案件数据
- [x] 刷新页面后，旧数据不会恢复
- [x] 无Console错误

---

## 🔧 开发者工具

### 快速清除所有数据

```javascript
// 方法1: 使用reset()（推荐）
useTeachingStore.getState().reset();

// 方法2: 手动清除
localStorage.removeItem('teaching-store');
location.reload();

// 方法3: 清除所有localStorage
localStorage.clear();
location.reload();
```

### 查看完整Store状态

```javascript
// 格式化输出
const store = useTeachingStore.getState();
console.log(JSON.stringify({
  currentAct: store.currentAct,
  hasUploadData: !!store.uploadData.extractedElements,
  hasAnalysisData: !!store.analysisData.result,
  hasSocraticData: store.socraticData.completedNodes.size,
  hasSummaryData: !!store.summaryData.caseLearningReport
}, null, 2));
```

### 模拟旧数据残留

```javascript
// 手动写入旧数据测试
const oldData = {
  state: {
    summaryData: {
      caseLearningReport: {
        caseOverview: {
          title: "【旧案件】这个不应该出现"
        }
      }
    }
  }
};
localStorage.setItem('teaching-store', JSON.stringify(oldData));
location.reload();

// 然后点击"学习下一个案例"，验证是否能正确清除
```

---

## 📊 测试报告模板

```
测试日期: ____________________
测试人员: ____________________
浏览器: ____________________
版本: ____________________

测试结果:
[ ] 测试案例1: reset()清除localStorage - 通过/失败
[ ] 测试案例2: 上传新案例不受影响 - 通过/失败
[ ] 测试案例3: 刷新页面验证 - 通过/失败

问题描述（如有）:
_________________________________________________
_________________________________________________

Console截图（如有错误）:
_________________________________________________
```

---

## 💡 常见问题

**Q: 为什么清理浏览器缓存无效？**
A: localStorage不是浏览器缓存的一部分，需要单独清理。修复后，用户点击"学习下一个案例"按钮就会自动清除，无需手动操作。

**Q: 修复后还会有数据残留吗？**
A: 不会。修复后reset()会同时清除localStorage和内存数据，确保完全清除。

**Q: 如果用户在中间某一幕想重新开始怎么办？**
A: 目前只有第四幕有"学习下一个案例"按钮。如果需要在其他幕重新开始，可以：
1. 刷新页面（会保留数据）
2. 打开Console执行：`useTeachingStore.getState().reset(); location.reload();`

---

## 📞 反馈

测试完成后，请反馈：

1. ✅ 所有测试都通过了
2. ⚠️ 部分测试失败（提供Console截图）
3. ❌ 修复未生效（需要进一步排查）

---

**祝测试顺利！** 🚀

**相关文档**：
- 详细修复文档：`docs/FOURTH_ACT_PERSISTENCE_FIX.md`
- 数据流分析：`docs/FOURTH_ACT_DATA_PERSISTENCE_ANALYSIS.md`
