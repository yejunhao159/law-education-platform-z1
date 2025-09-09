/**
 * 苏格拉底Store测试
 * @description 测试苏格拉底式问答状态管理的所有功能
 */

import { act, renderHook } from '@testing-library/react'
import { 
  useSocraticStore,
  useSocraticSession,
  useSocraticMessages,
  useSocraticConnectionStatus,
  useSocraticIsConnected,
  useSocraticSettings
} from '../socraticStore'
import {
  DialogueLevel,
  MessageRole,
  SessionMode,
  Difficulty,
  type StudentInfo,
  type Message,
  type CaseInfo
} from '../../types/socratic'

describe('SocraticStore', () => {
  beforeEach(() => {
    // 重置Store状态
    useSocraticStore.getState().resetStore()
  })

  describe('会话管理', () => {
    it('应该能够创建新会话', async () => {
      const { result } = renderHook(() => useSocraticStore())
      
      await act(async () => {
        const response = await result.current.createSession({
          sessionMode: SessionMode.CLASSROOM,
          caseId: 'test-case-1',
          teacherId: 'teacher-123'
        })
        
        expect(response.success).toBe(true)
        expect(response.sessionId).toBeDefined()
        expect(response.sessionId).toHaveLength(6)
      })
      
      expect(result.current.currentSession).toBeDefined()
      expect(result.current.currentSession?.caseId).toBe('test-case-1')
      expect(result.current.sessionMode).toBe(SessionMode.CLASSROOM)
      expect(result.current.teacherId).toBe('teacher-123')
      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectionStatus).toBe('connected')
    })

    it('应该能够加入现有会话', async () => {
      const { result } = renderHook(() => useSocraticStore())
      
      await act(async () => {
        const response = await result.current.joinSession('ABC123', {
          studentName: '张三',
          isTeacher: false
        })
        
        expect(response.success).toBe(true)
      })
      
      expect(result.current.isConnected).toBe(true)
      expect(result.current.students.size).toBe(1)
      
      const student = Array.from(result.current.students.values())[0]
      expect(student.displayName).toBe('张三')
      expect(student.isOnline).toBe(true)
    })

    it('应该能够离开会话', async () => {
      const { result } = renderHook(() => useSocraticStore())
      
      // 先创建会话
      await act(async () => {
        await result.current.createSession()
      })
      
      expect(result.current.isConnected).toBe(true)
      
      // 离开会话
      await act(async () => {
        await result.current.leaveSession()
      })
      
      expect(result.current.currentSession).toBeNull()
      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionStatus).toBe('disconnected')
      expect(result.current.messages).toHaveLength(0)
      expect(result.current.students.size).toBe(0)
    })

    it('应该能够结束会话', async () => {
      const { result } = renderHook(() => useSocraticStore())
      
      await act(async () => {
        await result.current.createSession()
        await result.current.endSession()
      })
      
      expect(result.current.currentSession?.isEnded).toBe(true)
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('消息管理', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useSocraticStore())
      await act(async () => {
        await result.current.createSession()
      })
    })

    it('应该能够发送消息', async () => {
      const { result } = renderHook(() => useSocraticStore())
      
      await act(async () => {
        await result.current.sendMessage('这个案例的争议焦点是什么？', MessageRole.STUDENT)
      })
      
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].content).toBe('这个案例的争议焦点是什么？')
      expect(result.current.messages[0].role).toBe(MessageRole.STUDENT)
      expect(result.current.messages[0].level).toBe(DialogueLevel.OBSERVATION)
      expect(result.current.isWaitingForResponse).toBe(true)
    })

    it('应该能够接收Agent响应', async () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const agentMessage: Message = {
        id: 'agent-msg-1',
        role: MessageRole.AGENT,
        content: '请仔细观察案例中的关键信息...',
        level: DialogueLevel.OBSERVATION,
        timestamp: Date.now(),
        metadata: {
          quality: 90,
          suggestions: ['关注时间线', '注意当事人关系']
        }
      }
      
      act(() => {
        result.current.receiveMessage(agentMessage)
      })
      
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0]).toEqual(agentMessage)
      expect(result.current.isWaitingForResponse).toBe(false)
    })

    it('应该能够清空消息历史', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      // 先添加一些消息
      act(() => {
        result.current.receiveMessage({
          id: 'msg-1',
          role: MessageRole.STUDENT,
          content: '测试消息',
          level: DialogueLevel.OBSERVATION,
          timestamp: Date.now()
        })
      })
      
      expect(result.current.messages).toHaveLength(1)
      
      act(() => {
        result.current.clearMessages()
      })
      
      expect(result.current.messages).toHaveLength(0)
    })

    it('应该能够切换对话层级', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      expect(result.current.currentLevel).toBe(DialogueLevel.OBSERVATION)
      
      act(() => {
        result.current.setCurrentLevel(DialogueLevel.ANALYSIS)
      })
      
      expect(result.current.currentLevel).toBe(DialogueLevel.ANALYSIS)
    })
  })

  describe('Agent设置管理', () => {
    it('应该能够更新Agent设置', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const initialSettings = result.current.agentSettings
      expect(initialSettings.difficulty).toBe(Difficulty.NORMAL)
      
      act(() => {
        result.current.updateAgentSettings({
          difficulty: Difficulty.HARD,
          temperature: 0.9,
          maxTokens: 800
        })
      })
      
      const updatedSettings = result.current.agentSettings
      expect(updatedSettings.difficulty).toBe(Difficulty.HARD)
      expect(updatedSettings.temperature).toBe(0.9)
      expect(updatedSettings.maxTokens).toBe(800)
      expect(updatedSettings.language).toBe('zh-CN') // 保持原有设置
    })

    it('应该能够设置案例信息', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const caseInfo: CaseInfo = {
        id: 'case-001',
        type: '民事',
        facts: ['甲方签订合同', '乙方违约', '造成经济损失'],
        disputes: ['违约责任认定', '损失赔偿金额'],
        laws: ['合同法第107条'],
        judgment: '判决乙方承担违约责任'
      }
      
      act(() => {
        result.current.setCase(caseInfo)
      })
      
      expect(result.current.currentCase).toEqual(caseInfo)
    })
  })

  describe('课堂管理', () => {
    it('应该能够添加学生', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const student: StudentInfo = {
        id: 'student-001',
        displayName: '李四',
        joinedAt: Date.now(),
        isOnline: true,
        lastActiveAt: Date.now()
      }
      
      act(() => {
        result.current.addStudent(student)
      })
      
      expect(result.current.students.size).toBe(1)
      expect(result.current.students.get('student-001')).toEqual(student)
    })

    it('应该能够移除学生', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const student: StudentInfo = {
        id: 'student-002',
        displayName: '王五',
        joinedAt: Date.now(),
        isOnline: true,
        lastActiveAt: Date.now()
      }
      
      act(() => {
        result.current.addStudent(student)
      })
      
      expect(result.current.students.size).toBe(1)
      
      act(() => {
        result.current.removeStudent('student-002')
      })
      
      expect(result.current.students.size).toBe(0)
    })

    it('应该能够更新学生状态', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const student: StudentInfo = {
        id: 'student-003',
        displayName: '赵六',
        joinedAt: Date.now(),
        isOnline: true,
        lastActiveAt: Date.now()
      }
      
      act(() => {
        result.current.addStudent(student)
        result.current.updateStudentStatus('student-003', {
          handRaised: true,
          handRaisedAt: Date.now()
        })
      })
      
      const updatedStudent = result.current.students.get('student-003')
      expect(updatedStudent?.handRaised).toBe(true)
      expect(updatedStudent?.handRaisedAt).toBeDefined()
    })

    it('应该能够设置当前问题', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const question = '请分析这个案例中的法律关系'
      
      act(() => {
        result.current.setCurrentQuestion(question)
      })
      
      expect(result.current.currentQuestion).toBe(question)
    })

    it('应该能够进行投票', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const voteData = {
        id: 'vote-001',
        question: '被告是否应该承担责任？',
        choices: [
          { id: 'yes', text: '应该', count: 0 },
          { id: 'no', text: '不应该', count: 0 }
        ],
        votedStudents: new Set<string>(),
        createdAt: Date.now(),
        isEnded: false
      }
      
      act(() => {
        result.current.setCurrentVote(voteData)
        result.current.castVote('student-001', 'yes')
      })
      
      expect(result.current.currentVote?.choices[0].count).toBe(1)
      expect(result.current.currentVote?.votedStudents.has('student-001')).toBe(true)
    })
  })

  describe('UI状态管理', () => {
    it('应该能够管理连接状态', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      act(() => {
        result.current.setConnectionStatus('connecting')
      })
      
      expect(result.current.connectionStatus).toBe('connecting')
      expect(result.current.isConnected).toBe(false)
      
      act(() => {
        result.current.setConnectionStatus('connected')
      })
      
      expect(result.current.connectionStatus).toBe('connected')
      expect(result.current.isConnected).toBe(true)
    })

    it('应该能够管理错误状态', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const errorMessage = '网络连接失败'
      
      act(() => {
        result.current.setError(errorMessage)
      })
      
      expect(result.current.errorMessage).toBe(errorMessage)
      
      act(() => {
        result.current.setError(null)
      })
      
      expect(result.current.errorMessage).toBeNull()
    })

    it('应该能够管理加载状态', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      act(() => {
        result.current.setLoading(true)
      })
      
      expect(result.current.isLoading).toBe(true)
      
      act(() => {
        result.current.setLoading(false)
      })
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('性能监控', () => {
    it('应该能够更新性能统计', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      act(() => {
        result.current.updatePerformance({
          questionCount: 5,
          correctRate: 80,
          avgResponseTime: 1500
        })
      })
      
      expect(result.current.performance.questionCount).toBe(5)
      expect(result.current.performance.correctRate).toBe(80)
      expect(result.current.performance.avgResponseTime).toBe(1500)
    })

    it('应该能够缓存响应', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      const cachedResponse = {
        key: 'test-key',
        question: '测试问题',
        response: {
          content: '测试回答',
          evaluation: {
            understanding: 85,
            canProgress: true
          }
        },
        useCount: 1,
        qualityScore: 90,
        createdAt: Date.now(),
        lastUsedAt: Date.now()
      }
      
      act(() => {
        result.current.cacheResponse('test-key', cachedResponse)
      })
      
      const retrieved = result.current.getCachedResponse('test-key')
      expect(retrieved).toEqual(cachedResponse)
    })
  })

  describe('工具方法', () => {
    it('应该能够获取会话统计', async () => {
      const { result } = renderHook(() => useSocraticStore())
      
      await act(async () => {
        await result.current.createSession()
        await result.current.sendMessage('测试消息1')
        result.current.addStudent({
          id: 'student-1',
          displayName: '学生1',
          joinedAt: Date.now(),
          isOnline: true,
          lastActiveAt: Date.now()
        })
        result.current.addStudent({
          id: 'student-2',
          displayName: '学生2',
          joinedAt: Date.now(),
          isOnline: false,
          lastActiveAt: Date.now() - 60000
        })
      })
      
      const stats = result.current.getSessionStats()
      
      expect(stats.totalMessages).toBe(1)
      expect(stats.studentCount).toBe(2)
      expect(stats.activeStudents).toBe(1)
      expect(stats.currentLevelProgress).toBeGreaterThan(0)
    })

    it('应该能够重置Store状态', () => {
      const { result } = renderHook(() => useSocraticStore())
      
      act(() => {
        result.current.setCurrentLevel(DialogueLevel.ANALYSIS)
        result.current.setError('测试错误')
        result.current.addStudent({
          id: 'test-student',
          displayName: '测试学生',
          joinedAt: Date.now(),
          isOnline: true,
          lastActiveAt: Date.now()
        })
      })
      
      expect(result.current.currentLevel).toBe(DialogueLevel.ANALYSIS)
      expect(result.current.errorMessage).toBe('测试错误')
      expect(result.current.students.size).toBe(1)
      
      act(() => {
        result.current.resetStore()
      })
      
      expect(result.current.currentLevel).toBe(DialogueLevel.OBSERVATION)
      expect(result.current.errorMessage).toBeNull()
      expect(result.current.students.size).toBe(0)
    })
  })

  describe('选择器Hooks', () => {
    it('useSocraticMessages应该返回消息列表', () => {
      const { result: messagesResult } = renderHook(() => useSocraticMessages())
      const { result: storeResult } = renderHook(() => useSocraticStore())
      
      expect(messagesResult.current).toEqual([])
      
      act(() => {
        storeResult.current.receiveMessage({
          id: 'test-msg',
          role: MessageRole.STUDENT,
          content: '测试消息',
          level: DialogueLevel.OBSERVATION,
          timestamp: Date.now()
        })
      })
      
      expect(messagesResult.current).toHaveLength(1)
    })

    it('useSocraticConnectionStatus应该返回连接状态', () => {
      const { result: statusResult } = renderHook(() => useSocraticConnectionStatus())
      const { result: connectedResult } = renderHook(() => useSocraticIsConnected())
      const { result: storeResult } = renderHook(() => useSocraticStore())
      
      expect(connectedResult.current).toBe(false)
      expect(statusResult.current).toBe('disconnected')
      
      act(() => {
        storeResult.current.setConnectionStatus('connected')
      })
      
      expect(connectedResult.current).toBe(true)
      expect(statusResult.current).toBe('connected')
    })
  })
})