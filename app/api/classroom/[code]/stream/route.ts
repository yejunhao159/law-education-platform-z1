/**
 * SSE流式API - 推送教师问题到学生端
 */
import { NextRequest } from 'next/server';
import { storage } from '../storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const encoder = new TextEncoder();

  // 创建可读流
  const stream = new ReadableStream({
    async start(controller) {
      // 发送初始连接消息
      const initData = `data: ${JSON.stringify({
        type: 'connected',
        message: '已连接到课堂',
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initData));

      // 定时检查是否有新问题
      const interval = setInterval(() => {
        const question = storage.getQuestion(code);

        if (question) {
          const data = `data: ${JSON.stringify({
            type: 'question',
            question,
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
        } else {
          // 发送心跳保持连接
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        }
      }, 2000); // 每2秒检查一次

      // 监听连接关闭
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用nginx缓冲
    },
  });
}
