/**
 * VotingPanel组件测试
 * @description 测试投票面板的功能和交互
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VotingPanel } from '../../../components/socratic/VotingPanel'
import { 
  type VoteData,
  type VoteChoice,
  type StudentInfo
} from '../../../lib/types/socratic'

// Mock recharts to avoid render issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null
}))

describe('VotingPanel组件', () => {
  // 创建模拟投票数据
  const createMockVote = (): VoteData => ({
    id: 'vote-1',
    question: '你对今天的课程满意吗？',
    choices: [
      { id: 'choice-1', text: '非常满意', count: 5 },
      { id: 'choice-2', text: '满意', count: 3 },
      { id: 'choice-3', text: '一般', count: 1 },
      { id: 'choice-4', text: '不满意', count: 0 }
    ],
    votedStudents: new Set(['student-1', 'student-2']),
    createdAt: Date.now(),
    endsAt: Date.now() + 300000, // 5分钟后
    isEnded: false
  })

  // 创建模拟学生列表
  const createMockStudents = (): Map<string, StudentInfo> => {
    const students = new Map<string, StudentInfo>()
    students.set('student-1', {
      id: 'student-1',
      displayName: '张三',
      joinedAt: Date.now(),
      isOnline: true,
      lastActiveAt: Date.now()
    })
    students.set('student-2', {
      id: 'student-2',
      displayName: '李四',
      joinedAt: Date.now(),
      isOnline: true,
      lastActiveAt: Date.now()
    })
    students.set('student-3', {
      id: 'student-3',
      displayName: '王五',
      joinedAt: Date.now(),
      isOnline: true,
      lastActiveAt: Date.now()
    })
    return students
  }

  const mockCallbacks = {
    onCreateVote: jest.fn(),
    onVote: jest.fn(),
    onCloseVote: jest.fn(),
    onResetVote: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('基础渲染', () => {
    it('应该正确渲染空状态', () => {
      render(<VotingPanel />)
      
      expect(screen.getByText('暂无投票')).toBeInTheDocument()
      expect(screen.getByText('等待教师发起投票')).toBeInTheDocument()
    })

    it('应该为教师显示创建按钮', () => {
      render(<VotingPanel isTeacher={true} {...mockCallbacks} />)
      
      expect(screen.getByText('创建投票')).toBeInTheDocument()
      expect(screen.getByText('点击"创建投票"开始新的投票')).toBeInTheDocument()
    })

    it('应该显示当前投票', () => {
      const vote = createMockVote()
      render(<VotingPanel currentVote={vote} />)
      
      expect(screen.getByText('你对今天的课程满意吗？')).toBeInTheDocument()
      expect(screen.getByText('非常满意')).toBeInTheDocument()
      expect(screen.getByText('满意')).toBeInTheDocument()
    })
  })

  describe('创建投票', () => {
    it('应该打开创建表单', async () => {
      const user = userEvent.setup()
      render(<VotingPanel isTeacher={true} {...mockCallbacks} />)
      
      const createBtn = screen.getByText('创建投票')
      await user.click(createBtn)
      
      expect(screen.getByPlaceholderText('输入投票问题...')).toBeInTheDocument()
      expect(screen.getByText('添加选项')).toBeInTheDocument()
    })

    it('应该添加和删除选项', async () => {
      const user = userEvent.setup()
      render(<VotingPanel isTeacher={true} {...mockCallbacks} />)
      
      await user.click(screen.getByText('创建投票'))
      
      // 初始有2个选项
      expect(screen.getByPlaceholderText('选项 1')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('选项 2')).toBeInTheDocument()
      
      // 添加选项
      await user.click(screen.getByText('添加选项'))
      expect(screen.getByPlaceholderText('选项 3')).toBeInTheDocument()
      
      // 删除选项
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const xButton = deleteButtons.find(btn => btn.querySelector('[class*="h-4 w-4"]'))
      if (xButton) {
        await user.click(xButton)
      }
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('选项 3')).not.toBeInTheDocument()
      })
    })

    it('应该验证必填项', async () => {
      const user = userEvent.setup()
      render(<VotingPanel isTeacher={true} {...mockCallbacks} />)
      
      await user.click(screen.getByText('创建投票'))
      
      const createFormBtn = screen.getAllByText('创建投票')[1]
      await user.click(createFormBtn)
      
      // 应该显示错误提示
      expect(mockCallbacks.onCreateVote).not.toHaveBeenCalled()
    })

    it('应该成功创建投票', async () => {
      const user = userEvent.setup()
      render(<VotingPanel isTeacher={true} {...mockCallbacks} />)
      
      await user.click(screen.getByText('创建投票'))
      
      // 填写问题
      const questionInput = screen.getByPlaceholderText('输入投票问题...')
      await user.type(questionInput, '测试问题')
      
      // 填写选项
      const option1 = screen.getByPlaceholderText('选项 1')
      const option2 = screen.getByPlaceholderText('选项 2')
      await user.type(option1, '选项A')
      await user.type(option2, '选项B')
      
      // 提交
      const createFormBtn = screen.getAllByText('创建投票')[1]
      await user.click(createFormBtn)
      
      expect(mockCallbacks.onCreateVote).toHaveBeenCalledWith(
        '测试问题',
        ['选项A', '选项B'],
        'single',
        expect.any(Object)
      )
    })
  })

  describe('投票功能', () => {
    it('应该选择选项', async () => {
      const user = userEvent.setup()
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          currentUserId="student-3"
          {...mockCallbacks}
        />
      )
      
      const option = screen.getByText('非常满意')
      await user.click(option.parentElement!)
      
      // 应该显示选中状态
      const checkIcon = option.parentElement?.querySelector('[class*="text-primary"]')
      expect(checkIcon).toBeInTheDocument()
    })

    it('应该提交投票', async () => {
      const user = userEvent.setup()
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          currentUserId="student-3"
          {...mockCallbacks}
        />
      )
      
      // 选择选项
      await user.click(screen.getByText('非常满意').parentElement!)
      
      // 提交投票
      const submitBtn = screen.getByText('提交投票')
      await user.click(submitBtn)
      
      expect(mockCallbacks.onVote).toHaveBeenCalledWith(
        'vote-1',
        ['choice-1']
      )
    })

    it('应该显示已投票状态', () => {
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          currentUserId="student-1" // 已投票的学生
        />
      )
      
      expect(screen.getByText('您已完成投票')).toBeInTheDocument()
      expect(screen.queryByText('提交投票')).not.toBeInTheDocument()
    })

    it('应该禁止重复投票', async () => {
      const user = userEvent.setup()
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          currentUserId="student-1"
          {...mockCallbacks}
        />
      )
      
      // 尝试点击选项
      const option = screen.getByText('非常满意')
      await user.click(option.parentElement!)
      
      // 不应该调用投票回调
      expect(mockCallbacks.onVote).not.toHaveBeenCalled()
    })
  })

  describe('结果展示', () => {
    it('应该显示投票结果', () => {
      const vote = createMockVote()
      const students = createMockStudents()
      render(
        <VotingPanel 
          currentVote={vote}
          students={students}
          config={{ showRealTimeResults: true }}
        />
      )
      
      expect(screen.getByText('投票结果')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('应该显示参与率', () => {
      const vote = createMockVote()
      const students = createMockStudents()
      render(
        <VotingPanel 
          currentVote={vote}
          students={students}
          config={{ showRealTimeResults: true }}
        />
      )
      
      // 2/3 = 67%
      expect(screen.getByText('2 / 3')).toBeInTheDocument()
      expect(screen.getByText('67%')).toBeInTheDocument()
    })

    it('应该显示领先选项', () => {
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          config={{ showRealTimeResults: true }}
        />
      )
      
      expect(screen.getByText(/当前领先: 非常满意/)).toBeInTheDocument()
    })

    it('应该隐藏结果', async () => {
      const user = userEvent.setup()
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          isTeacher={true}
          config={{ showRealTimeResults: true }}
        />
      )
      
      // 初始显示结果
      expect(screen.getByText('投票结果')).toBeInTheDocument()
      
      // 点击隐藏
      await user.click(screen.getByText('隐藏结果'))
      
      // 结果应该被隐藏
      expect(screen.queryByText('投票结果')).not.toBeInTheDocument()
    })
  })

  describe('投票控制', () => {
    it('应该结束投票', async () => {
      const user = userEvent.setup()
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          isTeacher={true}
          {...mockCallbacks}
        />
      )
      
      const endBtn = screen.getByText('结束投票')
      await user.click(endBtn)
      
      expect(mockCallbacks.onCloseVote).toHaveBeenCalledWith('vote-1')
    })

    it('应该重置投票', async () => {
      const user = userEvent.setup()
      const vote = { ...createMockVote(), isEnded: true }
      render(
        <VotingPanel 
          currentVote={vote}
          isTeacher={true}
          {...mockCallbacks}
        />
      )
      
      const resetBtn = screen.getByText('重新投票')
      await user.click(resetBtn)
      
      expect(mockCallbacks.onResetVote).toHaveBeenCalledWith('vote-1')
    })

    it('应该显示倒计时', () => {
      const vote = createMockVote()
      render(<VotingPanel currentVote={vote} />)
      
      // 应该显示时间徽章
      const timeBadge = screen.getByRole('timer', { hidden: true })
        || screen.getByText(/\d+:\d+/)
      expect(timeBadge).toBeTruthy()
    })
  })

  describe('配置选项', () => {
    it('应该支持匿名投票配置', () => {
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          config={{ allowAnonymous: true }}
        />
      )
      
      // 验证匿名配置生效
      expect(screen.getByText('你对今天的课程满意吗？')).toBeInTheDocument()
    })

    it('应该支持多选配置', async () => {
      const user = userEvent.setup()
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          currentUserId="student-3"
          config={{ maxChoices: 2 }}
        />
      )
      
      // 可以选择多个选项
      await user.click(screen.getByText('非常满意').parentElement!)
      await user.click(screen.getByText('满意').parentElement!)
      
      // 两个都应该被选中
      const checkIcons = screen.getAllByTestId(/check/i)
        || document.querySelectorAll('[class*="text-primary"]')
      expect(checkIcons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('边缘情况', () => {
    it('应该处理空学生列表', () => {
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          students={new Map()}
        />
      )
      
      expect(screen.getByText('投票结果')).toBeInTheDocument()
    })

    it('应该处理已结束的投票', () => {
      const vote = { ...createMockVote(), isEnded: true }
      render(
        <VotingPanel 
          currentVote={vote}
          currentUserId="student-3"
        />
      )
      
      // 不应该显示提交按钮
      expect(screen.queryByText('提交投票')).not.toBeInTheDocument()
    })

    it('应该处理无选项的提交', async () => {
      const user = userEvent.setup()
      const vote = createMockVote()
      render(
        <VotingPanel 
          currentVote={vote}
          currentUserId="student-3"
          {...mockCallbacks}
        />
      )
      
      // 不选择任何选项直接提交
      const submitBtn = screen.getByText('提交投票')
      expect(submitBtn).toBeDisabled()
      
      await user.click(submitBtn)
      expect(mockCallbacks.onVote).not.toHaveBeenCalled()
    })
  })
})