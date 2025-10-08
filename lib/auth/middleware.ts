/**
 * 认证中间件
 * 用于保护需要登录的路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtUtils, type JwtPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}

/**
 * 检查用户是否已登录
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: JwtPayload } | NextResponse> {
  // 从 Cookie 中获取 token
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', message: '请先登录' },
      { status: 401 }
    );
  }

  // 验证 token
  const user = await jwtUtils.verify(token);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Token 无效或已过期' },
      { status: 401 }
    );
  }

  return { user };
}

/**
 * 检查用户是否是管理员
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: JwtPayload } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden', message: '需要管理员权限' },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * 可选认证：如果有 token 则验证，没有也允许访问
 */
export async function optionalAuth(
  request: NextRequest
): Promise<JwtPayload | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return jwtUtils.verify(token);
}
