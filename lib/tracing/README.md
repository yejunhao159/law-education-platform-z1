# OpenTelemetry 追踪系统 - 快照管线

## 概述

为教学会话快照系统集成了 OpenTelemetry 分布式追踪,用于监控和调试快照写入管线的性能和行为。

**实现任务**: T079 - 为快照写入管线添加 OpenTelemetry 追踪仪表化

## 功能特性

### 已实现的追踪点

1. **快照写入操作** (`snapshot.write.{actType}`)
   - 追踪整个 AI 输出写入流程
   - 记录关键上下文信息 (sessionId, actType, requestId 等)
   - 捕获性能指标 (latencyMs, payload大小)

2. **子操作追踪**
   - `snapshot.validation` - 上下文验证
   - `snapshot.envelope.build` - 封装构建
   - `snapshot.db.save` - 数据库写入

3. **关键事件**
   - `snapshot.write.start` - 写入开始
   - `snapshot.validation.complete` - 验证完成
   - `snapshot.envelope.build.complete` - 封装构建完成
   - `snapshot.write.complete` - 写入完成
   - `snapshot.write.failed` - 写入失败
   - `snapshot.performance.threshold_exceeded` - 性能阈值超标

4. **Span 属性**
   ```typescript
   {
     'snapshot.session_id': string,
     'snapshot.user_id': string,
     'snapshot.act_type': 'act1' | 'act2' | 'act3' | 'act4',
     'snapshot.source_service': string,
     'snapshot.request_id': string,
     'snapshot.trace_id': string,
     'snapshot.version_id': string,
     'snapshot.organization_id': string,
     'snapshot.version_tag': string,
     'snapshot.payload_size': number,
     'snapshot.latency_ms': number,
     'snapshot.success': boolean,
   }
   ```

## 使用方法

### 1. 基本配置 (可选)

如果不配置 OpenTelemetry,追踪功能会自动使用 NoopTracer,不会影响系统运行。

#### 安装依赖

```bash
npm install @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http
```

#### 配置追踪器 (创建 `instrumentation.ts`)

```typescript
// instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'law-education-platform',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error));
});
```

#### 在 Next.js 中启用

在 `next.config.js` 中添加:

```javascript
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
};
```

### 2. 追踪导出选项

#### 选项 A: Jaeger (本地开发)

```bash
# 启动 Jaeger all-in-one
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# 访问 UI: http://localhost:16686
```

#### 选项 B: 控制台导出 (调试)

```typescript
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
});
```

#### 选项 C: 云服务 (生产)

支持主流云追踪服务:
- **Datadog**: 使用 Datadog exporter
- **New Relic**: 使用 OTLP exporter 配置 New Relic endpoint
- **Honeycomb**: 使用 OTLP exporter 配置 Honeycomb endpoint
- **AWS X-Ray**: 使用 AWS X-Ray exporter

### 3. 代码中使用

#### 在 SnapshotWriter 中 (已集成)

```typescript
import { snapshotWriter } from '@/src/domains/teaching-acts/utils/SnapshotWriter';

// 自动追踪
const result = await snapshotWriter.writeAIOutput({
  sessionId: 'sess-123',
  userId: 'user-456',
  actType: 'act1',
  payload: {...},
  sourceService: 'case-analysis-service',
  requestId: 'req-789',
  traceId: 'trace-abc',
});
```

#### 在其他服务中集成

```typescript
import { traceSnapshotOperation } from '@/lib/tracing/snapshot-tracer';

async function yourFunction() {
  return traceSnapshotOperation(
    'your.operation.name',
    {
      'custom.attribute': 'value',
      'request.id': 'req-123',
    },
    async (span) => {
      // 你的业务逻辑
      span.addEvent('important.milestone');

      const result = await doSomething();

      span.setAttributes({
        'result.count': result.length,
      });

      return result;
    }
  );
}
```

## 追踪数据示例

### Span 层级结构

```
snapshot.write.act1 (154ms)
├── snapshot.validation (2ms)
├── snapshot.envelope.build (5ms)
└── snapshot.db.save (145ms)
    └── db.upsert (140ms)
```

### 事件时间线

```
0ms    - snapshot.write.start
2ms    - snapshot.validation.start
4ms    - snapshot.validation.complete
9ms    - snapshot.envelope.build.start
14ms   - snapshot.envelope.build.complete
154ms  - snapshot.write.complete
```

