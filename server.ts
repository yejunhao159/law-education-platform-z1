/**
 * 自定义Next.js服务器
 * @description 集成Socket.IO WebSocket服务器
 */

import { createServer } from 'http'
import next from 'next'
import { SocketServer, setSocketServer } from './lib/services/websocket'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  // 初始化WebSocket服务器
  const socketServer = new SocketServer(httpServer)
  setSocketServer(socketServer)

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server running on port ${port}`)
  })

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully')
    socketServer.close()
    process.exit(0)
  })

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully')
    socketServer.close()
    process.exit(0)
  })
})