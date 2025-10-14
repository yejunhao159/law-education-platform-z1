/**
 * 302.ai PPT生成API验证脚本
 * 用于测试API的可行性和生成质量
 */

const https = require('https');

// ========== 配置 ==========
const CONFIG = {
  baseUrl: 'https://api.302.ai',
  apiKey: process.env.AI_302_API_KEY || '',
  endpoint: '/302/ppt/directgeneratepptx'
};

// ========== 测试数据 ==========
const TEST_CONTENT = `
# 法学AI教学系统 - 案例分析示例

## 案例概览
案件名称: 张三诉李四民间借贷纠纷案
案号: (2023)京0105民初12345号
审理法院: 北京市朝阳区人民法院

## 基本事实
- 2022年1月，张三向李四借款人民币50万元
- 约定年利率12%，借款期限1年
- 到期后李四未归还本息

## AI分析要点
1. 事实认定: 借贷关系成立，证据充分
2. 法律适用: 适用《民法典》第667条
3. 争议焦点: 利息计算方式
4. 判决结果: 支持原告诉讼请求

## 教学价值
- 典型的民间借贷案例
- 证据链完整
- 适合苏格拉底式讨论
`;

// ========== API调用函数 ==========
async function generatePPT(content, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      title = '法学AI教学系统案例分析',
      language = 'zh',
      model = 'gpt-4o-mini'
    } = options;

    const postData = JSON.stringify({
      content: content,
      title: title,
      language: language,
      model: model
    });

    const requestOptions = {
      hostname: 'api.302.ai',
      path: CONFIG.endpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('📤 [API请求]');
    console.log('  URL:', `${CONFIG.baseUrl}${CONFIG.endpoint}`);
    console.log('  Method:', 'POST');
    console.log('  Content Length:', Buffer.byteLength(postData), 'bytes');
    console.log('  Title:', title);
    console.log('  Language:', language);
    console.log('  Model:', model);

    const startTime = Date.now();

    const req = https.request(requestOptions, (res) => {
      let data = '';

      console.log('📥 [API响应]');
      console.log('  Status Code:', res.statusCode);
      console.log('  Status Message:', res.statusMessage);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log('  Duration:', duration + 'ms');

        try {
          const result = JSON.parse(data);

          if (res.statusCode === 200 && result.success) {
            console.log('\n✅ [生成成功]');
            console.log('  PPT URL:', result.data?.url || result.url);
            console.log('  File Size:', result.data?.size || 'N/A');
            console.log('  Slides:', result.data?.slides || 'N/A');
            resolve(result);
          } else {
            console.error('\n❌ [生成失败]');
            console.error('  Error:', result.error || result.message || '未知错误');
            reject(new Error(result.error || result.message || '生成PPT失败'));
          }
        } catch (error) {
          console.error('\n❌ [解析响应失败]');
          console.error('  Raw Response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ [网络请求失败]');
      console.error('  Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// ========== 质量评估 ==========
function evaluateQuality(result) {
  console.log('\n📊 [质量评估]');

  const criteria = {
    '生成速度': '待人工确认 (目标: < 40秒)',
    '设计质量': '待人工确认 (目标: ≥ 7/10)',
    '内容准确度': '待人工确认 (目标: ≥ 9/10)',
    '成本估算': '待人工确认 (目标: < ¥1/次)',
    'URL有效性': result.data?.url ? '✅ 提供了下载链接' : '❌ 未提供链接'
  };

  Object.entries(criteria).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n📝 [后续行动]');
  console.log('  1. 访问PPT URL下载文件');
  console.log('  2. 检查PPT内容和设计质量');
  console.log('  3. 记录生成成本');
  console.log('  4. 根据评估结果决定是否继续使用302.ai');
}

// ========== 主函数 ==========
async function main() {
  console.log('🚀 302.ai PPT生成API验证开始\n');
  console.log('=' .repeat(60));

  // 检查API Key
  if (!CONFIG.apiKey) {
    console.error('\n❌ 错误: 未设置 AI_302_API_KEY 环境变量');
    console.log('\n💡 使用方法:');
    console.log('  export AI_302_API_KEY=your-api-key-here');
    console.log('  node test-302ai-ppt.js');
    process.exit(1);
  }

  console.log('✅ API Key已配置 (前8位:', CONFIG.apiKey.substring(0, 8) + '****)');
  console.log('=' .repeat(60) + '\n');

  try {
    // 调用API生成PPT
    const result = await generatePPT(TEST_CONTENT, {
      title: '法学AI教学系统 - 民间借贷案例分析',
      language: 'zh',
      model: 'gpt-4o-mini'
    });

    // 评估质量
    evaluateQuality(result);

    console.log('\n' + '=' .repeat(60));
    console.log('✅ 验证脚本执行完成');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.log('\n💡 常见问题排查:');
    console.log('  1. 检查API Key是否正确');
    console.log('  2. 检查网络连接');
    console.log('  3. 检查302.ai服务状态');
    console.log('  4. 查看详细错误日志');
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { generatePPT, evaluateQuality };
