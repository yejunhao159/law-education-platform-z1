/**
 * 统一的文件解析器
 * 基于奥卡姆剃刀原则：最简单的方案是最好的
 */

import { PDFParser } from './pdf-parser';

export class FileParser {
  static async parse(file: File): Promise<string> {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    switch (fileType) {
      case 'txt':
      case 'md':
        // 直接读取文本，最简单可靠
        return await file.text();
        
      case 'docx':
        // 动态导入 mammoth，只在需要时加载
        try {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value;
        } catch (error) {
          console.error('DOCX解析失败:', error);
          throw new Error('DOCX文件解析失败，请尝试转换为TXT格式');
        }
        
      case 'pdf':
        // 使用专门的PDF解析器
        return await PDFParser.parse(file);
        
      case 'doc':
        throw new Error('不支持旧版 .doc 格式，请使用 Word 另存为 .docx 格式');
        
      default:
        throw new Error(`不支持的文件格式: .${fileType}`);
    }
  }
  
  /**
   * 检查文件是否可以解析
   */
  static canParse(file: File): boolean {
    const supportedTypes = ['txt', 'md', 'docx', 'pdf'];
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