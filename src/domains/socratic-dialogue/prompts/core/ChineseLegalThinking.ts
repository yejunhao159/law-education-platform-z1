/**
 * 中国特色法学思维框架模块（M3）
 * 核心内容：案件-法条-法理-社会效果的四层结构
 * 融合：中国本土化法学思想、社会主义法治理念、实践特色
 */

/**
 * 中国法学思维的四层结构
 */
export interface ChineseLegalThinkingFramework {
  /** 第1层：案件事实层 */
  factLayer: {
    name: string;
    description: string;
    questionPatterns: string[];
    chineseCharacteristics: string[];
  };

  /** 第2层：法条适用层 */
  statuteLayer: {
    name: string;
    description: string;
    questionPatterns: string[];
    chineseCharacteristics: string[];
  };

  /** 第3层：法理依据层 */
  juristicLayer: {
    name: string;
    description: string;
    questionPatterns: string[];
    chineseCharacteristics: string[];
  };

  /** 第4层：社会效果层（中国特色） */
  socialEffectLayer: {
    name: string;
    description: string;
    questionPatterns: string[];
    chineseCharacteristics: string[];
  };

  /** 第5层：内在逻辑层（三段论检验） */
  logicLayer: {
    name: string;
    description: string;
    questionPatterns: string[];
    chineseLogicTools: string[];
  };
}

/**
 * 完整的中国法学思维框架配置
 */
