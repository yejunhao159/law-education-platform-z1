/**
 * 快照系统错误码定义
 * Spec: specs/001-teaching-session-storage/spec.md
 * T077: 标准化错误处理
 */

/**
 * 错误码枚举
 */
export enum SnapshotErrorCode {
  // 写入相关错误 (1000-1099)
  SNAPSHOT_WRITE_FAILED = 'SNAPSHOT_WRITE_FAILED',
  SNAPSHOT_VALIDATION_FAILED = 'SNAPSHOT_VALIDATION_FAILED',
  DIALOGUE_WRITE_FAILED = 'DIALOGUE_WRITE_FAILED',

  // 查询相关错误 (1100-1199)
  SNAPSHOT_NOT_FOUND = 'SNAPSHOT_NOT_FOUND',
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  DIALOGUE_NOT_FOUND = 'DIALOGUE_NOT_FOUND',

  // 权限和状态错误 (1200-1299)
  SNAPSHOT_LOCKED = 'SNAPSHOT_LOCKED',
  SNAPSHOT_NOT_EDITABLE = 'SNAPSHOT_NOT_EDITABLE',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // 数据完整性错误 (1300-1399)
  DATA_INTEGRITY_ERROR = 'DATA_INTEGRITY_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_SNAPSHOT_STRUCTURE = 'INVALID_SNAPSHOT_STRUCTURE',
  SCHEMA_VERSION_MISMATCH = 'SCHEMA_VERSION_MISMATCH',

  // 性能和限制错误 (1400-1499)
  WRITE_TIMEOUT = 'WRITE_TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',

