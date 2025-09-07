/**
 * AI Dispute Analysis Service
 * Provides intelligent dispute extraction and analysis using DeepSeek API
 * This file contains type definitions and will be extended with implementation
 */

import type { DisputeFocus, ClaimBasis } from '@/types/dispute-evidence';

// Case type enumeration
export type CaseType = 'civil' | 'criminal' | 'administrative';

// Analysis status tracking
export type DisputeAnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed' | 'cached';

// Dispute severity levels
export type DisputeSeverity = 'critical' | 'major' | 'minor' | 'informational';

// Language options
export type LanguageCode = 'zh-CN' | 'en-US';

// Error codes
export type ErrorCode = 'ANALYSIS_FAILED' | 'INVALID_DOCUMENT' | 'API_ERROR' | 'TIMEOUT' | 'RATE_LIMIT';

/**
 * Options for dispute extraction
 */
export interface DisputeExtractionOptions {
  extractClaimBasis: boolean;          // Extract related claim basis
  analyzeDifficulty: boolean;          // Analyze difficulty level
  generateTeachingNotes: boolean;      // Generate teaching guidance
  maxDisputes?: number;                // Maximum disputes to extract (default: 10)
  minConfidence?: number;              // Minimum confidence threshold (0-1, default: 0.7)
  language?: LanguageCode;            // Output language (default: 'zh-CN')
}

/**
 * Request structure for dispute analysis
 */
export interface DisputeAnalysisRequest {
  documentText: string;                // Full text of the legal document
  caseType: CaseType;                  // Type of legal case
  options: DisputeExtractionOptions;   // Extraction options
  caseId?: string;                     // Optional case identifier
  userId?: string;                     // Optional user identifier
  sessionId?: string;                  // Optional session identifier
}

/**
 * Error structure for analysis failures
 */
export interface DisputeAnalysisError {
  code: ErrorCode;                     // Error code
  message: string;                     // Human-readable message
  details?: string;                    // Additional error details
  timestamp?: number;                  // Error timestamp
  retryable?: boolean;                 // Whether the operation can be retried
}

/**
 * Metadata for analysis results
 */
export interface AnalysisMetadata {
  analysisTime: number;                // Time taken in milliseconds
  modelVersion: string;                // AI model version used
  confidence: number;                  // Overall confidence score (0-1)
  timestamp: string;                   // ISO timestamp of analysis
  disputeCount?: number;               // Number of disputes found
  cacheHit?: boolean;                  // Whether result was from cache
}

/**
 * Response structure for dispute analysis
 */
export interface DisputeAnalysisResponse {
  success: boolean;                    // Whether analysis succeeded
  disputes: DisputeFocus[];            // Extracted disputes
  claimBasisMappings: ClaimBasisMapping[]; // Dispute-to-claim mappings
  metadata: AnalysisMetadata;          // Analysis metadata
  error?: DisputeAnalysisError;        // Error details if failed
  warnings?: string[];                 // Non-fatal warnings
}

/**
 * Maps disputes to claim basis
 */
export interface ClaimBasisMapping {
  disputeId: string;                   // Dispute identifier
  claimBasisId: string;                // Claim basis identifier
  relevance: number;                   // Relevance score (0-1)
  explanation: string;                 // Explanation of the mapping
  isAutoMapped?: boolean;              // Whether AI auto-mapped this
  confidence?: number;                 // Mapping confidence (0-1)
}

/**
 * Prompt template for AI analysis
 */
export interface PromptTemplate {
  system: string;                      // System prompt
  user: string;                        // User prompt template
  variables: Record<string, string>;  // Template variables
}

/**
 * Cache configuration for dispute analysis
 */
export interface DisputeCacheConfig {
  enabled: boolean;                    // Whether caching is enabled
  ttl: number;                        // Time to live in seconds
  maxSize: number;                    // Maximum cache size
  keyPrefix: string;                  // Cache key prefix
}

/**
 * Analysis statistics for monitoring
 */
export interface AnalysisStatistics {
  totalRequests: number;               // Total analysis requests
  successfulRequests: number;          // Successful analyses
  failedRequests: number;              // Failed analyses
  averageAnalysisTime: number;        // Average time in ms
  cacheHitRate: number;               // Cache hit percentage
  lastAnalysisTime?: string;          // Last analysis timestamp
}

/**
 * Batch analysis request for multiple documents
 */
export interface BatchAnalysisRequest {
  documents: Array<{
    id: string;
    text: string;
    caseType: CaseType;
  }>;
  options: DisputeExtractionOptions;
  parallel?: boolean;                 // Process in parallel
  maxConcurrency?: number;            // Max parallel requests
}

/**
 * Batch analysis response
 */
export interface BatchAnalysisResponse {
  results: Array<{
    documentId: string;
    analysis: DisputeAnalysisResponse;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTime: number;
  };
}

/**
 * Main DisputeAnalyzer class implementation
 */
export class DisputeAnalyzer {
  public config: DisputeCacheConfig;
  private cache: Map<string, { data: DisputeAnalysisResponse; timestamp: number }>;
  private statistics: AnalysisStatistics;

