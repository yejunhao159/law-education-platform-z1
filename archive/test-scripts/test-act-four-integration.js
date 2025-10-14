/**
 * 第四幕集成测试脚本
 * 用于诊断学习报告生成是否正常工作
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 🔧 修复：手动加载 .env.local 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      // 跳过注释和空行
      if (line.trim().startsWith('#') || !line.trim()) return;

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        // 只有在环境变量未设置时才设置
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });

    console.log('✅ 成功加载 .env.local 文件');
  } else {
    console.warn('⚠️ 未找到 .env.local 文件');
  }
}

// 在脚本开始时加载环境变量
loadEnvFile();

// ========== 配置 ==========
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiEndpoint: '/api/teaching-acts/summary'
};

// ========== 测试函数 ==========

/**
 * 测试API是否可以调用
 */
async function testAPICall() {
  return new Promise((resolve, reject) => {
    console.log('📤 [测试] 调用API:', TEST_CONFIG.apiEndpoint);
    console.log('  URL:', `${TEST_CONFIG.baseUrl}${TEST_CONFIG.apiEndpoint}`);

    const startTime = Date.now();

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: TEST_CONFIG.apiEndpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';

      console.log('📥 [响应] Status Code:', res.statusCode);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        console.log('  Duration:', duration + 'ms');

        try {
          const result = JSON.parse(data);

          if (result.success) {
            console.log('\n✅ [成功] 学习报告生成成功');
            console.log('  报告标题:', result.data?.caseOverview?.title || 'N/A');
            console.log('  一句话总结:', result.data?.caseOverview?.oneLineSummary || 'N/A');
            console.log('  学习时长:', result.data?.metadata?.studyDuration || 'N/A', '分钟');

            // 检查是否是占位符
            const hasPlaceholder = result.data?.caseOverview?.oneLineSummary?.includes('生成中');
            if (hasPlaceholder) {
              console.warn('\n⚠️ [警告] 报告使用了占位符，可能前三幕数据为空！');
            } else {
              console.log('\n✅ [验证] 报告包含真实AI生成内容');
            }

            // 显示更多细节
            console.log('\n📋 [详细内容]');
            console.log('  事实认定要点:', result.data?.learningPoints?.factualInsights?.length || 0, '条');
            console.log('  法律原理要点:', result.data?.learningPoints?.legalPrinciples?.length || 0, '条');
            console.log('  证据处理要点:', result.data?.learningPoints?.evidenceHandling?.length || 0, '条');
            console.log('  关键问题:', result.data?.socraticHighlights?.keyQuestions?.length || 0, '个');

            resolve(result);
          } else {
            console.error('\n❌ [失败]', result.error || '未知错误');
            console.error('  完整响应:', JSON.stringify(result, null, 2));
            reject(new Error(result.error || '报告生成失败'));
          }
        } catch (error) {
          console.error('\n❌ [解析失败]');
          console.error('  Raw Response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ [网络错误]', error.message);
      reject(error);
    });

    req.end();
  });
}

/**
 * 检查环境变量
 */
function checkEnvironment() {
  console.log('🔍 [环境检查]');

  const requiredEnvVars = [
    'DEEPSEEK_API_KEY',
    'NEXT_PUBLIC_DEEPSEEK_API_KEY'
  ];

  let allPresent = true;

  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`  ✅ ${envVar}: ${value.substring(0, 8)}****`);
    } else {
      console.log(`  ❌ ${envVar}: 未设置`);
      allPresent = false;
    }
  });

  if (!allPresent) {
    console.warn('\n⚠️ [警告] 缺少必需的环境变量');
    console.log('  请确保在 .env.local 中配置了 DEEPSEEK_API_KEY');
  }

  return allPresent;
}

/**
 * 检查开发服务器是否运行
 */
async function checkServerRunning() {
  return new Promise((resolve) => {
    console.log('🔍 [服务器检查] 检查 localhost:3000 是否运行...');

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health/socratic',  // 使用健康检查端点
      method: 'GET',
      timeout: 5000
    }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        console.log('  ✅ 服务器正在运行');
        resolve(true);
      } else {
        console.log('  ⚠️ 服务器响应异常:', res.statusCode);
        resolve(false);
      }
    });

    req.on('error', () => {
      console.log('  ❌ 服务器未运行');
      console.log('  请先运行: npm run dev');
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('  ⚠️ 服务器响应超时');
      resolve(false);
    });

    req.end();
  });
}

/**
 * 主测试流程
 */
async function main() {
  console.log('🚀 第四幕集成测试开始\n');
  console.log('=' .repeat(60));

  // 1. 检查环境变量
  const envOk = checkEnvironment();
  console.log('=' .repeat(60) + '\n');

  if (!envOk) {
    console.error('❌ 环境变量检查失败，测试终止');
    process.exit(1);
  }

  // 2. 检查服务器
  const serverRunning = await checkServerRunning();
  console.log('=' .repeat(60) + '\n');

  if (!serverRunning) {
    console.error('❌ 服务器未运行，测试终止');
    console.log('\n💡 解决方法:');
    console.log('  1. 在另一个终端运行: npm run dev');
    console.log('  2. 等待服务器启动完成');
    console.log('  3. 重新运行此测试脚本');
    process.exit(1);
  }

  // 3. 测试API调用
  try {
    await testAPICall();

    console.log('\n' + '=' .repeat(60));
    console.log('✅ 第四幕集成测试完成');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n' + '=' .repeat(60));
    console.error('❌ 第四幕集成测试失败');
    console.error('=' .repeat(60));

    console.log('\n💡 常见问题排查:');
    console.log('  1. 检查前三幕是否有数据（打开浏览器Console查看）');
    console.log('  2. 检查DeepSeek API Key是否正确');
    console.log('  3. 检查网络连接');
    console.log('  4. 查看服务器日志（npm run dev的终端）');
    console.log('  5. 打开浏览器开发者工具，查看Network和Console');

    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { testAPICall, checkEnvironment, checkServerRunning };
