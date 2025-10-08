/**
 * 获取当前会话信息 API
 * GET /api/auth/session
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtUtils } from '@/lib/auth/jwt';
import { userDb } from '@/lib/db/users';

export async function GET(_request: NextRequest) {
  try {
    // 1. 获取当前用户
    const jwtPayload = await jwtUtils.getCurrentUser();

    if (!jwtPayload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '未登录' },
        { status: 401 }
      );
    }

    // 2. 从数据库获取最新用户信息
    const user = userDb.findById(jwtPayload.userId);

    if (!user) {
      // 用户已被删除
      await jwtUtils.clearTokenCookie();
      return NextResponse.json(
        { error: 'User Not Found', message: '用户不存在' },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      // 用户已被禁用
      await jwtUtils.clearTokenCookie();
      return NextResponse.json(
        { error: 'Account Disabled', message: '账号已被禁用' },
        { status: 403 }
      );
    }

    // 3. 返回用户信息（不含密码）
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取会话信息失败',
      },
      { status: 500 }
    );
  }
}
