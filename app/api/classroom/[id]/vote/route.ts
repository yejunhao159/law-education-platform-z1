/**
 * 投票API端点
 * @description 处理课堂投票相关的API请求
 */

import { NextRequest, NextResponse } from 'next/server';
import { ClassroomApplicationService } from '../../../../../src/domains/teaching-acts/services/ClassroomApplicationService';
import { VoteBroadcaster } from '../../../../../src/lib/sse/vote-broadcaster';
import {
  StartVoteRequest,
  SubmitVoteRequest,
  EndVoteRequest,
  GetVoteResultsRequest,
  ClassroomErrorCode
} from '../../../../../src/domains/teaching-acts/services/types/ClassroomTypes';

// 单例服务实例
const classroomService = new ClassroomApplicationService();
const voteBroadcaster = new VoteBroadcaster();

/**
 * POST /api/classroom/[id]/vote - 提交投票
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { sessionId, studentId, optionId } = body;

    // 验证必要参数
    if (!sessionId || !studentId || !optionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '缺少必要参数',
            code: ClassroomErrorCode.MISSING_REQUIRED_FIELDS
          }
        },
        { status: 400 }
      );
    }

    // 构建请求对象
    const voteRequest: SubmitVoteRequest = {
      sessionId,
      studentId,
      optionId: optionId.toUpperCase()
    };

    // 提交投票
    const result = await classroomService.submitVote(voteRequest);

    if (!result.success) {
      const statusCode = getStatusCodeFromError(result.error?.code);
      return NextResponse.json(result, { status: statusCode });
    }

    // 广播投票更新
    if (result.data?.voteSession) {
      const { id: classroomId } = await params;
      voteBroadcaster.broadcastVoteUpdate(classroomId, result.data.voteSession);
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('提交投票API错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: '服务器内部错误',
          code: ClassroomErrorCode.INTERNAL_ERROR
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/classroom/[id]/vote - 获取投票结果
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '缺少会话ID参数',
            code: ClassroomErrorCode.MISSING_REQUIRED_FIELDS
          }
        },
        { status: 400 }
      );
    }

    // 构建请求对象
    const voteResultsRequest: GetVoteResultsRequest = {
      sessionId
    };

    // 获取投票结果
    const result = await classroomService.getVoteResults(voteResultsRequest);

    if (!result.success) {
      const statusCode = getStatusCodeFromError(result.error?.code);
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('获取投票结果API错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: '服务器内部错误',
          code: ClassroomErrorCode.INTERNAL_ERROR
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/classroom/[id]/vote - 开始投票
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { sessionId, teacherId, question, options, duration } = body;

    // 验证必要参数
    if (!sessionId || !teacherId || !question || !Array.isArray(options)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '缺少必要参数',
            code: ClassroomErrorCode.MISSING_REQUIRED_FIELDS
          }
        },
        { status: 400 }
      );
    }

    // 验证选项数量
    if (options.length === 0 || options.length > 5) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '投票选项数量必须在1-5个之间',
            code: ClassroomErrorCode.TOO_MANY_OPTIONS
          }
        },
        { status: 400 }
      );
    }

    // 构建请求对象
    const startVoteRequest: StartVoteRequest = {
      sessionId,
      teacherId,
      question: question.trim(),
      options: options.map((opt: string) => opt.trim()).filter(Boolean),
      duration: duration ? Math.max(10, Math.min(3600, duration)) : undefined
    };

    // 开始投票
    const result = await classroomService.startVote(startVoteRequest);

    if (!result.success) {
      const statusCode = getStatusCodeFromError(result.error?.code);
      return NextResponse.json(result, { status: statusCode });
    }

    // 广播投票开始
    if (result.data?.voteSession) {
      const { id: classroomId } = await params;
      voteBroadcaster.broadcastVoteStarted(classroomId, result.data.voteSession);
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('开始投票API错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: '服务器内部错误',
          code: ClassroomErrorCode.INTERNAL_ERROR
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/classroom/[id]/vote - 结束投票
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const teacherId = searchParams.get('teacherId');

    // 验证必要参数
    if (!sessionId || !teacherId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: '缺少必要参数',
            code: ClassroomErrorCode.MISSING_REQUIRED_FIELDS
          }
        },
        { status: 400 }
      );
    }

    // 构建请求对象
    const endVoteRequest: EndVoteRequest = {
      sessionId,
      teacherId
    };

    // 结束投票
    const result = await classroomService.endVote(endVoteRequest);

    if (!result.success) {
      const statusCode = getStatusCodeFromError(result.error?.code);
      return NextResponse.json(result, { status: statusCode });
    }

    // 广播投票结束
    if (result.data?.voteSession) {
      const { id: classroomId } = await params;
      voteBroadcaster.broadcastVoteEnded(classroomId, result.data.voteSession);
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('结束投票API错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: '服务器内部错误',
          code: ClassroomErrorCode.INTERNAL_ERROR
        }
      },
      { status: 500 }
    );
  }
}

/**
 * 根据错误代码获取HTTP状态码
 */
function getStatusCodeFromError(errorCode?: string): number {
  switch (errorCode) {
    case ClassroomErrorCode.MISSING_REQUIRED_FIELDS:
    case ClassroomErrorCode.INVALID_VOTE_OPTION:
    case ClassroomErrorCode.TOO_MANY_OPTIONS:
      return 400;
    case ClassroomErrorCode.UNAUTHORIZED:
      return 403;
    case ClassroomErrorCode.CLASSROOM_NOT_FOUND:
    case ClassroomErrorCode.SESSION_NOT_FOUND:
    case ClassroomErrorCode.VOTE_NOT_FOUND:
      return 404;
    case ClassroomErrorCode.VOTE_ALREADY_ACTIVE:
    case ClassroomErrorCode.VOTE_ALREADY_SUBMITTED:
    case ClassroomErrorCode.VOTE_ENDED:
      return 409;
    default:
      return 500;
  }
}

/**
 * OPTIONS - 处理CORS预检请求
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}