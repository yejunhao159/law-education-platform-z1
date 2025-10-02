/**
 * 全量提示词注入测试
 * 验证FullPromptBuilder的功能和输出质量
 */

import { FullPromptBuilder, type FullPromptContext } from '../FullPromptBuilder';

describe('FullPromptBuilder', () => {
  describe('buildFullSystemPrompt', () => {
    it('应该成功构建完整的System Prompt', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate',
        topic: '合同效力分析',
        issuePhase: 'socratic',
        includeDiagnostics: false
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);

      // 验证基本结构
      expect(systemPrompt).toBeDefined();
      expect(systemPrompt.length).toBeGreaterThan(0);

      // 验证包含所有核心模块
      expect(systemPrompt).toContain('核心身份认知');
      expect(systemPrompt).toContain('强制性认知约束');
      expect(systemPrompt).toContain('教学原则');
      expect(systemPrompt).toContain('ISSUE');
      expect(systemPrompt).toContain('教学模式');
      expect(systemPrompt).toContain('难度策略');
      expect(systemPrompt).toContain('问题质量');
      expect(systemPrompt).toContain('立即执行要求');
    });

    it('应该包含Advice Socratic核心要求', () => {
      const context: FullPromptContext = {
        mode: 'analysis',
        difficulty: 'basic'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);

      // 验证Advice Socratic标准
      expect(systemPrompt).toContain('一次一问');
      expect(systemPrompt).toContain('提供选项');
      expect(systemPrompt).toContain('3-5个');
      expect(systemPrompt).toContain('开放');
      expect(systemPrompt).toContain('友好');
    });

    it('应该正确注入当前教学模式', () => {
      const explorationContext: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate'
      };

      const explorationPrompt = FullPromptBuilder.buildFullSystemPrompt(explorationContext);
      expect(explorationPrompt).toContain('Exploration');
      expect(explorationPrompt).toContain('探索模式');

      const analysisContext: FullPromptContext = {
        mode: 'analysis',
        difficulty: 'intermediate'
      };

      const analysisPrompt = FullPromptBuilder.buildFullSystemPrompt(analysisContext);
      expect(analysisPrompt).toContain('Analysis');
      expect(analysisPrompt).toContain('分析模式');
    });

    it('应该正确注入当前难度级别', () => {
      const basicContext: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'basic'
      };

      const basicPrompt = FullPromptBuilder.buildFullSystemPrompt(basicContext);
      expect(basicPrompt).toContain('Basic');
      expect(basicPrompt).toContain('基础水平');

      const advancedContext: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'advanced'
      };

      const advancedPrompt = FullPromptBuilder.buildFullSystemPrompt(advancedContext);
      expect(advancedPrompt).toContain('Advanced');
      expect(advancedPrompt).toContain('高级水平');
    });

    it('应该包含当前讨论主题', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate',
        topic: '合同有效性分析'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);
      expect(systemPrompt).toContain('合同有效性分析');
    });

    it('应该包含ISSUE阶段指导', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate',
        issuePhase: 'socratic'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);
      expect(systemPrompt).toContain('Socratic');
      expect(systemPrompt).toContain('友好探索');
    });

    it('应该在启用诊断时包含诊断信息', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate',
        includeDiagnostics: true
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);
      expect(systemPrompt).toContain('构建诊断信息');
      expect(systemPrompt).toContain('Token使用统计');
      expect(systemPrompt).toContain('模块分布');
    });

    it('应该包含质量自检清单', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);
      expect(systemPrompt).toContain('质量自检清单');
      expect(systemPrompt).toContain('[ ]');
      expect(systemPrompt).toContain('聚焦');
      expect(systemPrompt).toContain('避免');
      expect(systemPrompt).toContain('友好');
    });

    it('应该包含五层递进教学法', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);
      expect(systemPrompt).toContain('五层递进');
      expect(systemPrompt).toContain('概念澄清');
      expect(systemPrompt).toContain('前提识别');
      expect(systemPrompt).toContain('证据检验');
      expect(systemPrompt).toContain('规则适用');
      expect(systemPrompt).toContain('后果推演');
    });

    it('应该包含中国法学特色', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);
      expect(systemPrompt).toContain('中国法学');
      expect(systemPrompt).toContain('中国法律');
    });

    it('应该在结尾包含执行总结', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);

      // 验证执行总结在末尾
      const executionIndex = systemPrompt.lastIndexOf('立即执行要求');
      const diagnosticsIndex = systemPrompt.lastIndexOf('构建诊断');

      // 执行总结应该在诊断信息之前（如果有诊断信息）
      if (diagnosticsIndex > 0) {
        expect(executionIndex).toBeLessThan(diagnosticsIndex);
      } else {
        // 如果没有诊断信息，执行总结应该在最后
        expect(executionIndex).toBeGreaterThan(systemPrompt.length * 0.8);
      }
    });
  });

  describe('estimateTokens', () => {
    it('应该能估算简单文本的Token数', () => {
      const text = 'Hello World';
      const tokens = FullPromptBuilder.estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('应该能估算中文文本的Token数', () => {
      const text = '这是一段中文文本';
      const tokens = FullPromptBuilder.estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      // 中文约1.5字符/token
      expect(tokens).toBeCloseTo(text.length / 1.5, 0);
    });

    it('应该能估算混合文本的Token数', () => {
      const text = 'Hello 世界 World 中国';
      const tokens = FullPromptBuilder.estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });
  });

  describe('完整性测试', () => {
    it('生成的Prompt应该在合理的Token范围内', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate',
        topic: '合同有效性分析',
        issuePhase: 'socratic'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);
      const estimatedTokens = FullPromptBuilder.estimateTokens(systemPrompt);

      // 应该在25K-45K tokens之间
      expect(estimatedTokens).toBeGreaterThan(25000);
      expect(estimatedTokens).toBeLessThan(45000);

      // 应该小于128K Context Window的50%
      expect(estimatedTokens).toBeLessThan(64000);
    });

    it('应该包含所有7个核心模块', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);

      // 统计模块数量（通过标题）
      const sections = [
        '第一部分：核心身份认知',
        '第二部分：强制性认知约束',
        '第三部分：ISSUE协作范式教学原则',
        '第四部分：ISSUE协作执行协议',
        '第五部分：教学模式策略',
        '第六部分：难度策略体系',
        '第七部分：问题质量控制协议',
        '第八部分：立即执行要求'
      ];

      sections.forEach(section => {
        expect(systemPrompt).toContain(section);
      });
    });

    it('应该使用清晰的分隔符', () => {
      const context: FullPromptContext = {
        mode: 'exploration',
        difficulty: 'intermediate'
      };

      const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);

      // 应该使用=分隔符
      const separators = systemPrompt.match(/={80}/g);
      expect(separators).toBeDefined();
      expect(separators!.length).toBeGreaterThan(6); // 至少7个模块之间有分隔
    });
  });
});
