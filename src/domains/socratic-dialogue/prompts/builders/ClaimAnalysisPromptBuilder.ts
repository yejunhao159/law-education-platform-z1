/**
 * 请求权分析专业提示词构建器
 * 基于现有的UnifiedPromptBuilder架构
 * 为请求权分析提供专业化、结构化的AI提示词
 */

import { UnifiedPromptBuilder } from './UnifiedPromptBuilder';
import type { TimelineEvent } from '@/types/timeline-claim-analysis';

export interface ClaimAnalysisPromptConfig {
  analysisType: 'node' | 'comprehensive' | 'comparative';
  depth: 'basic' | 'detailed' | 'comprehensive';
  legalSystem: 'chinese' | 'german' | 'comparative';
  focusAreas: Array<'contractual' | 'tort' | 'enrichment' | 'property' | 'procedural'>;
  caseContext: {
    caseType: string;
    parties: string[];
    jurisdiction: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export interface NodeAnalysisContext {
  currentEvent: TimelineEvent;
  precedingEvents: TimelineEvent[];
  followingEvents: TimelineEvent[];
  contractualBackground?: {
    contractType: string;
    mainObligations: string[];
    performanceStatus: string;
  };
  tortBackground?: {
    allegedWrongfulAct: string;
    damageType: string;
    causalityIssues: string[];
  };
}

/**
 * 请求权分析提示词构建器
 */
export class ClaimAnalysisPromptBuilder extends UnifiedPromptBuilder {

  /**
   * 构建节点级请求权分析提示词
   */
  buildNodeClaimPrompt(
    context: NodeAnalysisContext,
    config: ClaimAnalysisPromptConfig
  ): string {
    return this.buildPrompt({
      systemRole: this.buildSystemRole(config),
      methodology: this.buildAnalysisMethodology(config),
      caseContext: this.buildCaseContextSection(config.caseContext),
      currentNode: this.buildCurrentNodeSection(context.currentEvent),
      temporalContext: this.buildTemporalContextSection(context),
      analysisFramework: this.buildAnalysisFramework(config),
      outputRequirements: this.buildOutputRequirements(config),
      qualityControls: this.buildQualityControls()
    });
  }

  /**
   * 构建综合请求权分析提示词
   */
  buildComprehensiveClaimPrompt(
    events: TimelineEvent[],
    config: ClaimAnalysisPromptConfig
  ): string {
    return this.buildPrompt({
      systemRole: this.buildSystemRole(config),
      methodology: this.buildAnalysisMethodology(config),
      caseContext: this.buildCaseContextSection(config.caseContext),
      timelineOverview: this.buildTimelineOverviewSection(events),
      analysisFramework: this.buildComprehensiveAnalysisFramework(config),
      outputRequirements: this.buildComprehensiveOutputRequirements(config),
      qualityControls: this.buildQualityControls()
    });
  }

  /**
   * 构建证据评估提示词
   */
  buildEvidenceAssessmentPrompt(
    event: TimelineEvent,
    config: ClaimAnalysisPromptConfig
  ): string {
    return this.buildPrompt({
      systemRole: this.buildEvidenceExpertRole(),
      methodology: this.buildEvidenceMethodology(),
      eventAnalysis: this.buildEventEvidenceSection(event),
      evidenceFramework: this.buildEvidenceFramework(),
      outputRequirements: this.buildEvidenceOutputRequirements(),
      qualityControls: this.buildEvidenceQualityControls()
    });
  }

  // ========== 私有构建方法 ==========

  /**
   * 构建系统角色定义
   */
  private buildSystemRole(config: ClaimAnalysisPromptConfig): string {
    const systemRoles = {
      chinese: '你是一位精通中国民法典和相关法律法规的资深法官和法学教授',
      german: '你是一位精通德国民法典（BGB）和德国法学请求权分析法（Anspruchsmethode）的专业法官和法学教授',
      comparative: '你是一位精通中德比较法的国际法学专家'
    };

    const expertiseAreas = [
      '请求权基础识别与分析',
      '构成要件逐一检验',
      '排除消灭事由评估',
      '举证责任分配',
      '请求权竞合处理'
    ];

    return `${systemRoles[config.legalSystem]}，在以下领域具有深厚造诣：
${expertiseAreas.map(area => `• ${area}`).join('\n')}

你的分析必须：
✓ 严格遵循法律逻辑和分析方法
✓ 提供准确的法条引用和法理依据
✓ 考虑实务中的常见问题和解决路径
✓ 保持客观中立的专业判断`;
  }

  /**
   * 构建分析方法论
   */
  private buildAnalysisMethodology(config: ClaimAnalysisPromptConfig): string {
    const methodologies = {
      chinese: this.buildChineseMethodology(),
      german: this.buildGermanMethodology(),
      comparative: this.buildComparativeMethodology()
    };

    return `## 分析方法论

${methodologies[config.legalSystem]}

### 分析深度要求
${this.buildDepthRequirements(config.depth)}`;
  }

  /**
   * 构建中国法方法论
   */
  private buildChineseMethodology(): string {
    return `### 中国民法请求权分析方法

按照以下步骤进行系统分析：

1. **请求权基础识别**
   - 合同请求权（民法典合同编）
   - 侵权请求权（民法典侵权责任编）
   - 不当得利请求权（民法典第三编）
   - 无因管理请求权（民法典第三编）
   - 物权请求权（民法典物权编）

2. **构成要件检验**
   - 逐一检验法定构成要件
   - 分析事实与法律的符合程度
   - 识别争议焦点和证明难点

3. **抗辩事由考量**
   - 实体抗辩（履行、抵销、混同等）
   - 程序抗辩（管辖、时效等）
   - 特殊抗辩（不可抗力、情势变更等）

4. **请求权竞合处理**
   - 按照《民法典》第186条等规定
   - 分析各请求权的优劣势
   - 确定最优诉讼策略`;
  }

  /**
   * 构建德国法方法论
   */
  private buildGermanMethodology(): string {
    return `### 德国法学请求权分析法（Anspruchsmethode）

严格按照以下经典步骤：

1. **请求权基础（Anspruchsgrundlage）**
   - § 433 I BGB (买卖合同)
   - § 823 I BGB (一般侵权)
   - § 812 I S.1 BGB (不当得利)
   - § 985 BGB (所有物返还请求权)

2. **构成要件（Tatbestandsmerkmale）**
   - 客观构成要件逐一检验
   - 主观构成要件分析
   - 因果关系链条确认

3. **排除和消灭事由（Einwendungen und Einreden）**
   - 合同无效、可撤销
   - 履行、抵销、免除
   - 诉讼时效（Verjährung）

4. **请求权竞合（Anspruchskonkurrenz）**
   - 按照判例法规则处理
   - 考虑特别法优于一般法原则`;
  }

  /**
   * 构建比较法方法论
   */
  private buildComparativeMethodology(): string {
    return `### 中德比较法分析方法

1. **体系比较**
   - 中国民法典 vs 德国民法典（BGB）
   - 成文法传统的共同特征
   - 具体制度设计的差异

2. **方法论比较**
   - 中国的请求权分析方法
   - 德国的Anspruchsmethode
   - 两者的融合与互鉴

3. **实务应用比较**
   - 判例法的作用差异
   - 举证责任分配的不同
   - 救济措施的异同`;
  }

  /**
   * 构建深度要求
   */
  private buildDepthRequirements(depth: 'basic' | 'detailed' | 'comprehensive'): string {
    const requirements = {
      basic: [
        '识别主要请求权类型',
        '简要分析构成要件',
        '提出初步法律意见'
      ],
      detailed: [
        '全面识别所有可能的请求权',
        '详细检验每个构成要件',
        '分析主要抗辩事由',
        '提供举证责任指导',
        '给出实务操作建议'
      ],
      comprehensive: [
        '穷尽性请求权识别',
        '深入的构成要件论证',
        '全面的抗辩事由分析',
        '详细的举证责任分配',
        '请求权竞合的深度分析',
        '类案检索和比较研究',
        '风险评估和策略建议'
      ]
    };

    return requirements[depth].map(req => `• ${req}`).join('\n');
  }

  /**
   * 构建案例上下文部分
   */
  private buildCaseContextSection(caseContext: ClaimAnalysisPromptConfig['caseContext']): string {
    return `## 案例背景信息

**案件类型**: ${caseContext.caseType}
**当事人**: ${caseContext.parties.join(' vs ')}
**管辖法院**: ${caseContext.jurisdiction}
**争议时期**: ${caseContext.dateRange.start} 至 ${caseContext.dateRange.end}

### 案例特征分析
基于以上信息，本案的法律关系性质和争议焦点预判...`;
  }

  /**
   * 构建当前节点分析部分
   */
  private buildCurrentNodeSection(event: TimelineEvent): string {
    return `## 当前分析节点

**发生日期**: ${event.date}
**事件标题**: ${event.title}
**事件描述**: ${event.description}
**事件重要性**: ${event.importance || '普通'}
**事件类型**: ${event.type}
**参与主体**: ${event.actor || '待确认'}

### 节点法律意义初判
该事件在整个案件时间轴中的法律地位...`;
  }

  /**
   * 构建时间上下文部分
   */
  private buildTemporalContextSection(context: NodeAnalysisContext): string {
    let temporalContext = '';

    if (context.precedingEvents.length > 0) {
      temporalContext += `### 前序事件脉络\n`;
      context.precedingEvents.forEach((event, index) => {
        temporalContext += `${index + 1}. ${event.date}: ${event.title}\n`;
      });
      temporalContext += '\n';
    }

    if (context.followingEvents.length > 0) {
      temporalContext += `### 后续事件影响\n`;
      context.followingEvents.forEach((event, index) => {
        temporalContext += `${index + 1}. ${event.date}: ${event.title}\n`;
      });
      temporalContext += '\n';
    }

    return temporalContext;
  }

  /**
   * 构建分析框架
   */
  private buildAnalysisFramework(config: ClaimAnalysisPromptConfig): string {
    return `## 分析框架要求

### 必须分析的维度
${config.focusAreas.map(area => {
      const areaDescriptions = {
        contractual: '合同请求权分析',
        tort: '侵权请求权分析',
        enrichment: '不当得利请求权分析',
        property: '物权请求权分析',
        procedural: '程序性问题分析'
      };
      return `• **${areaDescriptions[area]}**: 详细分析该类请求权的适用性`;
    }).join('\n')}

### 分析质量标准
• 法条引用准确完整
• 构成要件检验细致
• 争议点识别准确
• 举证责任分配清晰
• 实务操作性强`;
  }

  /**
   * 构建输出要求
   */
  private buildOutputRequirements(config: ClaimAnalysisPromptConfig): string {
    return `## 输出格式要求

请严格按照以下JSON结构输出分析结果：

\`\`\`json
{
  "nodeAnalysis": {
    "eventSummary": {
      "date": "事件日期",
      "title": "事件标题",
      "legalCharacterization": "法律性质定性"
    },
    "claimBasisAnalysis": {
      "contractualClaims": [
        {
          "legalBasis": "具体法条（如：民法典第563条）",
          "description": "请求权内容描述",
          "applicability": "high|medium|low|none",
          "elements": [
            {
              "name": "构成要件名称",
              "satisfied": true|false,
              "evidence": "证据要求",
              "disputed": true|false
            }
          ],
          "reasoning": "适用性分析理由"
        }
      ],
      "tortClaims": [...],
      "enrichmentClaims": [...],
      "propertyClaims": [...]
    },
    "constitutiveElements": {
      "satisfied": [...],
      "disputed": [...],
      "missing": [...]
    },
    "defenses": {
      "substantiveDefenses": [...],
      "proceduralDefenses": [...],
      "limitationDefenses": [...]
    },
    "burdenOfProof": {
      "claimantBurden": [...],
      "respondentBurden": [...],
      "courtInquiry": [...]
    },
    "strategicAssessment": {
      "strengths": [...],
      "weaknesses": [...],
      "recommendations": [...]
    }
  }
}
\`\`\``;
  }

  /**
   * 构建质量控制要求
   */
  private buildQualityControls(): string {
    return `## 质量控制检查清单

分析完成前，请自我检查以下各项：

### 法律准确性
□ 法条引用准确无误
□ 法理阐述符合通说
□ 构成要件分析完整

### 逻辑一致性
□ 分析步骤逻辑清晰
□ 结论与论证过程一致
□ 各部分分析相互呼应

### 实务导向
□ 考虑了实务中的常见问题
□ 提供了可操作的建议
□ 识别了关键的争议点

### 表述规范
□ 使用准确的法律术语
□ 避免模糊或含混表述
□ JSON格式严格规范`;
  }

  // ========== 证据分析相关方法 ==========

  /**
   * 构建证据专家角色
   */
  private buildEvidenceExpertRole(): string {
    return `你是一位精通证据法和民事诉讼法的资深法官，在证据审查、认定和运用方面具有丰富的实务经验。

专业领域：
• 证据的三性审查（真实性、关联性、合法性）
• 证据证明力评估
• 举证责任分配
• 证据链条完整性分析
• 证据保全和收集指导`;
  }

  /**
   * 构建证据分析方法论
   */
  private buildEvidenceMethodology(): string {
    return `## 证据分析方法论

### 证据三性审查标准
1. **真实性审查**
   - 证据来源的可靠性
   - 证据内容的客观性
   - 是否存在伪造、变造情形

2. **关联性审查**
   - 与待证事实的逻辑关联
   - 证明价值的大小
   - 证明方向的明确性

3. **合法性审查**
   - 取证程序的合法性
   - 证据形式的规范性
   - 是否违反法定禁止性规定

### 证明力评估框架
- 直接证据 vs 间接证据
- 原始证据 vs 传来证据
- 单一证据 vs 证据群组
- 证据之间的相互印证`;
  }

  /**
   * 构建事件证据分析部分
   */
  private buildEventEvidenceSection(event: TimelineEvent): string {
    return `## 目标事件证据分析

**事件**: ${event.title}
**日期**: ${event.date}
**描述**: ${event.description}

### 现有证据材料
${event.evidenceInfo ? `
- 证据类型: ${event.evidenceInfo.evidenceType}
- 证据强度: ${event.evidenceInfo.strength}
- 可采纳性: ${event.evidenceInfo.admissibility ? '是' : '否'}
- 真实性状态: ${event.evidenceInfo.authenticity}
` : '待收集和整理'}

### 待证事实清单
基于该事件在案件中的法律意义，需要证明的事实...`;
  }

  /**
   * 构建证据分析框架
   */
  private buildEvidenceFramework(): string {
    return `## 证据分析框架

### 分析维度
1. **证据充分性评估**
   - 是否足以证明目标事实
   - 证明标准的达成度
   - 证据缺口识别

2. **证据质量评估**
   - 证据来源的权威性
   - 证据内容的完整性
   - 证据形式的规范性

3. **证据策略建议**
   - 证据收集的优先级
   - 证据保全的必要性
   - 证据运用的技巧`;
  }

  /**
   * 构建证据输出要求
   */
  private buildEvidenceOutputRequirements(): string {
    return `## 证据分析输出格式

\`\`\`json
{
  "evidenceAssessment": {
    "eventId": "事件ID",
    "evidenceInventory": [...],
    "threePropertiesAnalysis": {
      "authenticity": {...},
      "relevance": {...},
      "legality": {...}
    },
    "probativeValue": {...},
    "evidenceGaps": [...],
    "collectionStrategy": [...]
  }
}
\`\`\``;
  }

  /**
   * 构建证据质量控制
   */
  private buildEvidenceQualityControls(): string {
    return `## 证据分析质量控制

### 检查要点
□ 证据三性分析全面
□ 证明力评估客观
□ 证据缺口识别准确
□ 收集建议具有可操作性
□ 符合证据法基本原理`;
  }

  // ========== 工具方法 ==========

  /**
   * 构建综合分析框架
   */
  private buildComprehensiveAnalysisFramework(config: ClaimAnalysisPromptConfig): string {
    return `## 综合分析框架

### 时间轴整体分析
• 请求权产生、变更、消灭的时间节点
• 证据材料的时间分布和逻辑关联
• 诉讼时效的起算和中断情况

### 当事人行为分析
• 各方当事人的权利义务履行情况
• 违约或侵权行为的认定
• 损害结果和因果关系链条

### 救济措施评估
• 可选择的救济方式
• 各种救济措施的效果比较
• 执行可能性评估`;
  }

  /**
   * 构建综合输出要求
   */
  private buildComprehensiveOutputRequirements(config: ClaimAnalysisPromptConfig): string {
    return `## 综合分析输出要求

\`\`\`json
{
  "comprehensiveAnalysis": {
    "executiveSummary": {...},
    "timelineAnalysis": [...],
    "claimsMatrix": {...},
    "evidenceChainAnalysis": {...},
    "strategicRecommendations": [...],
    "riskAssessment": {...}
  }
}
\`\`\``;
  }

  /**
   * 构建时间轴概览部分
   */
  private buildTimelineOverviewSection(events: TimelineEvent[]): string {
    return `## 时间轴事件概览

${events.map((event, index) =>
  `**${index + 1}. ${event.date}** - ${event.title}
   ${event.description}
   ${event.importance ? `[重要性: ${event.importance}]` : ''}
`).join('\n')}

### 时间轴特征分析
• 总事件数: ${events.length}
• 时间跨度: ${events[0]?.date} - ${events[events.length - 1]?.date}
• 关键节点识别...`;
  }
}

/**
 * 便捷函数导出
 */
export function createClaimAnalysisPrompt(
  context: NodeAnalysisContext,
  config: ClaimAnalysisPromptConfig
): string {
  const builder = new ClaimAnalysisPromptBuilder();
  return builder.buildNodeClaimPrompt(context, config);
}

/**
 * 单例实例导出
 */
export const claimAnalysisPromptBuilder = new ClaimAnalysisPromptBuilder();