/**
 * 专门的PDF解析器
 * 使用多种策略确保PDF能够被成功解析
 */

export class PDFParser {
  /**
   * 主解析方法 - 尝试使用pdfjs-dist
   */
  static async parseWithPdfJs(file: File): Promise<string> {
    try {
      // 确保在浏览器环境
      if (typeof window === 'undefined') {
        throw new Error('PDF解析需要在浏览器环境中运行');
      }

      // 动态导入 pdfjs-dist (3.x版本路径不同)
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
      
      // 配置 worker
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        // 使用特定版本的 worker 以确保兼容性
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      
      const arrayBuffer = await file.arrayBuffer();
      
      // 使用更保守的配置
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        disableFontFace: true,
        disableRange: true,
        disableStream: true,
      });
      
      const pdf = await loadingTask.promise;
      console.log(`PDF加载成功，共 ${pdf.numPages} 页`);
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .filter(text => text.trim())
            .join(' ');
            
          if (pageText) {
            fullText += `\n第${i}页:\n${pageText}\n`;
          }
        } catch (pageError) {
          console.warn(`第${i}页解析失败:`, pageError);
        }
      }
      
      return fullText || '未能从PDF中提取文本';
      
    } catch (error) {
      console.error('pdfjs解析失败:', error);
      throw error;
    }
  }

  /**
   * 备用方案 - 使用pdf-parse库（服务端）
   */
  static async parseWithPdfParse(file: File): Promise<string> {
    try {
      // 这个方法需要服务端支持
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('服务端PDF解析失败');
      }
      
      const { text } = await response.json();
      return text;
      
    } catch (error) {
      console.error('pdf-parse解析失败:', error);
      throw error;
    }
  }

  /**
   * 智能解析 - 尝试多种方法
   */
  static async parse(file: File): Promise<string> {
    console.log('开始PDF解析:', file.name);
    
    // 首先尝试客户端解析
    try {
      const text = await this.parseWithPdfJs(file);
      if (text && text.length > 50) {
        console.log('PDF解析成功（pdfjs）');
        return text;
      }
    } catch (error) {
      console.warn('客户端PDF解析失败，尝试其他方法');
    }
    
    // 如果客户端解析失败，提供用户指引
    throw new Error(
      'PDF解析遇到问题。建议：\n' +
      '1. 使用Adobe Reader打开PDF\n' +
      '2. 全选文本（Ctrl+A）并复制（Ctrl+C）\n' +
      '3. 粘贴到记事本并保存为.txt文件\n' +
      '4. 上传.txt文件'
    );
  }
  
  /**
   * 检查PDF是否可能包含文本
   */
  static async checkPdfContent(file: File): Promise<{hasText: boolean, pageCount: number}> {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
      
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
}