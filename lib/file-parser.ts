/**
 * 增强的文件解析器
 * 支持DOCX、PDF、TXT、MD格式，提供详细错误信息和进度反馈
 * 基于奥卡姆剃刀原则：最简单的方案是最好的
 */

import { PDFParser } from './pdf-parser';
import { DocConverter } from './doc-converter';

export interface ParseProgress {
  stage: string;
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: ParseProgress) => void;

export class FileParser {
  static async parse(file: File, onProgress?: ProgressCallback): Promise<string> {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const fileName = file.name;
    
    // 开始解析
    onProgress?.({ 
      stage: 'start', 
      progress: 0, 
      message: `开始解析 ${fileName}...` 
    });

    try {
      switch (fileType) {
        case 'txt':
        case 'md':
          return await this.parseTextFile(file, onProgress);
          
        case 'docx':
          return await this.parseDocxFile(file, onProgress);
          
        case 'pdf':
          return await this.parsePdfFile(file, onProgress);
          
        case 'doc':
          return await this.parseDocFile(file, onProgress);
          
        default:
          throw new Error(`❌ 不支持的文件格式：.${fileType?.toUpperCase()}\n\n✅ 支持的格式：\n• PDF - 最通用的法律文档格式\n• DOCX - Word文档格式（推荐）\n• TXT - 纯文本格式（最稳定）\n• MD - Markdown格式`);
      }
    } catch (error) {
      onProgress?.({ 
        stage: 'error', 
        progress: 0, 
        message: '解析失败' 
      });
      throw error;
    }
  }

  private static async parseTextFile(file: File, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.({ 
      stage: 'reading', 
      progress: 20, 
      message: '读取文本文件...' 
    });

    try {
      const text = await file.text();
      
      if (!text.trim()) {
        throw new Error('❌ 文件内容为空，请检查文件是否正确');
      }

      onProgress?.({ 
        stage: 'complete', 
        progress: 100, 
        message: `文本解析完成，共 ${text.length} 字符` 
      });

      return text;
    } catch (error) {
      if (error instanceof Error && error.message.includes('❌')) {
        throw error;
      }
      throw new Error(`❌ 文本文件读取失败：${error instanceof Error ? error.message : '未知错误'}\n\n💡 建议：确保文件编码为UTF-8`);
    }
  }

  private static async parseDocxFile(file: File, onProgress?: ProgressCallback): Promise<string> {
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
        throw new Error('❌ DOCX文件解析结果为空\n\n💡 可能原因：\n• 文件损坏或加密\n• 文档只包含图片或表格\n• 文档格式不标准\n\n🔧 解决方案：\n1. 尝试在Word中重新保存\n2. 复制文本内容到新文档\n3. 转换为TXT格式');
      }

      // 检查警告信息
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX解析警告:', result.messages);
      }

      onProgress?.({ 
        stage: 'complete', 
        progress: 100, 
        message: `DOCX解析完成，共 ${text.length} 字符` 
      });

      return text;
    } catch (error) {
      if (error instanceof Error && error.message.includes('❌')) {
        throw error;
      }
      
      console.error('DOCX解析详细错误:', error);
      throw new Error(`❌ DOCX文件解析失败：${error instanceof Error ? error.message : '未知错误'}\n\n💡 解决方案：\n1. 使用Word打开文件确认文件完整性\n2. 另存为新的DOCX文件\n3. 或复制内容保存为TXT格式`);
    }
  }

  private static async parseDocFile(file: File, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.({ 
      stage: 'checking', 
      progress: 10, 
      message: '检测DOC文件...' 
    });

    // 尝试提取文本内容
    const extractedText = await DocConverter.tryReadAsText(file);
    
    if (extractedText && extractedText.length > 200) {
      onProgress?.({ 
        stage: 'complete', 
        progress: 100, 
        message: `提取成功（部分内容），共 ${extractedText.length} 字符` 
      });
      
      // 返回提取的文本，并添加提示
      return `⚠️ 注意：从DOC文件提取的内容可能不完整，建议转换为DOCX格式以获得最佳效果\n\n${extractedText}`;
    }
    
    // 如果无法提取，显示转换指引
    const guideHTML = DocConverter.getConversionGuideHTML();
    throw new Error(guideHTML);
  }

  private static async parsePdfFile(file: File, onProgress?: ProgressCallback): Promise<string> {
    try {
      return await PDFParser.parse(file, onProgress);
    } catch (error) {
      if (error instanceof Error && error.message.includes('❌')) {
        throw error;
      }
      
      throw new Error(`❌ PDF解析失败：${error instanceof Error ? error.message : '未知错误'}\n\n💡 PDF解析提示：\n• 文本版PDF解析效果更好\n• 扫描版PDF需要OCR识别\n• 加密PDF需要先解除保护\n\n🔧 建议方案：\n1. 如果是Word生成的PDF，建议直接使用原DOCX文件\n2. 或复制PDF中的文本保存为TXT文件`);
    }
  }
  
  /**
   * 检查文件是否可以解析
   */
  static canParse(file: File): boolean {
    const supportedTypes = ['txt', 'md', 'docx', 'pdf', 'doc'];
    const fileType = file.name.split('.').pop()?.toLowerCase();
    return supportedTypes.includes(fileType || '');
  }
  
  /**
   * 获取推荐的转换方式
   */
  static getConversionTip(file: File): string {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'doc') {
      return '请使用 Word 打开文件，选择"另存为"，保存为 .docx 格式';
    }
    
    if (fileType === 'pdf' || fileType === 'docx') {
      return '如果解析失败，建议复制文本内容保存为 .txt 文件';
    }
    
    return '建议使用 .txt 或 .md 格式，最稳定可靠';
  }
}