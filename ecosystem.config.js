/**
 * PM2 进程管理配置
 * @description 同时管理Next.js和Socket.IO两个进程
 * @author Sean - PromptX
 */

module.exports = {
  apps: [
    // ============================================
    // App 1: Next.js 主应用（3000端口）
    // ============================================
    {
      name: 'nextjs-app',
      script: 'node',
      args: 'server.js',
      cwd: '/app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      // 自动重启配置
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // 日志配置
      error_file: '/app/logs/nextjs-error.log',
      out_file: '/app/logs/nextjs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 健康检查
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },

    // ============================================
    // App 2: Socket.IO 实时通信服务（3001端口）
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
