/**
 * 简单的fallback测试 - 不调用API
 */

import { TimelineAnalyzer } from '../lib/ai-timeline-analyzer';

// 创建无API密钥的分析器，强制使用fallback
const analyzer = new TimelineAnalyzer('');

const testEvent = {
  date: '2023年1月15日',
  event: '签订房屋买卖合同'
};

const testCase = {
  basicInfo: { caseNumber: '测试案例' }
};

async function simpleTest() {
  console.log('🔧 测试Fallback分析功能');
  
  try {
    // 测试原告视角fallback
    const result = await analyzer.analyzeTimelineEvent(
      testEvent as any,
      testCase as any,
      { perspective: 'plaintiff' }
    );
    
    console.log('\n✅ 分析结果:');
    console.log('- 重要性级别:', result.importance?.level);
    console.log('- 视角分析存在:', !!result.perspectiveAnalysis);
    console.log('- 观点字段存在:', !!result.perspectiveAnalysis?.viewpoint);
    console.log('- 观点内容:', result.perspectiveAnalysis?.viewpoint);
    console.log('- isFallback:', result.isFallback);
    
    if (result.perspectiveAnalysis?.viewpoint) {
      console.log('\n🎉 viewpoint字段修复成功！');
    } else {
      console.log('\n❌ viewpoint字段仍然缺失');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

simpleTest();