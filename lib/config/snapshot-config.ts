/**
 * 快照系统配置管理
 * T082: 环境特定配置
 * 支持开发、测试、生产环境的差异化配置
 */

/**
 * 快照系统配置接口
 */
export interface SnapshotConfig {
  // 功能开关
  features: {
    enableLocking: boolean; // 是否启用快照锁定
    enableVersioning: boolean; // 是否启用版本管理
    enableDialoguePersistence: boolean; // 是否启用对话持久化
    enableAuditTrail: boolean; // 是否启用审计追踪
  };

  // 性能限制
  performance: {
    maxSnapshotSize: number; // 最大快照大小 (bytes)
    maxDialogueLength: number; // 最大对话长度
    writeTimeout: number; // 写入超时 (ms)
    loadTimeout: number; // 加载超时 (ms)
  };

  // 版本管理
  versioning: {
    retentionDays: number; // 版本保留天数
    maxVersionsPerSession: number; // 每个会话最大版本数
    autoArchiveAfterDays: number; // 自动归档天数
    enableAutoCleanup: boolean; // 是否自动清理
  };

  // 数据库配置
  database: {
    enableSoftDelete: boolean; // 是否启用软删除
    softDeleteRetentionDays: number; // 软删除保留天数
  };

  // 审计配置
  audit: {
    requireSourceService: boolean; // 是否必须提供sourceService
    requireRequestId: boolean; // 是否必须提供requestId
    enableTraceId: boolean; // 是否启用traceId
  };

  // 日志配置
  logging: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logPerformance: boolean; // 是否记录性能日志
    logAuditTrail: boolean; // 是否记录审计日志
  };
}

/**
 * 默认配置 (生产环境)
 */
const PRODUCTION_CONFIG: SnapshotConfig = {
  features: {
    enableLocking: true,
    enableVersioning: true,
    enableDialoguePersistence: true,
    enableAuditTrail: true,
  },
  performance: {
    maxSnapshotSize: 5 * 1024 * 1024, // 5MB
    maxDialogueLength: 10000,
    writeTimeout: 2000, // 2s
    loadTimeout: 3000, // 3s
  },
  versioning: {
    retentionDays: 90, // 保留90天
    maxVersionsPerSession: 50,
    autoArchiveAfterDays: 30,
    enableAutoCleanup: true,
  },
  database: {
    enableSoftDelete: true,
    softDeleteRetentionDays: 30,
  },
  audit: {
    requireSourceService: true,
    requireRequestId: true,
    enableTraceId: true,
  },
  logging: {
    logLevel: 'info',
    logPerformance: true,
    logAuditTrail: true,
  },
};

/**
 * 开发环境配置
 */
const DEVELOPMENT_CONFIG: SnapshotConfig = {
  ...PRODUCTION_CONFIG,
  features: {
    ...PRODUCTION_CONFIG.features,
  },
  performance: {
    ...PRODUCTION_CONFIG.performance,
    writeTimeout: 5000, // 更宽松的超时
    loadTimeout: 5000,
  },
  versioning: {
    ...PRODUCTION_CONFIG.versioning,
    retentionDays: 30, // 开发环境保留30天
    maxVersionsPerSession: 20,
    enableAutoCleanup: false, // 开发环境不自动清理
  },
  logging: {
    logLevel: 'debug',
    logPerformance: true,
    logAuditTrail: true,
  },
};

/**
 * 测试环境配置
 */
const TEST_CONFIG: SnapshotConfig = {
  ...PRODUCTION_CONFIG,
  features: {
    ...PRODUCTION_CONFIG.features,
    enableLocking: false, // 测试环境可能需要频繁修改
  },
  performance: {
    ...PRODUCTION_CONFIG.performance,
    maxSnapshotSize: 1 * 1024 * 1024, // 1MB (测试用较小数据)
    maxDialogueLength: 1000,
  },
  versioning: {
    ...PRODUCTION_CONFIG.versioning,
    retentionDays: 7, // 测试环境保留7天
    maxVersionsPerSession: 10,
    enableAutoCleanup: true,
  },
  audit: {
    requireSourceService: true,
    requireRequestId: true,
    enableTraceId: false, // 测试环境可选
  },
  logging: {
    logLevel: 'debug',
    logPerformance: false,
    logAuditTrail: false,
  },
};

/**
 * 获取当前环境配置
 */
export function getSnapshotConfig(): SnapshotConfig {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'test':
      return TEST_CONFIG;
    case 'development':
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * 配置单例
 */
let configInstance: SnapshotConfig | null = null;

/**
 * 获取配置单例
 */
export function getConfig(): SnapshotConfig {
  if (!configInstance) {
    configInstance = getSnapshotConfig();
  }
  return configInstance;
}

/**
 * 重置配置 (主要用于测试)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * 覆盖配置 (用于特殊场景)
 */
export function overrideConfig(partial: Partial<SnapshotConfig>): void {
  const current = getConfig();
  configInstance = {
    ...current,
    ...partial,
    features: { ...current.features, ...(partial.features || {}) },
    performance: { ...current.performance, ...(partial.performance || {}) },
    versioning: { ...current.versioning, ...(partial.versioning || {}) },
    database: { ...current.database, ...(partial.database || {}) },
    audit: { ...current.audit, ...(partial.audit || {}) },
    logging: { ...current.logging, ...(partial.logging || {}) },
  };
}

/**
 * 验证快照大小是否超限
 */
export function validateSnapshotSize(sizeInBytes: number): boolean {
  const config = getConfig();
  return sizeInBytes <= config.performance.maxSnapshotSize;
}

/**
 * 验证对话长度是否超限
 */
export function validateDialogueLength(length: number): boolean {
  const config = getConfig();
  return length <= config.performance.maxDialogueLength;
}

/**
 * 检查是否应该自动归档
 */
export function shouldAutoArchive(createdAt: Date): boolean {
  const config = getConfig();
  if (!config.versioning.enableAutoCleanup) {
    return false;
  }

  const daysSinceCreation =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation >= config.versioning.autoArchiveAfterDays;
}

/**
 * 检查版本是否过期应该清理
 */
export function shouldCleanupVersion(createdAt: Date): boolean {
  const config = getConfig();
  if (!config.versioning.enableAutoCleanup) {
    return false;
  }

  const daysSinceCreation =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation >= config.versioning.retentionDays;
}

/**
 * 导出默认配置
 */
export const config = getConfig();
