/**
 * 管理后台 - 用户列表 API
 * GET /api/admin/users
 * 只有 admin 角色可以访问
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { userDb, loginLogDb } from '@/lib/db/users';

export async function GET(request: NextRequest) {
  // 1. 检查管理员权限
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // 2. 获取所有用户
    const users = userDb.findAll();

    // 3. 为每个用户添加统计信息
    const usersWithStats = users.map((user) => {
      const loginCount = loginLogDb.countByUser(user.id);
      const lastLoginTime = loginLogDb.getLastLoginTime(user.id);

      return {
        ...user,
        stats: {
          loginCount,
          lastLoginTime,
        },
      };
    });

    return NextResponse.json({
      users: usersWithStats,
      total: usersWithStats.length,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取用户列表失败',
      },
      { status: 500 }
    );
  }
}
