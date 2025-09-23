/**
 * 文档处理域 - 统一导出
 * 提供文档解析和法律文档分析的完整功能
 */

// 类型定义
export * from './types/DocumentTypes';

// 应用服务
import { DocumentParsingService } from './services/DocumentParsingService';
import { LegalDocumentAnalysisService } from './services/LegalDocumentAnalysisService';

export { DocumentParsingService, LegalDocumentAnalysisService };

// 基础设施层解析器
export { PDFDocumentParser } from './infrastructure/PDFDocumentParser';
export { DOCXDocumentParser } from './infrastructure/DOCXDocumentParser';
export { TextDocumentParser } from './infrastructure/TextDocumentParser';
export { DOCDocumentParser } from './infrastructure/DOCDocumentParser';

// 便捷实例（单例模式） - 延迟初始化避免模块加载时错误
let _documentParsingService: DocumentParsingService;
let _legalDocumentAnalysisService: LegalDocumentAnalysisService;

export const documentParsingService = {
  get instance() {
    if (!_documentParsingService) {
      _documentParsingService = new DocumentParsingService();
    }
    return _documentParsingService;
  },
  // 兼容直接调用的方法
  parseDocument: (...args: any[]) => documentParsingService.instance.parseDocument(...args),
  canParse: (...args: any[]) => documentParsingService.instance.canParse(...args),
  getConversionTip: (...args: any[]) => documentParsingService.instance.getConversionTip(...args),
};

export const legalDocumentAnalysisService = {
  get instance() {
    if (!_legalDocumentAnalysisService) {
      _legalDocumentAnalysisService = new LegalDocumentAnalysisService();
    }
    return _legalDocumentAnalysisService;
  },
  // 兼容直接调用的方法
  analyze: (...args: any[]) => legalDocumentAnalysisService.instance.analyze(...args),
  formatAnalysisResult: (...args: any[]) => legalDocumentAnalysisService.instance.formatAnalysisResult(...args),
};

// 向后兼容性导出（与原lib文件API保持兼容）
export class FileParser {
  static async parse(file: File, onProgress?: (progress: any) => void): Promise<string> {
    const result = await documentParsingService.instance.parseDocument({ file, onProgress });
    return result.content;
  }

  static canParse(file: File): boolean {
    return documentParsingService.instance.canParse(file);
  }

  static getConversionTip(file: File): string {
    return documentParsingService.instance.getConversionTip(file);
  }
}

export class LegalParser {
  static parse(text: string) {
    return legalDocumentAnalysisService.instance.analyze(text);
  }
}

export function formatLegalDocument(doc: any): string {
  return legalDocumentAnalysisService.instance.formatAnalysisResult(doc);
}