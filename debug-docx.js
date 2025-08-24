// 调试DOCX解析问题

console.log('开始DOCX调试...');

// 1. 检查mammoth依赖
try {
  const mammoth = require('mammoth');
  console.log('✅ mammoth库加载成功');
} catch (error) {
  console.error('❌ mammoth库加载失败:', error.message);
}

// 2. 检查文件类型支持 - 手动实现逻辑测试
const testFile = { name: 'test.docx' };
const supportedTypes = ['txt', 'md', 'docx', 'pdf'];
const fileType = testFile.name.split('.').pop()?.toLowerCase();

console.log('🔍 文件类型检测:', fileType);
console.log('📝 支持的类型:', supportedTypes);

const canParse = supportedTypes.includes(fileType || '');
console.log('✅ 文件类型支持检查:', canParse ? '通过' : '失败');

console.log('调试完成');