/**
 * 法律分析模板 - 专为法律文档分析设计
 * 支持事实提取、证据分析、法理推理、时间轴构建等多种分析模式
 */

import type {
  AIMessage,
  LegalEducationTemplate,
  LegalAnalysisContext,
  LegalEducationContextData
} from "../types";

export interface LegalAnalysisInput {
  /** 要分析的文档文本 */
  documentText: string;
  /** 分析类型 */
  analysisType: 'facts' | 'evidence' | 'reasoning' | 'timeline' | 'claims';
  /** 分析深度 */
  depth: 'basic' | 'detailed' | 'comprehensive';
  /** 先前的分析结果 */
  priorAnalysis?: {
    facts?: string[];
    evidence?: string[];
    disputes?: string[];
    timeline?: Array<{ date: string; event: string; significance: string }>;
  };
  /** 特定焦点 */
  specificFocus?: string[];
  /** 文档类型 */
  documentType?: 'judgment' | 'contract' | 'statute' | 'case-brief';
  /** 案例信息 */
  caseInfo?: {
    caseNumber?: string;
    court?: string;
    parties?: string[];
    caseType?: string;
  };
}

export class LegalAnalysisTemplate implements LegalEducationTemplate<LegalAnalysisInput> {
  readonly id = "legal-analysis";
  readonly name = "法律分析模板";
  readonly description = "专为法律文档分析设计，支持多种分析模式和深度";
  readonly scenarios = [
    "document-analysis",
    "fact-extraction",
    "evidence-review",
    "legal-reasoning",
    "timeline-construction",
    "claim-analysis"
  ];
  readonly supportedModes = [
    "analysis",
    "extraction",
    "timeline",
    "reasoning"
  ];

  build(input: LegalAnalysisInput) {
    return {
      role: this.buildAnalystRole(input),
      current: this.buildAnalysisTask(input),
      tools: this.getAnalysisTools(input.analysisType),
      conversation: this.formatPriorAnalysis(input.priorAnalysis)
    };
  }

  buildLegalContext(input: LegalAnalysisInput): LegalEducationContextData {
    return {
      role: this.buildAnalystRole(input),
      teachingMode: 'analysis',
      educationLevel: this.inferEducationLevel(input.depth),
      focusAreas: input.specificFocus || [this.getAnalysisDescription(input.analysisType)],
      caseInfo: input.caseInfo,
      documentType: input.documentType || this.inferDocumentType(input.documentText),
      legalDomain: this.inferLegalDomain(input.documentText)
    };
  }

  buildMessages(input: LegalAnalysisInput): AIMessage[] {
    const messages: AIMessage[] = [];

    // 1. 系统角色设定
    messages.push({
      role: "system",
      content: this.buildSystemPrompt(input),
      metadata: {
        templateId: this.id,
        analysisType: input.analysisType,
        depth: input.depth,
        timestamp: new Date().toISOString()
      }
    });

    // 2. 文档内容
    messages.push({
      role: "system",
      content: this.formatDocumentContent(input),
      metadata: {
        messageType: 'document-content',
        documentType: input.documentType
      }
    });

    // 3. 先前分析结果（如果有）
    if (input.priorAnalysis) {
      messages.push({
        role: "system",
        content: this.formatPriorAnalysisContent(input.priorAnalysis),
        metadata: {
          messageType: 'prior-analysis'
        }
      });
    }

    // 4. 分析任务指令
    messages.push({
      role: "user",
      content: this.generateAnalysisInstruction(input),
      metadata: {
        messageType: 'analysis-instruction'
      }
    });

    return messages;
  }

  validate(input: LegalAnalysisInput): boolean {
    if (!input.documentText || input.documentText.trim().length === 0) {
      console.error('法律分析需要提供文档文本');
      return false;
    }

    if (!['facts', 'evidence', 'reasoning', 'timeline', 'claims'].includes(input.analysisType)) {
      console.error('分析类型必须是 facts、evidence、reasoning、timeline 或 claims');
      return false;
    }

    if (!['basic', 'detailed', 'comprehensive'].includes(input.depth)) {
      console.error('分析深度必须是 basic、detailed 或 comprehensive');
      return false;
    }

    if (input.documentText.length < 100) {
      console.warn('文档内容较短，可能影响分析质量');
    }

    return true;
  }

