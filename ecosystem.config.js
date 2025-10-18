/**
 * PM2 进程管理配置 - 方案A优化版
 * @description PM2只管理Socket.IO进程，Next.js由Docker原生管理
 * @author Sean - PromptX
 *
 * 架构说明：
 * - Socket.IO: PM2管理（需要进程守护，独立3001端口）
 * - Next.js: npm start直接运行（Docker容器管理，3000端口）
 *
 * 职责分离：
 * - PM2负责：Socket.IO的自动重启和日志管理
 * - Docker负责：Next.js的进程监控和容器重启
 */

module.exports = {
  apps: [
    // ============================================
    // Socket.IO 实时通信服务（3001端口）
    // ============================================
    {
      name: 'socketio-server',
      script: 'server/socket-server.js',
      cwd: '/app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      // 自动重启配置
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      // 日志配置
      error_file: '/app/logs/socketio-error.log',
      out_file: '/app/logs/socketio-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 健康检查
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};
