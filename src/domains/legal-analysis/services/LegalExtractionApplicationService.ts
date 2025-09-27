/**
 * 法律提取应用服务
 * 核心业务逻辑，从API层分离
 * DeepPractice Standards Compliant
 */

import { DocumentPreprocessor } from '../intelligence/preprocessor';
import { RuleExtractor } from '../intelligence/rule-extractor';
import { SmartMerger } from '../intelligence/smart-merger';
import { ProvisionMapper } from '../intelligence/provision-mapper';
import { ExtractedData } from '../../../../types/legal-intelligence';
import { ExtractionAdapter, type ThreeElementsFormat } from '@/src/adapters/extraction-adapter';

import { AIExtractionClient } from './AIExtractionClient';
import {
  ExtractionRequest,
  ExtractionResult,
  ExtractionMetadata,
  ProcessedDocument,
  MergeOptions
} from './types/ExtractionTypes';

export class LegalExtractionApplicationService {
  private aiClient: AIExtractionClient;

  constructor(aiClient?: AIExtractionClient) {
    this.aiClient = aiClient || new AIExtractionClient();
  }

  /**
   * 主要业务流程：提取法律要素
   */
  async extractLegalElements(request: ExtractionRequest): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      console.log('📊 开始法律智能提取...');

      // 验证输入
      this.validateRequest(request);

      // 设置默认选项
      const options = this.getDefaultOptions(request.options);

      // Step 1: 文档预处理
      const processedDoc = this.preprocessDocument(request.text);

      // Step 2: 规则提取
      const ruleData = this.extractByRules(processedDoc);

      // Step 3: AI提取（如果启用）
      const aiData = await this.extractByAI(processedDoc, options);

      // Step 4: 智能合并
      const finalData = this.mergeExtractionResults(ruleData, aiData);

      // Step 5: 法律条款增强
      const enhancedData = await this.enhanceWithProvisions(finalData, options);

      // Step 6: 生成分析建议
      const suggestions = this.generateSuggestions(enhancedData);

      // Step 7: 构建响应
      const result = this.buildSuccessResponse(
        enhancedData,
        processedDoc,
        suggestions,
        aiData,
        startTime
      );

