# PPT生成器 - 快速开始指南

> 本文档指导如何验证和使用302.ai PPT生成功能

---

## 📋 阶段一：API验证 (预计耗时: 30分钟)

### 1️⃣ 注册302.ai账号并获取API Key

1. 访问 [302.ai官网](https://302.ai/)
2. 注册账号并登录
3. 进入"API管理"页面
4. 创建新的API Key并保存

**重要**:
- 新用户通常有免费额度
- API Key格式类似: `sk-302ai-xxxxxxxxxxxxx`
- 保管好API Key,不要泄露

### 2️⃣ 配置环境变量

```bash
# 方法1: 临时设置(当前终端会话有效)
export AI_302_API_KEY=your-api-key-here

# 方法2: 添加到 .env.local 文件(推荐)
echo "AI_302_API_KEY=your-api-key-here" >> .env.local
```

### 3️⃣ 运行验证脚本

```bash
# 确保在项目根目录
cd /home/yejh0725/law-education-platform-z1

# 执行验证脚本
node test-302ai-ppt.js
```

### 4️⃣ 查看结果

脚本会输出:
- ✅ API调用是否成功
- 📊 生成的PPT下载链接
- ⏱️ 生成耗时
- 📝 后续行动建议

**示例输出**:
```
🚀 302.ai PPT生成API验证开始

============================================================
✅ API Key已配置 (前8位: sk-302ai****)
============================================================

📤 [API请求]
  URL: https://api.302.ai/302/ppt/directgeneratepptx
  Method: POST
  Content Length: 723 bytes
  Title: 法学AI教学系统 - 民间借贷案例分析
  Language: zh
  Model: gpt-4o-mini

📥 [API响应]
  Status Code: 200
  Status Message: OK
  Duration: 28456ms

✅ [生成成功]
  PPT URL: https://302.ai/downloads/xxx.pptx
  File Size: 2.3MB
  Slides: 15

📊 [质量评估]
  生成速度: 待人工确认 (目标: < 40秒)
  设计质量: 待人工确认 (目标: ≥ 7/10)
  内容准确度: 待人工确认 (目标: ≥ 9/10)
  成本估算: 待人工确认 (目标: < ¥1/次)
  URL有效性: ✅ 提供了下载链接
```

### 5️⃣ 质量评估

下载生成的PPT后,根据以下标准评估:

| 评估维度 | 目标 | 实际结果 | 是否通过 |
|---------|------|---------|---------|
| 生成速度 | < 40秒 | _____ 秒 | ⬜ |
| 设计质量 | ≥ 7/10 | _____ /10 | ⬜ |
| 内容准确度 | ≥ 9/10 | _____ /10 | ⬜ |
| 单次成本 | < ¥1 | ¥_____ | ⬜ |

**判断标准**:
- ✅ **4项全部通过** → 继续使用302.ai,进入阶段二
- ⚠️ **部分通过** → 调整参数重新测试
- ❌ **多项不通过** → 切换到Gamma API备选方案

---

## 📋 阶段二：集成到项目 (预计耗时: 2-3天)

### 技术架构

```
┌─────────────────────────────────────────────────────┐
│  用户操作: 点击"生成PPT"按钮                          │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│  PptGeneratorService.generate()                     │
│  ├─ 1. 从useTeachingStore读取数据                   │
│  │    • uploadData.extractedElements (第一幕)      │
│  │    • analysisData.result (第二幕)               │
│  │    • socraticData (第三幕)                       │
│  │    • summaryData.caseLearningReport (第四幕)    │
│  ├─ 2. 调用AI生成PPT大纲 (DeepSeek)                 │
│  ├─ 3. 调用302.ai API生成PPT                        │
│  └─ 4. 返回下载链接                                  │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│  UI展示: 下载按钮 + 预览链接                          │
└─────────────────────────────────────────────────────┘
```

### 实现步骤

#### 1. 创建PPT生成服务

文件: `src/domains/teaching-acts/services/PptGeneratorService.ts`

```typescript
/**
 * PPT生成服务
 * 负责收集数据并调用302.ai API生成PPT
 */

import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';
import { useTeachingStore } from '../stores/useTeachingStore';

export class PptGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://api.302.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 生成教育局版PPT
   */
  async generateEducationBureauPPT(): Promise<PptResult> {
    // 1. 收集数据
    const data = this.collectData();

    // 2. AI生成大纲
    const outline = await this.generateOutline(data, 'education-bureau');

    // 3. 调用302.ai生成PPT
    const pptResult = await this.callPptApi(outline);

    return pptResult;
  }

  /**
   * 收集教学数据
   */
  private collectData() {
    const store = useTeachingStore.getState();

    return {
      // 第一幕：案例数据
      caseInfo: store.uploadData.extractedElements || {},

      // 第二幕：AI分析
      analysisResult: store.analysisData.result || {},

      // 第三幕：苏格拉底对话
      socraticLevel: store.socraticData.level,
      completedNodes: Array.from(store.socraticData.completedNodes),

      // 第四幕：学习报告
      learningReport: store.summaryData.caseLearningReport || {}
    };
  }

  /**
   * AI生成PPT大纲
   */
  private async generateOutline(data: any, template: string) {
    const systemPrompt = `你是一位专业的PPT设计师,擅长制作教育类演示文稿。`;

    const userPrompt = `基于以下法学案例教学数据,生成${template}版PPT大纲...`;

    const result = await callUnifiedAI(systemPrompt, userPrompt, {
      temperature: 0.5,
      maxTokens: 3000,
      responseFormat: 'json'
    });

    return result;
  }

  /**
   * 调用302.ai API
   */
  private async callPptApi(outline: any): Promise<PptResult> {
    const response = await fetch(`${this.baseUrl}/302/ppt/directgeneratepptx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: JSON.stringify(outline),
        title: '法学AI教学系统 - 案例分析报告',
        language: 'zh',
        model: 'gpt-4o-mini'
      })
    });

    if (!response.ok) {
      throw new Error(`PPT生成失败: ${response.status}`);
    }

    const data = await response.json();
    return {
      url: data.data?.url || data.url,
      size: data.data?.size,
      slides: data.data?.slides
    };
  }
}

