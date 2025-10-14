/**
 * PPT数据流完整性验证脚本
 * 在浏览器控制台执行
 */

console.log('='.repeat(80));
console.log('🔍 PPT数据流完整性验证');
console.log('='.repeat(80));

// 测试配置
const testConfig = {
  checkStorage: true,
  simulatePptGeneration: true,
  verbose: true
};

// ==================== 第1步：检查localStorage数据 ====================
console.log('\n📦 第1步：检查localStorage数据');
console.log('-'.repeat(80));

const storeKey = 'teaching-store';
const rawData = localStorage.getItem(storeKey);

if (!rawData) {
  console.error('❌ 未找到teaching-store数据');
  console.log('\n💡 解决方案：');
  console.log('1. 完成第一幕：上传判决书');
  console.log('2. 完成第二幕：深度分析');
  console.log('3. 进入第四幕：生成学习报告');
  throw new Error('localStorage数据缺失');
}

const parsed = JSON.parse(rawData);
const state = parsed.state || parsed;

console.log('✅ localStorage数据存在');
console.log('   数据大小:', (rawData.length / 1024).toFixed(2), 'KB');
console.log('   当前幕:', state.currentAct);

// ==================== 第2步：验证四幕数据完整性 ====================
console.log('\n📋 第2步：验证四幕数据完整性');
console.log('-'.repeat(80));

const dataStatus = {
  act1: {
    name: '第一幕：案例导入',
    required: ['uploadData', 'uploadData.extractedElements'],
    optional: ['uploadData.confidence'],
    data: state.uploadData
  },
  act2: {
    name: '第二幕：深度分析',
    required: ['analysisData', 'analysisData.result'],
    optional: ['analysisData.result.keyTurningPoints'],
    data: state.analysisData
  },
  act3: {
    name: '第三幕：苏格拉底讨论',
    required: ['socraticData'],
    optional: ['socraticData.completedNodes'],
    data: state.socraticData
  },
  act4: {
    name: '第四幕：总结提升',
    required: ['summaryData', 'summaryData.caseLearningReport'],
    optional: ['summaryData.caseLearningReport.caseOverview'],
    data: state.summaryData
  }
};

let totalScore = 0;
let maxScore = 0;

Object.entries(dataStatus).forEach(([key, config]) => {
  console.log(`\n${config.name}:`);

  // 检查必需字段
  let actScore = 0;
  const requiredFields = config.required.length;
  maxScore += requiredFields;

  config.required.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], state);
    const exists = value !== null && value !== undefined && value !== '';

    if (exists) {
      console.log(`  ✅ ${field}`);
      actScore++;
    } else {
      console.log(`  ❌ ${field} (缺失)`);
    }
  });

  totalScore += actScore;

  // 检查可选字段
  config.optional.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], state);
    const exists = value !== null && value !== undefined;

    if (exists) {
      console.log(`  ℹ️  ${field} (可选，已有)`);
    }
  });

  // 评分
  const percentage = (actScore / requiredFields * 100).toFixed(0);
  console.log(`  📊 完整度: ${actScore}/${requiredFields} (${percentage}%)`);
});

const overallPercentage = (totalScore / maxScore * 100).toFixed(0);
console.log('\n📊 总体完整度:', `${totalScore}/${maxScore} (${overallPercentage}%)`);

if (totalScore < maxScore) {
  console.warn(`\n⚠️  数据不完整，可能影响PPT生成质量`);
}

// ==================== 第3步：模拟PPT生成器数据读取 ====================
console.log('\n🎯 第3步：模拟PPT生成器数据读取');
console.log('-'.repeat(80));

// 模拟 PptGeneratorService.ts 的数据收集逻辑
const teachingData = {
  // 第一幕数据
  caseInfo: state.uploadData?.extractedElements || {},
  caseConfidence: state.uploadData?.confidence || 0,

  // 第二幕数据
  analysisResult: state.analysisData?.result || {},

  // 第四幕数据
  learningReport: state.summaryData?.caseLearningReport || {},
};

console.log('📤 PPT生成器会读取的数据:');
console.log('\n1️⃣ 案例信息 (caseInfo):');
const caseInfoKeys = Object.keys(teachingData.caseInfo);
console.log('   字段数:', caseInfoKeys.length);
if (caseInfoKeys.length > 0) {
  console.log('   ✅ 包含:', caseInfoKeys.slice(0, 5).join(', '), caseInfoKeys.length > 5 ? '...' : '');
} else {
  console.warn('   ⚠️  无数据，PPT首页可能缺失案件信息');
}

console.log('\n2️⃣ 深度分析 (analysisResult):');
const analysisKeys = Object.keys(teachingData.analysisResult);
console.log('   字段数:', analysisKeys.length);
if (analysisKeys.length > 0) {
  console.log('   ✅ 包含:', analysisKeys.join(', '));
} else {
  console.warn('   ⚠️  无数据，PPT分析页面可能缺失');
}

console.log('\n3️⃣ 学习报告 (learningReport):');
const reportKeys = Object.keys(teachingData.learningReport);
console.log('   字段数:', reportKeys.length);

