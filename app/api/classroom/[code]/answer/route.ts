/**
 * 学生答案接收API
 * 接收学生提交的答案并存储
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
    const { questionId, answer, timestamp } = body;

    if (!questionId || !answer) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 添加答案到存储
    storage.addAnswer(code, {
      questionId,
      answer,
      timestamp: timestamp || new Date().toISOString(),
    });

    console.log(`📝 收到答案 [课堂:${code}] [问题:${questionId}]:`, answer);

    return NextResponse.json({
      success: true,
      message: '答案已提交',
    });
  } catch (error) {
    console.error('处理答案提交失败:', error);
    return NextResponse.json(
      { error: '提交失败' },
      { status: 500 }
    );
  }
}