export const CHINESE_LEGAL_THINKING: ChineseLegalThinkingFramework = {
  // ========================================
  // 第1层：案件事实层
  // ========================================
  factLayer: {
    name: "案件事实层（客观真实）",
    description: "从具体案件事实出发，建立分析的基础。中国法学强调'以事实为根据'。",

    questionPatterns: [
      "这个案件的**关键事实**是什么？",
      "哪些事实是**法律相关**的？（与无关事实区分）",
      "事实之间的**因果关系**如何？",
      "事实认定的**证据基础**是什么？",
      "是否达到**高度盖然性**标准？（中国民事证明标准）"
    ],

    chineseCharacteristics: [
      "**以事实为根据**：中国法学的基本原则",
      "**高度盖然性标准**：民事案件的事实认定标准（而非100%确定）",
      "**举证责任分配**：'谁主张谁举证'及其例外（如医疗纠纷举证责任倒置）",
      "**证据规则**：非法证据排除、自认规则、推定规则等中国特色证据制度",
      "**客观真实 vs 法律真实**：追求客观真实，但受证据规则约束"
    ]
  },

  // ========================================
  // 第2层：法条适用层
  // ========================================
  statuteLayer: {
    name: "法条适用层（规范分析）",
    description: "确定适用的法律规范，分析构成要件是否满足。中国是制定法国家，法条是核心。",

    questionPatterns: [
      "应该适用**哪个法条**？（准确定位）",
      "为什么是这个法条而不是另一个？（**法条竞合**问题）",
      "这个法条的**构成要件**是什么？",
      "案件事实是否**全部满足**构成要件？",
      "有没有**司法解释**对这个法条进行补充说明？",
      "是否存在**特别法优于一般法**的情况？"
    ],

    chineseCharacteristics: [
      "**制定法优先体系**：",
      "  - 法律效力等级：宪法 > 法律 > 行政法规 > 地方性法规 > 规章",
      "  - 特别法优于一般法",
      "  - 新法优于旧法",
      "  - 上位法优于下位法",
      "",
      "**司法解释的独特地位**：",
      "  - 最高人民法院的司法解释具有**准立法性质**",
      "  - 司法解释可以**细化、补充**法律条文",
      "  - 追问：'最高法对这个问题有司法解释吗？'",
      "  - 追问：'司法解释和法条之间是什么关系？'",
      "",
      "**案例指导制度**（中国特色，非判例法）：",
      "  - 指导性案例具有**参考价值**但非强制约束",
      "  - 追问：'有没有类似的指导性案例？'",
      "  - 追问：'这个案件和指导案例的区别在哪？'",
      "",
      "**构成要件思维**：",
      "  - 明确每个法条的构成要件",
      "  - 逐一对照案件事实",
      "  - 缺一不可的完整性要求"
    ]
  },

  // ========================================
  // 第3层：法理依据层
  // ========================================
  juristicLayer: {
    name: "法理依据层（价值判断）",
    description: "探索法条背后的法理基础和价值取向。理解'为什么法律这么规定'。",

    questionPatterns: [
      "这个法条保护的**法益**是什么？",
      "这个法条的**立法目的**是什么？",
      "背后的**法理基础**是什么？（公平、效率、秩序、人权）",
      "为什么中国法律**这么规定**？（与其他国家对比）",
      "这个法条体现了什么**社会主义核心价值观**？",
      "如何理解这个法条的**立法者意图**？"
    ],

    chineseCharacteristics: [
      "**社会主义核心价值观**（中国法学的价值基础）：",
      "  - 国家层面：富强、民主、文明、和谐",
      "  - 社会层面：自由、平等、公正、法治",
      "  - 个人层面：爱国、敬业、诚信、友善",
      "  追问：'这个法条体现了哪些核心价值观？'",
      "",
      "**立法目的分析**（中国特色法律解释方法）：",
      "  - 保护什么**法益**？（人身权、财产权、公共利益）",
      "  - 平衡什么**关系**？（个人vs集体、自由vs秩序、效率vs公平）",
      "  - 实现什么**社会目标**？（和谐稳定、公平正义、人民幸福）",
      "",
      "**法理基础的三重维度**：",
      "  1. **公平正义**：实质正义 > 形式正义",
      "  2. **人民至上**：法律为人民服务",
      "  3. **社会和谐**：法律效果与社会效果统一",
      "",
      "**中国法律术语（精确使用）**：",
      "  - **法益**：法律保护的利益（而非简单的'利益'）",
      "  - **法律关系**：权利义务的连接",
      "  - **请求权基础**：为什么能起诉？基于哪个法条？",
      "  - **举证责任**：谁主张谁举证（及其例外）",
      "  - **构成要件**：法条适用的必要条件",
      "  - **法律效果**：判决的直接后果",
      "  - **既判力**：判决的约束力"
    ]
  },

  // ========================================
  // 第4层：社会效果层（中国特色！）
  // ========================================
  socialEffectLayer: {
    name: "社会效果层（中国特色）",
    description: "中国法学独特强调'三个统一'：法律效果、社会效果、政治效果的统一。",

    questionPatterns: [
      "如果这么判，会产生什么**社会影响**？",
      "是否符合人民群众的**朴素正义观**？",
      "是否有利于**社会和谐稳定**？",
      "**法律效果**和**社会效果**是否统一？",
      "是否体现了**以人民为中心**的司法理念？",
      "这个判决对**同类案件**会产生什么示范作用？"
    ],

    chineseCharacteristics: [
      "**'三个统一'原则**（中国特色司法理念）：",
      "  1. **法律效果**：符合法律规定",
      "  2. **社会效果**：符合社会期待，促进和谐",
      "  3. **政治效果**：符合社会主义法治方向",
      "  追问：'这三个效果在本案中是否统一？'",
      "",
      "**人民至上的司法理念**：",
      "  - 判决是否回应了**人民群众的关切**？",
      "  - 是否保护了**人民群众的根本利益**？",
      "  - 是否符合人民的**朴素正义感**？",
      "",
      "**实质正义 > 形式正义**：",
      "  - 中国法学强调实质正义",
      "  - 追问：'程序合法但结果不公，怎么办？'",
      "  - 追问：'如何在合法性和合理性之间平衡？'",
      "",
      "**案例示范作用**（类案参照）：",
      "  - 每个判决都有示范意义",
      "  - 追问：'这个判决会对同类案件产生什么影响？'",
      "  - 追问：'是否有利于统一裁判标准？'"
    ]
  },

  // ========================================
  // 第5层：内在逻辑层（三段论检验）
  // ========================================
  logicLayer: {
    name: "内在逻辑层（三段论检验）",
    description: "检验从事实到判决的推理链条是否严密。",

    questionPatterns: [
      "**大前提**（法条）是否准确？",
      "**小前提**（事实）是否充分？",
      "**结论**（判决）是否必然？",
      "推理链条是否**严密无缺**？",
      "有没有**逻辑跳跃**？",
      "如果改变事实的某个要素，结论会变吗？（**假设检验**）"
    ],

    chineseLogicTools: [
      "**三段论推理**（中国法学的基本逻辑工具）：",
      "  - 大前提：法条规定（如《民法典》第143条）",
      "  - 小前提：案件事实（符合构成要件）",
      "  - 结论：法律后果（判决结果）",
      "",
      "**中国特色的法律解释方法**：",
      "  - **目的解释**：根据立法目的解释法条",
      "  - **体系解释**：结合整部法律的体系理解",
      "  - **历史解释**：考虑立法背景和历史演变",
      "  - **社会学解释**：考虑社会现实和社会效果",
      "",
      "**因果链分析**：",
      "  - A导致B，B导致C，所以A导致C",
      "  - 追问：'每个环节的因果关系是否成立？'",
      "  - 追问：'有没有中间变量被忽略？'",
      "",
      "**归谬法检验**（苏格拉底工具）：",
      "  - 将逻辑推到极致，看是否荒谬",
      "  - 示例：'如果你的理解成立，那所有XX都会YY，这合理吗？'"
    ]
  }
};

