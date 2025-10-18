/**
 * 课堂问题API
 * 接收教师推送的讨论问题，存储并准备通过Socket.IO实时分发
 */
import { NextRequest, NextResponse } from 'next/server';

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 处理 CORS preflight 请求
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// 简单的内存存储（生产环境应使用数据库或Redis）
// 存储格式: Map<classroomCode, Question[]>
const classroomQuestions = new Map<string, any[]>();

/**
 * POST - 教师推送问题到课堂
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();

    // 提取问题内容（兼容多种字段名）
    const questionContent = body.content || body.userInput || body.question || '';
    const caseContext = body.caseContext || body.context || '';

    if (!questionContent) {
      return NextResponse.json(
        {
          success: false,
          error: '问题内容不能为空',
          classroomCode: code,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 构建问题对象
    const question = {
      id: `q_${Date.now()}`,
      content: questionContent,
      caseContext,
      classroomCode: code,
      timestamp: new Date().toISOString(),
      type: 'classroom-question',
      status: 'published',
    };

    // 存储到内存（生产环境应存储到数据库）
    if (!classroomQuestions.has(code)) {
      classroomQuestions.set(code, []);
    }
    classroomQuestions.get(code)!.push(question);

    // 返回成功响应
    // 注意：实际的实时推送由Socket.IO服务器处理
    return NextResponse.json(
      {
        success: true,
        data: question,
        message: '问题已发布',
        meta: {
          classroomCode: code,
          questionCount: classroomQuestions.get(code)!.length,
          socketIOUrl: request.nextUrl.origin,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Classroom Question API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
        message: '问题发布失败',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET - 获取课堂的所有问题
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // 获取课堂的所有问题
    const questions = classroomQuestions.get(code) || [];

    return NextResponse.json(
      {
        success: true,
        data: {
          classroomCode: code,
          questions,
          count: questions.length,
          lastUpdated: questions.length > 0
            ? questions[questions.length - 1].timestamp
            : null,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[Classroom Question API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 导出存储供其他模块使用
export { classroomQuestions };
