/**
 * WebSocket集成测试
 * @description 测试WebSocket连接、事件处理和断线重连功能
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useWebSocket, WebSocketEvent } from '@/lib/hooks/useWebSocket'
import { Server } from 'socket.io'
import { createServer } from 'http'
import Client from 'socket.io-client'

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    id: 'mock-socket-id',
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn()
  }
  
  return {
    __esModule: true,
    default: jest.fn(() => mockSocket),
    io: jest.fn(() => mockSocket)
  }
})

// Mock stores
const mockReceiveMessage = jest.fn()
const mockAddStudent = jest.fn()
const mockRemoveStudent = jest.fn()
const mockUpdateStudentStatus = jest.fn()
const mockSetCurrentVote = jest.fn()
const mockSetCurrentQuestion = jest.fn()
const mockSetConnectionStatus = jest.fn()
const mockUpdatePerformance = jest.fn()
const mockSetCurrentLevel = jest.fn()

jest.mock('@/src/domains/stores/socraticStore', () => ({
  useSocraticStore: () => ({
    receiveMessage: mockReceiveMessage,
    addStudent: mockAddStudent,
    removeStudent: mockRemoveStudent,
    updateStudentStatus: mockUpdateStudentStatus,
    setCurrentVote: mockSetCurrentVote,
    setCurrentQuestion: mockSetCurrentQuestion,
    setConnectionStatus: mockSetConnectionStatus,
    updatePerformance: mockUpdatePerformance,
    setCurrentLevel: mockSetCurrentLevel
  })
}))

describe('WebSocket Hook 集成测试', () => {
  let mockSocket: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockSocket = (Client as jest.Mock).mock.results[0]?.value
  })
  
  describe('连接管理', () => {
    it('应该初始化WebSocket连接', () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'http://localhost:3001',
        autoConnect: false
      }))
      
      act(() => {
        result.current.connect()
      })
      
      expect(Client).toHaveBeenCalledWith(
        'http://localhost:3001',
        expect.objectContaining({
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000
        })
      )
    })
    
    it('应该自动连接', () => {
      renderHook(() => useWebSocket({
        url: 'http://localhost:3001',
        autoConnect: true
      }))
      
      expect(mockSocket.connect).toHaveBeenCalled()
    })
    
    it('应该处理连接成功', () => {
      const { result } = renderHook(() => useWebSocket())
      
      // 模拟连接成功
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.CONNECT
      )?.[1]
      
      act(() => {
        mockSocket.connected = true
        connectHandler?.()
      })
      
      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectionState).toBe('connected')
      expect(mockSetConnectionStatus).toHaveBeenCalledWith('connected')
    })
    
    it('应该处理断开连接', () => {
      const { result } = renderHook(() => useWebSocket())
      
      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.DISCONNECT
      )?.[1]
      
      act(() => {
        mockSocket.connected = false
        disconnectHandler?.('transport close')
      })
      
      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionState).toBe('disconnected')
    })
    
    it('应该处理连接错误', () => {
      const { result } = renderHook(() => useWebSocket())
      
      const errorHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.CONNECT_ERROR
      )?.[1]
      
      const error = new Error('Connection failed')
      act(() => {
        errorHandler?.(error)
      })
      
      expect(result.current.error).toEqual(error)
      expect(result.current.connectionState).toBe('error')
    })
    
    it('应该手动断开连接', () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.disconnect()
      })
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
    })
    
    it('应该手动重连', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        result.current.reconnect()
      })
      
      expect(mockSocket.disconnect).toHaveBeenCalled()
      
      await waitFor(() => {
        expect(mockSocket.connect).toHaveBeenCalled()
      }, { timeout: 200 })
    })
  })
  
  describe('事件发送', () => {
    it('应该发送事件', () => {
      const { result } = renderHook(() => useWebSocket())
      
      // 模拟已连接
      act(() => {
        mockSocket.connected = true
      })
      
      act(() => {
        result.current.emit('test-event', { data: 'test' })
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' })
      expect(result.current.stats.messagesSent).toBe(1)
    })
    
    it('应该在未连接时阻止发送', () => {
      const { result } = renderHook(() => useWebSocket())
      
      act(() => {
        mockSocket.connected = false
        result.current.emit('test-event', { data: 'test' })
      })
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
    
    it('应该发送带确认的事件', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      mockSocket.emit.mockImplementation((event: string, data: any, callback: any) => {
        if (callback) {
          callback({ success: true })
        }
      })
      
      const response = await act(async () => {
        return result.current.emitWithAck('test-event', { data: 'test' })
      })
      
      expect(response).toEqual({ success: true })
    })
    
    it('应该处理带确认事件的错误', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      mockSocket.emit.mockImplementation((event: string, data: any, callback: any) => {
        if (callback) {
          callback({ error: 'Failed' })
        }
      })
      
      await expect(
        act(async () => {
          return result.current.emitWithAck('test-event', { data: 'test' })
        })
      ).rejects.toThrow('Failed')
    })
  })
  
  describe('课堂操作', () => {
    it('应该加入课堂', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      mockSocket.emit.mockImplementation((event: string, data: any, callback: any) => {
        if (callback) {
          callback({ success: true, classroomId: 'room-123' })
        }
      })
      
      await act(async () => {
        await result.current.joinClassroom('ABC123', { studentName: 'Test Student' })
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.JOIN_CLASSROOM,
        { code: 'ABC123', studentName: 'Test Student' },
        expect.any(Function)
      )
    })
    
    it('应该离开课堂', async () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      mockSocket.emit.mockImplementation((event: string, data: any, callback: any) => {
        if (callback) {
          callback({ success: true })
        }
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
  
  describe('消息操作', () => {
    it('应该发送消息', () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      
      act(() => {
        result.current.sendMessage({
          content: 'Test message',
          role: 'user'
        })
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.MESSAGE_SENT,
        expect.objectContaining({
          content: 'Test message',
          role: 'user',
          id: expect.any(String),
          timestamp: expect.any(Number)
        })
      )
    })
    
    it('应该广播消息', () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      
      act(() => {
        result.current.broadcastMessage('Broadcast test')
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.MESSAGE_BROADCAST,
        expect.objectContaining({
          content: 'Broadcast test',
          timestamp: expect.any(Number)
        })
      )
    })
    
    it('应该接收消息', () => {
      renderHook(() => useWebSocket())
      
      const messageHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.MESSAGE_RECEIVED
      )?.[1]
      
      const message = {
        id: 'msg-1',
        content: 'Received message',
        role: 'assistant',
        timestamp: Date.now()
      }
      
      act(() => {
        messageHandler?.(message)
      })
      
      expect(mockReceiveMessage).toHaveBeenCalledWith(message)
    })
  })
  
  describe('投票操作', () => {
    it('应该开始投票', () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      
      act(() => {
        result.current.startVote({
          question: 'Test question?',
          choices: [
            { id: 'c1', text: 'Option 1', count: 0 },
            { id: 'c2', text: 'Option 2', count: 0 }
          ],
          endsAt: Date.now() + 300000,
          isEnded: false
        })
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.VOTE_STARTED,
        expect.objectContaining({
          question: 'Test question?',
          id: expect.any(String),
          createdAt: expect.any(Number)
        })
      )
    })
    
    it('应该投票', () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      
      act(() => {
        result.current.castVote('vote-1', 'choice-1')
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.VOTE_CAST,
        { voteId: 'vote-1', choiceId: 'choice-1' }
      )
    })
    
    it('应该结束投票', () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      
      act(() => {
        result.current.endVote('vote-1')
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WebSocketEvent.VOTE_ENDED,
        { voteId: 'vote-1' }
      )
    })
    
    it('应该处理投票开始事件', () => {
      renderHook(() => useWebSocket())
      
      const voteHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.VOTE_STARTED
      )?.[1]
      
      const vote = {
        id: 'vote-1',
        question: 'Test?',
        choices: [],
        votedStudents: new Set(),
        createdAt: Date.now(),
        isEnded: false
      }
      
      act(() => {
        voteHandler?.(vote)
      })
      
      expect(mockSetCurrentVote).toHaveBeenCalledWith(vote)
    })
  })
  
  describe('学生操作', () => {
    it('应该举手', () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      
      act(() => {
        result.current.raiseHand()
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(WebSocketEvent.STUDENT_HAND_RAISED)
    })
    
    it('应该放下手', () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      
      act(() => {
        result.current.lowerHand()
      })
      
      expect(mockSocket.emit).toHaveBeenCalledWith(WebSocketEvent.STUDENT_HAND_LOWERED)
    })
    
    it('应该处理学生加入', () => {
      renderHook(() => useWebSocket())
      
      const studentHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.STUDENT_JOINED
      )?.[1]
      
      const student = {
        id: 'student-1',
        displayName: 'Test Student',
        joinedAt: Date.now(),
        isOnline: true,
        lastActiveAt: Date.now()
      }
      
      act(() => {
        studentHandler?.(student)
      })
      
      expect(mockAddStudent).toHaveBeenCalledWith(student)
    })
    
    it('应该处理学生离开', () => {
      renderHook(() => useWebSocket())
      
      const studentHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.STUDENT_LEFT
      )?.[1]
      
      act(() => {
        studentHandler?.('student-1')
      })
      
      expect(mockRemoveStudent).toHaveBeenCalledWith('student-1')
    })
    
    it('应该处理学生举手', () => {
      renderHook(() => useWebSocket())
      
      const handHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.STUDENT_HAND_RAISED
      )?.[1]
      
      act(() => {
        handHandler?.('student-1')
      })
      
      expect(mockUpdateStudentStatus).toHaveBeenCalledWith('student-1', {
        handRaised: true,
        handRaisedAt: expect.any(Number)
      })
    })
  })
  
  describe('状态同步', () => {
    it('应该处理状态同步', () => {
      renderHook(() => useWebSocket())
      
      const syncHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.STATE_SYNC
      )?.[1]
      
      const state = {
        students: [
          { id: 's1', displayName: 'Student 1' },
          { id: 's2', displayName: 'Student 2' }
        ],
        currentVote: { id: 'vote-1', question: 'Test?' },
        currentQuestion: 'What is law?'
      }
      
      act(() => {
        syncHandler?.(state)
      })
      
      expect(mockAddStudent).toHaveBeenCalledTimes(2)
      expect(mockSetCurrentVote).toHaveBeenCalledWith(state.currentVote)
      expect(mockSetCurrentQuestion).toHaveBeenCalledWith(state.currentQuestion)
    })
    
    it('应该处理层级变更', () => {
      renderHook(() => useWebSocket())
      
      const levelHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.LEVEL_CHANGED
      )?.[1]
      
      act(() => {
        levelHandler?.(2)
      })
      
      expect(mockSetCurrentLevel).toHaveBeenCalledWith(2)
    })
    
    it('应该处理性能更新', () => {
      renderHook(() => useWebSocket())
      
      const perfHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.PERFORMANCE_UPDATE
      )?.[1]
      
      const performance = {
        responseTime: 150,
        accuracy: 0.95
      }
      
      act(() => {
        perfHandler?.(performance)
      })
      
      expect(mockUpdatePerformance).toHaveBeenCalledWith(performance)
    })
  })
  
  describe('统计信息', () => {
    it('应该追踪发送的消息数', () => {
      const { result } = renderHook(() => useWebSocket())
      
      mockSocket.connected = true
      
      act(() => {
        result.current.emit('test1')
        result.current.emit('test2')
        result.current.emit('test3')
      })
      
      expect(result.current.stats.messagesSent).toBe(3)
    })
    
    it('应该追踪接收的消息数', () => {
      const { result } = renderHook(() => useWebSocket())
      
      const messageHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.MESSAGE_RECEIVED
      )?.[1]
      
      act(() => {
        messageHandler?.({ id: '1', content: 'msg1' })
        messageHandler?.({ id: '2', content: 'msg2' })
      })
      
      expect(result.current.stats.messagesReceived).toBe(2)
    })
    
    it('应该追踪重连次数', () => {
      const { result } = renderHook(() => useWebSocket())
      
      const reconnectHandler = mockSocket.on.mock.calls.find(
        (call: any) => call[0] === WebSocketEvent.RECONNECT
      )?.[1]
      
      act(() => {
        reconnectHandler?.(1)
        reconnectHandler?.(2)
      })
      
      expect(result.current.stats.reconnectCount).toBe(2)
    })
  })
  
  describe('清理', () => {
    it('应该在卸载时清理连接', () => {
      const { unmount } = renderHook(() => useWebSocket({
        autoConnect: true
      }))
      
      unmount()
      
      expect(mockSocket.removeAllListeners).toHaveBeenCalled()
      expect(mockSocket.disconnect).toHaveBeenCalled()
    })
  })
})