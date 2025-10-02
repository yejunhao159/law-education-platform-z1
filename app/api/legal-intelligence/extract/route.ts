/**
 * 法律智能提取API - 使用DDD架构新系统
 * 迁移完成：使用 JudgmentExtractionService（DDD架构）
 * 功能完整：包含 reasoning、evidence、facts、basicInfo
 */

import { NextRequest, NextResponse } from 'next/server';
import { JudgmentExtractionService } from '@/src/domains/legal-analysis/services';

// 使用新系统（DDD架构，完整的教学三要素）
const judgmentService = new JudgmentExtractionService();

/**
 * 法律智能提取API
 * 使用DDD架构的JudgmentExtractionService（稳定且完整）
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('📊 使用DDD架构JudgmentExtractionService提取判决书...');

    // 解析请求
    const body = await req.json();

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: '请提供要分析的文本' },
        { status: 400 }
      );
    }

    // 调用新系统的完整提取方法
    const result = await judgmentService.extractThreeElements(body.text);

    // 转换为前端期望的格式
    const responseData = {
      basicInfo: result.basicInfo,
      threeElements: {
        facts: result.facts,
        evidence: result.evidence,
        reasoning: result.reasoning
      },
      metadata: {
        confidence: result.metadata.confidence,
        processingTime: result.metadata.processingTime,
        aiModel: result.metadata.aiModel
      }
    };

    console.log('✅ DDD架构提取完成，耗时:', Date.now() - startTime, 'ms');

    return NextResponse.json({
      success: true,
      method: 'ai-ddd-judgment',
      data: responseData,
      confidence: result.metadata.confidence
    }, { status: 200 });

  } catch (error) {
    console.error('❌ API层错误:', error);
    return handleError(error);
  }
}

/**
 * 统一错误处理
 */
function handleError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '未知错误';

  return NextResponse.json(
    {
      success: false,
      error: '提取过程中发生错误',
      message: message
    },
    { status: 500 }
  );
}