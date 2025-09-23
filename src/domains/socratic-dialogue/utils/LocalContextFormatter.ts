/**
 * 本地上下文格式化器
 * 临时替代 @deepracticex/context-manager，提供兼容的XML格式化功能
 */

export interface ContextData {
  role?: string | string[];
  tools?: string | string[];
  conversation?: string | string[];
  current?: string;
  [key: string]: any;
}

export class ContextFormatter {
  /**
   * 格式化上下文为XML结构
   */
  static format(data: ContextData): string {
    const sections: string[] = [];

    // 角色部分
    if (data.role) {
      sections.push(this.formatSection('role', data.role));
    }

    // 工具部分
    if (data.tools) {
      sections.push(this.formatSection('tools', data.tools));
    }

    // 对话历史部分
    if (data.conversation) {
      sections.push(this.formatSection('conversation', data.conversation));
    }

    // 当前问题部分
    if (data.current) {
      sections.push(this.formatSection('current', data.current));
    }

    // 其他自定义部分
    Object.entries(data).forEach(([key, value]) => {
      if (!['role', 'tools', 'conversation', 'current'].includes(key)) {
        sections.push(this.formatSection(key, value));
      }
    });

    return sections.join('\n\n');
  }

  /**
   * 格式化单个部分
   */
  private static formatSection(name: string, content: string | string[]): string {
    if (Array.isArray(content)) {
      const items = content.map(item => `  <item>${this.escapeXml(item)}</item>`).join('\n');
      return `<${name}>\n${items}\n</${name}>`;
    } else {
      return `<${name}>\n  ${this.escapeXml(content)}\n</${name}>`;
    }
  }

  /**
   * 转义XML特殊字符
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 创建消息数组（兼容接口）
   */
  static createMessages(data: ContextData): Array<{ role: string; content: string }> {
    return [
      {
        role: 'user',
        content: this.format(data)
      }
    ];
  }
}