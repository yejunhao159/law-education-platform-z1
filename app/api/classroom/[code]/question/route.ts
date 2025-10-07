/**
 * 教师发布问题API
 * 将问题推送到学生端
 */
import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../storage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const body = await request.json();
    const { content, type, options } = body;

    if (!content) {
      return NextResponse.json(
        { error: '问题内容不能为空' },
        { status: 400 }
      );
    }

    // 创建问题对象
    const question = {
      id: `q-${Date.now()}`,
      content,
      type: type || 'text', // 'vote' | 'text'
      options: options || [],
      timestamp: new Date().toISOString(),
    };

    // 存储问题（会被SSE流自动推送）
    storage.setQuestion(code, question);

    console.log(`✅ 教师发布问题 [课堂:${code}]:`, content);

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error('发布问题失败:', error);
    return NextResponse.json(
      { error: '发布失败' },
      { status: 500 }
    );
  }
}

// GET: 获取当前问题
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const question = storage.getQuestion(code);

    return NextResponse.json({
      success: true,
      question: question || null,
    });
  } catch (error) {
    console.error('获取问题失败:', error);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}
