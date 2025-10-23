/**
 * 合同助手提示词
 * 设计理念：友好、专业、实用
 */

/**
 * 系统提示词 - 定义AI助手的身份和能力
 */
export const SYSTEM_PROMPT = `你是一位专业的合同分析助手，帮助用户理解合同条款和识别潜在风险。

# 🎯 核心职责
1. **解答疑问**：用通俗易懂的语言解释合同条款
2. **风险提示**：主动指出不公平或有风险的条款
3. **建议协商**：给出具体的修改建议和协商话术
4. **法律依据**：引用相关法条支持你的分析

# ⚖️ 行为准则
- ✅ 用"大白话"解释，避免法律术语堆砌
- ✅ 举实际案例说明风险的后果
- ✅ 提供具体的修改建议，不是泛泛而谈
- ✅ 承认不确定性，建议用户咨询律师（重大问题）
- ❌ 不要说"这个条款没问题"（除非真的没问题）
- ❌ 不要给出模糊的建议（如"建议谨慎"）

# 🗣️ 对话风格
- 友好但专业
- 简洁但准确
- 实用导向，避免说教

# 📋 回复结构（可选使用）
当用户问及具体条款时，可以按以下结构回复：

1. **条款含义**：用一句话说清楚这个条款在说什么
2. **潜在风险**：这个条款对用户有什么不利？
3. **真实后果**：举例说明最坏的情况
4. **修改建议**：具体怎么改（给出文本）
5. **法律依据**：引用相关法条

# 🔧 可用工具（未来扩展）
- knowledge_graph: 查询类似合同案例
- chroma_search: 搜索相关法条和判例
- sequential_thinking: 复杂问题的多步推理

注意：当前版本MCP工具尚未启用，暂时不要提及工具调用。`;

/**
 * 用户提示词模板
 */
export function buildUserPrompt(params: {
  contractText: string;
  currentQuery: string;
  context?: {
    clauseId?: string;
    riskHighlights?: string[];
    conversationHistory?: Array<{ role: string; content: string }>;
  };
}): string {
  const { contractText, currentQuery, context } = params;

  let prompt = `# 合同内容\n\`\`\`\n${contractText.substring(0, 2000)}...\n\`\`\`\n\n`;

  // 添加上下文信息
  if (context?.clauseId) {
    prompt += `## 当前聚焦条款\n条款ID: ${context.clauseId}\n\n`;
  }

  if (context?.riskHighlights && context.riskHighlights.length > 0) {
    prompt += `## 已识别的风险点\n${context.riskHighlights.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
  }

  if (context?.conversationHistory && context.conversationHistory.length > 0) {
    prompt += `## 对话历史\n`;
    context.conversationHistory.slice(-5).forEach((msg) => {
      prompt += `**${msg.role === 'user' ? '用户' : 'AI'}**: ${msg.content}\n\n`;
    });
  }

  // 用户当前问题
  prompt += `# 用户问题\n${currentQuery}`;

  return prompt;
}

/**
 * 快捷问题模板
 */
export const QUICK_QUESTIONS = [
  '这份合同有哪些主要风险？',
  '违约责任条款公平吗？',
  '缺少哪些核心条款？',
  '如果对方不履行合同，我该怎么办？',
  '这个条款能修改吗？怎么改？',
  '有没有类似的案例？',
];

/**
 * 根据合同类型定制快捷问题
 */
export function getQuickQuestionsByType(contractType: string): string[] {
  const baseQuestions = ['这份合同有哪些主要风险？', '缺少哪些核心条款？'];

  const typeSpecificQuestions: Record<string, string[]> = {
    '买卖': [
      '标的物质量问题怎么处理？',
      '付款和交付的顺序安全吗？',
      '违约金比例合理吗？',
    ],
    '租赁': [
      '押金能退吗？什么情况下不退？',
      '能提前退租吗？需要赔多少？',
      '房东能随时涨租金吗？',
    ],
    '服务': [
      '验收标准明确吗？',
      '如果服务质量不达标怎么办？',
      '能不能随时解除合同？',
    ],
    '劳动': [
      '试用期条款合法吗？',
      '离职需要提前多久通知？',
      '竞业限制条款公平吗？',
    ],
  };

  return [
    ...baseQuestions,
    ...(typeSpecificQuestions[contractType] || ['有什么需要特别注意的地方？']),
  ];
}
