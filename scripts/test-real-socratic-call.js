/**
 * 真实AI调用测试 - 验证注入效果
 * 注意：需要开发服务器运行 (npm run dev)
 */

async function testRealSocraticCall() {
  console.log('🧪 测试真实苏格拉底对话AI调用\n');

  const API_URL = 'http://localhost:3000/api/socratic';

  // 测试案例
  const testCase = {
    currentTopic: "合同效力分析",
    caseContext: "甲方支付50万元购买设备，但收到的设备实际价值仅5万元。甲方主张合同显失公平要求撤销。",
    level: "intermediate",
    mode: "analysis",
    messages: [
      { role: "user", content: "我认为这个合同应该撤销，因为价格差距太大了。" }
    ]
  };

  console.log('📝 测试请求:', JSON.stringify(testCase, null, 2));
  console.log('');

  try {
    console.log('🚀 发送API请求...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ AI响应成功\n');
      console.log('=' .repeat(80));
      console.log('🎯 AI生成的问题:');
      console.log('='.repeat(80));
      console.log(result.data.question);
      console.log('='.repeat(80));
      console.log('');

      // 分析响应风格
      console.log('📊 风格分析:');
      const question = result.data.question;

      const styleChecks = {
        '锋利追问': /你为什么|为何|矛盾|问题/.test(question),
        '幽默调侃': /菜市场|😄|😊|有意思/.test(question),
        '案件锚定': /甲方|乙方|50万|5万|这个案件/.test(question),
        '法条引用': /第\d+条|民法典|合同法/.test(question),
        '反诘法': /难道|如果.*会|按你的说法/.test(question),
        '归谬法': /所有.*都|岂不是/.test(question)
      };

      Object.entries(styleChecks).forEach(([key, value]) => {
        console.log(`   ${value ? '✅' : '⚪'} ${key}: ${value ? '检测到' : '未检测到'}`);
      });

      console.log('');
      console.log('📈 元数据:');
      console.log(`   Model: ${result.data.metadata.model}`);
      console.log(`   Tokens: ${result.data.metadata.tokensUsed.total || result.data.metadata.tokensUsed || 'N/A'}`);
      console.log(`   Cost: $${result.data.metadata.cost?.total || 'N/A'}`);

      // 评估
      console.log('');
      console.log('🎯 评估结果:');
      const passedChecks = Object.values(styleChecks).filter(Boolean).length;
      const totalChecks = Object.keys(styleChecks).length;

      if (passedChecks >= 3) {
        console.log(`   ✅ 注入效果良好 (${passedChecks}/${totalChecks})`);
      } else if (passedChecks >= 1) {
        console.log(`   ⚠️  注入效果一般 (${passedChecks}/${totalChecks})`);
        console.log(`   建议：检查AI是否真的遵循System Prompt`);
      } else {
        console.log(`   ❌ 注入效果差 (${passedChecks}/${totalChecks})`);
        console.log(`   问题：AI可能忽略了System Prompt`);
      }

    } else {
      console.error('❌ API返回错误:');
      console.error(result.error);
    }

  } catch (error) {
    console.error('💥 测试失败:', error.message);
    console.error('');
    console.error('💡 请确保:');
    console.error('   1. 开发服务器正在运行: npm run dev');
    console.error('   2. 环境变量已配置: DEEPSEEK_API_KEY');
    console.error('   3. 服务器监听在 http://localhost:3000');
  }
}

// 检查Node.js版本
const nodeVersion = process.version.match(/^v(\d+\.\d+)/)[1];
if (parseFloat(nodeVersion) < 18) {
  console.error('❌ 错误：需要Node.js 18+（支持原生fetch）');
  console.error(`   当前版本: ${process.version}`);
  process.exit(1);
}

// 运行测试
testRealSocraticCall();
