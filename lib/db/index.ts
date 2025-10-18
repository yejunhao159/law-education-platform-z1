/**
 * SQLite 数据库连接和初始化
 * 使用 better-sqlite3 提供同步 API，适合 Next.js
 *
 * 🎯 游客模式支持：数据库变成可选依赖
 * - 如果better-sqlite3不可用，系统仍然可以启动
 * - 游客模式下不需要数据库功能
 */

import path from 'path';
import fs from 'fs';

// 尝试导入better-sqlite3（可选依赖）
let Database: any;
let DB_AVAILABLE = false;

try {
  Database = require('better-sqlite3');
  DB_AVAILABLE = true;
  console.log('✅ better-sqlite3 loaded successfully');
} catch (error) {
  console.warn('⚠️  better-sqlite3 not available - running in database-free mode');
  console.warn('   This is normal in GUEST_MODE. Database features will be disabled.');
  DB_AVAILABLE = false;
}

// 数据库文件路径
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'app.db');

// 创建数据库连接（单例模式）
const globalForDb = globalThis as unknown as {
  db: any;
  dbInitialized: boolean | undefined;
};

// 仅在数据库可用时初始化
if (DB_AVAILABLE && !globalForDb.db) {
  try {
    // 确保数据目录存在
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
      console.log(`📁 Created database directory: ${DB_DIR}`);
    }

    // 创建数据库连接
    globalForDb.db = new Database(DB_PATH);
    console.log('✅ Database connection created:', DB_PATH);
  } catch (error) {
    console.error('❌ Failed to create database connection:', error);
    console.warn('   Continuing without database support');
    globalForDb.db = null;
  }
} else if (!DB_AVAILABLE) {
  globalForDb.db = null;
  console.log('ℹ️  Database disabled (GUEST_MODE)');
}

export const db = globalForDb.db;
export const isDatabaseAvailable = () => DB_AVAILABLE && db !== null;

// 自动初始化数据库表结构（仅在数据库可用时）
if (DB_AVAILABLE && db && !globalForDb.dbInitialized) {
  try {
    console.log('🔧 Initializing database schema...');
    initDatabase();
    globalForDb.dbInitialized = true;

    // 仅在生产环境且明确启用时才自动种子数据
    if (process.env.NODE_ENV === 'production' && process.env.AUTO_SEED_DATABASE === 'true') {
      console.log('🌱 Auto-seeding database in production...');
      setTimeout(() => {
        import('./seed')
          .then(({ seedDatabase }) => {
            seedDatabase();
          })
          .catch((err) => {
            console.error('Failed to seed database:', err);
          });
      }, 100);
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
} else if (!DB_AVAILABLE) {
  console.log('ℹ️  Skipping database initialization (database not available)');
}

// 初始化数据库表结构
export function initDatabase() {
  if (!db) {
    console.warn('⚠️  Cannot initialize database: database not available');
    return;
  }

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
