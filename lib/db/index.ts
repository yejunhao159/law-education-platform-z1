/**
 * SQLite 数据库连接和初始化
 * 使用 better-sqlite3 提供同步 API，适合 Next.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库文件路径
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'app.db');

// 确保数据目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 创建数据库连接（单例模式）
const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
  dbInitialized: boolean | undefined;
};

// 初始化数据库连接
if (!globalForDb.db) {
  try {
    globalForDb.db = new Database(DB_PATH);
    console.log('✅ Database connection created:', DB_PATH);
  } catch (error) {
    console.error('❌ Failed to create database connection:', error);
    throw error;
  }
}

export const db = globalForDb.db;

// 自动初始化数据库表结构（仅首次）
if (!globalForDb.dbInitialized) {
  try {
    console.log('🔧 Initializing database schema...');
    initDatabase();
    globalForDb.dbInitialized = true;

    // 异步导入种子数据（避免阻塞）
    setTimeout(() => {
      import('./seed')
        .then(({ seedDatabase }) => {
          seedDatabase();
        })
        .catch((err) => {
          console.error('Failed to seed database:', err);
        });
    }, 100);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
}

// 初始化数据库表结构
export function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT DEFAULT 'teacher' CHECK(role IN ('admin', 'teacher')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 登录日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      login_time TEXT NOT NULL,
      logout_time TEXT,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 活动统计表
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      action_time TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 创建索引提升查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_logs_time ON login_logs(login_time);
    CREATE INDEX IF NOT EXISTS idx_activity_stats_user_id ON activity_stats(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_stats_time ON activity_stats(action_time);
  `);

  console.log('✅ Database initialized successfully');
}

// 导出数据库操作辅助函数
export const dbUtils = {
  // 获取当前时间戳（ISO 格式）
  now: () => new Date().toISOString(),

  // 执行事务
  transaction: <T>(fn: () => T): T => {
    return db.transaction(fn)();
  },
};
