/**
 * PPT内容提取器
 * 负责从四幕教学数据中提取PPT展示的关键要素
 *
 * 核心思想：AI生成大纲需要的是精炼的教学要点，而非原始JSON数据
 */

// ========== 类型定义 ==========

/**
 * PPT关键要素
 */
export interface PptKeyElements {
  // 第一幕：案例精华
  caseEssence: {
    title: string;          // 案例标题
    type: string;           // 案件类型
    mainDispute: string;    // 核心争议
    legalIssue: string;     // 法律问题
    verdict: string;        // 判决结果
    parties: {              // 当事人信息
      plaintiff: string;
      defendant: string;
    };
  };

  // 第二幕：深度分析内容（完整数据）
  teachingHighlights: {
    // 🔥 事实分析（具体数据）
    factAnalysis: {
      keyFacts: string[];              // 关键事实
      disputedPoints: string[];        // 争议焦点
      timeline: Array<{                // 时间轴
        date: string;
        event: string;
        importance: 'critical' | 'important' | 'normal';
      }>;
    };
    // 🔥 证据分析（具体数据）
    evidenceAnalysis: {
      strengths: string[];             // 证据优势
      weaknesses: string[];            // 证据弱点
      recommendations: string[];       // 改进建议
    };
    // 🔥 法律分析（具体数据）
    legalAnalysis: {
      applicableLaws: string[];        // 适用法律
      precedents: string[];            // 判例参考
      risks: string[];                 // 法律风险
    };
    // 可视化数据
    visualizableData: VisualizableData[];
  };

  // 第三幕：对话精华
  dialogueHighlights: {
    keyQuestions: DialogueSnippet[];      // 关键提问（Top 3）
    breakthroughMoments: string[];        // 突破性时刻描述
    thinkingProgression: string;          // 学生思维进步路径
  };

  // 第四幕：学习成果
  learningOutcomes: {
    keyInsights: string[];                // 关键收获
    skillsImproved: string[];             // 能力提升
    knowledgeGaps: string[];              // 知识盲区（可选）
  };
}

/**
 * 可视化数据
 */
export interface VisualizableData {
  type: 'radar' | 'bar' | 'pie' | 'timeline' | 'network';
  title: string;
  data: any;
  description: string;  // 用于生成visualHints
}

/**
 * 对话片段
 */
export interface DialogueSnippet {
  question: string;           // AI的关键提问
  studentResponse: string;    // 学生的回答
  insight: string;            // 教学洞察
}

/**
 * 收集到的教学数据（从useTeachingStore）
 */
export interface CollectedTeachingData {
  caseInfo: any;
  caseConfidence: number;
  analysisResult: any;
  socraticLevel: number;
  completedNodes: string[];
  learningReport: any;
  hasRealData: boolean;
  // 🔧 新增：第三幕对话历史
  conversationHistory?: Array<{
    role: 'ai' | 'user';
    content: string;
    timestamp?: number;
  }>;
  // 🔧 新增：完整的四幕原始数据（供复杂提取使用）
  fullData?: {
    upload: any;
    analysis: any;
    socratic: any;
    summary: any;
  };
}

// ========== 核心提取器 ==========

export class PptContentExtractor {
  /**
   * 主入口：从四幕数据中提取PPT关键要素
   */
  extract(data: CollectedTeachingData): PptKeyElements {
    console.log('🔍 [PptContentExtractor] 开始提取PPT关键要素');

    return {
      caseEssence: this.extractCaseEssence(data.caseInfo),
      teachingHighlights: this.extractTeachingHighlights(data.analysisResult, data.caseInfo),
      dialogueHighlights: this.extractDialogueHighlights(data),
      learningOutcomes: this.extractLearningOutcomes(data.learningReport)
    };
  }

  // ========== 第一幕：案例精华提取 ==========

