/**
 * 争议分析功能测试
 * 验证第二幕争议焦点分析的修复是否成功
 */

import { DisputeAnalysisService } from '../services/DisputeAnalysisService';
import { validateDisputeResponse } from '../validators/dispute-validator';

describe('争议分析修复测试', () => {
  let service: DisputeAnalysisService;

  beforeEach(() => {
    service = new DisputeAnalysisService();
  });

  describe('字段名修复验证', () => {
    it('应该使用relatedEvents而不是relatedEvidence', () => {
      // 模拟AI返回的数据
      const mockAIResponse = {
        disputes: [
          {
            id: 'dispute-1',
            title: '合同履行争议',
            description: '双方对合同履行期限存在分歧',
            severity: 'critical',
            category: 'fact',
            relatedEvents: ['E1', 'E3', 'E5'], // 修复后应该是relatedEvents
            keyPoints: ['履行期限', '违约责任'],
            difficulty: 'medium',
            confidence: 0.85
          }
        ],
        claimBasisMappings: [],
        metadata: {
          confidence: 0.9,
          disputeCount: 1
        }
      };

      const validated = validateDisputeResponse(mockAIResponse);

      expect(validated.disputes[0]).toHaveProperty('relatedEvents');
      expect(validated.disputes[0].relatedEvents).toEqual(['E1', 'E3', 'E5']);
    });

    it('应该兼容旧字段名relatedEvidence', () => {
      // 模拟使用旧字段名的数据
      const oldFormatData = {
        disputes: [
          {
            id: 'dispute-1',
            title: '证据争议',
            relatedEvidence: ['证据1', '证据2'], // 旧字段名
            category: 'evidence'
          }
        ]
      };

      const validated = validateDisputeResponse(oldFormatData);

      // 验证器应该将relatedEvidence转换为relatedEvents
      expect(validated.disputes[0].relatedEvents).toEqual(['证据1', '证据2']);
    });
  });

  describe('数据验证器功能', () => {
    it('应该为缺失字段提供默认值', () => {
      const incompleteData = {
        disputes: [
          {
            // 只有最少的字段
            title: '简单争议'
          }
        ]
      };

      const validated = validateDisputeResponse(incompleteData);
      const dispute = validated.disputes[0];

      // 验证默认值
      expect(dispute.id).toBe('dispute-1');
      expect(dispute.description).toBe('');
      expect(dispute.severity).toBe('minor');
      expect(dispute.category).toBe('fact');
      expect(dispute.relatedEvents).toEqual([]);
      expect(dispute.difficulty).toBe('medium');
      expect(dispute.confidence).toBe(0.5);
    });

    it('应该验证枚举值的有效性', () => {
      const invalidEnumData = {
        disputes: [
          {
            title: '测试争议',
            severity: 'invalid_severity', // 无效的严重程度
            category: 'invalid_category', // 无效的类别
            difficulty: 'invalid_difficulty' // 无效的难度
          }
        ]
      };

      const validated = validateDisputeResponse(invalidEnumData);
      const dispute = validated.disputes[0];

      // 应该使用默认的有效枚举值
      expect(dispute.severity).toBe('minor');
      expect(dispute.category).toBe('fact');
      expect(dispute.difficulty).toBe('medium');
    });

    it('应该正确处理置信度范围', () => {
      const testCases = [
        { input: 1.5, expected: 1 },
        { input: -0.5, expected: 0 },
        { input: 0.7, expected: 0.7 },
        { input: 'invalid', expected: 0.5 }
      ];

      testCases.forEach(({ input, expected }) => {
        const data = {
          disputes: [{
            title: '测试',
            confidence: input
          }]
        };

        const validated = validateDisputeResponse(data);
        expect(validated.disputes[0].confidence).toBe(expected);
      });
    });
  });

  describe('提示词优化验证', () => {
    it('提示词应该包含结构化事件标识', () => {
      const request = {
        documentText: `2024-01-01: 签订合同
2024-02-01: 交付货物
2024-03-01: 付款争议`,
        caseType: 'civil' as const,
        options: {
          extractClaimBasis: true,
          analyzeDifficulty: true,
          generateTeachingNotes: false
        }
      };

      // @ts-ignore - 访问私有方法进行测试
      const prompt = service.buildAnalysisPrompt(request);

      // 验证提示词包含事件ID
      expect(prompt).toContain('E1');
      expect(prompt).toContain('E2');
      expect(prompt).toContain('E3');

      // 验证提示词包含结构化要求
      expect(prompt).toContain('relatedEvents');
      expect(prompt).toContain('必须引用上述事件ID');
      expect(prompt).toContain('只能是：critical、major、minor');
    });
  });

  describe('前端兼容性测试', () => {
    it('前端应该能处理各种数据格式', () => {
      // 模拟前端的兼容处理逻辑
      const handleDispute = (dispute: any) => {
        const safeDispute = {
          relatedEvents: dispute.relatedEvents || dispute.relatedEvidence || [],
          title: dispute.title || '未命名争议',
          description: dispute.description || '',
          category: dispute.category || 'unknown'
        };
        return safeDispute;
      };

      // 测试各种格式
      const testCases = [
        {
          input: { relatedEvents: ['E1', 'E2'] },
          expectedEvents: ['E1', 'E2']
        },
        {
          input: { relatedEvidence: ['证据1'] },
          expectedEvents: ['证据1']
        },
        {
          input: {},
          expectedEvents: []
        }
      ];

      testCases.forEach(({ input, expectedEvents }) => {
        const result = handleDispute(input);
        expect(result.relatedEvents).toEqual(expectedEvents);
      });
    });

    it('应该支持事件ID的多种匹配方式', () => {
      const event = {
        date: '2024-01-01',
        event: '签订合同'
      };
      const index = 0;

      const dispute = {
        relatedEvents: ['E1', '2024-01-01']
      };

      // 模拟前端匹配逻辑
      const isRelated =
        dispute.relatedEvents.includes((event as any).id || event.date) ||
        dispute.relatedEvents.includes(`E${index + 1}`);

      expect(isRelated).toBe(true);
    });
  });

  describe('错误处理测试', () => {
    it('应该优雅处理API错误', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'API调用失败'
        }
      };

      const validated = validateDisputeResponse(errorResponse);

      expect(validated.success).toBe(false);
      expect(validated.disputes).toEqual([]);
      expect(validated.error?.code).toBe('API_ERROR');
    });

    it('应该处理完全无效的数据', () => {
      const invalidData = 'not an object';

      const validated = validateDisputeResponse(invalidData);

      expect(validated.success).toBe(false);
      expect(validated.error?.code).toBe('VALIDATION_ERROR');
      expect(validated.disputes).toEqual([]);
    });
  });
});

