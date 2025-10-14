/**
 * 数据流验证脚本
 * 用于诊断前三幕数据是否正确存储到useTeachingStore
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 数据流诊断开始\n');
console.log('=' .repeat(60));

// ========== 检查1: localStorage中的数据 ==========
console.log('\n📦 [检查1] LocalStorage数据检查');
console.log('  说明: useTeachingStore使用persist中间件，数据应该存储在localStorage');
console.log('  路径: Chrome DevTools → Application → Local Storage → http://localhost:3000');
console.log('  关键字: teaching-store');
console.log('\n  ⚠️ 这个检查需要在浏览器中手动执行');
console.log('  请在浏览器Console中运行以下代码:\n');
console.log('  ```javascript');
console.log('  const storeData = JSON.parse(localStorage.getItem("teaching-store") || "{}");');
console.log('  console.log("📊 Store数据:", storeData);');
console.log('  console.log("第一幕数据:", storeData.state?.uploadData);');
console.log('  console.log("第二幕数据:", storeData.state?.analysisData);');
console.log('  console.log("第三幕数据:", storeData.state?.socraticData);');
console.log('  ```');

// ========== 检查2: 数据桥接代码是否存在 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n🔗 [检查2] 数据桥接代码检查');

const filesToCheck = [
  {
    name: '第一幕 → MainPageContainer.tsx',
    path: 'src/domains/shared/containers/MainPageContainer.tsx',
    pattern: /useTeachingStore\.getState\(\)\.setExtractedElements/,
    description: '案例数据同步到store'
  },
  {
    name: '第二幕 → DeepAnalysis.tsx',
    path: 'components/acts/DeepAnalysis.tsx',
    pattern: /useTeachingStore\.getState\(\)\.setAnalysisResult/,
    description: 'AI分析结果同步到store'
  },
  {
    name: '第三幕 → useSocraticDialogueStore.ts',
    path: 'src/domains/socratic-dialogue/stores/useSocraticDialogueStore.ts',
    pattern: /useTeachingStore\.getState\(\)\.progressSocraticLevel/,
    description: '苏格拉底对话level同步到store'
  }
];

filesToCheck.forEach(({ name, path: filePath, pattern, description }) => {
  const fullPath = path.join(process.cwd(), filePath);

  console.log(`\n  检查: ${name}`);
  console.log(`  路径: ${filePath}`);
  console.log(`  功能: ${description}`);

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const hasDataBridge = pattern.test(content);

    if (hasDataBridge) {
      console.log(`  结果: ✅ 数据桥接代码存在`);
    } else {
      console.log(`  结果: ❌ 数据桥接代码缺失`);
      console.log(`  需要: 添加 ${pattern.source}`);
    }
  } catch (error) {
    console.log(`  结果: ❌ 文件读取失败: ${error.message}`);
  }
});

// ========== 检查3: CaseSummaryService是否能读取数据 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n📖 [检查3] CaseSummaryService数据读取');

const summaryServicePath = path.join(
  process.cwd(),
  'src/domains/teaching-acts/services/CaseSummaryService.ts'
);

try {
  const content = fs.readFileSync(summaryServicePath, 'utf-8');

  console.log('  检查数据读取代码:');

  const checks = [
    {
      pattern: /store\.uploadData\.extractedElements/,
      description: '读取第一幕案例数据'
    },
    {
      pattern: /store\.analysisData\.result/,
      description: '读取第二幕分析结果'
    },
    {
      pattern: /store\.socraticData\.level/,
      description: '读取第三幕对话level'
    },
    {
      pattern: /store\.socraticData\.completedNodes/,
      description: '读取第三幕完成节点'
    }
  ];

  checks.forEach(({ pattern, description }) => {
    const exists = pattern.test(content);
    console.log(`    ${exists ? '✅' : '❌'} ${description}`);
  });

} catch (error) {
  console.log(`  ❌ 文件读取失败: ${error.message}`);
}

// ========== 检查4: API路由是否存在 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n🔌 [检查4] API路由检查');

const apiPath = path.join(
  process.cwd(),
  'app/api/teaching-acts/summary/route.ts'
);

try {
  const exists = fs.existsSync(apiPath);
  console.log(`  /api/teaching-acts/summary: ${exists ? '✅ 存在' : '❌ 不存在'}`);

  if (exists) {
    const content = fs.readFileSync(apiPath, 'utf-8');
    const hasService = /caseSummaryService\.generateCaseSummary/.test(content);
    console.log(`  调用CaseSummaryService: ${hasService ? '✅ 是' : '❌ 否'}`);
  }
} catch (error) {
  console.log(`  ❌ 检查失败: ${error.message}`);
}

// ========== 检查5: 类型定义 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n📝 [检查5] 类型定义检查');

const typesPath = path.join(process.cwd(), 'src/types/index.ts');

try {
  const content = fs.readFileSync(typesPath, 'utf-8');

  const types = [
    'CaseLearningReport',
    'DeepAnalysisResult',
    'TimelineAnalysis'
  ];

  types.forEach(typeName => {
    const hasType = new RegExp(`(interface|type)\\s+${typeName}`).test(content);
    console.log(`  ${typeName}: ${hasType ? '✅ 已定义' : '❌ 未定义'}`);
  });

} catch (error) {
  console.log(`  ❌ 文件读取失败: ${error.message}`);
}

// ========== 总结和建议 ==========
console.log('\n' + '=' .repeat(60));
console.log('\n📊 诊断总结');
console.log('\n如果所有检查都通过，但第四幕仍显示占位符，可能的原因：');
console.log('  1. 前三幕实际没有执行完成（用户跳过了某些步骤）');
console.log('  2. 数据桥接代码虽然存在，但运行时没有被触发');
console.log('  3. localStorage被清空或禁用');
console.log('  4. 类型不匹配导致数据丢失');
console.log('\n建议的下一步操作：');
console.log('  1. 在浏览器中运行完整的四幕流程');
console.log('  2. 每幕完成后，在Console检查localStorage数据');
console.log('  3. 使用 React DevTools 检查 useTeachingStore 状态');
console.log('  4. 查看服务器日志中的数据收集信息');

console.log('\n' + '=' .repeat(60));
console.log('✅ 数据流诊断完成');
console.log('=' .repeat(60));
