/**
 * 快速验证修复结果
 */

import { TimelineAnalyzer } from '../lib/ai-timeline-analyzer';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 使用服务端API密钥创建分析器实例
const analyzer = new TimelineAnalyzer(process.env.DEEPSEEK_API_KEY);

const testEvent = {
  date: '2023年1月15日',
  event: '签订房屋买卖合同'
};

const testCase = {
  basicInfo: { caseNumber: '测试案例' }
};

async function quickTest() {
  console.log('🚀 快速验证AI分析修复结果');
  
  // 显示API配置状态
  console.log('🔧 API配置状态:');
  console.log('- DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置');
  
  // 测试原告视角
  console.log('\n🎯 测试原告视角...');
  const plaintiffResult = await analyzer.analyzeTimelineEvent(
    testEvent as any,
    testCase as any,
    { perspective: 'plaintiff' }
  );
  
  console.log('- 视角分析存在:', !!plaintiffResult.perspectiveAnalysis);
  console.log('- 观点字段:', plaintiffResult.perspectiveAnalysis?.viewpoint);
  
  // 测试被告视角  
  console.log('\n🎯 测试被告视角...');
  const defendantResult = await analyzer.analyzeTimelineEvent(
    testEvent as any,
    testCase as any,
    { perspective: 'defendant' }
  );
  
  console.log('- 视角分析存在:', !!defendantResult.perspectiveAnalysis);
  console.log('- 观点内容:', defendantResult.perspectiveAnalysis?.viewpoint);
  
  console.log('\n✅ 修复验证完成！');
}

quickTest().catch(console.error);