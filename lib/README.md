# 🔧 lib/ - 前端适配层 + 工具层

> **设计理念**：反腐败层（Anti-Corruption Layer），保护前端组件不直接依赖复杂的domain模型

## 🎯 定位与职责

**lib/是什么？**
- **前端适配层**：将复杂的domain类型转换为UI友好格式
- **工具层**：提供通用的辅助函数和基础设施封装
- **反腐败层**：隔离前端和后端的复杂依赖

**lib/不是什么？**
- ❌ 不是业务逻辑层（业务逻辑在 `src/domains/`）
- ❌ 不是AI服务层（AI调用在 `src/infrastructure/ai/`）
- ❌ 不是数据持久化层（Repository在 `src/domains/*/repositories/`）

---

## 📂 目录结构

```
lib/
├── types/                    # 前端适配类型 ⭐
│   └── socratic/            # 苏格拉底对话的UI友好类型
│       └── classroom.ts     # DomainClassroomSession → UI简化版
│
├── services/                # 前端服务工具
│   └── dialogue/            # 对话数据处理工具
│
├── db/                      # 数据库客户端封装
│   └── index.ts             # SQLite/PostgreSQL客户端
│
├── logging/                 # 结构化日志系统
│   └── index.ts             # 日志工具
│
├── middleware/              # 中间件（限流、CORS等）
│
├── auth/                    # 认证工具（JWT、session等）
│
├── config/                  # 环境配置管理
│
├── adapters/                # 适配器模式实现
│
├── storage.ts               # localStorage优化封装 ⭐
├── redis.ts                 # Redis客户端
├── utils.ts                 # cn()工具函数（Tailwind）⭐
└── evidence-mapping-service.ts  # 基础文本匹配工具
```

**⭐ 标注的文件是最常用的**

---

## 🔍 lib/ vs src/domains/ - 清晰对比

| 维度 | lib/ | src/domains/ |
|------|------|-------------|
| **职责** | 前端适配 + 工具函数 | 业务核心逻辑 |
| **依赖方向** | 可以依赖 domains/ | ❌ 不应依赖 lib/ |
| **典型内容** | UI类型、工具函数、基础设施 | AI服务、分析引擎、业务规则 |
| **示例** | `types/socratic/classroom.ts` | `socratic-dialogue/services/` |
| **AI调用** | ❌ 不应直接调用AI | ✅ 通过 AICallProxy 调用 |
| **状态管理** | React hooks工具 | Zustand stores |
| **测试重点** | 工具函数正确性 | 业务逻辑完整性 |

---

## 💡 使用场景与案例

### ✅ 什么时候用 lib/

#### 场景1：类型适配（最常见）

**问题**：`src/domains/socratic-dialogue/types/` 的类型太复杂，UI组件不好用

**解决**：在 `lib/types/socratic/` 创建简化版

```typescript
// src/domains/socratic-dialogue/types/classroom.ts（复杂）
interface DomainClassroomSession {
  id: string;
  metadata: ComplexMetadata;
  participants: DomainParticipant[];
  // ...20个字段
}

// lib/types/socratic/classroom.ts（简化）
interface UIClassroomSession {
  id: string;
  code: string;
  studentCount: number;
  // ...5个UI需要的字段
}
```

**使用**：
```tsx
// components/中使用简化类型
import { UIClassroomSession } from '@/lib/types/socratic/classroom';

const ClassroomCard = ({ session }: { session: UIClassroomSession }) => {
  // UI渲染
};
```

---

#### 场景2：工具函数

**问题**：需要合并Tailwind CSS类名

**解决**：使用 `lib/utils.ts` 的 `cn()` 函数

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "flex items-center gap-2",
  isActive && "bg-primary",
  className
)} />
```

---

#### 场景3：localStorage优化

**问题**：直接用 `localStorage.setItem` 容易出错

**解决**：使用 `lib/storage.ts` 的封装

```typescript
import { storage } from '@/lib/storage';

// 自动JSON序列化/反序列化
storage.set('user-preferences', { theme: 'dark' });
const prefs = storage.get('user-preferences'); // 自动解析
```

---

#### 场景4：基础文本匹配

**问题**：需要简单的关键词匹配（非AI智能分析）

**解决**：使用 `lib/evidence-mapping-service.ts`

```typescript
import { evidenceMappingService } from '@/lib/evidence-mapping-service';

