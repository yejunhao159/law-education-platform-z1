/**
 * PPT大纲生成Prompt构建器
 * 借鉴CaseSummaryPromptBuilder的成功架构
 *
 * 设计理念：
 * 1. 模块化组织（Identity + Philosophy + Standards + Visualization + Template）
 * 2. 质量标准明确（每种页面类型的具体要求）
 * 3. 可视化规范详细（图表类型、数据结构、使用场景）
 * 4. 模板差异化（不同受众的设计调整）
 */

import type { PptKeyElements } from '../PptContentExtractor';

export type PptTemplate =
  | 'education-bureau'    // 教育局申报
  | 'teacher-training'    // 教师培训
  | 'school-leadership'   // 学校领导汇报
  | 'parent-meeting'      // 家长会展示
  | 'academic-conference' // 学术会议
  | 'technical';          // 技术评审

export interface PptPromptOptions {
  template: PptTemplate;
  style?: 'formal' | 'modern' | 'academic';
  length?: 'short' | 'medium' | 'long';
  includeDialogue?: boolean;
  keyElements: PptKeyElements;
  studyDuration?: number;
}

export class PptPromptBuilder {
  /**
   * 构建完整的System Prompt
   */
  buildSystemPrompt(template: PptTemplate): string {
    return [
      this.buildIdentity(),
      this.buildDesignPhilosophy(),
      this.buildSlideQualityStandards(),
      this.buildVisualizationGuide(),
      this.buildTemplateSpecificRules(template),
      this.buildOutputFormat()
    ].join('\n\n---\n\n');
  }

  /**
   * 核心身份定位
   */
  private buildIdentity(): string {
    return `# 🎨 你的角色定位

你是一位**法学案例教学讲师**，专门制作案例教学课件，帮助老师讲解法律案件。

**核心能力**：
- 将复杂案件转化为清晰的教学课件
- 梳理案件事实脉络，突出关键法律问题
- 提炼法律原理和实务技巧
- 引用相关法条和类似案例，丰富教学内容

**设计信念**：
- 好的课件是"法律故事"，从事实到判决的完整推理
- 每页只讲1个法律要点，帮助学生逐步理解
- 案件细节必须可视化（时间轴、关系图、证据链）
- 结合学生的学习记录，巩固知识点`;
  }

  /**
   * 设计哲学（案例教学课件的核心原则）
   */
  private buildDesignPhilosophy(): string {
    return `# 📐 案例教学课件设计哲学

这是一份**法律案例教学课件**，帮助老师向学生讲解具体案件，目标是：
1. 清晰展示案件事实和法律问题
2. 传授法律分析方法和实务技巧
3. 结合学生的学习记录，巩固知识点
4. 引用相关法条和类似案例，拓展视野

**叙事结构（案件教学五步法）**：
┌─────────────────────────────────────┐
│ 第一步：案件导入（What happened）       │
│ - 案件名称和基本信息                    │
│ - 当事人关系图                          │
│ - 一句话案情概括                        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 第二步：事实梳理（The Facts）           │
│ - 案件时间轴（关键事件）                │
│ - 证据清单和证据链                      │
│ - 争议焦点识别                          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 第三步：法律分析（The Law）             │
│ - 适用法律和法条引用                    │
│ - 法律要件分析                          │
│ - 法律推理过程                          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 第四步：判决解读（The Judgment）        │
│ - 法院判决结果                          │
│ - 判决理由分析                          │
│ - 判决的法律意义                        │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 第五步：拓展学习（Beyond）              │
│ - 类似案例对比                          │
│ - 实务要点总结                          │
│ - 学生学习成果回顾                      │
└─────────────────────────────────────┘

**关键原则**：
1. **案件为中心**：所有内容围绕这个具体案件展开
   - ✅ "本案原告提供了5项证据，其中合同原件具有最强证明力"
   - ❌ "证据在诉讼中很重要"

2. **法律细节**：提供具体法条和分析
   - ✅ "根据《合同法》第107条，违约方应承担违约责任"
   - ❌ "适用合同法相关规定"

3. **学习记录**：结合学生在AI对话中的表现
   - 展示学生的关键提问和领悟
   - 标注学生掌握的知识点
   - 提醒需要进一步学习的盲区

4. **视觉化细节**：
   - 当事人关系 → 关系网络图
   - 案件时间线 → 时间轴
   - 证据质量 → 雷达图
   - 法律推理 → 流程图`;
  }

