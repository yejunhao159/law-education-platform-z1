/**
 * 法律提取服务类型定义
 * DeepPractice Standards Compliant
 */

import { ExtractedData } from '../../../../../types/legal-intelligence';

// ========== 请求类型 ==========
export interface ExtractionRequest {
  text: string;
  options?: ExtractionOptions;
}

export interface ExtractionOptions {
  enableAI?: boolean;
  elementType?: 'all' | 'facts' | 'parties' | 'amounts' | 'clauses';
  enhanceWithProvisions?: boolean;
  cacheEnabled?: boolean;
}

// ========== 响应类型 ==========
export interface ExtractionResult {
  success: boolean;
  data: ExtractedData;
  metadata: ExtractionMetadata;
  suggestions: string[];
  error?: string;
}

export interface ExtractionMetadata {
  documentType: string;
  confidence: number;
  extractionMethod: 'rule-based' | 'ai-based' | 'hybrid';
  processingTime: string;
  caseType?: string;
  provisions?: any[];
  additionalProvisions?: any[];
  legalReferences?: string[];
}

// ========== 内部处理类型 ==========
export interface ProcessedDocument {
  cleanedText: string;
  metadata: {
    documentType: string;
    wordCount: number;
    hasStructure: boolean;
  };
}

export interface MergeOptions {
  strategy: 'confidence-based' | 'rule-priority' | 'ai-priority';
  aiWeight: number;
  ruleWeight: number;
}