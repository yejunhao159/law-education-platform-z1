/**
 * Store数据调试脚本
 * 帮助排查为什么前三幕数据为空
 */

console.log('🔍 Store数据调试脚本');
console.log('=' .repeat(60));
console.log('\n📋 请按照以下步骤在浏览器Console中执行:\n');

// ========== 步骤1: 检查localStorage ==========
console.log('步骤1️⃣: 检查 localStorage 是否有数据');
console.log('---'.repeat(20));
console.log('复制下面的代码到浏览器Console运行:\n');

const step1Code = `
// 检查 localStorage 中的持久化数据
const storeData = JSON.parse(localStorage.getItem("teaching-store") || "{}");
console.log("📦 完整Store数据:", storeData);

if (storeData.state) {
  console.log("✅ localStorage 中有数据");
  console.log("📊 数据详情:");
  console.log("  - uploadData:", storeData.state.uploadData);
  console.log("  - analysisData:", storeData.state.analysisData);
  console.log("  - socraticData:", storeData.state.socraticData);

  // 详细检查 uploadData
  if (storeData.state.uploadData?.extractedElements) {
    console.log("✅ uploadData.extractedElements 存在");
    console.log("  结构:", Object.keys(storeData.state.uploadData.extractedElements).slice(0,5));
  } else {
    console.warn("❌ uploadData.extractedElements 为空");
  }

  // 详细检查 analysisData
  if (storeData.state.analysisData?.result) {
    console.log("✅ analysisData.result 存在");
    console.log("  结构:", Object.keys(storeData.state.analysisData.result).slice(0,5));
  } else {
    console.warn("❌ analysisData.result 为空");
  }
} else {
  console.error("❌ localStorage 中没有数据");
  console.log("💡 可能原因:");
  console.log("  1. 你还没有完成前三幕");
  console.log("  2. localStorage 被清空或禁用");
  console.log("  3. 使用了无痕模式/隐私模式");
}
`;

console.log(step1Code);

// ========== 步骤2: 检查运行时Store状态 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n步骤2️⃣: 检查运行时 Store 状态');
console.log('---'.repeat(20));
console.log('如果你能访问React DevTools,在Components标签中找到使用useTeachingStore的组件');
console.log('或者在Console中运行:\n');

const step2Code = `
// 直接访问 Store (需要先import)
// 注意：这段代码只有在开发环境中才能工作
try {
  // 尝试从window获取store实例
  if (window.__ZUSTAND_STORES__) {
    console.log("✅ 找到Zustand Store实例");
    console.log(window.__ZUSTAND_STORES__);
  } else {
    console.log("⚠️ 无法直接访问Store，请使用React DevTools");
    console.log("打开React DevTools → Components → 找到使用useTeachingStore的组件");
  }
} catch (error) {
  console.error("❌ 访问Store失败:", error);
}
`;

console.log(step2Code);

// ========== 步骤3: 测试数据写入 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n步骤3️⃣: 测试手动写入数据');
console.log('---'.repeat(20));
console.log('在浏览器Console中运行以下代码，测试数据写入功能:\n');

const step3Code = `
// 测试手动写入数据到localStorage
const testData = {
  state: {
    uploadData: {
      extractedElements: {
        data: {
          title: "测试案例",
          caseId: "TEST001",
          description: "这是一个测试案例"
        },
        confidence: 95
      },
      confidence: 95
    },
    analysisData: {
      result: {
        summary: "测试分析结果",
        turningPoints: [{date: "2024-01-01", description: "测试转折点"}]
      },
      isAnalyzing: false
    },
    socraticData: {
      isActive: false,
      level: 2,
      teachingModeEnabled: false,
      completedNodes: []
    }
  },
  version: 0
};

localStorage.setItem("teaching-store", JSON.stringify(testData));
console.log("✅ 测试数据已写入localStorage");
console.log("📊 请刷新页面，然后进入第四幕查看是否能读取到数据");
`;

console.log(step3Code);

// ========== 步骤4: 检查数据桥接代码 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n步骤4️⃣: 检查数据桥接代码是否执行');
console.log('---'.repeat(20));
console.log('在前三幕运行时,应该在Console看到以下日志:\n');
console.log('第一幕完成时:');
console.log('  → 🔗 [MainPageContainer] 同步案例数据到 useTeachingStore\n');
console.log('第二幕完成时:');
console.log('  → 🔗 [DeepAnalysis] 同步分析结果到 useTeachingStore\n');
console.log('如果没有看到这些日志,说明数据桥接代码没有执行\n');

// ========== 诊断总结 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n📊 诊断总结');
console.log('---'.repeat(20));
console.log('\n根据步骤1的结果判断:\n');
console.log('情况A: localStorage中有数据,但数据结构不对');
console.log('  → 可能是数据存储格式问题');
console.log('  → 检查 extractedElements 的结构是否是 {data: {...}, confidence: 90}\n');

console.log('情况B: localStorage中完全没有数据');
console.log('  → 最可能的原因是你直接跳到第四幕了');
console.log('  → 解决方案: 从第一幕开始依次完成\n');

console.log('情况C: localStorage有数据,但读取时为空');
console.log('  → 可能是persist中间件的反序列化问题');
console.log('  → 检查控制台是否有错误日志\n');

console.log('\n💡 快速测试建议:');
console.log('  1. 运行步骤3，手动写入测试数据');
console.log('  2. 刷新页面');
console.log('  3. 直接进入第四幕');
console.log('  4. 如果能读取到测试数据,说明Store功能正常,问题在于前三幕没有写入数据');
console.log('  5. 如果读不到测试数据,说明persist有问题\n');

console.log('=' .repeat(60));
console.log('🚀 调试脚本结束');
console.log('=' .repeat(60));
