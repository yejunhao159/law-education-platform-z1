#!/usr/bin/env node
/**
 * 数据库初始化脚本
 * 在容器启动时运行，确保数据库和用户数据正确初始化
 */

const path = require('path');
const fs = require('fs');

console.log('🔧 [DB-INIT] Starting database initialization...');

try {
  // 1. 检查数据目录
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 [DB-INIT] Created data directory:', dataDir);
  }

  // 2. 测试写入权限
  const testFile = path.join(dataDir, '.permission-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ [DB-INIT] Data directory is writable');

  // 3. 动态导入数据库模块（触发初始化）
  console.log('🗄️  [DB-INIT] Initializing database schema...');
  const { db, initDatabase } = require('../lib/db/index');

  // 确保表结构创建
  initDatabase();
  console.log('✅ [DB-INIT] Database schema initialized');

  // 4. 检查用户数据
  const { userDb } = require('../lib/db/users');
  const existingUsers = userDb.findAll();

  if (existingUsers.length === 0) {
    console.log('🌱 [DB-INIT] No users found, importing seed data...');

    // 动态导入种子数据
    const { seedDatabase } = require('../lib/db/seed');
    seedDatabase();

    const users = userDb.findAll();
    console.log(`✅ [DB-INIT] Created ${users.length} seed users`);

    // 显示用户信息
    console.log('📋 [DB-INIT] Available accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach(user => {
      const roleDisplay = user.role === 'admin' ? '管理员' : '教师';
      console.log(`  ${user.username} - ${roleDisplay}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log(`✅ [DB-INIT] Database already has ${existingUsers.length} users`);
  }

  // 5. 验证数据库连接
  const testQuery = db.prepare('SELECT COUNT(*) as userCount FROM users');
  const result = testQuery.get();
  console.log(`✅ [DB-INIT] Database verification: ${result.userCount} users found`);

  console.log('🎉 [DB-INIT] Database initialization completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('❌ [DB-INIT] Database initialization failed:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}