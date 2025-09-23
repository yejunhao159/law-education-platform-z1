/**
 * 文本文档解析器 - 基础设施层
 * 处理纯文本文档(.txt, .md)的解析
 * 最简单、最稳定的文档格式
 */

import {
  ProgressCallback,
  DocumentParseError,
  DocumentParseErrorType
} from '../types/DocumentTypes';

export class TextDocumentParser {
  /**
   * 解析文本文档
   */
  async parse(file: File, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.({
      stage: 'reading',
      progress: 20,
      message: '读取文本文件...'
    });

    try {
      const text = await file.text();

      if (!text.trim()) {
        throw new DocumentParseError(
          DocumentParseErrorType.EMPTY_CONTENT,
          '❌ 文件内容为空，请检查文件是否正确'
        );
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `文本解析完成，共 ${text.length} 字符`
      });

      return text;

    } catch (error) {
      if (error instanceof DocumentParseError) {
        throw error;
      }

      throw new DocumentParseError(
        DocumentParseErrorType.PARSE_FAILED,
        `❌ 文本文件读取失败：${error instanceof Error ? error.message : '未知错误'}\n\n💡 建议：确保文件编码为UTF-8`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 解析Markdown文档为HTML（可选功能）
   */
  async parseMarkdownToHtml(file: File, onProgress?: ProgressCallback): Promise<string> {
    const text = await this.parse(file, onProgress);

    try {
      // 这里可以集成markdown解析库，如marked
      // const marked = await import('marked');
      // return marked.parse(text);

      // 目前返回纯文本
      return text;

    } catch (error) {
      console.warn('Markdown解析为HTML失败，返回纯文本:', error);
      return text;
    }
  }

  /**
   * 检测文本编码
   */
  async detectEncoding(file: File): Promise<string> {
    try {
      // 读取文件的前几个字节来检测编码
      const buffer = await file.slice(0, 1024).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // 检测UTF-8 BOM
      if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return 'utf-8-bom';
      }

      // 检测UTF-16 BOM
      if (bytes.length >= 2) {
        if ((bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF)) {
          return 'utf-16';
        }
      }

      // 简单的UTF-8检测
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        return 'utf-8';
      } catch {
        // 可能是其他编码
        return 'unknown';
      }

    } catch (error) {
      console.warn('编码检测失败:', error);
      return 'unknown';
    }
  }

  /**
   * 使用指定编码读取文本
   */
  async parseWithEncoding(file: File, encoding: string = 'utf-8', onProgress?: ProgressCallback): Promise<string> {
    onProgress?.({
      stage: 'reading',
      progress: 20,
      message: `使用${encoding}编码读取文本文件...`
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(arrayBuffer);

      if (!text.trim()) {
        throw new DocumentParseError(
          DocumentParseErrorType.EMPTY_CONTENT,
          '❌ 文件内容为空，请检查文件是否正确'
        );
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `文本解析完成（${encoding}），共 ${text.length} 字符`
      });

      return text;

    } catch (error) {
      if (error instanceof DocumentParseError) {
        throw error;
      }

      throw new DocumentParseError(
        DocumentParseErrorType.PARSE_FAILED,
        `❌ 使用${encoding}编码读取失败：${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 验证文本内容
   */
  validateTextContent(text: string): {
    isValid: boolean;
    issues: string[];
    stats: {
      characterCount: number;
      lineCount: number;
      wordCount: number;
      chineseCharCount: number;
    };
  } {
    const issues: string[] = [];

    // 基本统计
    const characterCount = text.length;
    const lineCount = text.split('\n').length;
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;

    // 检查内容质量
    if (characterCount === 0) {
      issues.push('文件内容为空');
    }

    if (characterCount < 50) {
      issues.push('文件内容过短，可能不是完整文档');
    }

    if (chineseCharCount === 0 && wordCount < 10) {
      issues.push('文件可能包含无效内容');
    }

    // 检查是否包含大量乱码
    const controlCharCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length;
    if (controlCharCount > characterCount * 0.1) {
      issues.push('文件可能包含乱码，建议检查编码格式');
    }

    return {
      isValid: issues.length === 0,
      issues,
      stats: {
        characterCount,
        lineCount,
        wordCount,
        chineseCharCount
      }
    };
  }
}