  estimateTokens(input: LegalAnalysisInput): number {
    let totalTokens = 0;

    // 系统提示
    totalTokens += this.estimateChineseTokens(this.buildSystemPrompt(input));

    // 文档内容
    totalTokens += this.estimateChineseTokens(input.documentText);

    // 先前分析
    if (input.priorAnalysis) {
      const priorContent = JSON.stringify(input.priorAnalysis);
      totalTokens += this.estimateChineseTokens(priorContent);
    }

    // 分析指令
    totalTokens += this.estimateChineseTokens(this.generateAnalysisInstruction(input));

    return totalTokens;
  }

  generateFeedback(input: LegalAnalysisInput, response: string): string {
    const feedback: string[] = [];

    // 检查分析结构
    if (input.analysisType === 'timeline' && !response.includes('时间') && !response.includes('日期')) {
      feedback.push('时间轴分析应该包含明确的时间信息');
    }

    if (input.analysisType === 'facts' && !response.includes('事实')) {
      feedback.push('事实分析应该明确区分争议事实和无争议事实');
    }

    if (input.analysisType === 'evidence' && !response.includes('证据')) {
      feedback.push('证据分析应该评估证据的证明力和关联性');
    }

    // 检查法条引用
    const hasLegalReference = response.includes('第') && response.includes('条');
    if (!hasLegalReference && input.depth !== 'basic') {
      feedback.push('建议引用相关法条支持分析结论');
    }

    // 检查分析深度
    if (input.depth === 'comprehensive' && response.length < 500) {
      feedback.push('全面分析应该提供更详细的论证和多角度分析');
    }

    return feedback.length > 0 ? feedback.join('；') : '分析质量良好';
  }

  assessProgress(dialogueHistory: AIMessage[]) {
    // 这里是简化的评估逻辑
    return {
      level: 'intermediate' as const,
      strengths: ['分析结构清晰', '逻辑推理合理'],
      improvements: ['可以加强法条引用', '增强批判性思考']
    };
  }

  private buildSystemPrompt(input: LegalAnalysisInput): string {
    const analysisDescriptions = {
      facts: '事实梳理和认定分析',
      evidence: '证据收集、质证和证明力分析',
      reasoning: '法理分析和逻辑推理',
      timeline: '时间轴构建和事件关联分析',
      claims: '请求权基础分析和构成要件审查'
    };

    const depthDescriptions = {
      basic: '基础层面分析，重点关注核心要点',
      detailed: '详细深入分析，包含充分论证',
      comprehensive: '全面综合分析，多角度深度解析'
    };

    return `你是一位资深的法律分析专家，专门负责${analysisDescriptions[input.analysisType]}。

分析要求：${depthDescriptions[input.depth]}

专业标准：
1. 逻辑清晰，层次分明
2. 客观中立，避免主观臆断
3. 准确引用法条和判例
4. 突出关键争议点和法律适用难点
5. 提供实务操作建议

${this.getSpecificAnalysisGuidelines(input.analysisType, input.depth)}

输出格式要求：
- 使用结构化的分析框架
- 重要结论用【】标记
- 法条引用格式：《法律名称》第X条
- 区分确定事实和推定事实
- 提供风险提示和建议`;
  }

