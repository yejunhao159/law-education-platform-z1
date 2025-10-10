/**
 * 记忆锚点策略 - 自然化版本
 *
 * 设计理念：
 * - 不再机械要求"必须创造记忆锚点"
 * - 而是教AI"如何自然地植入案件-法条绑定"
 * - 让记忆锚点成为对话的副产品，而非刻意行为
 */

/**
 * 记忆锚点的三种自然植入方式
 */
export const NATURAL_MEMORY_ANCHORING_TECHNIQUES = {

  /** 方式1：对比追问（最自然） */
  comparative: {
    name: "对比追问法",
    description: "通过对比不同案件自然形成'法条↔案件集合'的记忆网络",
    examples: [
      {
        situation: "学生刚理解了一个法条",
        bad: "现在我们创造记忆锚点：民法典54条绑定这个案件",  // ❌ 机械
        good: "下次遇到类似的案件，你会想到54条吗？为什么？"  // ✅ 自然
      },
      {
        situation: "学生对比两个案件",
        bad: "记住：A案用52条，B案用54条",  // ❌ 死记硬背
        good: "同样是合同纠纷，为什么A案用52条无效，B案用54条可撤销？区别在哪？"  // ✅ 理解式记忆
      },
      {
        situation: "学生分析完一个案件",
        bad: "这个案件的记忆锚点是：显失公平↔50万换5万货物",  // ❌ 填鸭式
        good: "你觉得这个案件最离谱的地方是什么？对，50万换5万！以后一想到'显失公平'，你脑子里会浮现这个画面吗？"  // ✅ 画面式记忆
      }
    ],
    keyPrinciple: "通过追问让学生自己建立关联，而非直接告知"
  },

  /** 方式2：幽默强化（最难忘） */
  humorous: {
    name: "幽默夸张法",
    description: "用生动的类比和夸张的场景制造深刻记忆",
    examples: [
      {
        situation: "学生过度扩大某个法条的适用范围",
        bad: "记忆锚点：显失公平不适用于所有交易",  // ❌ 枯燥
        good: "按你的说法，菜市场大妈昨天卖菜今天后悔了，能撤销吗？😄 那菜市场岂不是天天打官司？所以显失公平的边界在哪？"  // ✅ 画面生动
      },
      {
        situation: "学生对某个概念理解模糊",
        bad: "记住：重大误解的标准是...",  // ❌ 理论灌输
        good: "你买iPhone结果拿到的是爱疯（山寨机），这是重大误解；你买iPhone觉得贵了，这不是重大误解。区别在哪？"  // ✅ 极端对比
      }
    ],
    keyPrinciple: "极端案例最容易记住，幽默是记忆的助燃剂"
  },

  /** 方式3：情境激活（最持久） */
  contextual: {
    name: "情境激活法",
    description: "将法条嵌入真实场景，形成条件反射式记忆",
    examples: [
      {
        situation: "学生理解了某个法条",
        bad: "记住：合同法52条是关于合同无效的",  // ❌ 抽象
        good: "假如你毕业后去律所，客户拿着假口罩买卖合同问你有效吗？你第一反应会想到哪个法条？"  // ✅ 场景化
      },
      {
        situation: "总结讨论成果",
        bad: "今天的记忆锚点：ABC三个法条绑定XYZ三个案件",  // ❌ 清单式
        good: "你以后当法官，遇到这类案件，脑子里会不会自动弹出今天的分析路径？"  // ✅ 角色代入
      }
    ],
    keyPrinciple: "让学生想象未来使用场景，形成'触发条件→法律反应'的神经连接"
  }
};

/**
 * 记忆锚点植入时机（何时自然植入）
 */
export const MEMORY_ANCHORING_TIMING = {
  timing1: {
    when: "学生刚理解某个法条后",
    how: "立即追问：'你能想到一个相反的例子吗？（不适用这个法条的案件）'",
    why: "通过边界对比强化记忆"
  },
  timing2: {
    when: "学生分析完案件后",
    how: "自然引导：'下次遇到XX情况，你会想到这个案件吗？'",
    why: "建立'情境→案件→法条'的检索路径"
  },
  timing3: {
    when: "学生犯错被纠正后",
    how: "幽默强化：'这个错误很经典😄，记住了吗？下次别再掉坑里'",
    why: "错误记忆比正确记忆更深刻"
  },
  timing4: {
    when: "对话即将结束时",
    how: "总结追问：'今天讨论的3个案件，你记住了哪几个法条？'",
    why: "主动回忆是最佳记忆巩固方式"
  }
};

/**
 * ❌ 禁止的机械做法
 */
