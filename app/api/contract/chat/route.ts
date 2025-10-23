/**
 * 合同智能体对话API
 * POST /api/contract/chat
 *
 * 功能：
 * 1. 接收用户问题
 * 2. 调用ContractAgentService生成回答
 * 3. 支持流式和非流式两种模式
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContractAgentService } from '@/src/domains/contract-analysis/services/ContractAgentService';
import type { AgentRequest } from '@/src/domains/contract-analysis/types/agent';

/**
 * POST 请求处理器
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await req.json();
    const { sessionId, userId, messages = [], currentQuery, contractContext, config } = body;

    // 2. 验证输入
    if (!currentQuery || typeof currentQuery !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: '缺少用户问题',
          message: '请提供有效的问题内容',
        },
        { status: 400 }
      );
    }

    if (!contractContext || !contractContext.contractText) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少合同上下文',
          message: '请先上传合同文档',
        },
        { status: 400 }
      );
    }

    console.log(`💬 收到合同对话请求, Session: ${sessionId}, Query: ${currentQuery.substring(0, 50)}...`);

    // 3. 构建请求对象
    const agentRequest: AgentRequest = {
      sessionId: sessionId || `session-${Date.now()}`,
      userId,
      messages: messages.map((m: any) => ({
        id: m.id || `msg-${Date.now()}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      })),
      currentQuery,
      contractContext: {
        contractId: contractContext.contractId || 'unknown',
        contractText: contractContext.contractText,
        parsedContract: contractContext.parsedContract,
        currentClause: contractContext.currentClause,
        risks: contractContext.risks,
      },
      config: {
        enableMCP: config?.enableMCP ?? false,  // 默认关闭MCP
        maxTokens: config?.maxTokens || 2000,
        temperature: config?.temperature || 0.4,
        streaming: config?.streaming ?? false,
      },
    };

    // 4. 判断是否使用流式模式
    if (config?.streaming) {
      return handleStreamingRequest(agentRequest);
    } else {
      return handleNormalRequest(agentRequest);
    }
  } catch (error) {
    console.error('❌ 合同对话API错误:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return NextResponse.json(
      {
        success: false,
        error: 'CHAT_FAILED',
        message: '对话失败，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * 处理非流式请求
 */
async function handleNormalRequest(request: AgentRequest) {
  const agentService = new ContractAgentService();
  const response = await agentService.sendMessage(request);

  return NextResponse.json({
    success: true,
    data: {
      message: {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
      },
      suggestions: response.suggestions,
      metadata: response.metadata,
    },
  });
}

/**
 * 处理流式请求（SSE）
 */
async function handleStreamingRequest(request: AgentRequest) {
  const agentService = new ContractAgentService();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = '';

        // 流式输出
        for await (const chunk of agentService.sendMessageStream(request)) {
          if (chunk.content) {
            fullContent += chunk.content;
            const sseData = `data: ${JSON.stringify({
              content: chunk.content,
              fullContent: fullContent,
            })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }

          if (chunk.usage) {
            const usageData = `data: ${JSON.stringify({
              usage: chunk.usage,
            })}\n\n`;
            controller.enqueue(encoder.encode(usageData));
          }

          if (chunk.error) {
            const errorData = `data: ${JSON.stringify({
              error: chunk.error,
            })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            break;
          }

          if (chunk.done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            break;
          }
        }

        controller.close();
      } catch (error) {
        console.error('❌ 流式处理错误:', error);
        const errorData = `data: ${JSON.stringify({
          error: error instanceof Error ? error.message : '未知错误',
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * GET 请求处理器 - 返回API信息
 */
export async function GET() {
  return NextResponse.json({
    service: 'Contract AI Chat API',
    version: '1.0.0',
    endpoints: {
      chat: {
        method: 'POST',
        path: '/api/contract/chat',
        description: '与合同智能体对话',
        features: {
          streaming: true,
          mcp: false,  // 当前版本未启用
        },
      },
    },
    status: 'active',
  });
}
