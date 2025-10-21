# PPT生成流程图

## 方式1：简化版序列图（兼容性最好）

```mermaid
sequenceDiagram
    User->>UI: 点击生成教学PPT
    UI->>Service: generatePPT()

    Service->>Store: 读取四幕数据
    Store-->>Service: 返回数据

    Service->>DeepSeek: 生成PPT大纲
    DeepSeek-->>Service: JSON大纲
    Service->>UI: 进度30%

    UI->>User: 展示编辑器
    User->>UI: 确认大纲

    Service->>Service: 转为Markdown

    Service->>API302: 异步生成PPT
    API302-->>Service: 返回pptId
    Service->>UI: 进度40%

    loop 轮询
        Service->>API302: 查询状态
        API302-->>Service: 进度更新
        Service->>UI: 更新进度
    end

    Service->>API302: 获取下载链接
    API302-->>Service: fileUrl
    Service->>UI: 进度100%

    UI->>User: 显示下载按钮
```

---

## 方式2：流程图版本（更清晰）

```mermaid
graph TB
    Start([用户点击生成PPT]) --> Collect[收集四幕数据]

    Collect --> GenOutline[DeepSeek生成大纲<br/>5-8秒]
    GenOutline --> Progress1[进度: 30%]

    Progress1 --> ShowEditor[展示大纲编辑器]
    ShowEditor --> UserAction{用户操作}

    UserAction -->|编辑| EditOutline[修改大纲]
    UserAction -->|确认| Confirm[确认生成]
    EditOutline --> Confirm
    UserAction -->|取消| End1([取消])

    Confirm --> ToMarkdown[转换为Markdown<br/>0.1秒]
    ToMarkdown --> Progress2[进度: 35%]

    Progress2 --> CallAPI[调用302.ai API<br/>异步生成]
    CallAPI --> GetPptId[获取pptId]
    GetPptId --> Progress3[进度: 40%]

    Progress3 --> Poll[开始轮询]
    Poll --> CheckStatus{检查状态}

    CheckStatus -->|未完成| Wait[等待2秒]
    Wait --> Poll
    CheckStatus -->|完成| Progress4[进度: 95%]

    Progress4 --> Download[获取下载链接]
    Download --> Progress5[进度: 100%]
    Progress5 --> ShowButton[显示下载按钮]
    ShowButton --> End2([完成])

    style Start fill:#e1f5e1
    style End1 fill:#ffe1e1
    style End2 fill:#e1f5e1
    style GenOutline fill:#bbdefb
    style CallAPI fill:#c8e6c9
    style Poll fill:#fff9c4
```

---

## 方式3：阶段图版本（最简洁）

```mermaid
graph LR
    A[阶段1<br/>收集数据<br/>0.1秒] --> B[阶段2<br/>AI生成大纲<br/>5-8秒]
    B --> C[阶段3<br/>用户编辑<br/>可选]
    C --> D[阶段4<br/>转换Markdown<br/>0.1秒]
    D --> E[阶段5<br/>302.ai生成<br/>20-30秒]
    E --> F[阶段6<br/>完成下载]

    style A fill:#f9f9f9
    style B fill:#e3f2fd
    style C fill:#fff9c4
    style D fill:#f9f9f9
    style E fill:#e8f5e9
    style F fill:#e1f5e1
```

---

## 详细步骤说明

### 阶段1：数据收集（< 0.1秒）
```javascript
const data = {
  caseInfo: store.uploadData.extractedElements,      // 第一幕
  analysisResult: store.analysisData.result,         // 第二幕
  socraticLevel: store.socraticData.level,           // 第三幕
  learningReport: store.summaryData.caseLearningReport // 第四幕
};
```

### 阶段2：DeepSeek生成大纲（5-8秒）
```javascript
const outline = await callUnifiedAI(systemPrompt, userPrompt);
// 返回：{ slides: [...], metadata: {...} }
```

### 阶段3：用户编辑（可选）
- 修改标题和内容
- 添加/删除页面
- 调整顺序

### 阶段4：转换为Markdown（< 0.1秒）
```markdown
# 封面
内容...

## 第一页
内容...
```

### 阶段5：302.ai异步生成（20-30秒）
```javascript
// 1. 调用生成API
POST /302/ppt/generatecontent
// 2. 获取pptId
// 3. 轮询状态
GET /302/ppt/asyncpptinfo?pptId=xxx
// 4. 完成后获取下载链接
```

### 阶段6：完成
- 显示下载按钮
- 用户点击下载PPT文件

---

## 时间轴（总计35-40秒）

```
0秒  ━━ 点击生成
1秒  ━━ 数据收集完成
8秒  ━━ AI大纲生成完成 (进度30%)
10秒 ━━ 用户确认大纲
11秒 ━━ Markdown转换完成
12秒 ━━ 开始调用302.ai
15秒 ━━ 获取pptId，开始轮询 (进度40%)
25秒 ━━ 渲染进度50% (进度70%)
35秒 ━━ 渲染完成 (进度95%)
38秒 ━━ 获取下载链接 (进度100%)
40秒 ━━ 显示下载按钮
```

---

## 进度映射

| 阶段 | 时间 | 进度 | 消息 |
|------|------|------|------|
| 初始化 | 0-1秒 | 10% | 正在初始化... |
| AI生成大纲 | 1-8秒 | 10-30% | AI正在分析教学数据... |
| 用户编辑 | 8-10秒 | 30% | 请确认大纲 |
| 转换Markdown | 10-11秒 | 35% | 准备生成PPT... |
| 开始生成 | 11-15秒 | 35-40% | 开始生成PPT内容... |
| 渲染中 | 15-35秒 | 40-95% | 渲染中 3/6 页... |
| 获取链接 | 35-38秒 | 95-100% | 获取下载链接... |
| 完成 | 38秒+ | 100% | PPT生成完成！ |
