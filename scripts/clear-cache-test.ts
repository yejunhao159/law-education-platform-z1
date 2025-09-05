/**
 * 清理缓存后测试
 */

import { TimelineAnalyzer } from '../lib/ai-timeline-analyzer';
import { cacheManager } from '../lib/utils/analysis-cache';

// 创建无API密钥的分析器，强制使用fallback
const analyzer = new TimelineAnalyzer('');

const testEvent = {
  date: '2023年1月15日',
  event: '签订房屋买卖合同'
};

const testCase = {
  basicInfo: { caseNumber: '测试案例' }
};

async function clearCacheTest() {
  console.log('🧹 清理缓存并重新测试');
  
  // 清理所有缓存
  await cacheManager.clear();
  console.log('✅ 缓存已清理');
  
  try {
    // 重新测试原告视角fallback
    console.log('\n🎯 重新测试原告视角...');
    const result = await analyzer.analyzeTimelineEvent(
      testEvent as any,
      testCase as any,
      { perspective: 'plaintiff' }
    );
    
    console.log('\n📊 分析结果:');
    console.log('- 重要性级别:', result.importance?.level);
    console.log('- 视角分析存在:', !!result.perspectiveAnalysis);
    console.log('- 观点字段存在:', !!result.perspectiveAnalysis?.viewpoint);
    console.log('- 观点内容:', result.perspectiveAnalysis?.viewpoint);
    console.log('- 视角:', result.perspectiveAnalysis?.perspective);
    
    if (result.perspectiveAnalysis?.viewpoint) {
      console.log('\n🎉 viewpoint字段修复成功！');
    } else {
      console.log('\n❌ viewpoint字段仍然缺失');
      console.log('完整perspectiveAnalysis:', JSON.stringify(result.perspectiveAnalysis, null, 2));
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

clearCacheTest();