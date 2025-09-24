/**
 * 测试PromptX集成的苏格拉底服务
 */

import { EnhancedSocraticService } from '../src/domains/socratic-dialogue/services/EnhancedSocraticService';
import {
  SocraticRequest,
  SocraticDifficultyLevel,
  SocraticMode,
  SocraticDifficulty
} from '@/lib/types/socratic';

async function testSocraticService() {
  console.log('🧠 开始测试PromptX集成的苏格拉底服务...\n');

  // 创建服务实例
  const service = new EnhancedSocraticService({
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: process.env.DEEPSEEK_API_KEY || 'sk-test',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 500
  });

  // 测试用例：合同违约案例
  const testRequest: SocraticRequest = {
    sessionId: 'test-session-001',
    level: SocraticDifficultyLevel.INTERMEDIATE,
    mode: SocraticMode.ANALYSIS,
    difficulty: SocraticDifficulty.MEDIUM,
    caseContext: `某公司与供应商签订采购合同，约定在2023年6月30日前交付1000台设备，
    但供应商未能按时交付，导致公司延误了与客户的项目，损失50万元。`,
    currentTopic: '合同违约责任认定',
    messages: [
      {
        role: 'user',
        content: '我认为供应商应该承担全部损失赔偿责任，因为他们没有按时交付。',
        timestamp: Date.now()
      }
    ]
  };

  try {
    console.log('📝 测试请求参数:');
    console.log('- 教学等级:', testRequest.level);
    console.log('- 教学模式:', testRequest.mode);
    console.log('- 难度级别:', testRequest.difficulty);
    console.log('- 案例背景:', testRequest.caseContext?.substring(0, 50) + '...');
    console.log('- 学生观点:', testRequest.messages?.[0]?.content?.substring(0, 30) + '...\n');

    console.log('🤖 调用苏格拉底服务...');
    const startTime = Date.now();

    const response = await service.generateSocraticQuestion(testRequest);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  响应时间: ${duration}ms\n`);

    if (response.success && response.data) {
      console.log('✅ 苏格拉底问题生成成功!');
      console.log('📋 生成的问题:');
      console.log(response.data.question);
      console.log('\n📊 响应元数据:');
      console.log('- 教学等级:', response.data.level);
      console.log('- 教学模式:', response.data.mode);
      console.log('- 会话ID:', response.data.sessionId);
      console.log('- 时间戳:', response.data.timestamp);
    } else {
      console.log('❌ 苏格拉底问题生成失败:');
      console.log(response.error);
    }

  } catch (error) {
    console.error('💥 测试过程中发生错误:', error);
  }

  console.log('\n🎯 测试完成!');
}

// 测试不同的教学模式
async function testDifferentModes() {
  console.log('\n🔄 测试不同教学模式...\n');

  const service = new EnhancedSocraticService();
  const baseRequest: SocraticRequest = {
    sessionId: 'mode-test',
    level: SocraticDifficultyLevel.INTERMEDIATE,
    difficulty: SocraticDifficulty.MEDIUM,
    caseContext: '刑事案件：某人涉嫌盗窃，但声称是借用物品。',
    currentTopic: '犯罪构成要件分析',
    messages: [
      {
        role: 'user',
        content: '我觉得这不构成盗窃罪，因为他说是借的。',
        timestamp: Date.now()
      }
    ]
  };

  const modes = [
    { mode: SocraticMode.EXPLORATION, name: '探索模式' },
    { mode: SocraticMode.ANALYSIS, name: '分析模式' },
    { mode: SocraticMode.SYNTHESIS, name: '综合模式' },
    { mode: SocraticMode.EVALUATION, name: '评估模式' }
  ];

  for (const { mode, name } of modes) {
    console.log(`🎯 测试 ${name}...`);

    try {
      const request = { ...baseRequest, mode };
      const response = await service.generateSocraticQuestion(request);

      if (response.success && response.data) {
        console.log(`✅ ${name} 成功:`);
        console.log(response.data.question.substring(0, 100) + '...\n');
      } else {
        console.log(`❌ ${name} 失败:`, response.error?.message + '\n');
      }
    } catch (error) {
      console.log(`💥 ${name} 异常:`, error instanceof Error ? error.message : error, '\n');
    }
  }
}

// 主函数
async function main() {
  console.log('🚀 PromptX苏格拉底服务集成测试\n');
  console.log('======================================\n');

  await testSocraticService();
  await testDifferentModes();

  console.log('======================================');
  console.log('🏁 所有测试完成!');
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

export { testSocraticService, testDifferentModes };