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
      // 验证文件基本信息
      await this.validateFile(file);

      // 动态导入mammoth库
      const mammoth = await import('mammoth');

      onProgress?.({
        stage: 'reading',
        progress: 30,
        message: '读取DOCX文件...'
      });

      const arrayBuffer = await file.arrayBuffer();

      // 验证文件内容
      await this.validateArrayBuffer(arrayBuffer);

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
      // 验证文件基本信息
      await this.validateFile(file);

      const mammoth = await import('mammoth');

      onProgress?.({
        stage: 'reading',
        progress: 30,
        message: '读取DOCX文件...'
      });

      const arrayBuffer = await file.arrayBuffer();

      // 验证文件内容
      await this.validateArrayBuffer(arrayBuffer);

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
      // 验证文件基本信息
      await this.validateFile(file);

      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();

      // 验证文件内容
      await this.validateArrayBuffer(arrayBuffer);

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
   * 验证文件基本信息
   */
  private async validateFile(file: File): Promise<void> {
    // 检查文件大小
    if (file.size === 0) {
      throw new DocumentParseError(
        DocumentParseErrorType.INVALID_FORMAT,
        '❌ 文件为空\n\n💡 请确保选择了有效的DOCX文件'
      );
    }

    // 检查文件大小限制（100MB）
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new DocumentParseError(
        DocumentParseErrorType.INVALID_FORMAT,
        `❌ 文件过大：${(file.size / 1024 / 1024).toFixed(1)}MB\n\n💡 文件大小不能超过100MB\n🔧 建议压缩文件或分割文档`
      );
    }

    // 检查文件扩展名
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx')) {
      console.warn('文件扩展名不是.docx:', fileName);
    }
  }

  /**
   * 验证ArrayBuffer是否为有效的ZIP格式
   */
  private async validateArrayBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    if (arrayBuffer.byteLength < 22) {
      throw new DocumentParseError(
        DocumentParseErrorType.INVALID_FORMAT,
        '❌ 文件太小，不是有效的DOCX文件\n\n💡 DOCX文件至少需要22字节\n🔧 请检查文件是否完整下载'
      );
    }

    const uint8Array = new Uint8Array(arrayBuffer);

    // 检查ZIP文件头（前4个字节应该是 'PK\x03\x04' 或 'PK\x05\x06' 或 'PK\x07\x08'）
    const signature = uint8Array.slice(0, 4);
    const isValidZip =
      (signature[0] === 0x50 && signature[1] === 0x4B) && // 'PK'
      (
        (signature[2] === 0x03 && signature[3] === 0x04) || // 本地文件头
        (signature[2] === 0x05 && signature[3] === 0x06) || // 中央目录结束记录
        (signature[2] === 0x07 && signature[3] === 0x08)    // 跨档案头
      );

    if (!isValidZip) {
      throw new DocumentParseError(
        DocumentParseErrorType.INVALID_FORMAT,
        `❌ 文件不是有效的ZIP格式\n\n💡 DOCX文件本质上是ZIP压缩包\n🔧 解决方案：\n1. 确认文件未损坏\n2. 尝试重新下载文件\n3. 用Word重新保存文档\n\n📊 文件签名: ${Array.from(signature, b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`
      );
    }

    // 检查是否能找到ZIP中央目录结束标记
    const buffer = arrayBuffer;
    const view = new DataView(buffer);
    let foundEndOfCentralDir = false;

    // 从文件末尾向前搜索中央目录结束标记 (0x06054b50)
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        foundEndOfCentralDir = true;
        break;
      }
    }

    if (!foundEndOfCentralDir) {
      throw new DocumentParseError(
        DocumentParseErrorType.INVALID_FORMAT,
        `❌ ZIP文件结构损坏：找不到中央目录\n\n💡 这通常表示：\n• 文件下载不完整\n• 文件传输过程中损坏\n• 文件不是标准的DOCX格式\n\n🔧 解决方案：\n1. 重新下载或获取文件\n2. 用Word打开并重新保存\n3. 尝试文档修复工具\n4. 转换为其他格式（如TXT）`
      );
    }
  }

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