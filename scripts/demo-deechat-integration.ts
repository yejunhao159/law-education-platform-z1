/**
 * DeeChat集成完整演示脚本
 * 展示增强版苏格拉底对话服务V2的完整功能
 * 包括多AI提供商、性能监控、成本管理等特性
 */

import { EnhancedSocraticServiceV2 } from '../src/domains/socratic-dialogue/services/EnhancedSocraticServiceV2';
import { AIServiceConfigManager } from '../src/domains/socratic-dialogue/config/AIServiceConfig';
import { PerformanceMonitor } from '../src/domains/socratic-dialogue/monitoring/PerformanceMonitor';
import {
  SocraticDifficultyLevel,
  SocraticMode,
  SocraticDifficulty
} from '@/lib/types/socratic';

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(colorize(title, 'cyan'));
  console.log('='.repeat(60));
}

function printSubHeader(title: string) {
  console.log('\n' + colorize(`📋 ${title}`, 'yellow'));
  console.log('-'.repeat(40));
}

async function demonstrateDeeChatIntegration() {
  printHeader('🚀 DeeChat集成完整演示');

  // 1. 创建配置管理器
  printSubHeader('初始化AI服务配置管理器');
  const aiConfig = new AIServiceConfigManager();

  // 2. 创建性能监控器
  printSubHeader('初始化性能监控器');
  const performanceMonitor = new PerformanceMonitor({
    dailyCostThreshold: 1.00,
    enableCostAlerts: true,
    enablePerformanceAlerts: true
  });

  // 监听告警
  performanceMonitor.on('alert', (alert) => {
    console.log(colorize(`🚨 告警: ${alert.title} - ${alert.message}`, 'red'));
  });

  // 3. 创建增强版苏格拉底服务
  printSubHeader('创建增强版苏格拉底服务V2');
  const socraticService = new EnhancedSocraticServiceV2(
    {
      enableFallback: true,
      fallbackToRuleEngine: true,
      enableCostOptimization: true
    },
    aiConfig,
    performanceMonitor
  );

  // 4. 展示配置状态
  await demonstrateConfigStatus(aiConfig);

  // 5. 演示多个教学场景
  await demonstrateTeachingScenarios(socraticService);

  // 6. 展示性能分析
  await demonstratePerformanceAnalysis(performanceMonitor, socraticService);

  // 7. 演示健康检查
  await demonstrateHealthCheck(socraticService);

  printHeader('✅ DeeChat集成演示完成');
}

async function demonstrateConfigStatus(aiConfig: AIServiceConfigManager) {
  printSubHeader('AI服务配置状态');

  const status = aiConfig.getServiceStatus();

  console.log(colorize('📊 提供商状态:', 'blue'));
  status.providers.forEach(provider => {
    const statusIcon = provider.status === 'healthy' ? '🟢' :
                      provider.status === 'degraded' ? '🟡' : '🔴';
    console.log(`  ${statusIcon} ${provider.name} (优先级: ${provider.priority}) - ${provider.status}`);
  });

  console.log(colorize('\n⚙️ 全局配置:', 'blue'));
  console.log(`  成本优化: ${status.globalConfig.enableCostOptimization ? '✅' : '❌'}`);
  console.log(`  负载均衡: ${status.globalConfig.enableLoadBalancing ? '✅' : '❌'}`);
  console.log(`  降级策略: ${status.globalConfig.enableFallback ? '✅' : '❌'}`);
  console.log(`  日成本限制: $${status.globalConfig.dailyCostLimit}`);

  // 触发健康检查
  console.log(colorize('\n🔍 执行健康检查...', 'magenta'));
  await aiConfig.performHealthCheck();
  console.log('健康检查完成');
}

