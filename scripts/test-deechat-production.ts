/**
 * DeeChat生产环境测试脚本
 * 测试真实环境下的API调用、性能和稳定性
 */

import { EnhancedSocraticServiceV2 } from '../src/domains/socratic-dialogue/services/EnhancedSocraticServiceV2';
import { AIServiceConfigManager } from '../src/domains/socratic-dialogue/config/AIServiceConfig';
import { PerformanceMonitor } from '../src/domains/socratic-dialogue/monitoring/PerformanceMonitor';
import {
  DialogueLevel,
  SocraticMode,
  SocraticDifficulty
} from '../src/domains/socratic-dialogue/services/types/SocraticTypes';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  cost: number;
  tokens: number;
  provider: string;
  error?: string;
  details?: any;
}

class DeeChatProductionTester {
  private service: EnhancedSocraticServiceV2;
  private results: TestResult[] = [];

  constructor() {
    const aiConfig = new AIServiceConfigManager();
    const monitor = new PerformanceMonitor();

    this.service = new EnhancedSocraticServiceV2(
      {
        enableFallback: true,
        fallbackToRuleEngine: true,
        enableCostOptimization: true
      },
      aiConfig,
      monitor
    );
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 开始DeeChat生产环境测试...\n');

    // 1. 基础功能测试
    await this.testBasicFunctionality();

    // 2. 多提供商测试
    await this.testMultiProviderSupport();

    // 3. 性能测试
    await this.testPerformance();

    // 4. 容错测试
    await this.testErrorHandling();

    // 5. 成本控制测试
    await this.testCostControl();

    // 6. 流式响应测试
    await this.testStreamingResponse();

    // 输出测试报告
    this.generateTestReport();
  }

  private async testBasicFunctionality(): Promise<void> {
    console.log('📋 测试基础功能...');

    const testRequest = {
      sessionId: 'test-basic-001',
      level: DialogueLevel.INTERMEDIATE,
      mode: SocraticMode.EXPLORATION,
      difficulty: SocraticDifficulty.MEDIUM,
      caseContext: '张某驾驶机动车超速行驶，撞伤行人李某，造成李某轻伤。交警认定张某负全部责任。',
      currentTopic: '交通事故民事赔偿责任',
      messages: [
        {
          id: 'test-msg-1',
          role: 'user' as const,
          content: '张某应该承担全部民事赔偿责任，因为交警认定他负全责。',
          timestamp: new Date().toISOString(),
          metadata: {}
        }
      ]
    };

    await this.runSingleTest('基础苏格拉底对话生成', testRequest);
  }

  private async testMultiProviderSupport(): Promise<void> {
    console.log('🔄 测试多提供商支持...');

    // 测试不同复杂度的请求，验证负载均衡
    const complexRequests = [
      {
        name: '简单合同纠纷',
        level: DialogueLevel.BEGINNER,
        mode: SocraticMode.EXPLORATION,
        caseContext: '甲乙签订买卖合同，甲方延迟交货',
        currentTopic: '合同违约责任'
      },
      {
        name: '复杂刑事案件',
        level: DialogueLevel.ADVANCED,
        mode: SocraticMode.EVALUATION,
        caseContext: '某公司高管涉嫌内幕交易，获利数百万元，案情复杂',
        currentTopic: '内幕交易罪构成要件分析'
      },
      {
        name: '行政法争议',
        level: DialogueLevel.INTERMEDIATE,
        mode: SocraticMode.SYNTHESIS,
        caseContext: '某市政府征收农民土地，补偿标准争议',
        currentTopic: '行政征收程序与补偿标准'
      }
    ];

    for (const req of complexRequests) {
      const testRequest = {
        sessionId: `test-multi-${Date.now()}`,
        level: req.level,
        mode: req.mode,
        difficulty: SocraticDifficulty.MEDIUM,
        caseContext: req.caseContext,
        currentTopic: req.currentTopic,
        messages: []
      };

      await this.runSingleTest(`多提供商测试: ${req.name}`, testRequest);
      await this.delay(500); // 避免API限流
    }
  }

