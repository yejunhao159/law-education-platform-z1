#!/usr/bin/env ts-node
/**
 * 快照数据库清理脚本
 * T083: 自动清理过期的软删除记录
 *
 * 使用方式:
 * npm run cleanup:snapshots
 * 或
 * ts-node scripts/cleanup-snapshots.ts [--dry-run] [--retention-days=30]
 */

import { Pool } from 'pg';
import { getConfig } from '../lib/config/snapshot-config';

/**
 * 清理统计
 */
interface CleanupStats {
  snapshotsDeleted: number;
  dialoguesDeleted: number;
  totalRecordsDeleted: number;
  dryRun: boolean;
  retentionDays: number;
  executionTimeMs: number;
}

/**
 * 命令行参数
 */
interface CommandLineArgs {
  dryRun: boolean;
  retentionDays?: number;
  verbose: boolean;
}

/**
 * 解析命令行参数
 */
function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  const parsed: CommandLineArgs = {
    dryRun: false,
    verbose: false,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg.startsWith('--retention-days=')) {
      parsed.retentionDays = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--verbose' || arg === '-v') {
      parsed.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return parsed;
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
快照数据库清理脚本

用法:
  npm run cleanup:snapshots [选项]
  ts-node scripts/cleanup-snapshots.ts [选项]

选项:
  --dry-run            模拟运行,不实际删除数据
  --retention-days=N   指定保留天数 (默认从配置读取)
  --verbose, -v        显示详细日志
  --help, -h           显示帮助信息

示例:
  npm run cleanup:snapshots --dry-run
  npm run cleanup:snapshots --retention-days=30
  npm run cleanup:snapshots --verbose
`);
}

/**
 * 创建数据库连接
 */
function createDbPool(): Pool {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'law_education',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });

  return pool;
}

/**
 * 清理过期的快照记录
 */
async function cleanupSnapshots(
  pool: Pool,
  retentionDays: number,
  dryRun: boolean,
  verbose: boolean
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  if (verbose) {
    console.log(`\n[Snapshots] Cleaning records deleted before ${cutoffDate.toISOString()}`);
  }

  // 1. 查找要删除的记录
  const findQuery = `
    SELECT version_id, session_id, deleted_at
    FROM teaching_session_snapshots
    WHERE deleted_at IS NOT NULL
      AND deleted_at < $1
    ORDER BY deleted_at ASC
  `;

  const findResult = await pool.query(findQuery, [cutoffDate]);

  if (verbose) {
    console.log(`[Snapshots] Found ${findResult.rows.length} records to clean`);
    if (findResult.rows.length > 0) {
      console.log(`[Snapshots] Sample records:`);
      findResult.rows.slice(0, 5).forEach((row) => {
        console.log(`  - ${row.version_id} (deleted at: ${row.deleted_at})`);
      });
    }
  }

  if (dryRun) {
    console.log(`[Snapshots] DRY RUN: Would delete ${findResult.rows.length} snapshot records`);
    return findResult.rows.length;
  }

  // 2. 实际删除
  if (findResult.rows.length === 0) {
    return 0;
  }

  const deleteQuery = `
    DELETE FROM teaching_session_snapshots
    WHERE deleted_at IS NOT NULL
      AND deleted_at < $1
  `;

  const deleteResult = await pool.query(deleteQuery, [cutoffDate]);

  if (verbose) {
    console.log(`[Snapshots] Deleted ${deleteResult.rowCount} records`);
  }

  return deleteResult.rowCount || 0;
}

/**
 * 清理过期的对话记录
 */
async function cleanupDialogues(
  pool: Pool,
  retentionDays: number,
  dryRun: boolean,
  verbose: boolean
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  if (verbose) {
    console.log(`\n[Dialogues] Cleaning records deleted before ${cutoffDate.toISOString()}`);
  }

  // 1. 查找要删除的记录
  const findQuery = `
    SELECT turn_id, session_id, deleted_at
    FROM teaching_session_dialogues
    WHERE deleted_at IS NOT NULL
      AND deleted_at < $1
    ORDER BY deleted_at ASC
  `;

  const findResult = await pool.query(findQuery, [cutoffDate]);

  if (verbose) {
    console.log(`[Dialogues] Found ${findResult.rows.length} records to clean`);
    if (findResult.rows.length > 0) {
      console.log(`[Dialogues] Sample records:`);
      findResult.rows.slice(0, 5).forEach((row) => {
        console.log(`  - ${row.turn_id} (deleted at: ${row.deleted_at})`);
      });
    }
  }

  if (dryRun) {
    console.log(`[Dialogues] DRY RUN: Would delete ${findResult.rows.length} dialogue records`);
    return findResult.rows.length;
  }

  // 2. 实际删除
  if (findResult.rows.length === 0) {
    return 0;
  }

  const deleteQuery = `
    DELETE FROM teaching_session_dialogues
    WHERE deleted_at IS NOT NULL
      AND deleted_at < $1
  `;

  const deleteResult = await pool.query(deleteQuery, [cutoffDate]);

  if (verbose) {
    console.log(`[Dialogues] Deleted ${deleteResult.rowCount} records`);
  }

  return deleteResult.rowCount || 0;
}

/**
 * 执行清理
 */
async function runCleanup(): Promise<CleanupStats> {
  const startTime = Date.now();
  const args = parseArgs();
  const config = getConfig();

  // 确定保留天数
  const retentionDays =
    args.retentionDays !== undefined
      ? args.retentionDays
      : config.database.softDeleteRetentionDays;

  console.log('========================================');
  console.log('快照数据库清理脚本');
  console.log('========================================');
  console.log(`Mode: ${args.dryRun ? 'DRY RUN (模拟)' : 'PRODUCTION (实际删除)'}`);
  console.log(`Retention Days: ${retentionDays}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('========================================\n');

  // 创建数据库连接
  const pool = createDbPool();

  try {
    // 清理快照
    const snapshotsDeleted = await cleanupSnapshots(
      pool,
      retentionDays,
      args.dryRun,
      args.verbose
    );

    // 清理对话
    const dialoguesDeleted = await cleanupDialogues(
      pool,
      retentionDays,
      args.dryRun,
      args.verbose
    );

    const executionTimeMs = Date.now() - startTime;

    const stats: CleanupStats = {
      snapshotsDeleted,
      dialoguesDeleted,
      totalRecordsDeleted: snapshotsDeleted + dialoguesDeleted,
      dryRun: args.dryRun,
      retentionDays,
      executionTimeMs,
    };

    return stats;
  } finally {
    await pool.end();
  }
}

