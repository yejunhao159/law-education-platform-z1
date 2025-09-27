/**
 * 测试AI配置和连接
 */

console.log('=== AI配置检查 ===');
console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '已设置' : '未设置');
console.log('DEEPSEEK_API_URL:', process.env.DEEPSEEK_API_URL || '未设置');

// 测试直接API调用
async function testDirectDeepSeekAPI() {
  try {
    const response = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: '你好，这是一个简单的测试' }
        ],
        max_tokens: 50
      })
    });

    console.log('\n=== 直接API调用测试 ===');
    console.log('状态码:', response.status);
    console.log('状态文本:', response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API调用成功');
      console.log('回复:', data.choices?.[0]?.message?.content);
    } else {
      const errorText = await response.text();
      console.log('❌ API调用失败:', errorText);
    }
  } catch (error) {
    console.log('❌ 网络错误:', error.message);
  }
}

testDirectDeepSeekAPI();