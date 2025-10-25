/**
 * 请求ID生成中间件
 * T078: 为所有API请求生成唯一requestId,用于审计追踪
 *
 * 使用方式:
 * 1. 在API路由中调用: const requestId = getRequestId(request)
 * 2. 传递给SnapshotWriter/DialogueWriter用于审计
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * 请求ID header名称
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * 从请求中获取或生成请求ID
 *
 * 逻辑:
 * 1. 如果客户端提供了x-request-id header,使用它
 * 2. 否则生成新的UUID v4
 *
 * @param request Next.js请求对象
 * @returns 请求ID字符串
 */
export function getRequestId(request: NextRequest | Request): string {
  // 尝试从header获取
  const existingId = request.headers.get(REQUEST_ID_HEADER);

  if (existingId && isValidRequestId(existingId)) {
    return existingId;
  }

  // 生成新ID
  return generateRequestId();
}

/**
 * 生成新的请求ID
 * 格式: req-{uuid}
 */
export function generateRequestId(): string {
  const uuid = randomUUID();
  return `req-${uuid}`;
}

/**
 * 验证请求ID格式
 * 允许格式:
 * - req-{uuid}
 * - {uuid}
 * - 其他合理的字符串 (字母数字和-_)
 */
export function isValidRequestId(id: string): boolean {
  // 最小长度检查
  if (!id || id.length < 3 || id.length > 100) {
    return false;
  }

  // 只允许字母、数字、连字符、下划线
  const validPattern = /^[a-zA-Z0-9\-_]+$/;
  return validPattern.test(id);
}

/**
 * 从URL或其他来源生成追踪ID
 * 格式: trace-{timestamp}-{random}
 */
export function generateTraceId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `trace-${timestamp}-${random}`;
}

/**
 * 请求上下文类型
 * 包含requestId和traceId,用于全链路追踪
 */
export interface RequestContext {
  requestId: string;
  traceId?: string;
  timestamp: string;
  path: string;
  method: string;
}

/**
 * 从请求中提取完整上下文
 */
export function extractRequestContext(request: NextRequest | Request): RequestContext {
  const requestId = getRequestId(request);
  const traceId = request.headers.get('x-trace-id') || undefined;

  return {
    requestId,
    traceId,
    timestamp: new Date().toISOString(),
    path: request.url,
    method: request.method,
  };
}

/**
 * 日志装饰器 - 为日志添加请求上下文
 */
export function logWithContext(
  level: 'log' | 'info' | 'warn' | 'error',
  message: string,
  context: RequestContext,
  data?: unknown
) {
  const logData = {
    message,
    requestId: context.requestId,
    traceId: context.traceId,
    timestamp: context.timestamp,
    path: context.path,
    method: context.method,
    ...data,
  };

  console[level](`[${level.toUpperCase()}]`, logData);
}
