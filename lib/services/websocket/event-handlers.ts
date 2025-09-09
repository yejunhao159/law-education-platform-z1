/**
 * WebSocket事件处理器
 * @description 专门处理各类WebSocket事件的处理器集合
 */

import { Socket } from 'socket.io'
import type { SocketServer } from './socket-server'

// ============== 事件数据类型定义 ==============

export interface VoteData {
  classroomId: string
  sessionId: string
  questionId: string
  optionId: string
  studentId: string
}

export interface MessageData {
  classroomId: string
  sessionId?: string
  senderId: string
  senderName: string
  senderType: 'student' | 'teacher' | 'system'
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  timestamp: number
  metadata?: {
    replyTo?: string
    mentions?: string[]
    attachments?: Array<{
      url: string
      type: string
      name: string
      size: number
    }>
  }
}

export interface RoomManagementData {
  action: 'create' | 'join' | 'leave' | 'update' | 'delete'
  roomId: string
  roomType: 'classroom' | 'session' | 'breakout'
  userId: string
  metadata?: any
}

export interface UserStatusData {
  userId: string
  status: 'online' | 'away' | 'busy' | 'offline'
  activity?: 'viewing' | 'typing' | 'thinking' | 'idle'
  classroomId?: string
  sessionId?: string
}

export interface BroadcastData {
  type: 'announcement' | 'notification' | 'alert' | 'update'
  title?: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  targetType: 'all' | 'classroom' | 'session' | 'user' | 'role'
  targetIds?: string[]
  metadata?: {
    action?: string
    url?: string
    expires?: number
  }
}

export interface PollData {
  classroomId: string
  sessionId: string
  pollId: string
  question: string
  options: Array<{
    id: string
    text: string
    votes?: number
  }>
  type: 'single' | 'multiple' | 'rating' | 'text'
  duration?: number
  anonymous: boolean
  createdBy: string
}

export interface QuizData {
  classroomId: string
  sessionId: string
  quizId: string
  questions: Array<{
    id: string
    question: string
    type: 'choice' | 'essay' | 'short'
    options?: string[]
    correctAnswer?: string | string[]
    points: number
  }>
  timeLimit?: number
  attempts: number
  settings: {
    shuffleQuestions: boolean
    showCorrectAnswers: boolean
    allowReview: boolean
  }
}

// ============== 事件处理器接口 ==============

export interface EventHandler<T = any> {
  handle(socket: Socket, data: T, callback?: (response: any) => void): Promise<void>
}

// ============== 具体事件处理器实现 ==============

/**
 * 投票事件处理器
 */
export class VoteEventHandler implements EventHandler<VoteData> {
  private votes: Map<string, Map<string, string>> = new Map() // questionId -> (studentId -> optionId)
  private voteResults: Map<string, Map<string, number>> = new Map() // questionId -> (optionId -> count)

  constructor(private socketServer: SocketServer) {}

  async handle(socket: Socket, data: VoteData, callback?: (response: any) => void): Promise<void> {
    try {
      const { classroomId, sessionId, questionId, optionId, studentId } = data

      // 验证数据
      if (!classroomId || !questionId || !optionId || !studentId) {
        callback?.({ success: false, error: 'Missing required fields' })
        return
      }

      // 记录投票
      if (!this.votes.has(questionId)) {
        this.votes.set(questionId, new Map())
        this.voteResults.set(questionId, new Map())
      }

      const questionVotes = this.votes.get(questionId)!
      const results = this.voteResults.get(questionId)!

      // 处理重复投票（覆盖之前的投票）
      const previousVote = questionVotes.get(studentId)
      if (previousVote) {
        const prevCount = results.get(previousVote) || 0
        results.set(previousVote, Math.max(0, prevCount - 1))
      }

      // 记录新投票
      questionVotes.set(studentId, optionId)
      const currentCount = results.get(optionId) || 0
      results.set(optionId, currentCount + 1)

      // 准备广播数据
      const voteUpdate = {
        classroomId,
        sessionId,
        questionId,
        optionId,
        studentId,
        results: Object.fromEntries(results),
        totalVotes: questionVotes.size,
        timestamp: Date.now()
      }

      // 广播投票更新给课堂所有用户
      this.socketServer.broadcastToClassroom(classroomId, 'vote-update' as any, voteUpdate)

      callback?.({
        success: true,
        data: voteUpdate
      })

      console.log(`Vote recorded: Student ${studentId} voted ${optionId} for question ${questionId}`)

    } catch (error) {
      console.error('Error handling vote:', error)
      callback?.({
        success: false,
        error: 'Failed to process vote'
      })
    }
  }

