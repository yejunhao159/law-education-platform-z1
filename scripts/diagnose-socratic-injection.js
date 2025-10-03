#!/usr/bin/env node
/**
 * 苏格拉底对话全局注入诊断脚本
 * 目的：验证System Prompt是否正确注入
 */

const { SocraticDialogueService } = require('../src/domains/socratic-dialogue/services/SocraticDialogueService');

async function diagnoseSocraticInjection() {
  console.log('🔍 开始诊断苏格拉底对话全局注入...\n');

  try {
    // 创建服务实例（开启诊断模式）
    const service = new SocraticDialogueService({
      includeDiagnostics: true  // 🔥 关键：开启诊断信息
    });

    console.log('✅ SocraticDialogueService实例创建成功');
    console.log('   配置:', service.getConfig());
    console.log('');

    // 构建测试请求
    const testRequest = {
      currentTopic: '合同效力分析',
      caseContext: '甲方支付50万元购买设备，但收到的设备价值仅5万元。',
      level: 'intermediate',
      mode: 'exploration',
      messages: []
    };

    console.log('📋 测试请求:');
    console.log(JSON.stringify(testRequest, null, 2));
    console.log('');

    // 生成问题（非实际调用AI，只检查Prompt构建）
    console.log('🚀 生成问题（检查Prompt构建）...\n');

    const response = await service.generateQuestion(testRequest);

    if (response.success && response.data) {
      console.log('✅ 问题生成成功');
      console.log('');

      // 🔥 关键：检查是否有诊断信息
      if (response.data.diagnostics) {
        console.log('📊 诊断信息（Prompt详情）:');
        console.log('='.repeat(80));
        console.log(response.data.diagnostics);
        console.log('='.repeat(80));
      } else {
        console.warn('⚠️  警告：没有诊断信息！');
        console.warn('   可能的原因：');
        console.warn('   1. includeDiagnostics未生效');
        console.warn('   2. FullPromptBuilder未返回诊断信息');
      }

      console.log('');
      console.log('🎯 生成的问题:');
      console.log(response.data.question);
      console.log('');
      console.log('📈 元数据:');
      console.log(JSON.stringify(response.data.metadata, null, 2));

    } else {
      console.error('❌ 问题生成失败:');
      console.error(response.error);
    }

  } catch (error) {
    console.error('💥 诊断过程出错:');
    console.error(error.message);
    console.error(error.stack);
  }
}

// 检查System Prompt内容的辅助函数
function analyzeSystemPrompt(prompt) {
  console.log('\n📝 System Prompt分析:');
  console.log('='.repeat(80));

  const sections = [
    { name: 'M1: SocraticIdentity', marker: '🎭 你是谁？苏格拉底的现代化身' },
    { name: 'M2: CognitiveConstraints', marker: '⚖️ 强制性认知约束' },
    { name: 'M3: ChineseLegalThinking', marker: '🇨🇳 中国特色法学思维框架' },
    { name: 'M4: TeachingPrinciples', marker: '苏格拉底教学原则' },
    { name: 'M5: ExecutionSummary', marker: '🚀 第五部分：立即执行要求' }
  ];

  sections.forEach(section => {
    const exists = prompt.includes(section.marker);
    console.log(`${exists ? '✅' : '❌'} ${section.name}: ${exists ? '已注入' : '缺失'}`);
  });

  console.log('');
  console.log(`📏 Prompt总长度: ${prompt.length} 字符`);
  console.log(`📊 估算Token数: ~${Math.floor(prompt.length / 2)} tokens`);
  console.log('='.repeat(80));
}

// 运行诊断
diagnoseSocraticInjection().then(() => {
  console.log('\n✅ 诊断完成');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 诊断失败:', error);
  process.exit(1);
});
