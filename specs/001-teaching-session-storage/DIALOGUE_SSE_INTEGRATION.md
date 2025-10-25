# 苏格拉底对话SSE集成指南

**日期**: 2025-10-24
**状态**: 待集成 (T057-T058)
**相关**: DialogueWriter工具类,对话历史API

---

## 概述

苏格拉底对话系统需要在保持实时流式体验的同时,将每个对话轮次持久化到数据库。

**核心原则**: **先写入数据库,再推送给客户端**

```
AI生成消息 → DialogueWriter.appendTurn() → 数据库 → SSE推送给前端
```

---

## 集成步骤

### Step 1: 在SSE Handler中导入DialogueWriter

```typescript
// app/api/socratic/stream/route.ts
import { dialogueWriter } from '@/src/domains/teaching-acts/utils/DialogueWriter';
```

### Step 2: 初始化轮次计数器

在SSE流开始时初始化turnIndex:

```typescript
export async function POST(request: NextRequest) {
  // 解析请求
  const { sessionId, versionId, question } = await request.json();

  // 初始化轮次计数器
  let currentTurnIndex = 0; // T058: 轮次索引跟踪

  // ... SSE流初始化
}
```

### Step 3: 每个消息前调用DialogueWriter

**关键**: 在推送消息给前端**之前**,先写入数据库:

```typescript
// 示例: Assistant消息持久化
async function streamAssistantResponse(
  message: string,
  sessionId: string,
  versionId: string,
  turnIndex: number,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
) {
  try {
    // T057: 先写入数据库 (阻塞操作)
    const writeResult = await dialogueWriter.appendTurn({
      sessionId,
      versionId,
      turnIndex,
      chunkIndex: 0,
      speaker: 'assistant',
      message,
      sourceService: 'socratic-dialogue-api',
      requestId: crypto.randomUUID(),
      traceId: crypto.randomUUID(),
    });

    console.log('✅ 对话已持久化, turnId:', writeResult.turnId);

    // 写入成功后,再推送给前端
    const sseData = {
      type: 'message',
      speaker: 'assistant',
      message,
      turnId: writeResult.turnId,
      turnIndex,
    };

    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`)
    );
  } catch (error) {
    // T053: 如果写入失败,终止SSE流
    console.error('❌ 对话持久化失败,终止流:', error);

    const errorData = {
      type: 'error',
      message: '对话保存失败,请重试',
    };
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
    );

    controller.close();
    throw error;
  }
}
```

### Step 4: 支持流式消息分片

如果AI响应是流式分片的:

```typescript
let chunkIndex = 0;

for await (const chunk of aiStream) {
  await dialogueWriter.appendTurn({
    sessionId,
    versionId,
    turnIndex,
    chunkIndex: chunkIndex++, // 递增chunk索引
    speaker: 'assistant',
    message: chunk.content,
    sourceService: 'socratic-dialogue-api',
    requestId: requestId,
  });

  // 推送给前端
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
}
```

### Step 5: 学生回复持久化

学生提问也需要持久化:

```typescript
// 学生提问
await dialogueWriter.appendTurn({
  sessionId,
  versionId,
  turnIndex: currentTurnIndex++,
  chunkIndex: 0,
  speaker: 'student',
  message: studentQuestion,
  sourceService: 'socratic-dialogue-api',
  requestId: crypto.randomUUID(),
});
```

---

## 完整示例

```typescript
// app/api/socratic/stream/route.ts
import { NextRequest } from 'next/server';
import { dialogueWriter } from '@/src/domains/teaching-acts/utils/DialogueWriter';

