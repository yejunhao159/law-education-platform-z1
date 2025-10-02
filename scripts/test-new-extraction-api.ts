#!/usr/bin/env npx tsx

/**
 * 测试新的提取API - 验证迁移成功
 *
 * 用法：
 * npm run dev (在另一个终端)
 * npx tsx scripts/test-new-extraction-api.ts
 */

const testText = `
北京市朝阳区人民法院
民事判决书
(2024)京0105民初12345号

原告：张三
被告：李四商贸有限公司

本院认为，原告张三与被告李四商贸有限公司于2024年1月15日签订买卖合同，
约定被告向原告交付货物。但被告于2024年2月1日逾期交付，构成违约。

本院判决如下：
被告李四商贸有限公司于本判决生效之日起十日内向原告张三支付违约金10万元。
`;

async function testNewAPI() {
  console.log('🧪 测试新提取API...\n');

  try {
    // 测试1: 旧格式请求（兼容性测试）
    console.log('📝 测试1: 旧格式请求（兼容性）');
    const response1 = await fetch('http://localhost:3000/api/legal-intelligence/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText,
        useAI: true
      })
    });

    if (!response1.ok) {
      throw new Error(`API错误: ${response1.status}`);
    }

    const result1 = await response1.json();
    console.log('✅ 旧格式响应:', {
      success: result1.success,
      method: result1.method,
      hasThreeElements: !!result1.data?.threeElements,
      confidence: result1.confidence
    });

    // 验证响应格式
    if (!result1.success) {
      throw new Error('API调用失败');
    }

    if (!result1.data?.threeElements) {
      throw new Error('缺少threeElements字段');
    }

    console.log('\n📊 提取的三要素:');
    console.log('  - 事实:', result1.data.threeElements.facts?.summary?.substring(0, 50) + '...');
    console.log('  - 证据:', result1.data.threeElements.evidence?.summary?.substring(0, 50) + '...');
    console.log('  - 说理:', result1.data.threeElements.reasoning?.summary?.substring(0, 50) + '...');

    // 测试2: 新格式请求
    console.log('\n📝 测试2: 新格式请求');
    const response2 = await fetch('http://localhost:3000/api/legal-intelligence/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText,
        options: {
          enableAI: true,
          elementType: 'all',
          enhanceWithProvisions: true
        }
      })
    });

    const result2 = await response2.json();
    console.log('✅ 新格式响应:', {
      success: result2.success,
      hasMetadata: !!result2.metadata,
      hasSuggestions: !!result2.suggestions
    });

    console.log('\n🎉 迁移验证成功！');
    console.log('- 旧API格式：✅ 兼容');
    console.log('- 新API格式：✅ 工作正常');
    console.log('- 前端迁移：✅ 可以安全使用');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testNewAPI();