  private async testPerformance(): Promise<void> {
    console.log('⚡ 测试性能表现...');

    const performanceTests = [];
    const concurrentTests = 3; // 并发测试数量

    // 创建并发测试请求
    for (let i = 0; i < concurrentTests; i++) {
      const testRequest = {
        sessionId: `test-perf-${i}`,
        level: DialogueLevel.INTERMEDIATE,
        mode: SocraticMode.ANALYSIS,
        difficulty: SocraticDifficulty.MEDIUM,
        caseContext: `测试案例${i + 1}：公司法律纠纷`,
        currentTopic: '公司治理问题',
        messages: [
          {
            id: `perf-msg-${i}`,
            role: 'user' as const,
            content: `这是第${i + 1}个并发测试请求的学生回答`,
            timestamp: new Date().toISOString(),
            metadata: {}
          }
        ]
      };

      performanceTests.push(this.runSingleTest(`并发性能测试 ${i + 1}`, testRequest));
    }

    // 等待所有并发测试完成
    console.log(`🚀 执行${concurrentTests}个并发请求...`);
    await Promise.all(performanceTests);
  }

  private async testErrorHandling(): Promise<void> {
    console.log('🛡️ 测试容错机制...');

    // 测试异常请求处理
    const errorTests = [
      {
        name: '空上下文测试',
        request: {
          sessionId: 'test-error-001',
          level: DialogueLevel.INTERMEDIATE,
          mode: SocraticMode.EXPLORATION,
          difficulty: SocraticDifficulty.MEDIUM,
          caseContext: '',
          currentTopic: '',
          messages: []
        }
      },
      {
        name: '超长内容测试',
        request: {
          sessionId: 'test-error-002',
          level: DialogueLevel.ADVANCED,
          mode: SocraticMode.EVALUATION,
          difficulty: SocraticDifficulty.HARD,
          caseContext: 'A'.repeat(5000), // 超长内容
          currentTopic: '复杂法律问题',
          messages: Array(10).fill(0).map((_, i) => ({
            id: `long-msg-${i}`,
            role: 'user' as const,
            content: 'B'.repeat(1000),
            timestamp: new Date().toISOString(),
            metadata: {}
          }))
        }
      }
    ];

    for (const test of errorTests) {
      await this.runSingleTest(`容错测试: ${test.name}`, test.request);
    }
  }

  private async testCostControl(): Promise<void> {
    console.log('💰 测试成本控制...');

    // 获取当前性能指标
    const healthStatus = this.service.getHealthStatus();
    const metrics = healthStatus.performanceMetrics;

    console.log(`当前总成本: $${metrics.totalCost.toFixed(6)}`);
    console.log(`当前总请求: ${metrics.totalRequests}`);
    console.log(`平均每请求成本: $${metrics.avgCostPerRequest.toFixed(6)}`);

    // 测试成本阈值
    const costTestRequest = {
      sessionId: 'test-cost-001',
      level: DialogueLevel.ADVANCED,
      mode: SocraticMode.SYNTHESIS,
      difficulty: SocraticDifficulty.HARD,
      caseContext: '复杂的法律案例，涉及多个法律领域的交叉问题',
      currentTopic: '跨领域法律适用问题',
      messages: []
    };

    await this.runSingleTest('成本控制测试', costTestRequest);
  }

