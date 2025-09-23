/**
 * 文档解析应用服务
 * 协调各种文档格式的解析工作
 * 实现DDD应用服务模式
 */

import {
  DocumentParseRequest,
  DocumentParseResult,
  DocumentFormat,
  ProgressCallback,
  DocumentParseError,
  DocumentParseErrorType,
  ParseProgress
} from '../types/DocumentTypes';
import { PDFDocumentParser } from '../infrastructure/PDFDocumentParser';
import { DOCXDocumentParser } from '../infrastructure/DOCXDocumentParser';
import { TextDocumentParser } from '../infrastructure/TextDocumentParser';
import { DOCDocumentParser } from '../infrastructure/DOCDocumentParser';

export class DocumentParsingService {
  private pdfParser = new PDFDocumentParser();
  private docxParser = new DOCXDocumentParser();
  private textParser = new TextDocumentParser();
  private docParser = new DOCDocumentParser();

  /**
   * 解析文档
   */
  async parseDocument(request: DocumentParseRequest): Promise<DocumentParseResult> {
    const { file, onProgress } = request;
    const format = this.detectFormat(file);
    const startTime = Date.now();

    // 开始解析
    onProgress?.({
      stage: 'start',
      progress: 0,
      message: `开始解析 ${file.name}...`
    });

    try {
      const content = await this.parseByFormat(file, format, onProgress);
      const processingTime = Date.now() - startTime;

      return {
        content,
        format,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          characterCount: content.length,
          processingTime
        }
      };
    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: '解析失败'
      });

      if (error instanceof DocumentParseError) {
        throw error;
      }

      throw new DocumentParseError(
        DocumentParseErrorType.PARSE_FAILED,
        `文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 检查文件是否可以解析
   */
  canParse(file: File): boolean {
    try {
      this.detectFormat(file);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取推荐的转换方式
   */
  getConversionTip(file: File): string {
    const format = this.detectFormat(file);

    switch (format) {
      case DocumentFormat.DOC:
        return '请使用 Word 打开文件，选择"另存为"，保存为 .docx 格式';
      case DocumentFormat.PDF:
      case DocumentFormat.DOCX:
        return '如果解析失败，建议复制文本内容保存为 .txt 文件';
      default:
        return '建议使用 .txt 或 .md 格式，最稳定可靠';
    }
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats(): DocumentFormat[] {
    return Object.values(DocumentFormat);
  }

  // ========== 私有方法 ==========

  /**
   * 检测文档格式
   */
  private detectFormat(file: File): DocumentFormat {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'txt':
        return DocumentFormat.TXT;
      case 'md':
        return DocumentFormat.MD;
      case 'docx':
        return DocumentFormat.DOCX;
      case 'pdf':
        return DocumentFormat.PDF;
      case 'doc':
        return DocumentFormat.DOC;
      default:
        throw new DocumentParseError(
          DocumentParseErrorType.UNSUPPORTED_FORMAT,
          `❌ 不支持的文件格式：.${extension?.toUpperCase()}\n\n✅ 支持的格式：\n• PDF - 最通用的法律文档格式\n• DOCX - Word文档格式（推荐）\n• TXT - 纯文本格式（最稳定）\n• MD - Markdown格式`
        );
    }
  }

  /**
   * 根据格式选择相应的解析器
   */
  private async parseByFormat(
    file: File,
    format: DocumentFormat,
    onProgress?: ProgressCallback
  ): Promise<string> {
    switch (format) {
      case DocumentFormat.TXT:
      case DocumentFormat.MD:
        return await this.textParser.parse(file, onProgress);

      case DocumentFormat.DOCX:
        return await this.docxParser.parse(file, onProgress);

      case DocumentFormat.PDF:
        return await this.pdfParser.parse(file, onProgress);

      case DocumentFormat.DOC:
        return await this.docParser.parse(file, onProgress);

      default:
        throw new DocumentParseError(
          DocumentParseErrorType.UNSUPPORTED_FORMAT,
          `不支持的文档格式: ${format}`
        );
    }
  }
}