/**
 * 打印清理结果
 */
function printStats(stats: CleanupStats) {
  console.log('\n========================================');
  console.log('清理结果');
  console.log('========================================');
  console.log(`Snapshots Deleted: ${stats.snapshotsDeleted}`);
  console.log(`Dialogues Deleted: ${stats.dialoguesDeleted}`);
  console.log(`Total Records Deleted: ${stats.totalRecordsDeleted}`);
  console.log(`Execution Time: ${stats.executionTimeMs}ms`);
  console.log(`Mode: ${stats.dryRun ? 'DRY RUN (no changes made)' : 'PRODUCTION (changes committed)'}`);
  console.log('========================================\n');

  if (stats.dryRun) {
    console.log('✅ DRY RUN completed successfully. No data was deleted.');
    console.log('   Remove --dry-run flag to perform actual deletion.\n');
  } else if (stats.totalRecordsDeleted > 0) {
    console.log(`✅ Successfully deleted ${stats.totalRecordsDeleted} expired records.\n`);
  } else {
    console.log('✅ No expired records found. Database is clean.\n');
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const stats = await runCleanup();
    printStats(stats);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    console.error('\nError details:');
    console.error(error);
    process.exit(1);
  }
}

// 运行清理
if (require.main === module) {
  main();
}

export { runCleanup, CleanupStats };