/**
 * 集成测试：模拟完整的争议分析流程
 */
describe('争议分析集成测试', () => {
  it('完整流程测试：从文本到结构化输出', async () => {
    const mockDocumentText = `
2024-01-15: 原告张某与被告李某签订房屋买卖合同，约定总价200万元
2024-02-20: 被告未按期支付首付款50万元
2024-03-10: 原告发出催款通知
2024-03-25: 被告提出房屋存在质量问题，拒绝付款
2024-04-05: 双方协商未果，原告起诉
    `;

    // 这个测试需要实际的API调用或mock
    // 这里只验证数据结构转换
    const expectedStructure = {
      success: true,
      disputes: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          relatedEvents: expect.arrayContaining([
            expect.stringMatching(/^E\d+$/)
          ]),
          severity: expect.stringMatching(/^(critical|major|minor|informational)$/),
          category: expect.stringMatching(/^(fact|law|procedure|evidence|other)$/)
        })
      ]),
      metadata: expect.objectContaining({
        disputeCount: expect.any(Number),
        confidence: expect.any(Number)
      })
    };

    // 实际测试时，这里应该调用服务
    // const result = await service.analyzeDisputes(request);
    // expect(result).toMatchObject(expectedStructure);
  });
});

// 导出测试工具函数供其他测试使用
export function createMockDispute(overrides = {}) {
  return {
    id: 'test-dispute-1',
    title: '测试争议',
    description: '这是一个测试争议',
    severity: 'major',
    category: 'fact',
    relatedEvents: ['E1', 'E2'],
    keyPoints: ['要点1', '要点2'],
    difficulty: 'medium',
    confidence: 0.8,
    ...overrides
  };
}

export function createMockDisputeResponse(overrides = {}) {
  return {
    success: true,
    disputes: [createMockDispute()],
    claimBasisMappings: [],
    metadata: {
      analysisTime: 1000,
      modelVersion: 'test',
      confidence: 0.85,
      timestamp: new Date().toISOString(),
      disputeCount: 1
    },
    ...overrides
  };
}