/**
 * 统一启动脚本 - 方案C：极简架构
 * @description 在单个Node.js进程中运行Next.js和Socket.IO
 * @author Sean - PromptX
 *
 * 架构哲学：
 * - 奥卡姆剃刀：如无必要，勿增实体
 * - Docker哲学：一个容器一个进程
 * - 简单优于复杂：能用一层解决，就不用两层
 *
 * 职责：
 * - 启动Next.js服务器（3000端口）
 * - 启动Socket.IO服务器（3001端口）
 * - 优雅关闭处理
 * - 统一日志输出
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

// =============================================================================
// 环境配置
// =============================================================================
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const socketPort = parseInt(process.env.SOCKET_PORT || '3001', 10);

// =============================================================================
// Next.js 应用初始化
// =============================================================================
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// =============================================================================
// Socket.IO 数据存储（内存）
// =============================================================================
const questions = new Map();
const answers = new Map();

const storage = {
  setQuestion: (code, question) => questions.set(code, question),
  getQuestion: (code) => questions.get(code),
  addAnswer: (code, answer) => {
    const list = answers.get(code) || [];
    list.push(answer);
    answers.set(code, list);
  },
  getAnswers: (code) => answers.get(code) || []
};

// =============================================================================
// 启动服务
// =============================================================================
app.prepare().then(() => {
  // ---------------------------------------------------------------------------
  // 1. 启动Next.js服务器（3000端口）
  // ---------------------------------------------------------------------------
  const nextServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ [Next.js] 请求处理错误:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  nextServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  ✅ Next.js 服务器已启动                                  ║
║  🌐 地址: http://${hostname}:${port}                      ║
║  📦 环境: ${dev ? 'development' : 'production'}           ║
╚════════════════════════════════════════════════════════════╝
    `);
  });

  // ---------------------------------------------------------------------------
  // 2. 启动Socket.IO服务器（3001端口）
  // ---------------------------------------------------------------------------
  const socketServer = createServer();
  const io = new Server(socketServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? [
            'http://115.29.191.180:3000',
            'https://115.29.191.180:3000',
            'http://legal-education.deepracticex.com',
            'https://legal-education.deepracticex.com',
            'http://deepractice.ai',
            'https://deepractice.ai'
          ]
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Socket.IO 连接计数
  let connectionCount = 0;

  // Socket.IO 事件处理
  io.on('connection', (socket) => {
    connectionCount++;
    console.log(`✅ [Socket.IO] 客户端已连接 ID=${socket.id} | 总连接数=${connectionCount}`);

    // 加入课堂房间
    socket.on('join-classroom', (code) => {
      socket.join(code);
      console.log(`📚 [Room] Socket ${socket.id} 加入课堂 ${code}`);

      socket.emit('joined', {
        code,
        message: `已加入课堂 ${code}`,
        timestamp: new Date().toISOString()
      });

      const roomSize = io.sockets.adapter.rooms.get(code)?.size || 0;
      io.to(code).emit('room-update', {
        code,
        participantCount: roomSize
      });
    });

    // 教师发布问题
    socket.on('publish-question', ({ code, question }) => {
      console.log(`📝 [Question] 课堂 ${code} 发布问题:`, question.content?.substring(0, 50) + '...' || '');

      storage.setQuestion(code, question);
      io.to(code).emit('new-question', question);

      socket.emit('question-published', {
        success: true,
        question
      });
    });

    // 学生提交答案
    socket.on('submit-answer', ({ code, answer }) => {
      console.log(`💬 [Answer] 课堂 ${code} 收到答案:`, answer.answer?.substring(0, 30) || '');

      storage.addAnswer(code, answer);
      io.to(code).emit('new-answer', answer);

      socket.emit('answer-submitted', {
        success: true,
        timestamp: new Date().toISOString()
      });
    });

    // 离开课堂房间
    socket.on('leave-classroom', (code) => {
      socket.leave(code);
      console.log(`👋 [Room] Socket ${socket.id} 离开课堂 ${code}`);

      const roomSize = io.sockets.adapter.rooms.get(code)?.size || 0;
      io.to(code).emit('room-update', {
        code,
        participantCount: roomSize
      });
    });

    // 断线事件
    socket.on('disconnect', (reason) => {
      connectionCount--;
      console.log(`❌ [Socket.IO] 客户端断开 ID=${socket.id} | 原因=${reason} | 剩余=${connectionCount}`);
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error(`⚠️  [Socket.IO] Socket ${socket.id} 错误:`, error);
    });
  });

  // Socket.IO 引擎错误处理
  io.engine.on('connection_error', (err) => {
    console.error('❌ [Engine.IO] 连接错误:', err);
  });

  socketServer.listen(socketPort, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Socket.IO 服务器已启动                                ║
║  📡 监听端口: ${socketPort}                                   ║
║  🔗 WebSocket路径: ws://${hostname}:${socketPort}         ║
║  🌐 传输方式: WebSocket (优先), Polling (降级)           ║
║  ⚡ Ping间隔: 25秒 | 超时: 60秒                          ║
╚════════════════════════════════════════════════════════════╝
    `);
  });

  // ---------------------------------------------------------------------------
  // 3. 优雅关闭处理
  // ---------------------------------------------------------------------------
  const gracefulShutdown = (signal) => {
    console.log(`\n📥 收到${signal}信号，开始优雅关闭...`);

    // 关闭Socket.IO服务器
    io.close(() => {
      console.log('✅ Socket.IO服务器已关闭');

      // 关闭Next.js服务器
      nextServer.close(() => {
        console.log('✅ Next.js服务器已关闭');
        console.log('👋 服务已完全关闭');
        process.exit(0);
      });
    });

    // 如果10秒内没有优雅关闭，强制退出
    setTimeout(() => {
      console.error('⚠️  优雅关闭超时，强制退出');
      process.exit(1);
    }, 10000);
  };

  // 监听终止信号
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 未捕获的异常处理
  process.on('uncaughtException', (err) => {
    console.error('❌ [Fatal] 未捕获的异常:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [Fatal] 未处理的Promise拒绝:', reason);
    process.exit(1);
  });

  // ---------------------------------------------------------------------------
  // 启动成功横幅
  // ---------------------------------------------------------------------------
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🎉 法学教育平台启动成功！                                 ║
║                                                            ║
║  📚 Next.js:   http://${hostname}:${port}                    ║
║  📡 Socket.IO: ws://${hostname}:${socketPort}                ║
║                                                            ║
║  🎯 架构: 极简单进程（移除PM2，统一管理）                 ║
║  🐳 进程管理: Docker（重启、日志、健康检查）              ║
║  🚀 优势: 简单、可靠、易维护                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// =============================================================================
// 启动失败处理
// =============================================================================
app.prepare().catch((err) => {
  console.error('❌ [Fatal] Next.js启动失败:', err);
  process.exit(1);
});
