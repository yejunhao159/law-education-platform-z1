/**
 * Session验证 API
 * GET /api/auth/session
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtUtils } from '@/lib/auth/jwt'
import { userDb } from '@/lib/db/users'

export async function GET(_request: NextRequest) {
  try {
    // 验证JWT token
    const payload = await jwtUtils.getCurrentUser()

    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // 获取用户信息
    const user = await userDb.findById(payload.userId)

    if (!user || !user.is_active) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // 返回用户信息（不含密码）
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
