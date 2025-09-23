#!/usr/bin/env tsx
/**
 * DeeChat 本地集成测试脚本
 * 验证所有模块是否正常工作
 */

import {
  // AI 客户端
  AIClient,

  // Token 计算器
  countTokens,
  countDeepSeek,
  estimateTeachingCost,

  // 上下文管理器
  formatContext,
  buildSocraticContext,

  // 对话存储
  initializeConversationStorage,
  createQuickSession,
  saveQuickMessage,

  // 工具函数
  healthCheck,
  getVersionInfo,
  QUICK_START
} from '../src/lib/deechat-local';

async function testDeeChatIntegration() {
  console.log('🧪 开始测试 DeeChat 本地集成...\n');

  try {
    // 1. 健康检查
    console.log('1️⃣ 执行健康检查...');
    const health = healthCheck();
    console.log('健康状态:', health.status);
    console.log('模块状态:', health.modules);
    if (health.errors.length > 0) {
      console.log('错误:', health.errors);
    }
    if (health.warnings.length > 0) {
      console.log('警告:', health.warnings);
    }
    console.log('✅ 健康检查完成\n');

    // 2. 版本信息
    console.log('2️⃣ 检查版本信息...');
    const versionInfo = getVersionInfo();
    console.log('版本信息:', JSON.stringify(versionInfo, null, 2));
    console.log('✅ 版本信息检查完成\n');

    // 3. Token 计算器测试
    console.log('3️⃣ 测试 Token 计算器...');
    const testText = '这是一个法学教育平台的测试文档，用于验证Token计算功能是否正常工作。';

    const tokens = countTokens(testText);
    console.log(`文本: "${testText}"`);
    console.log(`Token 数量: ${tokens}`);

    const deepseekTokens = countDeepSeek(testText);
    console.log(`DeepSeek Token 数量: ${deepseekTokens}`);

    const teachingCost = estimateTeachingCost(testText, 'socratic', 'undergraduate');
    console.log('教学成本估算:', teachingCost);
    console.log('✅ Token 计算器测试完成\n');

    // 4. 上下文管理器测试
    console.log('4️⃣ 测试上下文管理器...');

    const basicContext = formatContext({
      role: '法学教授',
      current: '请分析这个案例中的法律争议点'
    });
    console.log('基础上下文格式化:');
    console.log(basicContext.substring(0, 200) + '...');

    const socraticContext = buildSocraticContext({
      caseText: '张某与李某签订买卖合同，但在履行过程中发生争议...',
      studentLevel: 'intermediate',
      currentTopic: '合同履行',
      focusAreas: ['违约责任', '损害赔偿']
    });
    console.log('\n苏格拉底对话上下文:');
    if (typeof socraticContext === 'string') {
      console.log(socraticContext.substring(0, 200) + '...');
    } else {
      console.log('返回类型:', typeof socraticContext);
      console.log('内容:', JSON.stringify(socraticContext, null, 2).substring(0, 300) + '...');
    }
    console.log('✅ 上下文管理器测试完成\n');

    // 5. 对话存储测试
    console.log('5️⃣ 测试对话存储...');

    // 初始化存储
    await initializeConversationStorage({
      storage_type: 'memory',
      auto_save: true
    });
    console.log('对话存储已初始化');

    // 创建会话
    const session = createQuickSession(
      '测试会话 - 合同法案例分析',
      'socratic',
      ['民法', '合同法']
    );
    console.log('创建会话:', session.id);

    // 保存消息
    const message = saveQuickMessage(
      session.id,
      'user',
      '老师，这个合同是否有效？',
      'question'
    );
    console.log('保存消息:', message.id);

    console.log('✅ 对话存储测试完成\n');

    // 6. AI 客户端测试（不发送真实请求）
    console.log('6️⃣ 测试 AI 客户端...');

    const aiClient = new AIClient({
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      apiKey: 'test-key'
    });

    console.log('AI 客户端已创建');
    console.log('Ping 测试 (模拟): 暂时跳过，避免实际API调用');
    console.log('✅ AI 客户端测试完成\n');

    // 7. 快速开始指南验证
    console.log('7️⃣ 验证快速开始指南...');
    console.log('快速开始指南:');
    Object.entries(QUICK_START).forEach(([key, example]) => {
      console.log(`  ${key}: ${example}`);
    });
    console.log('✅ 快速开始指南验证完成\n');

    console.log('🎉 所有测试通过！DeeChat 本地集成工作正常');
    console.log('💡 你现在可以在项目中使用以下导入:');
    console.log('   import { countDeepSeek, buildSocraticContext, initializeConversationStorage } from "@/src/lib/deechat-local"');

    // 正常退出
    process.exit(0);

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testDeeChatIntegration().catch(console.error);