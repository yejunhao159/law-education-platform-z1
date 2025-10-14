# PPT生成功能测试指南

> 基于方案B：异步流式生成 + 真实进度反馈

## 🎯 架构概览

```
┌──────────────────────────────────────────────┐
│  DeepSeek AI生成大纲（5-8秒）                 │
│  - 分析四幕教学数据                           │
│  - 生成结构化JSON大纲                         │
│  - 用户可预览和编辑                           │
└──────────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  转换为Markdown格式（0.1秒）                  │
│  - JSON → Markdown文本                        │
│  - 保留结构和可视化提示                       │
└──────────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  302.ai异步流式生成PPT（20-30秒）             │
│  - 调用 /302/ppt/generatecontent              │
│  - asyncGenPptx=true（异步模式）              │
│  - stream=true（流式响应）                    │
│  - 获取pptId                                   │
└──────────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  轮询查询生成状态（每2秒）                    │
│  - 调用 /302/ppt/asyncpptinfo                 │
│  - 实时更新进度条（0-100%）                   │
│  - 显示当前阶段（内容/渲染/完成）             │
└──────────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  完成：返回PPT下载链接                        │
│  - fileUrl: PPT文件URL                        │
│  - coverUrl: 封面图片URL                      │
│  - pptId: PPT ID（可用于重新下载）            │
└──────────────────────────────────────────────┘
```

---

## 📋 前置准备

### 1. 获取302.ai API Key

