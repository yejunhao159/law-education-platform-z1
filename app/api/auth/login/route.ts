/**
 * 登录 API
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { userDb, loginLogDb } from '@/lib/db/users';
import { passwordUtils } from '@/lib/auth/password';
import { jwtUtils } from '@/lib/auth/jwt';
import { z } from 'zod';

// 请求体验证
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. 解析和验证请求体
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: validation.error.errors[0]?.message || '请求参数错误',
        },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    // 2. 查找用户
    const user = await userDb.findByUsername(username);

    if (!user) {
      return NextResponse.json(
        { error: 'Login Failed', message: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 3. 检查用户是否激活
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account Disabled', message: '账号已被禁用' },
        { status: 403 }
      );
    }

    // 4. 验证密码
    const isPasswordValid = await passwordUtils.verify(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Login Failed', message: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 5. 记录登录日志
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const loginLog = await loginLogDb.recordLogin({
      user_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
    });

    // 6. 生成 JWT Token
    const token = await jwtUtils.sign({
      userId: user.id,
      username: user.username,
      role: user.role,
      loginLogId: loginLog.id,
    });

    // 7. 设置 Cookie
    await jwtUtils.setTokenCookie(token);

    // 8. 返回用户信息（不含密码）
    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '登录失败，请稍后重试',
      },
      { status: 500 }
    );
  }
}
