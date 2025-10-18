/**
 * 数据库种子数据 - PostgreSQL版本
 * 创建5个预置账号
 * 从 SQLite 迁移到 PostgreSQL - 所有操作改为异步
 */

import { userDb } from './users';
import { passwordUtils } from '../auth/password';

// 5个预置账号配置
const SEED_USERS = [
  {
    username: 'teacher01',
    password: '2025',
    display_name: '老师01',
    role: 'admin' as const, // 只有 teacher01 是管理员
  },
  {
    username: 'teacher02',
    password: '2025',
    display_name: '老师02',
    role: 'teacher' as const,
  },
  {
    username: 'teacher03',
    password: '2025',
    display_name: '老师03',
    role: 'teacher' as const,
  },
  {
    username: 'teacher04',
    password: '2025',
    display_name: '老师04',
    role: 'teacher' as const,
  },
  {
    username: 'teacher05',
    password: '2025',
    display_name: '老师05',
    role: 'teacher' as const,
  },
];

/**
 * 初始化数据库并创建种子数据（异步版本）
 */
export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. 检查是否已有用户
    const existingUsers = await userDb.findAll();
    if (existingUsers.length > 0) {
      console.log(`⚠️  Database already has ${existingUsers.length} users. Skipping seed.`);
      return;
    }

    // 2. 创建5个预置账号
    console.log('📝 Creating seed users...');

    for (const userData of SEED_USERS) {
      const passwordHash = passwordUtils.hashSync(userData.password);

      try {
        // 检查用户是否已存在（避免唯一约束冲突）
        const existingUser = await userDb.findByUsername(userData.username);
        if (existingUser) {
          console.log(`  ⏭️  User ${userData.username} already exists. Skipping...`);
          continue;
        }

        const user = await userDb.create({
          username: userData.username,
          password_hash: passwordHash,
          display_name: userData.display_name,
          role: userData.role,
        });

        console.log(`  ✅ Created user: ${user.username} (${user.display_name}) - Role: ${user.role}`);
      } catch (error: any) {
        // PostgreSQL唯一约束错误
        if (error.code === '23505') {
          console.log(`  ⏭️  User ${userData.username} already exists. Skipping...`);
        } else {
          console.error(`  ❌ Failed to create user ${userData.username}:`, error);
        }
      }
    }

    console.log('🎉 Database seeding completed!');
    console.log('');
    console.log('📋 Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username     │ Password │ Role');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    SEED_USERS.forEach((user) => {
      const roleDisplay = user.role === 'admin' ? '管理员' : '教师';
      console.log(`${user.username.padEnd(12)} │ ${user.password.padEnd(8)} │ ${roleDisplay}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

/**
 * 重置数据库（危险操作！）
 */
export async function resetDatabase() {
  console.log('⚠️  Resetting database...');

  const { pool } = await import('./index');

  await pool.query('DROP TABLE IF EXISTS activity_stats CASCADE');
  await pool.query('DROP TABLE IF EXISTS login_logs CASCADE');
  await pool.query('DROP TABLE IF EXISTS users CASCADE');

  console.log('✅ Database tables dropped');

  await seedDatabase();
}

// 如果直接运行此脚本，则执行种子数据
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}
