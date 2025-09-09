/**
 * WebSocket客户端Hook
 * @description 封装Socket.IO客户端连接管理，提供自动重连和事件处理
 * @author 墨匠 - 2025-09-08
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSocraticStore } from '../stores/socraticStore'
import type { 
  Message, 
  StudentInfo, 
  VoteData,
  ClassroomSession 
} from '../types/socratic'
import { LogLevel } from '../types/socratic'
import { SocraticLogger } from '../utils/socratic-logger'

// WebSocket连接配置
interface WebSocketConfig {
  url?: string
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
  timeout?: number
  auth?: Record<string, any>
}

// WebSocket事件类型
export enum WebSocketEvent {
  // 连接事件
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECT_FAILED = 'reconnect_failed',
  
  // 课堂事件
  JOIN_CLASSROOM = 'join_classroom',
  LEAVE_CLASSROOM = 'leave_classroom',
  CLASSROOM_CREATED = 'classroom_created',
  CLASSROOM_ENDED = 'classroom_ended',
  
  // 学生事件
  STUDENT_JOINED = 'student_joined',
  STUDENT_LEFT = 'student_left',
  STUDENT_HAND_RAISED = 'student_hand_raised',
  STUDENT_HAND_LOWERED = 'student_hand_lowered',
  
  // 消息事件
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_BROADCAST = 'message_broadcast',
  
  // 投票事件
  VOTE_STARTED = 'vote_started',
  VOTE_CAST = 'vote_cast',
  VOTE_ENDED = 'vote_ended',
  VOTE_RESULTS = 'vote_results',
  
  // 问题事件
  QUESTION_POSTED = 'question_posted',
  QUESTION_ANSWERED = 'question_answered',
  
  // 状态同步
  STATE_SYNC = 'state_sync',
  LEVEL_CHANGED = 'level_changed',
  PERFORMANCE_UPDATE = 'performance_update'
}

// Hook返回值接口
interface UseWebSocketReturn {
  socket: Socket | null
  isConnected: boolean
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error'
  error: Error | null
  
  // 连接管理
  connect: () => void
  disconnect: () => void
  reconnect: () => void
  
  // 事件发送
  emit: (event: string, data?: any) => void
  emitWithAck: (event: string, data?: any) => Promise<any>
  
  // 课堂操作
  joinClassroom: (code: string, options?: { isTeacher?: boolean; studentName?: string }) => Promise<void>
  leaveClassroom: () => Promise<void>
  
  // 消息操作
  sendMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  broadcastMessage: (message: string) => void
  
  // 投票操作
  startVote: (vote: Omit<VoteData, 'id' | 'createdAt' | 'votedStudents'>) => void
  castVote: (voteId: string, choiceId: string) => void
  endVote: (voteId: string) => void
  
  // 学生操作
  raiseHand: () => void
  lowerHand: () => void
  
  // 统计信息
  stats: {
    messagesReceived: number
    messagesSent: number
    reconnectCount: number
    lastActivity: number
    latency: number
  }
}

// 默认配置
const DEFAULT_CONFIG: WebSocketConfig = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000
}

/**
 * WebSocket客户端Hook
 * @param config WebSocket配置
 * @returns WebSocket操作接口
 */
