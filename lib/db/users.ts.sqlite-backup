/**
 * 用户数据库操作
 */

import { db, dbUtils } from './index';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  role: 'admin' | 'teacher';
  is_active: number;
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
  metadata: string | null;
}

// 用户操作
export const userDb = {
  // 根据用户名查找用户
  findByUsername(username: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | undefined;
  },

  // 根据 ID 查找用户
  findById(id: number): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  },

  // 创建用户
  create(data: {
    username: string;
    password_hash: string;
    display_name: string;
    role?: 'admin' | 'teacher';
  }): User {
    const now = dbUtils.now();
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.username,
      data.password_hash,
      data.display_name,
      data.role || 'teacher',
      now,
      now
    );

    return this.findById(Number(info.lastInsertRowid))!;
  },

  // 获取所有用户（不含密码）
  findAll(): UserWithoutPassword[] {
    const stmt = db.prepare(`
      SELECT id, username, display_name, role, is_active, created_at, updated_at
      FROM users
      ORDER BY id
    `);
    return stmt.all() as UserWithoutPassword[];
  },

  // 更新用户最后更新时间
  updateTimestamp(id: number): void {
    const stmt = db.prepare('UPDATE users SET updated_at = ? WHERE id = ?');
    stmt.run(dbUtils.now(), id);
  },

  // 检查用户是否是管理员
  isAdmin(id: number): boolean {
    const user = this.findById(id);
    return user?.role === 'admin';
  },
};

// 登录日志操作
export const loginLogDb = {
  // 记录登录
  recordLogin(data: {
    user_id: number;
    ip_address?: string;
    user_agent?: string;
  }): LoginLog {
    const stmt = db.prepare(`
      INSERT INTO login_logs (user_id, login_time, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.user_id,
      dbUtils.now(),
      data.ip_address || null,
      data.user_agent || null
    );

    const getStmt = db.prepare('SELECT * FROM login_logs WHERE id = ?');
    return getStmt.get(Number(info.lastInsertRowid)) as LoginLog;
  },

  // 记录登出
  recordLogout(loginLogId: number): void {
    const stmt = db.prepare('UPDATE login_logs SET logout_time = ? WHERE id = ?');
    stmt.run(dbUtils.now(), loginLogId);
  },

  // 获取用户的登录历史
  findByUser(userId: number, limit: number = 10): LoginLog[] {
    const stmt = db.prepare(`
      SELECT * FROM login_logs
      WHERE user_id = ?
      ORDER BY login_time DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as LoginLog[];
  },

  // 获取所有登录日志（用于管理后台）
  findAll(limit: number = 100): LoginLog[] {
    const stmt = db.prepare(`
      SELECT * FROM login_logs
      ORDER BY login_time DESC
      LIMIT ?
    `);
    return stmt.all(limit) as LoginLog[];
  },

  // 统计用户登录次数
  countByUser(userId: number): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM login_logs WHERE user_id = ?');
    const result = stmt.get(userId) as { count: number };
    return result.count;
  },

  // 获取用户最后登录时间
  getLastLoginTime(userId: number): string | null {
    const stmt = db.prepare(`
      SELECT login_time FROM login_logs
      WHERE user_id = ?
      ORDER BY login_time DESC
      LIMIT 1
    `);
    const result = stmt.get(userId) as { login_time: string } | undefined;
    return result?.login_time || null;
  },
};

// 活动统计操作
export const activityDb = {
  // 记录活动
  record(data: {
    user_id: number;
    action_type: string;
    metadata?: Record<string, any>;
  }): ActivityStat {
    const stmt = db.prepare(`
      INSERT INTO activity_stats (user_id, action_type, action_time, metadata)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.user_id,
      data.action_type,
      dbUtils.now(),
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    const getStmt = db.prepare('SELECT * FROM activity_stats WHERE id = ?');
    return getStmt.get(Number(info.lastInsertRowid)) as ActivityStat;
  },

  // 获取用户活动统计
  findByUser(userId: number, limit: number = 50): ActivityStat[] {
    const stmt = db.prepare(`
      SELECT * FROM activity_stats
      WHERE user_id = ?
      ORDER BY action_time DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as ActivityStat[];
  },

  // 统计用户某类活动的次数
  countByUserAndType(userId: number, actionType: string): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM activity_stats
      WHERE user_id = ? AND action_type = ?
    `);
    const result = stmt.get(userId, actionType) as { count: number };
    return result.count;
  },
};