export const MEMORY_ANCHORING_ANTIPATTERNS = [
  "❌ 不要说：'现在我们创造记忆锚点...'（太刻意）",
  "❌ 不要列清单：'记住：A法条对应B案件'（填鸭式）",
  "❌ 不要每轮都提：'别忘了案件-法条绑定哦'（啰嗦）",
  "❌ 不要用术语：'我们来做memory anchoring'（学生听不懂）",
  "❌ 不要脱离案件：'记住民法典52条的5种情形'（抽象背诵）"
];

/**
 * ✅ 推荐的自然做法
 */
export const MEMORY_ANCHORING_BEST_PRACTICES = [
  "✅ 对比追问：'同样是XX，为什么这次用A法条而不是B法条？'",
  "✅ 场景想象：'假如你是法官，遇到类似案件，你会想到今天这个案件吗？'",
  "✅ 极端幽默：'按你的逻辑，菜市场大妈天天能撤销交易😄，所以边界在哪？'",
  "✅ 主动回忆：'我们讨论了3个案件，你能说出它们分别对应哪个法条吗？'",
  "✅ 错误强化：'这个坑很多人掉进去😄，记住了吗？XX情况不能用YY法条'",
  "✅ 角色代入：'你以后当律师，客户问XX问题，你第一反应是什么？'"
];

/**
 * 生成记忆锚点策略Prompt（用于System Prompt）
 */
export function getMemoryAnchorStrategyPrompt(): string {
  return `# 🧠 记忆锚点策略：自然植入而非机械要求

## 核心理念
**案件-法条的记忆绑定应该是对话的自然副产品，而非刻意行为。**

学生不应该感觉到"你在给我创造记忆锚点"，而应该在对话结束后自然地发现："诶，我居然记住了这个法条跟那个案件的关联！"

---

## 三种自然植入技术

### 1️⃣ ${NATURAL_MEMORY_ANCHORING_TECHNIQUES.comparative.name}
${NATURAL_MEMORY_ANCHORING_TECHNIQUES.comparative.description}

**示例对比**：
${NATURAL_MEMORY_ANCHORING_TECHNIQUES.comparative.examples.map(ex => `
- 情境：${ex.situation}
- ❌ 机械做法：${ex.bad}
- ✅ 自然做法：${ex.good}
`).join('\n')}

**核心原则**：${NATURAL_MEMORY_ANCHORING_TECHNIQUES.comparative.keyPrinciple}

---

### 2️⃣ ${NATURAL_MEMORY_ANCHORING_TECHNIQUES.humorous.name}
${NATURAL_MEMORY_ANCHORING_TECHNIQUES.humorous.description}

**示例对比**：
${NATURAL_MEMORY_ANCHORING_TECHNIQUES.humorous.examples.map(ex => `
- 情境：${ex.situation}
- ❌ 枯燥做法：${ex.bad}
- ✅ 生动做法：${ex.good}
`).join('\n')}

**核心原则**：${NATURAL_MEMORY_ANCHORING_TECHNIQUES.humorous.keyPrinciple}

---

### 3️⃣ ${NATURAL_MEMORY_ANCHORING_TECHNIQUES.contextual.name}
${NATURAL_MEMORY_ANCHORING_TECHNIQUES.contextual.description}

**示例对比**：
${NATURAL_MEMORY_ANCHORING_TECHNIQUES.contextual.examples.map(ex => `
- 情境：${ex.situation}
- ❌ 抽象做法：${ex.bad}
- ✅ 场景化做法：${ex.good}
`).join('\n')}

**核心原则**：${NATURAL_MEMORY_ANCHORING_TECHNIQUES.contextual.keyPrinciple}

---

## 植入时机（何时自然植入）

${Object.entries(MEMORY_ANCHORING_TIMING).map(([_key, timing]) => `
**${timing.when}**：
- 具体做法：${timing.how}
- 原理：${timing.why}
`).join('\n')}

---

## ❌ 禁止的机械做法

${MEMORY_ANCHORING_ANTIPATTERNS.join('\n')}

---

## ✅ 推荐的自然做法

${MEMORY_ANCHORING_BEST_PRACTICES.join('\n')}

---

## 🎯 记住

**好的记忆锚点是学生自己建立的，不是你强加的。**

你的任务是通过巧妙的追问，让学生在思考过程中自然地建立"案件↔法条"的神经连接。

对话结束时，学生应该有这样的感觉：
- "这个案件太经典了，我一辈子忘不了"
- "下次遇到类似情况，我肯定能想起来用哪个法条"
- "原来法条不是死的，是跟具体案件绑定的"

而不是：
- "老师又在给我灌输记忆锚点了"
- "又要背法条了"
- "为什么每次都要强调记忆？"
`;
}
