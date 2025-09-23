/**
 * PDF文档解析器 - 基础设施层
 * 实现PDF文档的解析功能
 * 使用多种策略确保PDF能够被成功解析
 */

import {
  ProgressCallback,
  DocumentParseError,
  DocumentParseErrorType,
  PDFParseOptions
} from '../types/DocumentTypes';

export class PDFDocumentParser {
  /**
   * 解析PDF文档
   */
  async parse(file: File, onProgress?: ProgressCallback): Promise<string> {
    try {
      return await this.parseWithPdfJs(file, onProgress);
    } catch (error) {
      console.error('PDF解析失败:', error);

      if (error instanceof DocumentParseError) {
        throw error;
      }

      throw new DocumentParseError(
        DocumentParseErrorType.PARSE_FAILED,
        `PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 检查PDF是否可能包含文本
   */
  async checkContent(file: File): Promise<{hasText: boolean, pageCount: number}> {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.min.js');

      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      // 检查第一页是否有文本
      const firstPage = await pdf.getPage(1);
      const textContent = await firstPage.getTextContent();

      return {
        hasText: textContent.items.length > 0,
        pageCount: pdf.numPages
      };
    } catch (error) {
      return { hasText: false, pageCount: 0 };
    }
  }

  /**
   * 服务端解析备用方案
   */
  async parseWithServer(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new DocumentParseError(
          DocumentParseErrorType.NETWORK_ERROR,
          '服务端PDF解析失败'
        );
      }

      const { text } = await response.json();
      return text;

    } catch (error) {
      console.error('服务端PDF解析失败:', error);

      if (error instanceof DocumentParseError) {
        throw error;
      }

      throw new DocumentParseError(
        DocumentParseErrorType.NETWORK_ERROR,
        '服务端PDF解析服务不可用',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ========== 私有方法 ==========

  /**
   * 使用pdfjs-dist解析PDF
   */
  private async parseWithPdfJs(file: File, onProgress?: ProgressCallback, options?: PDFParseOptions): Promise<string> {
    try {
      // 确保在浏览器环境
      if (typeof window === 'undefined') {
        throw new DocumentParseError(
          DocumentParseErrorType.PARSE_FAILED,
          'PDF解析需要在浏览器环境中运行'
        );
      }

      onProgress?.({
        stage: 'loading',
        progress: 5,
        message: '加载PDF解析器...'
      });

      // 动态导入 pdfjs-dist
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.min.js');

      onProgress?.({
        stage: 'configuring',
        progress: 10,
        message: '配置PDF工作线程...'
      });

      // 配置 worker
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      onProgress?.({
        stage: 'reading',
        progress: 20,
        message: '读取PDF文件...'
      });

      const arrayBuffer = await file.arrayBuffer();

      onProgress?.({
        stage: 'loading-pdf',
        progress: 30,
        message: '加载PDF文档...'
      });

      // 构建PDF加载配置
      const loadingConfig = {
        data: arrayBuffer,
        disableFontFace: true,
        disableRange: true,
        disableStream: true,
        password: options?.password,
        ...options
      };

      const loadingTask = pdfjs.getDocument(loadingConfig);
      const pdf = await loadingTask.promise;

      onProgress?.({
        stage: 'parsing',
        progress: 40,
        message: `PDF加载成功，开始解析 ${pdf.numPages} 页内容...`
      });

      const fullText = await this.extractTextFromPages(pdf, onProgress);

      // 验证解析结果
      const cleanText = fullText.trim();
      if (!cleanText) {
        throw new DocumentParseError(
          DocumentParseErrorType.EMPTY_CONTENT,
          '❌ PDF解析结果为空\n\n💡 可能原因：\n• PDF是扫描版，需要OCR识别\n• PDF内容为图片格式\n• PDF已加密或损坏\n\n🔧 解决方案：\n1. 使用支持OCR的工具转换\n2. 复制PDF中可选择的文本\n3. 转换为Word文档后再上传'
        );
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `PDF解析完成，共 ${cleanText.length} 字符，${pdf.numPages} 页`
      });

      return cleanText;

    } catch (error) {
      console.error('pdfjs解析失败:', error);

      if (error instanceof DocumentParseError) {
        throw error;
      }

      throw new DocumentParseError(
        DocumentParseErrorType.PARSE_FAILED,
        `PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 从PDF页面提取文本
   */
  private async extractTextFromPages(pdf: any, onProgress?: ProgressCallback): Promise<string> {
    let fullText = '';
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .filter((text: string) => text.trim())
          .join(' ');

        if (pageText.trim()) {
          fullText += `\n${pageText}`;
        }

        // 更新解析进度
        const progress = 40 + Math.round((i / totalPages) * 50);
        onProgress?.({
          stage: 'parsing',
          progress,
          message: `解析第 ${i}/${totalPages} 页...`
        });

      } catch (pageError) {
        console.warn(`解析第${i}页时出错:`, pageError);
        // 单页失败不影响整体解析
      }
    }

    return fullText;
  }
}