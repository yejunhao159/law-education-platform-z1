/**
 * 管理后台 - 统计数据 API
 * GET /api/admin/stats
 * 只有 admin 角色可以访问
 * PostgreSQL 版本
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db';
import { userDb, loginLogDb } from '@/lib/db/users';

export async function GET(request: NextRequest) {
  // 1. 检查管理员权限
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // 2. 获取基础统计
    const users = await userDb.findAll();
    const totalUsers = users.length;

    // 3. 获取总登录次数
    const totalLoginsResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM login_logs'
    );
    const totalLogins = parseInt(totalLoginsResult.rows[0].count, 10);

    // 4. 获取最近7天的登录统计
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const recentLoginsResult = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM login_logs WHERE login_time >= $1',
      [sevenDaysAgoISO]
    );
    const recentLogins = parseInt(recentLoginsResult.rows[0].count, 10);

    // 5. 获取活跃用户数（最近7天登录过的）
    const activeUsersResult = await pool.query<{ count: string }>(
      'SELECT COUNT(DISTINCT user_id) as count FROM login_logs WHERE login_time >= $1',
      [sevenDaysAgoISO]
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count, 10);

    // 6. 获取最近登录记录（最近10条）
    const recentLoginLogs = await loginLogDb.findAll(10);

    // 7. 获取每日登录趋势（最近7天）
    const dailyLoginsResult = await pool.query<{ date: string; count: string }>(
      `SELECT
        DATE(login_time) as date,
        COUNT(*) as count
      FROM login_logs
      WHERE login_time >= $1
      GROUP BY DATE(login_time)
      ORDER BY date DESC
      LIMIT 7`,
      [sevenDaysAgoISO]
    );
    const dailyLogins = dailyLoginsResult.rows.map((row) => ({
      date: row.date,
      count: parseInt(row.count, 10),
    }));

    // 8. 获取用户登录排行（Top 5）
    const topUsersResult = await pool.query<{
      id: number;
      username: string;
      display_name: string;
      login_count: string;
    }>(
      `SELECT
        u.id,
        u.username,
        u.display_name,
        COUNT(l.id) as login_count
      FROM users u
      LEFT JOIN login_logs l ON u.id = l.user_id
      GROUP BY u.id, u.username, u.display_name
      ORDER BY login_count DESC
      LIMIT 5`
    );
    const topUsers = topUsersResult.rows.map((row) => ({
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      login_count: parseInt(row.login_count, 10),
    }));

    return NextResponse.json({
      summary: {
        totalUsers,
        totalLogins,
        recentLogins, // 最近7天
        activeUsers, // 最近7天活跃用户
      },
      charts: {
        dailyLogins: dailyLogins.reverse(), // 按时间正序
        topUsers,
      },
      recentActivity: recentLoginLogs,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '获取统计数据失败',
      },
      { status: 500 }
    );
  }
}
