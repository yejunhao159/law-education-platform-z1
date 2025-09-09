/**
 * WebSocket服务导出
 * @description 统一导出WebSocket相关服务
 */

export { SocketServer } from './socket-server'

// 类型导出
export type {
  ServerToClientEvents,
  ClientToServerEvents
} from './socket-server'

// WebSocket服务器实例（全局单例）
let socketServerInstance: SocketServer | null = null

/**
 * 获取WebSocket服务器实例
 */
export function getSocketServer(): SocketServer | null {
  return socketServerInstance
}

/**
 * 设置WebSocket服务器实例
 */
export function setSocketServer(server: SocketServer): void {
  socketServerInstance = server
}

/**
 * 清除WebSocket服务器实例
 */
export function clearSocketServer(): void {
  if (socketServerInstance) {
    socketServerInstance.close()
    socketServerInstance = null
  }
}