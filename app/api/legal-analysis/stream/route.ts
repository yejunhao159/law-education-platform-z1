/**
 * 流式法律分析API示例
 * 展示如何使用流式输出提升用户体验
 * POST /api/legal-analysis/stream
 */

import { NextRequest } from 'next/server';
import { callUnifiedAIStream } from '@/src/infrastructure/ai/AICallProxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, analysisType = 'general' } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: '请提供分析内容' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 根据分析类型选择系统提示词
    const systemPrompts = {
      dispute: '你是专业的法律争议分析专家，精通识别和分析法律争议焦点。',
      claim: '你是专业的请求权分析专家，精通德国法学请求权分析方法。',
      evidence: '你是专业的证据分析专家，精通证据链构建和证据质量评估。',
      general: '你是专业的法律分析助手，精通中国法律体系和案例分析。'
    };

    const systemPrompt = systemPrompts[analysisType as keyof typeof systemPrompts] || systemPrompts.general;

    // 创建文本编码器
    const encoder = new TextEncoder();

    // 创建可读流
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送初始SSE事件
          controller.enqueue(encoder.encode('data: {"type":"start","message":"开始分析..."}\n\n'));

          // 收集完整响应用于后续处理
          let fullResponse = '';

          // 调用流式AI
          const aiStream = await callUnifiedAIStream(systemPrompt, prompt, {
            temperature: 0.7,
            maxTokens: 2000,
            onChunk: (chunk) => {
              fullResponse += chunk;
              // 发送流式数据
              const sseData = JSON.stringify({
                type: 'chunk',
                content: chunk
              });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            }
          });

          // 处理流式响应
          for await (const chunk of aiStream) {
            // onChunk回调已处理，这里可以做额外处理
          }

          // 发送完成事件
          controller.enqueue(encoder.encode('data: {"type":"complete","message":"分析完成"}\n\n'));

          // 关闭流
          controller.close();
        } catch (error) {
          console.error('流式处理错误:', error);
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : '处理失败'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    // 返回SSE响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error('API错误:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : '内部服务器错误'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}