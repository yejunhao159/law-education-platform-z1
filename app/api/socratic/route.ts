/**
 * 苏格拉底对话API - 统一入口
 * 职责：处理HTTP请求/响应，对接EnhancedSocraticService
 * DeepPractice Standards Compliant
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedSocraticService } from '../../../src/domains/socratic-dialogue/services/EnhancedSocraticService';
import { SocraticErrorCode } from '@/lib/types/socratic/ai-service';

// 创建增强版苏格拉底服务实例
const socraticService = new EnhancedSocraticService();

/**
 * POST /api/socratic - 苏格拉底对话生成
 */
export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const requestData = await parseRequest(req);

    console.log('🎯 苏格拉底对话请求:', {
      currentTopic: requestData.currentTopic,
      caseContext: requestData.caseContext ? 'present' : 'absent',
      messagesCount: requestData.messages?.length || 0
    });

    // 执行业务逻辑 - 调用EnhancedSocraticService
    const result = await socraticService.generateSocraticQuestion(requestData);

    console.log('✅ 苏格拉底对话响应:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error?.code
    });

    // 返回响应
    return NextResponse.json(result, {
      status: getStatusCode(result),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ Socratic API错误:', error);
    return handleError(error);
  }
}

/**
 * OPTIONS - CORS支持
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// ========== 私有辅助方法 ==========

/**
 * 解析请求数据并验证格式
 */
async function parseRequest(req: NextRequest): Promise<any> {
  try {
    const body = await req.json();

    // 基础验证
    if (!body || typeof body !== 'object') {
      throw new Error('请求体不能为空');
    }

    // 构建标准的SocraticRequest格式
    const requestData = {
      messages: body.messages || [],
      caseInfo: body.caseInfo,
      level: body.level || body.difficulty, // 兼容不同的字段名
      mode: body.mode,
      sessionId: body.sessionId || `session-${Date.now()}`,
      difficulty: body.difficulty,
      streaming: body.streaming || false,
      caseContext: body.caseContext || body.context,
      currentTopic: body.currentTopic || body.topic,
      // 兼容老的API格式
      ...(body.question && { question: body.question }),
      ...(body.context && !body.caseContext && { caseContext: body.context })
    };

    console.log('📝 解析后的请求数据:', {
      hasMessages: Array.isArray(requestData.messages) && requestData.messages.length > 0,
      hasCaseContext: !!requestData.caseContext,
      hasCurrentTopic: !!requestData.currentTopic,
      sessionId: requestData.sessionId
    });

    return requestData;
  } catch (error) {
    console.error('❌ 请求解析失败:', error);
    throw new Error('请求数据格式错误: ' + (error instanceof Error ? error.message : '未知错误'));
  }
}

/**
 * 获取响应状态码
 */
function getStatusCode(result: any): number {
  if (result.success) {
    return 200;
  }

  if (result.fallback) {
    return 200; // 降级成功也返回200
  }

  switch (result.error?.code) {
    case SocraticErrorCode.INVALID_INPUT:
    case SocraticErrorCode.INVALID_CONTENT:
      return 400;
    case SocraticErrorCode.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}

/**
 * 统一错误处理
 */
function handleError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '未知错误';

  console.error('🚨 苏格拉底API错误详情:', {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });

  // 根据错误类型返回不同的错误码
  let errorCode = SocraticErrorCode.INTERNAL_ERROR;
  let statusCode = 500;
  let errorMessage = '服务器内部错误';

  if (message.includes('请求数据格式错误')) {
    errorCode = SocraticErrorCode.INVALID_INPUT;
    statusCode = 400;
    errorMessage = '请求格式不正确';
  } else if (message.includes('API Key') || message.includes('API错误')) {
    errorCode = SocraticErrorCode.SERVICE_UNAVAILABLE;
    statusCode = 503;
    errorMessage = 'AI服务暂时不可用';
  }

  return NextResponse.json({
    success: false,
    error: {
      message: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
      // 开发环境下提供详细错误信息
      ...(process.env.NODE_ENV === 'development' && { details: message })
    }
  }, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}