if (reportKeys.length > 0) {
  console.log('   ✅ 包含:', reportKeys.join(', '));

  // 详细检查学习报告结构
  const report = teachingData.learningReport;

  if (report.caseOverview) {
    console.log('\n   📋 案例概览:');
    console.log('      - 标题:', report.caseOverview.title || '(无)');
    console.log('      - 一句话总结:', report.caseOverview.oneLineSummary ? '✅' : '❌');
    console.log('      - 核心争议:', report.caseOverview.keyDispute ? '✅' : '❌');
    console.log('      - 判决结果:', report.caseOverview.judgmentResult ? '✅' : '❌');
  }

  if (report.learningPoints) {
    console.log('\n   📚 学习要点:');
    console.log('      - 事实洞察:', report.learningPoints.factualInsights?.length || 0, '条');
    console.log('      - 法律原则:', report.learningPoints.legalPrinciples?.length || 0, '条');
    console.log('      - 证据处理:', report.learningPoints.evidenceHandling?.length || 0, '条');
  }

  if (report.socraticHighlights) {
    console.log('\n   💡 苏格拉底精华:');
    console.log('      - 关键问题:', report.socraticHighlights.keyQuestions?.length || 0, '条');
    console.log('      - 学生洞察:', report.socraticHighlights.studentInsights?.length || 0, '条');
    console.log('      - 批判性思维:', report.socraticHighlights.criticalThinking?.length || 0, '条');
  }

  if (report.practicalTakeaways) {
    console.log('\n   🎯 实践要点:');
    console.log('      - 相似案例:', report.practicalTakeaways.similarCases ? '✅' : '❌');
    console.log('      - 注意事项:', report.practicalTakeaways.cautionPoints?.length || 0, '条');
    console.log('      - 检查清单:', report.practicalTakeaways.checkList?.length || 0, '条');
  }

} else {
  console.error('   ❌ 无学习报告数据！');
  console.log('\n   💥 影响：PPT将缺少核心教学内容：');
  console.log('      - 缺少学习要点页面');
  console.log('      - 缺少苏格拉底讨论精华');
  console.log('      - 缺少实践指导页面');
  console.log('\n   🔧 解决方案：');
  console.log('      1. 进入第四幕页面');
  console.log('      2. 等待报告生成完成');
  console.log('      3. 确认数据已保存到localStorage');
}

// ==================== 第4步：数据质量评估 ====================
console.log('\n🎨 第4步：数据质量评估');
console.log('-'.repeat(80));

const qualityMetrics = {
  case_info_richness: caseInfoKeys.length > 5 ? 'good' : caseInfoKeys.length > 2 ? 'medium' : 'poor',
  analysis_depth: analysisKeys.length >= 3 ? 'good' : analysisKeys.length >= 1 ? 'medium' : 'poor',
  report_completeness: reportKeys.length >= 5 ? 'good' : reportKeys.length >= 3 ? 'medium' : 'poor'
};

console.log('质量评估:');
console.log('  案例信息丰富度:', qualityMetrics.case_info_richness === 'good' ? '✅ 优秀' : qualityMetrics.case_info_richness === 'medium' ? '⚠️  中等' : '❌ 较差');
console.log('  分析深度:', qualityMetrics.analysis_depth === 'good' ? '✅ 优秀' : qualityMetrics.analysis_depth === 'medium' ? '⚠️  中等' : '❌ 较差');
console.log('  报告完整度:', qualityMetrics.report_completeness === 'good' ? '✅ 优秀' : qualityMetrics.report_completeness === 'medium' ? '⚠️  中等' : '❌ 较差');

const overallQuality = Object.values(qualityMetrics).filter(v => v === 'good').length >= 2 ? 'good' :
                       Object.values(qualityMetrics).filter(v => v === 'poor').length >= 2 ? 'poor' : 'medium';

console.log('\n📊 综合质量:', overallQuality === 'good' ? '✅ 优秀 - 可生成高质量PPT' : overallQuality === 'medium' ? '⚠️  中等 - PPT内容可能不够完整' : '❌ 较差 - 建议完善数据后再生成PPT');

// ==================== 第5步：生成建议 ====================
console.log('\n💡 第5步：生成建议');
console.log('-'.repeat(80));

const suggestions = [];

if (!state.uploadData?.extractedElements) {
  suggestions.push('❌ 缺少案例导入数据，请先完成第一幕');
}

if (!state.analysisData?.result) {
  suggestions.push('⚠️  缺少深度分析数据，PPT分析内容会较薄弱');
}

if (!state.summaryData?.caseLearningReport) {
  suggestions.push('❌ 缺少学习报告，PPT将缺失核心教学内容（严重影响质量）');
}

if (suggestions.length === 0) {
  console.log('✅ 数据完整，可以生成高质量PPT！');
  console.log('\n🚀 下一步操作：');
  console.log('   1. 点击"生成教学PPT"按钮');
  console.log('   2. 等待大纲生成（约10-15秒）');
  console.log('   3. 审核并确认大纲');
  console.log('   4. 等待PPT生成（约20-30秒）');
  console.log('   5. 下载使用');
} else {
  console.log('⚠️  发现以下问题：');
  suggestions.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

  console.log('\n🔧 解决方案：');
  if (!state.uploadData?.extractedElements) {
    console.log('   1. 返回首页，上传判决书PDF');
  }
  if (!state.analysisData?.result) {
    console.log('   2. 等待深度分析完成');
  }
  if (!state.summaryData?.caseLearningReport) {
    console.log('   3. 进入第四幕，等待报告生成');
    console.log('      (报告会自动保存到localStorage)');
  }
}

// ==================== 总结 ====================
console.log('\n' + '='.repeat(80));
console.log('📝 验证总结');
console.log('='.repeat(80));
console.log('数据完整度:', `${overallPercentage}%`);
console.log('数据质量:', overallQuality === 'good' ? '优秀' : overallQuality === 'medium' ? '中等' : '较差');
console.log('是否可生成PPT:', suggestions.length === 0 ? '✅ 是' : '❌ 否（需完善数据）');
console.log('='.repeat(80));

// 导出数据供调试使用
console.log('\n💾 调试数据已保存到 window.__PPT_DEBUG__');
window.__PPT_DEBUG__ = {
  state,
  teachingData,
  dataStatus,
  qualityMetrics,
  suggestions,
  timestamp: new Date().toISOString()
};
