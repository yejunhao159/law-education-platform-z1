/**
 * 用户数据库操作 - PostgreSQL版本
 * 从 SQLite 迁移到 PostgreSQL
 * 所有操作改为异步
 */

import { pool, dbUtils } from './index';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  role: 'admin' | 'teacher';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithoutPassword extends Omit<User, 'password_hash'> {}

export interface LoginLog {
  id: number;
  user_id: number;
  login_time: string;
  logout_time: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ActivityStat {
  id: number;
  user_id: number;
  action_type: string;
  action_time: string;
  metadata: any | null;
}

// =============================================================================
// 用户操作
// =============================================================================
export const userDb = {
  // 根据用户名查找用户
  async findByUsername(username: string): Promise<User | null> {
    return await dbUtils.queryOne<User>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
  },

  // 根据 ID 查找用户
  async findById(id: number): Promise<User | null> {
    return await dbUtils.queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
  },

  // 创建用户
  async create(data: {
    username: string;
    password_hash: string;
    display_name: string;
    role?: 'admin' | 'teacher';
  }): Promise<User> {
    const now = dbUtils.now();
    const result = await pool.query<User>(
      `INSERT INTO users (username, password_hash, display_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.username,
        data.password_hash,
        data.display_name,
        data.role || 'teacher',
        now,
        now
      ]
    );

    return result.rows[0];
  },

  // 获取所有用户（不含密码）
  async findAll(): Promise<UserWithoutPassword[]> {
    return await dbUtils.queryMany<UserWithoutPassword>(
      `SELECT id, username, display_name, role, is_active, created_at, updated_at
       FROM users
       ORDER BY id`
    );
  },

  // 更新用户最后更新时间
  async updateTimestamp(id: number): Promise<void> {
    await pool.query(
      'UPDATE users SET updated_at = $1 WHERE id = $2',
      [dbUtils.now(), id]
    );
  },

  // 检查用户是否是管理员
  async isAdmin(id: number): Promise<boolean> {
    const user = await this.findById(id);
    return user?.role === 'admin';
  },
};

// =============================================================================
// 登录日志操作
// =============================================================================
export const loginLogDb = {
  // 记录登录
  async recordLogin(data: {
    user_id: number;
    ip_address?: string;
    user_agent?: string;
  }): Promise<LoginLog> {
    const result = await pool.query<LoginLog>(
      `INSERT INTO login_logs (user_id, login_time, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.user_id,
        dbUtils.now(),
        data.ip_address || null,
        data.user_agent || null
      ]
    );

    return result.rows[0];
  },

  // 记录登出
  async recordLogout(loginLogId: number): Promise<void> {
    await pool.query(
      'UPDATE login_logs SET logout_time = $1 WHERE id = $2',
      [dbUtils.now(), loginLogId]
    );
  },

  // 获取用户的登录历史
  async findByUser(userId: number, limit: number = 10): Promise<LoginLog[]> {
    return await dbUtils.queryMany<LoginLog>(
      `SELECT * FROM login_logs
       WHERE user_id = $1
       ORDER BY login_time DESC
       LIMIT $2`,
      [userId, limit]
    );
  },

  // 获取所有登录日志（用于管理后台）
  async findAll(limit: number = 100): Promise<LoginLog[]> {
    return await dbUtils.queryMany<LoginLog>(
      `SELECT * FROM login_logs
       ORDER BY login_time DESC
       LIMIT $1`,
      [limit]
    );
  },

  // 统计用户登录次数
  async countByUser(userId: number): Promise<number> {
    const result = await dbUtils.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM login_logs WHERE user_id = $1',
      [userId]
    );
    return parseInt(result?.count || '0', 10);
  },

  // 获取用户最后登录时间
  async getLastLoginTime(userId: number): Promise<string | null> {
    const result = await dbUtils.queryOne<{ login_time: string }>(
      `SELECT login_time FROM login_logs
       WHERE user_id = $1
       ORDER BY login_time DESC
       LIMIT 1`,
      [userId]
    );
    return result?.login_time || null;
  },
};

// =============================================================================
// 活动统计操作
// =============================================================================
export const activityDb = {
  // 记录活动
  async record(data: {
    user_id: number;
    action_type: string;
    metadata?: Record<string, any>;
  }): Promise<ActivityStat> {
    const result = await pool.query<ActivityStat>(
      `INSERT INTO activity_stats (user_id, action_type, action_time, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.user_id,
        data.action_type,
        dbUtils.now(),
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );

    return result.rows[0];
  },

  // 获取用户活动统计
  async findByUser(userId: number, limit: number = 50): Promise<ActivityStat[]> {
    return await dbUtils.queryMany<ActivityStat>(
      `SELECT * FROM activity_stats
       WHERE user_id = $1
       ORDER BY action_time DESC
       LIMIT $2`,
      [userId, limit]
    );
  },

  // 统计用户某类活动的次数
  async countByUserAndType(userId: number, actionType: string): Promise<number> {
    const result = await dbUtils.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM activity_stats
       WHERE user_id = $1 AND action_type = $2`,
      [userId, actionType]
    );
    return parseInt(result?.count || '0', 10);
  },
};
