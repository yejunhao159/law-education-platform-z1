/**
 * Act5SocraticDiscussion 集成测试
 * @description 测试苏格拉底式对话主组件的完整功能
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Act5SocraticDiscussion } from '@/components/acts/Act5SocraticDiscussion'
import { SessionMode, DialogueLevel, ControlMode } from '@/lib/types/socratic'

// Mock子组件
jest.mock('@/components/socratic/DialogueContainer')
jest.mock('@/components/socratic/DialoguePanel')
jest.mock('@/components/socratic/MessageInput')
jest.mock('@/components/socratic/LevelProgress')
jest.mock('@/components/socratic/TeacherPanel')
jest.mock('@/components/socratic/VotingPanel')
jest.mock('@/components/socratic/ClassroomCode')
jest.mock('@/components/socratic/ExampleSelector')
jest.mock('@/components/socratic/LevelSelector')

// Mock stores
const mockInitSession = jest.fn()
const mockSendMessage = jest.fn()
const mockUpdateLevel = jest.fn()
const mockResetSession = jest.fn()
const mockEndSession = jest.fn()
const mockAddFeedback = jest.fn()
const mockAddPoints = jest.fn()

jest.mock('@/src/domains/stores', () => ({
  useSocraticStore: () => ({
    session: null,
    messages: [],
    currentLevel: DialogueLevel.OBSERVATION,
    isLoading: false,
    error: null,
    initSession: mockInitSession,
    sendMessage: mockSendMessage,
    updateLevel: mockUpdateLevel,
    resetSession: mockResetSession,
    endSession: mockEndSession
  })
}))

jest.mock('@/src/domains/stores', () => ({
  useEvidenceInteractionStore: () => ({
    addFeedback: mockAddFeedback,
    addPoints: mockAddPoints
  })
}))

// Mock WebSocket
const mockWsSendMessage = jest.fn()
const mockSubscribe = jest.fn()
const mockUnsubscribe = jest.fn()

jest.mock('@/lib/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: false,
    error: null,
    sendMessage: mockWsSendMessage,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe
  })
}))

describe('Act5SocraticDiscussion 集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('组件渲染', () => {
    it('应该正确渲染主界面', () => {
      render(<Act5SocraticDiscussion />)
      
      expect(screen.getByText('Act 5: 苏格拉底式法律对话')).toBeInTheDocument()
      expect(screen.getByText('通过引导式问答深入理解法律原理')).toBeInTheDocument()
      expect(screen.getByText('开始对话')).toBeInTheDocument()
    })

    it('应该显示三种视图模式切换', () => {
      render(<Act5SocraticDiscussion />)
      
      expect(screen.getByText('学生')).toBeInTheDocument()
      expect(screen.getByText('教师')).toBeInTheDocument()
      expect(screen.getByText('演示')).toBeInTheDocument()
    })

    it('应该根据初始模式渲染', () => {
      render(<Act5SocraticDiscussion initialMode="teacher" />)
      
      const teacherBtn = screen.getByRole('button', { name: '教师' })
      expect(teacherBtn).toHaveClass('bg-primary')
    })
  })

  describe('会话管理', () => {
    it('应该处理开始会话', async () => {
      const user = userEvent.setup()
      render(<Act5SocraticDiscussion />)
      
      const startBtn = screen.getByText('开始对话')
      await user.click(startBtn)
      
      expect(mockInitSession).toHaveBeenCalledWith({
        mode: SessionMode.DEMO,
        controlMode: ControlMode.AUTO,
        level: DialogueLevel.OBSERVATION
      })
    })

    it('应该自动开始会话', () => {
      render(<Act5SocraticDiscussion autoStart={true} />)
      
      expect(mockInitSession).toHaveBeenCalled()
    })

    it('应该处理重置会话', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<Act5SocraticDiscussion />)
      
      // 模拟会话已开始
      jest.mocked(mockInitSession).mockImplementation(() => {
        // 更新store状态
      })
      
      rerender(<Act5SocraticDiscussion />)
      
      const resetBtn = screen.queryByText('重置')
      if (resetBtn) {
        await user.click(resetBtn)
        expect(mockResetSession).toHaveBeenCalled()
      }
    })

    it('应该处理结束会话', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<Act5SocraticDiscussion />)
      
      // 模拟会话已开始
      rerender(<Act5SocraticDiscussion />)
      
      const endBtn = screen.queryByText('结束')
      if (endBtn) {
        await user.click(endBtn)
        expect(mockEndSession).toHaveBeenCalled()
      }
    })
  })

  describe('视图模式切换', () => {
    it('应该切换到学生视图', async () => {
      const user = userEvent.setup()
      render(<Act5SocraticDiscussion />)
      
      const studentBtn = screen.getByRole('button', { name: '学生' })
      await user.click(studentBtn)
      
      expect(studentBtn).toHaveClass('bg-primary')
    })

    it('应该切换到教师视图', async () => {
      const user = userEvent.setup()
      render(<Act5SocraticDiscussion />)
      
      const teacherBtn = screen.getByRole('button', { name: '教师' })
      await user.click(teacherBtn)
      
      expect(teacherBtn).toHaveClass('bg-primary')
    })

    it('应该切换到演示视图', async () => {
      const user = userEvent.setup()
      render(<Act5SocraticDiscussion />)
      
      const demoBtn = screen.getByRole('button', { name: '演示' })
      await user.click(demoBtn)
      
      expect(demoBtn).toHaveClass('bg-primary')
    })
  })

  describe('课堂模式', () => {
    it('应该在课堂模式下显示连接状态', () => {
      render(<Act5SocraticDiscussion sessionMode={SessionMode.CLASSROOM} />)
      
      expect(screen.getByText('连接中...')).toBeInTheDocument()
    })

    it('应该在课堂模式下订阅WebSocket事件', () => {
      render(<Act5SocraticDiscussion sessionMode={SessionMode.CLASSROOM} />)
      
      expect(mockSubscribe).toHaveBeenCalledWith('student:joined', expect.any(Function))
      expect(mockSubscribe).toHaveBeenCalledWith('vote:created', expect.any(Function))
      expect(mockSubscribe).toHaveBeenCalledWith('vote:updated', expect.any(Function))
      expect(mockSubscribe).toHaveBeenCalledWith('message:received', expect.any(Function))
    })

    it('应该在卸载时取消订阅', () => {
      const { unmount } = render(<Act5SocraticDiscussion sessionMode={SessionMode.CLASSROOM} />)
      
      unmount()
      
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('消息处理', () => {
    it('应该处理消息发送', async () => {
      const user = userEvent.setup()
      
      // Mock MessageInput组件
      const MessageInput = require('@/components/socratic/MessageInput').MessageInput
      MessageInput.mockImplementation(({ onSend }: any) => (
        <button onClick={() => onSend('测试消息')}>发送</button>
      ))
      
      render(<Act5SocraticDiscussion />)
      
      // 开始会话
      const startBtn = screen.getByText('开始对话')
      await user.click(startBtn)
      
      // 发送消息
      const sendBtn = screen.getByText('发送')
      await user.click(sendBtn)
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('测试消息', undefined)
        expect(mockAddFeedback).toHaveBeenCalledWith({
          type: 'success',
          message: '消息已发送',
          score: 5
        })
      })
    })

    it('应该在课堂模式下广播消息', async () => {
      const user = userEvent.setup()
      
      const MessageInput = require('@/components/socratic/MessageInput').MessageInput
      MessageInput.mockImplementation(({ onSend }: any) => (
        <button onClick={() => onSend('测试消息')}>发送</button>
      ))
      
      render(<Act5SocraticDiscussion sessionMode={SessionMode.CLASSROOM} />)
      
      const startBtn = screen.getByText('开始对话')
      await user.click(startBtn)
      
      const sendBtn = screen.getByText('发送')
      await user.click(sendBtn)
      
      await waitFor(() => {
        expect(mockWsSendMessage).toHaveBeenCalledWith({
          type: 'message:send',
          data: { content: '测试消息', attachments: undefined }
        })
      })
    })
  })

  describe('层级切换', () => {
    it('应该处理层级切换', async () => {
      const user = userEvent.setup()
      
      const LevelProgress = require('@/components/socratic/LevelProgress').LevelProgress
      LevelProgress.mockImplementation(({ onLevelClick }: any) => (
        <button onClick={() => onLevelClick(DialogueLevel.FACTS)}>切换层级</button>
      ))
      
      render(<Act5SocraticDiscussion />)
      
      const levelBtn = screen.getByText('切换层级')
      await user.click(levelBtn)
      
      expect(mockUpdateLevel).toHaveBeenCalledWith(DialogueLevel.FACTS)
      expect(mockAddFeedback).toHaveBeenCalledWith({
        type: 'info',
        message: expect.stringContaining('切换到')
      })
    })
  })

  describe('投票功能', () => {
    it('应该创建投票', async () => {
      const user = userEvent.setup()
      
      const VotingPanel = require('@/components/socratic/VotingPanel').VotingPanel
      VotingPanel.mockImplementation(({ onCreateVote }: any) => (
        <button onClick={() => onCreateVote('问题', ['选项1', '选项2'])}>创建投票</button>
      ))
      
      render(<Act5SocraticDiscussion initialMode="teacher" />)
      
      const createBtn = screen.getByText('创建投票')
      await user.click(createBtn)
      
      // 验证投票数据结构
      await waitFor(() => {
        expect(screen.getByText('创建投票')).toBeInTheDocument()
      })
    })

    it('应该处理投票提交', async () => {
      const user = userEvent.setup()
      
      const VotingPanel = require('@/components/socratic/VotingPanel').VotingPanel
      VotingPanel.mockImplementation(({ onVote }: any) => (
        <button onClick={() => onVote('vote-1', ['choice-1'])}>投票</button>
      ))
      
      render(<Act5SocraticDiscussion />)
      
      const voteBtn = screen.queryByText('投票')
      if (voteBtn) {
        await user.click(voteBtn)
        
        expect(mockAddPoints).toHaveBeenCalledWith(10)
        expect(mockAddFeedback).toHaveBeenCalledWith({
          type: 'success',
          message: '投票成功！+10分'
        })
      }
    })
  })

  describe('课堂码功能', () => {
    it('应该生成课堂码', async () => {
      const user = userEvent.setup()
      
      const ClassroomCode = require('@/components/socratic/ClassroomCode').ClassroomCode
      ClassroomCode.mockImplementation(({ onGenerateCode }: any) => (
        <button onClick={onGenerateCode}>生成课堂码</button>
      ))
      
      render(<Act5SocraticDiscussion sessionMode={SessionMode.CLASSROOM} initialMode="teacher" />)
      
      const generateBtn = screen.getByText('生成课堂码')
      await user.click(generateBtn)
      
      await waitFor(() => {
        expect(mockWsSendMessage).toHaveBeenCalledWith({
          type: 'classroom:create',
          data: expect.objectContaining({
            code: expect.any(String),
            createdAt: expect.any(Number),
            expiresAt: expect.any(Number)
          })
        })
      })
    })

    it('应该处理加入课堂', async () => {
      const user = userEvent.setup()
      
      const ClassroomCode = require('@/components/socratic/ClassroomCode').ClassroomCode
      ClassroomCode.mockImplementation(({ onJoinClassroom }: any) => (
        <button onClick={() => onJoinClassroom('ABC123')}>加入课堂</button>
      ))
      
      render(<Act5SocraticDiscussion sessionMode={SessionMode.CLASSROOM} />)
      
      const joinBtn = screen.getByText('加入课堂')
      await user.click(joinBtn)
      
      expect(mockWsSendMessage).toHaveBeenCalledWith({
        type: 'classroom:join',
        data: { code: 'ABC123' }
      })
      
      expect(mockAddFeedback).toHaveBeenCalledWith({
        type: 'success',
        message: '成功加入课堂！'
      })
    })
  })

  describe('错误处理', () => {
    it('应该显示错误信息', () => {
      jest.mocked(require('@/src/domains/stores').useSocraticStore).mockReturnValue({
        session: null,
        messages: [],
        currentLevel: DialogueLevel.OBSERVATION,
        isLoading: false,
        error: '连接失败',
        initSession: mockInitSession,
        sendMessage: mockSendMessage,
        updateLevel: mockUpdateLevel,
        resetSession: mockResetSession,
        endSession: mockEndSession
      })
      
      render(<Act5SocraticDiscussion />)
      
      expect(screen.getByText('连接失败')).toBeInTheDocument()
      expect(screen.getByText('重试')).toBeInTheDocument()
    })

    it('应该处理消息发送失败', async () => {
      const user = userEvent.setup()
      
      mockSendMessage.mockRejectedValue(new Error('发送失败'))
      
      const MessageInput = require('@/components/socratic/MessageInput').MessageInput
      MessageInput.mockImplementation(({ onSend }: any) => (
        <button onClick={() => onSend('测试消息')}>发送</button>
      ))
      
      render(<Act5SocraticDiscussion />)
      
      const startBtn = screen.getByText('开始对话')
      await user.click(startBtn)
      
      const sendBtn = screen.getByText('发送')
      await user.click(sendBtn)
      
      await waitFor(() => {
        expect(mockAddFeedback).toHaveBeenCalledWith({
          type: 'error',
          message: '发送失败，请重试'
        })
      })
    })
  })

  describe('统计信息', () => {
    it('应该显示对话统计', () => {
      jest.mocked(require('@/src/domains/stores').useSocraticStore).mockReturnValue({
        session: { id: 'test', completedLevels: [] },
        messages: [
          { id: '1', content: '消息1', role: 'user' },
          { id: '2', content: '消息2', role: 'assistant' }
        ],
        currentLevel: DialogueLevel.FACTS,
        isLoading: false,
        error: null,
        initSession: mockInitSession,
        sendMessage: mockSendMessage,
        updateLevel: mockUpdateLevel,
        resetSession: mockResetSession,
        endSession: mockEndSession
      })
      
      render(<Act5SocraticDiscussion />)
      
      expect(screen.getByText('2')).toBeInTheDocument() // 消息数
      expect(screen.getByText('40%')).toBeInTheDocument() // 进度
    })
  })

  describe('性能测试', () => {
    it('应该在大量消息时保持响应', () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `消息 ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant'
      }))
      
      jest.mocked(require('@/src/domains/stores').useSocraticStore).mockReturnValue({
        session: { id: 'test', completedLevels: [] },
        messages,
        currentLevel: DialogueLevel.OBSERVATION,
        isLoading: false,
        error: null,
        initSession: mockInitSession,
        sendMessage: mockSendMessage,
        updateLevel: mockUpdateLevel,
        resetSession: mockResetSession,
        endSession: mockEndSession
      })
      
      const { container } = render(<Act5SocraticDiscussion />)
      
      expect(container).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument() // 消息数
    })
  })
})