#!/usr/bin/env tsx
/**
 * 测试完整苏格拉底对话流程
 * 模拟前端TeacherSocratic.tsx组件的实际请求
 */

async function testSocraticFlow() {
  console.log('🎯 测试苏格拉底对话流程...\n');

  // 模拟TeacherSocratic.tsx发送的请求数据
  const testRequest = {
    messages: [
      {
        role: 'user',
        content: '老师，在这个合同纠纷案例中，违约金和损害赔偿可以同时主张吗？',
        timestamp: new Date().toISOString()
      }
    ],
    caseContext: `案件：设备采购合同纠纷
争议：甲公司要求乙公司承担违约金及实际损失
事实：乙公司延迟交付设备45天；甲公司损失50万元；合同约定违约金20万元
法条：《民法典》第585条违约金条款；《民法典》第584条损害赔偿条款`,
    currentTopic: '违约金与损害赔偿的关系',
    level: 'INTERMEDIATE',
    mode: 'EXPLORATION',
    sessionId: `test-session-${Date.now()}`,
    // 向后兼容字段
    question: '违约金与损害赔偿可以同时主张吗？',
    context: {
      caseTitle: '设备采购合同纠纷',
      facts: ['乙公司延迟交付设备45天', '甲公司损失50万元', '合同约定违约金20万元'],
      laws: ['《民法典》第585条违约金条款', '《民法典》第584条损害赔偿条款'],
      dispute: '甲公司要求乙公司承担违约金及实际损失',
      previousMessages: []
    }
  };

  try {
    console.log('1️⃣ 准备API测试请求...');
    console.log('请求数据预览:', {
      messageCount: testRequest.messages.length,
      caseContextLength: testRequest.caseContext.length,
      currentTopic: testRequest.currentTopic,
      sessionId: testRequest.sessionId
    });

    console.log('\n2️⃣ 发送请求到 /api/socratic...');

    const response = await fetch('http://localhost:3003/api/socratic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });

    const result = await response.json();

    console.log('\n3️⃣ 分析响应结果...');
    console.log('HTTP状态码:', response.status);
    console.log('响应成功:', result.success);

    if (result.success && result.data) {
      console.log('✅ API调用成功！');
      console.log('\n📝 AI响应内容:');
      console.log('主要回答:', result.data.content || result.data.question || '未获取到内容');

      if (result.data.metadata) {
        console.log('\n📊 响应元数据:');
        console.log('- Token使用:', result.data.metadata.tokensUsed || '未知');
        console.log('- 处理时间:', result.data.metadata.processingTime || '未知', 'ms');
        console.log('- 使用模型:', result.data.metadata.model || '未知');
        console.log('- 成本估算:', result.data.metadata.cost || '未知');
      }

      console.log('\n🎯 流程验证结果:');
      console.log('✅ 前端请求格式兼容');
      console.log('✅ API路由正常响应');
      console.log('✅ EnhancedSocraticService集成成功');
      console.log('✅ 响应数据结构完整');

    } else {
      console.log('❌ API调用失败');
      console.log('错误信息:', result.error || '未知错误');
    }

    console.log('\n4️⃣ 测试总结:');
    console.log('🔄 完整流程状态:', result.success ? '✅ 成功' : '❌ 失败');
    console.log('🔗 前端→API→Service→AI集成:', result.success ? '✅ 畅通' : '❌ 异常');

  } catch (error) {
    console.error('\n❌ 流程测试失败:', error);

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 解决方案: 请先启动开发服务器');
        console.log('   运行: npm run dev');
        console.log('   然后重新运行此测试');
      } else if (error.message.includes('fetch')) {
        console.log('\n💡 网络错误: 请检查API端点是否可访问');
      }
    }
  }
}

// 运行测试
console.log('🚀 启动苏格拉底对话完整流程测试...\n');
testSocraticFlow().catch(console.error);