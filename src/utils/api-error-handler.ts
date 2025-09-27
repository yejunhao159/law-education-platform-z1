/**
 * API错误处理工具 - 提供用户友好的错误提示和恢复建议
 *
 * 功能：
 * - 标准化错误消息格式
 * - 提供错误分类和错误码
 * - 给出用户友好的错误解释和恢复建议
 * - 记录详细的错误日志
 */

import { createLogger } from '@/lib/logging';

const logger = createLogger('APIErrorHandler');

// 错误类型枚举
export enum ErrorType {
  VALIDATION = 'VALIDATION',      // 输入验证错误
  AI_SERVICE = 'AI_SERVICE',      // AI服务调用错误
  NETWORK = 'NETWORK',            // 网络连接错误
  RATE_LIMIT = 'RATE_LIMIT',      // API调用频率限制
  PARSING = 'PARSING',            // 数据解析错误
  INTERNAL = 'INTERNAL',          // 内部服务器错误
  TIMEOUT = 'TIMEOUT'             // 请求超时
}

// 标准化错误响应格式
export interface APIErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    code: string;
    message: string;           // 用户友好的错误消息
    details?: string;          // 技术细节（可选）
    suggestions: string[];     // 恢复建议
    retryable: boolean;        // 是否可以重试
    timestamp: string;
    requestId?: string;        // 请求追踪ID
  };
  fallbackData?: any;          // 降级数据（如果有）
}

// 错误配置映射
const ERROR_CONFIG = {
  [ErrorType.VALIDATION]: {
    code: 'VALIDATION_ERROR',
    message: '请求参数不正确',
    suggestions: [
      '请检查输入的数据格式是否正确',
      '确保所有必填字段都已填写',
      '参考API文档中的参数说明'
    ],
    retryable: false
  },
  [ErrorType.AI_SERVICE]: {
    code: 'AI_SERVICE_ERROR',
    message: 'AI分析服务暂时不可用',
    suggestions: [
      '稍后重试，AI服务可能正在维护',
      '如果问题持续，请联系技术支持',
      '可以使用基础分析功能作为替代'
    ],
    retryable: true
  },
  [ErrorType.NETWORK]: {
    code: 'NETWORK_ERROR',
    message: '网络连接异常',
    suggestions: [
      '请检查网络连接是否正常',
      '刷新页面重试',
      '如果问题持续，请联系网络管理员'
    ],
    retryable: true
  },
  [ErrorType.RATE_LIMIT]: {
    code: 'RATE_LIMIT_ERROR',
    message: 'API调用频率过高，请稍后重试',
    suggestions: [
      '请等待1-2分钟后重试',
      '避免短时间内频繁提交请求',
      '考虑升级服务计划以获得更高调用限额'
    ],
    retryable: true
  },
  [ErrorType.PARSING]: {
    code: 'PARSING_ERROR',
    message: 'AI返回数据格式异常',
    suggestions: [
      'AI分析结果解析失败，已提供基础分析',
      '重新提交请求可能会得到正确结果',
      '如果问题持续，请简化输入内容'
    ],
    retryable: true
  },
  [ErrorType.TIMEOUT]: {
    code: 'TIMEOUT_ERROR',
    message: '请求处理超时',
    suggestions: [
      '请求处理时间过长，请重试',
      '尝试简化输入内容以减少处理时间',
      '如果急需结果，可以使用快速分析模式'
    ],
    retryable: true
  },
  [ErrorType.INTERNAL]: {
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误',
    suggestions: [
      '系统遇到临时问题，请稍后重试',
      '如果问题持续，请联系技术支持',
      '可以尝试使用其他功能模块'
    ],
    retryable: true
  }
};

/**
 * 创建标准化的错误响应
 */
export function createErrorResponse(
  type: ErrorType,
  originalError?: Error | any,
  customMessage?: string,
  fallbackData?: any,
  requestId?: string
): APIErrorResponse {
  const config = ERROR_CONFIG[type];
  const timestamp = new Date().toISOString();

  // 记录详细错误日志
  logger.error(`API Error [${type}]`, {
    type,
    code: config.code,
    originalError: originalError?.message || originalError,
    customMessage,
    requestId,
    timestamp,
    stack: originalError?.stack
  });

  return {
    success: false,
    error: {
      type,
      code: config.code,
      message: customMessage || config.message,
      details: originalError?.message,
      suggestions: config.suggestions,
      retryable: config.retryable,
      timestamp,
      requestId
    },
    ...(fallbackData && { fallbackData })
  };
}

/**
 * 根据错误类型自动分类并创建错误响应
 */
export function handleAPIError(
  error: Error | any,
  context: string = 'API调用',
  fallbackData?: any,
  requestId?: string
): APIErrorResponse {
  const errorMessage = error?.message || '未知错误';
  const errorString = errorMessage.toLowerCase();

  // 自动识别错误类型
  let errorType: ErrorType;
  let customMessage: string | undefined;

  if (errorString.includes('validation') || errorString.includes('required')) {
    errorType = ErrorType.VALIDATION;
  } else if (errorString.includes('404') || errorString.includes('not found')) {
    errorType = ErrorType.AI_SERVICE;
    customMessage = 'AI服务端点不可用，已启用基础分析模式';
  } else if (errorString.includes('timeout') || errorString.includes('timed out')) {
    errorType = ErrorType.TIMEOUT;
  } else if (errorString.includes('rate limit') || errorString.includes('too many')) {
    errorType = ErrorType.RATE_LIMIT;
  } else if (errorString.includes('network') || errorString.includes('connection')) {
    errorType = ErrorType.NETWORK;
  } else if (errorString.includes('parse') || errorString.includes('json')) {
    errorType = ErrorType.PARSING;
    customMessage = 'AI返回数据解析失败，已提供基础分析结果';
  } else {
    errorType = ErrorType.INTERNAL;
  }

  logger.warn(`${context}错误自动分类`, {
    originalError: errorMessage,
    classifiedAs: errorType,
    context,
    hasCustomMessage: !!customMessage
  });

  return createErrorResponse(errorType, error, customMessage, fallbackData, requestId);
}

/**
 * 为特定错误类型生成恢复建议
 */
export function getRecoveryActions(errorType: ErrorType): string[] {
  return ERROR_CONFIG[errorType]?.suggestions || ['请联系技术支持'];
}

/**
 * 检查错误是否可以重试
 */
export function isRetryable(errorType: ErrorType): boolean {
  return ERROR_CONFIG[errorType]?.retryable || false;
}

/**
 * 生成唯一的请求ID用于错误追踪
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}