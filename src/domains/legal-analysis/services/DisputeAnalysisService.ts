/**
 * 争议分析应用服务
 * 基于AI智能争议焦点提取和分析
 * 迁移自 lib/ai-dispute-analyzer.ts，适配DDD架构
 * 已迁移至统一AI调用代理模式 - Issue #21
 */

import type {
  DisputeFocus,
  ClaimBasis
} from '@/types/dispute-evidence';

// 导入统一AI调用代理
import { callUnifiedAI } from '../../../infrastructure/ai/AICallProxy';
// 导入数据验证器
import { validateDisputeResponse, isValidDisputeResponse } from '../validators/dispute-validator';
// 导入统一服务响应验证器
import { validateServiceResponse, createStandardErrorResponse } from '@/src/utils/service-response-validator';

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
    // 注意：现在通过AICallProxy统一管理API Key和URL
    // 保留这些字段是为了保持接口兼容性，实际调用通过代理处理
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = 'https://api.deepseek.com/v1';
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
        throw new Error('AI服务API Key未配置（通过环境变量DEEPSEEK_API_KEY设置）');
      }

      if (!request.documentText || request.documentText.trim().length === 0) {
        throw new Error('文档内容为空');
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

      // 直接抛出错误,不做降级处理
      // 让上层明确知道失败并返回正确的HTTP状态码
      throw error;
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

    // 将文本转换为结构化事件
    const lines = documentText.split('\n').filter(line => line.trim());
    const structuredEvents = lines.map((line, index) => {
      // 尝试解析日期和内容
      const dateMatch = line.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})[：:：]?/);
      const eventId = `E${index + 1}`;
      const date = dateMatch ? dateMatch[1] : null;
      const content = date ? line.substring(line.indexOf(date) + date.length).replace(/[：:：]/, '').trim() : line;

      return {
        id: eventId,
        date: date,
        content: content
      };
    });

    return `你是一个专业的法律文书分析助手，擅长识别和分析案件中的争议焦点。请严格按照指定格式返回分析结果。

## 结构化案件事件
以下是案件的时间轴事件，每个事件都有唯一的ID标识：
${structuredEvents.map(e => `${e.id}${e.date ? ` (${e.date})` : ''}: ${e.content}`).join('\n')}

## 分析任务
请从上述${caseType === 'civil' ? '民事' : caseType === 'criminal' ? '刑事' : '行政'}案件事件中识别和分析争议焦点。

## 分析要求
1. 识别所有主要争议焦点，包括事实争议和法律适用争议
2. 每个争议必须关联到具体的事件ID（如E1, E2等）
3. 分析每个争议的重要性级别，只能使用：critical（关键）、major（重要）、minor（次要）
4. 争议类别只能使用：fact（事实争议）、law（法律争议）、procedure（程序争议）
5. ${options.extractClaimBasis ? '关联相关的请求权基础' : ''}
6. ${options.analyzeDifficulty ? '评估争议的复杂程度，只能使用：easy（简单）、medium（中等）、hard（困难）' : ''}
7. ${options.generateTeachingNotes ? '生成教学指导说明' : ''}

## 重要约束
- relatedEvents字段必须引用上述事件的ID（E1, E2等），不要使用其他格式
- 不要编造原文未出现的信息
- 如果无法确定某个字段，使用默认值而不是省略字段
- severity只能是：critical、major、minor
- category只能是：fact、law、procedure
- difficulty只能是：easy、medium、hard

## 输出格式要求
必须严格按照以下JSON Schema返回，每个字段都是必填的：
{
  "disputes": [
    {
      "id": "dispute-1",                    // 必填：争议唯一标识
      "title": "具体争议标题",                // 必填：不超过50字的争议标题
      "description": "详细的争议描述",         // 必填：200字以内的详细描述
      "severity": "critical",               // 必填：只能是 critical | major | minor
      "category": "fact",                   // 必填：只能是 fact | law | procedure
      "keyPoints": ["要点1", "要点2"],       // 必填：至少1个关键要点
      "relatedEvents": ["E1", "E3"],        // 必填：必须引用上述事件ID，至少关联1个事件
      "difficulty": "${options.analyzeDifficulty ? 'medium' : 'medium'}",  // 必填：只能是 easy | medium | hard
      "teachingNotes": "${options.generateTeachingNotes ? '教学说明内容' : ''}", // ${options.generateTeachingNotes ? '必填' : '可选'}
      "confidence": 0.85                    // 必填：0-1之间的置信度
    }
  ],
  "claimBasisMappings": [
    {
      "disputeId": "dispute-1",             // 必填：对应上述dispute的id
      "claimBasisId": "claim-1",            // 必填：请求权基础标识
      "relevance": 0.9,                     // 必填：0-1之间的相关度
      "explanation": "关联原因说明",         // 必填：说明关联原因
      "confidence": 0.85                    // 必填：0-1之间的置信度
    }
  ],
  "metadata": {
    "confidence": 0.9,                      // 必填：整体分析置信度
    "disputeCount": 1                       // 必填：识别的争议数量
  }
}

## 示例输出
假设事件E2和E5存在合同履行争议，正确输出示例：
{
  "disputes": [
    {
      "id": "dispute-1",
      "title": "合同履行期限争议",
      "description": "双方对合同约定的履行期限理解不一致，原告主张被告延期履行，被告认为尚在履行期内",
      "severity": "critical",
      "category": "fact",
      "keyPoints": ["履行期限约定不明", "是否构成违约"],
      "relatedEvents": ["E2", "E5"],
      "difficulty": "medium",
      "confidence": 0.88
    }
  ],
  "metadata": {
    "confidence": 0.88,
    "disputeCount": 1
  }
}`;
  }

  /**
   * 调用统一AI服务（通过代理模式）
   * 迁移说明：从直连DeepSeek API改为使用AICallProxy统一调用
   */
  private async callDeepSeekAPI(prompt: string): Promise<any> {
    try {
      // 使用统一AI代理调用
      const result = await callUnifiedAI(
        '你是一个专业的法律文书分析助手，擅长识别和分析案件中的争议焦点。',
        prompt,
        {
          temperature: 0.7,
          maxTokens: 5000  // 增加到 5000 以支持更详细的争议分析
        }
      );

      // 构造兼容原有响应格式
      return {
        choices: [{
          message: {
            content: result.content
          }
        }]
      };
    } catch (error) {
      throw new Error(`AI服务调用错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析API响应
   */
  private parseAPIResponse(apiResponse: any, analysisTime: number): DisputeAnalysisResponse {
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

    // 使用验证器规范化响应数据
    const validatedResponse = validateDisputeResponse({
      ...parsed,
      success: true,
      metadata: {
        ...parsed.metadata,
        analysisTime,
        modelVersion: 'deepseek-chat',
        timestamp: new Date().toISOString()
      }
    });

    // 使用新的统一验证器进行深度验证
    const validationResult = validateServiceResponse(
      validatedResponse,
      ['disputes', 'metadata'],
      {
        checkForHardcodedValues: true,
        minContentLength: 20,
        requireAIGenerated: true
      }
    );

    // 如果验证失败，抛出详细错误
    if (!validationResult.isValid) {
      console.error('❌ 争议分析响应验证失败:', {
        errors: validationResult.errors,
        warnings: validationResult.warnings
      });
      throw new Error(`争议分析结果无效: ${validationResult.errors.join(', ')}`);
    }

    // 记录警告信息
    if (validationResult.warnings.length > 0) {
      console.warn('⚠️ 争议分析响应警告:', validationResult.warnings);
    }

    return validatedResponse;
  }

  /**
   * 已删除 createErrorResponse 方法
   * 原因:降级处理会隐藏真实错误,让问题无法暴露
   * 现在所有错误直接抛出,由上层处理并返回正确的HTTP状态码
   */

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