/**
 * Socratic上下文注入测试脚本
 * 测试空对话历史和有对话历史两种场景
 */

const testCases = [
  {
    name: '场景1: 空对话历史',
    data: {
      currentTopic: '合同效力分析',
      caseContext: '甲乙双方签订买卖合同，甲方为未成年人。',
      messages: [], // 空对话历史
      level: 'intermediate',
      mode: 'exploration',
      sessionId: 'test-empty-history'
    }
  },
  {
    name: '场景2: 有对话历史',
    data: {
      currentTopic: '合同效力分析',
      caseContext: '甲乙双方签订买卖合同，甲方为未成年人。',
      messages: [
        { role: 'user', content: '我认为这个合同可能无效' },
        { role: 'assistant', content: '为什么你认为合同无效？' },
        { role: 'user', content: '因为甲方是未成年人' }
      ],
      level: 'intermediate',
      mode: 'exploration',
      sessionId: 'test-with-history'
    }
  }
];

async function runTest(testCase) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 ${testCase.name}`);
  console.log('='.repeat(80));

  try {
    const response = await fetch('http://localhost:3000/api/socratic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API请求失败:', response.status, errorText);
      return;
    }

    const result = await response.json();

    console.log('\n📊 响应结果:');
    console.log('  Success:', result.success);
    if (result.success && result.data) {
      console.log('  Question:', result.data.question?.substring(0, 200) + '...');
      console.log('  Tokens Used:', result.data.metadata?.tokensUsed);
      console.log('  Cost:', result.data.metadata?.cost);
    }

    if (!result.success && result.error) {
      console.error('  Error:', result.error);
    }

    console.log('\n✅ 测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

async function main() {
  console.log('🚀 开始Socratic上下文注入测试\n');

  // 等待服务器就绪
  console.log('⏳ 等待服务器启动...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 运行所有测试
  for (const testCase of testCases) {
    await runTest(testCase);
    // 等待一下再运行下一个测试
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 所有测试完成');
  console.log('='.repeat(80));
  console.log('\n💡 请查看服务器日志中的详细messages结构输出');
}

main();
