/**
 * ai-chat流式输出测试脚本
 * 测试 /api/socratic/stream-test 的真正流式能力
 */

async function testAIChatStream() {
  console.log('🧪 开始测试ai-chat流式输出...\n');

  const testRequest = {
    currentTopic: '合同效力分析',
    caseContext: '甲乙双方签订买卖合同，约定甲方向乙方出售一批货物。但签订时甲方为限制民事行为能力人。',
    messages: [],
    level: 'intermediate',
    mode: 'exploration'
  };

  console.log('📤 发送请求:', testRequest);
  console.log('');

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/socratic/stream-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
    console.log('=' .repeat(80));
    console.log('');

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

          console.log('');
          console.log('=' .repeat(80));
          console.log('');
          console.log('✅ 流式输出完成!');
          console.log('');
          console.log('📊 性能指标:');
          console.log(`  - TTFT (首Token时间): ${ttft}ms`);
          console.log(`  - 总耗时: ${totalTime}ms`);
          console.log(`  - Token数: ${tokenCount}`);
          console.log(`  - 吞吐率: ${(tokenCount / (totalTime / 1000)).toFixed(2)} tokens/s`);
          console.log('');
          console.log('📝 完整内容:');
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

          if (chunk.phase) {
            console.log(`\n\n🔄 阶段: ${chunk.phase}\n`);
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
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testAIChatStream().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
