// 对抗生成器 - 生成反驳和假设变体
import { Challenge, ChallengeKind, Hardness, Turn } from './types';
import { deepseekService } from '@/lib/ai/deepseek-service';

export class ChallengeGenerator {
  /**
   * 根据难度和上下文生成挑战
   */
  async generate(
    hardness: Hardness,
    turn: Turn,
    context: {
      issue: string;
      elements: string[];
      facts: Map<string, string>;
      laws: Map<string, string>;
      previousChallenges?: Challenge[];
    }
  ): Promise<Challenge> {
    // 根据难度选择挑战类型
    const kind = this.selectChallengeKind(hardness, turn, context.previousChallenges);
    
    switch (kind) {
      case 'counter':
        return this.generateCounter(hardness, turn, context);
      case 'hypothetical':
        return this.generateHypothetical(hardness, turn, context);
      case 'clarification':
        return this.generateClarification(turn, context);
      default:
        return this.generateCounter('easy', turn, context);
    }
  }

  /**
   * 生成反驳挑战
   */
  private async generateCounter(
    hardness: Hardness,
    turn: Turn,
    context: {
      issue: string;
      elements: string[];
      facts: Map<string, string>;
      laws: Map<string, string>;
    }
  ): Promise<Challenge> {
    const citedFacts = turn.citedFacts.map(id => context.facts.get(id)).filter(Boolean);
    
    // 根据难度构建反驳策略
    const strategies = {
      easy: this.getEasyCounterStrategies(turn, context.elements),
      medium: this.getMediumCounterStrategies(turn, citedFacts),
      hard: this.getHardCounterStrategies(turn, context)
    };

    const strategy = this.selectRandomStrategy(strategies[hardness]);
    
    // 生成反驳内容
    const prompt = await this.buildCounterPrompt(strategy, turn, context);
    
    return {
      kind: 'counter',
      prompt,
      targetElement: strategy.target,
      suggestedResponse: strategy.hint
    };
  }

  /**
   * 生成假设变体挑战
   */
  private async generateHypothetical(
    hardness: Hardness,
    turn: Turn,
    context: {
      facts: Map<string, string>;
      laws: Map<string, string>;
    }
  ): Promise<Challenge> {
    const citedFacts = turn.citedFacts.map(id => context.facts.get(id)).filter(Boolean);
    
    // 选择要改变的事实维度
    const dimensions = {
      easy: ['时间', '地点'],  // 简单变化
      medium: ['主体', '行为'], // 中等变化
      hard: ['因果关系', '主观要件'] // 复杂变化
    };

    const dimension = this.selectRandom(dimensions[hardness]);
    
    // 生成假设情境
    const hypothetical = await this.buildHypothetical(dimension, citedFacts, turn);
    
    return {
      kind: 'hypothetical',
      prompt: hypothetical.prompt,
      targetElement: dimension,
      suggestedResponse: hypothetical.analysis
    };
  }

  /**
   * 生成澄清性问题
   */
  private async generateClarification(
    turn: Turn,
    context: { elements: string[] }
  ): Promise<Challenge> {
    // 找出论述中的模糊点
    const ambiguities = this.findAmbiguities(turn);
    
    if (ambiguities.length === 0) {
      // 没有明显模糊点，询问未覆盖的要件
      const uncovered = context.elements.filter(elem => 
        !turn.application.includes(elem)
      );
      
      if (uncovered.length > 0) {
        return {
          kind: 'clarification',
          prompt: `关于"${uncovered[0]}"这一要件，你的分析中似乎没有涉及。请问在本案中，这个要件是如何体现的？`,
          targetElement: uncovered[0]
        };
      }
    }

    const target = ambiguities[0] || '结论';
    return {
      kind: 'clarification',
      prompt: `你提到"${this.extractPhrase(turn.application, target)}"，能否具体解释这与法条要件的对应关系？`,
      targetElement: target
    };
  }

  // ==================== 策略生成方法 ====================

