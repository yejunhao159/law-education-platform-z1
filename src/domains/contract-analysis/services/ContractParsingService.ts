/**
 * 合同解析服务
 * 职责：将合同文本转换为结构化的合同对象
 */

import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';
import type { ParsedContract, Clause } from '../types/analysis';

/**
 * 合同解析服务类
 */
export class ContractParsingService {
  /**
   * 解析合同文本
   * @param contractText 合同纯文本内容
   * @returns 结构化的合同对象
   */
  async parseContract(contractText: string): Promise<ParsedContract> {
    console.log('📄 开始解析合同，文本长度:', contractText.length);

    // 构建系统提示词
    const systemPrompt = `你是专业的合同分析专家。请将合同文本解析为结构化JSON。

要求：
1. 识别合同类型（买卖/租赁/服务/劳动/加盟/其他）
2. 提取双方当事人信息（甲方、乙方）
3. 提取所有条款（标题+内容+分类）
4. 提取签订日期、生效日期
5. 返回结构化的JSON格式

注意：
- 条款分类包括：违约责任、合同终止、交付履行、管辖条款、争议解决、费用承担、其他
- 如果无法识别的信息，可以标记为"未知"或null
- 确保返回的是纯JSON格式，不要包含markdown标记`;

    // 构建用户提示词
    const userPrompt = `请解析以下合同，提取：
1. 合同类型（买卖/租赁/服务/劳动/加盟/其他）
2. 双方当事人信息（名称和角色）
3. 所有条款（标题、内容、分类、位置）
4. 签订日期、生效日期

合同内容：
${contractText}

请以JSON格式返回ParsedContract对象，结构如下：
{
  "metadata": {
    "contractType": "买卖",
    "parties": {
      "partyA": { "name": "甲方名称", "role": "甲方" },
      "partyB": { "name": "乙方名称", "role": "乙方" }
    },
    "signDate": "YYYY-MM-DD",
    "effectiveDate": "YYYY-MM-DD"
  },
  "clauses": [
    {
      "id": "clause-1",
      "title": "第一条 标的物",
      "content": "条款内容...",
      "category": "交付履行",
      "position": { "start": 0, "end": 100 }
    }
  ],
  "rawText": "原文",
  "extractionConfidence": 0.85
}`;

    try {
      // 调用统一AI服务
      const result = await callUnifiedAI(systemPrompt, userPrompt, {
        temperature: 0.3, // 低温度保证准确性
        maxTokens: 4000,
        responseFormat: 'json',
      });

      console.log('✅ AI解析完成，Token使用:', result.tokensUsed, '成本:', result.cost);

      // 解析AI返回的JSON
      let parsedData: any;
      try {
        // 清理可能的markdown标记
        let cleanedContent = result.content.trim();
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        parsedData = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('❌ JSON解析失败:', parseError);
        console.error('AI返回的原始内容:', result.content);

        // 返回兜底结构
        return this.createFallbackParsedContract(contractText);
      }

      // 验证并补全数据结构
      const parsedContract: ParsedContract = {
        metadata: {
          contractType: parsedData.metadata?.contractType || '其他',
          parties: parsedData.metadata?.parties || {
            partyA: { name: '未识别', role: '甲方' as const },
            partyB: { name: '未识别', role: '乙方' as const },
          },
          signDate: parsedData.metadata?.signDate,
          effectiveDate: parsedData.metadata?.effectiveDate,
        },
        clauses: this.validateClauses(parsedData.clauses || []),
        rawText: contractText,
        extractionConfidence: parsedData.extractionConfidence || 0.7,
      };

      return parsedContract;
    } catch (error) {
      console.error('❌ 合同解析失败:', error);

      // 返回兜底结构
      return this.createFallbackParsedContract(contractText);
    }
  }

  /**
   * 验证和规范化条款数据
   */
  private validateClauses(clauses: any[]): Clause[] {
    return clauses
      .filter((clause) => clause && clause.title && clause.content)
      .map((clause, index) => ({
        id: clause.id || `clause-${index + 1}`,
        title: clause.title || `条款${index + 1}`,
        content: clause.content || '',
        category: this.validateCategory(clause.category),
        position: clause.position || { start: 0, end: 0 },
      }));
  }

  /**
   * 验证条款分类
   */
  private validateCategory(category: any): Clause['category'] {
    const validCategories = [
      '违约责任',
      '合同终止',
      '交付履行',
      '管辖条款',
      '争议解决',
      '费用承担',
    ];

    if (validCategories.includes(category)) {
      return category;
    }

    return '其他';
  }

  /**
   * 创建兜底的解析结果
   */
  private createFallbackParsedContract(contractText: string): ParsedContract {
    console.warn('⚠️ 使用兜底解析结果');

    return {
      metadata: {
        contractType: '其他',
        parties: {
          partyA: { name: '未识别', role: '甲方' },
          partyB: { name: '未识别', role: '乙方' },
        },
      },
      clauses: [
        {
          id: 'clause-fallback-1',
          title: '合同内容',
          content: contractText.substring(0, 500) + '...',
          category: '其他',
          position: { start: 0, end: contractText.length },
        },
      ],
      rawText: contractText,
      extractionConfidence: 0.3,
    };
  }
}
