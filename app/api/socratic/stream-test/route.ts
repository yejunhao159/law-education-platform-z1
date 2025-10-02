/**
 * 苏格拉底对话 - ai-chat流式测试
 * 测试使用ai-chat 0.5.0的真正流式输出
 */

import { NextRequest } from 'next/server';
import { AIChat } from '@deepracticex/ai-chat';
import { FullPromptBuilder } from '@/domains/socratic-dialogue/services/FullPromptBuilder';
import { ContextFormatter } from '@deepracticex/context-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentTopic, caseContext, messages = [], level = 'intermediate', mode = 'exploration' } = body;

    console.log('🧪 [ai-chat流式测试] 请求参数:', {
      currentTopic,
      hasCase: !!caseContext,
      messagesCount: messages.length,
      level,
      mode
    });

    // 1. 构建System Prompt（全量注入）
    const systemPrompt = FullPromptBuilder.buildFullSystemPrompt({
      mode: mode as any,
      difficulty: level === 'beginner' ? 'basic' : level === 'advanced' ? 'advanced' : 'intermediate',
      topic: currentTopic,
      includeDiagnostics: false
    });

    console.log('📝 [ai-chat流式测试] System Prompt长度:', systemPrompt.length);

    // 2. 构建User Prompt（XML格式化）
    const userPrompt = ContextFormatter.format({
      current: currentTopic ? `当前讨论主题：${currentTopic}` : '开始新的讨论',
      conversation: messages.length > 0
        ? messages.map((m: any) => `${m.role === 'user' ? '学生' : '导师'}: ${m.content}`)
        : ['这是对话的开始'],
      case: caseContext || '无特定案例',
      topic: currentTopic || '法学基础讨论'
    });

    console.log('📝 [ai-chat流式测试] User Prompt长度:', userPrompt.length);

    // 3. 创建ai-chat客户端
    const aiChat = new AIChat({
      baseUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY!,
      temperature: 0.7,
      maxTokens: 1200,
      timeout: 90000  // 90秒超时
    });

    console.log('✅ [ai-chat流式测试] AIChat实例创建成功');

    // 4. 准备消息
    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    // 5. 创建SSE流 - 真正的流式输出！
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🚀 [ai-chat流式测试] 开始流式输出...');

          let tokenCount = 0;
          let startTime = Date.now();

          // 使用ai-chat的流式迭代器
          for await (const chunk of aiChat.sendMessage(aiMessages, {
            temperature: 0.7,
            maxTokens: 1200
          })) {
            // 实时发送每个chunk
            if (chunk.content) {
              tokenCount++;
              const sseData = `data: ${JSON.stringify({
                content: chunk.content,
                tokenIndex: tokenCount
              })}\n\n`;
              controller.enqueue(encoder.encode(sseData));

              // 每10个token打印一次进度
              if (tokenCount % 10 === 0) {
                console.log(`📊 [ai-chat流式测试] 已输出${tokenCount}个tokens`);
              }
            }

            if (chunk.phase) {
              const phaseData = `data: ${JSON.stringify({
                phase: chunk.phase
              })}\n\n`;
              controller.enqueue(encoder.encode(phaseData));
              console.log(`🔄 [ai-chat流式测试] 阶段变化: ${chunk.phase}`);
            }

            if (chunk.usage) {
              console.log('📈 [ai-chat流式测试] Token使用:', chunk.usage);
            }

            if (chunk.error) {
              console.error('❌ [ai-chat流式测试] 错误:', chunk.error);
              const errorData = `data: ${JSON.stringify({ error: chunk.error })}\n\n`;
              controller.enqueue(encoder.encode(errorData));
              break;
            }

            if (chunk.done) {
              const duration = Date.now() - startTime;
              console.log('✅ [ai-chat流式测试] 完成!', {
                totalTokens: tokenCount,
                duration: `${duration}ms`,
                tokensPerSecond: (tokenCount / (duration / 1000)).toFixed(2)
              });

              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }
          }

          controller.close();
        } catch (error) {
          console.error('❌ [ai-chat流式测试] 流式处理错误:', error);
          const errorData = `data: ${JSON.stringify({
            error: error instanceof Error ? error.message : '未知错误'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'  // 禁用Nginx缓冲
      }
    });

  } catch (error) {
    console.error('❌ [ai-chat流式测试] 请求处理错误:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : '未知错误'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
