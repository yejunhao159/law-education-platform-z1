/**
 * 单个教学会话查询
 * GET /api/teaching-sessions/:id - 获取教学会话详情
 * DELETE /api/teaching-sessions/:id - 删除教学会话
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtUtils } from '@/lib/auth/jwt';
import { teachingSessionRepository } from '@/src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15: await params
    const resolvedParams = await params;

    // 1. 验证JWT Token
    const payload = await jwtUtils.getCurrentUser();
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 查询会话
    const session = await teachingSessionRepository.findById(resolvedParams.id, payload.userId);

    if (!session) {
      return NextResponse.json(
        { error: 'Not Found', message: '教学会话不存在' },
        { status: 404 }
      );
    }

    // 3. 更新最后查看时间
    await teachingSessionRepository.updateLastViewed(resolvedParams.id);

    // 4. 返回完整数据
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('❌ [API] 获取教学会话失败:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取失败',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15: await params
    const resolvedParams = await params;

    // 1. 验证JWT Token
    const payload = await jwtUtils.getCurrentUser();
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 删除会话
    await teachingSessionRepository.delete(resolvedParams.id, payload.userId);

    // 3. 返回成功
    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('❌ [API] 删除教学会话失败:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '删除失败',
      },
      { status: 500 }
    );
  }
}
