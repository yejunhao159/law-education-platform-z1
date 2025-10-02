/**
 * 测试主API /api/socratic 的流式和非流式模式
 * 验证重构后的真正流式输出
 */

async function testNonStreamingMode() {
  console.log('📝 测试非流式模式...\n');

  const testRequest = {
    currentTopic: '合同效力分析',
    caseContext: '甲乙双方签订买卖合同，约定甲方向乙方出售一批货物。但签订时甲方为限制民事行为能力人。',
    messages: [],
    level: 'intermediate',
    mode: 'exploration',
    streaming: false  // 非流式
  };

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/socratic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    console.log('✅ 非流式模式响应成功');
    console.log(`⏱️  耗时: ${duration}ms`);
    console.log(`📊 响应数据:`, {
      success: data.success,
      hasContent: !!data.data?.content,
      contentLength: data.data?.content?.length || 0,
      tokensUsed: data.data?.metadata?.tokensUsed,
      cost: data.data?.metadata?.cost
    });
    console.log(`\n📝 生成内容:\n${data.data?.content}\n`);
    console.log('=' .repeat(80) + '\n');

  } catch (error) {
    console.error('❌ 非流式模式测试失败:', error);
    throw error;
  }
}

async function testStreamingMode() {
  console.log('🚀 测试流式模式...\n');

  const testRequest = {
    currentTopic: '合同效力分析',
    caseContext: '甲乙双方签订买卖合同，约定甲方向乙方出售一批货物。但签订时甲方为限制民事行为能力人。',
    messages: [],
    level: 'intermediate',
    mode: 'exploration',
    streaming: true  // 流式
  };

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/socratic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('响应body为空');
    }

    console.log('✅ SSE连接建立成功');
    console.log('📊 开始接收流式数据...\n');
    console.log('=' .repeat(80) + '\n');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let tokenCount = 0;
    let firstTokenTime = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
          const totalTime = Date.now() - startTime;
          const ttft = firstTokenTime - startTime;

          console.log('\n');
          console.log('=' .repeat(80));
          console.log('\n✅ 流式输出完成!\n');
          console.log('📊 性能指标:');
          console.log(`  - TTFT (首Token时间): ${ttft}ms`);
          console.log(`  - 总耗时: ${totalTime}ms`);
          console.log(`  - Token数: ${tokenCount}`);
          console.log(`  - 吞吐率: ${(tokenCount / (totalTime / 1000)).toFixed(2)} tokens/s`);
          console.log('\n📝 完整内容:');
          console.log(fullContent);
          console.log('');
          return;
        }

        try {
          const chunk = JSON.parse(data);

          if (chunk.content) {
            if (tokenCount === 0) {
              firstTokenTime = Date.now();
              console.log(`⏱️  首Token延迟: ${firstTokenTime - startTime}ms\n`);
            }

            tokenCount++;
            fullContent += chunk.content;
            process.stdout.write(chunk.content);  // 实时打印
          }

          if (chunk.error) {
            console.error(`\n\n❌ 错误: ${chunk.error}\n`);
            return;
          }
        } catch (e) {
          console.warn('解析chunk失败:', data);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ 流式模式测试失败:', error);
    throw error;
  }
}

// 运行测试
async function runAllTests() {
  console.log('🧪 开始测试主API /api/socratic\n');
  console.log('=' .repeat(80) + '\n');

  try {
    // 测试1: 非流式模式
    await testNonStreamingMode();

    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试2: 流式模式
    await testStreamingMode();

    console.log('\n🎉 所有测试完成!\n');

  } catch (error) {
    console.error('\n❌ 测试套件失败:', error);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
