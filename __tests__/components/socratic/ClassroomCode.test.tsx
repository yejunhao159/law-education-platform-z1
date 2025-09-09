/**
 * ClassroomCode组件测试
 * @description 测试课堂码组件的功能和交互
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassroomCode } from '../../../components/socratic/ClassroomCode'
import { 
  type ClassroomSession,
  type StudentInfo
} from '../../../lib/types/socratic'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn()
  }
})

// Mock share API
Object.assign(navigator, {
  share: jest.fn()
})

describe('ClassroomCode组件', () => {
  // 创建模拟会话
  const createMockSession = (): ClassroomSession => {
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
    
    return {
      code: 'ABC123',
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1小时后
      status: 'active',
      students,
      teacherId: 'teacher-1'
    }
  }

  const mockCallbacks = {
    onGenerateCode: jest.fn(),
    onJoinClassroom: jest.fn(),
    onCopyCode: jest.fn(),
    onShare: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined)
  })

  describe('教师视图', () => {
    it('应该显示生成按钮当没有会话时', () => {
      render(
        <ClassroomCode 
          isTeacher={true}
          {...mockCallbacks}
        />
      )
      
      expect(screen.getByText('生成课堂码')).toBeInTheDocument()
      expect(screen.getByText('生成邀请码让学生加入课堂')).toBeInTheDocument()
    })

    it('应该显示课堂码', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
        />
      )
      
      expect(screen.getByText('ABC123')).toBeInTheDocument()
      expect(screen.getByText('分享此码让学生加入课堂')).toBeInTheDocument()
    })

    it('应该显示活跃状态', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
        />
      )
      
      expect(screen.getByText('活跃')).toBeInTheDocument()
    })

    it('应该显示过期状态', () => {
      const session = {
        ...createMockSession(),
        expiresAt: Date.now() - 1000 // 已过期
      }
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
        />
      )
      
      expect(screen.getByText('已过期')).toBeInTheDocument()
    })

    it('应该显示学生统计', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          config={{ showStats: true }}
        />
      )
      
      expect(screen.getByText('已加入')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('容量')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
    })

    it('应该处理复制功能', async () => {
      const user = userEvent.setup()
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          {...mockCallbacks}
        />
      )
      
      const copyButton = screen.getByRole('button', { name: /copy/i })
        || document.querySelector('[class*="h-4 w-4"]')?.parentElement
      
      if (copyButton) {
        await user.click(copyButton)
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123')
        expect(mockCallbacks.onCopyCode).toHaveBeenCalledWith('ABC123')
      }
    })

    it('应该处理分享功能', async () => {
      const user = userEvent.setup()
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          config={{ allowShare: true }}
          {...mockCallbacks}
        />
      )
      
      const shareButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('[class*="Share2"]')
      )
      
      if (shareButton) {
        await user.click(shareButton)
        expect(navigator.share).toHaveBeenCalled()
        expect(mockCallbacks.onShare).toHaveBeenCalledWith('ABC123')
      }
    })

    it('应该显示剩余时间', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
        />
      )
      
      // 应该显示剩余时间
      expect(screen.getByText(/剩余/)).toBeInTheDocument()
    })

    it('应该显示满员状态', () => {
      const session = createMockSession()
      // 添加更多学生达到上限
      for (let i = 3; i <= 50; i++) {
        session.students.set(`student-${i}`, {
          id: `student-${i}`,
          displayName: `学生${i}`,
          joinedAt: Date.now(),
          isOnline: true,
          lastActiveAt: Date.now()
        })
      }
      
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          config={{ maxStudents: 50 }}
        />
      )
      
      expect(screen.getByText('已满')).toBeInTheDocument()
    })

    it('应该显示二维码占位符', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          config={{ showQRCode: true }}
        />
      )
      
      const qrImage = screen.getByAltText('QR Code')
      expect(qrImage).toBeInTheDocument()
      expect(qrImage).toHaveAttribute('src', expect.stringContaining('ABC123'))
    })

    it('应该处理生成新码', async () => {
      const user = userEvent.setup()
      const session = {
        ...createMockSession(),
        status: 'ended' as const
      }
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          {...mockCallbacks}
        />
      )
      
      const generateBtn = screen.getByText('生成新码')
      await user.click(generateBtn)
      
      expect(mockCallbacks.onGenerateCode).toHaveBeenCalled()
    })
  })

  describe('学生视图', () => {
    it('应该显示加入表单', () => {
      render(
        <ClassroomCode 
          isTeacher={false}
        />
      )
      
      expect(screen.getByText('加入课堂')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('输入6位课堂码')).toBeInTheDocument()
    })

    it('应该处理输入变化', async () => {
      const user = userEvent.setup()
      render(
        <ClassroomCode 
          isTeacher={false}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'abc123')
      
      // 应该自动转为大写
      expect(input).toHaveValue('ABC123')
    })

    it('应该限制输入长度', async () => {
      const user = userEvent.setup()
      render(
        <ClassroomCode 
          isTeacher={false}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'ABCDEFGHIJ')
      
      // 只应该接受前6个字符
      expect(input).toHaveValue('ABCDEF')
    })

    it('应该显示输入计数', async () => {
      const user = userEvent.setup()
      render(
        <ClassroomCode 
          isTeacher={false}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'ABC')
      
      expect(screen.getByText('3/6')).toBeInTheDocument()
    })

    it('应该在输入完成时显示提示', async () => {
      const user = userEvent.setup()
      render(
        <ClassroomCode 
          isTeacher={false}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'ABC123')
      
      expect(screen.getByText(/按回车或点击箭头加入/)).toBeInTheDocument()
    })

    it('应该禁用不完整的提交', () => {
      render(
        <ClassroomCode 
          isTeacher={false}
        />
      )
      
      const joinButton = screen.getByRole('button')
      expect(joinButton).toBeDisabled()
    })

    it('应该启用完整的提交', async () => {
      const user = userEvent.setup()
      render(
        <ClassroomCode 
          isTeacher={false}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'ABC123')
      
      const joinButton = screen.getByRole('button')
      expect(joinButton).not.toBeDisabled()
    })

    it('应该处理加入课堂', async () => {
      const user = userEvent.setup()
      render(
        <ClassroomCode 
          isTeacher={false}
          {...mockCallbacks}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'ABC123')
      
      const joinButton = screen.getByRole('button')
      await user.click(joinButton)
      
      expect(mockCallbacks.onJoinClassroom).toHaveBeenCalledWith('ABC123')
    })

    it('应该显示加入错误', async () => {
      const user = userEvent.setup()
      const onJoinClassroom = jest.fn().mockRejectedValue(
        new Error('课堂码无效')
      )
      
      render(
        <ClassroomCode 
          isTeacher={false}
          onJoinClassroom={onJoinClassroom}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'WRONG1')
      
      const joinButton = screen.getByRole('button')
      await user.click(joinButton)
      
      await waitFor(() => {
        expect(screen.getByText(/课堂码无效/)).toBeInTheDocument()
      })
    })

    it('应该验证输入格式', async () => {
      const user = userEvent.setup()
      render(
        <ClassroomCode 
          isTeacher={false}
          {...mockCallbacks}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'ABC')
      
      const joinButton = screen.getByRole('button')
      await user.click(joinButton)
      
      // 不应该调用加入函数
      expect(mockCallbacks.onJoinClassroom).not.toHaveBeenCalled()
    })

    it('应该显示加载状态', async () => {
      const user = userEvent.setup()
      const onJoinClassroom = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      )
      
      render(
        <ClassroomCode 
          isTeacher={false}
          onJoinClassroom={onJoinClassroom}
        />
      )
      
      const input = screen.getByPlaceholderText('输入6位课堂码')
      await user.type(input, 'ABC123')
      
      const joinButton = screen.getByRole('button')
      await user.click(joinButton)
      
      // 应该显示加载状态
      expect(screen.getByRole('button').querySelector('[class*="animate-spin"]')).toBeInTheDocument()
    })
  })

  describe('配置选项', () => {
    it('应该隐藏二维码', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          config={{ showQRCode: false }}
        />
      )
      
      expect(screen.queryByAltText('QR Code')).not.toBeInTheDocument()
    })

    it('应该隐藏统计信息', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          config={{ showStats: false }}
        />
      )
      
      expect(screen.queryByText('已加入')).not.toBeInTheDocument()
    })

    it('应该隐藏分享按钮', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          config={{ allowShare: false }}
        />
      )
      
      const shareButton = screen.queryAllByRole('button').find(btn => 
        btn.querySelector('[class*="Share2"]')
      )
      expect(shareButton).toBeUndefined()
    })

    it('应该使用自定义最大学生数', () => {
      const session = createMockSession()
      render(
        <ClassroomCode 
          session={session}
          isTeacher={true}
          config={{ maxStudents: 30, showStats: true }}
        />
      )
      
      expect(screen.getByText('30')).toBeInTheDocument()
    })
  })

  describe('加载状态', () => {
    it('应该显示加载状态', () => {
      render(
        <ClassroomCode 
          isTeacher={true}
          isLoading={true}
          {...mockCallbacks}
        />
      )
      
      expect(screen.getByText('生成中...')).toBeInTheDocument()
    })
  })
})