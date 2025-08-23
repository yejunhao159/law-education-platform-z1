// 测试文件解析
const fs = require('fs');

// 读取测试文档
const testDoc = fs.readFileSync('./test-document.md', 'utf-8');

console.log('文档长度:', testDoc.length);
console.log('前100字符:', testDoc.substring(0, 100));

// 测试API
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/extract-elements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: testDoc,
        useAI: false  // 先测试不用AI的情况
      })
    });
    
    console.log('响应状态:', response.status);
    const data = await response.json();
    console.log('响应数据:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testAPI();