  private getEasyCounterStrategies(turn: Turn, elements: string[]): CounterStrategy[] {
    const strategies: CounterStrategy[] = [];

    // 策略1：询问未提及的要件
    const uncovered = elements.filter(e => !turn.application.includes(e));
    if (uncovered.length > 0) {
      strategies.push({
        type: 'missing_element',
        target: uncovered[0],
        template: `你的分析很有道理，但是否考虑过"${uncovered[0]}"这个要件？在本案中，这个要件似乎也很重要。`,
        hint: '提示：回顾法条，思考每个要件在案件中的体现'
      });
    }

    // 策略2：温和质疑某个事实解读
    if (turn.citedFacts.length > 0) {
      strategies.push({
        type: 'fact_interpretation',
        target: turn.citedFacts[0],
        template: `关于你引用的事实，是否也可以从另一个角度理解？比如这个事实是否也能支持相反的观点？`,
        hint: '提示：事实往往具有多面性，尝试从不同角度解读'
      });
    }

    // 策略3：询问法条适用的合理性
    strategies.push({
      type: 'rule_application',
      target: 'rule',
      template: `你选择的法条确实相关，但在本案的具体情境下，是否存在更优先适用的规则？`,
      hint: '提示：考虑特别法优于一般法的原则'
    });

    return strategies;
  }

  private getMediumCounterStrategies(turn: Turn, citedFacts: string[]): CounterStrategy[] {
    const strategies: CounterStrategy[] = [];

    // 策略1：指出逻辑漏洞
    strategies.push({
      type: 'logical_gap',
      target: 'application',
      template: `你从事实A推导到结论B的逻辑链条中，似乎缺少了关键的中间环节。能否补充说明因果关系？`,
      hint: '提示：确保每一步推理都有充分的依据'
    });

    // 策略2：提出反例
    strategies.push({
      type: 'counter_example',
      target: 'conclusion',
      template: `如果你的结论成立，那么在类似情况下是否会导致不合理的结果？请考虑这个反例...`,
      hint: '提示：法律追求的是普遍正义，考虑规则的一般适用性'
    });

    // 策略3：质疑证据充分性
    if (citedFacts.length < 3) {
      strategies.push({
        type: 'evidence_sufficiency',
        target: 'evidence',
        template: `仅凭这些事实是否足以支撑你的结论？是否还需要其他证据来加强论证？`,
        hint: '提示：考虑举证责任和证明标准'
      });
    }

    return strategies;
  }

  private getHardCounterStrategies(
    turn: Turn,
    context: { elements: string[]; laws: Map<string, string> }
  ): CounterStrategy[] {
    const strategies: CounterStrategy[] = [];

    // 策略1：深度质疑要件该当性
    strategies.push({
      type: 'element_challenge',
      target: context.elements[0],
      template: `即使接受你对事实的解读，但这些事实真的满足"${context.elements[0]}"的全部内涵吗？让我们仔细分析构成要件的每个细节...`,
      hint: '提示：要件该当性需要严格的涵摄过程'
    });

    // 策略2：体系解释冲突
    strategies.push({
      type: 'systematic_conflict',
      target: 'system',
      template: `你的解释虽然符合该条文的字面含义，但与整个法律体系的价值取向是否一致？考虑一下立法目的...`,
      hint: '提示：运用体系解释方法，考虑规范的整体协调性'
    });

    // 策略3：权利冲突与平衡
    strategies.push({
      type: 'rights_balance',
      target: 'balance',
      template: `在本案中，存在多方权利的冲突。你的结论是否充分平衡了各方利益？有没有考虑比例原则？`,
      hint: '提示：法律判断often需要在competing interests间寻找平衡'
    });

    return strategies;
  }

  // ==================== 假设变体生成 ====================

  private async buildHypothetical(
    dimension: string,
    facts: string[],
    turn: Turn
  ): Promise<{ prompt: string; analysis: string }> {
    const templates = {
      '时间': {
        prompt: '如果本案发生在[具体时间]之后，考虑到[相关法律变化]，你的分析会有何不同？',
        analysis: '时间要素可能影响法律适用和时效问题'
      },
      '主体': {
        prompt: '假设本案的[当事人身份]改变为[新身份]，这对构成要件的认定有何影响？',
        analysis: '主体资格可能影响权利能力和行为能力的判断'
      },
      '行为': {
        prompt: '如果当事人的行为从[原行为]变为[类似行为]，法律评价会如何改变？',
        analysis: '行为方式的细微差异可能导致完全不同的法律定性'
      },
      '因果关系': {
        prompt: '假设存在[介入因素]打断了因果链条，责任认定将如何变化？',
        analysis: '因果关系的认定直接影响责任归属'
      },
      '主观要件': {
        prompt: '如果能证明当事人是[过失/故意/意外]，这对案件定性有何决定性影响？',
        analysis: '主观要件often是区分不同法律责任的关键'
      }
    };

    const template = templates[dimension] || templates['行为'];
    
    // 基于实际案情定制化假设
    const customized = await this.customizeHypothetical(template, facts, turn);
    
    return customized;
  }

