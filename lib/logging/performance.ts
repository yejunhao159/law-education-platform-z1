/**
 * 性能监控辅助函数
 * 迁移自 lib/utils/socratic-logger.ts
 */

import { StructuredLogger } from '../monitoring/structured-logger';

/**
 * 性能监控辅助函数
 * 兼容原socratic-logger的measurePerformance接口
 */
export function measurePerformance<T>(
  logger: StructuredLogger | any, // 兼容socratic-logger的SocraticLogger
  action: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  // 使用统一的计时方法
  const operationId = `${action}-${Date.now()}`;

  if (logger.startTimer) {
    // 新的structured-logger
    logger.startTimer(operationId);
  }

  const startTime = Date.now();

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result
        .then(value => {
          const duration = Date.now() - startTime;
          if (logger.endTimer) {
            // 新的structured-logger
            logger.endTimer(operationId, `${action} completed`, { success: true, duration });
          } else if (logger.info) {
            // 降级为普通日志
            logger.info(`${action} completed`, { duration, success: true });
          }
          return value;
        })
        .catch(error => {
          const duration = Date.now() - startTime;
          if (logger.endTimer) {
            // 新的structured-logger
            logger.endTimer(operationId, `${action} failed: ${error.message}`, { success: false, duration });
          } else if (logger.error) {
            // 降级为错误日志
            logger.error(`${action} failed: ${error.message}`, error, { duration, success: false });
          }
          throw error;
        });
    }

    const duration = Date.now() - startTime;
    if (logger.endTimer) {
      // 新的structured-logger
      logger.endTimer(operationId, `${action} completed`, { success: true, duration });
    } else if (logger.info) {
      // 降级为普通日志
      logger.info(`${action} completed`, { duration, success: true });
    }
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    if (logger.endTimer) {
      // 新的structured-logger
      logger.endTimer(operationId, `${action} failed: ${(error as Error).message}`, { success: false, duration });
    } else if (logger.error) {
      // 降级为错误日志
      logger.error(`${action} failed: ${(error as Error).message}`, error, { duration, success: false });
    }
    throw error;
  }
}

/**
 * 创建计时器装饰器
 */
export function timed(action?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const timerAction = action || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      // 如果实例有logger，使用它进行性能监控
      if (this.logger) {
        return measurePerformance(this.logger, timerAction, () => originalMethod.apply(this, args));
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}