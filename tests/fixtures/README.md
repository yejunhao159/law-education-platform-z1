# 测试数据说明

## 测试文档准备

### test-judgment.docx
需要准备一个真实的判决书文档（Word格式），包含以下关键部分：

**必须包含的部分**：
- ✅ 案件基本信息（案号、法院、当事人）
- ✅ "经审理查明"部分（事实认定）
- ✅ "本院认为"部分（reasoning）
- ✅ 证据列表

**文档来源**：
1. 从中国裁判文书网下载一个真实案例
2. 转换为Word格式
3. 确保文档大小 < 5MB
4. 放在 `tests/fixtures/test-judgment.docx`

**推荐案例类型**：
- 简单民事合同纠纷案（方便测试）
- 篇幅适中（2000-5000字）
- 事实清晰、证据明确

## 快速准备测试数据

```bash
# 方式1：从裁判文书网下载
# 访问：https://wenshu.court.gov.cn/
# 搜索"买卖合同纠纷"，选一个简单案例下载

# 方式2：使用项目已有的测试案例（如果有）
cp /path/to/existing/test-case.docx tests/fixtures/test-judgment.docx
```

## 其他测试数据

### test-judgment.pdf
PDF版本的判决书，用于测试PDF解析功能。

### test-judgment-malformed.docx
格式错误的文档，用于测试错误处理。
