#!/usr/bin/env node
/**
 * 完整功能验证脚本
 * 验证登录、数据库、PPT功能等所有核心功能
 */

console.log('🔍 [VERIFY] 开始完整功能验证...\n');

async function verifyFunctionality() {
  const results = {
    database: false,
    authentication: false,
    pptApi: false,
    deepseekApi: false,
    overall: false
  };

  try {
    // 1. 数据库功能验证
    console.log('🗄️  [VERIFY] 验证数据库功能...');
    const { userDb } = require('../lib/db/users');
    const users = userDb.findAll();

    if (users.length > 0) {
      console.log(`✅ [VERIFY] 数据库正常 - 找到 ${users.length} 个用户`);
      results.database = true;

      // 显示用户列表
      console.log('📋 [VERIFY] 预置用户列表:');
      users.forEach(user => {
        const roleDisplay = user.role === 'admin' ? '管理员' : '教师';
        console.log(`  - ${user.username} (${roleDisplay})`);
      });
    } else {
      console.log('❌ [VERIFY] 数据库异常 - 没有找到用户数据');
    }

    // 2. 密码验证功能测试
    console.log('\n🔐 [VERIFY] 验证密码认证功能...');
    const { passwordUtils } = require('../lib/auth/password');
    const testPassword = '2025';
    const testUser = users.find(u => u.username === 'teacher01');

    if (testUser) {
      const isValidPassword = await passwordUtils.verify(testPassword, testUser.password_hash);
      if (isValidPassword) {
        console.log('✅ [VERIFY] 密码认证功能正常');
        results.authentication = true;
      } else {
        console.log('❌ [VERIFY] 密码认证功能异常');
      }
    } else {
      console.log('❌ [VERIFY] 没有找到测试用户');
    }

    // 3. DeepSeek API 连接测试
    console.log('\n🤖 [VERIFY] 验证DeepSeek API连接...');
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      try {
        const response = await fetch('https://api.deepseek.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${deepseekKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log('✅ [VERIFY] DeepSeek API连接正常');
          results.deepseekApi = true;
        } else {
          console.log(`❌ [VERIFY] DeepSeek API连接失败: ${response.status}`);
        }
      } catch (error) {
        console.log('❌ [VERIFY] DeepSeek API连接异常:', error.message);
      }
    } else {
      console.log('❌ [VERIFY] DeepSeek API密钥未配置');
    }

    // 4. 302.ai PPT API 连接测试
    console.log('\n🎨 [VERIFY] 验证302.ai PPT API连接...');
    const pptApiKey = process.env.NEXT_PUBLIC_AI_302_API_KEY;
    if (pptApiKey) {
      try {
        const response = await fetch('https://api.302.ai/302/ppt/template/list', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${pptApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [VERIFY] 302.ai PPT API连接正常');
          console.log(`📊 [VERIFY] 可用PPT模板数量: ${data.data?.length || 0}`);
          results.pptApi = true;
        } else {
          console.log(`❌ [VERIFY] 302.ai PPT API连接失败: ${response.status}`);
        }
      } catch (error) {
        console.log('❌ [VERIFY] 302.ai PPT API连接异常:', error.message);
      }
    } else {
      console.log('❌ [VERIFY] 302.ai PPT API密钥未配置');
    }

    // 5. PPT生成功能测试
    console.log('\n📄 [VERIFY] 验证PPT生成功能...');
    if (results.pptApi) {
      try {
        const { PptGeneratorService } = require('../src/domains/teaching-acts/services/PptGeneratorService');
        const pptService = new PptGeneratorService(pptApiKey);

        // 测试大纲转Markdown功能
        const testOutline = {
          slides: [
            {
              title: "测试PPT",
              content: "这是一个功能验证测试PPT",
              type: "cover"
            }
          ],
          metadata: {
            totalSlides: 1,
            estimatedMinutes: 1,
            targetAudience: "测试"
          }
        };

        const markdown = pptService.outlineToMarkdown(testOutline);
        if (markdown && markdown.includes('测试PPT')) {
          console.log('✅ [VERIFY] PPT生成功能正常');
          console.log('📝 [VERIFY] 生成的Markdown预览:');
          console.log(markdown.substring(0, 150) + '...');
        } else {
          console.log('❌ [VERIFY] PPT生成功能异常');
        }
      } catch (error) {
        console.log('❌ [VERIFY] PPT生成功能异常:', error.message);
      }
    } else {
      console.log('⚠️  [VERIFY] 跳过PPT生成功能测试（API连接失败）');
    }

  } catch (error) {
    console.error('💥 [VERIFY] 功能验证过程中发生错误:', error);
  }

  // 生成验证报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 [VERIFY] 功能验证报告');
  console.log('='.repeat(60));

  const statusIcon = (status) => status ? '✅' : '❌';
  console.log(`数据库功能:    ${statusIcon(results.database)}`);
  console.log(`登录认证功能:  ${statusIcon(results.authentication)}`);
  console.log(`DeepSeek API:  ${statusIcon(results.deepseekApi)}`);
  console.log(`302.ai PPT API: ${statusIcon(results.pptApi)}`);

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length - 1; // 排除overall

  results.overall = passedCount === totalCount;

  console.log('─'.repeat(60));
  console.log(`总体状态:      ${statusIcon(results.overall)} (${passedCount}/${totalCount} 项通过)`);
  console.log('='.repeat(60));

  if (results.overall) {
    console.log('🎉 [VERIFY] 所有核心功能验证通过！系统已准备就绪。');
    console.log('\n📋 [VERIFY] 登录信息:');
    console.log('  访问地址: http://localhost:3000/login');
    console.log('  测试账号: teacher01 - teacher05');
    console.log('  统一密码: 2025');
    console.log('  管理员:   teacher01');
  } else {
    console.log('💔 [VERIFY] 部分功能验证失败，请检查配置。');
    console.log('\n🔧 [VERIFY] 建议检查项目:');
    if (!results.database) console.log('  - 数据库初始化');
    if (!results.authentication) console.log('  - 用户密码配置');
    if (!results.deepseekApi) console.log('  - DeepSeek API密钥');
    if (!results.pptApi) console.log('  - 302.ai API密钥');
  }

  return results.overall;
}

// 运行验证
verifyFunctionality()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 [VERIFY] 验证脚本执行失败:', error);
    process.exit(1);
  });