  /**
   * 获取投票结果
   */
  getVoteResults(questionId: string) {
    return {
      votes: Object.fromEntries(this.votes.get(questionId) || new Map()),
      results: Object.fromEntries(this.voteResults.get(questionId) || new Map())
    }
  }

  /**
   * 清除投票数据
   */
  clearVotes(questionId: string) {
    this.votes.delete(questionId)
    this.voteResults.delete(questionId)
  }
}

/**
 * 消息事件处理器
 */
export class MessageEventHandler implements EventHandler<MessageData> {
  private messageHistory: Map<string, MessageData[]> = new Map() // roomId -> messages
  private readonly MAX_HISTORY = 500

  constructor(private socketServer: SocketServer) {}

  async handle(socket: Socket, data: MessageData, callback?: (response: any) => void): Promise<void> {
    try {
      const { classroomId, sessionId, senderId, senderName, senderType, content, type } = data

      // 验证数据
      if (!classroomId || !senderId || !senderName || !content) {
        callback?.({ success: false, error: 'Missing required fields' })
        return
      }

      // 创建消息对象
      const message: MessageData = {
        ...data,
        timestamp: Date.now()
      }

      // 保存消息历史
      const roomId = sessionId || classroomId
      if (!this.messageHistory.has(roomId)) {
        this.messageHistory.set(roomId, [])
      }

      const history = this.messageHistory.get(roomId)!
      history.push(message)

      // 保持历史记录在限制范围内
      if (history.length > this.MAX_HISTORY) {
        history.shift()
      }

      // 广播消息
      const targetRoom = sessionId ? `session-${sessionId}` : classroomId
      this.socketServer.broadcastToClassroom(targetRoom, 'new-message' as any, message)

      callback?.({
        success: true,
        data: {
          messageId: `msg-${message.timestamp}`,
          timestamp: message.timestamp
        }
      })

      console.log(`Message sent in ${targetRoom}: ${senderName} (${senderType}): ${content.substring(0, 50)}...`)

    } catch (error) {
      console.error('Error handling message:', error)
      callback?.({
        success: false,
        error: 'Failed to send message'
      })
    }
  }

  /**
   * 获取消息历史
   */
  getMessageHistory(roomId: string, limit: number = 50): MessageData[] {
    const history = this.messageHistory.get(roomId) || []
    return history.slice(-limit)
  }

  /**
   * 清除消息历史
   */
  clearMessageHistory(roomId: string): void {
    this.messageHistory.delete(roomId)
  }
}

/**
 * 房间管理事件处理器
 */
export class RoomManagementHandler implements EventHandler<RoomManagementData> {
  private rooms: Map<string, {
    id: string
    type: 'classroom' | 'session' | 'breakout'
    members: Set<string>
    metadata: any
    createdAt: number
  }> = new Map()

  constructor(private socketServer: SocketServer) {}

  async handle(socket: Socket, data: RoomManagementData, callback?: (response: any) => void): Promise<void> {
    try {
      const { action, roomId, roomType, userId, metadata } = data

      switch (action) {
        case 'create':
          await this.handleCreateRoom(socket, roomId, roomType, userId, metadata, callback)
          break

        case 'join':
          await this.handleJoinRoom(socket, roomId, userId, callback)
          break

        case 'leave':
          await this.handleLeaveRoom(socket, roomId, userId, callback)
          break

        case 'update':
          await this.handleUpdateRoom(socket, roomId, metadata, callback)
          break

        case 'delete':
          await this.handleDeleteRoom(socket, roomId, userId, callback)
          break

        default:
          callback?.({ success: false, error: 'Invalid action' })
      }

    } catch (error) {
      console.error('Error handling room management:', error)
      callback?.({
        success: false,
        error: 'Failed to manage room'
      })
    }
  }

