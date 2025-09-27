/**
 * AI提取客户端
 * 封装DeepSeek API调用逻辑
 * DeepPractice Standards Compliant
 * 已迁移至统一AI调用代理模式 - Issue #21
 */

import { AIPromptOptimizer } from '../intelligence/prompt-optimizer';
import { ExtractedData } from '../../../../types/legal-intelligence';
import { interceptDeepSeekCall } from '../../../infrastructure/ai/AICallProxy';

export class AIExtractionClient {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    apiKey: string = process.env.DEEPSEEK_API_KEY || '',
    apiUrl: string = 'https://api.deepseek.com/v1'
  ) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * 检查是否可以使用AI提取
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * 执行AI提取
   */
  async extractLegalElements(
    text: string,
    elementType: string
  ): Promise<ExtractedData | null> {
    if (!this.isAvailable()) {
      console.warn('AI提取不可用：缺少API密钥');
      return null;
    }

    try {
      console.log('Step 3: AI增强提取...');

      // 生成优化的提示词
      const prompt = AIPromptOptimizer.generateExtractionPrompt(
        elementType as any,
        text
      );

      const systemPrompt = AIPromptOptimizer.getSystemPrompt(elementType as any);

      // 调用DeepSeek API
      const response = await this.callDeepSeekAPI(systemPrompt, prompt);

      if (!response) {
        console.error('AI API调用失败');
        return null;
      }

      // 解析和验证响应
      return this.parseAndValidateResponse(response);

    } catch (error) {
      console.error('AI提取错误:', error);
      return null;
    }
  }

  /**
   * 调用统一AI服务（通过代理模式）
   * 迁移说明：从直连DeepSeek API改为使用AICallProxy统一调用
   */
  private async callDeepSeekAPI(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string | null> {
    try {
      const response = await interceptDeepSeekCall(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3, // 降低温度以获得更一致的输出
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        console.error('AI API调用失败:', response.status);
        return null;
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      console.error('AI API调用异常:', error);
      return null;
    }
  }

  /**
   * 解析和验证AI响应
   */
  private parseAndValidateResponse(content: string): ExtractedData | null {
    try {
      // 尝试修复和解析JSON
      const parsed = AIPromptOptimizer.fixCommonIssues(content);

      if (!parsed) {
        console.error('无法解析AI返回的JSON');
        return null;
      }

      // 构造ExtractedData格式
      return {
        dates: parsed.dates || [],
        parties: parsed.parties || [],
        amounts: parsed.amounts || [],
        legalClauses: parsed.legalClauses || [],
        facts: parsed.facts || [],
        metadata: {
          uploadTime: new Date().toISOString(),
          documentType: 'unknown',
          extractionTime: new Date().toISOString(),
          extractionVersion: '1.0.0'
        },
        confidence: 0.8,
        source: 'ai'
      };

    } catch (error) {
      console.error('AI响应解析错误:', error);
      return null;
    }
  }
}