  constructor(config?: Partial<DisputeCacheConfig>) {
    this.config = {
      enabled: true,
      ttl: 3600, // 1 hour default
      maxSize: 50,
      keyPrefix: 'dispute_',
      ...config
    };
    
    this.cache = new Map();
    this.statistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageAnalysisTime: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Analyze a legal document for disputes
   */
  async analyze(request: DisputeAnalysisRequest): Promise<DisputeAnalysisResponse> {
    this.statistics.totalRequests++;

    // Validate input
    if (!request.documentText || request.documentText.trim() === '') {
      this.statistics.failedRequests++;
      return this.createErrorResponse('INVALID_DOCUMENT', '文档内容不能为空');
    }

    // Check cache if enabled
    if (this.config.enabled && request.caseId) {
      const cacheKey = this.getCacheKey(request.caseId);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.updateCacheHitRate(true);
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true
          }
        };
      }
    }

    try {
      const startTime = Date.now();
      
      // Generate prompt
      const prompt = this.generatePrompt(
        request.documentText,
        request.caseType,
        request.options
      );

      // Call DeepSeek API
      const response = await this.callDeepSeekAPI(prompt);
      
      const analysisTime = Date.now() - startTime;
      this.updateAverageTime(analysisTime);

      // Parse response
      const result = this.parseAPIResponse(response, analysisTime);

      // Cache if successful and enabled
      if (result.success && this.config.enabled && request.caseId) {
        const cacheKey = this.getCacheKey(request.caseId);
        this.saveToCache(cacheKey, result);
      }

      if (result.success) {
        this.statistics.successfulRequests++;
      } else {
        this.statistics.failedRequests++;
      }

      this.updateCacheHitRate(false);
      return result;

    } catch (error: any) {
      this.statistics.failedRequests++;
      
      // Determine error type
      const errorCode = error.message.includes('Timeout') ? 'TIMEOUT' : 'API_ERROR';
      return this.createErrorResponse(errorCode, error.message);
    }
  }

  /**
   * Batch analyze multiple documents
   */
  async analyzeBatch(request: BatchAnalysisRequest): Promise<BatchAnalysisResponse> {
    const startTime = Date.now();
    const results: Array<{ documentId: string; analysis: DisputeAnalysisResponse }> = [];

    if (request.parallel) {
      // Parallel processing with concurrency control
      const maxConcurrency = request.maxConcurrency || 3;
      const chunks = this.chunkArray(request.documents, maxConcurrency);
      
      for (const chunk of chunks) {
        const promises = chunk.map(doc =>
          this.analyze({
            documentText: doc.text,
            caseType: doc.caseType,
            options: request.options,
            caseId: doc.id
          }).then(analysis => ({
            documentId: doc.id,
            analysis
          }))
        );
        
        const chunkResults = await Promise.all(promises);
        results.push(...chunkResults);
      }
    } else {
      // Sequential processing
      for (const doc of request.documents) {
        const analysis = await this.analyze({
          documentText: doc.text,
          caseType: doc.caseType,
          options: request.options,
          caseId: doc.id
        });
        
        results.push({
          documentId: doc.id,
          analysis
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.analysis.success).length;
    const failed = results.filter(r => !r.analysis.success).length;

    return {
      results,
      summary: {
        total: request.documents.length,
        successful,
        failed,
        totalTime
      }
    };
  }

  /**
   * Generate prompt for AI analysis
   */
  generatePrompt(documentText: string, caseType: CaseType, options: DisputeExtractionOptions): string {
    let prompt = `请分析以下${caseType === 'civil' ? '民事' : caseType === 'criminal' ? '刑事' : '行政'}案件的法律文书，识别其中的争议焦点。

文书内容：
${documentText}

请提取以下信息：
1. 争议焦点内容
2. 原告/申请人的观点
3. 被告/被申请人的观点
4. 法院的认定意见
`;

    if (options.extractClaimBasis) {
      prompt += `5. 相关的请求权基础
`;
    }

    if (options.analyzeDifficulty) {
      prompt += `6. 争议的难度等级（basic/advanced/professional）
`;
    }

    if (options.generateTeachingNotes) {
      prompt += `7. 教学指导要点
`;
    }

    prompt += `
请以JSON格式返回结果，包含disputes数组，每个争议包含以上字段。`;

    return prompt;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get analysis statistics
   */
  getStatistics(): AnalysisStatistics {
    return { ...this.statistics };
  }

  // Private helper methods
  private getCacheKey(caseId: string): string {
    return `${this.config.keyPrefix}${caseId}`;
  }

  private getFromCache(key: string): DisputeAnalysisResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = (now - cached.timestamp) / 1000;

    if (age > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private saveToCache(key: string, data: DisputeAnalysisResponse): void {
    if (this.cache.size >= this.config.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async callDeepSeekAPI(prompt: string): Promise<any> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
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
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  private parseAPIResponse(apiResponse: any, analysisTime: number): DisputeAnalysisResponse {
    try {
      const content = apiResponse.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        ...parsed,
        success: true,
        metadata: {
          analysisTime,
          modelVersion: 'deepseek-chat',
          confidence: parsed.metadata?.confidence || 0.85,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return this.createErrorResponse('API_ERROR', 'Failed to parse API response');
    }
  }

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

  private updateAverageTime(newTime: number): void {
    const total = this.statistics.averageAnalysisTime * (this.statistics.successfulRequests || 1);
    this.statistics.averageAnalysisTime = (total + newTime) / (this.statistics.successfulRequests + 1);
  }

  private updateCacheHitRate(hit: boolean): void {
    // Simple moving average for cache hit rate
    const weight = 0.9;
    const currentHit = hit ? 1 : 0;
    this.statistics.cacheHitRate = this.statistics.cacheHitRate * weight + currentHit * (1 - weight);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}