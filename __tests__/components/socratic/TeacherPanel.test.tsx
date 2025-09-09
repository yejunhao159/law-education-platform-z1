/**
 * TeacherPanel组件测试
 * @description 测试教师控制面板的功能和交互
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeacherPanel } from '../../../components/socratic/TeacherPanel'
import { 
  ControlMode,
  DialogueLevel,
  type ClassroomSession,
  type DialogueMetrics,
  type StudentInfo
} from '../../../lib/types/socratic'

// Mock radix-ui select to avoid scrollIntoView issues
jest.mock('@radix-ui/react-select', () => ({
  Root: ({ children, ...props }: any) => <div data-testid="select-root" {...props}>{children}</div>,
  Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
    <button ref={ref} data-testid="select-trigger" {...props}>{children}</button>
  )),
  Value: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Icon: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Content: ({ children, ...props }: any) => <div data-testid="select-content" {...props}>{children}</div>,
  Viewport: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Item: ({ children, value, ...props }: any) => (
    <div data-testid={`select-item-${value}`} {...props}>{children}</div>
  ),
  ItemText: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  ItemIndicator: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Portal: ({ children }: any) => children,
  Group: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  Separator: (props: any) => <hr {...props} />
}))

describe('TeacherPanel组件', () => {
  // 创建模拟会话
  const createMockSession = (): ClassroomSession => {
    const students = new Map<string, StudentInfo>()
    students.set('student-1', {
      id: 'student-1',
      displayName: '张三',
      joinedAt: Date.now(),
      isOnline: true,
      lastActiveAt: Date.now(),
      handRaised: false
    })
    students.set('student-2', {
      id: 'student-2', 
      displayName: '李四',
      joinedAt: Date.now(),
      isOnline: true,
      lastActiveAt: Date.now(),
      handRaised: true,
      handRaisedAt: Date.now()
    })
    
    return {
      code: 'ABC123',
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      status: 'active',
      students,
      teacherId: 'teacher-1',
      statistics: {
        totalParticipants: 2,
        activeParticipants: 2,
        avgUnderstanding: 75,
        levelDurations: {
          [DialogueLevel.OBSERVATION]: 300,
          [DialogueLevel.FACTS]: 240,
          [DialogueLevel.ANALYSIS]: 180,
          [DialogueLevel.APPLICATION]: 120,
          [DialogueLevel.VALUES]: 60
        }
      }
    }
  }
  
  // 创建模拟指标
  const createMockMetrics = (): DialogueMetrics => ({
    averageQuality: 85,
    totalTime: 1200,
    totalMessages: 25,
    completionRate: 60,
    levelProgress: {
      [DialogueLevel.OBSERVATION]: 100,
      [DialogueLevel.FACTS]: 100,
      [DialogueLevel.ANALYSIS]: 50,
      [DialogueLevel.APPLICATION]: 0,
      [DialogueLevel.VALUES]: 0
    },
    insights: [],
    strengths: [],
    improvements: []
  })
  
  const mockCallbacks = {
    onModeChange: jest.fn(),
    onLevelChange: jest.fn(),
    onStartSession: jest.fn(),
    onEndSession: jest.fn(),
    onResetSession: jest.fn(),
    onStartVote: jest.fn(),
    onIntervene: jest.fn(),
    onMuteStudent: jest.fn(),
    onKickStudent: jest.fn()
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('基础渲染', () => {
    it('应该正确渲染教师面板', () => {
      render(
        <TeacherPanel 
          session={null}
          isTeacher={true}
        />
      )
      
      expect(screen.getByText('教师控制面板')).toBeInTheDocument()
      expect(screen.getByText('未开始')).toBeInTheDocument()
    })
    
    it('应该显示会话信息', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      expect(screen.getByText('进行中')).toBeInTheDocument()
      expect(screen.getByText('课堂码: ABC123')).toBeInTheDocument()
      expect(screen.getByText('2/2')).toBeInTheDocument() // 学生数
    })
    
    it('应该对非教师用户显示权限提示', () => {
      render(
        <TeacherPanel 
          session={null}
          isTeacher={false}
        />
      )
      
      expect(screen.getByText('只有教师可以访问控制面板')).toBeInTheDocument()
      expect(screen.queryByText('教师控制面板')).not.toBeInTheDocument()
    })
  })
  
  describe('会话控制', () => {
    it('应该处理开始会话', () => {
      render(
        <TeacherPanel 
          session={null}
          isTeacher={true}
          onStartSession={mockCallbacks.onStartSession}
        />
      )
      
      const startButton = screen.getByText('开始课堂')
      fireEvent.click(startButton)
      
      expect(mockCallbacks.onStartSession).toHaveBeenCalled()
    })
    
    it('应该处理结束会话', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onEndSession={mockCallbacks.onEndSession}
        />
      )
      
      const endButton = screen.getByText('结束')
      fireEvent.click(endButton)
      
      expect(mockCallbacks.onEndSession).toHaveBeenCalled()
    })
    
    it('应该处理重置会话', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onResetSession={mockCallbacks.onResetSession}
        />
      )
      
      const resetButton = screen.getByText('重置')
      fireEvent.click(resetButton)
      
      expect(mockCallbacks.onResetSession).toHaveBeenCalled()
    })
  })
  
  describe('标签页切换', () => {
    it('应该切换标签页', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      // 默认显示控制标签
      expect(screen.getByText('对话模式')).toBeInTheDocument()
      
      // 切换到学生标签
      const studentsTab = screen.getByText('学生')
      fireEvent.click(studentsTab)
      expect(screen.getByText('学生列表 (2)')).toBeInTheDocument()
      
      // 切换到投票标签
      const voteTab = screen.getByText('投票')
      fireEvent.click(voteTab)
      expect(screen.getByText('投票问题')).toBeInTheDocument()
      
      // 切换到统计标签
      const statsTab = screen.getByText('统计')
      fireEvent.click(statsTab)
      expect(screen.getByText('平均质量')).toBeInTheDocument()
    })
  })
  
  describe('控制功能', () => {
    it('应该处理模式切换', async () => {
      const session = createMockSession()
      const user = userEvent.setup()
      
      const { container } = render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onModeChange={mockCallbacks.onModeChange}
        />
      )
      
      // 点击选择框
      const modeSelect = container.querySelector('[role="combobox"]')
      fireEvent.click(modeSelect!)
      
      // 选择教师引导模式
      const teacherMode = await screen.findByText('教师引导')
      fireEvent.click(teacherMode)
      
      expect(mockCallbacks.onModeChange).toHaveBeenCalledWith(DialogueMode.TEACHER_GUIDED)
    })
    
    it('应该处理层级切换', async () => {
      const session = createMockSession()
      
      const { container } = render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onLevelChange={mockCallbacks.onLevelChange}
        />
      )
      
      // 找到层级选择器（第二个选择框）
      const selects = container.querySelectorAll('[role="combobox"]')
      const levelSelect = selects[1]
      fireEvent.click(levelSelect)
      
      // 选择事实层
      const factsLevel = await screen.findByText('事实层')
      fireEvent.click(factsLevel)
      
      expect(mockCallbacks.onLevelChange).toHaveBeenCalledWith(DialogueLevel.FACTS)
    })
    
    it('应该处理教师介入', async () => {
      const session = createMockSession()
      const user = userEvent.setup()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onIntervene={mockCallbacks.onIntervene}
        />
      )
      
      const input = screen.getByPlaceholderText('输入介入消息...')
      await user.type(input, '这是一个很好的观点')
      
      const sendButton = screen.getByText('发送')
      fireEvent.click(sendButton)
      
      expect(mockCallbacks.onIntervene).toHaveBeenCalledWith('这是一个很好的观点')
    })
    
    it('应该在会话未开始时禁用控制', () => {
      render(
        <TeacherPanel 
          session={null}
          isTeacher={true}
        />
      )
      
      const input = screen.getByPlaceholderText('输入介入消息...')
      expect(input).toBeDisabled()
    })
  })
  
  describe('学生管理', () => {
    it('应该显示学生列表', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      // 切换到学生标签
      const studentsTab = screen.getByText('学生')
      fireEvent.click(studentsTab)
      
      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('李四')).toBeInTheDocument()
    })
    
    it('应该显示学生状态', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      // 切换到学生标签
      const studentsTab = screen.getByText('学生')
      fireEvent.click(studentsTab)
      
      // 应该有活跃状态指示器
      const studentItems = screen.getAllByRole('button', { name: /volume/i })
      expect(studentItems).toHaveLength(2)
    })
    
    it('应该处理静音学生', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onMuteStudent={mockCallbacks.onMuteStudent}
        />
      )
      
      // 切换到学生标签
      const studentsTab = screen.getByText('学生')
      fireEvent.click(studentsTab)
      
      // 点击静音按钮
      const muteButtons = screen.getAllByRole('button', { name: /volume/i })
      fireEvent.click(muteButtons[0])
      
      expect(mockCallbacks.onMuteStudent).toHaveBeenCalledWith('student-1')
    })
    
    it('应该处理踢出学生', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onKickStudent={mockCallbacks.onKickStudent}
        />
      )
      
      // 切换到学生标签
      const studentsTab = screen.getByText('学生')
      fireEvent.click(studentsTab)
      
      // 点击踢出按钮（红色X按钮）
      const kickButtons = document.querySelectorAll('.text-red-500')
      fireEvent.click(kickButtons[0])
      
      expect(mockCallbacks.onKickStudent).toHaveBeenCalledWith('student-1')
    })
    
    it('应该切换学生详情显示', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      // 切换到学生标签
      const studentsTab = screen.getByText('学生')
      fireEvent.click(studentsTab)
      
      // 切换开关
      const switchElement = screen.getByRole('switch')
      fireEvent.click(switchElement)
      
      // 详情应该被隐藏
      const muteButtons = screen.queryAllByRole('button', { name: /volume/i })
      expect(muteButtons).toHaveLength(0)
    })
  })
  
  describe('投票功能', () => {
    it('应该创建投票', async () => {
      const session = createMockSession()
      const user = userEvent.setup()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onStartVote={mockCallbacks.onStartVote}
        />
      )
      
      // 切换到投票标签
      const voteTab = screen.getByText('投票')
      fireEvent.click(voteTab)
      
      // 输入问题
      const questionInput = screen.getByPlaceholderText('输入投票问题...')
      await user.type(questionInput, '你理解了这个概念吗？')
      
      // 输入选项
      const optionInputs = screen.getAllByPlaceholderText(/选项/)
      await user.type(optionInputs[0], '完全理解')
      await user.type(optionInputs[1], '部分理解')
      
      // 发起投票
      const startVoteButton = screen.getByText('发起投票')
      fireEvent.click(startVoteButton)
      
      expect(mockCallbacks.onStartVote).toHaveBeenCalledWith(
        '你理解了这个概念吗？',
        ['完全理解', '部分理解']
      )
    })
    
    it('应该添加投票选项', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      // 切换到投票标签
      const voteTab = screen.getByText('投票')
      fireEvent.click(voteTab)
      
      // 添加选项
      const addButton = screen.getByText('添加选项')
      fireEvent.click(addButton)
      
      const optionInputs = screen.getAllByPlaceholderText(/选项/)
      expect(optionInputs).toHaveLength(3)
    })
    
    it('应该删除投票选项', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      // 切换到投票标签
      const voteTab = screen.getByText('投票')
      fireEvent.click(voteTab)
      
      // 添加第三个选项
      const addButton = screen.getByText('添加选项')
      fireEvent.click(addButton)
      
      // 删除第三个选项
      const deleteButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('.lucide-x-circle')
      )
      fireEvent.click(deleteButtons[0])
      
      const optionInputs = screen.getAllByPlaceholderText(/选项/)
      expect(optionInputs).toHaveLength(2)
    })
    
    it('应该限制最多5个选项', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      // 切换到投票标签
      const voteTab = screen.getByText('投票')
      fireEvent.click(voteTab)
      
      // 添加选项直到5个
      const addButton = screen.getByText('添加选项')
      fireEvent.click(addButton) // 3
      fireEvent.click(addButton) // 4
      fireEvent.click(addButton) // 5
      
      // 添加按钮应该消失
      expect(screen.queryByText('添加选项')).not.toBeInTheDocument()
    })
    
    it('应该验证投票必填项', async () => {
      const session = createMockSession()
      const user = userEvent.setup()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          onStartVote={mockCallbacks.onStartVote}
        />
      )
      
      // 切换到投票标签
      const voteTab = screen.getByText('投票')
      fireEvent.click(voteTab)
      
      // 只输入问题，不输入选项
      const questionInput = screen.getByPlaceholderText('输入投票问题...')
      await user.type(questionInput, '测试问题')
      
      // 发起投票按钮应该被禁用
      const startVoteButton = screen.getByText('发起投票')
      expect(startVoteButton).toBeDisabled()
    })
  })
  
  describe('统计展示', () => {
    it('应该显示统计数据', () => {
      const session = createMockSession()
      const metrics = createMockMetrics()
      
      render(
        <TeacherPanel 
          session={session}
          metrics={metrics}
          isTeacher={true}
        />
      )
      
      // 切换到统计标签
      const statsTab = screen.getByText('统计')
      fireEvent.click(statsTab)
      
      expect(screen.getByText('85%')).toBeInTheDocument() // 平均质量
      expect(screen.getByText('20分钟')).toBeInTheDocument() // 总时长
      expect(screen.getByText('25')).toBeInTheDocument() // 消息数
      expect(screen.getByText('60%')).toBeInTheDocument() // 完成度
    })
    
    it('应该显示层级进度', () => {
      const session = createMockSession()
      const metrics = createMockMetrics()
      
      render(
        <TeacherPanel 
          session={session}
          metrics={metrics}
          isTeacher={true}
        />
      )
      
      // 切换到统计标签
      const statsTab = screen.getByText('统计')
      fireEvent.click(statsTab)
      
      expect(screen.getByText('层级进度')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument() // 观察层
      expect(screen.getByText('50%')).toBeInTheDocument() // 分析层
      expect(screen.getByText('0%')).toBeInTheDocument() // 应用层
    })
  })
  
  describe('配置选项', () => {
    it('应该根据配置隐藏功能', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
          config={{
            allowModeSwitch: false,
            allowIntervention: false,
            allowVoting: false,
            allowStatistics: false,
            showStudentList: false,
            showMetrics: false
          }}
        />
      )
      
      // 控制标签不应该显示模式切换
      expect(screen.queryByText('对话模式')).not.toBeInTheDocument()
      
      // 不应该显示教师介入
      expect(screen.queryByPlaceholderText('输入介入消息...')).not.toBeInTheDocument()
    })
  })
  
  describe('边缘情况', () => {
    it('应该处理空会话', () => {
      render(
        <TeacherPanel 
          session={null}
          isTeacher={true}
        />
      )
      
      expect(screen.getByText('未开始')).toBeInTheDocument()
      expect(screen.queryByText('学生列表')).not.toBeInTheDocument()
    })
    
    it('应该处理没有学生的会话', () => {
      const session = {
        ...createMockSession(),
        participants: []
      }
      
      render(
        <TeacherPanel 
          session={session}
          isTeacher={true}
        />
      )
      
      // 切换到学生标签
      const studentsTab = screen.getByText('学生')
      fireEvent.click(studentsTab)
      
      expect(screen.getByText('学生列表 (0)')).toBeInTheDocument()
    })
    
    it('应该处理没有指标数据', () => {
      const session = createMockSession()
      
      render(
        <TeacherPanel 
          session={session}
          metrics={undefined}
          isTeacher={true}
        />
      )
      
      // 切换到统计标签
      const statsTab = screen.getByText('统计')
      fireEvent.click(statsTab)
      
      // 不应该显示统计数据
      expect(screen.queryByText('平均质量')).not.toBeInTheDocument()
    })
  })
})