/**
 * 法律智能提取API - 使用旧系统（稳定版）
 * 临时回退：新系统JSON解析不稳定，暂时使用旧的DeepSeekLegalAgent
 * TODO: 等新系统稳定后再切换回来
 */

import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekLegalAgent } from '../../../../lib/ai-legal-agent';

// 使用旧系统（稳定且有完整的教学三要素）
const legalAgent = new DeepSeekLegalAgent();

/**
 * 法律智能提取API
 * 使用旧系统的DeepSeekLegalAgent（稳定且完整）
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('📊 使用旧系统DeepSeekLegalAgent提取判决书...');

    // 解析请求
    const body = await req.json();

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: '请提供要分析的文本' },
        { status: 400 }
      );
    }

    // 调用旧系统的完整提取方法
    const result = await legalAgent.extractThreeElements(body.text);

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

    console.log('✅ 旧系统提取完成，耗时:', Date.now() - startTime, 'ms');

    return NextResponse.json({
      success: true,
      method: 'ai-deepseek',
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