export interface PptResult {
  url: string;
  size?: string;
  slides?: number;
}
```

#### 2. 在第四幕添加"生成PPT"按钮

文件: `components/acts/Summary.tsx` (或相应的总结页面组件)

```tsx
'use client';

import { useState } from 'react';
import { PptGeneratorService } from '@/src/domains/teaching-acts/services/PptGeneratorService';
import { Button } from '@/components/ui/button';

export function Summary() {
  const [generating, setGenerating] = useState(false);
  const [pptUrl, setPptUrl] = useState<string | null>(null);

  const handleGeneratePPT = async () => {
    setGenerating(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_AI_302_API_KEY!;
      const service = new PptGeneratorService(apiKey);

      const result = await service.generateEducationBureauPPT();
      setPptUrl(result.url);

      // 可选: 自动下载
      window.open(result.url, '_blank');
    } catch (error) {
      console.error('生成PPT失败:', error);
      alert('生成PPT失败,请重试');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* 现有的学习报告展示 */}

      <div className="mt-8">
        <Button
          onClick={handleGeneratePPT}
          disabled={generating}
          size="lg"
        >
          {generating ? '生成中...' : '📊 生成教学PPT'}
        </Button>

        {pptUrl && (
          <div className="mt-4">
            <a
              href={pptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              点击下载PPT
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 3. 配置环境变量

在 `.env.local` 添加:

```bash
NEXT_PUBLIC_AI_302_API_KEY=your-api-key-here
```

---

## 🔧 调试和测试

### 查看日志

在浏览器控制台查看:
- 数据收集情况
- AI大纲生成结果
- API调用响应
- 错误信息

### 常见问题

**Q: API调用返回401错误**
A: 检查API Key是否正确配置

**Q: 生成时间过长(>60秒)**
A: 检查网络连接,考虑使用异步轮询方式

**Q: 生成的PPT质量不佳**
A: 调整AI大纲生成的Prompt,优化内容结构

**Q: 成本过高**
A: 优化输入内容长度,使用更经济的模型

---

## 📊 性能监控

建议记录以下指标:

| 指标 | 目标值 | 实际值 | 备注 |
|-----|-------|-------|------|
| 数据收集耗时 | < 0.1秒 | _____ | 从Store读取 |
| AI生成大纲耗时 | < 8秒 | _____ | DeepSeek调用 |
| PPT渲染耗时 | < 30秒 | _____ | 302.ai API |
| 总耗时 | < 40秒 | _____ | 端到端 |
| 单次成本 | < ¥1 | ¥_____ | API费用 |

---

## 📚 参考资料

- [302.ai API文档](https://doc.302.ai/6641028m0)
- [PPT生成器技术方案](/home/yejh0725/law-education-platform-z1/PPT_GENERATOR_DESIGN.md)
- [项目架构文档](/home/yejh0725/law-education-platform-z1/docs/ARCHITECTURE_FOR_EDUCATION_BUREAU.md)

---

## 🎯 下一步行动

1. ⬜ 完成阶段一API验证
2. ⬜ 根据验证结果决定是否使用302.ai
3. ⬜ 实现PptGeneratorService
4. ⬜ 集成到第四幕UI
5. ⬜ 端到端测试
6. ⬜ 性能优化
7. ⬜ 用户培训

---

**文档状态**: ✅ 已完成
**最后更新**: 2025-10-13
