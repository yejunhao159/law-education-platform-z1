/**
 * DOC文档解析器 - 基础设施层
 * 处理旧版Word文档(.doc)的解析
 * 基于奥卡姆剃刀原则：提供简洁的转换指引而非复杂的二进制解析
 */

import {
  ProgressCallback,
  DocumentParseError,
  DocumentParseErrorType
} from '../types/DocumentTypes';

interface OnlineConverter {
  name: string;
  url: string;
  description: string;
  steps: string[];
}

export class DOCDocumentParser {
  /**
   * 解析DOC文档
   */
  async parse(file: File, onProgress?: ProgressCallback): Promise<string> {
    onProgress?.({
      stage: 'checking',
      progress: 10,
      message: '检测DOC文件...'
    });

    // 尝试提取文本内容
    const extractedText = await this.tryReadAsText(file);

    if (extractedText && extractedText.length > 200) {
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `提取成功（部分内容），共 ${extractedText.length} 字符`
      });

      // 返回提取的文本，并添加提示
      return `⚠️ 注意：从DOC文件提取的内容可能不完整，建议转换为DOCX格式以获得最佳效果\n\n${extractedText}`;
    }

    // 如果无法提取，抛出转换指引错误
    const guideHTML = this.getConversionGuideHTML();
    throw new DocumentParseError(
      DocumentParseErrorType.UNSUPPORTED_FORMAT,
      guideHTML
    );
  }

  /**
   * 检查是否为DOC文件
   */
  isDocFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.doc');
  }

  /**
   * 获取在线转换服务列表
   */
  getOnlineConverters(): OnlineConverter[] {
    return [
      {
        name: 'Convertio',
        url: 'https://convertio.co/doc-docx/',
        description: '免费、快速、无需注册',
        steps: [
          '点击"选择文件"上传DOC文件',
          '等待转换完成',
          '下载DOCX文件',
          '重新上传到本系统'
        ]
      },
      {
        name: 'CloudConvert',
        url: 'https://cloudconvert.com/doc-to-docx',
        description: '高质量转换，保留格式',
        steps: [
          '上传DOC文件',
          '点击"Convert"',
          '下载转换后的DOCX'
        ]
      },
      {
        name: 'Zamzar',
        url: 'https://www.zamzar.com/convert/doc-to-docx/',
        description: '老牌转换服务，稳定可靠',
        steps: [
          '选择DOC文件',
          '选择输出格式为DOCX',
          '输入邮箱接收文件'
        ]
      }
    ];
  }

  // ========== 私有方法 ==========

  /**
   * 尝试读取DOC文件为文本（降级方案）
   * 某些DOC文件可能包含可读的文本内容
   */
  private async tryReadAsText(file: File): Promise<string | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // 检查文件头魔术字节
      // DOC文件通常以 0xD0CF11E0 开头
      if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
        // 尝试提取文本内容（简单方案）
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const text = decoder.decode(arrayBuffer);

        // 提取可读文本（过滤控制字符）
        const readable = text
          .split('')
          .filter(char => {
            const code = char.charCodeAt(0);
            return (code >= 32 && code <= 126) || // ASCII可打印字符
                   (code >= 0x4E00 && code <= 0x9FFF) || // 中文字符
                   char === '\n' || char === '\r' || char === '\t';
          })
          .join('')
          .replace(/\s+/g, ' ')
          .trim();

        // 如果提取到足够的文本（至少100个字符），返回
        if (readable.length > 100) {
          return readable;
        }
      }
    } catch (error) {
      console.error('尝试读取DOC文件失败:', error);
    }

    return null;
  }

  /**
   * 生成转换指引HTML
   */
  private getConversionGuideHTML(): string {
    const converters = this.getOnlineConverters();

    return `
      <div class="space-y-4">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 class="font-bold text-yellow-800 mb-2">📌 检测到旧版Word文档（.doc）</h3>
          <p class="text-sm text-yellow-700 mb-3">
            由于.doc是专有二进制格式，建议先转换为.docx再上传。
          </p>
        </div>

        <div class="space-y-3">
          <h4 class="font-medium text-gray-700">🔄 快速转换方案：</h4>

          <div class="space-y-2">
            <div class="bg-blue-50 p-3 rounded">
              <h5 class="font-medium text-blue-800 mb-1">方案1：使用Microsoft Word</h5>
              <ol class="text-sm text-blue-700 space-y-1 ml-4">
                <li>1. 用Word打开DOC文件</li>
                <li>2. 点击"文件" → "另存为"</li>
                <li>3. 选择"Word文档(*.docx)"格式</li>
                <li>4. 保存并重新上传</li>
              </ol>
            </div>

            <div class="bg-green-50 p-3 rounded">
              <h5 class="font-medium text-green-800 mb-1">方案2：使用WPS Office</h5>
              <ol class="text-sm text-green-700 space-y-1 ml-4">
                <li>1. 用WPS打开DOC文件</li>
                <li>2. 点击"文件" → "另存为"</li>
                <li>3. 选择DOCX格式</li>
                <li>4. 保存并重新上传</li>
              </ol>
            </div>

            <div class="bg-purple-50 p-3 rounded">
              <h5 class="font-medium text-purple-800 mb-1">方案3：在线转换（推荐）</h5>
              <div class="space-y-2 mt-2">
                ${converters.map(converter => `
                  <a href="${converter.url}"
                     target="_blank"
                     rel="noopener noreferrer"
                     class="block p-2 bg-white rounded border border-purple-200 hover:border-purple-400 transition-colors">
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-medium text-purple-700">${converter.name}</span>
                        <span class="text-xs text-gray-500 ml-2">${converter.description}</span>
                      </div>
                      <span class="text-purple-500">→</span>
                    </div>
                  </a>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="text-xs text-gray-500 pt-2 border-t">
          💡 提示：DOCX格式是开放标准，解析效果更好，推荐优先使用
        </div>
      </div>
    `;
  }
}