export async function POST(request: NextRequest) {
  const { sessionId, versionId, question } = await request.json();

  // 初始化轮次计数器
  let turnIndex = 0;
  const requestId = crypto.randomUUID();

  // 创建SSE流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // 1. 持久化学生提问
        await dialogueWriter.appendTurn({
          sessionId,
          versionId,
          turnIndex: turnIndex++,
          chunkIndex: 0,
          speaker: 'student',
          message: question,
          sourceService: 'socratic-dialogue-api',
          requestId,
        });

        // 2. 调用AI生成回复
        const aiResponse = await generateSocraticResponse(question);

        // 3. 持久化AI回复 (先写入数据库)
        const writeResult = await dialogueWriter.appendTurn({
          sessionId,
          versionId,
          turnIndex: turnIndex++,
          chunkIndex: 0,
          speaker: 'assistant',
          message: aiResponse,
          sourceService: 'socratic-dialogue-api',
          requestId,
        });

        // 4. 推送给前端 (写入成功后)
        const sseData = {
          type: 'message',
          speaker: 'assistant',
          message: aiResponse,
          turnId: writeResult.turnId,
          turnIndex: turnIndex - 1,
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`)
        );

        // 5. 结束流
        controller.close();
      } catch (error) {
        console.error('❌ SSE流错误:', error);

        const errorData = {
          type: 'error',
          message: error instanceof Error ? error.message : '对话处理失败',
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
        );

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 性能监控 (T054)

DialogueWriter内置性能监控:

```typescript
// 自动记录延迟
console.log('[DialogueWriter] ✅ 对话轮次写入成功', {
  turnId: 'xxx',
  latencyMs: 234,  // 写入耗时
});

// ⚠️ 超过500ms阈值自动警告
if (latencyMs > 500) {
  console.warn('[DialogueWriter] ⚠️ 对话写入延迟超标', {
    latencyMs: 678,
    threshold: 500,
  });
}
```

**监控指标**:
- `latencyMs`: 数据库写入延迟
- 目标: ≤500ms (SC-003规范)

---

## 错误处理 (T053)

### 写入失败策略

```typescript
try {
  await dialogueWriter.appendTurn(context);
  // 继续SSE流
} catch (error) {
  // 选项1: 终止SSE流 (推荐)
  controller.close();
  throw error;

  // 选项2: 记录错误但继续流 (降级方案)
  console.error('对话持久化失败,但继续流:', error);
  // 继续推送消息给前端
}
```

**推荐策略**: 终止SSE流,确保数据完整性。

---

## 前端集成 (T059)

### 获取对话历史

```typescript
// 组件挂载时加载历史
useEffect(() => {
  async function loadHistory() {
    const response = await fetch(
      `/api/teaching-sessions/${sessionId}/dialogues?versionId=${versionId}`
    );
    const data = await response.json();

    if (data.success) {
      setDialogueHistory(data.dialogues);
    }
  }

  loadHistory();
}, [sessionId, versionId]);
```

### 渲染对话历史

```tsx
// 对话回放组件 (T060)
function DialogueReplay({ dialogues }: { dialogues: SocraticTurn[] }) {
  return (
    <div className="dialogue-history">
      {dialogues.map((turn) => (
        <div key={turn.turnId} className={`turn turn-${turn.speaker}`}>
          <div className="turn-meta">
            Turn {turn.turnIndex} · {turn.speaker}
          </div>
          <div className="turn-message">{turn.message}</div>
          <div className="turn-time">
            {new Date(turn.streamedAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 课堂锁定保护 (T061)

### 删除对话时检查锁定状态

```typescript
// app/api/teaching-sessions/[id]/dialogues/[turnId]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; turnId: string } }
) {
  const { id: sessionId, turnId } = params;

  // 1. 获取快照检查锁定状态
  const snapshot = await teachingSessionRepository.getLatestClassroomSnapshot(
    sessionId
  );

  // 2. 如果快照已锁定,拒绝删除
  if (snapshot?.lockedAt) {
    return NextResponse.json(
      {
        success: false,
        error: 'Cannot delete dialogue from locked snapshot',
        message: `快照已锁定于 ${snapshot.lockedAt},无法删除对话`,
        lockedBy: snapshot.lockedBy,
      },
      { status: 403 }
    );
  }

  // 3. 执行删除
  // ... 删除逻辑
}
```

---

## 更新Act3摘要 (T062)

对话结束后,更新快照中的Act3摘要:

```typescript
// 对话会话结束时
async function finalizeSocraticSession(
  sessionId: string,
  versionId: string
) {
  // 1. 获取对话历史
  const dialogues = await dialogueWriter.getHistory(sessionId, versionId);

  // 2. 统计数据
  const totalTurns = new Set(dialogues.map(d => d.turnIndex)).size;
  const studentTurns = dialogues.filter(d => d.speaker === 'student').length;
  const studentParticipation = Math.round((studentTurns / totalTurns) * 100);

  // 3. 更新快照
  await snapshotWriter.writeAIOutput({
    sessionId,
    userId: 'teacher-id',
    actType: 'act3',
    payload: {
      totalTurns,
      studentParticipation,
      startedAt: dialogues[0]?.streamedAt,
      endedAt: dialogues[dialogues.length - 1]?.streamedAt,
      latestTurnId: dialogues[dialogues.length - 1]?.turnId,
    },
    sourceService: 'socratic-dialogue-api',
    requestId: crypto.randomUUID(),
  });
}
```

---

## 测试清单

- [ ] 单个对话轮次持久化
- [ ] 流式消息分片持久化
- [ ] 写入失败时SSE流终止
- [ ] 性能监控(≤500ms)
- [ ] 对话历史API返回正确顺序
- [ ] 课堂锁定保护生效
- [ ] Act3摘要正确更新

---

## 常见问题

### Q1: 为什么要先写入数据库再推送给前端?

**A**: 确保数据完整性。如果先推送再写入,可能出现前端看到消息但数据库没记录的情况。

### Q2: 写入延迟会影响用户体验吗?

**A**: 目标≤500ms,正常情况下用户不会感知。如果超标,会记录警告供优化。

### Q3: 如果数据库不可用怎么办?

**A**: 写入失败会终止SSE流并返回错误。可以考虑:
- 重试机制
- 消息队列异步写入 (降级方案)
- 本地缓存 (临时方案)

### Q4: chunk_index什么时候递增?

**A**: 当一个对话轮次分多个消息块流式传输时使用。例如:
- turnIndex=5, chunkIndex=0 (第一块)
- turnIndex=5, chunkIndex=1 (第二块)
- turnIndex=5, chunkIndex=2 (第三块)

---

## 参考文档

- [DialogueWriter.ts](../src/domains/teaching-acts/utils/DialogueWriter.ts) - 对话写入工具类
- [dialogues/route.ts](../app/api/teaching-sessions/[id]/dialogues/route.ts) - 对话历史API
- [spec.md](./spec.md) - 完整规范
- [data-model.md](./data-model.md) - 数据模型

---

**Created**: 2025-10-24
**Last Updated**: 2025-10-24
