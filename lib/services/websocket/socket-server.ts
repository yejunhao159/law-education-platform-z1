/**
 * WebSocket服务器配置
 * @description Socket.IO服务器设置，实现实时通信功能，支持课堂房间管理
 */

import { Server, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'

// ============== 类型定义 ==============

/**
 * Socket.IO事件类型定义
 */
interface ServerToClientEvents {
  // 课堂事件
  'classroom-update': (data: ClassroomUpdate) => void
  'student-joined': (data: StudentJoinedData) => void
  'student-left': (data: StudentLeftData) => void
  'session-started': (data: SessionStartedData) => void
  'session-ended': (data: SessionEndedData) => void
  
  // 对话事件
  'new-question': (data: NewQuestionData) => void
  'student-answer': (data: StudentAnswerData) => void
  'level-changed': (data: LevelChangedData) => void
  'progress-update': (data: ProgressUpdateData) => void
  
  // 系统事件
  'notification': (data: NotificationData) => void
  'error': (data: ErrorData) => void
  'heartbeat': () => void
}

interface ClientToServerEvents {
  // 连接事件
  'join-classroom': (data: JoinClassroomData, callback?: (response: any) => void) => void
  'leave-classroom': (data: LeaveClassroomData, callback?: (response: any) => void) => void
  
  // 对话事件
  'submit-answer': (data: SubmitAnswerData, callback?: (response: any) => void) => void
  'request-question': (data: RequestQuestionData, callback?: (response: any) => void) => void
  'typing': (data: TypingData) => void
  
  // 教师控制事件
  'start-session': (data: StartSessionData, callback?: (response: any) => void) => void
  'end-session': (data: EndSessionData, callback?: (response: any) => void) => void
  'change-level': (data: ChangeLevelData, callback?: (response: any) => void) => void
  
  // 系统事件
  'heartbeat': () => void
}

// 数据接口定义
interface ClassroomUpdate {
  classroomId: string
  type: 'student-count' | 'status' | 'settings'
  data: any
  timestamp: number
}

interface StudentJoinedData {
  classroomId: string
  student: {
    id: string
    name: string
    avatar?: string
  }
  totalStudents: number
  timestamp: number
}

interface StudentLeftData {
  classroomId: string
  studentId: string
  studentName: string
  totalStudents: number
  timestamp: number
}

interface SessionStartedData {
  classroomId: string
  sessionId: string
  sessionName: string
  caseId?: string
  startedAt: number
}

interface SessionEndedData {
  classroomId: string
  sessionId: string
  endedAt: number
  summary?: any
}

interface NewQuestionData {
  classroomId: string
  sessionId: string
  questionId: string
  question: string
  level: number
  targetStudents?: string[]
  timestamp: number
}

interface StudentAnswerData {
  classroomId: string
  sessionId: string
  questionId: string
  studentId: string
  studentName: string
  answer: string
  timestamp: number
}

interface LevelChangedData {
  classroomId: string
  sessionId: string
  newLevel: number
  previousLevel: number
  timestamp: number
}

interface ProgressUpdateData {
  classroomId: string
  sessionId: string
  studentId: string
  progress: {
    level: number
    score: number
    completedQuestions: number
    totalQuestions: number
  }
  timestamp: number
}

interface NotificationData {
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  duration?: number
  timestamp: number
}

interface ErrorData {
  code: string
  message: string
  details?: any
  timestamp: number
}

interface JoinClassroomData {
  classroomId: string
  userId: string
  userName: string
  userType: 'student' | 'teacher'
  sessionId?: string
}

interface LeaveClassroomData {
  classroomId: string
  userId: string
  userType: 'student' | 'teacher'
}

interface SubmitAnswerData {
  classroomId: string
  sessionId: string
  questionId: string
  answer: string
  thinkingTime?: number
}

interface RequestQuestionData {
  classroomId: string
  sessionId: string
  level: number
  previousQuestions?: string[]
}

interface TypingData {
  classroomId: string
  sessionId: string
  questionId: string
  isTyping: boolean
}

interface StartSessionData {
  classroomId: string
  sessionName: string
  caseId?: string
  settings: {
    difficulty: 'easy' | 'normal' | 'hard'
    mode: 'auto' | 'manual'
    maxDuration: number
  }
}

interface EndSessionData {
  classroomId: string
  sessionId: string
}

interface ChangeLevelData {
  classroomId: string
  sessionId: string
  newLevel: number
}

// ============== Socket用户信息 ==============
interface SocketUserInfo {
  userId: string
  userName: string
  userType: 'student' | 'teacher'
  classroomId?: string
  sessionId?: string
  joinedAt: number
  lastActivity: number
}

// ============== Socket服务器类 ==============

/**
 * WebSocket服务器管理器
 */
export class SocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents>
  private userSockets: Map<string, Socket> = new Map() // userId -> socket
  private socketUsers: Map<string, SocketUserInfo> = new Map() // socketId -> userInfo
  private classroomUsers: Map<string, Set<string>> = new Map() // classroomId -> Set<userId>
  private heartbeatInterval?: NodeJS.Timeout

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupEventHandlers()
    this.startHeartbeat()
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log(`Socket connected: ${socket.id}`)

      // 连接事件处理
      socket.on('join-classroom', this.handleJoinClassroom.bind(this, socket))
      socket.on('leave-classroom', this.handleLeaveClassroom.bind(this, socket))

      // 对话事件处理
      socket.on('submit-answer', this.handleSubmitAnswer.bind(this, socket))
      socket.on('request-question', this.handleRequestQuestion.bind(this, socket))
      socket.on('typing', this.handleTyping.bind(this, socket))

      // 教师控制事件处理
      socket.on('start-session', this.handleStartSession.bind(this, socket))
      socket.on('end-session', this.handleEndSession.bind(this, socket))
      socket.on('change-level', this.handleChangeLevel.bind(this, socket))

      // 系统事件处理
      socket.on('heartbeat', this.handleHeartbeat.bind(this, socket))
      socket.on('disconnect', this.handleDisconnect.bind(this, socket))
    })
  }

  // ============== 连接事件处理 ==============

  /**
   * 处理加入课堂请求
   */
  private async handleJoinClassroom(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: JoinClassroomData,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const { classroomId, userId, userName, userType, sessionId } = data

      // 验证请求数据
      if (!classroomId || !userId || !userName) {
        const error = { success: false, error: 'Missing required fields' }
        callback?.(error)
        return
      }

      // 加入Socket.IO房间
      await socket.join(classroomId)
      
      // 如果有会话ID，也加入会话房间
      if (sessionId) {
        await socket.join(`session-${sessionId}`)
      }

      // 记录用户信息
      const userInfo: SocketUserInfo = {
        userId,
        userName,
        userType,
        classroomId,
        sessionId,
        joinedAt: Date.now(),
        lastActivity: Date.now()
      }

      this.userSockets.set(userId, socket)
      this.socketUsers.set(socket.id, userInfo)

      // 更新课堂用户列表
      if (!this.classroomUsers.has(classroomId)) {
        this.classroomUsers.set(classroomId, new Set())
      }
      this.classroomUsers.get(classroomId)!.add(userId)

      // 通知课堂其他用户
      socket.to(classroomId).emit('student-joined', {
        classroomId,
        student: { id: userId, name: userName },
        totalStudents: this.classroomUsers.get(classroomId)!.size,
        timestamp: Date.now()
      })

      // 响应成功
      callback?.({
        success: true,
        data: {
          classroomId,
          totalUsers: this.classroomUsers.get(classroomId)!.size
        }
      })

      console.log(`User ${userName}(${userId}) joined classroom ${classroomId}`)

    } catch (error) {
      console.error('Error handling join classroom:', error)
      callback?.({
        success: false,
        error: 'Failed to join classroom'
      })
    }
  }

  /**
   * 处理离开课堂请求
   */
  private async handleLeaveClassroom(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: LeaveClassroomData,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const { classroomId, userId, userType } = data
      const userInfo = this.socketUsers.get(socket.id)

      if (userInfo) {
        // 从Socket.IO房间中移除
        await socket.leave(classroomId)
        
        if (userInfo.sessionId) {
          await socket.leave(`session-${userInfo.sessionId}`)
        }

        // 更新用户列表
        this.classroomUsers.get(classroomId)?.delete(userId)
        
        // 通知其他用户
        socket.to(classroomId).emit('student-left', {
          classroomId,
          studentId: userId,
          studentName: userInfo.userName,
          totalStudents: this.classroomUsers.get(classroomId)?.size || 0,
          timestamp: Date.now()
        })

        console.log(`User ${userInfo.userName}(${userId}) left classroom ${classroomId}`)
      }

      callback?.({ success: true })

    } catch (error) {
      console.error('Error handling leave classroom:', error)
      callback?.({
        success: false,
        error: 'Failed to leave classroom'
      })
    }
  }

  // ============== 对话事件处理 ==============

  /**
   * 处理提交答案
   */
  private async handleSubmitAnswer(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: SubmitAnswerData,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const userInfo = this.socketUsers.get(socket.id)
      if (!userInfo) {
        callback?.({ success: false, error: 'User not found' })
        return
      }

      const { classroomId, sessionId, questionId, answer, thinkingTime } = data

      // 广播学生答案给课堂其他用户
      socket.to(classroomId).emit('student-answer', {
        classroomId,
        sessionId,
        questionId,
        studentId: userInfo.userId,
        studentName: userInfo.userName,
        answer,
        timestamp: Date.now()
      })

      // 这里可以集成AI分析答案质量
      // const analysis = await analyzeAnswer(answer, questionId)

      callback?.({
        success: true,
        data: {
          submitted: true,
          timestamp: Date.now()
        }
      })

    } catch (error) {
      console.error('Error handling submit answer:', error)
      callback?.({
        success: false,
        error: 'Failed to submit answer'
      })
    }
  }

  /**
   * 处理请求问题
   */
  private async handleRequestQuestion(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: RequestQuestionData,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const userInfo = this.socketUsers.get(socket.id)
      if (!userInfo) {
        callback?.({ success: false, error: 'User not found' })
        return
      }

      const { classroomId, sessionId, level, previousQuestions } = data

      // 这里可以集成苏格拉底API生成问题
      // const question = await generateQuestion(level, previousQuestions)

      const mockQuestion = {
        questionId: `q-${Date.now()}`,
        question: `这是第${level}层的问题：请分析当前案例的关键要素？`,
        level,
        timestamp: Date.now()
      }

      // 发送新问题给请求的学生
      socket.emit('new-question', {
        classroomId,
        sessionId,
        questionId: mockQuestion.questionId,
        question: mockQuestion.question,
        level,
        timestamp: mockQuestion.timestamp
      })

      callback?.({
        success: true,
        data: mockQuestion
      })

    } catch (error) {
      console.error('Error handling request question:', error)
      callback?.({
        success: false,
        error: 'Failed to generate question'
      })
    }
  }

  /**
   * 处理输入状态
   */
  private handleTyping(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: TypingData
  ): void {
    const { classroomId } = data
    // 转发输入状态给课堂其他用户
    socket.to(classroomId).emit('student-answer', {
      classroomId: data.classroomId,
      sessionId: data.sessionId,
      questionId: data.questionId,
      studentId: this.socketUsers.get(socket.id)?.userId || '',
      studentName: this.socketUsers.get(socket.id)?.userName || '',
      answer: data.isTyping ? '正在输入...' : '',
      timestamp: Date.now()
    })
  }

  // ============== 教师控制事件处理 ==============

  /**
   * 处理开始会话
   */
  private async handleStartSession(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: StartSessionData,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const userInfo = this.socketUsers.get(socket.id)
      
      if (!userInfo || userInfo.userType !== 'teacher') {
        callback?.({ success: false, error: 'Unauthorized' })
        return
      }

      const { classroomId, sessionName, caseId, settings } = data
      const sessionId = `session-${Date.now()}`

      // 通知课堂所有用户会话开始
      this.io.to(classroomId).emit('session-started', {
        classroomId,
        sessionId,
        sessionName,
        caseId,
        startedAt: Date.now()
      })

      callback?.({
        success: true,
        data: { sessionId }
      })

      console.log(`Session ${sessionName} started in classroom ${classroomId}`)

    } catch (error) {
      console.error('Error handling start session:', error)
      callback?.({
        success: false,
        error: 'Failed to start session'
      })
    }
  }

  /**
   * 处理结束会话
   */
  private async handleEndSession(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: EndSessionData,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const userInfo = this.socketUsers.get(socket.id)
      
      if (!userInfo || userInfo.userType !== 'teacher') {
        callback?.({ success: false, error: 'Unauthorized' })
        return
      }

      const { classroomId, sessionId } = data

      // 通知课堂所有用户会话结束
      this.io.to(classroomId).emit('session-ended', {
        classroomId,
        sessionId,
        endedAt: Date.now()
      })

      callback?.({ success: true })

      console.log(`Session ${sessionId} ended in classroom ${classroomId}`)

    } catch (error) {
      console.error('Error handling end session:', error)
      callback?.({
        success: false,
        error: 'Failed to end session'
      })
    }
  }

  /**
   * 处理层级变更
   */
  private async handleChangeLevel(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: ChangeLevelData,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const userInfo = this.socketUsers.get(socket.id)
      
      if (!userInfo || userInfo.userType !== 'teacher') {
        callback?.({ success: false, error: 'Unauthorized' })
        return
      }

      const { classroomId, sessionId, newLevel } = data

      // 通知课堂所有用户层级变更
      this.io.to(classroomId).emit('level-changed', {
        classroomId,
        sessionId,
        newLevel,
        previousLevel: newLevel - 1, // 简化处理
        timestamp: Date.now()
      })

      callback?.({ success: true })

    } catch (error) {
      console.error('Error handling change level:', error)
      callback?.({
        success: false,
        error: 'Failed to change level'
      })
    }
  }

  // ============== 系统事件处理 ==============

  /**
   * 处理心跳
   */
  private handleHeartbeat(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    const userInfo = this.socketUsers.get(socket.id)
    if (userInfo) {
      userInfo.lastActivity = Date.now()
    }
    socket.emit('heartbeat')
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    const userInfo = this.socketUsers.get(socket.id)
    
    if (userInfo) {
      const { userId, userName, classroomId } = userInfo

      // 清理用户数据
      this.userSockets.delete(userId)
      this.socketUsers.delete(socket.id)
      
      if (classroomId) {
        this.classroomUsers.get(classroomId)?.delete(userId)
        
        // 通知其他用户
        socket.to(classroomId).emit('student-left', {
          classroomId,
          studentId: userId,
          studentName: userName,
          totalStudents: this.classroomUsers.get(classroomId)?.size || 0,
          timestamp: Date.now()
        })
      }

      console.log(`Socket ${socket.id} disconnected - User: ${userName}(${userId})`)
    }
  }

  // ============== 公共方法 ==============

  /**
   * 向特定课堂广播消息
   */
  public broadcastToClassroom(classroomId: string, event: keyof ServerToClientEvents, data: any): void {
    this.io.to(classroomId).emit(event, data)
  }

  /**
   * 向特定用户发送消息
   */
  public sendToUser(userId: string, event: keyof ServerToClientEvents, data: any): boolean {
    const socket = this.userSockets.get(userId)
    if (socket) {
      socket.emit(event, data)
      return true
    }
    return false
  }

  /**
   * 获取课堂在线用户数
   */
  public getClassroomUserCount(classroomId: string): number {
    return this.classroomUsers.get(classroomId)?.size || 0
  }

  /**
   * 获取课堂在线用户列表
   */
  public getClassroomUsers(classroomId: string): SocketUserInfo[] {
    const userIds = this.classroomUsers.get(classroomId) || new Set()
    const users: SocketUserInfo[] = []
    
    for (const userId of userIds) {
      const socket = this.userSockets.get(userId)
      if (socket) {
        const userInfo = this.socketUsers.get(socket.id)
        if (userInfo) {
          users.push(userInfo)
        }
      }
    }
    
    return users
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const timeout = 5 * 60 * 1000 // 5分钟超时

      // 检查所有连接的活跃度
      for (const [socketId, userInfo] of this.socketUsers.entries()) {
        if (now - userInfo.lastActivity > timeout) {
          const socket = this.userSockets.get(userInfo.userId)
          if (socket) {
            console.log(`Disconnecting inactive user: ${userInfo.userName}`)
            socket.disconnect()
          }
        }
      }
    }, 60000) // 每分钟检查一次
  }

  /**
   * 关闭服务器
   */
  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    this.io.close()
    console.log('Socket server closed')
  }

  /**
   * 获取服务器统计信息
   */
  public getStats() {
    return {
      totalConnections: this.socketUsers.size,
      totalClassrooms: this.classroomUsers.size,
      activeUsers: Array.from(this.socketUsers.values()).filter(
        user => Date.now() - user.lastActivity < 60000
      ).length
    }
  }
}