# Feature Specification: 教学会话快照系统

**Feature Branch**: `001-teaching-session-storage`  
**Created**: 2025-10-24  
**Status**: Draft  
**Input**: Snapshot-first requirement — “四幕教学法的所有AI产出先写入PostgreSQL形成快照,前端通过快照只读展示,仅苏格拉底对话保持实时交互,课堂演示使用快照教案。”

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI输出入库管线 (Priority: P1)

当系统调用任何教学相关的AI服务(案例解析、要素抽取、PPT生成等)时,必须先把AI返回内容写入快照库,然后才把数据库中的结果返回给前端。

**Why this priority**: 数据统一落库是快照模式与课堂留痕的底座。

**Independent Test**: 模拟调用任一AI服务,断言数据库新增快照记录,且API响应引用该记录。

**Acceptance Scenarios**:
- **Given** 教师触发案例解析AI, **When** AI返回结果, **Then** 系统在`teaching_session_snapshots`表创建Act1快照并返回快照ID
- **Given** PPT生成AI完成输出, **When** API准备响应, **Then** 系统先更新Act4快照并记录`source_service`与`version_tag`
- **Given** 数据库写入失败, **When** AI返回内容, **Then** API必须返回错误且不把未落库的数据透传给前端
- **Given** 多个AI服务并发写入同一会话, **When** 快照生成, **Then** 每次写入都有独立版本戳,后端可追踪来源

---

### User Story 2 - 教师复习/课堂展示 (Priority: P1)

教师在课程中心点击“学习案例”进入复习模式时,系统加载最新`classroom_ready`快照,除苏格拉底对话区外所有内容只读,用于课堂展示。

**Why this priority**: 课堂展示需要稳定快照,避免现场内容被误改。

**Independent Test**: 插入模拟快照后访问课堂入口,验证UI读取快照且禁用编辑。

**Acceptance Scenarios**:
- **Given** 四幕快照齐备, **When** 教师进入复习模式, **Then** 页面展示Act1/Act2/Act4快照内容并禁用编辑控件
- **Given** 快照带有PPT资源链接, **When** 教师点击课堂演示, **Then** 系统加载快照内的PPT版本而非即时调用AI
- **Given** 教师试图修改Act2文本, **When** 模式为复习, **Then** 系统阻止写入并提示“只读快照”
- **Given** 快照缺失必填字段, **When** 前端渲染, **Then** 系统显示占位提示并产生数据完整性告警

---

### User Story 3 - 苏格拉底对话实时+持久化 (Priority: P1)

苏格拉底对话保持实时交互体验,但每轮问答在消息推送给前端前必须落库,形成可回放的对话流水。

**Why this priority**: 既要实时互动,又要满足教学留痕。

**Independent Test**: 通过SSE/WebSocket模拟对话,断言每条消息写库并可回放。

**Acceptance Scenarios**:
- **Given** 对话生成一条消息, **When** 准备推送前端, **Then** 系统写入`teaching_session_dialogues`并附`turn_index`
- **Given** 教师刷新页面重连, **When** 请求对话历史, **Then** API返回数据库中完整对话流水
- **Given** 对话被课堂锁定, **When** 教师尝试删除历史消息, **Then** 系统拒绝并提示已锁定
- **Given** 对话写库失败, **When** 检测到异常, **Then** 服务终止推送该轮消息并返回错误

---

### User Story 4 - 快照版本与课堂回放 (Priority: P2)

系统允许同一教学会话生成多个快照版本(初稿、课堂版、回放版),课堂默认使用最近一次`classroom_ready`版本,历史版本用于回放或模板沉淀。

**Why this priority**: 支撑课堂复盘与差异化教案,但可在核心流程稳定后实现。

**Independent Test**: 创建多版本快照,验证版本切换、回滚与锁定策略。

**Acceptance Scenarios**:
- **Given** 新快照标记为课堂版, **When** 课堂入口请求, **Then** 返回最新`classroom_ready=true`的版本
- **Given** 教师选择回放历史课堂, **When** 指定版本号, **Then** 系统加载对应快照且不影响当前课堂版
- **Given** 版本生成失败, **When** 检测异常, **Then** 保留旧课堂版并记录错误日志
- **Given** 教师尝试编辑已归档版本, **When** 状态为`locked`, **Then** 系统阻止并提示仅限查看

---

## Functional Requirements *(mandatory)*

