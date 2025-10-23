# 教学会话快照系统架构

## 📊 完整数据流逻辑图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             用户操作层 (UI Layer)                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 1. 用户上传判决书/分析/对话/保存
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    状态管理层 (State Management Layer)                            │
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  useTeachingStore (Zustand + Immer + Persist)                            │  │
│  │                                                                            │  │
│  │  State结构：                                                               │  │
│  │  {                                                                         │  │
│  │    uploadData: {                          // 第一幕：案例导入              │  │
│  │      extractedElements: {                                                │  │
│  │        data: { basicInfo, threeElements, ... },                          │  │
│  │        confidence: 90                                                    │  │
│  │      }                                                                    │  │
│  │    },                                                                     │  │
│  │    analysisData: {                         // 第二幕：深度分析             │  │
│  │      result: {                                                            │  │
│  │        narrative, timelineAnalysis,                                       │  │
│  │        evidenceQuestions, claimAnalysis                                   │  │
│  │      }                                                                     │  │
│  │    },                                                                      │  │
│  │    socraticData: {                         // 第三幕：苏格拉底对话          │  │
│  │      level: 1,                                                             │  │
│  │      completedNodes: Set<string>                                           │  │
│  │    },                                                                      │  │
│  │    summaryData: {                          // 第四幕：学习报告              │  │
│  │      caseLearningReport: { ... }                                           │  │
│  │    }                                                                        │  │
│  │  }                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 2. 点击保存按钮
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       前端容器层 (Container Layer)                                │
│                                                                                   │
│  MainPageContainer.tsx:                                                          │
│  const saveSessionSnapshot = useCallback(async (saveType) => {                  │
│    const storeState = useTeachingStore.getState();                              │
│    const snapshot = SnapshotConverterV2.toDatabase(storeState);  // ← 转换      │
│    const response = await fetch('/api/teaching-sessions', {                     │
│      method: 'POST',                                                             │
│      body: JSON.stringify({ snapshot })                                          │
│    });                                                                            │
│  }, []);                                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 3. 转换Store数据 → Snapshot格式
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       数据转换层 (Converter Layer)                                │
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  SnapshotConverterV2.toDatabase(storeState)                               │  │
│  │                                                                            │  │
│  │  转换流程：                                                                │  │
│  │  1. extractCaseInfo(storeState)                                           │  │
│  │     └→ 提取：caseTitle, caseNumber, courtName                            │  │
│  │                                                                            │  │
│  │  2. buildAct1Snapshot(storeState)                                         │  │
│  │     └→ 从 uploadData.extractedElements 提取                               │  │
│  │        ├─ basicInfo (案例基本信息)                                         │  │
│  │        │   └─ parties: { plaintiff: [], defendant: [] }                  │  │
│  │        │      ⚠️ 问题点：三层嵌套数组需要展平                            │  │
│  │        ├─ facts (事实认定)                                                 │  │
│  │        ├─ evidence (证据质证)                                              │  │
│  │        ├─ reasoning (法官说理)                                             │  │
│  │        └─ metadata                                                         │  │
│  │           ├─ confidence: 0-1 范围 ⚠️ 问题点：0-100需转换                 │  │
│  │           └─ extractionMethod: 枚举值 ⚠️ 问题点：'pure-ai'需映射到'ai'   │  │
│  │                                                                            │  │
│  │  3. buildAct2Snapshot(storeState)                                         │  │
│  │     └→ 从 analysisData.result 提取                                        │  │
│  │        ├─ narrative: { chapters: [...] }                                  │  │
│  │        │   └─ ⚠️ 问题点：chapters需要order字段                           │  │
│  │        ├─ timelineAnalysis: { turningPoints: [...] }                      │  │
│  │        │   └─ ⚠️ 问题点：turningPoints需要id/event/impact字段            │  │
│  │        ├─ evidenceQuestions                                                │  │
│  │        └─ claimAnalysis                                                    │  │
│  │                                                                            │  │
│  │  4. buildAct3Snapshot(storeState)                                         │  │
│  │     └→ 从 socraticData 提取                                               │  │
│  │        └─ completedNodes: Set<string> → Array<string> 转换              │  │
│  │                                                                            │  │
│  │  5. buildAct4Snapshot(storeState, pptUrl)                                │  │
│  │     └→ 从 summaryData.caseLearningReport 提取                            │  │
│  │                                                                            │  │
│  │  输出：TeachingSessionSnapshotV1 对象                                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 4. 序列化为JSON发送HTTP请求
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          API路由层 (API Route Layer)                             │
│                                                                                   │
│  /app/api/teaching-sessions/route.ts:                                           │
│                                                                                   │
│  export async function POST(request: NextRequest) {                             │
│    // 1. 验证JWT Token                                                           │
│    const payload = await jwtUtils.getCurrentUser();                             │
│                                                                                   │
│    // 2. 解析请求体                                                              │
│    const body = await request.json();                                            │
│    const snapshot: TeachingSessionSnapshot = body.snapshot;                     │
│                                                                                   │
│    // 3. ⚠️ 关键验证：Zod Schema验证                                            │
│    const validation = validateTeachingSessionSnapshot(snapshot);                │
│    if (!validation.success) {                                                    │
│      return NextResponse.json({ error: ... }, { status: 400 });                │
│    }                                                                              │
│                                                                                   │
│    // 4. 保存到数据库                                                            │
│    const savedSession = await teachingSessionRepository.saveSnapshot(           │
│      payload.userId,                                                             │
│      validation.data,  // ← 已验证的数据                                        │
│      sessionIdFromBody                                                           │
│    );                                                                             │
│                                                                                   │
│    return NextResponse.json({ success: true, data: ... });                      │
│  }                                                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 5. 调用Repository层保存
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    数据访问层 (Repository Layer)                                  │
│                                                                                   │
│  PostgreSQLTeachingSessionRepository:                                            │
│                                                                                   │
│  async saveSnapshot(userId, snapshot, sessionId?) {                             │
│    // 1. 转换为数据库列格式                                                      │
│    const columns = this.buildColumnPayload(snapshot);                           │
│    //     ▲                                                                      │
│    //     │ ⚠️ 问题点：这里可能发生双重序列化！                                │
│    //     └─ columns包含30个字段，每个字段应该是JSONB对象                      │
│    //                                                                             │
│    // 2. 决定是INSERT还是UPDATE                                                  │
│    if (sessionId) {                                                              │
│      return await this.updateSnapshot(userId, sessionId, columns);              │
│    } else {                                                                      │
│      return await this.insertSnapshot(userId, columns);                         │
│    }                                                                              │
│  }                                                                                │
│                                                                                   │
│  private buildColumnPayload(snapshot): SnapshotColumnPayload {                  │
│    return {                                                                      │
│      act1BasicInfo: act1?.basicInfo ?? null,        // ← JSONB对象              │
│      act1Facts: act1?.facts ?? null,                // ← JSONB对象              │
│      act1Evidence: act1?.evidence ?? null,          // ← JSONB对象              │
│      act1Reasoning: act1?.reasoning ?? null,        // ← JSONB对象              │
│      act1Metadata: metadata,                        // ← JSONB对象              │
│      act2Narrative: act2?.narrative ?? null,        // ← JSONB对象              │
│      act2TimelineAnalysis: act2?.timelineAnalysis ?? null,                      │
│      act2EvidenceQuestions: act2?.evidenceQuestions ?? null,  // ⚠️ 问题点     │
│      act2ClaimAnalysis: act2?.claimAnalysis ?? null,                            │
│      act3Socratic: act3Payload,                     // ← JSONB对象              │
│      act4LearningReport: act4?.learningReport ?? null,                          │
│      // ... 其他字段                                                             │
│    };                                                                             │
│  }                                                                                │
│                                                                                   │
│  private async insertSnapshot(userId, columns) {                                │
│    const result = await pool.query(                                             │
│      `INSERT INTO teaching_sessions_v2 (...)                                    │
│       VALUES ($1, $2, ..., $30)`,  // ← 30个参数                                │
│      [userId, columns.act1BasicInfo, ...]  // ⚠️ PostgreSQL会自动序列化JSONB   │
│    );                                                                             │
│    //   ▲                                                                        │
│    //   │ 关键点：node-postgres驱动会自动将JS对象序列化为JSONB                │
│    //   └─ 如果columns.act1BasicInfo已经是字符串，会导致双重序列化！          │
│                                                                                   │
│    return this.mapRowToEntity(result.rows[0]);                                  │
│  }                                                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ 6. 执行SQL INSERT/UPDATE
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       数据库层 (Database Layer)                                   │
│                                                                                   │
│  PostgreSQL表结构：teaching_sessions_v2 (30列)                                   │
│                                                                                   │
│  CREATE TABLE teaching_sessions_v2 (                                             │
│    id UUID PRIMARY KEY,                                                          │
│    user_id INTEGER,                                                              │
│    schema_version INTEGER,                                                       │
│    session_state VARCHAR(50),                                                    │
│    case_title VARCHAR(500),                                                      │
│    case_number VARCHAR(200),                                                     │
│    court_name VARCHAR(500),                                                      │
│    -- 第一幕：案例导入 (7列)                                                      │
│    act1_basic_info JSONB,           -- { caseNumber, court, parties, ... }     │
│    act1_facts JSONB,                -- { summary, timeline, keyFacts, ... }    │
│    act1_evidence JSONB,             -- { summary, items, chainAnalysis, ... }  │
│    act1_reasoning JSONB,            -- { summary, legalBasis, ... }            │
│    act1_metadata JSONB,             -- { extractedAt, confidence, ... }        │
│    act1_confidence NUMERIC,         -- 0.0-1.0                                 │
│    act1_completed_at TIMESTAMP,                                                  │
│    -- 第二幕：深度分析 (5列)                                                      │
│    act2_narrative JSONB,            -- { chapters: [...] }                     │
│    act2_timeline_analysis JSONB,    -- { turningPoints: [...] }               │
│    act2_evidence_questions JSONB,   -- [{ question, difficulty, ... }]        │
│    act2_claim_analysis JSONB,       -- { claims: [...], ... }                 │
│    act2_completed_at TIMESTAMP,                                                  │
│    -- 第三幕：苏格拉底对话 (2列)                                                  │
│    act3_socratic JSONB,             -- { level, completedNodes, ... }          │
│    act3_completed_at TIMESTAMP,                                                  │
│    -- 第四幕：学习报告 (4列)                                                      │
│    act4_learning_report JSONB,      -- { caseOverview, learningPoints, ... }   │
│    act4_ppt_url VARCHAR(1000),                                                   │
│    act4_ppt_metadata JSONB,                                                      │
│    act4_completed_at TIMESTAMP,                                                  │
│    -- 元数据 (5列)                                                                │
│    created_at TIMESTAMP,                                                         │
│    updated_at TIMESTAMP,                                                         │
│    completed_at TIMESTAMP,                                                       │
│    last_saved_at TIMESTAMP,                                                      │
│    save_type VARCHAR(20)            -- 'manual' | 'auto'                        │
│  );                                                                               │
│                                                                                   │
│  JSONB类型特点：                                                                 │
│  ✅ 自动验证JSON格式                                                             │
│  ✅ 支持索引和查询                                                               │
│  ❌ 不接受双重序列化的字符串（如 "{\\"key\\":\\"value\\"}"）                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔍 关键问题点分析

