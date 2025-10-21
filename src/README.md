# 📦 src/ - 领域驱动设计(DDD)核心

> **设计理念**：按业务领域划分代码，每个领域独立自治，职责清晰

## 🎯 为什么选择DDD？

**解决的主要矛盾**：
- ❌ 传统MVC：教学逻辑分散在controllers/models/views，改一个功能要跳N个文件
- ✅ DDD架构：改"苏格拉底对话"只需关注 `socratic-dialogue/` 目录，降低认知负担

## 📂 领域结构

```
src/
├── domains/                    # 业务领域层（核心）
│   ├── legal-analysis/        # 法律分析域 ⭐
│   ├── socratic-dialogue/     # 苏格拉底对话域 ⭐
│   ├── teaching-acts/         # 四幕教学域
│   ├── case-management/       # 案例管理域
│   ├── document-processing/   # 文档处理域
│   ├── contract-analysis/     # 合同分析域
│   └── shared/                # 共享组件
│
├── infrastructure/            # 基础设施层（技术支撑）
│   ├── ai/                   # AI调用代理
│   ├── api/                  # API客户端
│   └── compatibility/        # 兼容性桥接
│
└── config/                    # 配置管理
```

---

## 🎭 核心领域详解

### 1. legal-analysis/ - 法律分析域 ⭐核心

**职责**：第二幕的AI分析引擎

**核心服务**（7个分析器）：
- `LegalAnalysisFacade.ts` - 统一分析门面
- `JudgmentExtractionService.ts` - 判决书智能提取（第一幕核心）
- `CaseNarrativeService.ts` - 案例叙事生成（支持多风格）
- `ClaimAnalysisService.ts` - 请求权分析（德国法学方法）
- `DisputeAnalysisService.ts` - 争议焦点分析
- `EvidenceIntelligenceService.ts` - 证据智能分析
- `TimelineAnalysisApplicationService.ts` - 时间轴分析

**典型使用场景**：
```typescript
import { LegalAnalysisFacade } from '@/src/domains/legal-analysis/services/LegalAnalysisFacade';

const facade = new LegalAnalysisFacade();
const result = await facade.analyzeCase(caseData);
// 自动编排7个分析器，返回结构化结果
```

**架构优势**：
- ✅ 门面模式简化调用
- ✅ 智能缓存降低成本
- ✅ 支持并行分析提升性能

---

### 2. socratic-dialogue/ - 苏格拉底对话域 ⭐核心

**职责**：第三幕的AI对话引擎

**核心架构**：
```
socratic-dialogue/
├── services/
│   ├── SocraticDialogueService.ts    # 统一服务入口
│   ├── FullPromptBuilder.ts          # 全量提示词构建
│   └── DeeChatAIClient.ts            # AI调用客户端
├── prompts/                          # 模块化提示词库
│   ├── core/                        # 核心身份和约束
│   ├── protocols/                   # ISSUE和质量协议
│   └── strategies/                  # 模式和难度策略
├── stores/                           # Zustand状态管理
└── types/                            # 类型定义
```

**ISSUE五阶段协作范式**：
1. **Initiate** - 建立安全环境
2. **Structure** - 梳理分析框架
3. **Socratic** - 深度启发式对话
4. **Unify** - 统一认知成果
5. **Execute** - 形成学习产出

**典型使用**：
```typescript
import { SocraticDialogueService } from '@/src/domains/socratic-dialogue/services/SocraticDialogueService';

const service = new SocraticDialogueService();
const response = await service.generateQuestion({
  currentTopic: "合同效力",
  level: "intermediate",
  mode: "analysis"
});
```

**关键特性**：
- ✅ Advice Socratic标准（友好+启发+建议）
- ✅ 上下文智能管理
- ✅ 自适应难度调整

---

### 3. teaching-acts/ - 四幕教学域

**职责**：编排四幕教学流程

**主要功能**：
- 教学流程编排
- 快照系统（保存/恢复教学状态）
- PPT生成服务
- 教学总结生成

**典型使用**：
```typescript
import { PptGeneratorService } from '@/src/domains/teaching-acts/services/PptGeneratorService';
```

---

### 4. case-management/ - 案例管理域

**职责**：案例的CRUD和版本管理

**主要功能**：
- 案例创建、更新、删除
- 案例列表和搜索
- 案例版本控制
- 案例状态管理（草稿、发布、归档）

---

### 5. document-processing/ - 文档处理域

**职责**：文档上传和解析

**支持格式**：
- PDF（pdfjs-dist）
- Word/DOCX（mammoth）
- 纯文本

**主要功能**：
- 文档上传和验证
- OCR文本提取
- 判决书结构识别
- 文档预处理和清洗

---

### 6. contract-analysis/ - 合同分析域

**职责**：合同智能分析

**主要功能**：
- 合同条款提取
- 风险识别
- 合同对比
- 智能审查建议

---

### 7. shared/ - 共享组件

**职责**：跨领域的共享逻辑

**包含**：
- `components/` - 共享UI组件
- `infrastructure/` - 共享基础设施
- `containers/` - 共享容器组件

---

## 🔧 基础设施层

### infrastructure/ai/ - AI调用代理

**核心服务**：`AICallProxy.ts` - 统一AI调用入口

**特性**：
- ✅ 统一错误处理
- ✅ 自动重试（最多3次）
- ✅ Token消耗追踪
- ✅ 成本计算
- ✅ 结构化日志

**使用示例**：
```typescript
import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';

const result = await callUnifiedAI(
  systemPrompt,
  userPrompt,
  {
    temperature: 0.3,
    maxTokens: 2000,
    responseFormat: 'json'
  }
);
```

**⚠️ 重要**：所有AI调用必须通过 `AICallProxy`，禁止直接调用AI API！

---

## 📐 架构原则

### 1. 依赖方向
```
components/ → lib/ → src/domains/ → src/infrastructure/
   (UI)      (适配)    (业务)          (技术)
```

- ✅ domains/ 可以依赖 infrastructure/
- ❌ domains/ 不应依赖 lib/（lib/是前端适配层）
- ❌ infrastructure/ 不应依赖 domains/

### 2. 职责单一
- 每个domain只负责一个业务领域
- 每个service只做一件事
- 跨域协作通过显式接口

### 3. 测试要求
- 业务逻辑必须有单元测试
- 关键流程必须有集成测试
- 测试覆盖率目标：>80%

---

## 🎯 快速开始

### 修改现有功能
1. 确定功能属于哪个domain
2. 找到对应的service文件
3. 修改业务逻辑
4. 运行测试：`npm test`

### 添加新功能
1. 确定属于哪个domain（或需要新建domain）
2. 在 `services/` 下创建新服务
3. 如需AI调用，使用 `AICallProxy`
4. 编写测试用例
5. 在API层暴露接口（如需要）

### 新建领域
1. 在 `domains/` 下创建新目录
2. 参考现有domain的结构：
   ```
   new-domain/
   ├── services/     # 业务逻辑
   ├── stores/       # Zustand状态
   ├── types/        # 类型定义
   └── README.md     # 领域说明
   ```
3. 更新本README的领域列表

---

## 📚 扩展阅读

- [CLAUDE.md](../docs/CLAUDE.md) - 完整架构指南
- [架构文档](../docs/架构文档/) - 架构设计详解
- [功能文档](../docs/功能文档/) - 各领域详细文档

---

**最后更新**：2025-10-21
**维护原则**：奥卡姆剃刀 - 简洁优于复杂，删除过时内容