  /**
   * 页面质量标准（案例教学课件专用）
   */
  private buildSlideQualityStandards(): string {
    return `# ⚖️ 页面质量标准（案例教学课件）

## 📋 封面页（type: cover）

**标准**：
- ✅ 主标题：案件名称（如"绿孔雀栖息地保护公益诉讼案"）
- ✅ 副标题：案件类型+核心争议（如"环境公益诉讼·预防性环保原则的司法适用"）
- ✅ 视觉元素：法律主题图标（天平、法槌、法条）
- ❌ 避免：空泛标题（"法律案例分析"）、缺少案件特色

**示例**：
✅ 好：
   标题："绿孔雀栖息地保护公益诉讼案"
   副标题："环境公益诉讼·预防性环保原则的司法适用"

❌ 差：
   标题："法律案例教学"
   副标题："案例分析与法律适用"

## 📄 内容页（type: content）

**标准**：
- ✅ 标题说明"讲什么法律问题"（如"违约责任的构成要件"）
- ✅ 要点必须包含本案的具体事实或法条
- ✅ 每页1个法律要点，不要混杂多个概念
- ❌ 避免：纯理论描述、没有结合本案、空洞法律术语

**示例**：
✅ 好：
   标题："本案原告的诉讼主体资格"
   要点：
   - 原告是环保公益组织
   - 具备《环境保护法》第58条规定的资格
   - 连续5年从事环保公益活动

❌ 差：
   标题："诉讼主体资格"
   要点：
   - 原告需要有诉讼资格
   - 符合法律规定
   - 满足相关条件

## 📊 图表页（type: chart）

**标准**：
- ✅ 展示本案的具体数据（时间轴、当事人关系、证据评估）
- ✅ visualHints必须包含本案的真实数据
- ✅ 图表类型选择正确（案件时间→timeline，当事人→network，证据→radar）
- ❌ 避免：虚构数据、泛泛而谈、不结合本案

**示例**：
✅ 好：
   title: "本案证据质量评估"
   content: "原告提交的5项关键证据分析"
   visualHints: "用雷达图展示证据质量（环境影响评估报告-真实性90%关联性95%，专家鉴定意见-真实性85%关联性88%，现场照片-真实性95%关联性85%），标注证据三性标准"

❌ 差：
   title: "证据分析"
   content: "展示证据情况"
   visualHints: "用图表展示证据质量"

## 🤔 思辨问题页（type: content，但内容是对话）

**标准**：
- ✅ 展示苏格拉底对话中的具体问题和学生回答
- ✅ 标注问题背后的教学目的
- ✅ 用对话框或问答格式增强表现力
- ❌ 避免：只列问题不展示回答、缺少教学价值说明

**示例**：
✅ 好：
   title: "思辨：如何认定预防性环保原则的适用条件？"
   content:
   "🤔 AI提问：\"本案中水电站尚未建成，环境损害还未发生，原告凭什么起诉？\"\n\n
   💡 学生回答：\"因为有可能造成不可逆的生态破坏\"\n\n
   📚 教学价值：引导学生理解预防性原则的核心——防患于未然"

❌ 差：
   title: "课堂讨论"
   content: "讨论案件相关问题"

## 🎯 总结页（type: conclusion）

**标准**：
- ✅ 总结本案的3个核心法律要点
- ✅ 结合学生的学习收获
- ✅ 提供实务建议（遇到类似案件怎么办）
- ❌ 避免：空泛总结、不结合本案、缺少实务指导

**示例**：
✅ 好：
   标题："本案核心要点与实务启示"
   要点：
   - 预防性环保原则可诉性（本案首次确认）
   - 环保组织的诉讼主体资格认定
   - 类似案件：提前介入、证据保全、专家论证

❌ 差：
   标题："课程总结"
   要点：
   - 学习了环境法知识
   - 理解了诉讼程序
   - 掌握了法律分析方法`;
  }

