/**
 * 争议分析应用服务
 * 基于AI智能争议焦点提取和分析
 * 迁移自 lib/ai-dispute-analyzer.ts，适配DDD架构
 */

import type {
  DisputeFocus,
  ClaimBasis
} from '@/types/dispute-evidence';

// 重新导出核心类型，保持接口一致性
export type CaseType = 'civil' | 'criminal' | 'administrative';
export type DisputeAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed' | 'cached';
export type DisputeSeverity = 'critical' | 'major' | 'minor' | 'informational';
export type LanguageCode = 'zh-CN' | 'en-US';
export type ErrorCode = 'ANALYSIS_FAILED' | 'INVALID_DOCUMENT' | 'API_ERROR' | 'TIMEOUT' | 'RATE_LIMIT';

export interface DisputeExtractionOptions {
  extractClaimBasis: boolean;
  analyzeDifficulty: boolean;
  generateTeachingNotes: boolean;
  maxDisputes?: number;
  minConfidence?: number;
  language?: LanguageCode;
}

export interface DisputeAnalysisRequest {
  documentText: string;
  caseType: CaseType;
  options: DisputeExtractionOptions;
  caseId?: string;
  userId?: string;
  sessionId?: string;
}

export interface DisputeAnalysisError {
  code: ErrorCode;
  message: string;
  details?: string;
  timestamp?: number;
  retryable?: boolean;
}

export interface AnalysisMetadata {
  analysisTime: number;
  modelVersion: string;
  confidence: number;
  timestamp: string;
  disputeCount?: number;
  cacheHit?: boolean;
}

export interface ClaimBasisMapping {
  disputeId: string;
  claimBasisId: string;
  relevance: number;
  explanation: string;
  isAutoMapped?: boolean;
  confidence?: number;
}

export interface DisputeAnalysisResponse {
  success: boolean;
  disputes: DisputeFocus[];
  claimBasisMappings: ClaimBasisMapping[];
  metadata: AnalysisMetadata;
  error?: DisputeAnalysisError;
  warnings?: string[];
}

export interface AnalysisStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageAnalysisTime: number;
  cacheHitRate: number;
  lastAnalysisTime?: string;
}

/**
 * 争议分析应用服务
 */
