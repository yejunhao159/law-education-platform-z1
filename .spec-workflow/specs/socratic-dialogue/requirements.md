# Requirements Document - 苏格拉底式问答模块

## Introduction

苏格拉底式问答模块是法律教育平台的核心教学功能，通过专门的法学AI Agent驱动递进式提问，引导法学院学生从真实判决书中提炼法学思维。该模块专注于课堂教学场景，通过智能问答和实时互动，帮助学生完成从理论到实践的思维转换，培养专业的法律分析能力。

## Alignment with Product Vision

本功能直接支持平台"培养实战型法律人才"的核心愿景：
- **教育价值**：通过苏格拉底式提问训练批判性思维
- **互动体验**：增强课堂参与度，让枯燥的法律学习变得生动
- **本土化**：基于中国法律体系和司法实践
- **实践导向**：从真实判决书中学习，缩短理论与实务的距离

## Requirements

### Requirement 1: 法学AI Agent系统

**User Story:** 作为法学院学生，我希望与专业的法学AI Agent对话，通过智能追问理解案例的法律本质

#### Acceptance Criteria

1. WHEN 学生输入对案例的理解 THEN 法学Agent SHALL 分析回答的法律要素并生成针对性追问
2. IF 学生的回答偏离核心法律问题 THEN Agent SHALL 通过苏格拉底式引导拉回主线
3. WHEN Agent生成问题 THEN 系统 SHALL 基于当前案例上下文和学生理解程度动态调整问题深度
4. IF AI服务不可用 THEN 系统 SHALL 从缓存的高质量问答对中提供备选方案
5. WHEN 学生回答包含法律概念错误 THEN Agent SHALL 通过反问引导学生自己发现并纠正错误
6. WHEN Agent分析学生回答 THEN 系统 SHALL 识别关键法律概念并标记理解程度

### Requirement 2: 后端问答数据处理系统

**User Story:** 作为系统管理员，我需要高效的后端系统处理和存储问答数据，支持课堂规模的并发访问

#### Acceptance Criteria

1. WHEN 接收问答请求 THEN 后端 SHALL 在100ms内完成数据预处理和上下文构建
2. IF 多个学生提出相似问题 THEN 系统 SHALL 识别并复用已有的高质量回答
3. WHEN 存储问答数据 THEN 系统 SHALL 按案例ID、层级、问题类型进行结构化存储
4. WHEN 检索历史问答 THEN 系统 SHALL 支持基于相似度的智能匹配
5. IF 问答质量评分高 THEN 系统 SHALL 自动加入优质问答库供复用
6. WHEN 批量处理课堂数据 THEN 系统 SHALL 支持异步处理和结果推送

### Requirement 3: 五层递进式教学框架

**User Story:** 作为法学院教师，我希望教学过程有清晰的层次结构，便于掌控教学节奏和评估学习效果

#### Acceptance Criteria

1. WHEN 开始新的案例讨论 THEN 系统 SHALL 从第一层"观察层"开始
2. IF 当前层级完成度达到80%（基于AI评估） THEN 系统 SHALL 提示可进入下一层级
3. WHEN 教师介入 THEN 系统 SHALL 支持手动调整层级和问题方向
4. WHEN 显示问题 THEN 系统 SHALL 明确标注：当前层级、核心目标、预期思维深度
5. IF 学生在某层级停滞超过5分钟 THEN 系统 SHALL 自动提供渐进式提示

层级定义与Agent策略：
- 第1层（观察层）：Agent引导识别案件基本信息，不做价值判断
- 第2层（事实层）：Agent帮助梳理时间线，区分争议和非争议事实
- 第3层（分析层）：Agent深入法律关系分析，探讨构成要件
- 第4层（应用层）：Agent检验法条适用，引导法律推理
- 第5层（价值层）：Agent引发价值思考，探讨判决的社会影响

### Requirement 4: 课堂实时互动系统

**User Story:** 作为法学院教师，我需要在课堂上组织全班参与讨论，实时了解学生的理解程度

#### Acceptance Criteria

1. WHEN 教师创建课堂 THEN 系统 SHALL 生成6位数字课堂码（无需登录）
2. WHEN 学生输入课堂码 THEN 系统 SHALL 使用临时会话ID加入课堂
3. IF 教师发起投票 THEN 系统 SHALL 实时收集并以图表展示结果
4. WHEN 多个学生同时发言 THEN 系统 SHALL 支持消息队列和教师筛选展示
5. WHEN 教师点击"随机选人" THEN 系统 SHALL 从活跃学生中随机选择
6. IF 学生举手 THEN 系统 SHALL 在教师端实时显示举手列表和等待时长
7. WHEN 课堂结束 THEN 系统 SHALL 生成课堂报告（参与度、问答质量、难点分布）

