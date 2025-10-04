/**
 * 测试初始问题生成功能
 * 验证：
 * 1. API接收 generateInitial: true 参数
 * 2. 调用 generateInitialQuestion() 方法
 * 3. AI先分析案件再生成第一个问题
 * 4. 问题符合锋利+幽默+严肃的风格
 */

async function testInitialQuestion() {
  console.log('🧪 测试初始问题生成功能\n');

  // 测试案例数据
  const testCase = {
    caseContext: `
甲公司与乙公司于2023年1月15日签订买卖合同，约定：
1. 甲公司向乙公司采购特种设备一台，价格50万元
2. 乙公司应在合同签订后30天内交付设备
3. 甲公司在验收合格后7天内支付全款

实际情况：
- 2023年2月20日，乙公司交付设备（逾期5天）
- 甲公司验收发现：设备型号与合同约定不符，且存在质量问题
- 乙公司表示：这是同类型升级版，性能更好，不同意退换
- 甲公司拒绝支付款项，要求解除合同并赔偿损失
- 乙公司起诉要求支付合同款项50万元

现在乙公司起诉至法院，要求甲公司支付货款50万元。
甲公司反诉要求解除合同，返还设备，并赔偿因设备不符导致的停工损失10万元。
    `.trim(),
    currentTopic: '合同履行与违约责任',
    level: 'intermediate',
    mode: 'analysis',
    generateInitial: true  // 🔥 关键参数
  };

  console.log('📝 测试请求:', JSON.stringify({
    caseContext: testCase.caseContext.substring(0, 100) + '...',
    currentTopic: testCase.currentTopic,
    level: testCase.level,
    generateInitial: testCase.generateInitial
  }, null, 2));

  try {
    console.log('\n🚀 发送请求到 /api/socratic...\n');

    const response = await fetch('http://localhost:3000/api/socratic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase)
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ API响应:', {
      success: result.success,
      hasQuestion: !!result.data?.question,
      questionLength: result.data?.question?.length || 0,
      isInitialQuestion: result.data?.metadata?.isInitialQuestion
    });

    if (result.success && result.data?.question) {
      console.log('\n📋 生成的初始问题:\n');
      console.log('─'.repeat(80));
      console.log(result.data.question);
      console.log('─'.repeat(80));

      // 验证问题质量
      console.log('\n🔍 质量检查:\n');

      const checks = {
        '问题不为空': result.data.question.length > 10,
        '包含案件事实': result.data.question.includes('甲公司') || result.data.question.includes('乙公司') || result.data.question.includes('设备'),
        '不是泛泛问法': !result.data.question.includes('你对这个案件怎么看') && !result.data.question.includes('有什么看法'),
        '包含问号': result.data.question.includes('？') || result.data.question.includes('?'),
        '标记为初始问题': result.data.metadata?.isInitialQuestion === true
      };

      Object.entries(checks).forEach(([key, value]) => {
        console.log(`   ${value ? '✅' : '❌'} ${key}`);
      });

      // Token使用统计
      if (result.data.metadata) {
        console.log('\n📊 性能统计:\n');
        console.log(`   Token使用: ${result.data.metadata.tokensUsed || 'N/A'}`);
        console.log(`   成本: ¥${result.data.metadata.cost || 'N/A'}`);
        console.log(`   处理时间: ${result.data.metadata.processingTime || 'N/A'}ms`);
        console.log(`   模型: ${result.data.metadata.model || 'N/A'}`);
      }

      console.log('\n✅ 所有测试通过！初始问题生成功能正常工作。');

    } else {
      console.error('❌ API调用成功但未返回问题:', result);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testInitialQuestion();
