/**
 * Next.js 中间件
 * 用于保护需要登录的路由
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'law-education-platform-secret-key-2025';
const secret = new TextEncoder().encode(JWT_SECRET);

// =============================================================================
// 🎯 游客模式开关（临时调试用）
// =============================================================================
// 设置为 true 时，跳过所有登录验证，直接放行
// 用于快速验证系统核心功能（AI教学、Socket.IO等）
// 生产环境请设置为 false
const GUEST_MODE = process.env.GUEST_MODE === 'true' || false;

// 公开路径（不需要登录）
const publicPaths = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ========== 游客模式：跳过所有验证 ==========
  if (GUEST_MODE) {
    console.log(`🎭 [GUEST MODE] 游客模式已启用，跳过登录验证: ${pathname}`);
    return NextResponse.next();
  }

  // 检查是否为公开路径
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // 获取 token
  const token = request.cookies.get('auth-token')?.value;

  // 验证 token
  let user = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      user = payload;
    } catch (error) {
      // Token 无效，清除 cookie
      const response = NextResponse.next();
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // 已登录用户访问登录页，重定向到首页
  if (isPublicPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 未登录用户访问非公开路径，重定向到登录页
  if (!isPublicPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 检查管理员权限（admin路径需要admin角色）
  if (pathname.startsWith('/admin') && user?.role !== 'admin') {
    // 无权限，重定向到首页
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