export function useWebSocket(config: WebSocketConfig = {}): UseWebSocketReturn {
  const logger = useRef(new SocraticLogger('useWebSocket'))
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<UseWebSocketReturn['connectionState']>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const [stats, setStats] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    reconnectCount: 0,
    lastActivity: Date.now(),
    latency: 0
  })
  
  // 从Store获取必要的方法
  const {
    receiveMessage,
    addStudent,
    removeStudent,
    updateStudentStatus,
    setCurrentVote,
    setCurrentQuestion,
    setConnectionStatus,
    updatePerformance,
    setCurrentLevel
  } = useSocraticStore()
  
  // 合并配置
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // 初始化Socket连接
  const initSocket = useCallback(() => {
    if (socketRef.current) {
      return socketRef.current
    }
    
    const url = finalConfig.url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    
    logger.current.info('初始化WebSocket连接', { url })
    setConnectionState('connecting')
    setConnectionStatus('connecting')
    
    const socket = io(url, {
      reconnection: finalConfig.reconnection,
      reconnectionAttempts: finalConfig.reconnectionAttempts,
      reconnectionDelay: finalConfig.reconnectionDelay,
      timeout: finalConfig.timeout,
      auth: finalConfig.auth
    })
    
    // 连接事件处理
    socket.on(WebSocketEvent.CONNECT, () => {
      logger.current.info('WebSocket连接成功')
      setIsConnected(true)
      setConnectionState('connected')
      setConnectionStatus('connected')
      setError(null)
    })
    
    socket.on(WebSocketEvent.DISCONNECT, (reason: string) => {
      logger.current.warn('WebSocket断开连接', { reason })
      setIsConnected(false)
      setConnectionState('disconnected')
      setConnectionStatus('disconnected')
    })
    
    socket.on(WebSocketEvent.CONNECT_ERROR, (err: Error) => {
      logger.current.error('WebSocket连接错误', err)
      setError(err)
      setConnectionState('error')
      setConnectionStatus('error')
    })
    
    socket.on(WebSocketEvent.RECONNECT, (attemptNumber: number) => {
      logger.current.info('WebSocket重连成功', { attemptNumber })
      setStats(prev => ({ ...prev, reconnectCount: prev.reconnectCount + 1 }))
    })
    
    socket.on(WebSocketEvent.RECONNECT_FAILED, () => {
      logger.current.error('WebSocket重连失败')
      setError(new Error('重连失败'))
      setConnectionState('error')
    })
    
    // 学生事件处理
    socket.on(WebSocketEvent.STUDENT_JOINED, (student: StudentInfo) => {
      logger.current.info('学生加入', { studentId: student.id })
      addStudent(student)
    })
    
    socket.on(WebSocketEvent.STUDENT_LEFT, (studentId: string) => {
      logger.current.info('学生离开', { studentId })
      removeStudent(studentId)
    })
    
    socket.on(WebSocketEvent.STUDENT_HAND_RAISED, (studentId: string) => {
      updateStudentStatus(studentId, { 
        handRaised: true, 
        handRaisedAt: Date.now() 
      })
    })
    
    socket.on(WebSocketEvent.STUDENT_HAND_LOWERED, (studentId: string) => {
      updateStudentStatus(studentId, { 
        handRaised: false,
        handRaisedAt: undefined
      })
    })
    
    // 消息事件处理
    socket.on(WebSocketEvent.MESSAGE_RECEIVED, (message: Message) => {
      logger.current.debug('收到消息', { messageId: message.id })
      receiveMessage(message)
      setStats(prev => ({ 
        ...prev, 
        messagesReceived: prev.messagesReceived + 1,
        lastActivity: Date.now()
      }))
    })
    
    socket.on(WebSocketEvent.MESSAGE_BROADCAST, (message: Message) => {
      logger.current.debug('收到广播消息', { messageId: message.id })
      receiveMessage(message)
    })
    
    // 投票事件处理
    socket.on(WebSocketEvent.VOTE_STARTED, (vote: VoteData) => {
      logger.current.info('投票开始', { voteId: vote.id })
      setCurrentVote(vote)
    })
    
    socket.on(WebSocketEvent.VOTE_ENDED, (voteId: string) => {
      logger.current.info('投票结束', { voteId })
      setCurrentVote(null)
    })
    
    socket.on(WebSocketEvent.VOTE_RESULTS, (vote: VoteData) => {
      logger.current.info('投票结果更新', { voteId: vote.id })
      setCurrentVote(vote)
    })
    
    // 问题事件处理
    socket.on(WebSocketEvent.QUESTION_POSTED, (question: string) => {
      logger.current.debug('收到问题', { question })
      setCurrentQuestion(question)
    })
    
    // 状态同步
    socket.on(WebSocketEvent.STATE_SYNC, (state: Partial<ClassroomSession>) => {
      logger.current.debug('状态同步', state)
      // 同步课堂状态
      if (state.students) {
        state.students.forEach((student: StudentInfo) => addStudent(student))
      }
      if (state.currentVote) {
        setCurrentVote(state.currentVote)
      }
      if (state.currentQuestion) {
        setCurrentQuestion(state.currentQuestion)
      }
    })
    
    socket.on(WebSocketEvent.LEVEL_CHANGED, (level: number) => {
      logger.current.info('层级变更', { level })
      setCurrentLevel(level)
    })
    
    socket.on(WebSocketEvent.PERFORMANCE_UPDATE, (performance: any) => {
      logger.current.debug('性能更新', performance)
      updatePerformance(performance)
    })
    
    // 延迟测量
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now()
        socket.emit('ping', () => {
          const latency = Date.now() - start
          setStats(prev => ({ ...prev, latency }))
        })
      }
    }, 5000)
    
    // 清理函数
    socket.on('disconnect', () => {
      clearInterval(pingInterval)
    })
    
    socketRef.current = socket
    return socket
  }, [finalConfig, addStudent, removeStudent, updateStudentStatus, setCurrentVote, 
      setCurrentQuestion, setConnectionStatus, updatePerformance, setCurrentLevel, 
      receiveMessage])
  
  // 连接管理
  const connect = useCallback(() => {
    if (!socketRef.current) {
      initSocket()
    }
    socketRef.current?.connect()
  }, [initSocket])
  
  const disconnect = useCallback(() => {
    logger.current.info('主动断开WebSocket连接')
    socketRef.current?.disconnect()
    setIsConnected(false)
    setConnectionState('disconnected')
  }, [])
  
  const reconnect = useCallback(() => {
    logger.current.info('手动重连WebSocket')
    disconnect()
    setTimeout(connect, 100)
  }, [connect, disconnect])
  
  // 事件发送
  const emit = useCallback((event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      logger.current.warn('WebSocket未连接，无法发送事件', { event })
      return
    }
    
    logger.current.debug('发送事件', { event, data })
    socketRef.current.emit(event, data)
    setStats(prev => ({ 
      ...prev, 
      messagesSent: prev.messagesSent + 1,
      lastActivity: Date.now()
    }))
  }, [])
  
  const emitWithAck = useCallback((event: string, data?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('WebSocket未连接'))
        return
      }
      
      socketRef.current.emit(event, data, (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }, [])
  
  // 课堂操作
  const joinClassroom = useCallback(async (
    code: string, 
    options?: { isTeacher?: boolean; studentName?: string }
  ) => {
    try {
      const response = await emitWithAck(WebSocketEvent.JOIN_CLASSROOM, {
        code,
        ...options
      })
      logger.current.info('加入课堂成功', { code, response })
    } catch (error) {
      logger.current.error('加入课堂失败', error)
      throw error
    }
  }, [emitWithAck])
  
  const leaveClassroom = useCallback(async () => {
    try {
      await emitWithAck(WebSocketEvent.LEAVE_CLASSROOM)
      logger.current.info('离开课堂成功')
    } catch (error) {
      logger.current.error('离开课堂失败', error)
      throw error
    }
  }, [emitWithAck])
  
  // 消息操作
  const sendMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    emit(WebSocketEvent.MESSAGE_SENT, {
      ...message,
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now()
    })
  }, [emit])
  
  const broadcastMessage = useCallback((message: string) => {
    emit(WebSocketEvent.MESSAGE_BROADCAST, {
      content: message,
      timestamp: Date.now()
    })
  }, [emit])
  
  // 投票操作
  const startVote = useCallback((vote: Omit<VoteData, 'id' | 'createdAt' | 'votedStudents'>) => {
    emit(WebSocketEvent.VOTE_STARTED, {
      ...vote,
      id: Math.random().toString(36).substring(2, 15),
      createdAt: Date.now(),
      votedStudents: new Set()
    })
  }, [emit])
  
  const castVote = useCallback((voteId: string, choiceId: string) => {
    emit(WebSocketEvent.VOTE_CAST, { voteId, choiceId })
  }, [emit])
  
  const endVote = useCallback((voteId: string) => {
    emit(WebSocketEvent.VOTE_ENDED, { voteId })
  }, [emit])
  
  // 学生操作
  const raiseHand = useCallback(() => {
    emit(WebSocketEvent.STUDENT_HAND_RAISED)
  }, [emit])
  
  const lowerHand = useCallback(() => {
    emit(WebSocketEvent.STUDENT_HAND_LOWERED)
  }, [emit])
  
  // 自动连接
  useEffect(() => {
    if (finalConfig.autoConnect) {
      connect()
    }
    
    return () => {
      if (socketRef.current) {
        logger.current.info('清理WebSocket连接')
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, []) // 只在组件挂载时执行
  
  return {
    socket: socketRef.current,
    isConnected,
    connectionState,
    error,
    connect,
    disconnect,
    reconnect,
    emit,
    emitWithAck,
    joinClassroom,
    leaveClassroom,
    sendMessage,
    broadcastMessage,
    startVote,
    castVote,
    endVote,
    raiseHand,
    lowerHand,
    stats
  }
}

// 导出默认配置
export { DEFAULT_CONFIG as WEBSOCKET_DEFAULT_CONFIG }