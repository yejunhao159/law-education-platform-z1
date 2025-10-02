/**
 * AI Prompt Optimizer
 * AI提示优化器 - 生成优化的提示词以获得结构化输出
 */

import {
  ElementType,
  AIPromptTemplate,
  ExtractedData,
  DateElement,
  Party,
  Amount,
  LegalClause,
  FactElement,
  EvidenceElement,
  ReasoningElement
} from '@/types/legal-intelligence'

/**
 * AI提示优化器类
 */
export class AIPromptOptimizer {
  /**
   * 提示模板库
   */
  private static templates: Map<ElementType, AIPromptTemplate> = new Map([
    ['date', {
      id: 'date_extraction_v1',
      elementType: 'date',
      template: `分析以下法律文本，提取所有重要日期信息。

文本内容：
{text}

请识别并提取：
1. 案件相关日期（立案、开庭、判决等）
2. 合同签订和履行日期
3. 事件发生日期
4. 支付和还款日期
5. 期限和时效日期

对每个日期，请提供：
- date: ISO格式日期(YYYY-MM-DD)
- type: 类型(filing/incident/judgment/deadline/contract/payment)
- description: 简要描述（20字以内）
- importance: 重要性(critical/important/reference)
- relatedParties: 相关当事人
- confidence: 置信度(0-1)

返回JSON格式的日期数组。`,
      systemPrompt: '你是专业的法律文书分析专家，擅长识别和提取法律文档中的时间要素。请严格按照JSON格式返回结果。',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            type: { type: 'string', enum: ['filing', 'incident', 'judgment', 'deadline', 'contract', 'payment'] },
            description: { type: 'string', maxLength: 20 },
            importance: { type: 'string', enum: ['critical', 'important', 'reference'] },
            relatedParties: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['date', 'type', 'description', 'importance', 'confidence']
        }
      },
      examples: [{
        input: '原告于2024年3月15日向本院提起诉讼',
        output: [{
          date: '2024-03-15',
          type: 'filing',
          description: '原告起诉',
          importance: 'critical',
          relatedParties: ['原告'],
          confidence: 0.95
        }]
      }],
      version: '1.0.0',
      effectiveness: 0.85
    }],
    