### 问题1：parties三层嵌套数组

**数据流**：
```javascript
AI提取 → {
  name: [  // ❌ name本身是数组！
    { name: "原告1", type: "法人" }
  ]
}

转换前 → parties.plaintiff = [{ name: [...] }]
转换后 → parties.plaintiff = ["原告1"]  // ✅ 字符串数组
```

**修复位置**：`SnapshotConverterV2.ts:353-426`
- 使用递归展平处理 `name` 属性

### 问题2：confidence范围不一致

**数据流**：
```
ConfidenceCalculator → 返回 0-100 范围
legal-case.ts Schema → 期望 0-1 范围
SnapshotSchemas.ts → 期望 0-1 范围
PostgreSQL → 存储 NUMERIC(0.0-1.0)
```

**修复位置**：
- `JudgmentExtractionService.ts:145` - 除以100
- `SnapshotConverterV2.ts:384` - normalizeConfidence()

### 问题3：extractionMethod枚举值不匹配

**数据流**：
```
JudgmentExtractionService → 返回 'pure-ai'
legal-case.ts Schema → 枚举 ['ai', 'rule', 'hybrid', 'manual']
```

**修复位置**：
- `JudgmentExtractionService.ts:147` - 使用'ai'
- `SnapshotConverterV2.ts:394` - mapExtractionMethod()

