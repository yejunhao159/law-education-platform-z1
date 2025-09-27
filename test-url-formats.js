/**
 * 测试不同URL格式对AI调用的影响
 */

async function testDifferentURLFormats() {
  console.log('=== 测试不同API URL格式 ===\n');

  const apiKey = 'sk-6b081a93258346379182141661293345';
  const testPrompt = '请简单回答：1+1等于几？';

  // 测试1：完整路径
  console.log('1. 测试完整路径: https://api.deepseek.com/v1/chat/completions');
  try {
    const response1 = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 10
      })
    });
    console.log('   状态:', response1.status, response1.statusText);
    if (response1.ok) {
      const data = await response1.json();
      console.log('   ✅ 成功，回答:', data.choices?.[0]?.message?.content);
    }
  } catch (error) {
    console.log('   ❌ 失败:', error.message);
  }

  // 测试2：基础路径（预期会404）
  console.log('\n2. 测试基础路径: https://api.deepseek.com/v1');
  try {
    const response2 = await fetch('https://api.deepseek.com/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 10
      })
    });
    console.log('   状态:', response2.status, response2.statusText);
  } catch (error) {
    console.log('   ❌ 失败:', error.message);
  }

  // 测试3：错误的双重路径（预期会404）
  console.log('\n3. 测试双重路径: https://api.deepseek.com/v1/chat/completions/chat/completions');
  try {
    const response3 = await fetch('https://api.deepseek.com/v1/chat/completions/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 10
      })
    });
    console.log('   状态:', response3.status, response3.statusText);
  } catch (error) {
    console.log('   ❌ 失败:', error.message);
  }

  // 测试4：无认证头（预期会401）
  console.log('\n4. 测试无认证头的请求:');
  try {
    const response4 = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // 没有 Authorization 头
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 10
      })
    });
    console.log('   状态:', response4.status, response4.statusText);
    const errorText = await response4.text();
    console.log('   响应:', errorText.substring(0, 100));
  } catch (error) {
    console.log('   ❌ 失败:', error.message);
  }

  console.log('\n=== 测试完成 ===');
  console.log('结论：');
  console.log('- 如果测试1成功而测试2失败，说明需要完整路径');
  console.log('- 如果测试3返回404，说明双重路径是问题所在');
  console.log('- 如果测试4返回401，说明认证机制正常工作');
}

testDifferentURLFormats();