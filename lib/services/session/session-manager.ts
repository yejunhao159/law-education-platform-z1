/**
 * 会话管理服务
 * @module services/session/session-manager
 * @description 提供会话的创建、管理、生命周期控制和6位课堂码生成功能
 */

import {
  ClassroomSession,
  StudentInfo,
  DialogueState,
  DialogueLevel,
  VoteData,
  ErrorCode,
  SocraticError,
  SESSION_EXPIRY_TIME,
  CLASSROOM_CODE_LENGTH
} from '@/src/domains/socratic-dialogue/types'

// ============== 会话管理接口 ==============

/**
 * 会话创建选项
 */
export interface SessionCreateOptions {
  /** 教师ID（可选） */
  teacherId?: string
  /** 会话名称 */
  sessionName?: string
  /** 自定义过期时间（毫秒） */
  customExpiryTime?: number
  /** 最大学生数量 */
  maxStudents?: number
  /** 是否允许匿名加入 */
  allowAnonymous?: boolean
}

/**
 * 学生加入选项
 */
export interface StudentJoinOptions {
  /** 学生显示名称 */
  displayName: string
  /** 学生头像URL（可选） */
  avatar?: string
  /** 自定义学生信息 */
  customInfo?: Record<string, any>
}

/**
 * 会话统计数据
 */
export interface SessionStatistics {
  /** 总会话数 */
  totalSessions: number
  /** 活跃会话数 */
  activeSessions: number
  /** 已过期会话数 */
  expiredSessions: number
  /** 总学生数 */
  totalStudents: number
  /** 在线学生数 */
  onlineStudents: number
  /** 平均会话时长（毫秒） */
  avgSessionDuration: number
}

/**
 * 会话操作结果
 */
export interface SessionOperationResult<T> {
  /** 是否成功 */
  success: boolean
  /** 结果数据 */
  data?: T
  /** 错误信息 */
  error?: SocraticError
  /** 操作元数据 */
  metadata?: {
    /** 操作时间戳 */
    timestamp: number
    /** 操作耗时 */
    duration: number
    /** 操作类型 */
    operation: string
    /** 会话代码 */
    sessionCode?: string
  }
}

// ============== 会话管理器类 ==============

/**
 * 会话管理器
 */
export class SessionManager {
  private sessions: Map<string, ClassroomSession> = new Map()
  private codeToSessionId: Map<string, string> = new Map()
  private cleanupInterval?: NodeJS.Timeout
  private readonly maxSessions: number
  private readonly cleanupIntervalMs: number

  constructor(options: {
    maxSessions?: number
    cleanupIntervalMs?: number
  } = {}) {
    this.maxSessions = options.maxSessions || 1000
    this.cleanupIntervalMs = options.cleanupIntervalMs || 5 * 60 * 1000 // 5分钟

    this.startCleanupTimer()
  }

  // ============== 会话创建和管理 ==============