      console.log('✅ 法律智能提取完成');
      return result;

    } catch (error) {
      console.error('❌ 法律智能提取错误:', error);
      return this.buildErrorResponse(error);
    }
  }

  /**
   * Step 1: 文档预处理
   */
  private preprocessDocument(text: string): ProcessedDocument {
    console.log('Step 1: 文档预处理...');
    return DocumentPreprocessor.processDocument(text);
  }

  /**
   * Step 2: 规则提取
   */
  private extractByRules(processedDoc: ProcessedDocument): ExtractedData {
    console.log('Step 2: 规则提取...');
    return RuleExtractor.extract(processedDoc);
  }

  /**
   * Step 3: AI提取
   */
  private async extractByAI(
    processedDoc: ProcessedDocument,
    options: Required<ExtractionRequest['options']>
  ): Promise<ExtractedData | null> {
    if (!options.enableAI || !this.aiClient.isAvailable()) {
      return null;
    }

    return await this.aiClient.extractLegalElements(
      processedDoc.cleanedText,
      options.elementType
    );
  }

  /**
   * Step 4: 智能合并
   */
  private mergeExtractionResults(
    ruleData: ExtractedData,
    aiData: ExtractedData | null
  ): ExtractedData {
    console.log('Step 4: 智能合并结果...');

    if (!aiData) {
      return ruleData;
    }

    const mergeOptions: MergeOptions = {
      strategy: 'confidence-based',
      aiWeight: 0.6,
      ruleWeight: 0.4
    };

    return SmartMerger.merge(ruleData, aiData, mergeOptions);
  }

  /**
   * Step 5: 法律条款增强
   */
  private async enhanceWithProvisions(
    data: ExtractedData,
    options: Required<ExtractionRequest['options']>
  ): Promise<ExtractedData> {
    if (!options.enhanceWithProvisions) {
      return data;
    }

    console.log('Step 5: 法律条款增强...');

    try {
      // 检测案件类型
      const caseType = this.detectCaseType(data);

      // 映射相关法律条款
      const provisions = ProvisionMapper.mapCaseTypeToProvisions(caseType);

      // 基于事实查找额外条款
      const factTexts = data.facts.map(f => f.content);
      const additionalProvisions = ProvisionMapper.findRelevantStatutes(factTexts);

      // 增强现有法律条款
      data.legalClauses = ProvisionMapper.enhanceLegalClauses(data.legalClauses);

      // 生成法律引用
      let references: string[] = [];
      try {
        references = ProvisionMapper.generateLegalReferences(data);
      } catch (refError) {
        console.error('生成法律引用失败:', refError);
        references = [];
      }

      // 添加到结果
      (data as any).provisions = provisions;
      (data as any).additionalProvisions = additionalProvisions;
      (data as any).legalReferences = references;
      (data as any).caseType = caseType;

      return data;

    } catch (error) {
      console.error('法律条款增强失败:', error);
      return data; // 失败时返回原始数据
    }
  }

  /**
   * Step 6: 生成建议
   */
  private generateSuggestions(data: ExtractedData): string[] {
    const suggestions: string[] = [];

    // 基于日期的建议
    const criticalDates = data.dates.filter(d => d.importance === 'critical');
    if (criticalDates.length > 0) {
      suggestions.push(`注意关键日期：${criticalDates.map(d => d.description).join('、')}`);
    }

    // 基于金额的建议
    const largeAmounts = data.amounts.filter(a => a.value > 100000);
    if (largeAmounts.length > 0) {
      suggestions.push(`涉及较大金额，建议重点审查相关证据`);
    }

    // 基于当事人的建议
    if (data.parties.filter(p => p.type === 'defendant').length > 1) {
      suggestions.push('多名被告，注意连带责任问题');
    }

    // 基于争议事实的建议
    const disputedFacts = data.facts.filter(f => f.type === 'disputed');
    if (disputedFacts.length > 0) {
      suggestions.push(`存在${disputedFacts.length}个争议事实，需要充分举证`);
    }

    // 基于法律条款的建议
    const coreClause = data.legalClauses.filter(c => c.importance === 'core');
    if (coreClause.length > 0) {
      suggestions.push(`重点研究核心法律条款：${coreClause[0].source || '相关法律'}`);
    }

    return suggestions;
  }

  /**
   * 提取三要素格式（兼容旧版前端）
   * 使用新版提取服务，但输出旧版格式
   */
  async extractThreeElements(text: string, options?: {
    useAI?: boolean;
    includeMetadata?: boolean;
  }): Promise<{
    success: boolean;
    data?: ThreeElementsFormat;
    error?: string;
    method?: string;
  }> {
    try {
      // 构建标准请求
      const request: ExtractionRequest = {
        text,
        options: {
          enableAI: options?.useAI !== false,
          elementType: 'all',
          enhanceWithProvisions: true,
          cacheEnabled: true
        }
      };

      // 调用标准提取方法
      const result = await this.extractLegalElements(request);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || '提取失败'
        };
      }

      // 转换为三要素格式
      const threeElementsData = ExtractionAdapter.toThreeElements(result.data);

      return {
        success: true,
        data: threeElementsData,
        method: result.metadata?.aiUsed ? 'ai-enhanced' : 'rule-based'
      };

    } catch (error) {
      console.error('三要素提取失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 检测案件类型
   */
  private detectCaseType(data: ExtractedData): string {
    // 基于提取的数据智能判断案件类型
    const hasLoan = data.amounts.some(a =>
      a.type === 'principal' || a.type === 'interest'
    );
    const hasContract = data.legalClauses.some(c =>
      c.type === 'contract'
    );
    const hasLabor = data.facts.some(f =>
      f.content.includes('工资') || f.content.includes('劳动')
    );

    if (hasLoan) return '民间借贷纠纷';
    if (hasLabor) return '劳动争议';
    if (hasContract) return '合同纠纷';

    return '民事纠纷';
  }

  /**
   * 构建成功响应
   */
  private buildSuccessResponse(
    data: ExtractedData,
    processedDoc: ProcessedDocument,
    suggestions: string[],
    aiData: ExtractedData | null,
    startTime: number
  ): ExtractionResult {
    const metadata: ExtractionMetadata = {
      documentType: processedDoc.metadata.documentType,
      confidence: data.confidence,
      extractionMethod: aiData ? 'hybrid' : 'rule-based',
      processingTime: new Date().toISOString(),
      ...(data as any).caseType && { caseType: (data as any).caseType },
      ...(data as any).provisions && { provisions: (data as any).provisions },
      ...(data as any).additionalProvisions && { additionalProvisions: (data as any).additionalProvisions },
      ...(data as any).legalReferences && { legalReferences: (data as any).legalReferences }
    };

    return {
      success: true,
      data,
      metadata,
      suggestions
    };
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(error: unknown): ExtractionResult {
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return {
      success: false,
      data: this.getEmptyExtractedData(),
      metadata: {
        documentType: 'unknown',
        confidence: 0,
        extractionMethod: 'rule-based',
        processingTime: new Date().toISOString()
      },
      suggestions: [],
      error: errorMessage
    };
  }

  /**
   * 验证请求
   */
  private validateRequest(request: ExtractionRequest): void {
    if (!request.text || typeof request.text !== 'string') {
      throw new Error('请提供要分析的文本');
    }

    if (request.text.trim().length === 0) {
      throw new Error('文本内容不能为空');
    }
  }

  /**
   * 获取默认选项
   */
  private getDefaultOptions(options?: ExtractionRequest['options']): Required<ExtractionRequest['options']> {
    return {
      enableAI: options?.enableAI ?? true,
      elementType: options?.elementType ?? 'all',
      enhanceWithProvisions: options?.enhanceWithProvisions ?? true,
      cacheEnabled: options?.cacheEnabled ?? true
    };
  }

  /**
   * 获取空的提取数据
   */
  private getEmptyExtractedData(): ExtractedData {
    return {
      dates: [],
      parties: [],
      amounts: [],
      legalClauses: [],
      facts: [],
      metadata: {
        uploadTime: new Date().toISOString(),
        documentType: 'unknown',
        extractionTime: new Date().toISOString(),
        extractionVersion: '1.0.0'
      },
      confidence: 0,
      source: 'rule'
    };
  }
}