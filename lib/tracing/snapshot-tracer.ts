/**
 * OpenTelemetry 追踪工具 for 快照系统
 * T079: 为快照写入管线添加 OpenTelemetry 追踪仪表化
 *
 * 特性:
 * - 使用 OpenTelemetry API 标准
 * - 记录快照写入操作的完整追踪链路
 * - 捕获性能指标和上下文信息
 * - 支持分布式追踪传播
 */

import { trace, context, SpanStatusCode, Span, SpanKind } from '@opentelemetry/api';

/**
 * 追踪器配置
 */
const TRACER_NAME = 'teaching-snapshot-system';
const TRACER_VERSION = '1.0.0';

/**
 * 获取全局追踪器
 */
const getTracer = () => {
  return trace.getTracer(TRACER_NAME, TRACER_VERSION);
};

/**
 * Span 属性类型
 */
export interface SnapshotSpanAttributes {
  'snapshot.session_id'?: string;
  'snapshot.version_id'?: string;
  'snapshot.act_type'?: string;
  'snapshot.user_id'?: string;
  'snapshot.organization_id'?: string;
  'snapshot.source_service'?: string;
  'snapshot.request_id'?: string;
  'snapshot.trace_id'?: string;
  'snapshot.status'?: string;
  'snapshot.version_tag'?: string;
  'snapshot.latency_ms'?: number;
  'snapshot.payload_size'?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * 创建快照写入操作的 Span
 *
 * @param operationName 操作名称 (例如: 'snapshot.write.act1')
 * @param attributes Span 属性
 * @param fn 要追踪的函数
 * @returns 函数执行结果
 */
export async function traceSnapshotOperation<T>(
  operationName: string,
  attributes: SnapshotSpanAttributes,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getTracer();

  // 创建新的 Span
  return tracer.startActiveSpan(
    operationName,
    {
      kind: SpanKind.INTERNAL,
      attributes: attributes as any,
    },
    async (span: Span) => {
      const startTime = Date.now();

      try {
        // 执行实际操作
        const result = await fn(span);

        // 记录成功
        const latencyMs = Date.now() - startTime;
        span.setAttributes({
          'snapshot.latency_ms': latencyMs,
          'snapshot.success': true,
        });
        span.setStatus({ code: SpanStatusCode.OK });

        return result;
      } catch (error) {
        // 记录错误
        const latencyMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        span.setAttributes({
          'snapshot.latency_ms': latencyMs,
          'snapshot.success': false,
          'error.message': errorMessage,
          'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
        });

        // 记录异常
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
        });

        throw error;
      } finally {
        // 结束 Span
        span.end();
      }
    }
  );
}

/**
 * 同步版本的追踪函数
 */
export function traceSnapshotOperationSync<T>(
  operationName: string,
  attributes: SnapshotSpanAttributes,
  fn: (span: Span) => T
): T {
  const tracer = getTracer();

  return tracer.startActiveSpan(
    operationName,
    {
      kind: SpanKind.INTERNAL,
      attributes: attributes as any,
    },
    (span: Span) => {
      const startTime = Date.now();

      try {
        const result = fn(span);

        const latencyMs = Date.now() - startTime;
        span.setAttributes({
          'snapshot.latency_ms': latencyMs,
          'snapshot.success': true,
        });
        span.setStatus({ code: SpanStatusCode.OK });

        return result;
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        span.setAttributes({
          'snapshot.latency_ms': latencyMs,
          'snapshot.success': false,
          'error.message': errorMessage,
          'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
        });

        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
        });

        throw error;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * 为 Span 添加事件
 */
export function addSnapshotEvent(
  span: Span,
  eventName: string,
  attributes?: Record<string, string | number | boolean>
): void {
  span.addEvent(eventName, attributes);
}

/**
 * 从当前上下文获取活动的 Span
 */
export function getActiveSpan(): Span | undefined {
  return trace.getSpan(context.active());
}

/**
 * 创建子 Span (用于操作内部的细分步骤)
 */
export async function traceSubOperation<T>(
  parentSpan: Span,
  operationName: string,
  attributes: SnapshotSpanAttributes,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = getTracer();

  // 使用父 Span 的上下文创建子 Span
  const ctx = trace.setSpan(context.active(), parentSpan);

  return context.with(ctx, async () => {
    return tracer.startActiveSpan(
      operationName,
      {
        kind: SpanKind.INTERNAL,
        attributes: attributes as any,
      },
      async (span: Span) => {
        const startTime = Date.now();

        try {
          const result = await fn();

          const latencyMs = Date.now() - startTime;
          span.setAttributes({
            'snapshot.latency_ms': latencyMs,
            'snapshot.success': true,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          return result;
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          span.setAttributes({
            'snapshot.latency_ms': latencyMs,
            'snapshot.success': false,
            'error.message': errorMessage,
          });

          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: errorMessage,
          });

          throw error;
        } finally {
          span.end();
        }
      }
    );
  });
}

/**
 * 检查 OpenTelemetry 是否已配置
 *
 * 注意: 即使未配置,所有追踪函数仍然可以正常工作(使用 NoopTracer)
 */
export function isTracingEnabled(): boolean {
  try {
    const tracer = getTracer();
    // 检查是否为 NoopTracer
    return tracer.constructor.name !== 'NoopTracer';
  } catch {
    return false;
  }
}

/**
 * 使用示例:
 *
 * ```typescript
 * import { traceSnapshotOperation } from '@/lib/tracing/snapshot-tracer';
 *
 * async writeAIOutput(context: AIOutputContext) {
 *   return traceSnapshotOperation(
 *     'snapshot.write',
 *     {
 *       'snapshot.session_id': context.sessionId,
 *       'snapshot.act_type': context.actType,
 *       'snapshot.request_id': context.requestId,
 *     },
 *     async (span) => {
 *       // 添加中间事件
 *       span.addEvent('validation.start');
 *       await validateContext(context);
 *       span.addEvent('validation.complete');
 *
 *       // 添加子操作
 *       await traceSubOperation(
 *         span,
 *         'snapshot.db.write',
 *         { 'db.operation': 'upsert' },
 *         () => repository.saveSnapshotEnvelope(envelope)
 *       );
 *
 *       return result;
 *     }
 *   );
 * }
 * ```
 */
