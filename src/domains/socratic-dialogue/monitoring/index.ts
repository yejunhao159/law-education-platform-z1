/**
 * 监控模块导出
 * 统一导出性能监控相关的类型和实例
 */

export {
  PerformanceMonitor,
  defaultPerformanceMonitor,
  type PerformanceMetrics,
  type ProviderMetrics,
  type ErrorRecord,
  type AlertConfig,
  type Alert
} from './PerformanceMonitor';

// 监控常量
export const MONITORING_CONSTANTS = {
  MAX_HISTORY_SIZE: 10000,
  MAX_ERROR_RECORDS: 100,
  MAX_ALERTS: 50,
  CLEANUP_INTERVAL: 3600000, // 1小时
  ALERT_COOLDOWN: 300000, // 5分钟
  HEALTH_CHECK_INTERVAL: 60000 // 1分钟
} as const;

// 错误类型映射
export const ERROR_TYPES = {
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limit',
  AUTH_ERROR: 'auth_error',
  QUOTA_EXCEEDED: 'quota_exceeded',
  NETWORK_ERROR: 'network_error',
  SERVER_ERROR: 'server_error',
  UNKNOWN_ERROR: 'unknown_error'
} as const;

// 告警严重级别
export const ALERT_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;