  /**
   * 可视化设计指南（详细）
   */
  private buildVisualizationGuide(): string {
    return `# 📊 可视化设计指南

## 图表类型选择决策树

\`\`\`
数据特征？
├─ 时间顺序 → 📅 Timeline（时间轴）
│  适用：案件发展、学习路径、历史进程
│  数据：3-15个时间节点
│  示例：visualHints: "用时间轴展示案件发展（2023.01.15 签订合同 → 2023.03.20 发生纠纷 → 2023.06.10 起诉 → 2023.09.15 判决）"
│
├─ 多维评估 → 🕸️ Radar（雷达图）
│  适用：能力评估、质量评估、多指标对比
│  数据：3-8个维度，每个维度0-100分值
│  示例：visualHints: "用雷达图展示学生能力提升（事实认定85分 → 92分、法律推理78分 → 88分、证据分析82分 → 90分、批判思维70分 → 85分、实务应用75分 → 88分）"
│
├─ 数量对比 → 📊 Bar/Column（柱状图）
│  适用：前后对比、分类统计、排名展示
│  数据：2-10个对比项
│  示例：visualHints: "用柱状图对比传统教学 vs AI辅助教学（课堂互动次数: 8次 vs 24次、学生提问数: 3个 vs 15个、知识点掌握率: 65% vs 89%）"
│
├─ 比例构成 → 🥧 Pie（饼图）
│  适用：占比分析、构成展示
│  数据：2-6个部分，总和100%
│  示例：visualHints: "用饼图展示学习时间分配（案例阅读25%、AI分析30%、苏格拉底讨论35%、总结复习10%）"
│
├─ 关系网络 → 🔗 Network（关系图）
│  适用：多方关系、法律关系、概念图谱
│  数据：3-10个节点，节点间有连接
│  示例：visualHints: "用关系网络图展示当事人法律关系（原告A ←借贷关系→ 被告B，被告B ←担保关系→ 担保人C，担保人C ←夫妻关系→ 配偶D）"
│
└─ 流程步骤 → 🔄 Flowchart（流程图）
   适用：操作流程、决策树、逻辑推理
   数据：3-8个步骤
   示例：visualHints: "用流程图展示AI分析流程（上传案例文档 → AI提取三要素 → 生成时间轴 → 识别争议焦点 → 推荐相关法条 → 生成分析报告）"
\`\`\`

## visualHints编写规范

**必须包含的要素**：
1. 图表类型（明确说明用什么图）
2. 展示内容（说明展示什么数据）
3. 具体数值（必须有真实数据）
4. 辅助说明（标注、图例、单位）

**模板**：
\`\`\`
用[图表类型]展示[展示内容]（[具体数值1]、[具体数值2]、[具体数值3]），[辅助说明]
\`\`\`

**示例集合**：

✅ 优秀示例：
1. "用雷达图展示证据质量评估（真实性85%、关联性92%、合法性78%、证明力88%、可采性90%），每个维度标注评分依据"
2. "用时间轴展示案件关键节点（2023.01.15 签订合同、2023.03.20 违约发生、2023.04.05 协商失败、2023.06.10 提起诉讼、2023.09.15 一审判决），每个节点标注法律意义"
3. "用柱状图对比学生能力提升（学习前: 事实梳理60分/法律推理55分/证据分析58分，学习后: 事实梳理88分/法律推理85分/证据分析90分），标注提升幅度"

❌ 错误示例：
1. "用图表展示" ← 没说用什么图
2. "用雷达图展示证据质量" ← 缺少具体数值
3. "展示时间轴" ← 没说展示什么内容

## 数据可视化的黄金法则

1. **数字优先**：能量化的必须量化
   - ✅ "学生提问数增加3倍（8次 → 24次）"
   - ❌ "学生提问明显增加"

2. **对比呈现**：有对比才有说服力
   - ✅ "AI分析5分钟 vs 人工分析2小时"
   - ❌ "AI分析很快"

3. **趋势可视**：变化用图表，不用文字
   - ✅ "用折线图展示学习进步（第1周60分 → 第4周88分）"
   - ❌ "学习成绩不断提高"

4. **层次清晰**：主次数据要区分
   - 主数据：大字体、高亮色
   - 次数据：小字体、浅色
   - 标注：灰色、小字

5. **简洁至上**：图表不是越复杂越好
   - 单图数据不超过8个维度
   - 饼图分类不超过6个
   - 柱状图对比不超过10组`;
  }