  private getSpecificAnalysisGuidelines(type: string, depth: string): string {
    const guidelines = {
      facts: {
        basic: '明确区分争议事实和无争议事实，确定关键事实',
        detailed: '详细梳理事实发展脉络，分析事实的法律意义',
        comprehensive: '全面分析事实的多重含义，考虑不同解释的可能性'
      },
      evidence: {
        basic: '列举主要证据，评估基本证明力',
        detailed: '分析证据链条，评估证据的关联性和证明力',
        comprehensive: '全面评估证据体系，分析证据的充分性和必要性'
      },
      reasoning: {
        basic: '运用基本法理进行推理',
        detailed: '结合法条和判例进行深入推理',
        comprehensive: '多层次法理分析，考虑不同观点和争议'
      },
      timeline: {
        basic: '按时间顺序整理关键事件',
        detailed: '分析事件的因果关系和法律后果',
        comprehensive: '构建完整事件链条，分析时效和证据保全问题'
      },
      claims: {
        basic: '识别基本请求权类型',
        detailed: '分析请求权的构成要件',
        comprehensive: '全面审查请求权基础，分析竞合关系'
      }
    };

    const typeGuidelines = guidelines[type as keyof typeof guidelines];
    if (typeGuidelines && typeof typeGuidelines === 'object') {
      return typeGuidelines[depth as keyof typeof typeGuidelines] || '';
    }
    return '';
  }

  private buildAnalystRole(input: LegalAnalysisInput): string {
    const roleDescriptions = {
      facts: '事实认定专家',
      evidence: '证据分析专家',
      reasoning: '法理推理专家',
      timeline: '时间轴分析专家',
      claims: '请求权分析专家'
    };

    return `${roleDescriptions[input.analysisType]} - 专门负责${this.getAnalysisDescription(input.analysisType)}，具有丰富的实务经验和理论功底`;
  }

  private buildAnalysisTask(input: LegalAnalysisInput): string {
    return `请对以下文档进行${this.getAnalysisDescription(input.analysisType)}（${input.depth}级别）：

${input.specificFocus ? `特别关注：${input.specificFocus.join('、')}` : ''}

请按照专业标准进行分析，确保结论准确可靠。`;
  }

  private getAnalysisTools(analysisType: string): string[] {
    const toolMap = {
      facts: ['事实整理', '争议识别', '证据关联', '逻辑分析'],
      evidence: ['证据分类', '证明力评估', '证据链构建', '质证分析'],
      reasoning: ['法条检索', '判例研究', '逻辑推理', '论证构建'],
      timeline: ['时间轴构建', '事件关联', '因果分析', '时效计算'],
      claims: ['请求权识别', '构成要件分析', '竞合关系', '责任承担']
    };

    return toolMap[analysisType as keyof typeof toolMap] || [];
  }

  private formatPriorAnalysis(priorAnalysis?: any): string[] {
    if (!priorAnalysis) return [];

    const formatted: string[] = [];

    if (priorAnalysis.facts) {
      formatted.push(`已识别事实：${priorAnalysis.facts.join('；')}`);
    }

    if (priorAnalysis.evidence) {
      formatted.push(`已收集证据：${priorAnalysis.evidence.join('；')}`);
    }

    if (priorAnalysis.disputes) {
      formatted.push(`争议焦点：${priorAnalysis.disputes.join('；')}`);
    }

    if (priorAnalysis.timeline) {
      const timelineStr = priorAnalysis.timeline
        .map((item: any) => `${item.date}: ${item.event}`)
        .join('；');
      formatted.push(`时间轴：${timelineStr}`);
    }

    return formatted;
  }

  private formatDocumentContent(input: LegalAnalysisInput): string {
    let content = `<文档内容>\n${input.documentText}\n</文档内容>`;

    if (input.caseInfo) {
      content += '\n\n<案例信息>';
      Object.entries(input.caseInfo).forEach(([key, value]) => {
        if (value) {
          const keyMap: { [k: string]: string } = {
            caseNumber: '案号',
            court: '法院',
            parties: '当事人',
            caseType: '案件类型'
          };
          const label = keyMap[key] || key;
          const displayValue = Array.isArray(value) ? value.join('、') : value;
          content += `\n${label}：${displayValue}`;
        }
      });
      content += '\n</案例信息>';
    }

    return content;
  }

