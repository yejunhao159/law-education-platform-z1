/**
 * 会话管理服务测试
 * @description 测试SessionManager的会话创建、管理、生命周期控制功能
 */

import { SessionManager } from '../../../lib/services/session/session-manager'
import {
  DialogueLevel,
  ErrorCode,
  SESSION_EXPIRY_TIME,
  CLASSROOM_CODE_LENGTH
} from '../../../lib/types/socratic'

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    sessionManager = new SessionManager({
      maxSessions: 10,
      cleanupIntervalMs: 1000 // 1秒，用于测试
    })
  })

  afterEach(() => {
    sessionManager.stop()
  })

  describe('会话创建功能', () => {
    it('应该成功创建新会话', () => {
      const result = sessionManager.createSession({
        teacherId: 'teacher-1',
        sessionName: '测试会话'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.code).toHaveLength(CLASSROOM_CODE_LENGTH)
      expect(result.data?.teacherId).toBe('teacher-1')
      expect(result.data?.status).toBe('waiting')
      expect(result.data?.students.size).toBe(0)
      expect(result.metadata?.operation).toBe('createSession')
    })

    it('应该生成唯一的6位课堂码', () => {
      const codes = new Set<string>()
      
      // 创建多个会话，验证课堂码唯一性
      for (let i = 0; i < 5; i++) {
        const result = sessionManager.createSession()
        expect(result.success).toBe(true)
        expect(result.data?.code).toMatch(/^\d{6}$/) // 6位数字
        codes.add(result.data!.code)
      }
      
      expect(codes.size).toBe(5) // 所有课堂码都应该唯一
    })

    it('应该设置正确的过期时间', () => {
      const result = sessionManager.createSession()
      
      expect(result.success).toBe(true)
      expect(result.data?.expiresAt).toBeGreaterThan(Date.now())
      expect(result.data?.expiresAt).toBeLessThanOrEqual(
        Date.now() + SESSION_EXPIRY_TIME + 1000 // 允许1秒误差
      )
    })

    it('应该支持自定义过期时间', () => {
      const customExpiryTime = 2 * 60 * 60 * 1000 // 2小时
      const result = sessionManager.createSession({ customExpiryTime })
      
      expect(result.success).toBe(true)
      expect(result.data?.expiresAt).toBeLessThanOrEqual(
        Date.now() + customExpiryTime + 1000 // 允许1秒误差
      )
    })

    it('应该在达到最大会话数时拒绝创建', () => {
      // 创建到达上限
      for (let i = 0; i < 10; i++) {
        const result = sessionManager.createSession()
        expect(result.success).toBe(true)
      }

      // 第11个应该失败
      const result = sessionManager.createSession()
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCode.SESSION_FULL)
    })

    it('应该初始化统计信息', () => {
      const result = sessionManager.createSession()
      
      expect(result.success).toBe(true)
      expect(result.data?.statistics).toEqual({
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
      })
    })
  })

  describe('会话获取功能', () => {
    let sessionCode: string

    beforeEach(() => {
      const result = sessionManager.createSession({ teacherId: 'teacher-1' })
      sessionCode = result.data!.code
    })

    it('应该能够通过课堂码获取会话', () => {
      const result = sessionManager.getSessionByCode(sessionCode)

      expect(result.success).toBe(true)
      expect(result.data?.code).toBe(sessionCode)
      expect(result.data?.teacherId).toBe('teacher-1')
      expect(result.metadata?.operation).toBe('getSession')
    })

    it('应该在会话不存在时返回错误', () => {
      const result = sessionManager.getSessionByCode('999999')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCode.SESSION_NOT_FOUND)
    })

    it('应该在会话过期时返回错误', () => {
      // 创建一个已过期的会话
      const expiredResult = sessionManager.createSession({
        customExpiryTime: -1000 // 1秒前过期
      })
      
      expect(expiredResult.success).toBe(true)
      
      const result = sessionManager.getSessionByCode(expiredResult.data!.code)
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCode.SESSION_EXPIRED)
    })
  })

  describe('学生管理功能', () => {
    let sessionCode: string

    beforeEach(() => {
      const result = sessionManager.createSession({ teacherId: 'teacher-1' })
      sessionCode = result.data!.code
    })

    it('应该能够添加学生到会话', () => {
      const result = sessionManager.addStudentToSession(sessionCode, 'student-1', {
        displayName: '学生1',
        avatar: 'https://example.com/avatar1.jpg'
      })

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('student-1')
      expect(result.data?.displayName).toBe('学生1')
      expect(result.data?.avatar).toBe('https://example.com/avatar1.jpg')
      expect(result.data?.isOnline).toBe(true)
      expect(result.metadata?.operation).toBe('addStudent')
    })

    it('应该在添加学生后更新会话统计', () => {
      sessionManager.addStudentToSession(sessionCode, 'student-1', {
        displayName: '学生1'
      })

      const sessionResult = sessionManager.getSessionByCode(sessionCode)
      expect(sessionResult.success).toBe(true)
      expect(sessionResult.data?.statistics?.totalParticipants).toBe(1)
      expect(sessionResult.data?.statistics?.activeParticipants).toBe(1)
    })

    it('应该在添加学生后激活会话', () => {
      const sessionResult = sessionManager.getSessionByCode(sessionCode)
      expect(sessionResult.data?.status).toBe('waiting')

      sessionManager.addStudentToSession(sessionCode, 'student-1', {
        displayName: '学生1'
      })

      const updatedResult = sessionManager.getSessionByCode(sessionCode)
      expect(updatedResult.data?.status).toBe('active')
    })

    it('应该拒绝重复添加同一学生', () => {
      sessionManager.addStudentToSession(sessionCode, 'student-1', {
        displayName: '学生1'
      })

      const result = sessionManager.addStudentToSession(sessionCode, 'student-1', {
        displayName: '学生1重复'
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCode.INVALID_INPUT)
    })

    it('应该能够移除学生', () => {
      sessionManager.addStudentToSession(sessionCode, 'student-1', {
        displayName: '学生1'
      })

      const result = sessionManager.removeStudentFromSession(sessionCode, 'student-1')

      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
      expect(result.metadata?.operation).toBe('removeStudent')
    })

    it('应该在移除学生后更新统计信息', () => {
      sessionManager.addStudentToSession(sessionCode, 'student-1', { displayName: '学生1' })
      sessionManager.addStudentToSession(sessionCode, 'student-2', { displayName: '学生2' })
      
      sessionManager.removeStudentFromSession(sessionCode, 'student-1')

      const sessionResult = sessionManager.getSessionByCode(sessionCode)
      expect(sessionResult.data?.statistics?.totalParticipants).toBe(1)
      expect(sessionResult.data?.statistics?.activeParticipants).toBe(1)
    })

    it('应该在没有学生时将会话状态改为等待', () => {
      sessionManager.addStudentToSession(sessionCode, 'student-1', { displayName: '学生1' })
      
      // 验证状态为active
      let sessionResult = sessionManager.getSessionByCode(sessionCode)
      expect(sessionResult.data?.status).toBe('active')

      sessionManager.removeStudentFromSession(sessionCode, 'student-1')

      sessionResult = sessionManager.getSessionByCode(sessionCode)
      expect(sessionResult.data?.status).toBe('waiting')
    })

    it('应该能够更新学生活跃状态', () => {
      sessionManager.addStudentToSession(sessionCode, 'student-1', { displayName: '学生1' })

      const result = sessionManager.updateStudentActivity(sessionCode, 'student-1')

      expect(result.success).toBe(true)
      expect(result.metadata?.operation).toBe('updateActivity')
    })

    it('应该在学生不存在时拒绝更新活跃状态', () => {
      const result = sessionManager.updateStudentActivity(sessionCode, 'non-existent')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCode.INVALID_INPUT)
    })
  })

  describe('会话状态管理', () => {
    let sessionCode: string

    beforeEach(() => {
      const result = sessionManager.createSession({ teacherId: 'teacher-1' })
      sessionCode = result.data!.code
    })

    it('应该能够更新会话状态', () => {
      const result = sessionManager.updateSessionStatus(sessionCode, 'ended')

      expect(result.success).toBe(true)
      expect(result.metadata?.operation).toBe('updateStatus')

      const sessionResult = sessionManager.getSessionByCode(sessionCode)
      expect(sessionResult.data?.status).toBe('ended')
    })

    it('应该在会话结束时将所有学生设为离线', () => {
      sessionManager.addStudentToSession(sessionCode, 'student-1', { displayName: '学生1' })
      sessionManager.addStudentToSession(sessionCode, 'student-2', { displayName: '学生2' })

      sessionManager.updateSessionStatus(sessionCode, 'ended')

      const sessionResult = sessionManager.getSessionByCode(sessionCode)
      const students = Array.from(sessionResult.data!.students.values())
      
      expect(students.every(s => !s.isOnline)).toBe(true)
      expect(sessionResult.data?.statistics?.activeParticipants).toBe(0)
    })

    it('应该能够延长会话过期时间', () => {
      const sessionResult = sessionManager.getSessionByCode(sessionCode)
      const originalExpiry = sessionResult.data!.expiresAt

      const additionalTime = 2 * 60 * 60 * 1000 // 2小时
      const result = sessionManager.extendSession(sessionCode, additionalTime)

      expect(result.success).toBe(true)

      const updatedResult = sessionManager.getSessionByCode(sessionCode)
      expect(updatedResult.data?.expiresAt).toBe(originalExpiry + additionalTime)
    })
  })

  describe('问题和投票管理', () => {
    let sessionCode: string

    beforeEach(() => {
      const result = sessionManager.createSession({ teacherId: 'teacher-1' })
      sessionCode = result.data!.code
    })

    it('应该能够设置当前问题', () => {
      const question = '这个案例的争议焦点是什么？'
      const result = sessionManager.setCurrentQuestion(sessionCode, question)

      expect(result.success).toBe(true)
      expect(result.metadata?.operation).toBe('setQuestion')

      const sessionResult = sessionManager.getSessionByCode(sessionCode)
      expect(sessionResult.data?.currentQuestion).toBe(question)
    })

    it('应该能够设置当前投票', () => {
      const voteData = {
        id: 'vote-1',
        question: '你认为被告应该承担责任吗？',
        choices: [
          { id: 'yes', text: '应该', count: 0 },
          { id: 'no', text: '不应该', count: 0 }
        ],
        votedStudents: new Set<string>(),
        createdAt: Date.now(),
        isEnded: false
      }

      const result = sessionManager.setCurrentVote(sessionCode, voteData)

      expect(result.success).toBe(true)
      expect(result.metadata?.operation).toBe('setVote')

      const sessionResult = sessionManager.getSessionByCode(sessionCode)
      expect(sessionResult.data?.currentVote).toEqual(voteData)
    })
  })

  describe('统计和监控功能', () => {
    it('应该返回正确的会话统计信息', () => {
      // 创建几个会话和学生
      const session1Result = sessionManager.createSession()
      const session2Result = sessionManager.createSession()
      
      sessionManager.addStudentToSession(session1Result.data!.code, 'student-1', {
        displayName: '学生1'
      })
      sessionManager.addStudentToSession(session2Result.data!.code, 'student-2', {
        displayName: '学生2'
      })

      const stats = sessionManager.getSessionStats()

      expect(stats.totalSessions).toBe(2)
      expect(stats.activeSessions).toBe(2)
      expect(stats.totalStudents).toBe(2)
      expect(stats.onlineStudents).toBe(2)
      expect(stats.expiredSessions).toBe(0)
      expect(stats.avgSessionDuration).toBeGreaterThanOrEqual(0)
    })

    it('应该返回活跃会话列表', () => {
      const session1Result = sessionManager.createSession()
      const session2Result = sessionManager.createSession()
      
      // 结束一个会话
      sessionManager.updateSessionStatus(session2Result.data!.code, 'ended')

      const activeSessions = sessionManager.getActiveSessions()

      expect(activeSessions).toHaveLength(1)
      expect(activeSessions[0].code).toBe(session1Result.data!.code)
    })

    it('应该返回管理器状态', () => {
      const status = sessionManager.getManagerStatus()

      expect(status.isRunning).toBe(true)
      expect(status.sessionCount).toBe(0)
      expect(status.codeMapCount).toBe(0)
      expect(status.maxSessions).toBe(10)
    })
  })

  describe('会话清理功能', () => {
    it('应该能够清理过期会话', () => {
      // 创建一个即将过期的会话
      const result = sessionManager.createSession({
        customExpiryTime: 100 // 100ms后过期
      })
      
      expect(result.success).toBe(true)

      // 等待过期
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // 手动触发清理
          sessionManager.cleanupExpiredSessions()

          // 验证会话已被清理
          const getResult = sessionManager.getSessionByCode(result.data!.code)
          expect(getResult.success).toBe(false)
          expect(getResult.error?.code).toBe(ErrorCode.SESSION_NOT_FOUND)

          resolve()
        }, 150)
      })
    })

    it('应该正确停止管理器', () => {
      const initialStatus = sessionManager.getManagerStatus()
      expect(initialStatus.isRunning).toBe(true)

      sessionManager.stop()

      const finalStatus = sessionManager.getManagerStatus()
      expect(finalStatus.isRunning).toBe(false)
      expect(finalStatus.sessionCount).toBe(0)
      expect(finalStatus.codeMapCount).toBe(0)
    })
  })

  describe('错误处理', () => {
    it('应该优雅处理无效的课堂码', () => {
      const result = sessionManager.getSessionByCode('invalid')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCode.SESSION_NOT_FOUND)
    })

    it('应该优雅处理对不存在会话的操作', () => {
      const result = sessionManager.addStudentToSession('999999', 'student-1', {
        displayName: '学生1'
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCode.SESSION_NOT_FOUND)
    })

    it('应该在操作失败时提供错误信息', () => {
      const result = sessionManager.removeStudentFromSession('999999', 'student-1')

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('999999')
      expect(result.error?.timestamp).toBeGreaterThan(0)
    })
  })

  describe('性能测试', () => {
    beforeEach(() => {
      // 为性能测试创建一个新的管理器，避免会话数量限制
      sessionManager.stop()
      sessionManager = new SessionManager({
        maxSessions: 100,
        cleanupIntervalMs: 60000 // 1分钟，避免测试期间清理
      })
    })

    it('创建会话性能应该在合理范围内', () => {
      const startTime = Date.now()
      
      for (let i = 0; i < 10; i++) {
        const result = sessionManager.createSession()
        expect(result.success).toBe(true)
      }
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(100) // 应该在100ms内完成
    })

    it('学生加入性能应该在合理范围内', () => {
      const sessionResult = sessionManager.createSession()
      const sessionCode = sessionResult.data!.code

      const startTime = Date.now()
      
      for (let i = 0; i < 50; i++) {
        const result = sessionManager.addStudentToSession(sessionCode, `student-${i}`, {
          displayName: `学生${i}`
        })
        expect(result.success).toBe(true)
      }
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(200) // 应该在200ms内完成
    })

    it('会话查询性能应该在合理范围内', () => {
      const codes: string[] = []
      
      // 创建多个会话
      for (let i = 0; i < 20; i++) {
        const result = sessionManager.createSession()
        expect(result.success).toBe(true)
        if (result.data) {
          codes.push(result.data.code)
        }
      }

      const startTime = Date.now()
      
      // 查询所有会话
      for (const code of codes) {
        const result = sessionManager.getSessionByCode(code)
        expect(result.success).toBe(true)
      }
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(50) // 应该在50ms内完成
    })
  })
})