  private async testStreamingResponse(): Promise<void> {
    console.log('🌊 测试流式响应...');

    const streamRequest = {
      sessionId: 'test-stream-001',
      level: DialogueLevel.INTERMEDIATE,
      mode: SocraticMode.EXPLORATION,
      difficulty: SocraticDifficulty.MEDIUM,
      caseContext: '民事纠纷案例',
      currentTopic: '合同法基础问题',
      messages: []
    };

    try {
      console.log('   📡 发起流式请求...');
      const startTime = Date.now();

      const streamResponse = await this.service.generateSocraticQuestionStream(streamRequest);
      const duration = Date.now() - startTime;

      this.results.push({
        testName: '流式响应测试',
        success: true,
        duration,
        cost: 0, // 流式响应的成本计算较复杂
        tokens: 0,
        provider: 'streaming',
        details: {
          hasStream: !!streamResponse.stream,
          metadata: streamResponse.metadata
        }
      });

      console.log('   ✅ 流式响应测试成功');
      console.log(`   ⏱️ 建立连接耗时: ${duration}ms`);

    } catch (error) {
      this.results.push({
        testName: '流式响应测试',
        success: false,
        duration: 0,
        cost: 0,
        tokens: 0,
        provider: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      });

      console.log('   ❌ 流式响应测试失败');
      console.log(`   错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async runSingleTest(testName: string, request: any): Promise<void> {
    console.log(`   🧪 执行: ${testName}`);

    try {
      const startTime = Date.now();
      const response = await this.service.generateSocraticQuestion(request);
      const duration = Date.now() - startTime;

      if (response.success && response.data) {
        this.results.push({
          testName,
          success: true,
          duration,
          cost: response.data.metadata?.cost || 0,
          tokens: response.data.metadata?.tokensUsed || 0,
          provider: response.data.metadata?.provider || 'unknown',
          details: {
            questionLength: response.data.question.length,
            fallback: response.data.metadata?.fallback || false
          }
        });

        console.log(`   ✅ 成功 - ${duration}ms, $${(response.data.metadata?.cost || 0).toFixed(6)}, ${response.data.metadata?.tokensUsed || 0} tokens`);
      } else {
        this.results.push({
          testName,
          success: false,
          duration,
          cost: 0,
          tokens: 0,
          provider: 'unknown',
          error: response.error?.message || '未知错误'
        });

        console.log(`   ❌ 失败 - ${response.error?.message || '未知错误'}`);
      }

    } catch (error) {
      const duration = Date.now();
      this.results.push({
        testName,
        success: false,
        duration: 0,
        cost: 0,
        tokens: 0,
        provider: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      });

      console.log(`   ❌ 异常 - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateTestReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DeeChat生产环境测试报告');
    console.log('='.repeat(60));

    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);

    console.log(`\n📈 总体统计:`);
    console.log(`   总测试数: ${this.results.length}`);
    console.log(`   成功测试: ${successfulTests.length}`);
    console.log(`   失败测试: ${failedTests.length}`);
    console.log(`   成功率: ${((successfulTests.length / this.results.length) * 100).toFixed(2)}%`);

    if (successfulTests.length > 0) {
      const totalCost = successfulTests.reduce((sum, r) => sum + r.cost, 0);
      const totalTokens = successfulTests.reduce((sum, r) => sum + r.tokens, 0);
      const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;

      console.log(`\n💰 成本统计:`);
      console.log(`   总成本: $${totalCost.toFixed(6)}`);
      console.log(`   平均成本: $${(totalCost / successfulTests.length).toFixed(6)}`);
      console.log(`   总Token: ${totalTokens}`);
      console.log(`   平均Token: ${Math.round(totalTokens / successfulTests.length)}`);

      console.log(`\n⚡ 性能统计:`);
      console.log(`   平均响应时间: ${avgDuration.toFixed(0)}ms`);
      console.log(`   最快响应: ${Math.min(...successfulTests.map(r => r.duration))}ms`);
      console.log(`   最慢响应: ${Math.max(...successfulTests.map(r => r.duration))}ms`);

      // 提供商统计
      const providerStats = successfulTests.reduce((acc, r) => {
        acc[r.provider] = (acc[r.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`\n🔧 提供商使用:`);
      Object.entries(providerStats).forEach(([provider, count]) => {
        console.log(`   ${provider}: ${count}次 (${((count / successfulTests.length) * 100).toFixed(1)}%)`);
      });
    }

    if (failedTests.length > 0) {
      console.log(`\n❌ 失败测试详情:`);
      failedTests.forEach(test => {
        console.log(`   - ${test.testName}: ${test.error}`);
      });
    }

    // 获取服务健康状态
    const healthStatus = this.service.getHealthStatus();
    const alerts = healthStatus.alerts || [];

    if (alerts.length > 0) {
      console.log(`\n🚨 活跃告警:`);
      alerts.forEach(alert => {
        console.log(`   - [${alert.severity}] ${alert.title}`);
      });
    }

    console.log(`\n📋 详细测试结果:`);
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${result.testName}`);
      if (result.success) {
        console.log(`      ⏱️ ${result.duration}ms | 💰 $${result.cost.toFixed(6)} | 🧮 ${result.tokens} tokens | 🔧 ${result.provider}`);
      } else {
        console.log(`      ❌ ${result.error}`);
      }
    });

    // 生成建议
    console.log(`\n💡 优化建议:`);

    if (failedTests.length > 0) {
      console.log(`   🔧 有${failedTests.length}个测试失败，建议检查API配置和网络连接`);
    }

    const avgResponseTime = successfulTests.length > 0 ?
      successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length : 0;

    if (avgResponseTime > 10000) {
      console.log(`   ⚡ 平均响应时间较长(${avgResponseTime.toFixed(0)}ms)，建议优化提示词或调整Token限制`);
    }

    const totalCost = successfulTests.reduce((sum, r) => sum + r.cost, 0);
    if (totalCost > 0.01) {
      console.log(`   💰 测试总成本较高($${totalCost.toFixed(6)})，建议优化成本控制策略`);
    }

    console.log(`\n✅ 测试完成！DeeChat集成系统运行状况: ${successfulTests.length === this.results.length ? '良好' : '需要关注'}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 执行测试
async function main() {
  const tester = new DeeChatProductionTester();

  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DeeChatProductionTester };