export class DisputeAnalysisService {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private statistics: AnalysisStatistics;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    this.statistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageAnalysisTime: 0,
      cacheHitRate: 0
    };
  }

  /**
   * 主入口：分析文档中的争议焦点
   */
  async analyzeDisputes(request: DisputeAnalysisRequest): Promise<DisputeAnalysisResponse> {
    const startTime = Date.now();
    this.statistics.totalRequests++;

    try {
      console.log('🎯 开始争议焦点分析...');
      console.log('📊 分析参数:', {
        caseType: request.caseType,
        textLength: request.documentText.length,
        options: request.options
      });

      if (!this.apiKey) {
        throw new Error('DeepSeek API Key未配置');
      }

      if (!request.documentText || request.documentText.trim().length === 0) {
        return this.createErrorResponse('INVALID_DOCUMENT', '文档内容为空');
      }

      // 构建分析prompt
      const prompt = this.buildAnalysisPrompt(request);

      // 调用AI分析
      const apiResponse = await this.callDeepSeekAPI(prompt);

      const analysisTime = Date.now() - startTime;
      const result = this.parseAPIResponse(apiResponse, analysisTime);

      // 更新统计信息
      if (result.success) {
        this.statistics.successfulRequests++;
        this.updateAverageTime(analysisTime);
      } else {
        this.statistics.failedRequests++;
      }

      console.log('✅ 争议焦点分析完成');
      return result;

    } catch (error) {
      console.error('❌ 争议焦点分析失败:', error);
      this.statistics.failedRequests++;

      if (error instanceof Error) {
        if (error.message.includes('API Key')) {
          return this.createErrorResponse('API_ERROR', error.message);
        }
        if (error.message.includes('timeout')) {
          return this.createErrorResponse('TIMEOUT', '分析超时，请重试');
        }
      }

      return this.createErrorResponse('ANALYSIS_FAILED', '争议分析失败');
    }
  }

  /**
   * 获取分析统计信息
   */
  getStatistics(): AnalysisStatistics {
    return { ...this.statistics };
  }

  /**
   * 构建AI分析的prompt
   */
  private buildAnalysisPrompt(request: DisputeAnalysisRequest): string {
    const { documentText, caseType, options } = request;

    return `你是一个专业的法律文书分析助手，擅长识别和分析案件中的争议焦点。

## 分析任务
请从以下${caseType === 'civil' ? '民事' : caseType === 'criminal' ? '刑事' : '行政'}案件文书中提取争议焦点：

## 案件文书
${documentText}

## 分析要求
1. 识别所有主要争议焦点，包括事实争议和法律适用争议
2. 分析每个争议的重要性级别（critical/major/minor）
3. 提供每个争议的详细描述和相关证据
4. ${options.extractClaimBasis ? '关联相关的请求权基础' : ''}
5. ${options.analyzeDifficulty ? '评估争议的复杂程度' : ''}
6. ${options.generateTeachingNotes ? '生成教学指导说明' : ''}

## 输出格式
请以JSON格式返回：
{
  "disputes": [
    {
      "id": "dispute-1",
      "title": "争议标题",
      "description": "争议详细描述",
      "severity": "critical|major|minor",
      "category": "fact|law|procedure",
      "keyPoints": ["关键争议点1", "关键争议点2"],
      "relatedEvidence": ["相关证据1", "相关证据2"],
      "difficulty": ${options.analyzeDifficulty ? '"easy|medium|hard"' : 'undefined'},
      "teachingNotes": ${options.generateTeachingNotes ? '"教学指导说明"' : 'undefined'}
    }
  ],
  "claimBasisMappings": [
    {
      "disputeId": "dispute-1",
      "claimBasisId": "claim-1",
      "relevance": 0.9,
      "explanation": "关联解释",
      "confidence": 0.85
    }
  ],
  "metadata": {
    "confidence": 0.9,
    "disputeCount": 3
  }
}`;
  }

  /**
   * 调用DeepSeek API
   */
  private async callDeepSeekAPI(prompt: string): Promise<any> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的法律文书分析助手，擅长识别和分析案件中的争议焦点。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 解析API响应
   */
  private parseAPIResponse(apiResponse: any, analysisTime: number): DisputeAnalysisResponse {
    try {
      const content = apiResponse.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('API响应为空');
      }

      // 处理markdown包装的JSON响应
      let jsonContent = content;
      if (content.includes('```json')) {
        const match = content.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          jsonContent = match[1];
        }
      }

      const parsed = JSON.parse(jsonContent);

      return {
        success: true,
        disputes: Array.isArray(parsed.disputes) ? parsed.disputes : [],
        claimBasisMappings: Array.isArray(parsed.claimBasisMappings) ? parsed.claimBasisMappings : [],
        metadata: {
          analysisTime,
          modelVersion: 'deepseek-chat',
          confidence: parsed.metadata?.confidence || 0.85,
          timestamp: new Date().toISOString(),
          disputeCount: parsed.disputes?.length || 0
        }
      };
    } catch (error) {
      console.error('解析API响应失败:', error);
      return this.createErrorResponse('API_ERROR', 'API响应解析失败');
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(code: ErrorCode, message: string): DisputeAnalysisResponse {
    return {
      success: false,
      disputes: [],
      claimBasisMappings: [],
      error: {
        code,
        message,
        timestamp: Date.now(),
        retryable: code !== 'INVALID_DOCUMENT'
      },
      metadata: {
        analysisTime: 0,
        modelVersion: 'deepseek-chat',
        confidence: 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 更新平均分析时间
   */
  private updateAverageTime(newTime: number): void {
    const total = this.statistics.averageAnalysisTime * (this.statistics.successfulRequests || 1);
    this.statistics.averageAnalysisTime = (total + newTime) / (this.statistics.successfulRequests + 1);
  }
}

/**
 * 便捷函数导出 - 兼容原有接口
 */
export async function analyzeDisputesWithAI(
  request: DisputeAnalysisRequest
): Promise<DisputeAnalysisResponse> {
  const service = new DisputeAnalysisService();
  return service.analyzeDisputes(request);
}

/**
 * 创建争议分析请求的辅助函数
 */
export function createDisputeAnalysisRequest(
  documentText: string,
  caseType: CaseType,
  options?: Partial<DisputeExtractionOptions>
): DisputeAnalysisRequest {
  return {
    documentText: documentText.trim(),
    caseType,
    options: {
      extractClaimBasis: true,
      analyzeDifficulty: true,
      generateTeachingNotes: false,
      maxDisputes: 10,
      minConfidence: 0.7,
      language: 'zh-CN',
      ...options
    }
  };
}