  /**
   * 模板特定规则
   */
  private buildTemplateSpecificRules(template: PptTemplate): string {
    const rules = {
      'education-bureau': `# 📚 案例教学基础版设计规则

**受众画像**：法学本科生、初学者
- 关注：案件怎么回事、法律怎么分析、判决为什么这样
- 学习目标：掌握案例分析方法、理解法律推理

**设计要求**：
1. **案情清晰**
   - 用简单语言讲述案件故事
   - 当事人关系要可视化（关系图）
   - 时间线要清楚（什么时候发生了什么）

2. **法律详实**
   - 明确引用法条（条文号+内容）
   - 解释法律术语
   - 展示法律推理过程（从事实到判决）

3. **学习记录**
   - 展示学生在AI对话中的关键提问
   - 标注学生的突破性理解
   - 巩固学生已掌握的知识点
   - 提醒需要进一步学习的内容

4. **拓展内容**
   - 引用1-2个类似案例对比
   - 提供相关法条索引
   - 总结实务要点

**页面分配建议**：
- 封面：案件名称 (1页)
- 案情导入：基本信息+当事人关系 (2页)
- 事实梳理：时间轴+证据链 (3-4页)
- 法律分析：适用法律+要件分析+推理过程 (5-7页)
- 判决解读：判决结果+理由+意义 (2-3页)
- 学生学习回顾：关键提问+掌握知识点 (2页)
- 拓展学习：类似案例+实务要点 (2-3页)
- 总结 (1页)`,

      'teacher-training': `# 👨‍🏫 教师培训版设计规则

**受众画像**：法学教师、培训对象
- 关注：如何使用、操作流程、教学技巧
- 学习目标：掌握平台使用、提升教学能力

**设计要求**：
1. **操作性强**
   - 每个功能都有使用说明
   - 配合截图或操作流程图
   - 标注关键步骤和注意事项

2. **案例驱动**
   - 用真实案例演示功能
   - 展示完整的教学流程
   - 提供可复制的教学范例

3. **技巧提炼**
   - 总结最佳实践（Best Practices）
   - 提供教学话术模板
   - 分享常见问题解决方案

**页面分配建议**：
- 封面 (1页)
- 平台介绍 (2页)
- 操作流程 (6-8页)：分步讲解
- 教学案例 (3-4页)：完整演示
- 技巧总结 (2-3页)
- Q&A (1-2页)`,

      'school-leadership': `# 🏫 学校领导汇报版设计规则

**受众画像**：学校领导、教学主管
- 关注：教学效果、学生表现、课程亮点
- 决策依据：学生反馈、成绩提升、资源投入

**设计要求**：
1. **成果导向**
   - 突出学生能力提升
   - 展示课堂互动数据
   - 对比传统教学效果

2. **学生视角**
   - 展示学生学习路径
   - 引用学生反馈
   - 展示学生作品/成果

3. **资源效率**
   - 说明教师工作量变化
   - 展示时间成本节约
   - 分析投入产出比

**页面分配建议**：
- 封面 (1页)
- 课程概况 (2页)
- 教学过程 (4-5页)：四幕展示
- 学生表现 (3-4页)：数据和案例
- 效果对比 (2页)
- 资源分析 (1页)
- 总结建议 (1页)`,

      'parent-meeting': `# 👨‍👩‍👧 家长会展示版设计规则

**受众画像**：学生家长
- 关注：孩子学到了什么、能力提升、学习兴趣
- 理解水平：非专业，需要通俗化表达

**设计要求**：
1. **通俗易懂**
   - 避免专业术语（或加注释）
   - 用生活化的比喻
   - 多用图片和图表，少用文字

2. **学生成果**
   - 展示具体的学习收获
   - 对比学习前后变化
   - 展示学生作品或对话片段

3. **可视化强**
   - 大量使用图表
   - 对话框展示互动
   - 用图片增强可读性

4. **情感共鸣**
   - 突出孩子的进步
   - 展示学习的乐趣
   - 传递正面的教育理念

**页面分配建议**：
- 封面 (1页)
- 课程介绍 (1页)：简单明了
- 学习过程 (4-5页)：图文并茂
- 孩子的收获 (3-4页)：具体展示
- 能力提升 (2页)：可视化对比
- 未来计划 (1页)`,

      'academic-conference': `# 🎓 学术会议版设计规则

**受众画像**：法学专家、教育学者、同行研究者
- 关注：教学方法创新、理论深度、学术价值
- 评价标准：严谨性、创新性、可验证性

**设计要求**：
1. **学术严谨**
   - 引用理论基础和文献
   - 说明研究方法和实验设计
   - 展示数据分析和统计结果

2. **方法创新**
   - 明确创新点（vs 传统方法）
   - 理论贡献（对教学理论的补充）
   - 实践价值（可复制性验证）

3. **数据充分**
   - 实验数据（样本量、对照组）
   - 统计分析（显著性检验）
   - 效果验证（多维度评估）

**页面分配建议**：
- 封面 (1页)
- 研究背景 (2-3页)：文献综述
- 理论框架 (2页)：苏格拉底教学法+AI
- 方法设计 (3-4页)：四幕教学法
- 实验结果 (4-5页)：数据分析
- 讨论 (2-3页)：理论和实践意义
- 结论 (1页)`,

      'technical': `# 💻 技术评审版设计规则

**受众画像**：技术人员、架构师、CTO
- 关注：技术架构、实现细节、代码质量
- 评价标准：可扩展性、性能、安全性

**设计要求**：
1. **架构清晰**
   - 系统架构图
   - 技术栈说明
   - 模块划分逻辑

2. **实现细节**
   - 核心算法（AI模型、NLP处理）
   - 数据流程（四幕数据传递）
   - 性能优化（响应时间、并发处理）

3. **代码质量**
   - 设计模式
   - 测试覆盖率
   - 代码规范

**页面分配建议**：
- 封面 (1页)
- 系统架构 (3-4页)
- 技术实现 (5-6页)：分模块讲解
- 性能分析 (2页)
- 安全设计 (1-2页)
- 未来规划 (1页)`
    };

    return rules[template];
  }