  /**
   * 创建新会话
   */
  public createSession(options: SessionCreateOptions = {}): SessionOperationResult<ClassroomSession> {
    const startTime = Date.now()

    try {
      // 检查会话数量限制
      if (this.sessions.size >= this.maxSessions) {
        return {
          success: false,
          error: {
            code: ErrorCode.SESSION_FULL,
            message: `会话数量已达上限 (${this.maxSessions})`,
            timestamp: Date.now()
          }
        }
      }

      // 生成唯一的6位课堂码
      const classroomCode = this.generateUniqueClassroomCode()
      const sessionId = this.generateSessionId()
      const now = Date.now()

      // 创建会话对象
      const session: ClassroomSession = {
        code: classroomCode,
        createdAt: now,
        expiresAt: now + (options.customExpiryTime || SESSION_EXPIRY_TIME),
        teacherId: options.teacherId,
        students: new Map<string, StudentInfo>(),
        status: 'waiting',
        statistics: {
          totalParticipants: 0,
          activeParticipants: 0,
          avgUnderstanding: 0,
          levelDurations: {
            [DialogueLevel.OBSERVATION]: 0,
            [DialogueLevel.FACTS]: 0,
            [DialogueLevel.ANALYSIS]: 0,
            [DialogueLevel.APPLICATION]: 0,
            [DialogueLevel.VALUES]: 0
          }
        }
      }

      // 存储会话
      this.sessions.set(sessionId, session)
      this.codeToSessionId.set(classroomCode, sessionId)

      const duration = Date.now() - startTime

      return {
        success: true,
        data: session,
        metadata: {
          timestamp: now,
          duration,
          operation: 'createSession',
          sessionCode: classroomCode
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `创建会话失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * 根据课堂码获取会话
   */
  public getSessionByCode(code: string): SessionOperationResult<ClassroomSession> {
    const startTime = Date.now()

    try {
      const sessionId = this.codeToSessionId.get(code)
      if (!sessionId) {
        return {
          success: false,
          error: {
            code: ErrorCode.SESSION_NOT_FOUND,
            message: `课堂码 ${code} 对应的会话不存在`,
            timestamp: Date.now()
          }
        }
      }

      const session = this.sessions.get(sessionId)
      if (!session) {
        // 清理无效映射
        this.codeToSessionId.delete(code)
        return {
          success: false,
          error: {
            code: ErrorCode.SESSION_NOT_FOUND,
            message: `会话不存在或已被清理`,
            timestamp: Date.now()
          }
        }
      }

      // 检查会话是否已过期
      if (Date.now() > session.expiresAt) {
        return {
          success: false,
          error: {
            code: ErrorCode.SESSION_EXPIRED,
            message: '会话已过期',
            timestamp: Date.now()
          }
        }
      }

      const duration = Date.now() - startTime

      return {
        success: true,
        data: session,
        metadata: {
          timestamp: Date.now(),
          duration,
          operation: 'getSession',
          sessionCode: code
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `获取会话失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 学生管理 ==============

  /**
   * 学生加入会话
   */
  public addStudentToSession(
    code: string,
    studentId: string,
    options: StudentJoinOptions
  ): SessionOperationResult<StudentInfo> {
    const startTime = Date.now()

    try {
      // 获取会话
      const sessionResult = this.getSessionByCode(code)
      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as SessionOperationResult<StudentInfo>
      }

      const session = sessionResult.data

      // 检查学生是否已存在
      if (session.students.has(studentId)) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: '学生已在会话中',
            timestamp: Date.now()
          }
        }
      }

      // 创建学生信息
      const studentInfo: StudentInfo = {
        id: studentId,
        displayName: options.displayName,
        joinedAt: Date.now(),
        isOnline: true,
        lastActiveAt: Date.now(),
        handRaised: false
      }
      
      // 添加可选属性
      if (options.avatar) {
        (studentInfo as any).avatar = options.avatar
      }
      
      if (options.customInfo) {
        Object.assign(studentInfo, options.customInfo)
      }

      // 添加学生到会话
      session.students.set(studentId, studentInfo)

      // 更新统计信息
      if (session.statistics) {
        session.statistics.totalParticipants = session.students.size
        session.statistics.activeParticipants = Array.from(session.students.values())
          .filter(s => s.isOnline).length
      }

      // 如果会话还在等待状态且有学生加入，可以考虑激活
      if (session.status === 'waiting' && session.students.size > 0) {
        session.status = 'active'
      }

      const duration = Date.now() - startTime

      return {
        success: true,
        data: studentInfo,
        metadata: {
          timestamp: Date.now(),
          duration,
          operation: 'addStudent',
          sessionCode: code
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `学生加入失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * 学生离开会话
   */
  public removeStudentFromSession(code: string, studentId: string): SessionOperationResult<boolean> {
    const startTime = Date.now()

    try {
      // 获取会话
      const sessionResult = this.getSessionByCode(code)
      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as SessionOperationResult<boolean>
      }

      const session = sessionResult.data

      // 检查学生是否存在
      if (!session.students.has(studentId)) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: '学生不在会话中',
            timestamp: Date.now()
          }
        }
      }

      // 移除学生
      session.students.delete(studentId)

      // 更新统计信息
      if (session.statistics) {
        session.statistics.totalParticipants = session.students.size
        session.statistics.activeParticipants = Array.from(session.students.values())
          .filter(s => s.isOnline).length
      }

      // 如果没有学生了，可以考虑将状态改回等待
      if (session.students.size === 0 && session.status === 'active') {
        session.status = 'waiting'
      }

      const duration = Date.now() - startTime

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: Date.now(),
          duration,
          operation: 'removeStudent',
          sessionCode: code
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `学生离开失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * 更新学生活跃状态
   */
  public updateStudentActivity(code: string, studentId: string): SessionOperationResult<boolean> {
    const startTime = Date.now()

    try {
      // 获取会话
      const sessionResult = this.getSessionByCode(code)
      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as SessionOperationResult<boolean>
      }

      const session = sessionResult.data
      const student = session.students.get(studentId)

      if (!student) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_INPUT,
            message: '学生不在会话中',
            timestamp: Date.now()
          }
        }
      }

      // 更新最后活跃时间
      student.lastActiveAt = Date.now()
      student.isOnline = true

      const duration = Date.now() - startTime

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: Date.now(),
          duration,
          operation: 'updateActivity',
          sessionCode: code
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `更新学生活跃状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 会话状态管理 ==============

  /**
   * 更新会话状态
   */
  public updateSessionStatus(
    code: string,
    status: 'waiting' | 'active' | 'ended'
  ): SessionOperationResult<boolean> {
    const startTime = Date.now()

    try {
      // 获取会话
      const sessionResult = this.getSessionByCode(code)
      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as SessionOperationResult<boolean>
      }

      const session = sessionResult.data
      const oldStatus = session.status

      // 更新状态
      session.status = status

      // 如果会话结束，清理相关资源
      if (status === 'ended') {
        // 将所有学生设为离线
        for (const student of session.students.values()) {
          student.isOnline = false
        }

        if (session.statistics) {
          session.statistics.activeParticipants = 0
        }
      }

      const duration = Date.now() - startTime

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: Date.now(),
          duration,
          operation: 'updateStatus',
          sessionCode: code
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `更新会话状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * 延长会话过期时间
   */
  public extendSession(code: string, additionalTime: number): SessionOperationResult<boolean> {
    const startTime = Date.now()

    try {
      // 获取会话
      const sessionResult = this.getSessionByCode(code)
      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as SessionOperationResult<boolean>
      }

      const session = sessionResult.data

      // 延长过期时间
      session.expiresAt += additionalTime

      const duration = Date.now() - startTime

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: Date.now(),
          duration,
          operation: 'extendSession',
          sessionCode: code
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `延长会话失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 投票和问题管理 ==============

  /**
   * 设置当前问题
   */
  public setCurrentQuestion(code: string, question: string): SessionOperationResult<boolean> {
    const startTime = Date.now()

    try {
      // 获取会话
      const sessionResult = this.getSessionByCode(code)
      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as SessionOperationResult<boolean>
      }

      const session = sessionResult.data
      session.currentQuestion = question

      const duration = Date.now() - startTime

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: Date.now(),
          duration,
          operation: 'setQuestion',
          sessionCode: code
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `设置问题失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  /**
   * 设置当前投票
   */
  public setCurrentVote(code: string, voteData: VoteData): SessionOperationResult<boolean> {
    const startTime = Date.now()

    try {
      // 获取会话
      const sessionResult = this.getSessionByCode(code)
      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult as SessionOperationResult<boolean>
      }

      const session = sessionResult.data
      session.currentVote = voteData

      const duration = Date.now() - startTime

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: Date.now(),
          duration,
          operation: 'setVote',
          sessionCode: code
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: `设置投票失败: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now()
        }
      }
    }
  }

  // ============== 统计和监控 ==============

  /**
   * 获取会话统计信息
   */
  public getSessionStats(): SessionStatistics {
    const now = Date.now()
    let totalStudents = 0
    let onlineStudents = 0
    let totalDuration = 0
    let activeSessions = 0
    let expiredSessions = 0

    for (const session of this.sessions.values()) {
      totalStudents += session.students.size
      onlineStudents += Array.from(session.students.values()).filter(s => s.isOnline).length

      if (now > session.expiresAt) {
        expiredSessions++
      } else if (session.status === 'active') {
        activeSessions++
      }

      totalDuration += (now - session.createdAt)
    }

    const avgSessionDuration = this.sessions.size > 0 && totalDuration > 0 ? totalDuration / this.sessions.size : 0

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      totalStudents,
      onlineStudents,
      avgSessionDuration
    }
  }

  /**
   * 获取所有活跃会话
   */
  public getActiveSessions(): ClassroomSession[] {
    const now = Date.now()
    const activeSessions: ClassroomSession[] = []

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt && session.status !== 'ended') {
        activeSessions.push(session)
      }
    }

    return activeSessions
  }

  // ============== 工具方法 ==============

  /**
   * 生成唯一的6位课堂码
   */
  private generateUniqueClassroomCode(): string {
    let code: string
    let attempts = 0
    const maxAttempts = 100

    do {
      code = this.generateClassroomCode()
      attempts++

      if (attempts >= maxAttempts) {
        throw new Error('无法生成唯一的课堂码，请稍后重试')
      }
    } while (this.codeToSessionId.has(code))

    return code
  }

  /**
   * 生成6位数字课堂码
   */
  private generateClassroomCode(): string {
    let code = ''
    for (let i = 0; i < CLASSROOM_CODE_LENGTH; i++) {
      code += Math.floor(Math.random() * 10).toString()
    }
    return code
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessionsInternal()
    }, this.cleanupIntervalMs)
  }

  /**
   * 清理过期会话（内部方法）
   */
  private cleanupExpiredSessionsInternal(): void {
    const now = Date.now()
    const expiredSessions: string[] = []

    // 找出过期的会话
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId)
        // 同时清理课堂码映射
        this.codeToSessionId.delete(session.code)
      }
    }

    // 删除过期会话
    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId)
    }

    if (expiredSessions.length > 0) {
      console.log(`清理了 ${expiredSessions.length} 个过期会话`)
    }
  }

  /**
   * 手动清理过期会话（公共接口）
   */
  public cleanupExpiredSessions(): void {
    this.cleanupExpiredSessionsInternal()
  }

  /**
   * 停止会话管理器
   */
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    // 清理所有会话
    this.sessions.clear()
    this.codeToSessionId.clear()
  }

  /**
   * 获取管理器状态
   */
  public getManagerStatus(): {
    isRunning: boolean
    sessionCount: number
    codeMapCount: number
    maxSessions: number
  } {
    return {
      isRunning: !!this.cleanupInterval,
      sessionCount: this.sessions.size,
      codeMapCount: this.codeToSessionId.size,
      maxSessions: this.maxSessions
    }
  }
}