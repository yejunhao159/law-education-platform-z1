/**
 * Socket.IO 实时通信服务器
 * @description 独立运行在3001端口，提供课堂实时互动功能
 * @author Sean - PromptX
 */

const { Server } = require('socket.io');

// ✅ 内存存储（独立服务，不依赖Next.js）
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

// 创建Socket.IO服务器
const io = new Server(3001, {
  cors: {
    // 开发环境：允许所有来源（方便调试）
    // 生产环境：限制为具体域名（安全）
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
  // 连接配置
  pingTimeout: 60000,
  pingInterval: 25000,
  // 传输方式（优先WebSocket）
  transports: ['websocket', 'polling']
});

// 连接计数器
let connectionCount = 0;

// 连接事件
io.on('connection', (socket) => {
  connectionCount++;
  console.log(`✅ [Socket.IO] 客户端已连接 ID=${socket.id} | 总连接数=${connectionCount}`);

  // 1. 加入课堂房间
  socket.on('join-classroom', (code) => {
    socket.join(code);
    console.log(`📚 [Room] Socket ${socket.id} 加入课堂 ${code}`);

    // 发送欢迎消息
    socket.emit('joined', {
      code,
      message: `已加入课堂 ${code}`,
      timestamp: new Date().toISOString()
    });

    // 发送当前房间人数
    const roomSize = io.sockets.adapter.rooms.get(code)?.size || 0;
    io.to(code).emit('room-update', {
      code,
      participantCount: roomSize
    });
  });

  // 2. 教师发布问题
  socket.on('publish-question', ({ code, question }) => {
    console.log(`📝 [Question] 课堂 ${code} 发布问题:`, question.content.substring(0, 50) + '...');

    // 保存到存储
    storage.setQuestion(code, question);

    // 实时推送给课堂内所有学生
    io.to(code).emit('new-question', question);

    // 确认发布成功
    socket.emit('question-published', {
      success: true,
      question
    });
  });

  // 3. 学生提交答案
  socket.on('submit-answer', ({ code, answer }) => {
    console.log(`💬 [Answer] 课堂 ${code} 收到答案:`, answer.answer?.substring(0, 30) || answer);

    // 保存到存储
    storage.addAnswer(code, answer);

    // 实时推送给课堂内所有人（特别是教师）
    io.to(code).emit('new-answer', answer);

    // 确认提交成功
    socket.emit('answer-submitted', {
      success: true,
      timestamp: new Date().toISOString()
    });
  });

  // 4. 离开课堂房间
  socket.on('leave-classroom', (code) => {
    socket.leave(code);
    console.log(`👋 [Room] Socket ${socket.id} 离开课堂 ${code}`);

    // 更新房间人数
    const roomSize = io.sockets.adapter.rooms.get(code)?.size || 0;
    io.to(code).emit('room-update', {
      code,
      participantCount: roomSize
    });
  });

  // 5. 断线事件
  socket.on('disconnect', (reason) => {
    connectionCount--;
    console.log(`❌ [Socket.IO] 客户端断开 ID=${socket.id} | 原因=${reason} | 剩余=${connectionCount}`);
  });

  // 6. 错误处理
  socket.on('error', (error) => {
    console.error(`⚠️  [Socket.IO] Socket ${socket.id} 错误:`, error);
  });
});

// 服务器错误处理
io.engine.on('connection_error', (err) => {
  console.error('❌ [Engine.IO] 连接错误:', err);
});

console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Socket.IO 服务器已启动                                ║
║  📡 监听端口: 3001                                         ║
║  🔗 WebSocket路径: ws://localhost:3001                    ║
║  🌐 传输方式: WebSocket (优先), Polling (降级)           ║
║  ⚡ Ping间隔: 25秒 | 超时: 60秒                          ║
╚════════════════════════════════════════════════════════════╝
`);

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📥 收到SIGTERM信号，开始优雅关闭...');
  io.close(() => {
    console.log('✅ Socket.IO服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📥 收到SIGINT信号（Ctrl+C），开始优雅关闭...');
  io.close(() => {
    console.log('✅ Socket.IO服务器已关闭');
    process.exit(0);
  });
});