  /**
   * 输出格式说明（直接生成302.ai Markdown）
   */
  private buildOutputFormat(): string {
    return `# 📝 输出格式要求

## Markdown格式（直接生成，无需JSON转换）

**直接按以下Markdown格式输出，302.ai会自动解析成PPT**：

\`\`\`markdown
# 法律案例教学课件

## 案件名称：绿孔雀栖息地保护公益诉讼案

环境公益诉讼·预防性环保原则的司法适用

---

## 案件基本信息

- 案件类型：环境公益诉讼
- 原告：某环保组织
- 被告：水电站建设方
- 核心争议：水电站建设可能导致绿孔雀栖息地破坏

---

## 案件时间轴

> 💡 设计提示：用时间轴展示案件发展（2020.03.15 水电站立项 → 2020.06.20 环保组织提起诉讼 → 2020.09.10 法院裁定暂停施工 → 2021.02.15 一审判决），每个节点标注法律意义

- 2020.03.15：水电站项目立项
- 2020.06.20：环保组织提起公益诉讼
- 2020.09.10：法院裁定暂停施工
- 2021.02.15：一审判决支持原告

---

## 思辨：预防性环保原则的适用

🤔 **AI提问**："本案中水电站尚未建成，环境损害还未发生，原告凭什么起诉？"

💡 **学生回答**："因为有可能造成不可逆的生态破坏"

📚 **教学价值**：引导学生理解预防性原则的核心——防患于未然

---

## 本案核心要点

- 预防性环保原则首次司法确认
- 环保组织诉讼主体资格认定
- 类似案件实务建议：提前介入、证据保全

---
\`\`\`

## 关键规则（简化后）

### 1. 页面结构
- **\`## 标题\`** = 一页PPT的标题
- **\`---\`** = 页面分隔符
- **列表** = 页面要点内容

### 2. 设计提示（重要！）
格式：\`> 💡 设计提示：用[图表类型]展示[内容]（[具体数值]），[辅助说明]\`

**成功示例**：
- ✅ \`> 💡 设计提示：用时间轴展示案件发展（2023.01.15 签订合同 → 2023.03.20 违约 → 2023.06.10 起诉），每个节点标注法律意义\`
- ✅ \`> 💡 设计提示：用雷达图展示证据质量（真实性85%、关联性92%、合法性78%），标注评分依据\`

**失败示例**：
- ❌ \`> 💡 设计提示：用图表展示\` （缺少具体数据）

### 3. 页面要求
- 标题：8-12字
- 要点：每点不超过15字，每页不超过3个要点
- 图表页：必须有设计提示

### 4. 质量标准
- ✅ 具体法条引用（如"《环境保护法》第58条"）
- ✅ 具体案件事实（不要只说"发生纠纷"）
- ✅ 真实数据（时间、百分比、数量）
- ❌ 避免空泛理论和通用描述

## 严格要求

- ✅ **直接输出Markdown文本**，不要添加\`\`\`markdown\`标记
- ✅ 每页用\`---\`分隔
- ✅ 图表页必须包含详细的设计提示
- ✅ 所有内容基于用户提供的真实数据`;
  }