## 性能监控

### 自动记录的指标

1. **写入延迟** (`snapshot.latency_ms`)
   - 目标: ≤ 2000ms (SC-001)
   - 超标时自动记录 `snapshot.performance.threshold_exceeded` 事件

2. **Payload 大小** (`snapshot.payload_size`)
   - 记录序列化后的 JSON 字节数

3. **数据库操作延迟** (子 span)
   - 独立追踪 DB 写入时间

### 告警规则建议

```yaml
# 延迟告警
- name: snapshot_write_latency_high
  condition: snapshot.latency_ms > 2000
  severity: warning

# 失败率告警
- name: snapshot_write_failure_rate_high
  condition: count(snapshot.success=false) / count(*) > 0.05
  severity: critical

# DB 操作慢查询
- name: snapshot_db_slow_query
  condition: db.operation.latency_ms > 1000
  severity: warning
```

## 故障排查

### 场景 1: 追踪不工作

**问题**: 没有看到追踪数据

**排查步骤**:
1. 检查 OpenTelemetry SDK 是否正确初始化
2. 验证 exporter endpoint 是否可达
3. 确认 `instrumentation.ts` 在应用启动时加载
4. 检查是否有错误日志

**测试命令**:
```typescript
import { isTracingEnabled } from '@/lib/tracing/snapshot-tracer';
console.log('Tracing enabled:', isTracingEnabled());
```

### 场景 2: 性能开销

**问题**: 追踪影响性能

**解决方案**:
1. 使用采样策略 (只追踪部分请求)
2. 使用批量导出而非实时导出
3. 调整 span 属性数量

```typescript
const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1), // 10% 采样率
});
```

### 场景 3: Context 传播问题

**问题**: 追踪 ID 在服务间丢失

**解决方案**:
确保 HTTP headers 正确传播 trace context:
```typescript
// W3C Trace Context headers
'traceparent': '00-{trace-id}-{span-id}-01'
'tracestate': 'vendor1=value1,vendor2=value2'
```

## 最佳实践

### 1. Span 命名
- 使用分层命名: `domain.operation.detail`
- 示例: `snapshot.write.act1`, `snapshot.db.save`

### 2. 属性选择
- 必须包含: requestId, sessionId, userId
- 推荐包含: actType, sourceService, organizationId
- 避免包含: PII (个人身份信息), 密钥

### 3. 事件使用
- 记录关键里程碑
- 包含相关上下文
- 避免过度使用 (影响性能)

### 4. 错误处理
- 始终记录异常: `span.recordException(error)`
- 设置错误状态: `span.setStatus({ code: SpanStatusCode.ERROR })`
- 包含错误详情在属性中

## 与现有监控集成

### 结合日志系统

追踪 ID 会自动包含在日志中:

```typescript
console.log('[SnapshotWriter] 写入成功', {
  versionId: 'ver-123',
  requestId: 'req-456',  // 可关联到 trace
  latencyMs: 123,
});
```

### 结合指标系统

可以从 span 属性导出 Prometheus 指标:
- `snapshot_write_duration_seconds` (histogram)
- `snapshot_write_total` (counter)
- `snapshot_write_errors_total` (counter)

## 扩展指南

### 添加新的追踪点

1. 导入追踪工具:
```typescript
import { traceSnapshotOperation } from '@/lib/tracing/snapshot-tracer';
```

2. 包装目标函数:
```typescript
async function myFunction() {
  return traceSnapshotOperation(
    'my.operation',
    { 'custom.attr': 'value' },
    async (span) => {
      // 业务逻辑
    }
  );
}
```

3. 添加事件和子 span:
```typescript
span.addEvent('checkpoint');
await traceSubOperation(span, 'substep', {}, async () => {
  // 子操作
});
```

## 参考资源

- [OpenTelemetry 官方文档](https://opentelemetry.io/docs/)
- [OpenTelemetry JS API](https://open-telemetry.github.io/opentelemetry-js-api/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [语义约定](https://opentelemetry.io/docs/specs/semconv/)

## 相关文件

- `/lib/tracing/snapshot-tracer.ts` - 追踪工具核心实现
- `/src/domains/teaching-acts/utils/SnapshotWriter.ts` - 集成示例
- `specs/001-teaching-session-storage/spec.md` - 规格文档
- `specs/001-teaching-session-storage/tasks.md` - 任务清单 (T079)