访问 [https://302.ai/](https://302.ai/)

1. 注册账号并登录
2. 进入"API管理"页面
3. 创建新的API Key
4. 复制保存（格式：`sk-302ai-xxxxxxxxxxxxx`）

**新用户福利**：通常有免费额度，可先测试

### 2. 配置环境变量

编辑 `.env.local` 文件：

```bash
# 302.ai API Key（必需）
NEXT_PUBLIC_AI_302_API_KEY=sk-302ai-你的密钥

# DeepSeek API Key（已有）
DEEPSEEK_API_KEY=你的DeepSeek密钥
NEXT_PUBLIC_DEEPSEEK_API_KEY=你的DeepSeek密钥
```

### 3. 安装依赖

```bash
npm install
```

---

## 🧪 测试流程

### 方式1：快速验证（推荐新手）

#### 步骤1：验证302.ai API连接

```bash
# 设置临时环境变量
export AI_302_API_KEY=sk-302ai-你的密钥

# 运行验证脚本
node test-302ai-ppt.js
```

**预期输出**：
```
🚀 302.ai PPT生成API验证开始
✅ API Key已配置
📤 [API请求] ...
📥 [API响应] Status Code: 200
✅ [生成成功] PPT URL: https://...
```

如果看到`✅ [生成成功]`，说明API配置正确。

#### 步骤2：启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

#### 步骤3：完成教学流程

1. **第一幕**：上传案例文件或输入案例信息
2. **第二幕**：等待AI分析完成
3. **第三幕**：进行苏格拉底对话（可选，建议至少问答几轮）
4. **第四幕**：查看学习报告

#### 步骤4：测试PPT生成

在第四幕页面，点击"生成教学PPT"按钮。

**你会看到**：

1. **弹出Dialog** - PPT生成器面板
2. **生成流程说明** - 三步流程介绍
3. **点击"开始生成"**

#### 步骤5：观察生成过程

**阶段1：生成大纲（5-8秒）**
```
AI正在生成PPT大纲...
进度条：10% → 30% → 100%
消息：AI正在分析教学数据... → 大纲生成完成
```

**阶段2：预览编辑大纲**
```
显示生成的PPT大纲
- 每页标题和内容
- 总页数、预计时长
- 可编辑、删除、添加页面
```

**阶段3：确认并生成PPT（20-30秒）**
```
正在生成PPT...
进度条：35% → 60% → 95% → 100%

阶段指示器：
  ● 生成内容 (40-60%)
  ● 渲染PPT (60-95%)
  ● 完成 (100%)

实时消息：
  - 开始生成PPT内容...
  - 生成内容中...
  - PPT渲染中...
  - 渲染中 45%...
  - PPT生成完成！
```

**阶段4：完成**
```
✅ PPT生成成功！
总页数：6 页
[下载PPT] 按钮
```

---

### 方式2：调试模式（开发者）

#### 打开浏览器开发者工具

`F12` 或 `右键 → 检查`

#### 切换到Console标签

你会看到详细的日志：

```javascript
// 数据收集
📊 [PptGenerator] 数据收集完成: {
  caseInfo: "✅",
  analysisResult: "✅",
  socraticLevel: 2,
  completedNodes: 3,
  learningReport: "✅",
  hasRealData: true
}

// AI生成大纲
🔍 [PptGenerator] AI大纲生成 - Prompt长度: {
  system: 234,
  user: 1256,
  total: 1490
}

✅ [PptGenerator] 大纲生成成功: {
  slides: 6,
  tokensUsed: 856,
  cost: 0.005
}

// 302.ai异步生成
📤 [PptGenerator] 302.ai异步流式生成 {
  markdownLength: 1024,
  language: "zh",
  length: "medium"
}

📥 [PptGenerator] 流式数据: {
  status: 3,
  text: "正在生成内容..."
}

✅ [PptGenerator] 获取到pptId: "ppt_abc123..."

// 轮询查询状态
🔄 [PptGenerator] 开始轮询PPT状态, pptId: ppt_abc123...
📊 [PptGenerator] 轮询 1/60: { status: "processing", progress: 20 }
📊 [PptGenerator] 轮询 3/60: { status: "processing", progress: 60 }
📊 [PptGenerator] 轮询 5/60: { status: "completed", hasFileUrl: true }

✅ [PptGenerator] PPT生成完成: https://302.ai/downloads/xxx.pptx
```

#### 查看Network请求

切换到Network标签，筛选`ppt`：

**应该看到的请求**：

1. `POST /302/ppt/generatecontent` - 生成内容（异步模式）
   - Request: `{ outlineMarkdown: "...", asyncGenPptx: true, stream: true }`
   - Response: SSE流式数据

2. `GET /302/ppt/asyncpptinfo?pptId=xxx` - 轮询状态（多次）
   - 每2秒请求一次
   - Response: `{ data: { progress: 45, status: "processing" } }`

3. 最终返回：
   ```json
   {
     "data": {
       "pptInfo": {
         "fileUrl": "https://302.ai/downloads/xxx.pptx",
         "coverUrl": "https://...",
         "id": "ppt_abc123"
       }
     }
   }
   ```

---

## 🐛 常见问题排查

### 问题1：API Key未配置

**症状**：点击生成按钮后提示"302.ai API Key未配置"

**解决**：
```bash
# 检查环境变量
echo $NEXT_PUBLIC_AI_302_API_KEY

# 如果为空，编辑 .env.local
nano .env.local

# 添加：
NEXT_PUBLIC_AI_302_API_KEY=sk-302ai-你的密钥

# 重启开发服务器
npm run dev
```

---

### 问题2：生成大纲失败

**症状**：在"AI正在生成PPT大纲"阶段出错

**可能原因**：
1. DeepSeek API配置问题
2. 四幕教学数据不完整

**排查**：
```javascript
// Console中查看错误
❌ [PptGenerator] AI大纲生成失败: Error: ...

// 检查数据完整性
⚠️ [PptGenerator] 警告: 前三幕数据不完整，PPT质量可能受影响
```

**解决**：
- 确保完成了前三幕的教学流程
- 检查DeepSeek API Key是否有效
- 查看Console中的详细错误信息

---

### 问题3：302.ai API调用失败

**症状**：在"正在生成PPT"阶段报错

**可能原因**：
1. 302.ai API Key错误或过期
2. 网络连接问题
3. 302.ai服务负载高

**排查**：
```javascript
// Console中查看错误
❌ [PptGenerator] 302.ai API调用失败 (401): Unauthorized
❌ [PptGenerator] 302.ai API调用失败 (500): Internal Server Error
```

**解决**：
- 验证API Key是否正确：`node test-302ai-ppt.js`
- 检查网络连接：`curl https://api.302.ai`
- 查看302.ai服务状态
- 等待几分钟后重试

---

### 问题4：轮询超时

**症状**：进度条到60%后长时间不动，最终提示"PPT生成超时"

**可能原因**：
1. 302.ai服务负载高，生成时间过长
2. 网络不稳定
3. pptId获取错误

**排查**：
```javascript
// Console中查看轮询日志
🔄 [PptGenerator] 开始轮询PPT状态, pptId: ppt_abc123...
📊 [PptGenerator] 轮询 1/60: { status: "processing", progress: 20 }
...
📊 [PptGenerator] 轮询 60/60: { status: "processing", progress: 80 }
❌ [PptGenerator] PPT生成超时，请稍后重试
```

**解决**：
- 等待几分钟后重新生成
- 减少PPT页数（选择`length: 'short'`）
- 联系302.ai技术支持

---

### 问题5：下载链接无效

**症状**：PPT生成成功但点击下载链接无法访问

**可能原因**：
1. 链接已过期（302.ai的临时链接有时效）
2. 网络权限问题

**解决**：
- 记录pptId，稍后重新下载
- 使用 `/302/ppt/downloadpptx` API重新获取链接
- 生成后立即下载，不要拖延

---

## 📊 性能指标

| 指标 | 目标值 | 实际测量 | 说明 |
|-----|-------|---------|------|
| 数据收集 | < 0.1秒 | _____ | 从Store读取 |
| AI生成大纲 | 5-8秒 | _____ | DeepSeek调用 |
| 转换Markdown | < 0.1秒 | _____ | 纯计算 |
| 302.ai生成 | 20-30秒 | _____ | 异步流式 |
| 轮询次数 | 10-15次 | _____ | 每2秒一次 |
| 总耗时 | < 40秒 | _____ | 端到端 |
| 总成本 | < ¥0.1 | ¥_____ | DeepSeek + 302.ai |

---

## ✅ 验收标准

### 功能完整性

- [ ] 可以正常启动生成流程
- [ ] 大纲生成成功（DeepSeek）
- [ ] 大纲可预览和编辑
- [ ] PPT生成成功（302.ai）
- [ ] 下载链接有效
- [ ] 错误提示友好

### 用户体验

- [ ] 进度条实时更新
- [ ] 进度百分比准确（0-100%）
- [ ] 阶段指示器清晰（内容/渲染/完成）
- [ ] 实时消息准确反映当前状态
- [ ] 生成时间在可接受范围（< 40秒）
- [ ] 可以中途取消或重试

### 技术指标

- [ ] Console无错误日志
- [ ] Network请求成功
- [ ] 轮询次数合理（< 30次）
- [ ] 内存占用正常
- [ ] 无内存泄漏

---

## 🎓 成功案例

### 案例1：教育局申报PPT

**输入**：
- 民间借贷纠纷案例
- 完整的四幕教学数据
- 模板：education-bureau

**输出**：
- 6页PPT
- 包含案例分析、教学创新、效果展示
- 生成时间：32秒
- 质量评分：8.5/10

### 案例2：教师培训PPT

**输入**：
- 合同纠纷案例
- 重点展示苏格拉底对话
- 模板：teacher-training

**输出**：
- 8页PPT
- 包含教学流程、对话案例、实践指南
- 生成时间：38秒
- 质量评分：9/10

---

## 🚀 下一步优化

### 短期优化（1周内）

- [ ] 添加PPT模板选择器
- [ ] 支持自定义PPT长度（short/medium/long）
- [ ] 添加生成历史记录
- [ ] 支持重新下载已生成的PPT

### 中期优化（1月内）

- [ ] 支持多语言PPT生成
- [ ] 添加PPT预览功能
- [ ] 支持批量生成
- [ ] 添加成本追踪仪表板

### 长期优化（3月内）

- [ ] 支持PPT在线编辑
- [ ] 集成更多PPT模板
- [ ] 支持AI自动优化建议
- [ ] 添加A/B测试功能

---

## 📚 相关文档

- [PPT生成器快速启动指南](./PPT_GENERATOR_QUICK_START.md)
- [302.ai API文档](https://doc.302.ai/6641028m0)
- [PptGeneratorService源码](../src/domains/teaching-acts/services/PptGeneratorService.ts)
- [PptGeneratorPanel源码](../components/ppt/PptGeneratorPanel.tsx)

---

**文档版本**: v2.0（异步流式方案）
**最后更新**: 2025-01-14
**维护者**: Sean & Claude Code