### Requirement 5: 中国法律本土化知识库

**User Story:** 作为中国法学院学生，我需要基于中国法律体系进行学习，确保知识的准确性和实用性

#### Acceptance Criteria

1. WHEN Agent引用法条 THEN 系统 SHALL 使用最新版本的中国法律法规
2. IF 涉及司法解释 THEN Agent SHALL 优先引用最高院司法解释和指导案例
3. WHEN 分析案例 THEN Agent SHALL 使用标准的中国法律术语（如"请求权基础"、"构成要件"）
4. WHEN 讨论程序 THEN Agent SHALL 严格遵循中国三大诉讼法的程序规定
5. IF 涉及法理 THEN Agent SHALL 结合中国特色社会主义法治理论
6. WHEN 提供案例参考 THEN 系统 SHALL 优先推荐最高院公报案例和指导性案例

### Requirement 6: 教师控制与监控面板

**User Story:** 作为法学院教师，我需要实时掌控课堂进度，监控学生理解情况，适时干预引导

#### Acceptance Criteria

1. WHEN 教师打开控制面板 THEN 系统 SHALL 显示：当前层级、活跃人数、平均理解度
2. IF 教师选择"介入引导" THEN 系统 SHALL 暂停AI自动问答，插入教师消息
3. WHEN 切换控制模式 THEN 系统 SHALL 支持：全自动、半自动（AI建议+教师确认）、手动
4. WHEN 查看实时统计 THEN 系统 SHALL 显示：各层级时长、问答轮次、高频错误
5. IF 检测到普遍理解困难 THEN 系统 SHALL 向教师推送干预建议
6. WHEN 调整难度 THEN 系统 SHALL 实时调整Agent的问题复杂度（简单/标准/深入）

### Requirement 7: 智能缓存与优化系统

**User Story:** 作为平台运营者，我需要系统高效运行，控制AI调用成本，同时保证教学质量

#### Acceptance Criteria

1. WHEN 生成新问答 THEN 系统 SHALL 计算内容哈希并检查缓存
2. IF 找到相似问答（相似度>85%） THEN 系统 SHALL 复用已有回答
3. WHEN 缓存问答 THEN 系统 SHALL 标记：使用次数、质量评分、适用场景
4. IF 缓存命中率<60% THEN 系统 SHALL 触发缓存策略优化
5. WHEN AI调用失败 THEN 系统 SHALL 从本地高质量问答库提供备选
6. WHEN 问答质量评分>4.5 THEN 系统 SHALL 自动加入精选问答库

## Non-Functional Requirements

### Code Architecture and Modularity
- **单一职责原则**: 
  - AI Agent服务：独立的法学Agent模块
  - 数据处理层：专门的问答数据处理服务
  - UI组件：课堂互动界面组件
  - 缓存服务：独立的缓存管理模块
- **模块化设计**: 
  - 基于现有项目结构，最小化改动
  - 复用现有的API路由和组件框架
  - 新增模块与现有代码解耦
- **清晰接口**: 
  - RESTful API + WebSocket（实时互动）
  - 统一的消息格式和错误处理

### Performance
- AI Agent响应时间 < 2秒（流式输出首字符 < 500ms）
- 支持单课堂100人同时在线
- 问答缓存命中率 > 70%
- WebSocket消息延迟 < 100ms
- 页面加载时间 < 2秒

### Security
- 无需账号系统，使用临时会话管理
- API调用频率限制（每课堂每分钟100次）
- 输入内容过滤（防止prompt注入）
- 课堂码6小时自动失效

### Reliability
- AI服务三级降级：实时AI → 缓存 → 预设问答库
- 问答数据自动备份（每小时）
- WebSocket断线自动重连
- 关键操作幂等性保证

### Usability
- 移动端优先（适配手机课堂使用）
- 大屏投影模式（教师端）
- 清晰的层级进度指示
- 一键复制课堂码
- 支持中文输入法和语音输入（预留）

### Scalability
- Agent能力可扩展（新增法律领域）
- 问答库动态增长
- 支持分布式部署（未来）
- 缓存策略可配置

### Integration with Existing System
- 复用现有的案例数据结构（useCaseStore）
- 集成现有的三要素分析结果
- 保持现有的UI风格（Tailwind + shadcn/ui）
- 兼容现有的API调用模式