  // 通用错误 (1500+)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * 错误消息映射
 */
export const ERROR_MESSAGES: Record<SnapshotErrorCode, string> = {
  // 写入相关
  [SnapshotErrorCode.SNAPSHOT_WRITE_FAILED]: '快照写入失败',
  [SnapshotErrorCode.SNAPSHOT_VALIDATION_FAILED]: '快照数据验证失败',
  [SnapshotErrorCode.DIALOGUE_WRITE_FAILED]: '对话记录写入失败',

  // 查询相关
  [SnapshotErrorCode.SNAPSHOT_NOT_FOUND]: '快照不存在',
  [SnapshotErrorCode.VERSION_NOT_FOUND]: '版本不存在',
  [SnapshotErrorCode.SESSION_NOT_FOUND]: '会话不存在',
  [SnapshotErrorCode.DIALOGUE_NOT_FOUND]: '对话记录不存在',

  // 权限和状态
  [SnapshotErrorCode.SNAPSHOT_LOCKED]: '快照已锁定，无法修改',
  [SnapshotErrorCode.SNAPSHOT_NOT_EDITABLE]: '快照不可编辑',
  [SnapshotErrorCode.INVALID_STATUS_TRANSITION]: '无效的状态转换',
  [SnapshotErrorCode.PERMISSION_DENIED]: '权限不足',

  // 数据完整性
  [SnapshotErrorCode.DATA_INTEGRITY_ERROR]: '数据完整性错误',
  [SnapshotErrorCode.MISSING_REQUIRED_FIELD]: '缺少必需字段',
  [SnapshotErrorCode.INVALID_SNAPSHOT_STRUCTURE]: '快照结构无效',
  [SnapshotErrorCode.SCHEMA_VERSION_MISMATCH]: 'Schema版本不匹配',

  // 性能和限制
  [SnapshotErrorCode.WRITE_TIMEOUT]: '写入超时',
  [SnapshotErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超限',
  [SnapshotErrorCode.PAYLOAD_TOO_LARGE]: '数据量过大',

  // 通用
  [SnapshotErrorCode.UNKNOWN_ERROR]: '未知错误',
  [SnapshotErrorCode.DATABASE_ERROR]: '数据库错误',
  [SnapshotErrorCode.NETWORK_ERROR]: '网络错误',
};

/**
 * HTTP状态码映射
 */
export const ERROR_HTTP_STATUS: Record<SnapshotErrorCode, number> = {
  // 写入相关 - 500
  [SnapshotErrorCode.SNAPSHOT_WRITE_FAILED]: 500,
  [SnapshotErrorCode.SNAPSHOT_VALIDATION_FAILED]: 400,
  [SnapshotErrorCode.DIALOGUE_WRITE_FAILED]: 500,

  // 查询相关 - 404
  [SnapshotErrorCode.SNAPSHOT_NOT_FOUND]: 404,
  [SnapshotErrorCode.VERSION_NOT_FOUND]: 404,
  [SnapshotErrorCode.SESSION_NOT_FOUND]: 404,
  [SnapshotErrorCode.DIALOGUE_NOT_FOUND]: 404,

  // 权限和状态 - 403/409
  [SnapshotErrorCode.SNAPSHOT_LOCKED]: 403,
  [SnapshotErrorCode.SNAPSHOT_NOT_EDITABLE]: 403,
  [SnapshotErrorCode.INVALID_STATUS_TRANSITION]: 409,
  [SnapshotErrorCode.PERMISSION_DENIED]: 403,

  // 数据完整性 - 400/500
  [SnapshotErrorCode.DATA_INTEGRITY_ERROR]: 500,
  [SnapshotErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [SnapshotErrorCode.INVALID_SNAPSHOT_STRUCTURE]: 400,
  [SnapshotErrorCode.SCHEMA_VERSION_MISMATCH]: 400,

  // 性能和限制 - 408/429/413
  [SnapshotErrorCode.WRITE_TIMEOUT]: 408,
  [SnapshotErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [SnapshotErrorCode.PAYLOAD_TOO_LARGE]: 413,

  // 通用 - 500
  [SnapshotErrorCode.UNKNOWN_ERROR]: 500,
  [SnapshotErrorCode.DATABASE_ERROR]: 500,
  [SnapshotErrorCode.NETWORK_ERROR]: 502,
};

/**
 * 快照错误类
 */
export class SnapshotError extends Error {
  public readonly code: SnapshotErrorCode;
  public readonly httpStatus: number;
  public readonly details?: unknown;
  public readonly requestId?: string;
  public readonly timestamp: string;

  constructor(
    code: SnapshotErrorCode,
    message?: string,
    details?: unknown,
    requestId?: string
  ) {
    const errorMessage = message || ERROR_MESSAGES[code];
    super(errorMessage);

    this.name = 'SnapshotError';
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code];
    this.details = details;
    this.requestId = requestId;
    this.timestamp = new Date().toISOString();

    // 保持正确的原型链
    Object.setPrototypeOf(this, SnapshotError.prototype);
  }

  /**
   * 转换为API响应格式
   */
  toJSON() {
    return {
      success: false,
      error: this.code,
      message: this.message,
      details: this.details,
      requestId: this.requestId,
      timestamp: this.timestamp,
    };
  }

  /**
   * 记录错误日志
   */
  log() {
    console.error('[SnapshotError]', {
      code: this.code,
      message: this.message,
      details: this.details,
      requestId: this.requestId,
      timestamp: this.timestamp,
      stack: this.stack,
    });
  }
}

/**
 * 工厂函数 - 快速创建常见错误
 */
export const SnapshotErrors = {
  writeFailed: (details?: unknown, requestId?: string) =>
    new SnapshotError(
      SnapshotErrorCode.SNAPSHOT_WRITE_FAILED,
      undefined,
      details,
      requestId
    ),

  notFound: (versionId: string, requestId?: string) =>
    new SnapshotError(
      SnapshotErrorCode.SNAPSHOT_NOT_FOUND,
      `快照 ${versionId} 不存在`,
      { versionId },
      requestId
    ),

  locked: (versionId: string, lockedBy?: string, requestId?: string) =>
    new SnapshotError(
      SnapshotErrorCode.SNAPSHOT_LOCKED,
      `快照 ${versionId} 已被 ${lockedBy || '其他用户'} 锁定`,
      { versionId, lockedBy },
      requestId
    ),

  invalidTransition: (
    from: string,
    to: string,
    requestId?: string
  ) =>
    new SnapshotError(
      SnapshotErrorCode.INVALID_STATUS_TRANSITION,
      `无法从 ${from} 转换到 ${to}`,
      { from, to },
      requestId
    ),

  validationFailed: (errors: unknown, requestId?: string) =>
    new SnapshotError(
      SnapshotErrorCode.SNAPSHOT_VALIDATION_FAILED,
      undefined,
      errors,
      requestId
    ),

  dialogueWriteFailed: (details?: unknown, requestId?: string) =>
    new SnapshotError(
      SnapshotErrorCode.DIALOGUE_WRITE_FAILED,
      undefined,
      details,
      requestId
    ),

  dataIntegrityError: (details?: unknown, requestId?: string) =>
    new SnapshotError(
      SnapshotErrorCode.DATA_INTEGRITY_ERROR,
      undefined,
      details,
      requestId
    ),
};

/**
 * 错误处理中间件辅助函数
 */
export function handleSnapshotError(error: unknown, requestId?: string) {
  if (error instanceof SnapshotError) {
    error.log();
    return error;
  }

  // 将普通错误转换为SnapshotError
  const snapshotError = new SnapshotError(
    SnapshotErrorCode.UNKNOWN_ERROR,
    error instanceof Error ? error.message : String(error),
    error,
    requestId
  );

  snapshotError.log();
  return snapshotError;
}