  /**
   * 提取案例核心信息
   */
  private extractCaseEssence(caseInfo: any): PptKeyElements['caseEssence'] {
    console.log('📋 [PptContentExtractor] 提取案例精华');
    console.log('📋 [PptContentExtractor] caseInfo原始数据:', JSON.stringify(caseInfo, null, 2));

    // 提取案例标题
    const title = this.extractCaseTitle(caseInfo);
    console.log('  - 标题:', title);

    // 提取案件类型
    const type = this.extractCaseType(caseInfo);
    console.log('  - 类型:', type);

    // 提取核心争议
    const mainDispute = this.extractMainDispute(caseInfo);
    console.log('  - 争议:', mainDispute);

    // 提取法律问题
    const legalIssue = this.extractLegalIssue(caseInfo);
    console.log('  - 法律问题:', legalIssue);

    // 提取判决结果
    const verdict = this.extractVerdict(caseInfo);
    console.log('  - 判决:', verdict);

    // 提取当事人
    const parties = this.extractParties(caseInfo);
    console.log('  - 当事人:', parties);

    const result = {
      title,
      type,
      mainDispute,
      legalIssue,
      verdict,
      parties
    };

    console.log('✅ [PptContentExtractor] 案例精华提取完成:', result);

    return result;
  }

  private extractCaseTitle(caseInfo: any): string {
    // 优先级: documentName > title > 案件名称 > 默认值
    // 🔧 增强兼容性:支持更多字段名称
    return caseInfo?.documentName ||
           caseInfo?.caseName ||
           caseInfo?.title ||
           caseInfo?.案件名称 ||
           caseInfo?.name ||
           caseInfo?.文档名称 ||
           '法律案例分析';
  }

  private extractCaseType(caseInfo: any): string {
    // 尝试从多个字段提取案件类型
    // 🔧 增强兼容性:支持更多字段名称
    return caseInfo?.caseType ||
           caseInfo?.案由 ||
           caseInfo?.type ||
           caseInfo?.类型 ||
           caseInfo?.案件类型 ||
           this.inferCaseTypeFromContent(caseInfo) ||
           '民事纠纷';
  }

  private inferCaseTypeFromContent(caseInfo: any): string | null {
    // 从内容中推断案件类型
    const content = JSON.stringify(caseInfo).toLowerCase();

    if (content.includes('借贷') || content.includes('loan')) return '民间借贷纠纷';
    if (content.includes('合同') || content.includes('contract')) return '合同纠纷';
    if (content.includes('侵权') || content.includes('tort')) return '侵权责任纠纷';
    if (content.includes('劳动') || content.includes('labor')) return '劳动争议';

    return null;
  }

  private extractMainDispute(caseInfo: any): string {
    // 提取核心争议焦点
    // 🔧 增强兼容性:支持多种数据结构
    return caseInfo?.mainDispute ||
           caseInfo?.核心争议 ||
           caseInfo?.dispute ||
           caseInfo?.争议焦点 ||
           caseInfo?.keyDispute ||
           caseInfo?.争议 ||
           // 从嵌套结构中提取
           caseInfo?.threeElements?.reasoning?.核心争议 ||
           caseInfo?.analysis?.dispute ||
           '待分析';
  }

  private extractLegalIssue(caseInfo: any): string {
    // 提取法律问题
    // 🔧 增强兼容性:支持多种数据结构
    return caseInfo?.legalIssue ||
           caseInfo?.法律问题 ||
           caseInfo?.法律适用 ||
           caseInfo?.legalQuestion ||
           caseInfo?.法律争议 ||
           // 从嵌套结构中提取
           caseInfo?.threeElements?.reasoning?.法律问题 ||
           caseInfo?.analysis?.legalIssue ||
           '法律关系认定';
  }

  private extractVerdict(caseInfo: any): string {
    // 提取判决结果
    // 🔧 增强兼容性:支持多种数据结构
    return caseInfo?.verdict ||
           caseInfo?.判决结果 ||
           caseInfo?.裁判结果 ||
           caseInfo?.result ||
           caseInfo?.judgment ||
           caseInfo?.裁判 ||
           // 从嵌套结构中提取
           caseInfo?.threeElements?.reasoning?.判决结果 ||
           caseInfo?.threeElements?.reasoning?.summary ||
           '详见判决书';
  }

