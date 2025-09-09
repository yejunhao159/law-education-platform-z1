/**
 * WebSocket服务器测试
 * @description 测试Socket.IO服务器的连接、断线、重连和事件处理
 */

import { Server as HttpServer } from 'http'
import { SocketServer } from '../../../lib/services/websocket/socket-server'
import { EventEmitter } from 'events'

// Mock Socket.IO
const mockSocket = {
  id: 'test-socket-1',
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  on: jest.fn(),
  disconnect: jest.fn()
}

const mockIo = {
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  close: jest.fn()
}

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => mockIo)
}))

// Mock HTTP Server
const mockHttpServer = {
  listen: jest.fn(),
  close: jest.fn()
} as unknown as HttpServer

describe('SocketServer', () => {
  let socketServer: SocketServer
  let connectionHandler: (socket: any) => void

  beforeEach(() => {
    jest.clearAllMocks()
    
    // 重置socket mock
    mockSocket.id = 'test-socket-1'
    mockSocket.join.mockClear()
    mockSocket.leave.mockClear()
    mockSocket.emit.mockClear()
    mockSocket.to.mockClear()
    mockSocket.on.mockClear()
    mockSocket.disconnect.mockClear()
    
    // 重置io mock
    mockIo.on.mockClear()
    mockIo.to.mockClear()
    mockIo.emit.mockClear()
    mockIo.close.mockClear()
    
    // 创建服务器实例
    socketServer = new SocketServer(mockHttpServer)
    
    // 获取连接处理器
    const connectionCall = mockIo.on.mock.calls.find(call => call[0] === 'connection')
    if (connectionCall) {
      connectionHandler = connectionCall[1]
    }
  })

  afterEach(() => {
    socketServer.close()
  })

  describe('服务器初始化', () => {
    it('应该正确初始化Socket.IO服务器', () => {
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function))
    })

    it('应该设置正确的CORS配置', () => {
      const { Server } = require('socket.io')
      expect(Server).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      })
    })
  })

  describe('Socket连接处理', () => {
    beforeEach(() => {
      // 模拟socket连接
      connectionHandler(mockSocket)
    })

    it('应该设置所有事件监听器', () => {
      const expectedEvents = [
        'join-classroom',
        'leave-classroom',
        'submit-answer',
        'request-question',
        'typing',
        'start-session',
        'end-session',
        'change-level',
        'heartbeat',
        'disconnect'
      ]

      expectedEvents.forEach(event => {
        expect(mockSocket.on).toHaveBeenCalledWith(event, expect.any(Function))
      })
    })

    it('应该正确处理连接日志', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      connectionHandler(mockSocket)
      expect(consoleSpy).toHaveBeenCalledWith('Socket connected: test-socket-1')
      consoleSpy.mockRestore()
    })
  })

  describe('加入课堂功能', () => {
    let joinClassroomHandler: Function

    beforeEach(() => {
      connectionHandler(mockSocket)
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      joinClassroomHandler = joinCall[1]
    })

    it('应该成功处理有效的加入课堂请求', async () => {
      const mockCallback = jest.fn()
      const joinData = {
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student' as const,
        sessionId: 'session-1'
      }

      await joinClassroomHandler(joinData, mockCallback)

      expect(mockSocket.join).toHaveBeenCalledWith('classroom-1')
      expect(mockSocket.join).toHaveBeenCalledWith('session-session-1')
      expect(mockSocket.to).toHaveBeenCalledWith('classroom-1')
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: {
          classroomId: 'classroom-1',
          totalUsers: 1
        }
      })
    })

    it('应该拒绝缺少必需字段的请求', async () => {
      const mockCallback = jest.fn()
      const invalidData = {
        classroomId: 'classroom-1',
        // 缺少userId和userName
      }

      await joinClassroomHandler(invalidData, mockCallback)

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields'
      })
      expect(mockSocket.join).not.toHaveBeenCalled()
    })

    it('应该通知课堂其他用户新学生加入', async () => {
      const mockCallback = jest.fn()
      const joinData = {
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student' as const
      }

      await joinClassroomHandler(joinData, mockCallback)

      expect(mockSocket.to).toHaveBeenCalledWith('classroom-1')
      expect(mockSocket.to().emit).toHaveBeenCalledWith('student-joined', {
        classroomId: 'classroom-1',
        student: { id: 'user-1', name: 'Test User' },
        totalStudents: 1,
        timestamp: expect.any(Number)
      })
    })
  })

  describe('离开课堂功能', () => {
    let leaveClassroomHandler: Function
    let joinClassroomHandler: Function

    beforeEach(async () => {
      connectionHandler(mockSocket)
      
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      joinClassroomHandler = joinCall[1]
      
      const leaveCall = mockSocket.on.mock.calls.find(call => call[0] === 'leave-classroom')
      leaveClassroomHandler = leaveCall[1]

      // 先加入课堂
      await joinClassroomHandler({
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student'
      }, jest.fn())

      // 重置mock调用记录
      mockSocket.leave.mockClear()
      mockSocket.to.mockClear()
    })

    it('应该成功处理离开课堂请求', async () => {
      const mockCallback = jest.fn()
      const leaveData = {
        classroomId: 'classroom-1',
        userId: 'user-1',
        userType: 'student' as const
      }

      await leaveClassroomHandler(leaveData, mockCallback)

      expect(mockSocket.leave).toHaveBeenCalledWith('classroom-1')
      expect(mockCallback).toHaveBeenCalledWith({ success: true })
    })

    it('应该通知其他用户学生离开', async () => {
      const mockCallback = jest.fn()
      const leaveData = {
        classroomId: 'classroom-1',
        userId: 'user-1',
        userType: 'student' as const
      }

      await leaveClassroomHandler(leaveData, mockCallback)

      expect(mockSocket.to).toHaveBeenCalledWith('classroom-1')
      expect(mockSocket.to().emit).toHaveBeenCalledWith('student-left', {
        classroomId: 'classroom-1',
        studentId: 'user-1',
        studentName: 'Test User',
        totalStudents: 0,
        timestamp: expect.any(Number)
      })
    })
  })

  describe('提交答案功能', () => {
    let submitAnswerHandler: Function
    let joinClassroomHandler: Function

    beforeEach(async () => {
      connectionHandler(mockSocket)
      
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      joinClassroomHandler = joinCall[1]
      
      const submitCall = mockSocket.on.mock.calls.find(call => call[0] === 'submit-answer')
      submitAnswerHandler = submitCall[1]

      // 先加入课堂
      await joinClassroomHandler({
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student'
      }, jest.fn())
    })

    it('应该成功处理提交答案请求', async () => {
      const mockCallback = jest.fn()
      const answerData = {
        classroomId: 'classroom-1',
        sessionId: 'session-1',
        questionId: 'question-1',
        answer: '这是我的答案',
        thinkingTime: 30000
      }

      await submitAnswerHandler(answerData, mockCallback)

      expect(mockSocket.to).toHaveBeenCalledWith('classroom-1')
      expect(mockSocket.to().emit).toHaveBeenCalledWith('student-answer', {
        classroomId: 'classroom-1',
        sessionId: 'session-1',
        questionId: 'question-1',
        studentId: 'user-1',
        studentName: 'Test User',
        answer: '这是我的答案',
        timestamp: expect.any(Number)
      })
      
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: {
          submitted: true,
          timestamp: expect.any(Number)
        }
      })
    })

    it('应该拒绝未找到用户的请求', async () => {
      // 创建一个完全新的socket，不加入任何课堂
      const unknownMockSocket = {
        id: 'unknown-socket-id',
        join: jest.fn().mockResolvedValue(undefined),
        leave: jest.fn().mockResolvedValue(undefined),
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        on: jest.fn(),
        disconnect: jest.fn()
      }

      // 设置事件处理器但不添加用户信息
      connectionHandler(unknownMockSocket)
      const submitCall = unknownMockSocket.on.mock.calls.find(call => call[0] === 'submit-answer')
      const submitHandler = submitCall[1]

      const mockCallback = jest.fn()

      await submitHandler({
        classroomId: 'classroom-1',
        sessionId: 'session-1',
        questionId: 'question-1',
        answer: '测试答案'
      }, mockCallback)

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      })
    })
  })

  describe('会话管理功能', () => {
    let startSessionHandler: Function
    let endSessionHandler: Function
    let joinClassroomHandler: Function

    beforeEach(async () => {
      connectionHandler(mockSocket)
      
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      joinClassroomHandler = joinCall[1]
      
      const startCall = mockSocket.on.mock.calls.find(call => call[0] === 'start-session')
      startSessionHandler = startCall[1]
      
      const endCall = mockSocket.on.mock.calls.find(call => call[0] === 'end-session')
      endSessionHandler = endCall[1]

      // 先以教师身份加入课堂
      await joinClassroomHandler({
        classroomId: 'classroom-1',
        userId: 'teacher-1',
        userName: 'Test Teacher',
        userType: 'teacher'
      }, jest.fn())
    })

    it('教师应该能够成功开始会话', async () => {
      const mockCallback = jest.fn()
      const sessionData = {
        classroomId: 'classroom-1',
        sessionName: '测试会话',
        caseId: 'case-1',
        settings: {
          difficulty: 'normal' as const,
          mode: 'auto' as const,
          maxDuration: 3600
        }
      }

      await startSessionHandler(sessionData, mockCallback)

      expect(mockIo.to).toHaveBeenCalledWith('classroom-1')
      expect(mockIo.to().emit).toHaveBeenCalledWith('session-started', {
        classroomId: 'classroom-1',
        sessionId: expect.stringMatching(/^session-\d+$/),
        sessionName: '测试会话',
        caseId: 'case-1',
        startedAt: expect.any(Number)
      })
      
      expect(mockCallback).toHaveBeenCalledWith({
        success: true,
        data: { sessionId: expect.stringMatching(/^session-\d+$/) }
      })
    })

    it('学生应该无法开始会话', async () => {
      // 先离开，然后以学生身份重新加入
      await joinClassroomHandler({
        classroomId: 'classroom-1',
        userId: 'student-1',
        userName: 'Test Student',
        userType: 'student'
      }, jest.fn())

      const mockCallback = jest.fn()
      const sessionData = {
        classroomId: 'classroom-1',
        sessionName: '测试会话',
        caseId: 'case-1',
        settings: {
          difficulty: 'normal' as const,
          mode: 'auto' as const,
          maxDuration: 3600
        }
      }

      await startSessionHandler(sessionData, mockCallback)

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      })
    })

    it('教师应该能够成功结束会话', async () => {
      const mockCallback = jest.fn()
      const endData = {
        classroomId: 'classroom-1',
        sessionId: 'session-1'
      }

      await endSessionHandler(endData, mockCallback)

      expect(mockIo.to).toHaveBeenCalledWith('classroom-1')
      expect(mockIo.to().emit).toHaveBeenCalledWith('session-ended', {
        classroomId: 'classroom-1',
        sessionId: 'session-1',
        endedAt: expect.any(Number)
      })
      
      expect(mockCallback).toHaveBeenCalledWith({ success: true })
    })
  })

  describe('心跳和连接管理', () => {
    let heartbeatHandler: Function
    let disconnectHandler: Function
    let joinClassroomHandler: Function

    beforeEach(async () => {
      connectionHandler(mockSocket)
      
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      joinClassroomHandler = joinCall[1]
      
      const heartbeatCall = mockSocket.on.mock.calls.find(call => call[0] === 'heartbeat')
      heartbeatHandler = heartbeatCall[1]
      
      const disconnectCall = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')
      disconnectHandler = disconnectCall[1]

      // 先加入课堂
      await joinClassroomHandler({
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student'
      }, jest.fn())
    })

    it('应该正确处理心跳请求', () => {
      heartbeatHandler()

      expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat')
    })

    it('应该正确处理断开连接', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      disconnectHandler()

      expect(mockSocket.to).toHaveBeenCalledWith('classroom-1')
      expect(mockSocket.to().emit).toHaveBeenCalledWith('student-left', {
        classroomId: 'classroom-1',
        studentId: 'user-1',
        studentName: 'Test User',
        totalStudents: 0,
        timestamp: expect.any(Number)
      })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Socket test-socket-1 disconnected - User: Test User(user-1)')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('公共方法', () => {
    it('broadcastToClassroom应该向课堂广播消息', () => {
      socketServer.broadcastToClassroom('classroom-1', 'notification', { message: '测试消息' })

      expect(mockIo.to).toHaveBeenCalledWith('classroom-1')
      expect(mockIo.to().emit).toHaveBeenCalledWith('notification', { message: '测试消息' })
    })

    it('sendToUser应该向特定用户发送消息', async () => {
      // 先让用户加入
      connectionHandler(mockSocket)
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      const joinClassroomHandler = joinCall[1]

      await joinClassroomHandler({
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student'
      }, jest.fn())

      // 重置emit调用记录
      mockSocket.emit.mockClear()

      const result = socketServer.sendToUser('user-1', 'notification', { message: '个人消息' })

      expect(result).toBe(true)
      expect(mockSocket.emit).toHaveBeenCalledWith('notification', { message: '个人消息' })
    })

    it('sendToUser对不存在的用户应该返回false', () => {
      const result = socketServer.sendToUser('non-existent-user', 'notification', { message: '测试' })

      expect(result).toBe(false)
    })

    it('getClassroomUserCount应该返回正确的用户数', async () => {
      // 初始应该为0
      expect(socketServer.getClassroomUserCount('classroom-1')).toBe(0)

      // 添加用户
      connectionHandler(mockSocket)
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      const joinClassroomHandler = joinCall[1]

      await joinClassroomHandler({
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student'
      }, jest.fn())

      expect(socketServer.getClassroomUserCount('classroom-1')).toBe(1)
    })

    it('close应该正确关闭服务器', () => {
      socketServer.close()

      expect(mockIo.close).toHaveBeenCalled()
    })

    it('getStats应该返回服务器统计信息', () => {
      const stats = socketServer.getStats()

      expect(stats).toEqual({
        totalConnections: expect.any(Number),
        totalClassrooms: expect.any(Number),
        activeUsers: expect.any(Number)
      })
    })
  })

  describe('错误处理', () => {
    let joinClassroomHandler: Function

    beforeEach(() => {
      connectionHandler(mockSocket)
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      joinClassroomHandler = joinCall[1]
    })

    it('join操作失败时应该正确处理错误', async () => {
      // 模拟join失败
      mockSocket.join.mockRejectedValueOnce(new Error('Join failed'))
      
      const mockCallback = jest.fn()
      const joinData = {
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student' as const
      }

      await joinClassroomHandler(joinData, mockCallback)

      expect(mockCallback).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to join classroom'
      })
    })
  })

  describe('输入状态处理', () => {
    let typingHandler: Function
    let joinClassroomHandler: Function

    beforeEach(async () => {
      connectionHandler(mockSocket)
      
      const joinCall = mockSocket.on.mock.calls.find(call => call[0] === 'join-classroom')
      joinClassroomHandler = joinCall[1]
      
      const typingCall = mockSocket.on.mock.calls.find(call => call[0] === 'typing')
      typingHandler = typingCall[1]

      // 先加入课堂
      await joinClassroomHandler({
        classroomId: 'classroom-1',
        userId: 'user-1',
        userName: 'Test User',
        userType: 'student'
      }, jest.fn())

      // 重置mock
      mockSocket.to.mockClear()
    })

    it('应该正确转发输入状态', () => {
      const typingData = {
        classroomId: 'classroom-1',
        sessionId: 'session-1',
        questionId: 'question-1',
        isTyping: true
      }

      typingHandler(typingData)

      expect(mockSocket.to).toHaveBeenCalledWith('classroom-1')
      expect(mockSocket.to().emit).toHaveBeenCalledWith('student-answer', {
        classroomId: 'classroom-1',
        sessionId: 'session-1',
        questionId: 'question-1',
        studentId: 'user-1',
        studentName: 'Test User',
        answer: '正在输入...',
        timestamp: expect.any(Number)
      })
    })

    it('应该正确处理停止输入状态', () => {
      const typingData = {
        classroomId: 'classroom-1',
        sessionId: 'session-1',
        questionId: 'question-1',
        isTyping: false
      }

      typingHandler(typingData)

      expect(mockSocket.to().emit).toHaveBeenCalledWith('student-answer', 
        expect.objectContaining({
          answer: ''
        })
      )
    })
  })
})