  private async handleCreateRoom(
    socket: Socket, 
    roomId: string, 
    roomType: 'classroom' | 'session' | 'breakout', 
    userId: string, 
    metadata: any, 
    callback?: (response: any) => void
  ): Promise<void> {
    if (this.rooms.has(roomId)) {
      callback?.({ success: false, error: 'Room already exists' })
      return
    }

    const room = {
      id: roomId,
      type: roomType,
      members: new Set([userId]),
      metadata: metadata || {},
      createdAt: Date.now()
    }

    this.rooms.set(roomId, room)
    await socket.join(roomId)

    callback?.({
      success: true,
      data: {
        roomId,
        roomType,
        memberCount: room.members.size
      }
    })

    console.log(`Room ${roomId} (${roomType}) created by user ${userId}`)
  }

  private async handleJoinRoom(socket: Socket, roomId: string, userId: string, callback?: (response: any) => void): Promise<void> {
    const room = this.rooms.get(roomId)
    if (!room) {
      callback?.({ success: false, error: 'Room not found' })
      return
    }

    room.members.add(userId)
    await socket.join(roomId)

    // 通知房间其他成员
    socket.to(roomId).emit('user-joined' as any, {
      roomId,
      userId,
      memberCount: room.members.size,
      timestamp: Date.now()
    })

    callback?.({
      success: true,
      data: {
        roomId,
        memberCount: room.members.size
      }
    })

    console.log(`User ${userId} joined room ${roomId}`)
  }

  private async handleLeaveRoom(socket: Socket, roomId: string, userId: string, callback?: (response: any) => void): Promise<void> {
    const room = this.rooms.get(roomId)
    if (!room) {
      callback?.({ success: false, error: 'Room not found' })
      return
    }

    room.members.delete(userId)
    await socket.leave(roomId)

    // 通知房间其他成员
    socket.to(roomId).emit('user-left' as any, {
      roomId,
      userId,
      memberCount: room.members.size,
      timestamp: Date.now()
    })

    // 如果房间没有成员了，删除房间
    if (room.members.size === 0) {
      this.rooms.delete(roomId)
    }

    callback?.({ success: true })

    console.log(`User ${userId} left room ${roomId}`)
  }

  private async handleUpdateRoom(socket: Socket, roomId: string, metadata: any, callback?: (response: any) => void): Promise<void> {
    const room = this.rooms.get(roomId)
    if (!room) {
      callback?.({ success: false, error: 'Room not found' })
      return
    }

    room.metadata = { ...room.metadata, ...metadata }

    // 通知房间成员
    this.socketServer.broadcastToClassroom(roomId, 'room-updated' as any, {
      roomId,
      metadata: room.metadata,
      timestamp: Date.now()
    })

    callback?.({ success: true })
  }

  private async handleDeleteRoom(socket: Socket, roomId: string, userId: string, callback?: (response: any) => void): Promise<void> {
    const room = this.rooms.get(roomId)
    if (!room) {
      callback?.({ success: false, error: 'Room not found' })
      return
    }

    // 通知所有成员房间将被删除
    this.socketServer.broadcastToClassroom(roomId, 'room-deleted' as any, {
      roomId,
      deletedBy: userId,
      timestamp: Date.now()
    })

    // 移除所有成员
    for (const memberId of room.members) {
      const memberSocket = this.socketServer['userSockets'].get(memberId)
      if (memberSocket) {
        await memberSocket.leave(roomId)
      }
    }

    this.rooms.delete(roomId)

    callback?.({ success: true })

    console.log(`Room ${roomId} deleted by user ${userId}`)
  }

  getRoomInfo(roomId: string) {
    return this.rooms.get(roomId)
  }

  getAllRooms() {
    return Array.from(this.rooms.values())
  }
}

/**
 * 用户状态事件处理器
 */
export class UserStatusHandler implements EventHandler<UserStatusData> {
  private userStatuses: Map<string, UserStatusData> = new Map()

  constructor(private socketServer: SocketServer) {}