  private extractParties(caseInfo: any): { plaintiff: string; defendant: string } {
    // 🔧 增强兼容性:支持多种数据结构
    const plaintiff = caseInfo?.plaintiff ||
                      caseInfo?.原告 ||
                      caseInfo?.parties?.plaintiff ||
                      caseInfo?.当事人?.原告 ||
                      // 从嵌套结构中提取
                      caseInfo?.threeElements?.facts?.parties?.plaintiff ||
                      '原告方';

    const defendant = caseInfo?.defendant ||
                      caseInfo?.被告 ||
                      caseInfo?.parties?.defendant ||
                      caseInfo?.当事人?.被告 ||
                      // 从嵌套结构中提取
                      caseInfo?.threeElements?.facts?.parties?.defendant ||
                      '被告方';

    return { plaintiff, defendant };
  }

  // ========== 第二幕：深度分析内容提取 ==========

  /**
   * 提取第二幕深度分析的所有内容（完整数据，不是概括）
   */
  private extractTeachingHighlights(
    analysisResult: any,
    _caseInfo: any
  ): PptKeyElements['teachingHighlights'] {
    console.log('💡 [PptContentExtractor] 提取第二幕深度分析内容');
    console.log('💡 [PptContentExtractor] analysisResult原始数据:', JSON.stringify(analysisResult, null, 2));

    // 🔥 提取事实分析的具体数据
    const factAnalysis = {
      keyFacts: analysisResult?.factAnalysis?.keyFacts || [],
      disputedPoints: analysisResult?.factAnalysis?.disputedPoints || [],
      timeline: analysisResult?.factAnalysis?.timeline || []
    };
    console.log('  ✅ 事实分析:', {
      keyFacts: factAnalysis.keyFacts.length,
      disputedPoints: factAnalysis.disputedPoints.length,
      timeline: factAnalysis.timeline.length
    });

    // 🔥 提取证据分析的具体数据
    const evidenceAnalysis = {
      strengths: analysisResult?.evidenceAnalysis?.strengths || [],
      weaknesses: analysisResult?.evidenceAnalysis?.weaknesses || [],
      recommendations: analysisResult?.evidenceAnalysis?.recommendations || []
    };
    console.log('  ✅ 证据分析:', {
      strengths: evidenceAnalysis.strengths.length,
      weaknesses: evidenceAnalysis.weaknesses.length,
      recommendations: evidenceAnalysis.recommendations.length
    });

    // 🔥 提取法律分析的具体数据
    const legalAnalysis = {
      applicableLaws: analysisResult?.legalAnalysis?.applicableLaws || [],
      precedents: analysisResult?.legalAnalysis?.precedents || [],
      risks: analysisResult?.legalAnalysis?.risks || []
    };
    console.log('  ✅ 法律分析:', {
      applicableLaws: legalAnalysis.applicableLaws.length,
      precedents: legalAnalysis.precedents.length,
      risks: legalAnalysis.risks.length
    });

    // 可视化数据
    const visualizableData = this.extractChartData(analysisResult);

    return {
      factAnalysis,
      evidenceAnalysis,
      legalAnalysis,
      visualizableData
    };
  }

