# Implementation Plan: 教学会话快照系统

**Branch**: `001-teaching-session-storage` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)

本计划依据快照优先架构,将四幕教学的全部AI产出写入PostgreSQL,前端以只读快照驱动课堂展示,苏格拉底对话保持实时交互且全量留痕。

## Summary

目标是把现有“可编辑会话”流程改造成“快照驱动”的课堂模式:
1. 所有AI服务统一经过`SnapshotWriter`中间层落库后再响应。
2. 快照增加版本、锁定、课堂标记等元数据,前端通过快照API只读展示。
3. 苏格拉底对话拆分为实时流+数据库流水,支持回放。
4. 课堂版快照可版本化与标记,支撑复习/课堂演示体验。

## Technical Context

- **Language/Framework**: TypeScript 5, Next.js 15 App Router, React 19
- **Key Libraries**: `pg@8`, `zod@3`, `zustand@5`, `uuid@12`
- **Storage**: PostgreSQL + JSONB快照; 新增`teaching_session_snapshots`与`teaching_session_dialogues`
- **Observability**: 日志需记录`request_id`/`trace_id`以追踪AI写库链路
- **Performance Targets**: AI写库链路≤2s, 课堂快照加载≤3s, 对话落库≤500ms

## Roadmap

### Phase 0 — 现状盘点 & 架构对齐
- 审核现有API(`app/api/teaching-sessions/*`)和Repository实现,确认写入路径。
- 梳理使用AI的服务(案例解析、PPT生成、复盘等),列出需要接入写库钩子的调用点。
- 设计新的数据库结构: 快照主表、对话子表、版本字段、审计字段。

### Phase 1 — 数据与后端改造
- 建表/迁移: 创建`teaching_session_snapshots`(或扩展现有表)与`teaching_session_dialogues`,补充索引。
- 实现`SnapshotWriter`模块,封装“写库→读取→响应”逻辑,并接入各AI服务。
- 扩展`PostgreSQLTeachingSessionRepository`: 支持版本标签、课堂标记、只读锁定、审计字段。
- 更新Zod Schema: 加入`versionTag`, `classroomReady`, `lockedAt`, `sourceService`, `requestId`等字段。
- 开发课堂快照读取API: `GET /api/teaching-sessions/:id/snapshot`, 默认返回最新`classroom_ready`版本。
- 扩展苏格拉底对话API: 消息流推送同时调用Repository写入流水。

### Phase 2 — 前端适配
- 改造Zustand store: 快照加载→只读呈现, 对话区仍保持实时更新。
- UI控制: 课堂模式禁用Act1/Act2/Act4编辑、显示只读提示,提供历史版本列表与回放入口。
- PPT演示入口改为使用快照中的资源ID/URL,取消直接调用AI的逻辑。

### Phase 3 — 版本管理 & 回放
- 增加版本发布流程: `draft → ready_for_class → classroom_ready → archived`状态切换API。
- 历史版本查询与切换: `GET /api/teaching-sessions/:id/versions`, 支持指定version_id加载。
- 对话回放: 根据`turn_index`顺序加载,UI支持课堂回放模式。

### Phase 4 — 测试与验证
- 单元测试: SnapshotWriter写库, Repository版本查询, Zod校验。
- 集成测试: AI服务调用→写库→响应全链路; 课堂快照读取; 对话实时写入。
- 性能测试: 并发AI调用写库、课堂快照加载、对话流水回放。
- 验收回归: 按Spec中的Acceptance Scenarios执行脚本。

## Deliverables

- 数据库迁移脚本与回滚脚本
- `SnapshotWriter`模块与接入文档
- 更新后的API文档(OpenAPI同步)
- 改造后的前端课堂模式与版本切换界面
- 自动化测试覆盖(单测/集测/回放脚本)
- 操作手册: 如何发布课堂版快照、如何回溯历史版本

## Risks & Mitigations

- **并发写入冲突**: 使用版本戳与事务控制,必要时引入悲观锁。
- **实时对话延迟**: 写库前置可能增加延迟,需优化连接池与批量写策略。
- **前端只读切换遗漏**: 增加特性开关与E2E测试确保禁用状态可靠。
- **历史数据迁移**: 需编制迁移脚本,把旧会话转换为快照格式并标记默认版本。

## Definition of Done

- 所有AI调用都经过写库后返回,日志可追踪`request_id`.
- 课堂复习入口仅依赖快照API,Act1/Act2/Act4界面只读。
- 苏格拉底对话支持实时对话+数据库回放,课堂回放无数据缺失。
- 至少一个课程案例完整走通: 解析→快照→课堂展示→PPT播放→对话回放。
- 文档更新: Spec、Quickstart、Data Model与OpenAPI保持一致。
