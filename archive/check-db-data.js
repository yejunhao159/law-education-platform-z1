/**
 * 查看数据库中的数据
 * 在Node.js环境执行: node check-db-data.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'app.db');

console.log('='.repeat(60));
console.log('📊 数据库数据检查');
console.log('='.repeat(60));
console.log('数据库路径:', DB_PATH);

try {
  const db = new Database(DB_PATH, { readonly: true });

  // 查看所有表
  console.log('\n--- 数据库表列表 ---');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `).all();

  console.log('表数量:', tables.length);
  tables.forEach((table, idx) => {
    console.log(`  ${idx + 1}. ${table.name}`);
  });

  // 用户统计
  console.log('\n--- 用户表统计 ---');
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('用户总数:', userCount.count);

  if (userCount.count > 0) {
    const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users').all();
    console.log('\n用户列表:');
    users.forEach(user => {
      console.log(`  - ${user.display_name} (@${user.username}) [${user.role}]`);
      console.log(`    ID: ${user.id}, 创建于: ${user.created_at}`);
    });
  }

  // 登录日志统计
  console.log('\n--- 登录日志统计 ---');
  const loginCount = db.prepare('SELECT COUNT(*) as count FROM login_logs').get();
  console.log('登录记录数:', loginCount.count);

  if (loginCount.count > 0) {
    const recentLogins = db.prepare(`
      SELECT l.*, u.username, u.display_name
      FROM login_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.login_time DESC
      LIMIT 5
    `).all();

    console.log('\n最近5次登录:');
    recentLogins.forEach((log, idx) => {
      console.log(`  ${idx + 1}. ${log.display_name} (@${log.username})`);
      console.log(`     登录时间: ${log.login_time}`);
      console.log(`     登出时间: ${log.logout_time || '(仍在线)'}`);
      console.log(`     IP: ${log.ip_address || 'N/A'}`);
    });
  }

  // 活动统计
  console.log('\n--- 活动统计 ---');
  const activityCount = db.prepare('SELECT COUNT(*) as count FROM activity_stats').get();
  console.log('活动记录数:', activityCount.count);

  if (activityCount.count > 0) {
    const activityByType = db.prepare(`
      SELECT action_type, COUNT(*) as count
      FROM activity_stats
      GROUP BY action_type
      ORDER BY count DESC
    `).all();

    console.log('\n按类型分组:');
    activityByType.forEach(stat => {
      console.log(`  ${stat.action_type}: ${stat.count}`);
    });

    const recentActivities = db.prepare(`
      SELECT a.*, u.username, u.display_name
      FROM activity_stats a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.action_time DESC
      LIMIT 10
    `).all();

    console.log('\n最近10条活动:');
    recentActivities.forEach((activity, idx) => {
      console.log(`  ${idx + 1}. ${activity.display_name} - ${activity.action_type}`);
      console.log(`     时间: ${activity.action_time}`);
      if (activity.metadata) {
        try {
          const meta = JSON.parse(activity.metadata);
          console.log(`     元数据:`, meta);
        } catch (e) {
          console.log(`     元数据: ${activity.metadata}`);
        }
      }
    });
  }

  // 数据库大小
  console.log('\n--- 数据库信息 ---');
  const fs = require('fs');
  const stats = fs.statSync(DB_PATH);
  console.log('数据库文件大小:', (stats.size / 1024).toFixed(2), 'KB');

  // 页面统计
  const pageCount = db.prepare('PRAGMA page_count').get();
  const pageSize = db.prepare('PRAGMA page_size').get();
  console.log('页面数:', pageCount.page_count);
  console.log('页面大小:', pageSize.page_size, 'bytes');

  db.close();

  console.log('\n' + '='.repeat(60));
  console.log('✅ 检查完成');
  console.log('='.repeat(60));

  // 提示关于localStorage数据
  console.log('\n💡 注意: 第四幕教学数据存储在浏览器的 localStorage 中');
  console.log('   请在浏览器控制台执行 check-teaching-data.js 查看完整数据');
  console.log('   执行方法:');
  console.log('   1. 打开浏览器控制台 (F12)');
  console.log('   2. 复制 check-teaching-data.js 的内容');
  console.log('   3. 粘贴到控制台并回车');

} catch (error) {
  console.error('❌ 错误:', error.message);
  if (error.message.includes('database is locked')) {
    console.log('\n提示: 数据库被锁定，请关闭其他访问数据库的程序');
  } else if (error.message.includes('no such table')) {
    console.log('\n提示: 数据库表不存在，可能尚未初始化');
  }
}
