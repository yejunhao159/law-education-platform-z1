/**
 * WebSocket Hook测试
 * @description 测试WebSocket客户端连接、断线、重连和事件处理
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { io, Socket } from 'socket.io-client'
import { useWebSocket, WebSocketEvent } from '../../lib/hooks/useWebSocket'
import { useSocraticStore } from '../../lib/stores/socraticStore'
import type { Message, StudentInfo, VoteData } from '../../lib/types/socratic'
import { MessageRole, DialogueLevel } from '../../lib/types/socratic'

// Mock Socket.IO
jest.mock('socket.io-client')

// Mock SocraticLogger
jest.mock('../../lib/utils/socratic-logger', () => ({
  SocraticLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}))

// Mock socket实例
const createMockSocket = (): Partial<Socket> => {
  const listeners = new Map<string, Function[]>()
  
  return {
    connected: false,
    connect: jest.fn().mockImplementation(function(this: any) {
      this.connected = true
      const connectHandlers = listeners.get('connect') || []
      connectHandlers.forEach(handler => handler())
      return this
    }),
    disconnect: jest.fn().mockImplementation(function(this: any) {
      this.connected = false
      const disconnectHandlers = listeners.get('disconnect') || []
      disconnectHandlers.forEach(handler => handler('io client disconnect'))
      return this
    }),
    on: jest.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, [])
      }
      listeners.get(event)!.push(handler)
    }),
    emit: jest.fn((event: string, ...args: any[]) => {
      // 如果有回调，立即调用
      const callback = args[args.length - 1]
      if (typeof callback === 'function') {
        callback({ success: true })
      }
    }),
    removeAllListeners: jest.fn(() => {
      listeners.clear()
    }),
    // 用于测试的辅助方法
    _emit: (event: string, data: any) => {
      const handlers = listeners.get(event) || []
      handlers.forEach(handler => handler(data))
    }
  } as any
}

describe('useWebSocket Hook', () => {
  let mockSocket: ReturnType<typeof createMockSocket>
  
  beforeEach(() => {
    // 重置store
    useSocraticStore.getState().resetStore()
    
    // 创建新的mock socket
    mockSocket = createMockSocket()
    ;(io as jest.Mock).mockReturnValue(mockSocket)
    
    // 清理所有mock
    jest.clearAllMocks()
  })
  
  afterEach(() => {
    jest.clearAllTimers()
  })
  
  describe('连接管理', () => {
    it('应该能够建立WebSocket连接', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionState).toBe('disconnected')
      
      act(() => {
        result.current.connect()
      })
      
      // 模拟连接成功
      act(() => {
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
        expect(result.current.connectionState).toBe('connected')
      })
      
      expect(mockSocket.connect).toHaveBeenCalled()
    })
    
    it('应该支持自动连接', async () => {
      renderHook(() => useWebSocket({ autoConnect: true }))
      
      expect(io).toHaveBeenCalled()
      expect(mockSocket.connect).toHaveBeenCalled()
    })
    
    it('应该能够断开连接', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      // 先连接
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      expect(result.current.isConnected).toBe(true)
      
      // 断开连接
      act(() => {
        result.current.disconnect()
      })
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionState).toBe('disconnected')
    })
    
    it('应该能够手动重连', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        result.current.reconnect()
      })
      
      // 重连会先断开再连接
      expect(mockSocket.disconnect).toHaveBeenCalled()
      
      // 等待重连延迟
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })
      
      expect(mockSocket.connect).toHaveBeenCalledTimes(2)
    })
    
    it('应该处理连接错误', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
      })
      
      const error = new Error('Connection failed')
      act(() => {
        mockSocket._emit('connect_error', error)
      })
      
      expect(result.current.error).toBe(error)
      expect(result.current.connectionState).toBe('error')
    })
    
    it('应该处理重连事件', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        mockSocket._emit('reconnect', 1)
      })
      
      expect(result.current.stats.reconnectCount).toBe(1)
    })
  })
  
  describe('事件发送', () => {
    it('应该能够发送事件', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      // 先连接
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        result.current.emit('test_event', { data: 'test' })
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { data: 'test' })
      expect(result.current.stats.messagesSent).toBe(1)
    })
    
    it('应该在未连接时拒绝发送事件', () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.emit('test_event', { data: 'test' })
      })
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
    
    it('应该支持带确认的事件发送', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      // Mock emit with callback
      mockSocket.emit = jest.fn((event, data, callback) => {
        if (typeof callback === 'function') {
          callback({ success: true, data: 'response' })
        }
      })
      
      const response = await act(async () => {
        return await result.current.emitWithAck('test_event', { data: 'test' })
      })
      
      expect(response).toEqual({ success: true, data: 'response' })
    })
  })
  
  describe('课堂操作', () => {
    beforeEach(() => {
      // 连接socket
      const { result } = renderHook(() => useWebSocket())
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
    })
    
    it('应该能够加入课堂', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      await act(async () => {
        await result.current.joinClassroom('ABC123', {
          isTeacher: false,
          studentName: '张三'
        })
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.JOIN_CLASSROOM,
        { code: 'ABC123', isTeacher: false, studentName: '张三' },
        expect.any(Function)
      )
    })
    
    it('应该能够离开课堂', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      await act(async () => {
        await result.current.leaveClassroom()
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.LEAVE_CLASSROOM,
        undefined,
        expect.any(Function)
      )
    })
  })
  
  describe('学生事件处理', () => {
    it('应该处理学生加入事件', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      const student: StudentInfo = {
        id: 'student-1',
        displayName: '李四',
        joinedAt: Date.now(),
        isOnline: true,
        lastActiveAt: Date.now()
      }
      
      act(() => {
        mockSocket._emit(WebSocketEvent.STUDENT_JOINED, student)
      })
      
      const store = useSocraticStore.getState()
      expect(store.students.get('student-1')).toEqual(student)
    })
    
    it('应该处理学生离开事件', async () => {
      const { result } = renderHook(() => useWebSocket())
      const store = useSocraticStore.getState()
      
      // 先添加学生
      const student: StudentInfo = {
        id: 'student-1',
        displayName: '李四',
        joinedAt: Date.now(),
        isOnline: true,
        lastActiveAt: Date.now()
      }
      store.addStudent(student)
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        mockSocket._emit(WebSocketEvent.STUDENT_LEFT, 'student-1')
      })
      
      expect(store.students.has('student-1')).toBe(false)
    })
    
    it('应该处理举手事件', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      // 先添加学生
      act(() => {
        const student: StudentInfo = {
          id: 'student-1',
          displayName: '李四',
          joinedAt: Date.now(),
          isOnline: true,
          lastActiveAt: Date.now()
        }
        useSocraticStore.getState().addStudent(student)
      })
      
      act(() => {
        mockSocket._emit(WebSocketEvent.STUDENT_HAND_RAISED, 'student-1')
      })
      
      const updatedStudent = useSocraticStore.getState().students.get('student-1')
      expect(updatedStudent?.handRaised).toBe(true)
      expect(updatedStudent?.handRaisedAt).toBeDefined()
    })
  })
  
  describe('消息处理', () => {
    it('应该处理接收到的消息', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      const message: Message = {
        id: 'msg-1',
        role: MessageRole.AGENT,
        content: '请分析这个案例',
        level: DialogueLevel.OBSERVATION,
        timestamp: Date.now()
      }
      
      act(() => {
        mockSocket._emit(WebSocketEvent.MESSAGE_RECEIVED, message)
      })
      
      const store = useSocraticStore.getState()
      expect(store.messages).toContainEqual(message)
      expect(result.current.stats.messagesReceived).toBe(1)
    })
    
    it('应该能够发送消息', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        result.current.sendMessage({
          role: MessageRole.STUDENT,
          content: '这是一个测试消息',
          level: DialogueLevel.OBSERVATION
        })
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.MESSAGE_SENT,
        expect.objectContaining({
          role: MessageRole.STUDENT,
          content: '这是一个测试消息',
          level: DialogueLevel.OBSERVATION,
          id: expect.any(String),
          timestamp: expect.any(Number)
        })
      )
    })
    
    it('应该能够广播消息', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        result.current.broadcastMessage('广播消息内容')
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.MESSAGE_BROADCAST,
        expect.objectContaining({
          content: '广播消息内容',
          timestamp: expect.any(Number)
        })
      )
    })
  })
  
  describe('投票功能', () => {
    it('应该能够开始投票', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      const voteData = {
        question: '被告是否有责任？',
        choices: [
          { id: 'yes', text: '是', count: 0 },
          { id: 'no', text: '否', count: 0 }
        ],
        isEnded: false
      }
      
      act(() => {
        result.current.startVote(voteData)
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.VOTE_STARTED,
        expect.objectContaining({
          ...voteData,
          id: expect.any(String),
          createdAt: expect.any(Number)
        })
      )
    })
    
    it('应该能够投票', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        result.current.castVote('vote-1', 'yes')
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.VOTE_CAST,
        { voteId: 'vote-1', choiceId: 'yes' }
      )
    })
    
    it('应该处理投票结果更新', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      const voteResults: VoteData = {
        id: 'vote-1',
        question: '测试投票',
        choices: [
          { id: 'yes', text: '是', count: 5 },
          { id: 'no', text: '否', count: 3 }
        ],
        votedStudents: new Set(['student-1', 'student-2']),
        createdAt: Date.now(),
        isEnded: false
      }
      
      act(() => {
        mockSocket._emit(WebSocketEvent.VOTE_RESULTS, voteResults)
      })
      
      const store = useSocraticStore.getState()
      expect(store.currentVote).toEqual(voteResults)
    })
  })
  
  describe('学生操作', () => {
    it('应该能够举手', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        result.current.raiseHand()
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(WebSocketEvent.STUDENT_HAND_RAISED, undefined)
    })
    
    it('应该能够放下手', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        result.current.lowerHand()
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(WebSocketEvent.STUDENT_HAND_LOWERED, undefined)
    })
  })
  
  describe('状态同步', () => {
    it('应该处理状态同步事件', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      const syncState = {
        students: [
          {
            id: 'student-1',
            displayName: '学生1',
            joinedAt: Date.now(),
            isOnline: true,
            lastActiveAt: Date.now()
          }
        ],
        currentQuestion: '这是当前问题',
        currentVote: {
          id: 'vote-1',
          question: '投票问题',
          choices: [],
          votedStudents: new Set(),
          createdAt: Date.now(),
          isEnded: false
        }
      }
      
      act(() => {
        mockSocket._emit(WebSocketEvent.STATE_SYNC, syncState)
      })
      
      const store = useSocraticStore.getState()
      expect(store.students.size).toBe(1)
      expect(store.currentQuestion).toBe('这是当前问题')
      expect(store.currentVote).toEqual(syncState.currentVote)
    })
    
    it('应该处理层级变更事件', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      act(() => {
        mockSocket._emit(WebSocketEvent.LEVEL_CHANGED, DialogueLevel.ANALYSIS)
      })
      
      const store = useSocraticStore.getState()
      expect(store.currentLevel).toBe(DialogueLevel.ANALYSIS)
    })
  })
  
  describe('统计信息', () => {
    it('应该跟踪消息统计', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      // 发送消息
      act(() => {
        result.current.emit('test', {})
      })
      
      expect(result.current.stats.messagesSent).toBe(1)
      
      // 接收消息
      act(() => {
        mockSocket._emit(WebSocketEvent.MESSAGE_RECEIVED, {
          id: 'msg-1',
          content: 'test',
          role: MessageRole.AGENT,
          level: DialogueLevel.OBSERVATION,
          timestamp: Date.now()
        })
      })
      
      expect(result.current.stats.messagesReceived).toBe(1)
    })
    
    it('应该记录最后活动时间', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      const initialActivity = result.current.stats.lastActivity
      
      act(() => {
        result.current.connect()
        mockSocket.connected = true
        mockSocket._emit('connect', undefined)
      })
      
      // 等待一小段时间
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
      act(() => {
        result.current.emit('test', {})
      })
      
      expect(result.current.stats.lastActivity).toBeGreaterThan(initialActivity)
    })
  })
  
  describe('清理', () => {
    it('应该在卸载时清理连接', () => {
      const { unmount } = renderHook(() => useWebSocket({ autoConnect: true }))
      
      unmount()
      
      expect(mockSocket.removeAllListeners).toHaveBeenCalled()
      expect(mockSocket.disconnect).toHaveBeenCalled()
    })
  })
})