- **FR-001 SnapshotEnvelope**: 快照顶层对象,含`session_id`, `version_id`, `version_tag`, `classroom_ready`, `locked_at`, `source_service`, `payload`. 所有API返回快照封装对象。
- **FR-002 ActSnapshots**: `act1_case_snapshot`, `act2_analysis_snapshot`, `act3_dialogue_snapshot`, `act4_summary_snapshot`继续使用JSONB,但Act1/Act2/Act4在`classroom_ready=true`时强制只读。
- **FR-003 DialogueStream**: Act3快照仅保存聚合信息,对话明细保存在`teaching_session_dialogues`子表,通过`turn_index`和`chunk_index`支撑流式落库。
- **FR-004 Pipeline Hook**: 所有AI调用通过统一的`SnapshotWriter`中间层先写库,再把数据库记录透传给API层。
- **FR-005 Read API**: 前端调用`GET /api/teaching-sessions/:id/snapshot`获取最新课堂版,列表接口默认过滤`deleted_at`非空记录。
- **FR-006 Locking Strategy**: 当版本标记`classroom_ready`时自动填充`locked_at`与`locked_by`, UI阻止编辑; 解锁需后台审批(不在本期实现)。
- **FR-007 Audit Trail**: 快照和对话记录都包含`source_service`, `request_id`, `trace_id`等字段,用于链路追踪。
- **FR-008 Version Lifecycle**: 支持`draft`, `ready_for_class`, `classroom_ready`, `archived`四种版本状态; 课堂入口仅可访问`classroom_ready`。
- **FR-009 Consistency Check**: API需在返回快照前执行Schema校验,缺失字段返回结构化错误码供前端兜底。
- **FR-010 PPT Delivery**: Act4快照必须包含`ppt_asset_id`或`ppt_download_url`,课堂展示直接引用,禁止绕过数据库调用AI。

## Success Criteria *(mandatory)*

- **SC-001**: 任一AI服务链路(生成→写库→返回)耗时≤2s,且响应体数据来自数据库。
- **SC-002**: 课堂复习入口在3s内加载最新`classroom_ready`快照。
- **SC-003**: 苏格拉底对话流水在消息发送后500ms内写库成功率≥99%。
- **SC-004**: 单会话至少保留5个快照版本,任一版本查询耗时<1.5s。
- **SC-005**: 对话回放接口支持100轮对话,加载时间<2s。
- **SC-006**: 复习模式对Act1/Act2/Act4的编辑拦截率100%。
- **SC-007**: 快照审计字段(`source_service`, `request_id`)填充率100%。
- **SC-008**: Schema升级后旧版本快照课堂展示成功率100%。

## Assumptions *(mandatory)*

- PostgreSQL是唯一事实来源; `PostgreSQLTeachingSessionRepository`统一负责读写。
- 前端不会直接消费AI响应,只能通过快照API取数。
- 苏格拉底对话使用SSE/WebSocket推送,但写库操作在服务端完成。
- 快照JSONB允许新增元数据字段(`version_tag`, `classroom_ready`, `locked_at`, `source_service`等)。
- Act1/Act2/Act4在课堂版生成后锁定只读; 解锁流程另行定义(非本期)。
- 用户身份体系可提供`user_id`与`organization_id`,支持多组织隔离。
- 快照体积≤5MB; 超出时需拆分到子表(后续迭代)。
- 软删除策略保留,课堂展示默认过滤`deleted_at IS NULL`。
- 自动保存由后台AI管线触发,前端不提交原始编辑数据。

## Dependencies *(optional)*

- `SnapshotSchemas.ts`提供四幕数据校验,需扩展版本/锁定字段。
- `PostgreSQLTeachingSessionRepository`扩展写库钩子与版本查询。
- `teaching_session_dialogues`新建或扩展表以支撑高频写入。
- 前端Zustand store需适配只读视图与实时对话并存。
- 日志/追踪中间件提供`request_id`与链路追踪。

## Out of Scope *(optional)*

- 课堂版快照的图形化编辑工具。
- Prompt与模型策略的管理与调优。
- 快照Diff视图或版本对比。
- 组织级共享、协同编辑功能。
- 自动生成课堂笔记的知识库同步。
- 数据库物理归档与备份策略。

## Notes *(optional)*

- 需为AI服务增加`SnapshotWriter`包装器,保证写库后再响应。
- 对话流水建议单表维护,快照内仅保留摘要以减少读负载。
- 课堂版快照在计划阶段需定义`classroom_ready`发布流程。
- `schemaVersion`表示主快照结构版本; `dataVersion`记录数据模型细更。
- 前端需在UI层增加只读防护,避免误改课堂快照。
