/**
 * JWT Token 工具
 * 使用 jose 库（Edge Runtime 兼容）
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// JWT 密钥（从环境变量读取，如果没有则使用默认值）
const JWT_SECRET = process.env.JWT_SECRET || 'law-education-platform-secret-key-2025';
const secret = new TextEncoder().encode(JWT_SECRET);

// Token 有效期
const TOKEN_EXPIRY = '7d'; // 7天

export interface JwtPayload {
  userId: number;
  username: string;
  role: 'admin' | 'teacher';
  loginLogId?: number;
}

export const jwtUtils = {
  /**
   * 生成 JWT Token
   */
  async sign(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(secret);
  },

  /**
   * 验证并解析 JWT Token
   */
  async verify(token: string): Promise<JwtPayload | null> {
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as unknown as JwtPayload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  },

  /**
   * 从 Cookie 中获取 Token
   */
  async getTokenFromCookies(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get('auth-token')?.value || null;
  },

  /**
   * 从 Cookie 中获取并验证当前用户
   */
  async getCurrentUser(): Promise<JwtPayload | null> {
    const token = await this.getTokenFromCookies();
    if (!token) return null;
    return this.verify(token);
  },

  /**
   * 设置 Token 到 Cookie
   */
  async setTokenCookie(token: string): Promise<void> {
    const cookieStore = await cookies();

    // 智能判断是否使用 secure cookie
    // 只有在生产环境且使用HTTPS时才启用secure
    // 这样可以兼容HTTP的生产环境（如内网部署）
    const isProduction = process.env.NODE_ENV === 'production';
    const useHttps = process.env.FORCE_HTTPS === 'true' || process.env.HTTPS === 'true';

    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: isProduction && useHttps, // 生产环境 + HTTPS 才启用
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  },

  /**
   * 清除 Token Cookie
   */
  async clearTokenCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
  },
};