  // ==================== 辅助方法 ====================

  private selectChallengeKind(
    hardness: Hardness,
    turn: Turn,
    previousChallenges?: Challenge[]
  ): ChallengeKind {
    // 避免重复同类挑战
    const recentKinds = (previousChallenges || [])
      .slice(-2)
      .map(c => c.kind);

    const options: ChallengeKind[] = ['counter', 'hypothetical', 'clarification'];
    const weights = {
      easy: { counter: 0.5, hypothetical: 0.2, clarification: 0.3 },
      medium: { counter: 0.4, hypothetical: 0.4, clarification: 0.2 },
      hard: { counter: 0.3, hypothetical: 0.5, clarification: 0.2 }
    };

    // 过滤最近使用过的类型
    const available = options.filter(o => !recentKinds.includes(o));
    if (available.length === 0) return 'counter'; // 默认

    // 根据权重随机选择
    const w = weights[hardness];
    const rand = Math.random();
    let cumulative = 0;

    for (const kind of available) {
      cumulative += w[kind];
      if (rand <= cumulative) return kind;
    }

    return available[0];
  }

  private selectRandomStrategy(strategies: CounterStrategy[]): CounterStrategy {
    if (strategies.length === 0) {
      return {
        type: 'default',
        target: 'general',
        template: '你的论证有一定道理，但是否考虑过其他可能的解释？',
        hint: '提示：法律问题往往没有唯一答案'
      };
    }
    return strategies[Math.floor(Math.random() * strategies.length)];
  }

  private selectRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private findAmbiguities(turn: Turn): string[] {
    const ambiguousTerms = ['可能', '也许', '大概', '似乎', '或许', '应该是'];
    const found: string[] = [];

    for (const term of ambiguousTerms) {
      if (turn.application.includes(term)) {
        found.push(term);
      }
    }

    return found;
  }

  private extractPhrase(text: string, around: string): string {
    const index = text.indexOf(around);
    if (index === -1) return around;
    
    const start = Math.max(0, index - 10);
    const end = Math.min(text.length, index + around.length + 10);
    return text.substring(start, end);
  }

  private async buildCounterPrompt(
    strategy: CounterStrategy,
    turn: Turn,
    context: any
  ): Promise<string> {
    // 根据策略模板生成具体的反驳
    let prompt = strategy.template;

    // 定制化处理
    if (strategy.type === 'missing_element' && strategy.target) {
      // 具体指出缺失的要件
      prompt = prompt.replace('[要件]', strategy.target);
    }

    if (strategy.type === 'fact_interpretation' && turn.citedFacts.length > 0) {
      const factContent = context.facts.get(turn.citedFacts[0]) || '相关事实';
      prompt = `关于"${this.truncate(factContent, 30)}"这一事实，` + prompt;
    }

    return prompt;
  }

  private async customizeHypothetical(
    template: { prompt: string; analysis: string },
    facts: string[],
    turn: Turn
  ): Promise<{ prompt: string; analysis: string }> {
    // 基于实际案情填充模板
    let prompt = template.prompt;
    
    // 简单的占位符替换（实际可用AI生成更智能的假设）
    prompt = prompt.replace('[具体时间]', '新法实施');
    prompt = prompt.replace('[相关法律变化]', '构成要件的调整');
    prompt = prompt.replace('[当事人身份]', '自然人');
    prompt = prompt.replace('[新身份]', '法人');
    
    return {
      prompt,
      analysis: template.analysis
    };
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// ==================== 类型定义 ====================

interface CounterStrategy {
  type: string;
  target: string;
  template: string;
  hint: string;
}

// 导出单例
export const challengeGenerator = new ChallengeGenerator();