// 基于关键词配置的文本匹配（不调用AI）
const matches = evidenceMappingService.findMatches(text);
```

**注意**：这与 `src/domains/legal-analysis/services/EvidenceIntelligenceService.ts`（AI智能分析）是互补的！

---

### ❌ 什么时候不应该用 lib/

#### 错误示例1：在lib/写业务逻辑

```typescript
// ❌ 错误：lib/case-analyzer.ts
export async function analyzeLegalCase(caseData) {
  // 这是业务逻辑，应该在 domains/legal-analysis/
}
```

**正确做法**：
```typescript
// ✅ 正确：src/domains/legal-analysis/services/CaseAnalyzer.ts
export class CaseAnalyzer {
  async analyze(caseData) { ... }
}
```

---

#### 错误示例2：在lib/直接调用AI

```typescript
// ❌ 错误：lib/ai-helper.ts
import { callDeepSeek } from 'some-ai-sdk';

export async function generateQuestion() {
  return await callDeepSeek(...); // 错误！
}
```

**正确做法**：
```typescript
// ✅ 正确：src/domains/socratic-dialogue/services/SocraticDialogueService.ts
import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';

export class SocraticDialogueService {
  async generateQuestion() {
    return await callUnifiedAI(...); // 正确！
  }
}
```

---

#### 错误示例3：在lib/创建Zustand store

```typescript
// ❌ 错误：lib/stores/case-store.ts
export const useCaseStore = create(...);
```

**正确做法**：
```typescript
// ✅ 正确：src/domains/case-management/stores/useCaseStore.ts
export const useCaseStore = create(...);
```

---

## 📐 架构原则

### 1. 依赖方向（关键！）

```
components/  →  lib/  →  src/domains/  →  src/infrastructure/
   (UI)        (适配)      (业务)            (技术)
```

- ✅ **正确**：lib/ 可以依赖 domains/（适配器可以了解domain）
- ❌ **禁止**：domains/ 依赖 lib/（业务层不应依赖适配层）

### 2. 职责单一

**lib/的三个职责**：
1. **类型适配**：复杂domain类型 → UI友好类型
2. **工具函数**：通用辅助功能（cn、storage等）
3. **基础设施封装**：数据库、日志、Redis等技术细节

### 3. 奥卡姆剃刀

> "如无必要，勿增实体"

**反思**：
- 这个工具函数真的需要吗？能否直接用？
- 这个类型适配真的简化了吗？还是增加了复杂度？
- 这个封装真的有价值吗？还是过度设计？

---

## 🎯 快速决策树

**当你不确定代码应该放在哪里时**：

```
                   开始
                    ↓
        这是业务逻辑吗？
          ↙     ↘
        是       否
        ↓         ↓
    domains/   这需要AI吗？
                ↙     ↘
              是       否
              ↓         ↓
        infrastructure/ai/  这是UI适配吗？
                          ↙     ↘
                        是       否
                        ↓         ↓
                      lib/    components/
```

---

## 📚 关键文件说明

### utils.ts
**职责**：Tailwind CSS类名合并

```typescript
import { cn } from '@/lib/utils';
```

**何时使用**：需要条件化CSS类名

---

### storage.ts
**职责**：localStorage的类型安全封装

```typescript
import { storage } from '@/lib/storage';

storage.set('key', data);    // 自动JSON.stringify
const data = storage.get('key'); // 自动JSON.parse
```

**何时使用**：需要持久化用户偏好、临时数据

---

### evidence-mapping-service.ts
**职责**：基础关键词匹配（非AI）

```typescript
import { evidenceMappingService } from '@/lib/evidence-mapping-service';
```

**何时使用**：简单的文本匹配，不需要AI智能分析

**注意**：与 `EvidenceIntelligenceService`（AI智能）互补

---

### types/socratic/
**职责**：苏格拉底对话的UI友好类型

```typescript
import { UIClassroomSession } from '@/lib/types/socratic/classroom';
```

**何时使用**：组件需要简化版的classroom类型

---

## 🛠️ 开发建议

### 添加新工具函数

1. **先问自己**：这是通用工具还是业务逻辑？
2. **如果是通用工具**：
   - 检查是否已有类似功能（避免重复）
   - 创建在 `lib/` 根目录或相应子目录
   - 编写单元测试（`lib/__tests__/`）

3. **如果是业务逻辑**：
   - 放到对应的 `src/domains/*/services/`
   - 不要放在 lib/

### 添加类型适配

1. **确认domain类型确实太复杂**
2. **在 `lib/types/` 创建简化版**
3. **写转换函数**（domain类型 → UI类型）
4. **在组件中使用简化类型**

---

## 📖 扩展阅读

- [CLAUDE.md](../docs/CLAUDE.md) - 完整架构指南
- [src/README.md](../src/README.md) - 领域驱动设计核心
- [components/README.md](../components/README.md) - 组件库说明
- [架构文档](../docs/架构文档/) - 架构决策记录(ADR)

---

**最后更新**：2025-10-21
**维护原则**：简洁 > 复杂，工具 > 业务，适配 > 直接依赖
**架构哲学**：lib/是前端的"缓冲层"，保护UI不被domain复杂性污染
