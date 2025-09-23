/**
 * 文档处理域类型定义
 * 文档解析相关的所有类型定义
 */

/**
 * 解析进度信息
 */
export interface ParseProgress {
  stage: string;
  progress: number;
  message: string;
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: ParseProgress) => void;

/**
 * 支持的文档格式
 */
export enum DocumentFormat {
  TXT = 'txt',
  MD = 'md',
  DOCX = 'docx',
  PDF = 'pdf',
  DOC = 'doc'
}

/**
 * 文档解析请求
 */
export interface DocumentParseRequest {
  file: File;
  onProgress?: ProgressCallback;
}

/**
 * 文档解析结果
 */
export interface DocumentParseResult {
  content: string;
  format: DocumentFormat;
  metadata: {
    fileName: string;
    fileSize: number;
    characterCount: number;
    processingTime: number;
  };
}

/**
 * 法律文档结构（从legal-parser.ts迁移）
 */
export interface LegalDocument {
  title: string;
  caseNumber: string;
  court: string;
  date: string;
  facts: string;
  law: string;
  reasoning: string;
  judgment: string;
  parties: {
    plaintiff: string[];
    defendant: string[];
  };
  raw: string;
}

/**
 * 文档转换配置
 */
export interface DocumentConversionConfig {
  encoding?: string;
  preserveFormatting?: boolean;
  extractImages?: boolean;
  ocrEnabled?: boolean;
}

/**
 * PDF解析选项
 */
export interface PDFParseOptions {
  useWorker?: boolean;
  password?: string;
  normalizeWhitespace?: boolean;
  disableCombineTextItems?: boolean;
}

/**
 * 文档解析错误类型
 */
export enum DocumentParseErrorType {
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  EMPTY_CONTENT = 'EMPTY_CONTENT',
  PARSE_FAILED = 'PARSE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

/**
 * 文档解析错误
 */
export class DocumentParseError extends Error {
  constructor(
    public type: DocumentParseErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DocumentParseError';
  }
}