  /**
   * 构建User Prompt（使用提取后的关键要素）
   */
  buildUserPrompt(options: PptPromptOptions): string {
    const { keyElements, template, length = 'medium', includeDialogue = true } = options;

    const sections: string[] = [];

    // 案例核心信息
    sections.push(this.formatCaseEssence(keyElements));

    // 教学亮点
    sections.push(this.formatTeachingHighlights(keyElements));

    // 对话精华（可选）
    if (includeDialogue) {
      sections.push(this.formatDialogueHighlights(keyElements));
    }

    // 学习成果
    sections.push(this.formatLearningOutcomes(keyElements));

    // 任务指令
    sections.push(this.buildTaskInstruction(template, length));

    return sections.join('\n\n---\n\n');
  }

  /**
   * 格式化案例核心信息
   */
  private formatCaseEssence(keyElements: PptKeyElements): string {
    const { caseEssence } = keyElements;

    return `## 📋 案例核心信息

**案件名称**：${caseEssence.title}

**案件类型**：${caseEssence.type}

**当事人**：
- 原告：${caseEssence.parties.plaintiff}
- 被告：${caseEssence.parties.defendant}

**核心争议**：${caseEssence.mainDispute}

**法律问题**：${caseEssence.legalIssue}

**判决结果**：${caseEssence.verdict}`;
  }

