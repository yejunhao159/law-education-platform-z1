#!/usr/bin/env node

/**
 * 测试DeepSeek API连接
 */

require('dotenv').config({ path: '.env.local' });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

console.log('=== DeepSeek API 配置检查 ===');
console.log('API Key:', DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.slice(0, 10)}...${DEEPSEEK_API_KEY.slice(-4)}` : '未配置');
console.log('API URL:', DEEPSEEK_API_URL);

async function testDeepSeekAPI() {
  if (!DEEPSEEK_API_KEY) {
    console.error('\n❌ 错误：未找到DEEPSEEK_API_KEY环境变量');
    console.log('请在.env.local文件中配置：');
    console.log('DEEPSEEK_API_KEY=你的API密钥');
    return;
  }

  console.log('\n正在测试API连接...');
  
  try {
    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: '请回复"API连接成功"这五个字'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ API连接成功！');
      console.log('模型回复:', data.choices[0].message.content);
      console.log('\n使用统计:');
      console.log('- Input tokens:', data.usage.prompt_tokens);
      console.log('- Output tokens:', data.usage.completion_tokens);
      console.log('- Total tokens:', data.usage.total_tokens);
    } else {
      const errorData = await response.text();
      console.error('\n❌ API请求失败:', response.status, response.statusText);
      console.error('错误详情:', errorData);
      
      if (response.status === 401) {
        console.log('\n可能原因：');
        console.log('1. API密钥无效或已过期');
        console.log('2. API密钥格式不正确');
        console.log('3. 账户余额不足');
      }
    }
  } catch (error) {
    console.error('\n❌ 连接失败:', error.message);
    console.log('\n可能原因：');
    console.log('1. 网络连接问题');
    console.log('2. API服务暂时不可用');
    console.log('3. 防火墙或代理设置问题');
  }
}

testDeepSeekAPI();