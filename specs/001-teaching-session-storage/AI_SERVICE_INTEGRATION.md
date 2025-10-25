# AI服务集成指南 - 快照系统V2

**日期**: 2025-10-24
**状态**: 实现完成 (T028-T037)
**相关文档**: spec.md, data-model.md

---

## 概述

快照系统V2建立了"数据库优先"(DB-First)的AI输出管线。所有AI服务的输出必须先写入`teaching_session_snapshots`表,再返回给前端。

**核心组件**:
- `SnapshotWriter` - AI输出写入工具类 (`src/domains/teaching-acts/utils/SnapshotWriter.ts`)
- `POST /api/teaching-sessions/ingest` - AI输出入库API (`app/api/teaching-sessions/ingest/route.ts`)

---

## 集成策略

### 策略1: 前端直接调用 (推荐)

前端在收到AI服务响应后,立即调用ingest API持久化数据。

```typescript
// 示例: Act1案例提取后入库
async function extractAndIngest(text: string, sessionId: string, userId: string) {
  // 1. 调用AI提取服务
  const extractResponse = await fetch('/api/legal-intelligence/extract', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  const extractData = await extractResponse.json();

  // 2. 立即入库快照
  const ingestResponse = await fetch('/api/teaching-sessions/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId,
      userId: userId,
      actType: 'act1',
      payload: {
        basicInfo: extractData.data.basicInfo,
        facts: extractData.data.threeElements.facts,
        evidence: extractData.data.threeElements.evidence,
        reasoning: extractData.data.threeElements.reasoning,
        metadata: extractData.data.metadata,
      },
      sourceService: 'legal-intelligence-api',
      requestId: crypto.randomUUID(),
      traceId: crypto.randomUUID(),
    }),
  });

  const ingestData = await ingestResponse.json();
  console.log('✅ 快照已入库, versionId:', ingestData.versionId);

  return { extractData, versionId: ingestData.versionId };
}
```

**优点**:
- 不修改现有AI服务代码
- 前端完全控制数据流
- 易于调试和监控

---

### 策略2: 后端服务编排 (高级)

在新的编排层(如`TeachingOrchestrator`)中调用AI服务后,统一入库。

```typescript
// src/domains/teaching-acts/services/TeachingOrchestrator.ts
import { snapshotWriter } from '../utils/SnapshotWriter';

export class TeachingOrchestrator {
  async processAct1(text: string, sessionId: string, userId: string) {
    // 1. 调用AI提取服务
    const extractResult = await judgmentService.extractThreeElements(text);

    // 2. 写入快照
    const writeResult = await snapshotWriter.writeAIOutput({
      sessionId,
      userId,
      actType: 'act1',
      payload: extractResult,
      sourceService: 'teaching-orchestrator',
      requestId: crypto.randomUUID(),
    });

    return { extractResult, versionId: writeResult.versionId };
  }
}
```

**优点**:
- 后端统一管理数据流
- 确保数据一致性
- 便于添加业务规则

---

## 各Act集成示例

### Act1: 案例提取

**AI服务**: `/api/legal-intelligence/extract`

**入库payload**:
```typescript
{
  actType: 'act1',
  payload: {
    basicInfo: {
      caseTitle: "...",
      caseNumber: "...",
      court: "...",
      // ... 其他基础信息
    },
    facts: { ... },
    evidence: { ... },
    reasoning: { ... },
    metadata: {
      confidence: 0.95,
      processingTime: 1234,
      aiModel: "deepseek-chat",
    }
  },
  sourceService: 'legal-intelligence-api',
  requestId: crypto.randomUUID(),
}
```

---

### Act2: 法律分析

**AI服务**: `/api/legal-analysis` (action: narrative, claim, timeline, etc.)

**集成方式**: 前端调用多个分析API后,组装完整Act2数据:

```typescript
async function analyzeAndIngest(sessionId: string, userId: string) {
  // 调用多个分析服务
  const [narrative, claim, timeline, evidence] = await Promise.all([
    fetch('/api/legal-analysis', { body: JSON.stringify({ action: 'narrative', ... }) }),
    fetch('/api/legal-analysis', { body: JSON.stringify({ action: 'claim', ... }) }),
    fetch('/api/timeline-analysis', ...),
    fetch('/api/evidence-quality', ...),
  ]);

  // 组装Act2快照
  const act2Payload = {
    narrative: await narrative.json(),
    timelineAnalysis: await timeline.json(),
    evidenceQuestions: await evidence.json(),
    claimAnalysis: await claim.json(),
    completedAt: new Date().toISOString(),
  };

  // 入库
  await fetch('/api/teaching-sessions/ingest', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      userId,
      actType: 'act2',
      payload: act2Payload,
      sourceService: 'legal-analysis-api',
      requestId: crypto.randomUUID(),
    }),
  });
}
```

---

### Act3: 苏格拉底对话

**特殊处理**: Act3使用独立的`teaching_session_dialogues`表存储对话流水。

**集成方式**:
1. 对话实时流式传输给前端 (不变)
2. 每个对话轮次通过`saveDialogueTurn`方法入库:

```typescript
import { teachingSessionRepository } from '@/src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository';

// 保存单个对话轮次
await teachingSessionRepository.saveDialogueTurn({
  sessionId: 'session-uuid',
  versionId: 'version-uuid',
  turnIndex: 0,
  chunkIndex: 0,
  speaker: 'assistant',
  message: '这道题你觉得...',
  sourceService: 'socratic-api',
  requestId: crypto.randomUUID(),
});
```

