/**
 * 第四幕报告生成诊断脚本
 * 在浏览器控制台执行
 */

console.log('='.repeat(60));
console.log('🔍 第四幕报告生成诊断');
console.log('='.repeat(60));

// 1. 检查Store数据
console.log('\n--- 1. 检查Store数据 ---');
const storeKey = 'teaching-store';
const rawData = localStorage.getItem(storeKey);

if (!rawData) {
  console.error('❌ 未找到teaching-store数据');
} else {
  const parsed = JSON.parse(rawData);
  const state = parsed.state || parsed;

  console.log('✅ Store数据存在');
  console.log('当前幕:', state.currentAct);

  // 检查必需数据
  const hasUploadData = !!state.uploadData?.extractedElements;
  const hasAnalysisData = !!state.analysisData?.result;

  console.log('\n必需数据检查:');
  console.log('  uploadData:', hasUploadData ? '✅' : '❌');
  console.log('  analysisData:', hasAnalysisData ? '✅' : '❌');
  console.log('  summaryData:', !!state.summaryData?.caseLearningReport ? '✅' : '❌');

  if (!hasUploadData || !hasAnalysisData) {
    console.warn('⚠️  缺少必需数据，无法生成报告');
    console.log('\n解决方案：');
    console.log('1. 返回第一幕重新上传判决书');
    console.log('2. 完成第二幕深度分析');
  }
}

// 2. 模拟API调用测试
console.log('\n--- 2. 测试API调用 ---');
console.log('准备调用 /api/teaching-acts/summary...\n');

(async function testAPI() {
  try {
    const state = JSON.parse(localStorage.getItem('teaching-store')).state;

    const requestData = {
      uploadData: state.uploadData,
      analysisData: state.analysisData,
      socraticData: {
        level: state.socraticData?.level || 1,
        completedNodes: Array.isArray(state.socraticData?.completedNodes)
          ? state.socraticData.completedNodes
          : []
      }
    };

    console.log('📤 发送请求数据:');
    console.log('  uploadData大小:', JSON.stringify(requestData.uploadData).length, 'bytes');
    console.log('  analysisData大小:', JSON.stringify(requestData.analysisData).length, 'bytes');

    const response = await fetch('/api/teaching-acts/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    console.log('\n📥 收到响应:');
    console.log('  状态码:', response.status);
    console.log('  状态文本:', response.statusText);

    const result = await response.json();

    if (result.success) {
      console.log('\n✅ API调用成功！');
      console.log('\n生成的报告结构:');
      const report = result.data;

      if (report.caseOverview) {
        console.log('\n案例概览:');
        console.log('  标题:', report.caseOverview.title);
        console.log('  一句话总结:', report.caseOverview.oneLineSummary);
      }

      if (report.learningPoints) {
        console.log('\n学习要点:');
        console.log('  事实洞察数:', report.learningPoints.factualInsights?.length || 0);
        console.log('  法律原则数:', report.learningPoints.legalPrinciples?.length || 0);
        console.log('  证据处理数:', report.learningPoints.evidenceHandling?.length || 0);
      }

      if (report.socraticHighlights) {
        console.log('\n苏格拉底精华:');
        console.log('  关键问题数:', report.socraticHighlights.keyQuestions?.length || 0);
        console.log('  学生洞察数:', report.socraticHighlights.studentInsights?.length || 0);
        console.log('  批判性思维数:', report.socraticHighlights.criticalThinking?.length || 0);
      }

      console.log('\n💾 现在可以手动保存到Store:');
      console.log('执行以下代码:');
      console.log(`
const teachingStore = window.useTeachingStore?.getState?.();
if (teachingStore) {
  teachingStore.setCaseLearningReport(${JSON.stringify(result.data)});
  console.log('✅ 报告已保存到Store');
  location.reload(); // 刷新页面查看
} else {
  console.error('❌ 无法访问Store');
}
      `.trim());
    } else {
      console.error('\n❌ API返回错误:', result.error);
      console.log('\n错误详情:', result);
    }
  } catch (error) {
    console.error('\n❌ API调用失败:', error);
    console.error('错误详情:', error.message);
    console.log('\n可能的原因:');
    console.log('1. 网络连接问题');
    console.log('2. API服务未启动');
    console.log('3. 数据格式错误');
    console.log('4. AI服务异常');
  }
})();

console.log('\n' + '='.repeat(60));
console.log('📝 诊断说明');
console.log('='.repeat(60));
console.log('此脚本会:');
console.log('1. 检查localStorage中的必需数据');
console.log('2. 测试调用报告生成API');
console.log('3. 显示生成的报告内容');
console.log('4. 提供手动保存到Store的代码');
console.log('\n如果API调用失败，请查看:');
console.log('- Network标签页的请求详情');
console.log('- Console的完整错误信息');
console.log('- 服务器日志 (npm run dev的终端输出)');
console.log('='.repeat(60));
