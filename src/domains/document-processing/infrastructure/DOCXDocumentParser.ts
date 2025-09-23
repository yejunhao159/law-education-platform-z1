/**
 * DOCX文档解析器 - 基础设施层
 * 处理现代Word文档(.docx)的解析
 * 使用mammoth库进行文档解析
 */

import {
  ProgressCallback,
  DocumentParseError,
  DocumentParseErrorType
} from '../types/DocumentTypes';

export class DOCXDocumentParser {
  /**
   * 解析DOCX文档
   */
  async parse(file: File, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.({
      stage: 'loading',
      progress: 10,
      message: '加载DOCX解析器...'
    });

    try {
      // 动态导入mammoth库
      const mammoth = await import('mammoth');

      onProgress?.({
        stage: 'reading',
        progress: 30,
        message: '读取DOCX文件...'
      });

      const arrayBuffer = await file.arrayBuffer();

      onProgress?.({
        stage: 'parsing',
        progress: 60,
        message: '解析文档结构...'
      });

      const result = await mammoth.extractRawText({
        arrayBuffer
      });

      const text = result.value.trim();

      if (!text) {
        throw new DocumentParseError(
          DocumentParseErrorType.EMPTY_CONTENT,
          '❌ DOCX文件解析结果为空\n\n💡 可能原因：\n• 文件损坏或加密\n• 文档只包含图片或表格\n• 文档格式不标准\n\n🔧 解决方案：\n1. 尝试在Word中重新保存\n2. 复制文本内容到新文档\n3. 转换为TXT格式'
        );
      }

      // 检查并处理警告信息
      this.handleWarnings(result.messages);

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `DOCX解析完成，共 ${text.length} 字符`
      });

      return text;

    } catch (error) {
      if (error instanceof DocumentParseError) {
        throw error;
      }

      console.error('DOCX解析详细错误:', error);
      throw new DocumentParseError(
        DocumentParseErrorType.PARSE_FAILED,
        `❌ DOCX文件解析失败：${error instanceof Error ? error.message : '未知错误'}\n\n💡 解决方案：\n1. 使用Word打开文件确认文件完整性\n2. 另存为新的DOCX文件\n3. 或复制内容保存为TXT格式`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 解析为富文本格式（保留基本格式）
   */
  async parseToHtml(file: File, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.({
      stage: 'loading',
      progress: 10,
      message: '加载DOCX解析器...'
    });

    try {
      const mammoth = await import('mammoth');

      onProgress?.({
        stage: 'reading',
        progress: 30,
        message: '读取DOCX文件...'
      });

      const arrayBuffer = await file.arrayBuffer();

      onProgress?.({
        stage: 'parsing',
        progress: 60,
        message: '解析文档结构和格式...'
      });

      const result = await mammoth.convertToHtml({
        arrayBuffer
      });

      const html = result.value.trim();

      if (!html) {
        throw new DocumentParseError(
          DocumentParseErrorType.EMPTY_CONTENT,
          'DOCX文件解析结果为空'
        );
      }

      this.handleWarnings(result.messages);

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `DOCX HTML解析完成`
      });

      return html;

    } catch (error) {
      if (error instanceof DocumentParseError) {
        throw error;
      }

      throw new DocumentParseError(
        DocumentParseErrorType.PARSE_FAILED,
        `DOCX转HTML失败：${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 检查DOCX文件的基本信息
   */
  async getDocumentInfo(file: File): Promise<{
    hasText: boolean;
    hasImages: boolean;
    hasTables: boolean;
  }> {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();

      const result = await mammoth.convertToHtml({
        arrayBuffer
      });

      const html = result.value;

      return {
        hasText: html.length > 0,
        hasImages: html.includes('<img'),
        hasTables: html.includes('<table')
      };

    } catch (error) {
      console.error('获取DOCX文档信息失败:', error);
      return {
        hasText: false,
        hasImages: false,
        hasTables: false
      };
    }
  }

  // ========== 私有方法 ==========

  /**
   * 处理解析警告信息
   */
  private handleWarnings(messages: any[]): void {
    if (messages && messages.length > 0) {
      // 过滤掉已知的无害警告
      const filteredMessages = messages.filter((msg: any) => {
        // 过滤掉w:tblPrEx警告（Word表格扩展属性，不影响文本提取）
        return !msg.message?.includes('w:tblPrEx');
      });

      if (filteredMessages.length > 0) {
        console.warn('DOCX解析警告:', filteredMessages);
      }
    }
  }
}