/**
 * 苏格拉底提问引擎
 * 通过递进式提问培养法学思维
 */

export interface ThinkingFramework {
  // IRAC思维框架
  Issue: string;      // 争议识别
  Rule: string;       // 规则确定
  Application: string; // 规则适用
  Conclusion: string;  // 结论推导
}

export class SocraticQuestionEngine {
  // 法学思维训练模板
  private templates = {
    // 第一层：基础理解
    basic: {
      争议识别: [
        "本案的核心争议是什么？",
        "双方当事人的主要分歧在哪里？",
        "这个案件要解决什么法律问题？"
      ],
      事实梳理: [
        "哪些事实是双方都认可的？",
        "哪些事实存在争议？",
        "时间顺序上发生了什么？"
      ],
      法条定位: [
        "这个争议涉及哪部法律？",
        "具体是哪个条文？",
        "这个条文的构成要件是什么？"
      ]
    },
    
    // 第二层：深度分析
    intermediate: {
      要件分析: [
        "法条的每个要件在本案中如何体现？",
        "有哪个要件可能不满足？为什么？",
        "如何理解'{{关键词}}'这个要件？"
      ],
      证据评估: [
        "支持原告主张的最强证据是什么？",
        "这个证据的弱点在哪里？",
        "被告如何质疑这个证据？"
      ],
      对抗思维: [
        "如果你是对方律师，你会如何反驳？",
        "这个论点的逻辑漏洞在哪里？",
        "有没有相反的判例？"
      ]
    },
    
    // 第三层：批判思维
    advanced: {
      假设推理: [
        "如果{{关键事实}}不存在，结果会怎样？",
        "改变{{某个条件}}，判决会改变吗？",
        "在什么情况下，相反的结论也成立？"
      ],
      价值判断: [
        "这个判决体现了什么价值取向？",
        "如何平衡双方的利益？",
        "社会效果和法律效果如何统一？"
      ],
      规则反思: [
        "这个法条的立法目的是什么？",
        "现有规则是否需要完善？",
        "这个案例能成为指导案例吗？"
      ]
    }
  };

  /**
   * 根据学生水平生成合适的问题
   */
  generateQuestion(
    level: 'basic' | 'intermediate' | 'advanced',
    category: string,
    context?: any
  ): string {
    const questions = this.templates[level][category as keyof typeof this.templates[typeof level]];
    if (!questions) return "请深入思考这个问题";
    
    // 随机选择一个问题
    const question = questions[Math.floor(Math.random() * questions.length)];
    
    // 替换占位符
    return this.fillTemplate(question, context);
  }

  /**
   * 评估答案质量（简化版）
   */
  evaluateAnswer(answer: string, expectedKeywords: string[]): {
    score: number;
    feedback: string;
    missing: string[];
  } {
    const included = expectedKeywords.filter(kw => answer.includes(kw));
    const missing = expectedKeywords.filter(kw => !answer.includes(kw));
    const score = (included.length / expectedKeywords.length) * 100;

    let feedback = '';
    if (score >= 80) {
      feedback = '优秀！你的分析很全面。';
    } else if (score >= 60) {
      feedback = '不错，但还可以更深入。';
    } else if (score >= 40) {
      feedback = '方向正确，请补充更多要点。';
    } else {
      feedback = '让我们换个角度思考...';
    }

    return { score, feedback, missing };
  }

  /**
   * 生成引导提示
   */
  generateHint(questionType: string, studentLevel: string): string {
    const hints = {
      争议识别: "提示：看看原告的诉讼请求和被告的答辩意见",
      事实梳理: "提示：按时间顺序整理，区分已证明和待证明的事实",
      法条定位: "提示：从请求权基础出发，找到对应的法律规范",
      要件分析: "提示：把法条拆分成多个要件，逐一对照事实",
      证据评估: "提示：考虑证据的真实性、关联性、合法性",
      对抗思维: "提示：站在对方立场，找出己方论证的薄弱环节",
      假设推理: "提示：改变一个关键变量，观察结论的变化",
      价值判断: "提示：考虑公平、效率、秩序等多重价值",
      规则反思: "提示：思考规则背后的社会目的和政策考量"
    };

    return hints[questionType as keyof typeof hints] || "提示：深入思考，多角度分析";
  }

  /**
   * 生成学习路径
   */
  generateLearningPath(caseType: string): Array<{
    stage: string;
    questions: string[];
    skills: string[];
  }> {
    return [
      {
        stage: "基础理解",
        questions: [
          "识别案件争议点",
          "梳理案件事实",
          "找出适用法条"
        ],
        skills: ["事实识别", "法条检索", "争点归纳"]
      },
      {
        stage: "深度分析",
        questions: [
          "分析构成要件",
          "评估证据效力",
          "预测对方抗辩"
        ],
        skills: ["要件分析", "证据判断", "对抗思维"]
      },
      {
        stage: "批判思维",
        questions: [
          "进行假设推理",
          "平衡各方利益",
          "反思规则合理性"
        ],
        skills: ["逻辑推理", "价值判断", "制度思考"]
      }
    ];
  }

  private fillTemplate(template: string, context: any): string {
    if (!context) return template;
    
    return template.replace(/\{\{(.+?)\}\}/g, (match, key) => {
      return context[key] || match;
    });
  }
}

// 导出单例
export const questionEngine = new SocraticQuestionEngine();