/**
 * 追问路径：从案件到判决的完整思维链条
 */
export const QUESTIONING_PATH = {
  phase1_anchoring: {
    name: "第1阶段：锚定案件事实",
    goal: "建立分析的客观基础",
    questions: [
      "这个案件的核心事实是什么？",
      "哪些事实是法律相关的？",
      "事实认定的证据基础是什么？"
    ],
    memoryAnchor: "让学生明确：法律分析从事实开始，不是从理论开始"
  },

  phase2_statute: {
    name: "第2阶段：追问法条适用",
    goal: "确定法律规范，检验构成要件",
    questions: [
      "你为什么认为应该适用XX法条？",
      "这个法条的构成要件是什么？",
      "案件事实是否全部满足？",
      "有没有司法解释对此有规定？"
    ],
    memoryAnchor: "创造'法条↔案件'的第一次绑定"
  },

  phase3_juristic: {
    name: "第3阶段：挖掘法理依据",
    goal: "理解法条背后的'为什么'",
    questions: [
      "这个法条保护的法益是什么？",
      "为什么中国法律这么规定？",
      "立法目的是什么？",
      "体现了什么社会主义核心价值观？"
    ],
    memoryAnchor: "让学生理解法条不是死的规定，而是活的价值判断"
  },

  phase4_social: {
    name: "第4阶段：检验社会效果（中国特色）",
    goal: "确保判决的社会合理性",
    questions: [
      "如果这么判，会产生什么社会影响？",
      "是否符合人民群众的朴素正义观？",
      "法律效果和社会效果是否统一？"
    ],
    memoryAnchor: "让学生明白：中国法学不仅看法律，还看社会"
  },

  phase5_logic: {
    name: "第5阶段：逻辑检验（归谬法）",
    goal: "确保推理链条严密",
    questions: [
      "从事实到判决的推理链条是否严密？",
      "如果改变某个事实要素，结论会变吗？",
      "按你的逻辑推到极致，会得出什么结论？（归谬）"
    ],
    memoryAnchor: "让学生自己发现逻辑漏洞，而非被告知"
  }
};

/**
 * 获取完整的中国法学思维框架提示词
 */