  async handle(socket: Socket, data: UserStatusData, callback?: (response: any) => void): Promise<void> {
    try {
      const { userId, status, activity, classroomId, sessionId } = data

      const statusData: UserStatusData = {
        userId,
        status,
        activity,
        classroomId,
        sessionId
      }

      this.userStatuses.set(userId, statusData)

      // 广播状态更新
      if (classroomId) {
        this.socketServer.broadcastToClassroom(classroomId, 'user-status-changed' as any, {
          userId,
          status,
          activity,
          timestamp: Date.now()
        })
      }

      callback?.({ success: true })

      console.log(`User ${userId} status updated: ${status} (${activity || 'none'})`)

    } catch (error) {
      console.error('Error handling user status:', error)
      callback?.({
        success: false,
        error: 'Failed to update user status'
      })
    }
  }

  getUserStatus(userId: string): UserStatusData | undefined {
    return this.userStatuses.get(userId)
  }

  getClassroomUserStatuses(classroomId: string): UserStatusData[] {
    return Array.from(this.userStatuses.values())
      .filter(status => status.classroomId === classroomId)
  }
}

/**
 * 广播事件处理器
 */
export class BroadcastHandler implements EventHandler<BroadcastData> {
  constructor(private socketServer: SocketServer) {}

  async handle(socket: Socket, data: BroadcastData, callback?: (response: any) => void): Promise<void> {
    try {
      const { type, title, message, priority, targetType, targetIds, metadata } = data

      const broadcastMessage = {
        type,
        title,
        message,
        priority,
        metadata: {
          ...metadata,
          timestamp: Date.now()
        }
      }

      let targetCount = 0

      switch (targetType) {
        case 'all':
          // 广播给所有连接的用户
          this.socketServer['io'].emit('broadcast' as any, broadcastMessage)
          targetCount = this.socketServer['socketUsers'].size
          break

        case 'classroom':
          // 广播给特定课堂
          if (targetIds) {
            targetIds.forEach(classroomId => {
              this.socketServer.broadcastToClassroom(classroomId, 'broadcast' as any, broadcastMessage)
              targetCount += this.socketServer.getClassroomUserCount(classroomId)
            })
          }
          break

        case 'user':
          // 发送给特定用户
          if (targetIds) {
            targetIds.forEach(userId => {
              if (this.socketServer.sendToUser(userId, 'broadcast' as any, broadcastMessage)) {
                targetCount++
              }
            })
          }
          break

        case 'session':
          // 广播给特定会话
          if (targetIds) {
            targetIds.forEach(sessionId => {
              this.socketServer.broadcastToClassroom(`session-${sessionId}`, 'broadcast' as any, broadcastMessage)
            })
          }
          break
      }

      callback?.({
        success: true,
        data: {
          targetCount,
          timestamp: Date.now()
        }
      })

      console.log(`Broadcast sent to ${targetCount} users: ${message.substring(0, 50)}...`)

    } catch (error) {
      console.error('Error handling broadcast:', error)
      callback?.({
        success: false,
        error: 'Failed to send broadcast'
      })
    }
  }
}

// ============== 事件处理器工厂 ==============

/**
 * 事件处理器工厂
 */
export class EventHandlerFactory {
  private handlers: Map<string, EventHandler> = new Map()

  constructor(private socketServer: SocketServer) {
    this.initializeHandlers()
  }

  private initializeHandlers(): void {
    this.handlers.set('vote', new VoteEventHandler(this.socketServer))
    this.handlers.set('message', new MessageEventHandler(this.socketServer))
    this.handlers.set('room-management', new RoomManagementHandler(this.socketServer))
    this.handlers.set('user-status', new UserStatusHandler(this.socketServer))
    this.handlers.set('broadcast', new BroadcastHandler(this.socketServer))
  }

  getHandler(eventType: string): EventHandler | undefined {
    return this.handlers.get(eventType)
  }

  registerHandler(eventType: string, handler: EventHandler): void {
    this.handlers.set(eventType, handler)
  }

  getAllHandlers(): Map<string, EventHandler> {
    return new Map(this.handlers)
  }
}

// ============== 导出 ==============

export {
  EventHandlerFactory,
  VoteEventHandler,
  MessageEventHandler,
  RoomManagementHandler,
  UserStatusHandler,
  BroadcastHandler
}