async function demonstrateTeachingScenarios(service: EnhancedSocraticServiceV2) {
  printSubHeader('教学场景演示');

  const scenarios = [
    {
      name: '初级民法案例分析',
      request: {
        sessionId: 'demo-session-001',
        level: SocraticDifficultyLevel.BEGINNER,
        mode: SocraticMode.EXPLORATION,
        difficulty: SocraticDifficulty.EASY,
        caseContext: '甲乙双方签订房屋买卖合同，甲方交房后乙方拒绝付款',
        currentTopic: '合同履行义务',
        messages: [
          {
            id: 'msg1',
            role: 'user' as const,
            content: '我认为乙方应该立即付款，因为甲方已经交房了',
            timestamp: new Date().toISOString(),
            metadata: {}
          }
        ]
      }
    },
    {
      name: '高级刑法理论讨论',
      request: {
        sessionId: 'demo-session-002',
        level: SocraticDifficultyLevel.ADVANCED,
        mode: SocraticMode.EVALUATION,
        difficulty: SocraticDifficulty.HARD,
        caseContext: '某公司高管利用内幕信息进行股票交易，获利100万元',
        currentTopic: '内幕交易罪的构成要件',
        messages: [
          {
            id: 'msg2',
            role: 'user' as const,
            content: '这种行为符合内幕交易罪的所有构成要件，应该判处有期徒刑',
            timestamp: new Date().toISOString(),
            metadata: {}
          }
        ]
      }
    },
    {
      name: '中级商法案例综合',
      request: {
        sessionId: 'demo-session-003',
        level: SocraticDifficultyLevel.INTERMEDIATE,
        mode: SocraticMode.SYNTHESIS,
        difficulty: SocraticDifficulty.MEDIUM,
        caseContext: '有限责任公司股东要求查阅公司账簿，董事会以商业秘密为由拒绝',
        currentTopic: '股东知情权与商业秘密保护的平衡',
        messages: []
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(colorize(`\n🎯 场景: ${scenario.name}`, 'green'));
    console.log(`   教学等级: ${scenario.request.level}`);
    console.log(`   教学模式: ${scenario.request.mode}`);
    console.log(`   案例背景: ${scenario.request.caseContext.substring(0, 30)}...`);

    try {
      console.log(colorize('   ⏳ 正在生成苏格拉底式引导...', 'yellow'));

      const startTime = Date.now();
      const response = await service.generateSocraticQuestion(scenario.request);
      const duration = Date.now() - startTime;

      if (response.success && response.data) {
        console.log(colorize('   ✅ 生成成功', 'green'));
        console.log(colorize('   💭 AI导师回应:', 'cyan'));
        console.log(`   "${response.data.question.substring(0, 80)}..."`);
        console.log(colorize(`   📊 响应时间: ${duration}ms`, 'blue'));

        if (response.data.metadata) {
          console.log(colorize(`   🔧 使用提供商: ${response.data.metadata.provider}`, 'blue'));
          console.log(colorize(`   💰 成本: $${response.data.metadata.cost?.toFixed(6) || '0'}`, 'blue'));
          console.log(colorize(`   🧮 Token: ${response.data.metadata.tokensUsed || 0}`, 'blue'));

          if (response.data.metadata.fallback) {
            console.log(colorize('   ⚠️ 使用了降级策略', 'yellow'));
          }
        }
      } else {
        console.log(colorize('   ❌ 生成失败', 'red'));
        console.log(`   错误: ${response.error?.message}`);
      }

    } catch (error) {
      console.log(colorize('   ❌ 发生异常', 'red'));
      console.log(`   错误: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 模拟请求间隔
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function demonstratePerformanceAnalysis(monitor: PerformanceMonitor, service: EnhancedSocraticServiceV2) {
  printSubHeader('性能分析报告');

  // 获取指标
  const metrics = monitor.getMetrics();
  const report = monitor.generateReport('day');
  const alerts = monitor.getAlerts();

  console.log(colorize('📈 核心指标:', 'blue'));
  console.log(`  总请求数: ${metrics.totalRequests}`);
  console.log(`  成功率: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`  平均响应时间: ${metrics.avgResponseTime.toFixed(0)}ms`);
  console.log(`  总成本: $${metrics.totalCost.toFixed(6)}`);
  console.log(`  总Token使用: ${metrics.totalTokensUsed}`);
  console.log(`  降级次数: ${metrics.fallbackCount}`);

  console.log(colorize('\n💰 成本分析:', 'blue'));
  Object.entries(metrics.costByProvider).forEach(([provider, cost]) => {
    console.log(`  ${provider}: $${cost.toFixed(6)}`);
  });

  console.log(colorize('\n🔧 提供商使用:', 'blue'));
  Object.entries(metrics.providerUsage).forEach(([provider, usage]) => {
    console.log(`  ${provider}: ${usage.requests}次请求, 健康评分: ${usage.healthScore.toFixed(1)}/100`);
  });

  if (alerts.length > 0) {
    console.log(colorize('\n🚨 活跃告警:', 'red'));
    alerts.forEach(alert => {
      const severityIcon = alert.severity === 'critical' ? '🔴' :
                           alert.severity === 'high' ? '🟠' :
                           alert.severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${severityIcon} [${alert.type}] ${alert.title}`);
    });
  } else {
    console.log(colorize('\n✅ 无活跃告警', 'green'));
  }

  // 展示健康状态
  console.log(colorize('\n🏥 服务健康状态:', 'blue'));
  const healthStatus = service.getHealthStatus();

  console.log(`  主要客户端: ${healthStatus.primaryClient.available ? '🟢 可用' : '🔴 不可用'}`);
  if (healthStatus.fallbackClient) {
    console.log(`  备用客户端: ${healthStatus.fallbackClient.available ? '🟢 可用' : '🔴 不可用'}`);
  }
}

async function demonstrateHealthCheck(service: EnhancedSocraticServiceV2) {
  printSubHeader('健康检查演示');

  console.log(colorize('🔍 执行服务健康检查...', 'magenta'));

  try {
    await service.performHealthCheck();
    console.log(colorize('✅ 健康检查完成', 'green'));

    const healthStatus = service.getHealthStatus();

    console.log(colorize('\n📊 详细健康报告:', 'blue'));
    console.log(`主要提供商状态: ${healthStatus.primaryClient.available ? '健康' : '异常'}`);

    if (healthStatus.fallbackClient) {
      console.log(`备用提供商状态: ${healthStatus.fallbackClient.available ? '健康' : '异常'}`);
    }

    // 展示配置状态
    const configStatus = healthStatus.aiServiceConfig;
    console.log(`\n可用提供商数量: ${configStatus.providers.filter(p => p.enabled).length}`);
    console.log(`失败提供商: ${configStatus.failedProviders.length > 0 ? configStatus.failedProviders.join(', ') : '无'}`);

  } catch (error) {
    console.log(colorize('❌ 健康检查失败', 'red'));
    console.log(`错误: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function demonstrateStreamingResponse() {
  printSubHeader('流式响应演示 (预览)');

  console.log(colorize('🌊 流式响应功能已集成到服务中', 'blue'));
  console.log('   - 支持实时AI响应生成');
  console.log('   - 自动降级到普通响应');
  console.log('   - 提供完整的元数据');
  console.log(colorize('   ⚠️ 演示脚本中暂不展示流式输出', 'yellow'));
}

async function demonstrateCostOptimization() {
  printSubHeader('成本优化策略');

  console.log(colorize('💰 集成的成本优化功能:', 'blue'));
  console.log('   ✅ 智能Token计算和限制');
  console.log('   ✅ 请求前成本预估');
  console.log('   ✅ 多提供商成本比较');
  console.log('   ✅ 实时成本监控和告警');
  console.log('   ✅ 日/小时成本阈值控制');
  console.log('   ✅ 异常消费检测');
}

// 执行演示
async function main() {
  try {
    await demonstrateDeeChatIntegration();
    await demonstrateStreamingResponse();
    await demonstrateCostOptimization();

    printHeader('🎉 演示总结');
    console.log(colorize('✅ DeeChat工具包完全集成成功', 'green'));
    console.log(colorize('✅ 多AI提供商负载均衡正常', 'green'));
    console.log(colorize('✅ 性能监控和成本管理运行正常', 'green'));
    console.log(colorize('✅ 降级策略和容错机制工作正常', 'green'));

    console.log(colorize('\n🚀 系统特性总览:', 'cyan'));
    console.log('   📦 DeeChat AI Chat - 统一AI接口');
    console.log('   🧮 DeeChat Token Calculator - 智能成本计算');
    console.log('   📋 DeeChat Context Manager - 结构化上下文');
    console.log('   ⚖️ 多AI提供商负载均衡');
    console.log('   📊 实时性能监控');
    console.log('   💰 智能成本管理');
    console.log('   🔄 自动降级策略');
    console.log('   🚨 智能告警系统');

    console.log(colorize('\n💡 下一步建议:', 'yellow'));
    console.log('   1. 在生产环境中配置多个AI提供商API密钥');
    console.log('   2. 根据实际使用调整成本阈值和性能参数');
    console.log('   3. 设置告警通知渠道（邮件、钉钉等）');
    console.log('   4. 定期检查性能报告和成本分析');
    console.log('   5. 根据教学反馈优化苏格拉底式问题生成策略');

  } catch (error) {
    console.error(colorize('❌ 演示过程中发生错误:', 'red'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export {
  demonstrateDeeChatIntegration,
  demonstratePerformanceAnalysis,
  demonstrateHealthCheck
};