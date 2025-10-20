/**
 * 智能案情叙事生成API
 * @description 基于案例三要素和时间轴生成专业法律叙事章节
 * @author DeepPractice Legal Intelligence System
 * @version 1.0.0
 *
 * 核心功能：
 * - 智能案情叙事章节生成
 * - AI驱动的法律故事化表达
 * - 基于时间轴和争议焦点的结构化叙述
 * - 教学导向的内容组织
 */

import { NextRequest, NextResponse } from 'next/server';
import { caseNarrativeService } from '@/src/domains/legal-analysis/services/CaseNarrativeService';
import type { NarrativeGenerationRequest } from '@/src/domains/legal-analysis/services/CaseNarrativeService';

/**
 * POST /api/legal-analysis/intelligent-narrative - 智能案情叙事生成处理器
 * @description 接收案例数据，生成AI增强的法律叙事章节
 * @param request - Next.js请求对象，包含案例数据和叙事配置
 * @returns 结构化的叙事章节结果
 *
 * 请求体格式：
 * {
 *   "caseData": {
 *     "basicInfo": { "caseNumber": "", "court": "", ... },
 *     "threeElements": {
 *       "facts": { "timeline": [], "parties": [], "keyFacts": [] },
 *       "disputes": [],
 *       "reasoning": { "summary": "" }
 *     }
 *   },
 *   "depth": "basic" | "detailed" | "comprehensive",
 *   "focusAreas": ["timeline", "parties", "disputes", "evidence", "legal-reasoning"]
 * }
 *
 * 响应格式：
 * {
 *   "success": true,
 *   "chapters": [
 *     {
 *       "id": "chapter-1",
 *       "title": "案件起源",
 *       "content": "详细的案情叙述...",
 *       "icon": "📋",
 *       "color": "blue",
 *       "legalSignificance": "法律意义分析...",
 *       "keyParties": ["当事人A", "当事人B"],
 *       "disputeElements": ["争议点1", "争议点2"]
 *     }
 *   ],
 *   "metadata": {
 *     "generatedAt": "2024-01-01T00:00:00.000Z",
 *     "processingTime": 1200,
 *     "confidence": 0.85,
 *     "model": "deepseek-chat-narrative"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [智能叙事API] 收到POST请求');
    console.log('🚀 [智能叙事API] 请求路径:', request.url);
    console.log('🚀 [智能叙事API] 请求头:', JSON.stringify(request.headers));

    // Step 1: 解析请求数据
    const body = await request.json();
    console.log('🚀 [智能叙事API] 请求体关键信息:', {
      hasCaseData: !!body.caseData,
      narrativeStyle: body.narrativeStyle,
      depth: body.depth,
      caseNumber: body.caseData?.basicInfo?.caseNumber
    });

    // 🔍 详细调试：检查接收到的完整数据
    console.log('🔍 [智能叙事API] 接收到的完整caseData:', {
      basicInfo: body.caseData?.basicInfo,
      hasThreeElements: !!body.caseData?.threeElements,
      threeElementsKeys: body.caseData?.threeElements ? Object.keys(body.caseData.threeElements) : [],
      factsDetail: body.caseData?.threeElements?.facts,
      evidenceDetail: body.caseData?.threeElements?.evidence,
      reasoningDetail: body.caseData?.threeElements?.reasoning,
      timeline: body.caseData?.timeline,
      metadata: body.caseData?.metadata
    });

    const {
      caseData,
      depth = 'detailed',
      focusAreas = ['timeline', 'parties', 'disputes']
    } = body;

    // Step 2: 输入验证
    if (!caseData) {
      return NextResponse.json(
        {
          error: '缺少案例数据',
          details: 'caseData字段是必需的'
        },
        { status: 400 }
      );
    }

    if (!caseData.threeElements?.facts?.timeline?.length) {
      console.warn('案例数据缺少时间轴信息，将生成基础叙事');
    }

    // Step 3: 构建叙事生成请求
    const allowedDepth: Array<NarrativeGenerationRequest['depth']> = ['basic', 'detailed', 'comprehensive'];
    const sanitizedDepth: NarrativeGenerationRequest['depth'] =
      allowedDepth.includes(depth) ? depth : 'detailed';

    const allowedFocus = ['timeline', 'parties', 'disputes', 'evidence', 'legal-reasoning'] as const;
    type FocusArea = typeof allowedFocus[number];
    const sanitizedFocusAreas: FocusArea[] = Array.isArray(focusAreas)
      ? focusAreas.filter((area): area is FocusArea => allowedFocus.includes(area as FocusArea))
      : [];

    const narrativeRequest: NarrativeGenerationRequest = {
      caseData,
      narrativeStyle: 'story',
      depth: sanitizedDepth,
      focusAreas: sanitizedFocusAreas.length ? sanitizedFocusAreas : ['timeline', 'parties', 'disputes']
    };

    console.log('📝 叙事生成配置:', {
      caseNumber: caseData.basicInfo?.caseNumber,
      timelineLength: caseData.threeElements?.facts?.timeline?.length || 0,
      style: 'story',
      depth: depth
    });

    // Step 4: 调用智能叙事服务
    const result = await caseNarrativeService.generateIntelligentNarrative(narrativeRequest);

    // Step 5: 返回生成结果
    console.log('✅ 智能叙事生成成功:', {
      chaptersCount: result.chapters.length,
      confidence: result.metadata.confidence,
      processingTime: result.metadata.processingTime
    });

    return NextResponse.json({
      success: true,
      chapters: result.chapters,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('❌ 智能叙事生成API错误:', error);

    // 服务不可用时返回503状态码
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return NextResponse.json(
      {
        error: 'Narrative generation service unavailable',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}

/**
 * GET /api/legal-analysis/intelligent-narrative - API使用说明和示例文档
 * @description 提供完整的API使用指南、参数说明和响应示例
 * @returns API文档和使用示例
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/legal-analysis/intelligent-narrative',
    method: 'POST',
    description: '基于案例三要素生成AI增强的法律叙事章节',
    parameters: {
      caseData: {
        type: 'object',
        required: true,
        description: '案例完整数据，包含基本信息和三要素'
      },
      depth: {
        type: 'string',
        enum: ['basic', 'detailed', 'comprehensive'],
        default: 'detailed',
        description: '分析深度：基础、详细、全面'
      },
      focusAreas: {
        type: 'array',
        items: {
          enum: ['timeline', 'parties', 'disputes', 'evidence', 'legal-reasoning']
        },
        default: ['timeline', 'parties', 'disputes'],
        description: '关注领域：时间轴、当事人、争议、证据、法律推理'
      }
    },
    response: {
      success: 'boolean - 是否成功',
      chapters: 'array - 叙事章节列表',
      metadata: 'object - 生成元数据'
    },
    features: [
      'AI驱动的专业法律叙事',
      '基于时间轴的结构化组织',
      '争议焦点导向的内容展现',
      '教学价值最大化'
    ],
    example: {
      request: {
        caseData: {
          basicInfo: {
            caseNumber: '(2023)京01民初1234号',
            court: '北京市第一中级人民法院'
          },
          threeElements: {
            facts: {
              timeline: [
                {
                  id: 'event-1',
                  date: '2023-01-15',
                  title: '签订买卖合同',
                  description: '甲乙双方签订货物买卖合同'
                }
              ],
              parties: ['甲公司', '乙公司'],
              keyFacts: ['合同签订', '货物交付争议']
            }
          }
        },
        narrativeStyle: 'story',
        depth: 'detailed'
      },
      response: {
        success: true,
        chapters: [
          {
            id: 'chapter-1',
            title: '合同的诞生',
            content: '2023年初春，甲乙两家公司为了业务合作...',
            icon: '📋',
            color: 'blue',
            legalSignificance: '合同成立的法律要件分析...'
          }
        ],
        metadata: {
          confidence: 0.85,
          processingTime: 1200,
          model: 'deepseek-chat-narrative'
        }
      }
    }
  });
}
