/**
 * 教学会话管理 API
 * POST /api/teaching-sessions - 保存教学会话快照
 * GET /api/teaching-sessions - 获取我的教案列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtUtils } from '@/lib/auth/jwt';
import { teachingSessionRepository } from '@/src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository';
import type { TeachingSessionSnapshot } from '@/src/domains/teaching-acts/repositories/TeachingSessionRepository';

// ========== POST - 保存教学会话快照 ==========
export async function POST(request: NextRequest) {
  try {
    // 1. 验证JWT Token
    const payload = await jwtUtils.verify();
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const snapshot: TeachingSessionSnapshot = body.snapshot;

    // 3. 验证快照数据完整性
    if (!snapshot.caseTitle || !snapshot.act1_upload || !snapshot.act4_summary) {
      return NextResponse.json(
        { error: 'Invalid Data', message: '教学会话数据不完整' },
        { status: 400 }
      );
    }

    // 4. 保存到数据库
    const savedSession = await teachingSessionRepository.saveSnapshot(
      payload.userId,
      snapshot
    );

    console.log('✅ [API] 教学会话快照保存成功:', savedSession.id);

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      message: '案例学习已保存',
      data: {
        sessionId: savedSession.id,
        caseTitle: savedSession.caseTitle,
        createdAt: savedSession.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ [API] 保存教学会话失败:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : '保存失败',
      },
      { status: 500 }
    );
  }
}

// ========== GET - 获取我的教案列表 ==========
export async function GET(request: NextRequest) {
  try {
    // 1. 验证JWT Token
    const payload = await jwtUtils.verify();
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // 3. 查询数据库
    let result;
    if (search) {
      // 搜索模式
      const sessions = await teachingSessionRepository.search(payload.userId, search);
      result = { sessions, total: sessions.length };
    } else {
      // 列表模式
      result = await teachingSessionRepository.findByUserId(payload.userId, {
        page,
        limit,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });
    }

    // 4. 返回数据
    return NextResponse.json({
      success: true,
      data: {
        sessions: result.sessions,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] 获取教案列表失败:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取列表失败',
      },
      { status: 500 }
    );
  }
}