    ['party', {
      id: 'party_extraction_v1',
      elementType: 'party',
      template: `分析以下法律文本，识别所有当事人信息。

文本内容：
{text}

请识别并提取：
1. 原告和被告
2. 第三人
3. 法定代表人
4. 委托代理人和律师
5. 相关公司和组织

对每个当事人，请提供：
- name: 姓名或名称
- type: 类型(plaintiff/defendant/third-party/witness/lawyer/judge)
- role: 具体角色描述
- legalRepresentative: 法定代表人（如适用）
- aliases: 别名或其他称呼
- confidence: 置信度(0-1)

返回JSON格式的当事人数组。`,
      systemPrompt: '你是专业的法律文书分析专家，擅长识别法律文档中的当事人关系。请准确提取所有当事人信息，并严格按照JSON格式返回。',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['plaintiff', 'defendant', 'third-party', 'witness', 'lawyer', 'judge'] },
            role: { type: 'string' },
            legalRepresentative: { type: 'string' },
            aliases: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['name', 'type', 'role', 'confidence']
        }
      },
      examples: [{
        input: '原告张三，被告李四贸易有限公司，法定代表人王五',
        output: [
          {
            name: '张三',
            type: 'plaintiff',
            role: '原告',
            confidence: 0.95
          },
          {
            name: '李四贸易有限公司',
            type: 'defendant',
            role: '被告（公司）',
            legalRepresentative: '王五',
            confidence: 0.95
          }
        ]
      }],
      version: '1.0.0',
      effectiveness: 0.88
    }],
    
    ['amount', {
      id: 'amount_extraction_v1',
      elementType: 'amount',
      template: `分析以下法律文本，提取所有金额和数值信息。

文本内容：
{text}

请识别并提取：
1. 借款本金
2. 利息和利率
3. 违约金和赔偿金
4. 诉讼费用
5. 其他金额

对每个金额，请提供：
- value: 数值（转换为数字）
- currency: 货币类型(CNY/USD/EUR)
- type: 类型(principal/interest/penalty/compensation/fee/deposit)
- description: 描述说明
- calculation: 计算方式（如适用）
- relatedDate: 相关日期
- confidence: 置信度(0-1)

注意：
- 将"万元"转换为实际数值（如100万元→1000000）
- 百分比保留原值（如8%→8）

返回JSON格式的金额数组。`,
      systemPrompt: '你是专业的法律文书分析专家，擅长识别和计算法律文档中的金额信息。请准确提取所有金额，注意单位转换，并严格按照JSON格式返回。',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: { type: 'number' },
            currency: { type: 'string', enum: ['CNY', 'USD', 'EUR'] },
            type: { type: 'string', enum: ['principal', 'interest', 'penalty', 'compensation', 'fee', 'deposit'] },
            description: { type: 'string' },
            calculation: { type: 'string' },
            relatedDate: { type: 'string', format: 'date' },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['value', 'currency', 'type', 'description', 'confidence']
        }
      },
      examples: [{
        input: '借款本金100万元，年利率8%',
        output: [
          {
            value: 1000000,
            currency: 'CNY',
            type: 'principal',
            description: '借款本金',
            confidence: 0.95
          },
          {
            value: 8,
            currency: 'CNY',
            type: 'interest',
            description: '年利率8%',
            calculation: '年利率',
            confidence: 0.95
          }
        ]
      }],
      version: '1.0.0',
      effectiveness: 0.9
    }],
    
    ['all', {
      id: 'comprehensive_extraction_v3_teaching',
      elementType: 'all',
      template: `作为法律文书分析专家，请提取判决书中的教学三要素（事实认定、证据质证、法官说理）及其他法律要素。

# 完整输出格式示例
{
  "dates": [
    {"date": "2024-01-15", "type": "contract_date", "description": "签订借款合同", "importance": "critical", "confidence": 0.95}
  ],
  "parties": [
    {"name": "张三", "role": "plaintiff", "type": "individual"},
    {"name": "李四贸易有限公司", "role": "defendant", "type": "organization"}
  ],
  "amounts": [
    {"value": 100000, "type": "principal", "currency": "CNY", "description": "借款本金"},
    {"value": 8, "type": "interest_rate", "currency": "CNY", "description": "年利率8%"}
  ],
  "legalClauses": [
    {"source": "中华人民共和国合同法", "article": "第107条", "text": "当事人一方不履行合同义务...", "importance": "core"}
  ],
  "facts": [
    {"content": "双方于2024年1月15日签订借款合同", "type": "admitted", "importance": "critical"}
  ],
  "evidence": [
    {
      "id": "evidence-1",
      "name": "借款合同",
      "type": "documentary",
      "content": "甲乙双方于2024年1月15日签订的借款合同原件",
      "submittedBy": "plaintiff",
      "purpose": "证明借款事实及借款金额",
      "credibilityScore": 0.9,
      "accepted": true,
      "relatedFacts": ["fact-1"],
      "judicialAnalysis": "该证据为原件，经质证无异议，本院予以采信"
    }
  ],
  "reasoning": {
    "summary": "本案系民间借贷纠纷，根据借款合同及还款记录，认定被告应偿还借款本金及利息",
    "legalBasis": [
      {"law": "中华人民共和国民法典", "article": "第667条", "application": "认定借款合同成立"}
    ],
    "logicChain": [
      {
        "step": 1,
        "premise": "原被告签订借款合同，约定借款10万元",
        "inference": "双方形成借款法律关系",
        "conclusion": "借款合同成立",
        "relatedEvidence": ["evidence-1"]
      }
    ],
    "keyArguments": ["借款合同真实有效", "被告未按约还款构成违约"],
    "judgment": "判决被告偿还原告借款本金10万元及利息"
  }
}

# 提取规则（必须严格遵守）

## 基础法律要素
1. dates数组：
   - date必须是YYYY-MM-DD格式（如"2024-01-15"）
   - type必须是：contract_date|deadline|dispute_date|judgment_date|incident_date
   - importance必须是：critical|high|normal
   - confidence必须是0-1之间的数字

2. parties数组：
   - name: 完整的姓名或公司名称
   - role必须是：plaintiff|defendant|third_party|witness|lawyer|judge
   - type必须是：individual|organization

3. amounts数组：
   - value必须是数字类型（不是字符串！）
   - "10万元"必须转换为100000，"5万"必须转换为50000
   - type必须是：principal|interest|interest_rate|penalty|compensation|fee
   - currency统一使用"CNY"

4. legalClauses数组：
   - source: 法律名称（如"中华人民共和国合同法"）
   - article: 条款号（如"第107条"）
   - importance必须是：core|supporting|reference

5. facts数组：
   - content: 事实描述
   - type必须是：claimed|disputed|admitted
   - importance必须是：critical|high|normal

## 教学核心要素（重要！）

6. evidence数组（证据质证）：
   - id: 唯一标识符（如"evidence-1"）
   - name: 证据名称（如"借款合同"、"转账记录"）
   - type: documentary|physical|witness|expert|audio-visual|electronic
   - content: 证据内容描述
   - submittedBy: 提交方（plaintiff|defendant）
   - purpose: 证明目的
   - credibilityScore: 可信度评分（0-1）
   - accepted: 法院是否采信（true|false）
   - rejectionReason: 不采信理由（如accepted为false）
   - relatedFacts: 关联的事实ID数组
   - judicialAnalysis: 法官对该证据的分析意见

7. reasoning对象（法官说理）：
   - summary: 说理总结（100-200字）
   - legalBasis数组：法律依据
     * law: 法律名称
     * article: 条款号
     * application: 如何应用到本案
   - logicChain数组：逻辑推理链（关键！）
     * step: 步骤序号（1, 2, 3...）
     * premise: 前提（事实+法律）
     * inference: 推理过程
     * conclusion: 中间结论
     * relatedEvidence: 相关证据ID数组
     * relatedFacts: 相关事实ID数组
   - keyArguments: 关键论点数组
   - judgment: 最终判决结论

# Few-Shot示例（必须包含教学三要素）

## 示例1：完整判决书提取
输入：原告张三诉称，2023年6月1日，其与被告李四签订借款合同，约定借款金额10万元，年利率为8%。原告提交借款合同原件及转账记录作为证据。经质证，被告对借款合同真实性无异议，但辩称已部分还款。本院认为，借款合同真实有效，根据《中华人民共和国民法典》第667条，借款人应当按照约定返还借款。现被告未提供还款证据，应承担举证不能的不利后果。判决被告偿还原告借款本金10万元及利息。

输出：
{
  "dates": [
    {"date": "2023-06-01", "type": "contract_date", "description": "签订借款合同", "importance": "critical", "confidence": 0.95}
  ],
  "parties": [
    {"name": "张三", "role": "plaintiff", "type": "individual"},
    {"name": "李四", "role": "defendant", "type": "individual"}
  ],
  "amounts": [
    {"value": 100000, "type": "principal", "currency": "CNY", "description": "借款本金"},
    {"value": 8, "type": "interest_rate", "currency": "CNY", "description": "年利率"}
  ],
  "legalClauses": [
    {"source": "中华人民共和国民法典", "article": "第667条", "text": "借款人应当按照约定返还借款", "importance": "core"}
  ],
  "facts": [
    {"content": "原告与被告签订借款合同，约定借款10万元", "type": "admitted", "importance": "critical"}
  ],
  "evidence": [
    {
      "id": "evidence-1",
      "name": "借款合同原件",
      "type": "documentary",
      "content": "原被告于2023年6月1日签订的借款合同",
      "submittedBy": "plaintiff",
      "purpose": "证明借款事实及借款金额",
      "credibilityScore": 0.95,
      "accepted": true,
      "relatedFacts": ["fact-1"],
      "judicialAnalysis": "该证据为原件，经质证被告无异议，本院予以采信"
    },
    {
      "id": "evidence-2",
      "name": "转账记录",
      "type": "electronic",
      "content": "原告转账10万元至被告账户的银行记录",
      "submittedBy": "plaintiff",
      "purpose": "证明原告已履行出借义务",
      "credibilityScore": 0.9,
      "accepted": true,
      "relatedFacts": ["fact-1"],
      "judicialAnalysis": "转账记录真实，与借款合同相符"
    }
  ],
  "reasoning": {
    "summary": "本案系民间借贷纠纷。根据借款合同及转账记录，认定原被告之间存在真实的借款法律关系。被告未提供还款证据，应承担举证不能的不利后果。",
    "legalBasis": [
      {
        "law": "中华人民共和国民法典",
        "article": "第667条",
        "application": "借款人李四应按约定返还借款本金10万元"
      }
    ],
    "logicChain": [
      {
        "step": 1,
        "premise": "原被告签订借款合同，约定借款10万元（证据1）；原告已转账10万元（证据2）",
        "inference": "双方形成真实有效的借款法律关系",
        "conclusion": "借款合同成立且生效",
        "relatedEvidence": ["evidence-1", "evidence-2"],
        "relatedFacts": ["fact-1"]
      },
      {
        "step": 2,
        "premise": "被告辩称已还款但未提供证据；民法典第667条规定借款人应返还借款",
        "inference": "被告未举证证明已还款，应承担举证不能的不利后果",
        "conclusion": "被告应偿还借款本金",
        "relatedEvidence": [],
        "relatedFacts": []
      }
    ],
    "keyArguments": [
      "借款合同真实有效",
      "被告未举证证明还款事实",
      "应支持原告诉讼请求"
    ],
    "judgment": "判决被告偿还原告借款本金10万元及按约定利率计算的利息"
  }
}

# 现在请分析以下文本
文本内容：
{text}

请严格按照上述格式和规则输出JSON，不要添加任何解释或markdown标记。

特别提醒：
1. evidence数组和reasoning对象是教学的核心要素，必须认真提取
2. 每个证据必须标注法院是否采信（accepted字段）及法官的分析意见（judicialAnalysis）
3. reasoning.logicChain必须完整体现法官的推理步骤，不能省略
4. 所有ID引用必须一致（如evidence-1在relatedEvidence中也应使用相同ID）`,
      systemPrompt: `你是资深法律文书分析专家，专注于提取判决书中的教学三要素。核心要求：

**基础要求：**
1. 输出必须是valid JSON，不要添加markdown代码块标记
2. 数值字段必须是number类型（如amounts.value），不能是字符串
3. 日期必须是YYYY-MM-DD格式，不能是"某年某月"
4. 枚举字段必须严格使用指定值（如type必须是plaintiff|defendant等）
5. confidence必须是0-1之间的小数
6. "10万元"必须转换为100000，"5万"转换为50000

**教学要素要求（核心！）：**
7. 证据质证（evidence）：必须提取所有证据，标注法院采信情况及法官分析
8. 法官说理（reasoning）：必须完整梳理法官的逻辑推理链（logicChain），每一步都要清晰
9. 事实认定（facts）：区分admitted（双方认可）、disputed（有争议）、claimed（单方主张）
10. 所有ID引用必须一致（如evidence-1在relatedEvidence中也应使用相同ID）`,
      responseSchema: {
        type: 'object',
        properties: {
          dates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                type: { type: 'string', enum: ['contract_date', 'deadline', 'dispute_date', 'judgment_date', 'incident_date'] },
                description: { type: 'string' },
                importance: { type: 'string', enum: ['critical', 'high', 'normal'] },
                confidence: { type: 'number', minimum: 0, maximum: 1 }
              },
              required: ['date', 'type', 'description', 'importance', 'confidence']
            }
          },
          parties: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                role: { type: 'string', enum: ['plaintiff', 'defendant', 'third_party', 'witness', 'lawyer', 'judge'] },
                type: { type: 'string', enum: ['individual', 'organization'] }
              },
              required: ['name', 'role', 'type']
            }
          },
          amounts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                type: { type: 'string', enum: ['principal', 'interest', 'interest_rate', 'penalty', 'compensation', 'fee'] },
                currency: { type: 'string', enum: ['CNY', 'USD', 'EUR'] },
                description: { type: 'string' }
              },
              required: ['value', 'type', 'currency', 'description']
            }
          },
          legalClauses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                article: { type: 'string' },
                text: { type: 'string' },
                importance: { type: 'string', enum: ['core', 'supporting', 'reference'] }
              },
              required: ['source', 'article', 'importance']
            }
          },
          facts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                type: { type: 'string', enum: ['claimed', 'disputed', 'admitted'] },
                importance: { type: 'string', enum: ['critical', 'high', 'normal'] }
              },
              required: ['content', 'type', 'importance']
            }
          },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string', enum: ['documentary', 'physical', 'witness', 'expert', 'audio-visual', 'electronic'] },
                content: { type: 'string' },
                submittedBy: { type: 'string' },
                purpose: { type: 'string' },
                credibilityScore: { type: 'number', minimum: 0, maximum: 1 },
                accepted: { type: 'boolean' },
                rejectionReason: { type: 'string' },
                relatedFacts: { type: 'array', items: { type: 'string' } },
                judicialAnalysis: { type: 'string' }
              },
              required: ['id', 'name', 'type', 'content', 'submittedBy', 'purpose', 'credibilityScore', 'accepted', 'relatedFacts']
            }
          },
          reasoning: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              legalBasis: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    law: { type: 'string' },
                    article: { type: 'string' },
                    application: { type: 'string' }
                  },
                  required: ['law', 'article', 'application']
                }
              },
              logicChain: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    step: { type: 'number' },
                    premise: { type: 'string' },
                    inference: { type: 'string' },
                    conclusion: { type: 'string' },
                    relatedEvidence: { type: 'array', items: { type: 'string' } },
                    relatedFacts: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['step', 'premise', 'inference', 'conclusion']
                }
              },
              keyArguments: { type: 'array', items: { type: 'string' } },
              judgment: { type: 'string' }
            },
            required: ['summary', 'legalBasis', 'logicChain', 'keyArguments', 'judgment']
          }
        },
        required: ['dates', 'parties', 'amounts', 'legalClauses', 'facts', 'evidence', 'reasoning']
      },
      examples: [
        {
          input: '原告张三诉称，2023年6月1日，其与被告李四签订借款合同，约定借款金额10万元。提交借款合同原件作为证据。本院认为，借款合同真实有效，根据民法典第667条，判决被告偿还借款。',
          output: {
            dates: [{"date": "2023-06-01", "type": "contract_date", "description": "签订借款合同", "importance": "critical", "confidence": 0.95}],
            parties: [
              {"name": "张三", "role": "plaintiff", "type": "individual"},
              {"name": "李四", "role": "defendant", "type": "individual"}
            ],
            amounts: [
              {"value": 100000, "type": "principal", "currency": "CNY", "description": "借款本金"}
            ],
            legalClauses: [
              {"source": "中华人民共和国民法典", "article": "第667条", "text": "", "importance": "core"}
            ],
            facts: [
              {"content": "原告与被告签订借款合同，约定借款10万元", "type": "claimed", "importance": "critical"}
            ],
            evidence: [
              {
                "id": "evidence-1",
                "name": "借款合同原件",
                "type": "documentary",
                "content": "原被告于2023年6月1日签订的借款合同",
                "submittedBy": "plaintiff",
                "purpose": "证明借款事实及金额",
                "credibilityScore": 0.95,
                "accepted": true,
                "relatedFacts": ["fact-1"],
                "judicialAnalysis": "该证据为原件，真实有效，本院予以采信"
              }
            ],
            reasoning: {
              "summary": "根据借款合同，认定原被告之间存在借款法律关系，被告应偿还借款",
              "legalBasis": [
                {"law": "中华人民共和国民法典", "article": "第667条", "application": "借款人应按约定返还借款"}
              ],
              "logicChain": [
                {
                  "step": 1,
                  "premise": "原被告签订借款合同（证据1）",
                  "inference": "双方形成借款法律关系",
                  "conclusion": "借款合同成立且有效",
                  "relatedEvidence": ["evidence-1"],
                  "relatedFacts": ["fact-1"]
                }
              ],
              "keyArguments": ["借款合同真实有效"],
              "judgment": "判决被告偿还借款本金10万元"
            }
          }
        }
      ],
      version: '3.0.0',
      effectiveness: 0.98 // v3版本：增加教学三要素提取
    }]
  ])
  
  /**
   * 生成提取提示词
   */
  static generateExtractionPrompt(
    elementType: ElementType,
    text: string,
    context?: string
  ): string {
    const template = this.templates.get(elementType)
    if (!template) {
      throw new Error(`未找到元素类型 ${elementType} 的提示模板`)
    }

    // 添加日志追踪
    console.log(`📝 使用提示词模板: ${template.id} (v${template.version}, 有效性: ${template.effectiveness})`);

    let prompt = template.template.replace('{text}', text)

    // 添加上下文信息
    if (context) {
      prompt = `背景信息：${context}\n\n` + prompt
    }

    // 添加格式要求
    prompt += '\n\n重要：请直接返回JSON格式的结果，不要包含任何解释或其他文字。'

    return prompt
  }
  
  /**
   * 生成分析提示词
   */
  static generateAnalysisPrompt(data: ExtractedData): string {
    const summary = this.summarizeExtractedData(data)
    
    return `基于以下提取的法律要素，请提供深度法律分析：

${summary}

请分析：
1. 法律关系性质和特征
2. 关键争议焦点
3. 适用的法律规定
4. 证据要求和举证责任
5. 可能的判决结果和风险

返回JSON格式的分析结果，包含：
- legalRelation: 法律关系分析
- keyDisputes: 争议焦点数组
- applicableLaws: 适用法律数组
- evidenceRequirements: 证据要求
- riskAssessment: 风险评估
- recommendations: 建议数组`
  }
  
  /**
   * 获取系统提示词
   */
  static getSystemPrompt(elementType: ElementType): string {
    const template = this.templates.get(elementType)
    return template?.systemPrompt || '你是专业的法律文书分析专家。'
  }
  
  /**
   * 获取响应模式
   */
  static getResponseSchema(elementType: ElementType): any {
    const template = this.templates.get(elementType)
    return template?.responseSchema || {}
  }
  
  /**
   * 优化提示词质量
   */
  static optimizePrompt(prompt: string, previousResults?: any[]): string {
    let optimized = prompt
    
    // 基于之前的结果添加改进建议
    if (previousResults && previousResults.length > 0) {
      const issues = this.analyzeResultIssues(previousResults)
      if (issues.length > 0) {
        optimized += '\n\n请特别注意：\n' + issues.map(i => `- ${i}`).join('\n')
      }
    }
    
    // 添加质量控制要求
    optimized += `

质量要求：
- 确保所有日期格式为YYYY-MM-DD
- 金额必须转换为数字（如100万→1000000）
- 当事人名称要完整准确
- 置信度应反映信息的确定性（0.9以上为高确定性）`
    
    return optimized
  }
  
  /**
   * 生成少样本学习提示
   */
  static generateFewShotPrompt(
    elementType: ElementType,
    examples: Array<{ input: string; output: any }>
  ): string {
    const template = this.templates.get(elementType)
    if (!template) return ''
    
    let prompt = '以下是一些示例：\n\n'
    
    for (const example of examples) {
      prompt += `输入：${example.input}\n`
      prompt += `输出：${JSON.stringify(example.output, null, 2)}\n\n`
    }
    
    prompt += '现在请分析以下内容：\n'
    
    return prompt
  }
  
  /**
   * 创建链式提示
   */
  static createChainPrompt(tasks: string[]): string {
    return `请按以下步骤逐一完成任务：

${tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}

请按顺序完成每个步骤，并在每个步骤后总结结果。最后提供完整的JSON输出。`
  }
  
  /**
   * 验证输出格式
   */
  static validateOutput(output: any, elementType: ElementType): boolean {
    const schema = this.getResponseSchema(elementType)
    
    // 简单的类型检查
    if (schema.type === 'array') {
      return Array.isArray(output)
    }
    
    if (schema.type === 'object') {
      return typeof output === 'object' && output !== null
    }
    
    return true
  }
  
  /**
   * 修复常见输出问题
   */
  static fixCommonIssues(output: string): any {
    let fixed = output
    
    // 移除可能的markdown代码块标记
    fixed = fixed.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    // 移除前后的解释文字
    const jsonMatch = fixed.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      fixed = jsonMatch[0]
    }
    
    // 修复常见的JSON错误
    fixed = fixed
      .replace(/，/g, ',') // 中文逗号
      .replace(/：/g, ':') // 中文冒号
      .replace(/'/g, '"') // 单引号
      .replace(/\n/g, ' ') // 移除换行
      .replace(/,\s*}/g, '}') // 尾随逗号
      .replace(/,\s*]/g, ']') // 尾随逗号
    
    try {
      return JSON.parse(fixed)
    } catch (e) {
      console.error('无法修复JSON输出:', e)
      return null
    }
  }
  
  // ========== 私有辅助方法 ==========
  
  /**
   * 总结提取的数据
   */
  private static summarizeExtractedData(data: ExtractedData): string {
    const parts: string[] = []
    
    if (data.dates.length > 0) {
      parts.push(`日期要素（${data.dates.length}个）：`)
      data.dates.slice(0, 3).forEach(d => {
        parts.push(`  - ${d.date}: ${d.description}`)
      })
    }
    
    if (data.parties.length > 0) {
      parts.push(`\n当事人（${data.parties.length}个）：`)
      data.parties.slice(0, 5).forEach(p => {
        parts.push(`  - ${p.name} (${p.role})`)
      })
    }
    
    if (data.amounts.length > 0) {
      parts.push(`\n金额信息（${data.amounts.length}个）：`)
      data.amounts.slice(0, 3).forEach(a => {
        parts.push(`  - ${a.description}: ${a.value}${a.currency}`)
      })
    }
    
    if (data.legalClauses.length > 0) {
      parts.push(`\n法律条款（${data.legalClauses.length}个）：`)
      data.legalClauses.slice(0, 3).forEach(c => {
        parts.push(`  - ${c.source} ${c.article || ''}`)
      })
    }
    
    return parts.join('\n')
  }
  
  /**
   * 分析结果问题
   */
  private static analyzeResultIssues(results: any[]): string[] {
    const issues: string[] = []
    
    for (const result of results) {
      // 检查日期格式
      if (result.date && !result.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        issues.push('日期格式不正确，应为YYYY-MM-DD')
      }
      
      // 检查金额
      if (result.value !== undefined && typeof result.value !== 'number') {
        issues.push('金额应为数字类型')
      }
      
      // 检查置信度
      if (result.confidence !== undefined && 
          (result.confidence < 0 || result.confidence > 1)) {
        issues.push('置信度应在0-1之间')
      }
    }
    
    return [...new Set(issues)] // 去重
  }
}

export default AIPromptOptimizer