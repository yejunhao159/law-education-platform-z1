# 📋 第四幕数据持久化测试指南

## ✅ 已完成的修复

1. ✅ 修改了 `useTeachingStore.ts` 启用第四幕数据持久化
2. ✅ 创建了PPT数据流验证脚本 `test-ppt-data-flow.js`
3. ✅ 编写了完整的修复文档 `FOURTH_ACT_PERSISTENCE_FIX.md`
4. ✅ 服务器已自动热重载，修改生效

---

## 🎯 现在需要你做的测试

### **测试1：验证数据持久化（必做）**

1. **清除旧数据**
   ```javascript
   // 在浏览器控制台执行
   localStorage.removeItem('teaching-store');
   location.reload();
   ```

2. **重新生成第四幕数据**
   - 访问 http://localhost:3000
   - 登录（teacher01 / password123）
   - 完成第一幕：上传判决书
   - 等待第二幕：深度分析完成
   - 进入第四幕：等待学习报告生成

3. **测试刷新后数据是否保留**
   - 在第四幕页面，看到完整报告
   - 按F5刷新页面
   - **预期结果：报告依然显示** ✅
   - 如果报告消失了，说明修复未生效 ❌

4. **检查localStorage**
   ```javascript
   // 在控制台执行
   const store = JSON.parse(localStorage.getItem('teaching-store')).state;
   console.log('第四幕数据:', store.summaryData.caseLearningReport);

   // 应该显示完整的报告对象，包含34个数据点
   ```

---

### **测试2：验证PPT数据流（必做）**

1. **执行验证脚本**
   - F12打开开发者工具
   - 切换到Console标签
   - 复制 `test-ppt-data-flow.js` 的全部内容
   - 粘贴到控制台并回车

2. **查看验证结果**
   ```
   预期输出：
   ✅ 第一幕数据完整度: 100%
   ✅ 第二幕数据完整度: 100%
   ✅ 第四幕数据完整度: 100%
   ✅ 总体完整度: 100%
   ✅ 数据质量: 优秀
   ✅ 是否可生成PPT: 是
   ```

3. **如果数据不完整**
   - 查看控制台输出的建议
   - 按建议完成缺失的步骤
   - 重新执行验证脚本

---

### **测试3：生成PPT测试（推荐）**

1. **点击"生成教学PPT"按钮**

2. **查看大纲内容**
   - 等待10-15秒，大纲生成完成
   - 检查大纲是否包含：
     - ✅ 案例基本信息（封面页）
     - ✅ 事实洞察（学习要点）
     - ✅ 法律原则（学习要点）
     - ✅ 证据处理（学习要点）
     - ✅ 苏格拉底讨论精华
     - ✅ 实践指导

3. **确认生成PPT**
   - 点击"确认生成"按钮
   - 等待20-30秒
   - 下载PPT文件

4. **检查PPT内容**
   - 打开下载的PPT
   - 确认包含完整的教学内容
   - 特别检查是否有第四幕数据：
     - 学习要点页面（3页）
     - 苏格拉底讨论页面（1页）
     - 实践指导页面（1页）

---

## 🔍 问题排查

### **问题1：刷新后报告消失**

**可能原因：**
- 浏览器缓存问题
- localStorage配额已满
- 代码未生效

**解决方案：**
```javascript
// 1. 清除浏览器缓存
// Chrome: Ctrl+Shift+Del，选择"缓存的图片和文件"

// 2. 检查localStorage大小
const data = localStorage.getItem('teaching-store');
console.log('数据大小:', (data.length / 1024).toFixed(2), 'KB');

// 3. 检查代码是否生效
// 在 src/domains/teaching-acts/stores/useTeachingStore.ts 的第377-382行
// 应该能看到：
// summaryData: {
//   report: state.summaryData.report,
//   caseLearningReport: state.summaryData.caseLearningReport,
//   isGenerating: false,
// },
```

### **问题2：PPT缺少第四幕内容**

**诊断：**
```javascript
// 检查第四幕数据
const store = JSON.parse(localStorage.getItem('teaching-store')).state;
const hasReport = !!store.summaryData?.caseLearningReport;

console.log('第四幕数据存在:', hasReport);

if (hasReport) {
  const report = store.summaryData.caseLearningReport;
  console.log('报告字段:', Object.keys(report));
  console.log('学习要点:', report.learningPoints);
} else {
  console.error('❌ 第四幕数据缺失！');
}
```

**解决方案：**
- 如果数据不存在，重新进入第四幕生成报告
- 确认报告生成成功后再生成PPT
- 执行 `test-ppt-data-flow.js` 验证数据完整性

### **问题3：验证脚本报错**

