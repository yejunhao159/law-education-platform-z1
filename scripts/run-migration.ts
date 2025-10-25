/**
 * 数据库迁移脚本执行器
 * 运行 migrations/002_simplified_teaching_sessions.sql
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../lib/db';

async function runMigration() {
  console.log('🚀 开始运行数据库迁移...\n');

  try {
    // 读取迁移脚本
    const migrationPath = join(
      process.cwd(),
      'migrations',
      '002_simplified_teaching_sessions.sql'
    );
    console.log(`📄 读取迁移文件: ${migrationPath}`);

    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📊 执行迁移SQL...');

    // 执行迁移
    await pool.query(migrationSQL);

    console.log('\n✅ 迁移执行成功！');

    // 验证表是否创建
    const tableCheck = await pool.query(`
      SELECT
        tablename,
        schemaname
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = 'teaching_sessions'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ teaching_sessions 表已成功创建');

      // 查看表结构
      const columns = await pool.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'teaching_sessions'
        ORDER BY ordinal_position
      `);

      console.log('\n📋 表结构:');
      columns.rows.forEach((col) => {
        console.log(
          `  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`
        );
      });

      // 查看索引
      const indexes = await pool.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = 'teaching_sessions'
      `);

      console.log('\n📊 索引:');
      indexes.rows.forEach((idx) => {
        console.log(`  - ${idx.indexname}`);
      });
    } else {
      throw new Error('teaching_sessions 表创建失败');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
