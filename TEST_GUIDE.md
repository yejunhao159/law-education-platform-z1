# 🎯 判决书三要素提取测试指南

## 系统架构

```
law-education-platform/
├── lib/
│   ├── legal-parser.ts       # 规则引擎（正则提取）
│   └── ai-legal-agent.ts     # AI智能体（深度分析）
├── app/
│   └── api/
│       └── extract-elements/ # API接口
├── components/
│   └── FileUploader.tsx      # 上传组件（已集成AI）
├── scripts/
│   └── batch-test.ts        # 批量测试脚本
├── test-documents/          # 放置判决书（需创建）
└── test-results/            # 测试结果输出
```

## 🚀 快速开始

### 1. 准备200份判决书

将你的判决书文件放在 `test-documents/` 目录下：

```bash
# 支持的格式
- .txt  (纯文本)
- .md   (Markdown)
- .pdf  (需要额外配置)
- .docx (需要额外配置)
```

### 2. 运行批量测试

```bash
# 安装依赖（如果还没有）
npm install

# 运行批量测试
npm run test:batch
```

### 3. 查看测试结果

测试完成后，结果会保存在 `test-results/` 目录：

- `results-[timestamp].json` - 详细测试数据
- `report-[timestamp].md` - 测试报告
- `details/` - 每个文件的详细分析结果

## 📊 测试指标

### 规则引擎评估
- ✅ 基本信息提取（案号、法院、日期）
- ✅ 案件事实提取
- ✅ 法律依据提取
- ✅ 裁判理由提取

### AI增强评估
- 🤖 时间线重构
- 🤖 证据链分析
- 🤖 逻辑推理链
- 🤖 置信度评分

## 🔧 配置选项

编辑 `scripts/batch-test.ts` 中的配置：

```typescript
const CONFIG = {
  inputDir: './test-documents',    // 输入目录
  outputDir: './test-results',     // 输出目录
  maxConcurrent: 5,                // 并发数
  useAI: true,                     // 是否使用AI
  saveDetails: true,               // 保存详细结果
  generateReport: true,            // 生成报告
};
```

## 🌐 Web界面使用

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 功能特点
1. **拖拽上传** - 支持拖拽判决书文件
2. **实时预览** - 立即显示提取结果
3. **AI增强开关** - 可选择是否使用AI
4. **三要素展示** - 清晰显示提取的三要素

## 🤖 AI配置（可选）

如果要使用AI增强功能，需要配置OpenAI API：

### 方法1：环境变量
创建 `.env.local` 文件：
```
OPENAI_API_KEY=your-api-key-here
```

### 方法2：代码配置
在 `lib/ai-legal-agent.ts` 中直接设置：
```typescript
const aiAgent = new LegalAIAgent('your-api-key');
```

## 📈 预期效果

基于Andrew Ng的数据中心AI理念：

### 第一阶段（当前）
- 规则引擎准确率：60-70%
- AI增强准确率：80-85%
- 处理速度：1-2秒/份

### 第二阶段（200份标注后）
- 通过200份判决书的测试反馈
- 优化提示词模板
- 提升到90%+准确率

### 第三阶段（持续优化）
- 建立法律知识图谱
- 案例相似度匹配
- 争议焦点自动识别

## ❓ 常见问题

### Q: PDF/DOCX文件无法解析？
A: 需要安装额外依赖：
```bash
npm install pdfjs-dist mammoth
```

### Q: AI分析失败？
A: 检查：
1. API密钥是否配置
2. 网络连接是否正常
3. 查看控制台错误信息

### Q: 如何提高准确率？
A: 基于测试结果：
1. 优化正则表达式（`lib/legal-parser.ts`）
2. 改进AI提示词（`lib/ai-legal-agent.ts`）
3. 收集更多标注数据

## 💡 Andrew Ng的建议

> "200份高质量标注的判决书，比10000份未标注的更有价值！"

### 标注建议
1. **事实部分** - 标注关键时间点、人物、行为
2. **证据部分** - 标注证据类型、证明力、关联性
3. **说理部分** - 标注法律适用、逻辑链条、结论

### 迭代策略
1. 先跑完200份测试
2. 分析错误案例
3. 针对性优化
4. 重新测试验证

## 📞 技术支持

如有问题，请检查：
- 控制台错误信息
- `test-results/` 中的日志
- 网络和API配置

---

*"The best way to learn is to build something!"* - Andrew Ng