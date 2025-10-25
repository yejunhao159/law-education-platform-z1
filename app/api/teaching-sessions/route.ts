/**
 * 教学会话管理 API
 * POST /api/teaching-sessions - 保存教学会话快照
 * GET /api/teaching-sessions - 获取我的教案列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtUtils } from '@/lib/auth/jwt';
import { teachingSessionRepository } from '@/src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository';
import type { TeachingSessionSnapshot } from '@/src/domains/teaching-acts/repositories/TeachingSessionRepository';
import {
  getValidationErrorMessage,
  validateTeachingSessionSnapshot,
} from '@/src/domains/teaching-acts/schemas/SnapshotSchemas';

// ========== POST - 保存教学会话快照 ==========
export async function POST(request: NextRequest) {
  try {
    // 1. 验证JWT Token
    const payload = await jwtUtils.getCurrentUser();
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const snapshot: TeachingSessionSnapshot | undefined = body.snapshot;
    const sessionIdFromBody: string | undefined = body.sessionId;

    // 🔍 Debug: 检查接收到的数据
    console.log('🔍 [API] 接收到的snapshot数据检查:', {
      hasAct1: !!snapshot?.act1,
      plaintiffType: typeof snapshot?.act1?.basicInfo?.parties?.plaintiff?.[0],
      plaintiffValue: snapshot?.act1?.basicInfo?.parties?.plaintiff?.[0],
      evidenceItemType: (snapshot?.act1?.evidence as any)?.items?.[0]?.type,
      evidenceItemDescription: (snapshot?.act1?.evidence as any)?.items?.[0]?.description,
      extractionMethod: snapshot?.act1?.metadata?.extractionMethod,
    });

    const validation = validateTeachingSessionSnapshot(snapshot);
    if (!validation.success || !validation.data) {
      const message = validation.error
        ? getValidationErrorMessage(validation.error)
        : '教学会话数据不完整';

      // 🔍 添加详细的验证错误日志
      console.error('❌ [API] Snapshot验证失败:', {
        message,
        errorDetails: validation.error?.issues,
        snapshotKeys: snapshot ? Object.keys(snapshot) : 'undefined',
        snapshotVersion: (snapshot as any)?.version,
      });

      return NextResponse.json(
        { error: 'Invalid Data', message },
        { status: 400 }
      );
    }

    const snapshotData = validation.data;

    // 4. 保存到数据库
    const savedSession = await teachingSessionRepository.saveSnapshot(
      payload.userId,
      snapshotData,
      sessionIdFromBody
    );

    console.log('✅ [API] 教学会话快照保存成功:', {
      sessionId: savedSession.id,
      sessionState: savedSession.sessionState,
    });

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      message: sessionIdFromBody ? '案例学习已更新' : '案例学习已保存',
      data: {
        sessionId: savedSession.id,
        caseTitle: savedSession.caseTitle,
        sessionState: savedSession.sessionState,
        createdAt: savedSession.createdAt,
        updatedAt: savedSession.updatedAt,
        completedAt: savedSession.completedAt,
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
    const payload = await jwtUtils.getCurrentUser();
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
