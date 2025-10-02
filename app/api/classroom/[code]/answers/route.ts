/**
 * 教师查询学生答案API
 * 获取指定课堂的所有学生答案
 */
import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    // 可选：按问题ID分组
    const searchParams = request.nextUrl.searchParams;
    const questionId = searchParams.get('questionId');

    const answers = storage.getAnswers(code, questionId || undefined);

    return NextResponse.json({
      success: true,
      answers,
      count: answers.length,
    });
  } catch (error) {
    console.error('获取答案失败:', error);
    return NextResponse.json(
      { error: '获取失败' },
      { status: 500 }
    );
  }
}