### 问题4：Act2字段缺失

**数据流**：
```
analysisData.result.narrative.chapters → 缺少 order 字段
analysisData.result.timelineAnalysis.turningPoints → 缺少 id/event/impact
turningPoints.impact → 'high'/'medium' 不在枚举中['major','moderate','minor']
```

**修复位置**：`SnapshotConverterV2.ts:448-488`
- 添加 `order` 字段（使用索引+1）
- 添加 `id`, `event` 字段
- 映射 impact 枚举值

### 问题5：双重JSON序列化 ⚠️ 当前问题

**错误信息**：
```
invalid input syntax for type json
detail: 'Expected ":", but found ",".'
where: 'JSON data, line 1: ...\\",\\"difficulty\\":\\"beginner\\",...'
```

**分析**：
```
正常：{ "difficulty": "beginner" }
错误："{\"difficulty\":\"beginner\"}"  // 被序列化成字符串

PostgreSQL期望：JavaScript对象
实际收到：JSON字符串（已经序列化过）
结果：node-postgres再次序列化 → 双重转义
```

**可能原因**：
1. 某个字段在转换时被 `JSON.stringify()` 了
2. Zustand persist 中间件序列化了数据
3. 前端发送时多序列化了一次

## 🛠️ 数据验证层级

```
Level 1: 前端 Zustand Store
         └→ Immer (不可变性) + Persist (localStorage)

Level 2: SnapshotConverterV2
         └→ 数据格式转换 + 字段映射

Level 3: Zod Schema验证 ⭐ 关键验证点
         ├→ validateTeachingSessionSnapshot()
         ├→ validateAct1Snapshot()
         └→ validateAct2Snapshot()

Level 4: PostgreSQL JSONB类型验证
         └→ 自动验证JSON语法
```

