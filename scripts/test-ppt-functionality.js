#!/usr/bin/env node
/**
 * PPT功能测试脚本
 * 测试302 API连接和PPT生成功能
 */

const { PptGeneratorService } = require('../src/domains/teaching-acts/services/PptGeneratorService');

async function testPptFunctionality() {
  console.log('🧪 [PPT-TEST] Testing PPT generation functionality...');

  try {
    // 1. 检查环境变量
    const apiKey = process.env.NEXT_PUBLIC_AI_302_API_KEY;
    if (!apiKey) {
      console.log('❌ [PPT-TEST] NEXT_PUBLIC_AI_302_API_KEY not configured');
      return false;
    }

    console.log('✅ [PPT-TEST] API Key found');

    // 2. 创建PPT生成服务实例
    const pptService = new PptGeneratorService(apiKey);
    console.log('✅ [PPT-TEST] PptGeneratorService initialized');

    // 3. 测试简单的PPT大纲生成
    console.log('📝 [PPT-TEST] Testing outline generation...');

    const testOutline = {
      slides: [
        {
          title: "测试标题页",
          content: "这是一个测试PPT的内容",
          type: "cover",
          visualHints: "简洁现代风格"
        },
        {
          title: "测试内容页",
          content: "这是第二页的内容，用于验证PPT生成功能",
          type: "content"
        }
      ],
      metadata: {
        totalSlides: 2,
        estimatedMinutes: 2,
        targetAudience: "测试用户"
      }
    };

    // 4. 测试大纲转Markdown
    const markdown = pptService.outlineToMarkdown(testOutline);
    console.log('✅ [PPT-TEST] Outline to Markdown conversion works');
    console.log('📄 [PPT-TEST] Sample Markdown:');
    console.log(markdown.substring(0, 200) + '...');

    // 5. 测试302.ai API连接（轻量级测试）
    console.log('🔗 [PPT-TEST] Testing 302.ai API connection...');

    // 这里只测试API连接，不实际生成PPT（避免消耗配额）
    const response = await fetch('https://api.302.ai/302/ppt/template/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ [PPT-TEST] 302.ai API connection successful');
      return true;
    } else {
      console.log('❌ [PPT-TEST] 302.ai API connection failed:', response.status);
      return false;
    }

  } catch (error) {
    console.error('❌ [PPT-TEST] PPT functionality test failed:', error);
    return false;
  }
}

// 运行测试
testPptFunctionality()
  .then(success => {
    if (success) {
      console.log('🎉 [PPT-TEST] All PPT functionality tests passed!');
      process.exit(0);
    } else {
      console.log('💔 [PPT-TEST] Some PPT functionality tests failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 [PPT-TEST] Test execution failed:', error);
    process.exit(1);
  });