/**
 * 检查数据库表结构
 */

import { pool } from '../lib/db';

async function checkSchema() {
  console.log('🔍 检查数据库表结构...\n');

  try {
    // 1. 检查表是否存在
    const tableCheck = await pool.query(`
      SELECT tablename, schemaname
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'teaching_sessions'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ teaching_sessions 表不存在！');
      await pool.end();
      process.exit(1);
    }

    console.log('✅ teaching_sessions 表存在\n');

    // 2. 查看表结构
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

    console.log('📋 表字段:');
    columns.rows.forEach((col) => {
      const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type}${nullable}${def}`);
    });

    // 3. 查看索引
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'teaching_sessions'
    `);

    console.log('\n📊 索引:');
    indexes.rows.forEach((idx) => {
      console.log(`  - ${idx.indexname}`);
    });

    // 4. 查看触发器
    const triggers = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'teaching_sessions'
    `);

    if (triggers.rows.length > 0) {
      console.log('\n🎯 触发器:');
      triggers.rows.forEach((trg) => {
        console.log(`  - ${trg.trigger_name} (${trg.event_manipulation})`);
      });
    }

    // 5. 统计数据
    const count = await pool.query(`
      SELECT COUNT(*) as total FROM teaching_sessions WHERE deleted_at IS NULL
    `);

    console.log(`\n📈 当前记录数: ${count.rows[0].total}`);

    console.log('\n✅ 表结构检查完成！');

    await pool.end();
  } catch (error) {
    console.error('❌ 检查失败:', error);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
