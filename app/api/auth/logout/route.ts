/**
 * 登出 API
 * POST /api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtUtils } from '@/lib/auth/jwt';
import { loginLogDb } from '@/lib/db/users';

export async function POST(_request: NextRequest) {
  try {
    // 1. 获取当前用户
    const user = await jwtUtils.getCurrentUser();

    // 2. 如果有登录日志 ID，记录登出时间
    if (user?.loginLogId) {
      await loginLogDb.recordLogout(user.loginLogId);
    }

    // 3. 清除 Cookie
    await jwtUtils.clearTokenCookie();

    return NextResponse.json({
      success: true,
      message: '登出成功',
    });
  } catch (error) {
    console.error('Logout error:', error);
    // 即使出错也清除 Cookie
    await jwtUtils.clearTokenCookie();

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '登出失败，但已清除登录状态',
      },
      { status: 500 }
    );
  }
}
