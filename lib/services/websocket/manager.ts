/**
 * WebSocket连接管理器
 * 管理WebSocket连接和状态
 */

import { createLogger } from '@/lib/logging';

const logger = createLogger('websocket-manager');

export interface WebSocketConnection {
  id: string;
  userId?: string;
  classroomId?: string;
  connectedAt: Date;
  lastActivity: Date;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private classroomConnections: Map<string, Set<string>> = new Map();

  private constructor() {
    this.startCleanupInterval();
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * 添加连接
   */
  addConnection(id: string, userId?: string, classroomId?: string): void {
    const connection: WebSocketConnection = {
      id,
      userId,
      classroomId,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    this.connections.set(id, connection);

    // 更新用户连接映射
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(id);
    }

    // 更新教室连接映射
    if (classroomId) {
      if (!this.classroomConnections.has(classroomId)) {
        this.classroomConnections.set(classroomId, new Set());
      }
      this.classroomConnections.get(classroomId)!.add(id);
    }

    logger.info('WebSocket连接已添加', { id, userId, classroomId });
  }

  /**
   * 移除连接
   */
  removeConnection(id: string): void {
    const connection = this.connections.get(id);
    if (!connection) return;

    // 从用户连接映射中移除
    if (connection.userId) {
      const userConns = this.userConnections.get(connection.userId);
      if (userConns) {
        userConns.delete(id);
        if (userConns.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    // 从教室连接映射中移除
    if (connection.classroomId) {
      const classroomConns = this.classroomConnections.get(connection.classroomId);
      if (classroomConns) {
        classroomConns.delete(id);
        if (classroomConns.size === 0) {
          this.classroomConnections.delete(connection.classroomId);
        }
      }
    }

    this.connections.delete(id);
    logger.info('WebSocket连接已移除', { id });
  }

  /**
   * 更新连接活动时间
   */
  updateActivity(id: string): void {
    const connection = this.connections.get(id);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * 获取连接信息
   */
  getConnection(id: string): WebSocketConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * 获取用户的所有连接
   */
  getUserConnections(userId: string): string[] {
    const connections = this.userConnections.get(userId);
    return connections ? Array.from(connections) : [];
  }

  /**
   * 获取教室的所有连接
   */
  getClassroomConnections(classroomId: string): string[] {
    const connections = this.classroomConnections.get(classroomId);
    return connections ? Array.from(connections) : [];
  }

  /**
   * 获取活跃连接数
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 获取用户数
   */
  getUniqueUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * 获取教室数
   */
  getActiveClassroomCount(): number {
    return this.classroomConnections.size;
  }

  /**
   * 获取所有连接状态
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 检查连接是否活跃
   */
  isConnectionActive(id: string, maxInactiveMs: number = 60000): boolean {
    const connection = this.connections.get(id);
    if (!connection) return false;

    const now = Date.now();
    const lastActivity = connection.lastActivity.getTime();
    return (now - lastActivity) < maxInactiveMs;
  }

  /**
   * 清理不活跃的连接
   */
  cleanupInactiveConnections(maxInactiveMs: number = 300000): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [id, connection] of this.connections.entries()) {
      const lastActivity = connection.lastActivity.getTime();
      if ((now - lastActivity) > maxInactiveMs) {
        this.removeConnection(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`清理了 ${removedCount} 个不活跃的WebSocket连接`);
    }

    return removedCount;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalConnections: number;
    uniqueUsers: number;
    activeClassrooms: number;
    connectionsPerUser: Record<string, number>;
    connectionsPerClassroom: Record<string, number>;
  } {
    const connectionsPerUser: Record<string, number> = {};
    for (const [userId, connections] of this.userConnections.entries()) {
      connectionsPerUser[userId] = connections.size;
    }

    const connectionsPerClassroom: Record<string, number> = {};
    for (const [classroomId, connections] of this.classroomConnections.entries()) {
      connectionsPerClassroom[classroomId] = connections.size;
    }

    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      activeClassrooms: this.classroomConnections.size,
      connectionsPerUser,
      connectionsPerClassroom
    };
  }

  /**
   * 启动清理定时器
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 重置管理器（用于测试）
   */
  reset(): void {
    this.connections.clear();
    this.userConnections.clear();
    this.classroomConnections.clear();
  }
}