  private formatPriorAnalysisContent(priorAnalysis: any): string {
    let content = '<先前分析结果>';

    if (priorAnalysis.facts) {
      content += `\n\n已认定事实：\n${priorAnalysis.facts.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}`;
    }

    if (priorAnalysis.evidence) {
      content += `\n\n已收集证据：\n${priorAnalysis.evidence.map((e: string, i: number) => `${i + 1}. ${e}`).join('\n')}`;
    }

    if (priorAnalysis.disputes) {
      content += `\n\n争议焦点：\n${priorAnalysis.disputes.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}`;
    }

    if (priorAnalysis.timeline) {
      content += `\n\n事件时间轴：\n${priorAnalysis.timeline.map((item: any, i: number) =>
        `${i + 1}. ${item.date} - ${item.event} (${item.significance})`
      ).join('\n')}`;
    }

    content += '\n</先前分析结果>';
    return content;
  }

  private generateAnalysisInstruction(input: LegalAnalysisInput): string {
    const instructions = {
      facts: `请进行事实梳理和认定分析，要求：
1. 区分争议事实和无争议事实
2. 识别关键事实和次要事实
3. 分析事实之间的逻辑关系
4. 评估事实的证明程度`,

      evidence: `请进行证据分析，要求：
1. 分类整理所有证据
2. 评估各项证据的证明力
3. 分析证据之间的关联性
4. 识别证据缺失和补强需求`,

      reasoning: `请进行法理分析和逻辑推理，要求：
1. 确定适用的法律规范
2. 进行构成要件分析
3. 运用法律逻辑进行推理
4. 分析不同观点和争议`,

      timeline: `请构建事件时间轴并进行分析，要求：
1. 按时间顺序整理所有事件
2. 分析事件的因果关系
3. 识别关键时间节点
4. 分析时效和程序问题`,

      claims: `请进行请求权分析，要求：
1. 识别所有可能的请求权基础
2. 分析构成要件的满足情况
3. 评估请求权的竞合关系
4. 分析抗辩事由和免责情形`
    };

    return instructions[input.analysisType as keyof typeof instructions];
  }

  private getAnalysisDescription(type: string): string {
    const descriptions = {
      facts: '事实梳理和认定',
      evidence: '证据收集和分析',
      reasoning: '法理分析和推理',
      timeline: '时间轴构建和分析',
      claims: '请求权分析'
    };

    return descriptions[type as keyof typeof descriptions] || type;
  }

  private inferEducationLevel(depth: string): 'undergraduate' | 'graduate' | 'professional' {
    const mapping = {
      basic: 'undergraduate' as const,
      detailed: 'graduate' as const,
      comprehensive: 'professional' as const
    };
    return mapping[depth as keyof typeof mapping] || 'undergraduate';
  }

  private inferDocumentType(text: string): 'judgment' | 'contract' | 'statute' | 'case-brief' {
    if (text.includes('判决书') || text.includes('裁定书')) return 'judgment';
    if (text.includes('合同') || text.includes('协议书')) return 'contract';
    if (text.includes('第') && text.includes('条') && text.includes('法')) return 'statute';
    return 'case-brief';
  }

  private inferLegalDomain(text: string): string[] {
    const domains: string[] = [];

    if (text.includes('合同') || text.includes('违约')) domains.push('合同法');
    if (text.includes('侵权') || text.includes('损害赔偿')) domains.push('侵权法');
    if (text.includes('婚姻') || text.includes('离婚')) domains.push('婚姻家庭法');
    if (text.includes('公司') || text.includes('股东')) domains.push('公司法');
    if (text.includes('刑事') || text.includes('犯罪')) domains.push('刑法');
    if (text.includes('行政') || text.includes('政府')) domains.push('行政法');
    if (text.includes('劳动') || text.includes('工伤')) domains.push('劳动法');

    return domains.length > 0 ? domains : ['民法'];
  }

  private estimateChineseTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    return Math.ceil(chineseChars / 1.8) + Math.ceil(englishChars / 4);
  }
}