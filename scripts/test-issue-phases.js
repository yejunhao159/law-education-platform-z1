/**
 * 测试ISSUE阶段差异化Prompt功能
 * 验证：
 * 1. Initiate/Structure阶段：生成选项式问题
 * 2. Socratic/Unify/Execute阶段：生成锋利追问
 */

async function testISSUEPhases() {
  console.log('🧪 测试ISSUE阶段差异化Prompt功能\n');

  const testCases = [
    {
      name: '前期阶段 - Initiate（启动）',
      phase: 'initiate',
      expectOptionStyle: true,
      request: {
        caseContext: `
甲公司与乙公司签订买卖合同，约定乙公司交付特种设备，价格50万元。
实际交付时，乙公司提供的设备型号与合同约定不符，甲公司拒绝付款。
乙公司起诉要求支付货款。
        `.trim(),
        currentTopic: '合同履行与违约',
        level: 'intermediate',
        mode: 'analysis',
        issuePhase: 'initiate',
        messages: []
      }
    },
    {
      name: '前期阶段 - Structure（结构化）',
      phase: 'structure',
      expectOptionStyle: true,
      request: {
        caseContext: `
甲公司与乙公司签订买卖合同，约定乙公司交付特种设备，价格50万元。
实际交付时，乙公司提供的设备型号与合同约定不符，甲公司拒绝付款。
        `.trim(),
        currentTopic: '合同履行与违约',
        level: 'intermediate',
        mode: 'analysis',
        issuePhase: 'structure',
        messages: [
          { role: 'user', content: '这个案件感觉挺复杂的。' }
        ]
      }
    },
    {
      name: '中期阶段 - Socratic（苏格拉底对话）',
      phase: 'socratic',
      expectOptionStyle: false,
      request: {
        caseContext: `
甲公司与乙公司签订买卖合同，约定乙公司交付特种设备，价格50万元。
实际交付时，乙公司提供的设备型号与合同约定不符，甲公司拒绝付款。
        `.trim(),
        currentTopic: '合同履行与违约',
        level: 'intermediate',
        mode: 'analysis',
        issuePhase: 'socratic',
        messages: [
          { role: 'user', content: '这个案件感觉挺复杂的。' },
          { role: 'assistant', content: '是的，涉及合同效力和违约责任。' },
          { role: 'user', content: '我觉得乙公司违约了，所以甲公司可以不付款。' }
        ]
      }
    },
    {
      name: '后期阶段 - Unify（统一认知）',
      phase: 'unify',
      expectOptionStyle: false,
      request: {
        caseContext: `
甲公司与乙公司签订买卖合同，约定乙公司交付特种设备，价格50万元。
实际交付时，乙公司提供的设备型号与合同约定不符，甲公司拒绝付款。
        `.trim(),
        currentTopic: '合同履行与违约',
        level: 'intermediate',
        mode: 'synthesis',
        issuePhase: 'unify',
        messages: [
          { role: 'user', content: '经过讨论，我理解了违约责任的构成要件。' }
        ]
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 测试: ${testCase.name}`);
    console.log(`   阶段: ${testCase.phase}`);
    console.log(`   预期风格: ${testCase.expectOptionStyle ? '选项式问题' : '锋利追问'}`);
    console.log('='.repeat(80));

    try {
      const response = await fetch('http://localhost:3000/api/socratic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.request)
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data?.question) {
        const question = result.data.question;

        console.log('\n📋 生成的问题:\n');
        console.log('─'.repeat(80));
        console.log(question);
        console.log('─'.repeat(80));

        // 检查问题风格
        console.log('\n🔍 风格检查:\n');

        const hasOptions = /[A-D][\.、:：]/.test(question) || question.match(/A\s*[\.、:：]|B\s*[\.、:：]|C\s*[\.、:：]/);
        const hasSharpQuestions = question.includes('为什么') || question.includes('怎么') || question.includes('矛盾');
        const hasHumor = question.includes('😄') || question.includes('菜市场');

        console.log(`   ${hasOptions ? '✅' : '❌'} 包含选项标记（A/B/C）: ${hasOptions ? '是' : '否'}`);
        console.log(`   ${hasSharpQuestions ? '✅' : '❌'} 包含锋利追问: ${hasSharpQuestions ? '是' : '否'}`);
        console.log(`   ${hasHumor ? '✅' : '❌'} 包含幽默元素: ${hasHumor ? '是' : '否'}`);

        // 验证是否符合预期
        const styleMatches = testCase.expectOptionStyle ? hasOptions : hasSharpQuestions;
        console.log(`\n   ${styleMatches ? '✅' : '⚠️'} 风格符合预期: ${styleMatches ? '是' : '否（但可能是AI随机性）'}`);

      } else {
        console.error('❌ API调用成功但未返回问题:', result);
      }

    } catch (error) {
      console.error(`❌ 测试失败 (${testCase.name}):`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 所有ISSUE阶段测试完成！');
  console.log('='.repeat(80));
  console.log('\n📋 总结:');
  console.log('   - Initiate/Structure阶段应倾向于选项式问题（降低认知负荷）');
  console.log('   - Socratic/Unify/Execute阶段应使用锋利追问（深度启发）');
  console.log('   - AI可能因随机性产生变化，符合预期即为正常');
}

// 运行测试
testISSUEPhases();
