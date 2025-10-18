/**
 * PostgreSQL 数据库连接和初始化
 * 使用 pg 提供连接池，适合生产环境
 *
 * 从 SQLite (better-sqlite3) 迁移到 PostgreSQL
 * 优势：
 * - ✅ 无需编译原生模块
 * - ✅ 容器友好
 * - ✅ 支持并发
 * - ✅ 易于横向扩展
 * - ✅ 生产级数据库
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// =============================================================================
// 数据库连接配置
// =============================================================================
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'law_education',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',

  // 连接池配置
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时
  connectionTimeoutMillis: 2000, // 连接超时
};

// =============================================================================
// 创建连接池（单例模式）
// =============================================================================
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  dbInitialized: boolean | undefined;
};

if (!globalForDb.pool) {
  console.log('🔧 Initializing PostgreSQL connection pool...');
  console.log(`📍 Database: ${config.host}:${config.port}/${config.database}`);

  globalForDb.pool = new Pool(config);

  // 监听连接池事件
  globalForDb.pool.on('connect', () => {
    console.log('✅ New client connected to PostgreSQL');
  });

  globalForDb.pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
  });
}

export const pool = globalForDb.pool;

// =============================================================================
// 数据库初始化
// =============================================================================
export async function initDatabase() {
  try {
    console.log('🔧 Initializing database schema...');

    // 用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'teacher' CHECK(role IN ('admin', 'teacher')),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 登录日志表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        logout_time TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `);

    // 活动统计表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        action_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `);

    // 创建索引提升查询性能
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_login_logs_time ON login_logs(login_time);
      CREATE INDEX IF NOT EXISTS idx_activity_stats_user_id ON activity_stats(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_stats_time ON activity_stats(action_time);
    `);

    console.log('✅ Database schema initialized successfully');

    // 仅在生产环境且明确启用时才自动种子数据
    if (process.env.NODE_ENV === 'production' && process.env.AUTO_SEED_DATABASE === 'true') {
      console.log('🌱 Auto-seeding database in production...');
      try {
        const { seedDatabase } = await import('./seed');
        await seedDatabase();
      } catch (err) {
        console.error('Failed to seed database:', err);
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// 自动初始化数据库表结构（仅在首次连接时）
if (!globalForDb.dbInitialized) {
  initDatabase()
    .then(() => {
      globalForDb.dbInitialized = true;
    })
    .catch((error) => {
      console.error('❌ Database initialization failed:', error);
      // 不要退出进程，允许应用继续运行（可能在后续连接中成功）
    });
}

// =============================================================================
// 数据库操作辅助函数
// =============================================================================
export const dbUtils = {
  // 获取当前时间戳（ISO 格式）
  now: () => new Date().toISOString(),

  // 执行事务
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // 查询单行
  async queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
    const result = await pool.query(text, params);
    return result.rows[0] || null;
  },

  // 查询多行
  async queryMany<T = any>(text: string, params: any[] = []): Promise<T[]> {
    const result = await pool.query(text, params);
    return result.rows;
  },

  // 执行插入/更新/删除，返回受影响的行数
  async execute(text: string, params: any[] = []): Promise<number> {
    const result = await pool.query(text, params);
    return result.rowCount || 0;
  },
};

// =============================================================================
// 优雅关闭
// =============================================================================
export async function closeDatabase() {
  console.log('🔌 Closing database connections...');
  await pool.end();
  console.log('✅ Database connections closed');
}

// 监听进程退出事件
process.on('SIGTERM', async () => {
  await closeDatabase();
});

process.on('SIGINT', async () => {
  await closeDatabase();
});
