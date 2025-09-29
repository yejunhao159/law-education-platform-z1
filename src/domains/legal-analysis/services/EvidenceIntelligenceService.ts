/**
 * 证据智能分析服务
 * 基于AI和规则引擎的证据质量评估、关联分析和学习建议生成
 * 整合现有EvidenceMappingService的基础功能，提供AI增强能力
 * 已迁移至统一AI调用代理模式 - Issue #21
 */

import { createLogger } from '@/lib/logging';
import { EvidenceMappingService, type EvidenceMapping } from '@/lib/evidence-mapping-service';
import type { Evidence } from '@/types/evidence';
import { normalizeEvidenceList } from '@/utils/evidence-adapter';
import { callUnifiedAI } from '../../../infrastructure/ai/AICallProxy';
import type {
  ClaimElement
} from '@/types/dispute-evidence';

const logger = createLogger('EvidenceIntelligenceService');

// 证据质量评估结果
export interface EvidenceQualityAssessment {
  evidenceId: string;
  overallScore: number; // 0-1 综合质量分数
  dimensions: {
    authenticity: number;    // 真实性
    relevance: number;       // 相关性
    admissibility: number;   // 可采性
    probativeValue: number;  // 证明力
  };
  strengths: string[];       // 优势分析
  weaknesses: string[];      // 劣势分析
  suggestions: string[];     // 改进建议
  confidence: number;        // AI分析置信度
}

// 证据链分析结果
export interface EvidenceChainAnalysis {
  chainId: string;
  claimElementId: string;
  evidenceSequence: string[]; // 证据序列
  logicalConsistency: number; // 逻辑一致性 0-1
  completeness: number;       // 完整性 0-1
  criticalGaps: string[];     // 关键缺口
  redundancies: string[];     // 冗余证据
  reinforcements: {           // 相互佐证关系
    evidenceId1: string;
    evidenceId2: string;
    reinforcementStrength: number;
    reasoning: string;
  }[];
  aiAssessment: string;       // AI综合评估
}

// 证据学习问题生成配置
export interface EvidenceLearningConfig {
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
  focusAreas: ('relevance' | 'admissibility' | 'probative-value' | 'authentication' | 'chain-of-custody')[];
  questionTypes: ('single-choice' | 'multiple-choice' | 'true-false' | 'case-analysis')[];
  maxQuestions: number;
  includeExplanations: boolean;
  contextClaimElement?: string; // 针对特定请求权要素
}

// 证据学习问题
export interface EvidenceLearningQuestion {
  id: string;
  type: 'single-choice' | 'multiple-choice' | 'true-false' | 'case-analysis';
  level: 'beginner' | 'intermediate' | 'advanced';
  focusArea: string;
  question: string;
  options?: string[];          // 选择题选项
  correctAnswer: string | string[]; // 正确答案
  explanation: string;         // 详细解释
  relatedEvidence: string[];   // 相关证据ID
  legalBasis: string[];        // 法条依据
  teachingPoints: string[];    // 教学要点
  difficulty: number;          // 难度系数 0-1
}

// AI请求配置
interface AIServiceConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export class EvidenceIntelligenceService {
  private mappingService: EvidenceMappingService;
  private aiConfig: AIServiceConfig;

  constructor() {
    this.mappingService = new EvidenceMappingService();
    this.aiConfig = {
      apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: 'deepseek-chat',
      temperature: 0.3, // 较低温度保证分析的一致性
      maxTokens: 2000
    };
  }