  /**
   * 提取可视化数据（为图表准备）
   */
  private extractChartData(analysisResult: any): VisualizableData[] {
    const charts: VisualizableData[] = [];

    // 1. 证据质量雷达图
    if (analysisResult?.evidenceAnalysis) {
      const evidence = analysisResult.evidenceAnalysis;

      if (evidence.relevance || evidence.authenticity || evidence.legality) {
        charts.push({
          type: 'radar',
          title: '证据质量评估',
          data: {
            真实性: evidence.authenticity || evidence.真实性 || 0,
            关联性: evidence.relevance || evidence.关联性 || 0,
            合法性: evidence.legality || evidence.合法性 || 0
          },
          description: `用雷达图展示证据的真实性、关联性、合法性三个维度`
        });
      }
    }

    // 2. 时间轴
    if (analysisResult?.timeline || analysisResult?.事件时间轴) {
      const timeline = analysisResult.timeline || analysisResult.事件时间轴;

      if (Array.isArray(timeline) && timeline.length > 0) {
        charts.push({
          type: 'timeline',
          title: '案件时间轴',
          data: timeline.map((event: any) => ({
            date: event.date || event.时间 || '',
            event: event.description || event.事件 || event.content || ''
          })),
          description: `用时间轴展示${timeline.length}个关键事件的发展脉络`
        });
      }
    }

    // 3. 当事人关系网络图（如果有多方当事人）
    if (analysisResult?.parties || analysisResult?.当事人) {
      const parties = analysisResult.parties || analysisResult.当事人;

      if (Array.isArray(parties) && parties.length > 2) {
        charts.push({
          type: 'network',
          title: '当事人关系网络',
          data: parties,
          description: `用网络图展示${parties.length}方当事人之间的法律关系`
        });
      }
    }

    // 4. 法律适用统计（如果有多个法条）
    if (analysisResult?.applicableLaws) {
      const laws = analysisResult.applicableLaws;

      if (Array.isArray(laws) && laws.length > 0) {
        charts.push({
          type: 'bar',
          title: '适用法条分布',
          data: laws.map((law: any) => ({
            name: law.name || law.法条 || '',
            count: 1
          })),
          description: `用柱状图展示主要适用的${laws.length}个法条`
        });
      }
    }

    console.log(`📊 [PptContentExtractor] 提取到 ${charts.length} 个可视化数据`);

    return charts;
  }

  // ========== 第三幕：对话精华提取 ==========

  /**
   * 提取苏格拉底对话精华
   */
  private extractDialogueHighlights(data: CollectedTeachingData): PptKeyElements['dialogueHighlights'] {
    console.log('💬 [PptContentExtractor] 提取对话精华');

    // 注意：这里需要从Store中获取实际的对话历史
    // 目前CollectedTeachingData中只有socraticLevel和completedNodes
    // 需要增强数据收集，包含实际的conversationHistory

    return {
      keyQuestions: this.extractKeyQuestions(data),
      breakthroughMoments: this.extractBreakthroughs(data),
      thinkingProgression: this.extractThinkingPath(data)
    };
  }

  private extractKeyQuestions(data: CollectedTeachingData): DialogueSnippet[] {
    console.log('🤔 [PptContentExtractor] 提取关键思辨问题');

    // 🎯 使用真实的对话历史
    if (data.conversationHistory && data.conversationHistory.length > 0) {
      console.log(`  - 发现真实对话历史: ${data.conversationHistory.length}条消息`);

      // 从对话历史中提取AI的提问和学生的回答
      const questionPairs: DialogueSnippet[] = [];

      for (let i = 0; i < data.conversationHistory.length - 1; i++) {
        const current = data.conversationHistory[i];
        const next = data.conversationHistory[i + 1];

        // 如果当前是AI的问题，下一条是学生的回答
        if (current?.role === 'ai' && next?.role === 'user') {
          // 判断AI消息是否是提问（包含问号或疑问词）
          const isQuestion = current.content.includes('？') ||
                            current.content.includes('?') ||
                            current.content.match(/为什么|如何|怎么|什么|是否|能否/);

          if (isQuestion) {
            questionPairs.push({
              question: current.content,
              studentResponse: next.content,
              insight: this.inferTeachingInsight(current.content, next.content)
            });
          }
        }
      }

      if (questionPairs.length > 0) {
        console.log(`  ✅ 成功提取 ${questionPairs.length} 个真实问答对`);
        // 返回前3个最有代表性的问题
        return questionPairs.slice(0, 3);
      }
    }

    // 回退方案：如果没有对话历史，检查是否有socratic level
    const level = data.socraticLevel;
    const nodeCount = data.completedNodes.length;

    if (level === 0 || nodeCount === 0) {
      console.log('  ⚠️ 没有苏格拉底对话数据，返回空数组');
      return [];
    }

    // 最后的回退：生成示例（但标注为示例）
    console.log(`  ⚠️ 使用示例数据（level=${level}, nodes=${nodeCount}）`);
    const examples: DialogueSnippet[] = [];

    if (level >= 1) {
      examples.push({
        question: "从案件的证据材料来看，你认为哪些证据最关键？",
        studentResponse: "关键证据包括...",
        insight: "引导学生思考证据与待证事实的关联性"
      });
    }

    if (level >= 2) {
      examples.push({
        question: "在本案中，举证责任应该如何分配？",
        studentResponse: "根据法律规定，应该由主张方承担举证责任",
        insight: "培养举证责任分配的法律思维"
      });
    }

    if (level >= 3) {
      examples.push({
        question: "法院在判决中运用了哪些法律推理方法？",
        studentResponse: "运用了三段论推理和类比推理",
        insight: "深入理解法律推理方法的实际应用"
      });
    }

    return examples.slice(0, 3);
  }

