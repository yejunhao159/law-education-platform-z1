/**
 * SSE连接管理器
 * @description 管理课堂的SSE连接，负责连接维护和消息广播
 */

import { SSEMessage, SSEEventType, HeartbeatData } from './types';

/**
 * SSE连接信息
 */
interface ConnectionInfo {
  response: Response;
  studentId?: string;
  connectedAt: number;
  lastHeartbeat: number;
}

/**
 * SSE连接管理器
 */
export class SSEConnectionManager {
  private connections = new Map<string, Map<string, ConnectionInfo>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private static instance: SSEConnectionManager;

  private constructor() {
    this.startHeartbeat();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SSEConnectionManager {
    if (!SSEConnectionManager.instance) {
      SSEConnectionManager.instance = new SSEConnectionManager();
    }
    return SSEConnectionManager.instance;
  }

  /**
   * 添加SSE连接
   */
  addConnection(
    classroomId: string,
    connectionId: string,
    response: Response,
    studentId?: string
  ): void {
    if (!this.connections.has(classroomId)) {
      this.connections.set(classroomId, new Map());
    }

    const classroomConnections = this.connections.get(classroomId)!;
    classroomConnections.set(connectionId, {
      response,
      studentId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now()
    });

    console.log(`SSE连接已建立: 课堂${classroomId}, 连接${connectionId}, 学生${studentId || '未知'}`);
    console.log(`当前课堂连接数: ${classroomConnections.size}`);
  }

  /**
   * 移除SSE连接
   */
  removeConnection(classroomId: string, connectionId: string): void {
    const classroomConnections = this.connections.get(classroomId);
    if (classroomConnections) {
      classroomConnections.delete(connectionId);

      console.log(`SSE连接已断开: 课堂${classroomId}, 连接${connectionId}`);
      console.log(`剩余课堂连接数: ${classroomConnections.size}`);

      // 如果课堂没有连接了，清理课堂记录
      if (classroomConnections.size === 0) {
        this.connections.delete(classroomId);
        console.log(`课堂${classroomId}所有连接已断开，已清理`);
      }
    }
  }

  /**
   * 向指定课堂广播消息
   */
  broadcast(classroomId: string, message: SSEMessage): number {
    const classroomConnections = this.connections.get(classroomId);
    if (!classroomConnections) {
      return 0;
    }

    const sseData = this.formatSSEMessage(message);
    let successCount = 0;
    const failedConnections: string[] = [];

    for (const [connectionId, connectionInfo] of Array.from(classroomConnections.entries())) {
      try {
        // 尝试发送SSE消息
        try {
          const encoder = new TextEncoder();
          // 直接使用模拟的writer进行写入
          (connectionInfo.response as any).write?.(encoder.encode(sseData));

          successCount++;
          // 更新心跳时间
          connectionInfo.lastHeartbeat = Date.now();
        } catch (writeError) {
          console.error(`写入连接${connectionId}失败:`, writeError);
          failedConnections.push(connectionId);
        }
      } catch (error) {
        console.error(`向连接${connectionId}发送消息失败:`, error);
        failedConnections.push(connectionId);
      }
    }

    // 清理失败的连接
    failedConnections.forEach(connectionId => {
      this.removeConnection(classroomId, connectionId);
    });

    console.log(`课堂${classroomId}消息广播完成: 成功${successCount}, 失败${failedConnections.length}`);
    return successCount;
  }

  /**
   * 向指定学生发送消息
   */
  sendToStudent(classroomId: string, studentId: string, message: SSEMessage): boolean {
    const classroomConnections = this.connections.get(classroomId);
    if (!classroomConnections) {
      return false;
    }

    for (const [connectionId, connectionInfo] of Array.from(classroomConnections.entries())) {
      if (connectionInfo.studentId === studentId) {
        const sseData = this.formatSSEMessage(message);

        try {
          const encoder = new TextEncoder();
          // 直接使用模拟的writer进行写入
          (connectionInfo.response as any).write?.(encoder.encode(sseData));

          connectionInfo.lastHeartbeat = Date.now();
          return true;
        } catch (error) {
          console.error(`向学生${studentId}发送消息失败:`, error);
          this.removeConnection(classroomId, connectionId);
        }
        break;
      }
    }

    return false;
  }

  /**
   * 获取课堂连接统计
   */
  getClassroomStats(classroomId: string): {
    totalConnections: number;
    studentConnections: number;
    teacherConnections: number;
  } {
    const classroomConnections = this.connections.get(classroomId);
    if (!classroomConnections) {
      return { totalConnections: 0, studentConnections: 0, teacherConnections: 0 };
    }

    let studentConnections = 0;
    let teacherConnections = 0;

    for (const connectionInfo of Array.from(classroomConnections.values())) {
      if (connectionInfo.studentId) {
        studentConnections++;
      } else {
        teacherConnections++;
      }
    }

    return {
      totalConnections: classroomConnections.size,
      studentConnections,
      teacherConnections
    };
  }

  /**
   * 获取所有课堂的连接统计
   */
  getAllStats(): Record<string, {
    totalConnections: number;
    studentConnections: number;
    teacherConnections: number;
  }> {
    const stats: Record<string, any> = {};

    for (const classroomId of Array.from(this.connections.keys())) {
      stats[classroomId] = this.getClassroomStats(classroomId);
    }

    return stats;
  }

  /**
   * 格式化SSE消息
   */
  private formatSSEMessage(message: SSEMessage): string {
    const lines = [
      `event: ${message.type}`,
      `data: ${JSON.stringify(message)}`,
      '', // 空行结束消息
      ''
    ];
    return lines.join('\n');
  }

  /**
   * 启动心跳机制
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const heartbeatTimeout = 30000; // 30秒超时

      for (const [classroomId, classroomConnections] of Array.from(this.connections.entries())) {
        const expiredConnections: string[] = [];

        // 检查超时连接
        for (const [connectionId, connectionInfo] of Array.from(classroomConnections.entries())) {
          if (now - connectionInfo.lastHeartbeat > heartbeatTimeout) {
            expiredConnections.push(connectionId);
          }
        }

        // 清理超时连接
        expiredConnections.forEach(connectionId => {
          this.removeConnection(classroomId, connectionId);
        });

        // 发送心跳消息给活跃连接
        if (classroomConnections.size > 0) {
          const heartbeatMessage: SSEMessage = {
            type: SSEEventType.HEARTBEAT,
            timestamp: now,
            classroomId,
            data: {
              timestamp: now,
              connectionCount: classroomConnections.size
            } as HeartbeatData
          };

          this.broadcast(classroomId, heartbeatMessage);
        }
      }
    }, 10000); // 每10秒执行一次心跳检查
  }

  /**
   * 停止心跳机制
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 清理所有连接
   */
  cleanup(): void {
    this.stopHeartbeat();
    this.connections.clear();
    console.log('SSE连接管理器已清理');
  }
}