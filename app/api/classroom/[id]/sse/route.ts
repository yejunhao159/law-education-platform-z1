/**
 * SSE API路由
 * @description 处理课堂的Server-Sent Events连接
 */

import { NextRequest } from 'next/server';
import { SSEConnectionManager } from '../../../../../src/lib/sse/connection-manager';
import { SSEEventType, ConnectionEstablishedData } from '../../../../../src/lib/sse/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET处理器 - 建立SSE连接
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: classroomId } = await params;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  // 生成连接ID
  const connectionId = uuidv4();

  console.log(`SSE连接请求 - 课堂: ${classroomId}, 学生: ${studentId || '教师'}, 连接: ${connectionId}`);

  // 验证课堂ID
  if (!classroomId || classroomId.length < 6) {
    return new Response('Invalid classroom ID', { status: 400 });
  }

  // 创建ReadableStream进行SSE响应
  const stream = new ReadableStream({
    start(controller) {
      console.log(`开始SSE流 - 连接${connectionId}`);

      // 设置响应头
      const encoder = new TextEncoder();

      // 发送连接建立事件
      const establishedMessage = {
        type: SSEEventType.CONNECTION_ESTABLISHED,
        timestamp: Date.now(),
        classroomId,
        data: {
          connectionId,
          classroomId,
          timestamp: Date.now()
        } as ConnectionEstablishedData
      };

      const sseData = [
        `event: ${establishedMessage.type}`,
        `data: ${JSON.stringify(establishedMessage)}`,
        '',
        ''
      ].join('\n');

      controller.enqueue(encoder.encode(sseData));

      // 注册连接到管理器
      const connectionManager = SSEConnectionManager.getInstance();

      // 创建模拟Response对象用于连接管理
      const mockResponse = {
        body: {
          locked: false,
          getWriter: () => ({
            write: (chunk: Uint8Array) => {
              controller.enqueue(chunk);
            },
            releaseLock: () => {}
          })
        },
        write: (chunk: Uint8Array) => {
          controller.enqueue(chunk);
        }
      } as unknown as Response;

      connectionManager.addConnection(classroomId, connectionId, mockResponse, studentId || undefined);

      // 保持连接活跃
      const keepAlive = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          console.error(`心跳发送失败 - 连接${connectionId}:`, error);
          clearInterval(keepAlive);
          connectionManager.removeConnection(classroomId, connectionId);
        }
      }, 15000); // 每15秒发送心跳

      // 连接关闭处理
      request.signal.addEventListener('abort', () => {
        console.log(`SSE连接已关闭 - 连接${connectionId}`);
        clearInterval(keepAlive);
        connectionManager.removeConnection(classroomId, connectionId);

        try {
          controller.close();
        } catch (error) {
          console.error(`关闭SSE流失败 - 连接${connectionId}:`, error);
        }
      });
    },

    cancel() {
      console.log(`SSE流已取消 - 连接${connectionId}`);
      const connectionManager = SSEConnectionManager.getInstance();
      connectionManager.removeConnection(classroomId, connectionId);
    }
  });

  // 返回SSE响应
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no' // 禁用nginx缓冲
    }
  });
}

/**
 * OPTIONS处理器 - 处理CORS预检请求
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
      'Access-Control-Max-Age': '86400'
    }
  });
}