  /**
   * 智能证据质量评估
   * 结合AI分析和规则引擎
   */
  async assessEvidenceQuality(evidence: Evidence[], caseContext: any): Promise<EvidenceQualityAssessment[]> {
    try {
      logger.info('开始智能证据质量评估', {
        evidenceCount: evidence.length,
        caseType: caseContext.basicInfo?.caseType
      });

      // 规范化证据数据，确保类型一致性
      const normalizedEvidence = normalizeEvidenceList(evidence);

      logger.info('证据数据规范化完成', {
        originalCount: evidence.length,
        normalizedCount: normalizedEvidence.length
      });

      const assessments: EvidenceQualityAssessment[] = [];

      for (const evidenceItem of normalizedEvidence) {
        // 基础规则评估
        const baseAssessment = this.performRuleBasedAssessment(evidenceItem, caseContext);

        // AI增强评估
        const aiEnhancement = await this.performAIEvidenceAssessment(evidenceItem, caseContext);

        // 综合评估结果
        const finalAssessment: EvidenceQualityAssessment = {
          evidenceId: evidenceItem.id,
          overallScore: this.calculateOverallScore(baseAssessment, aiEnhancement),
          dimensions: {
            authenticity: this.blendScores(baseAssessment.authenticity, aiEnhancement.authenticity),
            relevance: this.blendScores(baseAssessment.relevance, aiEnhancement.relevance),
            admissibility: this.blendScores(baseAssessment.admissibility, aiEnhancement.admissibility),
            probativeValue: this.blendScores(baseAssessment.probativeValue, aiEnhancement.probativeValue)
          },
          strengths: [...baseAssessment.strengths, ...aiEnhancement.strengths].slice(0, 5),
          weaknesses: [...baseAssessment.weaknesses, ...aiEnhancement.weaknesses].slice(0, 5),
          suggestions: [...baseAssessment.suggestions, ...aiEnhancement.suggestions].slice(0, 3),
          confidence: aiEnhancement.confidence
        };

        assessments.push(finalAssessment);
      }

      logger.info('智能证据质量评估完成', {
        assessedCount: assessments.length,
        averageScore: assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length
      });

      return assessments;

    } catch (error) {
      logger.error('智能证据质量评估失败', error);
      throw new Error(`证据质量评估失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 证据链智能分析
   * 分析证据之间的逻辑关系和证明链条
   */
  async analyzeEvidenceChains(
    evidence: Evidence[],
    claimElements: ClaimElement[],
    caseContext: any
  ): Promise<EvidenceChainAnalysis[]> {
    try {
      logger.info('开始证据链智能分析');

      // 规范化证据数据，确保类型一致性
      const normalizedEvidence = normalizeEvidenceList(evidence);

      logger.info('证据链分析数据规范化完成', {
        originalCount: evidence.length,
        normalizedCount: normalizedEvidence.length
      });

      const chains: EvidenceChainAnalysis[] = [];

      for (const element of claimElements) {
        // 找到与该请求权要素相关的证据
        const relevantEvidence = normalizedEvidence.filter(e => {
          const relevance = this.mappingService.calculateRelevance(e, element);
          return relevance > 0.3;
        });

        if (relevantEvidence.length === 0) continue;

        // 构建证据序列
        const evidenceSequence = this.buildEvidenceSequence(relevantEvidence, element);

        // AI分析证据链
        const aiChainAnalysis = await this.performAIChainAnalysis(
          relevantEvidence,
          element,
          caseContext
        );

        const chainAnalysis: EvidenceChainAnalysis = {
          chainId: `chain-${element.id}`,
          claimElementId: element.id,
          evidenceSequence: evidenceSequence.map(e => e.id),
          logicalConsistency: aiChainAnalysis.logicalConsistency,
          completeness: aiChainAnalysis.completeness,
          criticalGaps: aiChainAnalysis.criticalGaps,
          redundancies: aiChainAnalysis.redundancies,
          reinforcements: aiChainAnalysis.reinforcements,
          aiAssessment: aiChainAnalysis.assessment
        };

        chains.push(chainAnalysis);
      }

      logger.info('证据链智能分析完成', {
        chainsAnalyzed: chains.length
      });

      return chains;

    } catch (error) {
      logger.error('证据链智能分析失败', error);
      throw new Error(`证据链分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 智能生成证据学习问题
   * 基于案例证据生成针对性学习题目
   */
  async generateEvidenceLearningQuestions(
    evidence: Evidence[],
    claimElements: ClaimElement[],
    caseContext: any,
    config: EvidenceLearningConfig
  ): Promise<EvidenceLearningQuestion[]> {
    try {
      logger.info('开始生成证据学习问题', {
        evidenceCount: evidence.length,
        targetLevel: config.targetLevel,
        maxQuestions: config.maxQuestions
      });

      // 规范化证据数据，确保类型一致性
      const normalizedEvidence = normalizeEvidenceList(evidence);

      logger.info('学习问题生成数据规范化完成', {
        originalCount: evidence.length,
        normalizedCount: normalizedEvidence.length
      });

      // 构建AI提示词
      const prompt = this.buildLearningQuestionPrompt(normalizedEvidence, claimElements, caseContext, config);

      // 调用AI生成问题
      const aiResponse = await this.callAIService(prompt);

      // 解析AI响应
      const questions = this.parseLearningQuestions(aiResponse, normalizedEvidence, config);

      logger.info('证据学习问题生成完成', {
        generatedCount: questions.length,
        levelDistribution: this.getQuestionLevelDistribution(questions)
      });

      return questions;

    } catch (error) {
      logger.error('证据学习问题生成失败', error);
      // 使用规范化后的证据生成备选问题
      const normalizedEvidenceForFallback = normalizeEvidenceList(evidence);
      return this.generateFallbackQuestions(normalizedEvidenceForFallback, config);
    }
  }

  /**
   * 基于规则的证据评估
   */
  private performRuleBasedAssessment(evidence: Evidence, caseContext: any): any {
    // 基础规则评估逻辑
    const baseScores = {
      authenticity: 0.7,
      relevance: 0.6,
      admissibility: 0.8,
      probativeValue: 0.6
    };

    // 根据证据类型调整分数（使用新的标准证据类型）
    switch (evidence.type) {
      case 'documentary':  // 书证（原contract/document）
        baseScores.authenticity = 0.9;
        baseScores.admissibility = 0.9;
        break;
      case 'testimonial':  // 证人证言（原testimony）
        baseScores.authenticity = 0.6;
        baseScores.probativeValue = 0.7;
        break;
      case 'physical':     // 物证
        baseScores.authenticity = 0.8;
        baseScores.probativeValue = 0.8;
        break;
      case 'expert':       // 鉴定意见
        baseScores.authenticity = 0.9;
        baseScores.probativeValue = 0.9;
        break;
      case 'audio_visual': // 视听资料
        baseScores.authenticity = 0.7;
        baseScores.probativeValue = 0.8;
        break;
      case 'electronic':   // 电子数据
        baseScores.authenticity = 0.6;
        baseScores.probativeValue = 0.7;
        break;
      case 'party_statement': // 当事人陈述
        baseScores.authenticity = 0.5;
        baseScores.probativeValue = 0.6;
        break;
      case 'inspection':   // 勘验笔录
        baseScores.authenticity = 0.8;
        baseScores.probativeValue = 0.8;
        break;
    }

    return {
      ...baseScores,
      strengths: this.identifyRuleBasedStrengths(evidence),
      weaknesses: this.identifyRuleBasedWeaknesses(evidence),
      suggestions: this.generateRuleBasedSuggestions(evidence)
    };
  }

  /**
   * AI增强证据评估
   */
  private async performAIEvidenceAssessment(evidence: Evidence, caseContext: any): Promise<any> {
    const prompt = `你是一位资深的证据法专家。请对以下证据进行专业分析：

证据信息：
- ID: ${evidence.id}
- 类型: ${evidence.type}
- 内容: ${evidence.content}

案件背景：
- 案件类型: ${caseContext.basicInfo?.caseType || '民事纠纷'}
- 争议焦点: ${caseContext.disputes?.map((d: any) => d.content).join('、') || '待分析'}

请从以下四个维度进行评估（0-1分）：
1. 真实性(authenticity): 证据的可信度和真实性
2. 相关性(relevance): 与案件争议的关联程度
3. 可采性(admissibility): 是否符合证据规则要求
4. 证明力(probativeValue): 对争议事实的证明价值

同时请分析：
- 优势(strengths): 该证据的突出优点
- 劣势(weaknesses): 存在的问题或不足
- 建议(suggestions): 如何更好地运用该证据

请以JSON格式返回：
{
  "authenticity": 0.8,
  "relevance": 0.7,
  "admissibility": 0.9,
  "probativeValue": 0.6,
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
  "confidence": 0.85
}`;

    try {
      const response = await this.callAIService(prompt);

      // 处理markdown包装的JSON响应
      let jsonContent = response;
      if (response.includes('```json')) {
        const match = response.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      return JSON.parse(jsonContent);
    } catch (error) {
      logger.warn('AI证据评估解析失败，使用默认值', error);
      return {
        authenticity: 0.7,
        relevance: 0.6,
        admissibility: 0.8,
        probativeValue: 0.6,
        strengths: ['基础证据材料'],
        weaknesses: ['需要进一步核实'],
        suggestions: ['建议补强相关证据'],
        confidence: 0.5
      };
    }
  }

  /**
   * AI证据链分析
   */
  private async performAIChainAnalysis(evidence: Evidence[], element: ClaimElement, caseContext: any): Promise<any> {
    const prompt = `作为证据法专家，请分析以下证据链的逻辑完整性：

请求权要素：${element.name} - ${element.description}

相关证据：
${evidence.map((e, i) => `${i+1}. ${e.id}: ${e.content}`).join('\n')}

请分析：
1. 逻辑一致性(0-1): 证据之间是否存在逻辑矛盾
2. 完整性(0-1): 证据链是否足以证明该要素
3. 关键缺口: 缺少哪些关键证据
4. 冗余证据: 哪些证据存在重复
5. 相互佐证关系: 证据之间的相互支持关系

JSON格式返回：
{
  "logicalConsistency": 0.8,
  "completeness": 0.7,
  "criticalGaps": ["缺口1", "缺口2"],
  "redundancies": ["冗余证据1"],
  "reinforcements": [
    {
      "evidenceId1": "证据1",
      "evidenceId2": "证据2",
      "reinforcementStrength": 0.8,
      "reasoning": "相互佐证原因"
    }
  ],
  "assessment": "综合评估意见"
}`;

    try {
      const response = await this.callAIService(prompt);

      // 处理markdown包装的JSON响应
      let jsonContent = response;
      if (response.includes('```json')) {
        const match = response.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      return JSON.parse(jsonContent);
    } catch (error) {
      return {
        logicalConsistency: 0.7,
        completeness: 0.6,
        criticalGaps: ['需要补充关键证据'],
        redundancies: [],
        reinforcements: [],
        assessment: '证据链基本完整，建议进一步补强'
      };
    }
  }

  /**
   * 构建学习问题生成提示词
   */
  private buildLearningQuestionPrompt(
    evidence: Evidence[],
    claimElements: ClaimElement[],
    caseContext: any,
    config: EvidenceLearningConfig
  ): string {
    return `你是一位经验丰富的法学教育专家，请基于以下真实案例材料设计证据法学习题目：

案例背景：
- 案件类型：${caseContext.basicInfo?.caseType || '民事纠纷'}
- 案件概要：${caseContext.basicInfo?.summary || '待补充'}

证据材料：
${evidence.map((e, i) => `${i+1}. 【${e.type}】${e.id}：${e.content.substring(0, 200)}...`).join('\n')}

请求权要素：
${claimElements.map((e, i) => `${i+1}. ${e.name}：${e.description}`).join('\n')}

出题要求：
- 难度级别：${config.targetLevel}
- 关注领域：${config.focusAreas.join('、')}
- 题目类型：${config.questionTypes.join('、')}
- 题目数量：${config.maxQuestions}题
- 需要解释：${config.includeExplanations ? '是' : '否'}

请严格按照以下JSON格式输出题目：
{
  "questions": [
    {
      "id": "q1",
      "type": "single-choice",
      "level": "intermediate",
      "focusArea": "relevance",
      "question": "具体题目内容？",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "correctAnswer": "A",
      "explanation": "详细解释为什么选择A...",
      "relatedEvidence": ["evidence-1"],
      "legalBasis": ["《民事诉讼法》第63条"],
      "teachingPoints": ["证据相关性原则"],
      "difficulty": 0.6
    }
  ]
}

要求：
1. 题目必须基于提供的真实证据材料
2. 选项设计要有迷惑性但不能误导学生
3. 解释要详细专业，包含法条依据
4. 难度要符合指定级别要求
5. 每道题都要明确教学目标`;
  }

  /**
   * 解析AI生成的学习问题
   */
  private parseLearningQuestions(aiResponse: string, evidence: Evidence[], config: EvidenceLearningConfig): EvidenceLearningQuestion[] {
    try {
      // 处理markdown包装的JSON响应
      let jsonContent = aiResponse;
      if (aiResponse.includes('```json')) {
        const match = aiResponse.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      const parsed = JSON.parse(jsonContent);

      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions.map((q: any, index: number) => ({
          id: q.id || `question-${index + 1}`,
          type: q.type || 'single-choice',
          level: q.level || config.targetLevel,
          focusArea: q.focusArea || config.focusAreas[0],
          question: q.question || `基于证据${index + 1}的问题`,
          options: q.options || ['选项A', '选项B', '选项C', '选项D'],
          correctAnswer: q.correctAnswer || 'A',
          explanation: q.explanation || '详细解释',
          relatedEvidence: Array.isArray(q.relatedEvidence) ? q.relatedEvidence : [evidence[0]?.id || 'unknown'],
          legalBasis: Array.isArray(q.legalBasis) ? q.legalBasis : ['相关法条'],
          teachingPoints: Array.isArray(q.teachingPoints) ? q.teachingPoints : ['教学要点'],
          difficulty: typeof q.difficulty === 'number' ? q.difficulty : 0.5
        }));
      }
    } catch (parseError) {
      logger.warn('AI学习问题解析失败', parseError);
    }

    return this.generateFallbackQuestions(evidence, config);
  }

  /**
   * 生成备选学习问题
   */
  private generateFallbackQuestions(evidence: Evidence[], config: EvidenceLearningConfig): EvidenceLearningQuestion[] {
    return evidence.slice(0, Math.min(3, config.maxQuestions)).map((e, index) => ({
      id: `fallback-q${index + 1}`,
      type: 'single-choice',
      level: config.targetLevel,
      focusArea: config.focusAreas[0] || 'relevance',
      question: `关于证据"${e.id}"，以下说法正确的是？`,
      options: [
        '该证据与案件争议直接相关',
        '该证据缺乏足够的证明力',
        '该证据存在真实性问题',
        '该证据不符合证据规则要求'
      ],
      correctAnswer: 'A',
      explanation: `证据"${e.id}"作为${e.type}类证据，与案件争议具有直接关联性，符合证据相关性要求。`,
      relatedEvidence: [e.id],
      legalBasis: ['《民事诉讼法》第63条'],
      teachingPoints: ['证据相关性判断'],
      difficulty: 0.5
    }));
  }

  /**
   * 辅助方法：调用AI服务
   * 使用统一的AICallProxy，确保与系统其他部分的一致性
   */
  private async callAIService(prompt: string): Promise<string> {
    try {
      const systemPrompt = '你是一位专业的法律证据分析专家，精通证据法和司法实践。';

      logger.info('调用统一AI服务', {
        promptLength: prompt.length,
        model: this.aiConfig.model
      });

      const result = await callUnifiedAI(
        systemPrompt,
        prompt,
        {
          temperature: this.aiConfig.temperature,
          maxTokens: this.aiConfig.maxTokens,
          responseFormat: 'text'
        }
      );

      if (!result.content) {
        throw new Error('AI API返回空内容');
      }

      logger.info('AI服务调用成功', {
        promptLength: prompt.length,
        responseLength: result.content.length,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        model: result.model
      });

      return result.content;
    } catch (error) {
      logger.error('AI调用失败:', error);
      throw new Error(`AI API调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }


  /**
   * 辅助方法：计算综合分数
   */
  private calculateOverallScore(baseAssessment: any, aiEnhancement: any): number {
    const baseDimensions = baseAssessment;
    const aiDimensions = aiEnhancement;

    const weightedScore =
      this.blendScores(baseDimensions.authenticity, aiDimensions.authenticity) * 0.25 +
      this.blendScores(baseDimensions.relevance, aiDimensions.relevance) * 0.30 +
      this.blendScores(baseDimensions.admissibility, aiDimensions.admissibility) * 0.20 +
      this.blendScores(baseDimensions.probativeValue, aiDimensions.probativeValue) * 0.25;

    return Math.min(Math.max(weightedScore, 0), 1);
  }

  /**
   * 辅助方法：混合分数
   */
  private blendScores(ruleScore: number, aiScore: number): number {
    // 规则分数权重40%，AI分数权重60%
    return ruleScore * 0.4 + aiScore * 0.6;
  }

  /**
   * 辅助方法：构建证据序列
   */
  private buildEvidenceSequence(evidence: Evidence[], element: ClaimElement): Evidence[] {
    // 按照证据类型和相关性排序
    return evidence.sort((a, b) => {
      const relevanceA = this.mappingService.calculateRelevance(a, element);
      const relevanceB = this.mappingService.calculateRelevance(b, element);
      return relevanceB - relevanceA;
    });
  }

  /**
   * 辅助方法：基于规则的优势识别
   */
  private identifyRuleBasedStrengths(evidence: Evidence): string[] {
    const strengths: string[] = [];

    // 根据新的标准证据类型识别优势
    if (evidence.type === 'documentary') {
      strengths.push('书证证据，证明力相对较强');
    }
    if (evidence.type === 'expert') {
      strengths.push('专业鉴定意见，权威性较高');
    }
    if (evidence.type === 'physical') {
      strengths.push('物证直观性强，不易篡改');
    }
    if (evidence.type === 'inspection') {
      strengths.push('勘验笔录具有现场性，证明力强');
    }
    if (evidence.content.length > 100) {
      strengths.push('内容详细，信息丰富');
    }
    if (evidence.relatedEvents && evidence.relatedEvents.length > 0) {
      strengths.push(`关联了${evidence.relatedEvents.length}个时间轴事件，逻辑完整`);
    }

    return strengths;
  }

  /**
   * 辅助方法：基于规则的劣势识别
   */
  private identifyRuleBasedWeaknesses(evidence: Evidence): string[] {
    const weaknesses: string[] = [];

    // 根据新的标准证据类型识别劣势
    if (evidence.type === 'testimonial') {
      weaknesses.push('证人证言主观性较强，需要核实真实性');
    }
    if (evidence.type === 'party_statement') {
      weaknesses.push('当事人陈述存在利益倾向，证明力有限');
    }
    if (evidence.type === 'electronic') {
      weaknesses.push('电子数据易于修改，需要技术验证');
    }
    if (evidence.content.length < 50) {
      weaknesses.push('内容较为简略，信息不够充分');
    }
    if (!evidence.relatedEvents || evidence.relatedEvents.length === 0) {
      weaknesses.push('缺少与时间轴事件的关联，逻辑链条不完整');
    }

    return weaknesses;
  }

  /**
   * 辅助方法：基于规则的建议生成
   */
  private generateRuleBasedSuggestions(evidence: Evidence): string[] {
    const suggestions: string[] = [];

    suggestions.push('建议结合其他证据相互印证');

    // 根据新的标准证据类型提供针对性建议
    if (evidence.type === 'testimonial') {
      suggestions.push('建议补充书证或物证支持证人证言');
    }
    if (evidence.type === 'party_statement') {
      suggestions.push('建议获取第三方证据验证当事人陈述');
    }
    if (evidence.type === 'electronic') {
      suggestions.push('建议进行技术鉴定确保电子数据完整性');
    }
    if (!evidence.relatedEvents || evidence.relatedEvents.length === 0) {
      suggestions.push('建议明确该证据与具体争议事实的关联关系');
    }
    if (evidence.type === 'audio_visual') {
      suggestions.push('建议核实视听资料的来源和制作过程');
    }

    return suggestions;
  }

  /**
   * 辅助方法：获取问题难度分布
   */
  private getQuestionLevelDistribution(questions: EvidenceLearningQuestion[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    questions.forEach(q => {
      distribution[q.level] = (distribution[q.level] || 0) + 1;
    });

    return distribution;
  }
}

/**
 * 单例实例导出
 */
export const evidenceIntelligenceService = new EvidenceIntelligenceService();