**常见错误：**
```javascript
// 错误1: Cannot read property 'state' of null
// 原因: localStorage无数据
// 解决: 完成四幕流程

// 错误2: Unexpected token in JSON
// 原因: localStorage数据损坏
// 解决: localStorage.removeItem('teaching-store'); location.reload();

// 错误3: summaryData is undefined
// 原因: 旧版本数据
// 解决: 清除数据，重新生成
```

---

## 📊 测试检查清单

完成后请打勾：

- [ ] 测试1-步骤1: 清除旧数据 ✓
- [ ] 测试1-步骤2: 重新生成第四幕数据 ✓
- [ ] 测试1-步骤3: 刷新后报告依然显示 ✓
- [ ] 测试1-步骤4: localStorage包含第四幕数据 ✓
- [ ] 测试2-步骤1: 执行验证脚本 ✓
- [ ] 测试2-步骤2: 数据完整度100% ✓
- [ ] 测试3-步骤1: 点击生成PPT ✓
- [ ] 测试3-步骤2: 大纲包含第四幕内容 ✓
- [ ] 测试3-步骤3: 成功下载PPT ✓
- [ ] 测试3-步骤4: PPT包含完整教学内容 ✓

---

## 🎉 测试通过标准

**✅ 全部测试通过，如果：**
1. 刷新页面后第四幕报告依然显示
2. 验证脚本显示数据完整度100%
3. PPT大纲包含第四幕的学习要点和讨论精华
4. 下载的PPT包含5个以上关于第四幕的页面

**❌ 测试失败，如果：**
1. 刷新后报告消失
2. 验证脚本显示第四幕数据缺失
3. PPT大纲缺少学习要点或讨论精华
4. PPT只有案情介绍，没有教学总结

---

## 💡 快速验证命令

复制以下代码到控制台，一键检查所有状态：

```javascript
// 🔍 一键检查修复状态
(function() {
  console.log('='.repeat(60));
  console.log('🔍 第四幕持久化修复验证');
  console.log('='.repeat(60));

  try {
    const data = localStorage.getItem('teaching-store');
    if (!data) {
      console.error('❌ localStorage无数据，请先完成四幕流程');
      return;
    }

    const store = JSON.parse(data).state;
    const results = {
      '数据大小': (data.length / 1024).toFixed(2) + ' KB',
      '当前幕': store.currentAct,
      '第一幕数据': !!store.uploadData?.extractedElements ? '✅' : '❌',
      '第二幕数据': !!store.analysisData?.result ? '✅' : '❌',
      '第四幕数据': !!store.summaryData?.caseLearningReport ? '✅' : '❌',
    };

    console.table(results);

    if (store.summaryData?.caseLearningReport) {
      const report = store.summaryData.caseLearningReport;
      const reportDetails = {
        '案例概览': !!report.caseOverview ? '✅' : '❌',
        '学习要点': !!report.learningPoints ? '✅' : '❌',
        '苏格拉底精华': !!report.socraticHighlights ? '✅' : '❌',
        '实践要点': !!report.practicalTakeaways ? '✅' : '❌',
        '事实洞察数': report.learningPoints?.factualInsights?.length || 0,
        '法律原则数': report.learningPoints?.legalPrinciples?.length || 0,
        '关键问题数': report.socraticHighlights?.keyQuestions?.length || 0,
      };
      console.table(reportDetails);

      const totalPoints =
        (report.learningPoints?.factualInsights?.length || 0) +
        (report.learningPoints?.legalPrinciples?.length || 0) +
        (report.learningPoints?.evidenceHandling?.length || 0) +
        (report.socraticHighlights?.keyQuestions?.length || 0) +
        (report.socraticHighlights?.studentInsights?.length || 0) +
        (report.socraticHighlights?.criticalThinking?.length || 0) +
        (report.practicalTakeaways?.cautionPoints?.length || 0) +
        (report.practicalTakeaways?.checkList?.length || 0);

      console.log('\n📊 总数据点:', totalPoints, '个');
      console.log(totalPoints >= 24 ? '✅ 修复成功！' : '⚠️  数据不完整');
    } else {
      console.error('\n❌ 第四幕数据缺失！');
      console.log('解决方案: 进入第四幕页面，等待报告生成');
    }

  } catch (e) {
    console.error('❌ 检查失败:', e.message);
  }

  console.log('='.repeat(60));
})();
```

---

## 📞 反馈

测试完成后，请告诉我：

1. ✅ 所有测试都通过了
2. ⚠️  部分测试失败（请提供控制台截图）
3. ❌ 修复未生效（需要进一步排查）

---

**祝测试顺利！** 🚀