  /**
   * 推断教学洞察（基于问题和回答的内容）
   */
  private inferTeachingInsight(question: string, _answer: string): string {
    // 简单的启发式规则推断教学目的（主要基于问题，未来可扩展分析回答）
    if (question.match(/证据|举证/)) {
      return "引导学生思考证据规则和举证责任";
    }
    if (question.match(/法律关系|法律性质/)) {
      return "培养法律关系识别和定性能力";
    }
    if (question.match(/构成要件|要素/)) {
      return "训练法律构成要件的分析思维";
    }
    if (question.match(/为什么|原因|理由/)) {
      return "深化对法律原理和立法目的的理解";
    }
    if (question.match(/如何|怎么|方法/)) {
      return "培养法律实务操作技能";
    }

    return "引导学生进行法律思维训练";
  }

  private extractBreakthroughs(data: CollectedTeachingData): string[] {
    const breakthroughs: string[] = [];

    if (data.socraticLevel >= 2) {
      breakthroughs.push("理解了举证责任分配的基本原则");
    }

    if (data.socraticLevel >= 3) {
      breakthroughs.push("掌握了证据三性的判断标准");
      breakthroughs.push("能够独立构建完整的法律推理链条");
    }

    return breakthroughs;
  }

  private extractThinkingPath(data: CollectedTeachingData): string {
    const level = data.socraticLevel;

    if (level === 0) return "尚未开始苏格拉底对话";
    if (level === 1) return "从案件事实认知 → 初步法律判断";
    if (level === 2) return "从事实认知 → 法律关系分析 → 举证责任分配";
    if (level === 3) return "从事实认知 → 法律关系分析 → 证据体系构建 → 完整法律推理";

    return "完成系统化法律思维训练";
  }

  // ========== 第四幕：学习成果提取 ==========

  /**
   * 提取学习成果
   */
  private extractLearningOutcomes(learningReport: any): PptKeyElements['learningOutcomes'] {
    console.log('🎓 [PptContentExtractor] 提取学习成果');

    return {
      keyInsights: this.extractKeyInsights(learningReport),
      skillsImproved: this.extractSkillsImproved(learningReport),
      knowledgeGaps: this.extractKnowledgeGaps(learningReport)
    };
  }

  private extractKeyInsights(learningReport: any): string[] {
    const insights: string[] = [];

    if (learningReport?.keyInsights) {
      return Array.isArray(learningReport.keyInsights)
        ? learningReport.keyInsights
        : [learningReport.keyInsights];
    }

    // 回退方案：从其他字段提取
    if (learningReport?.关键收获) {
      insights.push(learningReport.关键收获);
    }

    if (learningReport?.summary) {
      insights.push(learningReport.summary);
    }

    return insights.length > 0 ? insights : ["完成案例系统化分析"];
  }

  private extractSkillsImproved(learningReport: any): string[] {
    if (learningReport?.skillsImproved) {
      return Array.isArray(learningReport.skillsImproved)
        ? learningReport.skillsImproved
        : [learningReport.skillsImproved];
    }

    // 默认能力提升
    return [
      "案件事实梳理能力",
      "法律推理分析能力",
      "证据审查判断能力"
    ];
  }

  private extractKnowledgeGaps(learningReport: any): string[] {
    if (learningReport?.knowledgeGaps) {
      return Array.isArray(learningReport.knowledgeGaps)
        ? learningReport.knowledgeGaps
        : [learningReport.knowledgeGaps];
    }

    // 知识盲区是可选的
    return [];
  }
}

// ========== 默认导出 ==========
export default PptContentExtractor;
