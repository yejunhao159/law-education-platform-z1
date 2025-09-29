const https = require('https');

const apiKey = 'sk-6b081a93258346379182141661293345';
const apiUrl = 'https://api.deepseek.com/v1/chat/completions';

const data = JSON.stringify({
  model: 'deepseek-chat',
  messages: [
    {
      role: 'user',
      content: 'Hello, please respond with "API is working"'
    }
  ],
  temperature: 0.7,
  max_tokens: 50
});

const options = {
  hostname: 'api.deepseek.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${apiKey}`
  }
};

console.log('Testing DeepSeek API connection...');
console.log('URL:', apiUrl);
console.log('Headers:', JSON.stringify(options.headers, null, 2));

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));

  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\nRaw Response:');
    console.log(responseData);

    try {
      const parsed = JSON.parse(responseData);
      console.log('\nParsed Response:');
      console.log(JSON.stringify(parsed, null, 2));

      if (parsed.choices && parsed.choices[0]) {
        console.log('\n✅ API Response:', parsed.choices[0].message.content);
      } else if (parsed.error) {
        console.log('\n❌ API Error:', parsed.error.message);
      }
    } catch (e) {
      console.error('\n❌ Failed to parse response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Request error:', e);
});

req.write(data);
req.end();