## 📝 修复历史

### 已修复 ✅

1. **JudgmentExtractionService.ts**
   - confidence: 0-100 → 0-1
   - extractionMethod: 'pure-ai' → 'ai'

2. **types/legal-case.ts**
   - MetadataSchema constraints
   - Default values

3. **SnapshotConverterV2.ts**
   - Act1: parties嵌套数组展平
   - Act1: metadata normalization
   - Act2: chapters.order 字段补全
   - Act2: turningPoints Schema映射
   - Act2: impact枚举值映射

4. **ClaimAnalysisService.ts**
   - confidence返回范围 0-100 → 0-1

### 待修复 ⚠️

1. **双重JSON序列化问题**
   - 位置：PostgreSQLTeachingSessionRepository.buildColumnPayload()
   - 症状：`invalid input syntax for type json`
   - 待确认：哪个字段被字符串化了

## 🔧 调试建议

1. **前端调试**：
   ```javascript
   // 在MainPageContainer保存前
   console.log('Store数据:', useTeachingStore.getState());
   console.log('Snapshot数据:', snapshot);
   console.log('JSON序列化后:', JSON.stringify(snapshot));
   ```

2. **后端调试**：
   ```javascript
   // 在Repository中
   console.log('act1数据类型:', typeof act1?.basicInfo);
   console.log('act1数据内容:', act1?.basicInfo);
   ```

3. **数据库调试**：
   ```sql
   -- 查看实际存储的JSON
   SELECT act1_basic_info, act2_evidence_questions
   FROM teaching_sessions_v2
   ORDER BY created_at DESC
   LIMIT 1;
   ```

## 📚 相关文件

- **Store**: `src/domains/teaching-acts/stores/useTeachingStore.ts`
- **Converter**: `src/domains/teaching-acts/utils/SnapshotConverterV2.ts`
- **Schemas**: `src/domains/teaching-acts/schemas/SnapshotSchemas.ts`
- **Repository**: `src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts`
- **API**: `app/api/teaching-sessions/route.ts`
- **Types**: `types/legal-case.ts`

## 🎯 下一步行动

1. 添加调试日志到 `buildColumnPayload()`
2. 确认哪个字段被双重序列化
3. 修复序列化问题
4. 清理调试日志
5. 完整测试所有四幕流程