3. 对话结束后,更新Act3摘要到快照:

```typescript
await fetch('/api/teaching-sessions/ingest', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    userId,
    actType: 'act3',
    payload: {
      totalTurns: 10,
      studentParticipation: 85,
      startedAt: '2025-10-24T10:00:00Z',
      endedAt: '2025-10-24T10:15:00Z',
      latestTurnId: 'turn-uuid',
    },
    sourceService: 'socratic-api',
    requestId: crypto.randomUUID(),
  }),
});
```

---

### Act4: PPT生成

**AI服务**: `/api/ppt` (假设)

**集成示例**:
```typescript
async function generatePPTAndIngest(sessionId: string, userId: string) {
  // 1. 调用PPT生成服务
  const pptResponse = await fetch('/api/ppt', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
  const pptData = await pptResponse.json();

  // 2. 入库Act4快照
  await fetch('/api/teaching-sessions/ingest', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      userId,
      actType: 'act4',
      payload: {
        learningReport: pptData.report,
        pptUrl: pptData.downloadUrl,
        pptMetadata: {
          slideCount: pptData.slideCount,
          generatedAt: new Date().toISOString(),
        },
        completedAt: new Date().toISOString(),
      },
      sourceService: 'ppt-generation-api',
      requestId: crypto.randomUUID(),
    }),
  });
}
```

---

## 性能监控 (T037 ✅)

SnapshotWriter已内置性能监控:

```typescript
// SnapshotWriter.ts 自动记录:
console.log('[SnapshotWriter] ✅ 写入成功', {
  versionId: '...',
  latencyMs: 1234,  // 写入耗时
  actType: 'act2',
});

// ⚠️ 超过2秒阈值自动警告
if (latencyMs > 2000) {
  console.warn('[SnapshotWriter] ⚠️ 写入延迟超标', {
    latencyMs: 2500,
    threshold: 2000,
  });
}
```

**监控指标**:
- `latencyMs`: 数据库写入延迟
- 目标: ≤2秒 (SC-001规范)

---

## 错误处理 (T030 ✅)

写入失败时,SnapshotWriter抛出异常,阻止API响应:

```typescript
try {
  const result = await snapshotWriter.writeAIOutput(context);
  // 写入成功,继续处理
} catch (error) {
  // 写入失败,整个操作失败
  console.error('❌ 快照写入失败,中止操作:', error);
  throw error;  // 向上传播,返回500错误
}
```

这确保了"数据库优先"原则:写入失败 = 整个操作失败。

---

## 审计追踪 (T029 ✅)

每次写入自动记录审计字段:

```typescript
{
  sourceService: 'legal-intelligence-api',  // 来源服务
  requestId: 'req-12345',  // 请求ID (用于追踪)
  traceId: 'trace-67890',  // 追踪ID (可选,用于分布式追踪)
  createdAt: '2025-10-24T10:00:00Z',  // 创建时间
  updatedAt: '2025-10-24T10:00:00Z',  // 更新时间
}
```

查询审计日志:
```sql
SELECT version_id, source_service, request_id, created_at
FROM teaching_session_snapshots
WHERE session_id = 'session-uuid'
ORDER BY created_at DESC;
```

---

## 迁移建议

### 短期 (当前阶段)
1. ✅ 使用ingest API (已实现)
2. ✅ 前端集成策略(推荐)
3. 保持现有AI服务不变

### 中期 (优化阶段)
1. 创建`TeachingOrchestrator`统一编排
2. 将入库逻辑后移到后端
3. 添加缓存和批量写入优化

### 长期 (演进方向)
1. 事件驱动架构 (Event Sourcing)
2. 快照版本自动管理
3. AI输出流式写入

---

## 验证清单

- [x] SnapshotWriter实现完成 (T028-T031)
- [x] Ingest API创建完成 (T032-T034)
- [x] 集成文档编写完成 (T035)
- [x] 性能监控内置完成 (T037)
- [ ] 前端集成Act1 (待前端实现)
- [ ] 前端集成Act2 (待前端实现)
- [ ] 前端集成Act3对话 (待前端实现)
- [ ] 前端集成Act4 PPT (待前端实现)

---

## 常见问题

### Q1: 为什么不在AI服务内部直接调用SnapshotWriter?

**A**: 架构分离原则。AI服务应该专注于AI处理逻辑,不应该耦合快照持久化。快照入库应该由编排层或前端控制。

### Q2: sessionId从哪里来?

**A**: 前端在开始教学流程时,先调用`POST /api/teaching-sessions`创建会话,获得sessionId。

### Q3: 如果写入失败但AI调用成功,数据会丢失吗?

**A**: 是的。这是"数据库优先"的权衡。建议:
- 前端重试ingest API
- 或者在后端添加消息队列确保最终一致性

### Q4: 能否批量写入多个Act?

**A**: 可以。SnapshotWriter提供`writeMultipleActs`方法:
```typescript
await snapshotWriter.writeMultipleActs([
  { actType: 'act1', payload: act1Data, ... },
  { actType: 'act2', payload: act2Data, ... },
]);
```

---

## 参考文档

- [spec.md](./spec.md) - 快照系统完整规范
- [data-model.md](./data-model.md) - 数据库Schema设计
- [plan.md](./plan.md) - 实施计划
- [tasks.md](./tasks.md) - 任务列表 (T028-T037)
