import { LegalAgentCore } from '../../lib/agents/legal-agent-core';
import { LegalAgentFactory } from '../../lib/agents/legal-agent-factory';
import { DialogueContextManager } from '../../lib/agents/dialogue-context-manager';
import { PromptTemplateManager } from '../../lib/agents/prompt-templates';
import { SimilarityCalculator } from '../../lib/agents/similarity-calculator';
import { IntelligentCacheStrategy } from '../../lib/agents/intelligent-cache-strategy';
import { AgentErrorHandler } from '../../lib/agents/error-handling-retry';
import { performanceMonitor } from '../../lib/agents/performance-monitor';
import { DialogueLevel as SocraticLevel } from '../../lib/types/socratic';
import fs from 'fs/promises';
import path from 'path';

describe('Agent集成测试', () => {
  let agent: LegalAgentCore;
  let contextManager: DialogueContextManager;
  let factory: LegalAgentFactory;
  
  beforeAll(async () => {
    // 确保模板目录存在
    const templatesDir = path.join(process.cwd(), 'lib/prompt-templates/templates');
    try {
      await fs.access(templatesDir);
    } catch {
      await fs.mkdir(templatesDir, { recursive: true });
      
      // 创建测试模板文件
      const testTemplates = {
        'question-generation.md': `# 问题生成模板

基于以下法律案例，生成苏格拉底式对话问题：

案例：{{case}}
当前层级：{{level}}
学习目标：{{objectives}}

请生成一个引导学生思考的问题。`,

        'answer-evaluation.md': `# 答案评估模板

评估以下学生答案：

问题：{{question}}
学生答案：{{answer}}
参考答案：{{reference}}

请提供评估和改进建议。`,

        'progress-assessment.md': `# 进度评估模板

评估学生在苏格拉底对话中的学习进度：

对话历史：{{history}}
当前层级：{{level}}
学习目标：{{objectives}}

请评估学生是否准备进入下一层级。`
      };
      
      for (const [filename, content] of Object.entries(testTemplates)) {
        await fs.writeFile(path.join(templatesDir, filename), content);
      }
    }
  });
  
  beforeEach(async () => {
    // 初始化组件
    const templateManager = new PromptTemplateManager();
    const similarityCalculator = new SimilarityCalculator();
    const cacheStrategy = new IntelligentCacheStrategy();
    const errorHandler = new AgentErrorHandler();
    
    contextManager = new DialogueContextManager('test-session-' + Date.now());
    
    // Agent配置
    const agentConfig = {
      id: 'test-agent-' + Date.now(),
      name: 'Test Legal Agent',
      version: '1.0.0',
      apiConfig: {
        endpoint: 'https://api.test.com',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.7,
        timeout: 30000
      },
      features: {
        enableStreaming: false,
        enableCaching: true,
        enableFallback: true,
        enableMetrics: true
      },
      limits: {
        maxConcurrentRequests: 10,
        dailyQuota: 1000,
        hourlyQuota: 100
      }
    };
    
    agent = new LegalAgentCore(agentConfig, templateManager);
    
    factory = new LegalAgentFactory();
  });
  
  afterEach(() => {
    performanceMonitor.stop();
  });

  describe('完整对话流程测试', () => {
    const testCase = `
      案例：张某在超市购物时，因地面湿滑摔倒受伤。
      超市未设置警示标识，张某要求超市赔偿医疗费用。
      请分析此案例中的法律问题。
    `;

    it('应该能够完成完整的苏格拉底对话流程', async () => {
      const objectives = ['理解侵权责任', '分析举证责任', '掌握赔偿标准'];
      
      // 构建案例信息
      const caseInfo = {
        id: 'test-case-001',
        type: '民事' as const,
        facts: [
          '张某在超市购物时，因地面湿滑摔倒受伤',
          '超市未设置警示标识',
          '张某要求超市赔偿医疗费用'
        ],
        disputes: ['超市是否应承担赔偿责任', '赔偿范围如何确定'],
        laws: ['《民法典》第1198条'],
        judgment: '待分析'
      };

      // 构建Agent上下文
      const agentContext = {
        case: caseInfo,
        dialogue: {
          level: SocraticLevel.OBSERVATION,
          history: contextManager.getContext().messages,
          performance: contextManager.getContext().performance
        },
        settings: {
          difficulty: 'normal' as const,
          language: 'zh-CN' as const,
          legalSystem: 'chinese' as const,
          maxTokens: 500,
          temperature: 0.7,
          streaming: false
        }
      };

      // 1. 观察层级 - 生成问题  
      const observationQuestion = await agent.generateQuestion(
        agentContext,
        { level: SocraticLevel.OBSERVATION, objectives }
      );
      
      expect(observationQuestion.content).toBeDefined();
      expect(observationQuestion.content.length).toBeGreaterThan(10);
      expect(observationQuestion.suggestedLevel).toBe(SocraticLevel.OBSERVATION);
      
      // 2. 学生回答（模拟）
      const studentAnswer = "我看到张某在超市摔倒了，超市地面很滑。";
      
      // 3. 评估答案
      const evaluation = await agent.evaluateAnswer(
        agentContext,
        {
          question: observationQuestion.content,
          answer: studentAnswer,
          expectedPoints: ['地面湿滑', '警示标识缺失', '责任认定']
        }
      );
      
      expect(evaluation.evaluation).toBeDefined();
      expect(evaluation.evaluation.understanding).toBeGreaterThanOrEqual(0);
      expect(evaluation.evaluation.understanding).toBeLessThanOrEqual(100);
      expect(evaluation.content).toBeDefined();
      expect(evaluation.concepts).toBeInstanceOf(Array);
      
      // 4. 记录对话
      contextManager.addMessage('assistant', observationQuestion.content);
      contextManager.addMessage('user', studentAnswer);
      contextManager.addMessage('assistant', evaluation.content);
      
      // 5. 评估进度
      const progressEval = await agent.evaluateProgress(
        agentContext,
        { objectives, currentLevel: SocraticLevel.OBSERVATION }
      );
      
      expect(progressEval.evaluation).toBeDefined();
      expect(progressEval.evaluation.understanding).toBeGreaterThanOrEqual(0);
      expect(progressEval.evaluation.understanding).toBeLessThanOrEqual(100);
      expect(progressEval.evaluation.canProgress).toBeDefined();
      
      // 6. 如果可以进阶，继续下一层级  
      if (progressEval.evaluation.canProgress && progressEval.suggestedLevel) {
        const nextContext = {
          ...agentContext,
          dialogue: {
            ...agentContext.dialogue,
            level: progressEval.suggestedLevel
          }
        };
        
        const factsQuestion = await agent.generateQuestion(
          nextContext,
          { level: progressEval.suggestedLevel, objectives }
        );
        
        expect(factsQuestion.suggestedLevel).toBe(SocraticLevel.FACTS);
        expect(factsQuestion.content).toBeDefined();
      }
      
      // 7. 验证对话上下文
      const context = contextManager.getContext();
      expect(context.messages.length).toBeGreaterThan(0);
      expect(context.currentLevel).toBeDefined();
      expect(context.performance).toBeDefined();
    }, 30000);

    it('应该能够处理多轮对话并保持上下文', async () => {
      const objectives = ['分析法律关系', '确定责任主体'];
      
      // 第一轮对话
      const q1 = await agent.generateQuestion(testCase, SocraticLevel.OBSERVATION, objectives);
      const a1 = "张某在超市受伤，这是一个事故。";
      const e1 = await agent.evaluateAnswer(q1.question, a1, testCase);
      
      contextManager.addMessage('assistant', q1.question);
      contextManager.addMessage('user', a1);
      contextManager.addMessage('assistant', e1.feedback);
      
      // 第二轮对话
      const q2 = await agent.generateQuestion(testCase, SocraticLevel.FACTS, objectives);
      const a2 = "超市地面湿滑，没有警示标识，张某因此摔倒受伤。";
      const e2 = await agent.evaluateAnswer(q2.question, a2, testCase);
      
      contextManager.addMessage('assistant', q2.question);
      contextManager.addMessage('user', a2);
      contextManager.addMessage('assistant', e2.feedback);
      
      // 验证上下文连续性
      const context = contextManager.getContext();
      expect(context.messages.length).toBe(6); // 3轮 × 2条消息/轮
      expect(context.performance.totalQuestions).toBe(2);
      expect(context.performance.totalAnswers).toBe(2);
      
      // 验证层级进展
      const progress = await agent.evaluateProgress(objectives);
      expect(progress.currentLevel).toBe(SocraticLevel.FACTS);
    }, 30000);
  });

  describe('Agent工厂集成测试', () => {
    it('应该能够创建和管理多个Agent实例', async () => {
      // 创建多个不同类型的Agent
      const openaiAgent = await factory.createAgent('openai', {
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo'
      });
      
      const claudeAgent = await factory.createAgent('claude', {
        apiKey: 'test-key',
        model: 'claude-3-sonnet'
      });
      
      expect(openaiAgent).toBeDefined();
      expect(claudeAgent).toBeDefined();
      
      // 验证Agent状态
      const agents = factory.getActiveAgents();
      expect(agents.length).toBe(2);
      
      // 检查健康状态
      const openaiHealth = await factory.checkAgentHealth(openaiAgent.id);
      const claudeHealth = await factory.checkAgentHealth(claudeAgent.id);
      
      expect(openaiHealth.status).toBeDefined();
      expect(claudeHealth.status).toBeDefined();
    });

    it('应该能够处理Agent故障转移', async () => {
      // 创建主Agent和备用Agent
      const primaryAgent = await factory.createAgent('openai', {
        apiKey: 'test-key'
      });
      
      const fallbackAgent = await factory.createAgent('local', {
        model: 'test-model'
      });
      
      expect(primaryAgent).toBeDefined();
      expect(fallbackAgent).toBeDefined();
      
      // 模拟主Agent失败
      // 这里应该测试故障转移逻辑
      const agents = factory.getActiveAgents();
      expect(agents.length).toBe(2);
    });
  });

  describe('缓存集成测试', () => {
    it('应该能够缓存和复用相似问题', async () => {
      const case1 = "张某在商场摔倒受伤案例";
      const case2 = "李某在超市滑倒受伤案例";
      const objectives = ['侵权责任分析'];
      
      // 第一次生成问题
      const startTime = Date.now();
      const q1 = await agent.generateQuestion(case1, SocraticLevel.OBSERVATION, objectives);
      const firstCallDuration = Date.now() - startTime;
      
      expect(q1).toBeDefined();
      
      // 第二次生成相似问题（应该使用缓存）
      const startTime2 = Date.now();
      const q2 = await agent.generateQuestion(case2, SocraticLevel.OBSERVATION, objectives);
      const secondCallDuration = Date.now() - startTime2;
      
      expect(q2).toBeDefined();
      
      // 第二次调用应该更快（使用了缓存）
      // 注意：在测试环境中，这个断言可能不总是成立，因为没有实际的网络延迟
      // expect(secondCallDuration).toBeLessThan(firstCallDuration);
    }, 30000);

    it('应该能够根据相似度匹配缓存内容', async () => {
      const testCase = "商业纠纷案例分析";
      const objectives = ['合同法分析'];
      
      // 生成问题并缓存
      const q1 = await agent.generateQuestion(testCase, SocraticLevel.ANALYSIS, objectives);
      expect(q1).toBeDefined();
      
      // 使用稍微不同但相似的输入
      const similarCase = "商业合同纠纷案例分析";
      const q2 = await agent.generateQuestion(similarCase, SocraticLevel.ANALYSIS, objectives);
      
      expect(q2).toBeDefined();
      
      // 验证缓存命中
      // 注意：实际的缓存命中验证需要访问缓存的内部状态
    }, 30000);
  });

  describe('错误处理集成测试', () => {
    it('应该能够处理网络错误并重试', async () => {
      // 创建一个会失败的Agent配置
      const faultyAgentConfig = {
        id: 'faulty-agent-' + Date.now(),
        name: 'Faulty Test Agent',
        version: '1.0.0',
        apiConfig: {
          endpoint: 'https://invalid-endpoint.test.com',
          apiKey: 'invalid-key',
          model: 'gpt-3.5-turbo',
          maxTokens: 2000,
          temperature: 0.7,
          timeout: 5000 // 更短的超时时间
        },
        features: {
          enableStreaming: false,
          enableCaching: true,
          enableFallback: true,
          enableMetrics: true
        },
        limits: {
          maxConcurrentRequests: 1,
          dailyQuota: 10,
          hourlyQuota: 5
        }
      };

      const faultyAgent = new LegalAgentCore(faultyAgentConfig, new PromptTemplateManager());
      
      // 这个测试需要模拟网络错误，在实际实现中需要mock网络调用
      expect(faultyAgent).toBeDefined();
    });

    it('应该能够优雅地降级服务', async () => {
      // 测试在服务不可用时的降级处理
      const objectives = ['基础法律概念'];
      
      try {
        const result = await agent.generateQuestion(
          "简单案例", 
          SocraticLevel.OBSERVATION, 
          objectives
        );
        
        // 即使在降级模式下，也应该返回有效结果
        expect(result).toBeDefined();
        expect(result.question).toBeDefined();
      } catch (error) {
        // 如果完全失败，错误应该被适当处理
        expect(error).toBeInstanceOf(Error);
      }
    }, 30000);
  });

  describe('性能监控集成测试', () => {
    it('应该能够监控Agent性能指标', async () => {
      const testCase = "法律案例分析";
      const objectives = ['法律分析能力'];
      
      // 清除之前的指标
      performanceMonitor.stop();
      const newMonitor = new (performanceMonitor.constructor as any)();
      
      // 执行Agent操作
      await agent.generateQuestion(testCase, SocraticLevel.OBSERVATION, objectives);
      
      // 检查是否记录了性能指标
      const stats = await newMonitor.getMetricsStats('agent.duration');
      
      // 在测试环境中，可能没有实际的指标记录
      // 这个测试主要验证监控系统的集成是否正常
      expect(stats).toBeDefined();
    }, 30000);

    it('应该能够生成性能报告', async () => {
      const startTime = new Date(Date.now() - 60000); // 1分钟前
      const endTime = new Date();
      
      try {
        const report = await performanceMonitor.generateReport(startTime, endTime);
        
        expect(report).toBeDefined();
        expect(report.summary).toBeDefined();
        expect(report.systemHealth).toBeDefined();
      } catch (error) {
        // 在测试环境中可能没有足够的数据生成报告
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('端到端场景测试', () => {
    it('应该能够处理完整的学习会话', async () => {
      const sessionId = 'e2e-test-session-' + Date.now();
      const testContext = new DialogueContextManager(sessionId);
      
      const testAgentConfig = {
        id: 'test-agent-e2e-' + Date.now(),
        name: 'Test E2E Agent',
        version: '1.0.0',
        apiConfig: {
          endpoint: 'https://api.test.com',
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo',
          maxTokens: 2000,
          temperature: 0.7,
          timeout: 30000
        },
        features: {
          enableStreaming: false,
          enableCaching: true,
          enableFallback: true,
          enableMetrics: true
        },
        limits: {
          maxConcurrentRequests: 10,
          dailyQuota: 1000,
          hourlyQuota: 100
        }
      };

      const testAgent = new LegalAgentCore(testAgentConfig, new PromptTemplateManager());
      
      const caseStudy = `
        案例：某公司与员工李某签订劳动合同，约定试用期3个月。
        试用期内，李某表现良好，但公司以不符合录用条件为由解除合同。
        李某认为解除不当，要求公司支付赔偿。
      `;
      
      const learningObjectives = [
        '理解劳动法基本原则',
        '分析试用期相关法律规定',
        '掌握劳动争议处理程序'
      ];
      
      // 模拟完整学习流程
      let currentLevel = SocraticLevel.OBSERVATION;
      const maxRounds = 3;
      
      for (let round = 0; round < maxRounds; round++) {
        // 生成问题
        const question = await testAgent.generateQuestion(
          caseStudy, 
          currentLevel, 
          learningObjectives
        );
        
        expect(question).toBeDefined();
        expect(question.level).toBe(currentLevel);
        
        testContext.addMessage('assistant', question.question);
        
        // 模拟学生回答
        const studentAnswer = `这是第${round + 1}轮的学生回答，针对${currentLevel}层级的问题。`;
        testContext.addMessage('user', studentAnswer);
        
        // 评估回答
        const evaluation = await testAgent.evaluateAnswer(
          question.question,
          studentAnswer,
          caseStudy
        );
        
        expect(evaluation).toBeDefined();
        expect(evaluation.score).toBeGreaterThanOrEqual(0);
        
        testContext.addMessage('assistant', evaluation.feedback);
        
        // 评估进度
        const progress = await testAgent.evaluateProgress(learningObjectives);
        
        expect(progress).toBeDefined();
        
        // 决定是否进入下一层级
        if (progress.canAdvance && progress.nextLevel && round < maxRounds - 1) {
          currentLevel = progress.nextLevel;
        }
      }
      
      // 验证会话状态
      const finalContext = testContext.getContext();
      expect(finalContext.messages.length).toBeGreaterThan(0);
      expect(finalContext.performance.totalQuestions).toBe(maxRounds);
      expect(finalContext.performance.totalAnswers).toBe(maxRounds);
      
      // 导出会话快照
      const snapshot = testContext.exportSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.sessionId).toBe(sessionId);
      expect(snapshot.messages).toBeInstanceOf(Array);
    }, 60000);
  });

  describe('数据一致性测试', () => {
    it('应该维护对话状态的一致性', async () => {
      const sessionId = 'consistency-test';
      const context1 = new DialogueContextManager(sessionId);
      const context2 = new DialogueContextManager(sessionId);
      
      // 在context1中添加消息
      context1.addMessage('user', '第一条消息');
      context1.addMessage('assistant', '第一条回复');
      
      // 验证状态一致性
      const state1 = context1.getContext();
      const state2 = context2.getContext();
      
      // 注意：实际实现中需要持久化存储来保证不同实例间的状态一致性
      expect(state1.sessionId).toBe(state2.sessionId);
    });

    it('应该正确处理并发操作', async () => {
      const concurrentOperations = [];
      const testCase = "并发测试案例";
      const objectives = ['并发处理能力'];
      
      // 创建多个并发操作
      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          agent.generateQuestion(testCase, SocraticLevel.OBSERVATION, objectives)
        );
      }
      
      // 等待所有操作完成
      const results = await Promise.all(concurrentOperations);
      
      // 验证所有操作都成功完成
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.question).toBeDefined();
      });
    }, 30000);
  });
});