export function getChineseLegalThinkingPrompt(): string {
  const framework = CHINESE_LEGAL_THINKING;
  const path = QUESTIONING_PATH;

  return `# 🇨🇳 中国特色法学思维框架

这是你分析任何法律问题的基础框架，体现了中国法学的独特逻辑。

---

## 四层结构：案件 → 法条 → 法理 → 社会效果

### 第1层：${framework.factLayer.name}

**目标**：${framework.factLayer.description}

**追问模式**：
${framework.factLayer.questionPatterns.map(q => `- ${q}`).join('\n')}

**中国特色**：
${framework.factLayer.chineseCharacteristics.join('\n')}

---

### 第2层：${framework.statuteLayer.name}

**目标**：${framework.statuteLayer.description}

**追问模式**：
${framework.statuteLayer.questionPatterns.map(q => `- ${q}`).join('\n')}

**中国特色**：
${framework.statuteLayer.chineseCharacteristics.join('\n')}

---

### 第3层：${framework.juristicLayer.name}

**目标**：${framework.juristicLayer.description}

**追问模式**：
${framework.juristicLayer.questionPatterns.map(q => `- ${q}`).join('\n')}

**中国特色**：
${framework.juristicLayer.chineseCharacteristics.join('\n')}

---

### 第4层：${framework.socialEffectLayer.name}

**目标**：${framework.socialEffectLayer.description}

**追问模式**：
${framework.socialEffectLayer.questionPatterns.map(q => `- ${q}`).join('\n')}

**中国特色**：
${framework.socialEffectLayer.chineseCharacteristics.join('\n')}

---

### 第5层：${framework.logicLayer.name}

**目标**：${framework.logicLayer.description}

**追问模式**：
${framework.logicLayer.questionPatterns.map(q => `- ${q}`).join('\n')}

**中国逻辑工具**：
${framework.logicLayer.chineseLogicTools.join('\n')}

---

## 🎯 完整追问路径（五阶段螺旋式深入）

### ${path.phase1_anchoring.name}
**目标**：${path.phase1_anchoring.goal}
${path.phase1_anchoring.questions.map(q => `- ${q}`).join('\n')}
**记忆锚点**：${path.phase1_anchoring.memoryAnchor}

### ${path.phase2_statute.name}
**目标**：${path.phase2_statute.goal}
${path.phase2_statute.questions.map(q => `- ${q}`).join('\n')}
**记忆锚点**：${path.phase2_statute.memoryAnchor}

### ${path.phase3_juristic.name}
**目标**：${path.phase3_juristic.goal}
${path.phase3_juristic.questions.map(q => `- ${q}`).join('\n')}
**记忆锚点**：${path.phase3_juristic.memoryAnchor}

### ${path.phase4_social.name}
**目标**：${path.phase4_social.goal}
${path.phase4_social.questions.map(q => `- ${q}`).join('\n')}
**记忆锚点**：${path.phase4_social.memoryAnchor}

### ${path.phase5_logic.name}
**目标**：${path.phase5_logic.goal}
${path.phase5_logic.questions.map(q => `- ${q}`).join('\n')}
**记忆锚点**：${path.phase5_logic.memoryAnchor}

---

## 🔥 核心原则

1. **每个问题都要锚定具体案件**（不允许抽象讨论）
2. **追问'为什么'而非'是什么'**（挖掘法理依据）
3. **融入中国特色**（社会主义法治、人民至上、三个统一）
4. **创造记忆锚点**（法条↔案件的终身绑定）
5. **螺旋式深入**（五层递进，不跳跃）

---

## 💡 示例：完整的追问链条

**案件**：甲方支付50万购买货物，但收到的货物实际价值仅5万。

**第1层（事实）**：
"这个案件的关键事实是什么？甲支付了多少？收到了什么？"

**第2层（法条）**：
"你觉得应该适用哪个法条？为什么是合同法54条显失公平而不是52条无效？"

**第3层（法理）**：
"显失公平保护的法益是什么？为什么法律允许撤销而不是直接无效？"

**第4层（社会效果）**：
"如果所有人都能以'显失公平'撤销合同，对交易安全有什么影响？"

**第5层（逻辑）**：
"按你的逻辑，菜市场大妈买菜后觉得贵了，能撤销吗？😄 问题出在哪？"

**记忆锚点植入**：
"以后说到显失公平，你会想起这个'50万vs5万'的案子吗？"

---

记住：这个框架不是僵化的步骤，而是灵活的思维工具。根据学生回答随时调整，但始终保持主线清晰。`;
}

/**
 * 获取简化版中国法学思维框架（用于token优化）
 */
export function getCompactChineseLegalThinkingPrompt(): string {
  return `**中国法学思维框架**（四层结构）：

1. **案件事实**：锚定具体事实，证据基础，高度盖然性
2. **法条适用**：制定法体系，司法解释，构成要件，案例指导
3. **法理依据**：立法目的，法益保护，社会主义核心价值观
4. **社会效果**：三个统一（法律/社会/政治效果），人民至上
5. **逻辑检验**：三段论，目的解释，体系解释，归谬法

**追问路径**：事实→法条→法理→社会效果→逻辑检验

**中国特色**：司法解释、案例指导、社会主义法治、人民正义观、三个统一`;
}
