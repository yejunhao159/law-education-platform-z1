/**
 * 苏格拉底对话API - 重构版
 * 职责：仅处理HTTP请求/响应，业务逻辑移至Application Service
 * DeepPractice Standards Compliant
 */

import { NextRequest, NextResponse } from 'next/server';
import { SocraticApplicationService } from '../../../src/domains/socratic-dialogue/services/SocraticApplicationService';
import { SocraticErrorCode } from '@/lib/types/socratic';

// 创建服务实例
const socraticService = new SocraticApplicationService();

/**
 * POST /api/socratic - 苏格拉底对话生成
 */
export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const requestData = await parseRequest(req);

    // 检查是否为流式请求
    if (requestData.streaming) {
      const stream = await socraticService.generateStreamResponse(requestData);
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // 执行业务逻辑
    const result = await socraticService.generateSocraticQuestion(requestData);

    // 返回响应
    return NextResponse.json(result, {
      status: getStatusCode(result),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
 * 解析请求数据
 */
async function parseRequest(req: NextRequest) {
  try {
    const body = await req.json();
    return body;
  } catch (error) {
    throw new Error('请求数据格式错误');
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

  return NextResponse.json({
    success: false,
    error: {
      message: '服务器内部错误',
      code: SocraticErrorCode.INTERNAL_ERROR
    }
  }, {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}