  /**
   * 格式化教学亮点（第二幕深度分析的完整数据）
   */
  private formatTeachingHighlights(keyElements: PptKeyElements): string {
    const { teachingHighlights } = keyElements;

    let result = `## 💡 第二幕深度分析内容（必须基于这些具体数据生成PPT）

### 📊 事实分析`;

    // 关键事实
    if (teachingHighlights.factAnalysis.keyFacts.length > 0) {
      result += `\n\n**关键事实**（PPT中必须展示）：\n`;
      teachingHighlights.factAnalysis.keyFacts.forEach((fact, i) => {
        result += `${i + 1}. ${fact}\n`;
      });
    }

    // 争议焦点
    if (teachingHighlights.factAnalysis.disputedPoints.length > 0) {
      result += `\n**争议焦点**（PPT中必须逐一分析）：\n`;
      teachingHighlights.factAnalysis.disputedPoints.forEach((point, i) => {
        result += `${i + 1}. ${point}\n`;
      });
    }

    // 时间轴
    if (teachingHighlights.factAnalysis.timeline.length > 0) {
      result += `\n**案件时间轴**（必须用timeline可视化）：\n`;
      teachingHighlights.factAnalysis.timeline.forEach(event => {
        result += `- ${event.date}: ${event.event} [${event.importance === 'critical' ? '关键' : event.importance === 'important' ? '重要' : '普通'}]\n`;
      });
    }

    // 证据分析
    result += `\n\n### 🔍 证据分析`;

    if (teachingHighlights.evidenceAnalysis.strengths.length > 0) {
      result += `\n\n**证据优势**（PPT中必须列举）：\n`;
      teachingHighlights.evidenceAnalysis.strengths.forEach((strength, i) => {
        result += `${i + 1}. ${strength}\n`;
      });
    }

    if (teachingHighlights.evidenceAnalysis.weaknesses.length > 0) {
      result += `\n**证据弱点**（PPT中必须指出）：\n`;
      teachingHighlights.evidenceAnalysis.weaknesses.forEach((weakness, i) => {
        result += `${i + 1}. ${weakness}\n`;
      });
    }

    if (teachingHighlights.evidenceAnalysis.recommendations.length > 0) {
      result += `\n**改进建议**（PPT中给出实务建议）：\n`;
      teachingHighlights.evidenceAnalysis.recommendations.forEach((rec, i) => {
        result += `${i + 1}. ${rec}\n`;
      });
    }

    // 法律分析
    result += `\n\n### ⚖️ 法律分析`;

    if (teachingHighlights.legalAnalysis.applicableLaws.length > 0) {
      result += `\n\n**适用法律**（PPT中必须引用具体法条）：\n`;
      teachingHighlights.legalAnalysis.applicableLaws.forEach((law, i) => {
        result += `${i + 1}. ${law}\n`;
      });
    }

    if (teachingHighlights.legalAnalysis.precedents.length > 0) {
      result += `\n**判例参考**（PPT中引用类似案例）：\n`;
      teachingHighlights.legalAnalysis.precedents.forEach((precedent, i) => {
        result += `${i + 1}. ${precedent}\n`;
      });
    }

    if (teachingHighlights.legalAnalysis.risks.length > 0) {
      result += `\n**法律风险**（PPT中必须提醒）：\n`;
      teachingHighlights.legalAnalysis.risks.forEach((risk, i) => {
        result += `${i + 1}. ${risk}\n`;
      });
    }

    // 可视化数据
    if (teachingHighlights.visualizableData.length > 0) {
      result += `\n\n### 📈 可视化数据（必须用图表展示）\n`;
      teachingHighlights.visualizableData.forEach(chart => {
        result += `\n**${chart.title}** [${chart.type}图]\n`;
        result += `- 数据：${JSON.stringify(chart.data)}\n`;
        result += `- visualHints提示：${chart.description}\n`;
      });
    }

    result += `\n\n⚠️ **重要提示**：
1. 以上所有数据都是来自第二幕深度分析的真实内容
2. PPT大纲必须基于这些具体数据生成，不能用通用描述代替
3. 关键事实、争议焦点、法条引用、判例参考等都必须在PPT中体现
4. 时间轴、证据分析等必须用可视化图表展示`;

    return result;
  }

