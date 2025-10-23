/**
 * 合同智能体服务
 * 职责：提供合同对话能力，复用ai-chat和context-manager
 */

import { DeeChatAIClient, createDeeChatConfig } from '@/src/domains/socratic-dialogue/services/DeeChatAIClient';
import { ContextFormatter } from '@deepracticex/context-manager';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompts/contract-assistant';
import type { AgentRequest, AgentResponse, ContractMessage } from '../types/agent';
import type { ChatStreamChunk } from '@deepracticex/ai-chat';

/**
 * 合同智能体服务类
 */
export class ContractAgentService {
  private aiClient: DeeChatAIClient;

  constructor() {
    // 复用现有的DeeChatAIClient配置
    const config = createDeeChatConfig({
      provider: 'deepseek',
      model: 'deepseek-chat',
      temperature: 0.4,  // 合同分析需要更准确，降低temperature
      maxContextTokens: 8000,
      enableStreaming: true,
    });

    this.aiClient = new DeeChatAIClient(config);
    console.log('✅ ContractAgentService 初始化完成');
  }

  /**
   * 发送对话消息（非流式）
   */
  async sendMessage(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      console.log('📤 合同智能体收到请求:', {
        sessionId: request.sessionId,
        queryLength: request.currentQuery.length,
        messagesCount: request.messages.length,
      });

      // 1. 构建上下文
      const context = this.buildContext(request);

      // 2. 构建消息列表
      const messages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...request.messages.map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
        { role: 'user' as const, content: context },
      ];

      // 3. 调用AI
      const aiResponse = await this.aiClient.sendCustomMessage(messages, {
        temperature: request.config?.temperature || 0.4,
        maxTokens: request.config?.maxTokens || 2000,
      });

      // 4. 构建响应
      const response: AgentResponse = {
        messageId: `msg-${Date.now()}`,
        content: aiResponse.content,
        suggestions: this.extractSuggestions(aiResponse.content),
        metadata: {
          tokensUsed: aiResponse.tokensUsed.total,
          cost: aiResponse.cost.total,
          duration: aiResponse.duration,
        },
      };

      console.log('✅ 合同智能体响应完成:', {
        contentLength: response.content.length,
        tokensUsed: response.metadata.tokensUsed,
        cost: `¥${response.metadata.cost.toFixed(4)}`,
      });

      return response;
    } catch (error) {
      console.error('❌ 合同智能体失败:', error);
      throw error;
    }
  }

  /**
   * 发送流式消息
   */
  async *sendMessageStream(request: AgentRequest): AsyncIterable<ChatStreamChunk> {
    try {
      console.log('📤 合同智能体流式请求:', {
        sessionId: request.sessionId,
        queryLength: request.currentQuery.length,
      });

      // 1. 构建上下文
      const context = this.buildContext(request);

      // 2. 构建消息列表
      const messages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...request.messages.map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
        { role: 'user' as const, content: context },
      ];

      // 3. 流式调用AI
      for await (const chunk of this.aiClient.sendCustomMessageStream(messages, {
        temperature: request.config?.temperature || 0.4,
        maxTokens: request.config?.maxTokens || 2000,
      })) {
        yield chunk;
      }

      console.log('✅ 合同智能体流式响应完成');
    } catch (error) {
      console.error('❌ 合同智能体流式失败:', error);
      throw error;
    }
  }

  /**
   * 构建对话上下文（使用ContextFormatter）
   */
  private buildContext(request: AgentRequest): string {
    const { contractContext, currentQuery, messages } = request;

    // 使用context-manager的XML格式
    return ContextFormatter.format({
      contract: contractContext.contractText,
      current: currentQuery,
      conversation: messages.slice(-5).map((m) => `${m.role}: ${m.content}`),
      risks: contractContext.risks?.map((r) => r.description) || [],
      clause: contractContext.currentClause || '无特定条款',
    });
  }

  /**
   * 从AI响应中提取建议
   */
  private extractSuggestions(content: string): AgentResponse['suggestions'] {
    // 提取快捷回复（TODO: 可以用更智能的方式）
    const quickReplies: string[] = [];

    // 简单的启发式规则
    if (content.includes('建议')) {
      quickReplies.push('具体怎么改？');
    }
    if (content.includes('风险')) {
      quickReplies.push('最坏的情况是什么？');
    }
    if (content.includes('法律依据') || content.includes('民法典')) {
      quickReplies.push('有相关案例吗？');
    }

    return {
      quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
    };
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    return this.aiClient.getUsageStats();
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.aiClient.resetStats();
  }
}
