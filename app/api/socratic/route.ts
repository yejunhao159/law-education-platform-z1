/**
 * 苏格拉底对话API - 统一入口
 * 职责：处理HTTP请求/响应，对接SocraticDialogueService
 * DeepPractice Standards Compliant
 */

import { NextRequest, NextResponse } from 'next/server';
import { socraticService } from '../../../src/domains/socratic-dialogue/services';
import { SocraticErrorCode } from '../../../src/domains/socratic-dialogue/types';
import { markdownToPlainText } from '../../../src/domains/socratic-dialogue/services/DeeChatAIClient';

/**
 * POST /api/socratic - 苏格拉底对话生成
 * 支持流式(streaming=true)和非流式模式
 */
export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const requestData = await parseRequest(req);

    console.log('🎯 苏格拉底对话请求:', {
      currentTopic: requestData.currentTopic,
      caseContext: requestData.caseContext ? 'present' : 'absent',
      messagesCount: requestData.messages?.length || 0,
      streaming: requestData.streaming || false
    });

    // 流式输出模式
    if (requestData.streaming) {
      return handleStreamingRequest(requestData);
    }

    // 非流式模式（原有逻辑）
    const result = await socraticService.generateQuestion(requestData);

    // Phase B: 转换Markdown为纯文本
    if (result.success && 'data' in result && result.data?.content) {
      result.data.content = markdownToPlainText(result.data.content);
    }
    if (result.success && 'data' in result && result.data?.question) {
      result.data.question = markdownToPlainText(result.data.question);
    }

    console.log('✅ 苏格拉底对话响应:', {
      success: result.success,
      hasData: result.success && 'data' in result ? !!result.data : false,
      error: !result.success && 'error' in result ? result.error?.code : undefined
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
 * 处理流式请求 - Server-Sent Events (SSE)
 * 使用ai-chat 0.5.0的真正流式输出（非模拟）
 */
async function handleStreamingRequest(requestData: any): Promise<Response> {
  try {
    console.log('🚀 开始真正的流式输出...');

    // 创建ReadableStream用于SSE
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let isClosed = false;
        let tokenCount = 0;
        const startTime = Date.now();

        // 安全的enqueue包装函数
        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              console.error('Enqueue失败(controller已关闭):', error);
              isClosed = true;
            }
          }
        };

        // 安全的close包装函数
        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
              isClosed = true;
            } catch (error) {
              console.error('Close失败(controller已关闭):', error);
              isClosed = true;
            }
          }
        };

        try {
          // 使用真正的流式迭代器（从ai-chat实时获取）
          const stream = socraticService.generateQuestionStream(requestData);

          // 实时转发每个chunk
          for await (const chunk of stream) {
            tokenCount++;

            // 实时发送每个文本chunk（无延迟！）
            const sseData = `data: ${JSON.stringify({ content: chunk })}\n\n`;
            safeEnqueue(encoder.encode(sseData));
          }

          const duration = Date.now() - startTime;
          console.log('✅ 流式输出完成:', {
            tokens: tokenCount,
            duration: `${duration}ms`,
            tokensPerSecond: (tokenCount / (duration / 1000)).toFixed(2)
          });

          // 发送完成信号
          safeEnqueue(encoder.encode('data: [DONE]\n\n'));
          safeClose();

        } catch (error) {
          console.error('❌ 流式输出错误:', error);
          const errorData = `data: ${JSON.stringify({
            error: error instanceof Error ? error.message : '未知错误'
          })}\n\n`;
          safeEnqueue(encoder.encode(errorData));
          safeClose();
        }
      }
    });

    return new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',  // 禁用Nginx缓冲
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ 流式请求处理失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '流式输出初始化失败',
        code: SocraticErrorCode.AI_SERVICE_ERROR,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

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

  // 检查error是否存在（类型守卫）
  if (!result.success && result.error) {
    switch (result.error.code) {
    case SocraticErrorCode.INVALID_INPUT:
    case SocraticErrorCode.INVALID_CONTENT:
      return 400;
    case SocraticErrorCode.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 500;
    }
  }

  return 500; // 默认返回500
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