  /**
   * 格式化对话精华（强化思辨问题展示）
   */
  private formatDialogueHighlights(keyElements: PptKeyElements): string {
    const { dialogueHighlights } = keyElements;

    let result = `## 💬 苏格拉底对话精华（第三幕）

**学生思维进步路径**：
${dialogueHighlights.thinkingProgression}`;

    if (dialogueHighlights.keyQuestions.length > 0) {
      result += `\n\n**关键思辨问题与对话**（PPT中必须展示这些问题）：\n`;
      dialogueHighlights.keyQuestions.forEach((q, i) => {
        result += `\n${i + 1}. 🤔 **思辨问题**："${q.question}"\n`;
        result += `   💡 **学生回答**："${q.studentResponse}"\n`;
        result += `   📚 **教学价值**：${q.insight}\n`;
        result += `   \n   💡 **PPT呈现建议**：用问答框展示，突出思辨性和学生的思考过程\n`;
      });
    }

    if (dialogueHighlights.breakthroughMoments.length > 0) {
      result += `\n\n**学生的突破性理解时刻**：\n`;
      dialogueHighlights.breakthroughMoments.forEach(moment => {
        result += `- ✨ ${moment}\n`;
      });
    }

    result += `\n\n⚠️ **重要提示**：苏格拉底对话的思辨问题是教学的核心亮点，PPT中必须：
1. 用独立页面展示关键思辨问题
2. 展示学生的回答和思考过程
3. 标注问题背后的教学目的
4. 可以用对话框、问答卡片等视觉元素增强表现力`;

    return result;
  }

  /**
   * 格式化学习成果
   */
  private formatLearningOutcomes(keyElements: PptKeyElements): string {
    const { learningOutcomes } = keyElements;

    let result = `## 🎓 学习成果

**关键收获**：
${learningOutcomes.keyInsights.map(insight => `- ${insight}`).join('\n')}

**能力提升**：
${learningOutcomes.skillsImproved.map(skill => `- ${skill}`).join('\n')}`;

    if (learningOutcomes.knowledgeGaps.length > 0) {
      result += `\n\n**知识盲区（需要进一步学习）**：\n`;
      result += learningOutcomes.knowledgeGaps.map(gap => `- ${gap}`).join('\n');
    }

    return result;
  }

  /**
   * 构建任务指令
   */
  private buildTaskInstruction(template: PptTemplate, length: 'short' | 'medium' | 'long'): string {
    const pageRanges = {
      short: '10-15页',
      medium: '20-25页',
      long: '25-35页'
    };

    const templateNames: Record<PptTemplate, string> = {
      'education-bureau': '案例教学基础版',
      'teacher-training': '案例教学进阶版',
      'school-leadership': '案例教学考试版',
      'parent-meeting': '案例教学简化版',
      'academic-conference': '案例教学学术版',
      'technical': '案例教学实务版'
    };

    return `## 📋 你的任务

基于以上案件信息和学习记录，生成一份**${templateNames[template]}**法律案例教学课件。

**核心要求**：
1. 页数：${pageRanges[length]}
2. **案件为中心**：所有内容围绕这个具体案件，不要空谈理论
3. **法律细节**：
   - 必须引用具体法条（如"《合同法》第107条"）
   - 必须展示法律推理过程（从事实到法律要件到判决）
   - 必须包含案件关键事实和证据
4. **学习记录**：
   - 展示学生在苏格拉底对话中的关键提问和回答
   - 标注学生已掌握的知识点
   - 提醒学生需要进一步学习的内容
5. **可视化要求**：
   - 当事人关系 → 关系网络图
   - 案件时间线 → 时间轴（标注关键时间节点）
   - 证据评估 → 雷达图（真实性/关联性/合法性）
   - 法律推理 → 流程图

**输出格式**：纯Markdown文本（直接输出，不要用markdown代码块标记）

**特别提醒**：
- ⚠️ 这是**案例教学课件**，不是平台展示PPT
- ⚠️ 必须有法条引用，不能只说"根据法律规定"
- ⚠️ 必须有案件事实，不能只说"原被告发生纠纷"
- ⚠️ 图表页必须用 \`> 💡 设计提示：...\` 格式，包含图表类型+具体数值
- ⚠️ 每页用 \`---\` 分隔
- ⚠️ 如果数据中有类似案例或相关法条，必须引用

现在请直接生成Markdown格式的案例教学课件大纲。`;
  }
}
