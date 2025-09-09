/**
 * MessageList组件测试
 * @description 测试消息列表的渲染、滚动、更新和性能
 */

import React from 'react'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { MessageList } from '../../../components/socratic/MessageList'
import { 
  MessageRole, 
  DialogueLevel,
  type Message 
} from '../../../lib/types/socratic'

// Mock ScrollArea组件，避免测试中的滚动复杂性
jest.mock('../../../components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className, style }: any) => (
    <div className={className} style={style} data-testid="scroll-area">
      {children}
    </div>
  )
}))

describe('MessageList组件', () => {
  // 创建测试消息
  const createTestMessage = (id: string, overrides?: Partial<Message>): Message => ({
    id,
    role: MessageRole.STUDENT,
    content: `测试消息 ${id}`,
    level: DialogueLevel.OBSERVATION,
    timestamp: Date.now(),
    ...overrides
  })
  
  // 创建多条测试消息
  const createTestMessages = (count: number): Message[] => {
    return Array.from({ length: count }, (_, i) => 
      createTestMessage(`msg-${i + 1}`, {
        role: i % 2 === 0 ? MessageRole.STUDENT : MessageRole.AGENT,
        level: ((i % 5) + 1) as DialogueLevel,
        content: `这是第 ${i + 1} 条测试消息`,
        timestamp: Date.now() - (count - i) * 60000, // 递增的时间戳
      })
    )
  }
  
  describe('基础渲染', () => {
    it('应该正确渲染消息列表', () => {
      const messages = createTestMessages(3)
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      // 验证所有消息都被渲染
      messages.forEach(message => {
        expect(screen.getByText(message.content)).toBeInTheDocument()
      })
    })
    
    it('应该显示空状态', () => {
      render(
        <MessageList 
          messages={[]} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      expect(screen.getByText('暂无消息')).toBeInTheDocument()
      expect(screen.getByText(/开始你的苏格拉底式对话/)).toBeInTheDocument()
    })
    
    it('应该显示加载状态', () => {
      const { container } = render(
        <MessageList 
          messages={[]} 
          currentLevel={DialogueLevel.OBSERVATION}
          isLoading={true}
        />
      )
      
      // 应该显示骨架屏 - 检查是否有Skeleton组件渲染的元素
      // Skeleton组件通常会渲染带有特定类名或动画的元素
      const loadingElements = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(loadingElements.length).toBeGreaterThan(0)
    })
    
    it('应该正确显示当前层级', () => {
      render(
        <MessageList 
          messages={[]} 
          currentLevel={DialogueLevel.ANALYSIS}
        />
      )
      
      expect(screen.getByText(/当前层级.*分析层/)).toBeInTheDocument()
    })
  })
  
  describe('消息显示', () => {
    it('应该正确显示不同角色的消息', () => {
      const messages = [
        createTestMessage('1', { role: MessageRole.STUDENT, content: '学生消息' }),
        createTestMessage('2', { role: MessageRole.AGENT, content: 'AI消息' }),
        createTestMessage('3', { role: MessageRole.TEACHER, content: '教师消息' }),
        createTestMessage('4', { role: MessageRole.SYSTEM, content: '系统消息' })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      expect(screen.getByText('学生')).toBeInTheDocument()
      expect(screen.getByText('AI助教')).toBeInTheDocument()
      expect(screen.getByText('教师')).toBeInTheDocument()
      expect(screen.getByText('系统')).toBeInTheDocument()
    })
    
    it('应该显示时间戳', () => {
      const messages = [
        createTestMessage('1', { 
          timestamp: Date.now() - 30000 // 30秒前
        })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
          showTimestamp={true}
        />
      )
      
      expect(screen.getByText('刚刚')).toBeInTheDocument()
    })
    
    it('应该根据配置隐藏时间戳', () => {
      const messages = [createTestMessage('1')]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
          showTimestamp={false}
        />
      )
      
      // 不应该显示时间相关元素
      expect(screen.queryByText('刚刚')).not.toBeInTheDocument()
    })
    
    it('应该显示层级徽章', () => {
      const messages = [
        createTestMessage('1', { level: DialogueLevel.OBSERVATION }),
        createTestMessage('2', { level: DialogueLevel.FACTS }),
        createTestMessage('3', { level: DialogueLevel.ANALYSIS })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
          showLevelBadge={true}
        />
      )
      
      expect(screen.getByText('观察层')).toBeInTheDocument()
      expect(screen.getByText('事实层')).toBeInTheDocument()
      expect(screen.getByText('分析层')).toBeInTheDocument()
    })
  })
  
  describe('元数据显示', () => {
    it('应该显示质量评分', () => {
      const messages = [
        createTestMessage('1', {
          metadata: {
            quality: 85
          }
        })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
          showQualityScore={true}
        />
      )
      
      expect(screen.getByText(/质量.*85%/)).toBeInTheDocument()
    })
    
    it('应该显示关键词', () => {
      const messages = [
        createTestMessage('1', {
          metadata: {
            keywords: ['合同', '违约', '赔偿']
          }
        })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      expect(screen.getByText('合同')).toBeInTheDocument()
      expect(screen.getByText('违约')).toBeInTheDocument()
      expect(screen.getByText('赔偿')).toBeInTheDocument()
    })
    
    it('应该限制显示的关键词数量', () => {
      const messages = [
        createTestMessage('1', {
          metadata: {
            keywords: ['关键词1', '关键词2', '关键词3', '关键词4', '关键词5']
          }
        })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      expect(screen.getByText('关键词1')).toBeInTheDocument()
      expect(screen.getByText('关键词2')).toBeInTheDocument()
      expect(screen.getByText('关键词3')).toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument() // 显示剩余数量
    })
    
    it('应该显示改进建议', () => {
      const messages = [
        createTestMessage('1', {
          metadata: {
            suggestions: ['建议1', '建议2']
          }
        })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      expect(screen.getByText('改进建议：')).toBeInTheDocument()
      expect(screen.getByText('建议1')).toBeInTheDocument()
      expect(screen.getByText('建议2')).toBeInTheDocument()
    })
    
    it('应该显示思考时间', () => {
      const messages = [
        createTestMessage('1', {
          metadata: {
            thinkingTime: 1500 // 1.5秒
          }
        })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      expect(screen.getByText(/思考.*1.5s/)).toBeInTheDocument()
    })
  })
  
  describe('交互功能', () => {
    it('应该处理消息点击事件', () => {
      const handleClick = jest.fn()
      const messages = createTestMessages(3)
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
          onMessageClick={handleClick}
        />
      )
      
      fireEvent.click(screen.getByText(messages[0].content))
      expect(handleClick).toHaveBeenCalledWith(messages[0])
    })
    
    it('应该显示流式消息的动画效果', () => {
      const messages = [
        createTestMessage('1', {
          streaming: true,
          content: '正在输入中...'
        })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const messageElement = screen.getByText('正在输入中...')
      expect(messageElement.className).toContain('animate-pulse')
    })
    
    it('应该显示最新消息的动画', () => {
      const messages = createTestMessages(3)
      
      const { container } = render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      // 最后一条消息应该有动画类
      const messageElements = container.querySelectorAll('.group')
      const lastMessage = messageElements[messageElements.length - 1]
      expect(lastMessage.className).toContain('animate-in')
    })
  })
  
  describe('自定义配置', () => {
    it('应该支持自定义最大高度', () => {
      const messages = createTestMessages(10)
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
          maxHeight="400px"
        />
      )
      
      const scrollArea = screen.getByTestId('scroll-area')
      expect(scrollArea.style.height).toBe('400px')
    })
    
    it('应该支持自定义类名', () => {
      const { container } = render(
        <MessageList 
          messages={[]} 
          currentLevel={DialogueLevel.OBSERVATION}
          className="custom-class"
        />
      )
      
      const card = container.querySelector('.custom-class')
      expect(card).toBeInTheDocument()
    })
  })
  
  describe('性能测试', () => {
    it('应该能够渲染大量消息', () => {
      const messages = createTestMessages(1000)
      
      const startTime = performance.now()
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // 验证渲染时间在合理范围内（5秒）
      expect(renderTime).toBeLessThan(5000)
      
      // 验证消息被渲染
      expect(screen.getByText('这是第 1 条测试消息')).toBeInTheDocument()
      expect(screen.getByText('这是第 1000 条测试消息')).toBeInTheDocument()
    })
    
    it('应该高效更新消息列表', () => {
      const initialMessages = createTestMessages(100)
      
      const { rerender } = render(
        <MessageList 
          messages={initialMessages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const newMessages = [...initialMessages, createTestMessage('new-msg', {
        content: '新增的消息'
      })]
      
      const startTime = performance.now()
      
      rerender(
        <MessageList 
          messages={newMessages} 
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const endTime = performance.now()
      const updateTime = endTime - startTime
      
      // 更新时间应该很快（小于100ms）
      expect(updateTime).toBeLessThan(100)
      expect(screen.getByText('新增的消息')).toBeInTheDocument()
    })
  })
  
  describe('时间戳格式化', () => {
    it('应该正确格式化不同时间范围', () => {
      const now = Date.now()
      const messages = [
        createTestMessage('1', { 
          timestamp: now - 30000, // 30秒前
          content: '30秒前的消息'
        }),
        createTestMessage('2', { 
          timestamp: now - 300000, // 5分钟前
          content: '5分钟前的消息'
        }),
        createTestMessage('3', { 
          timestamp: now - 7200000, // 2小时前
          content: '2小时前的消息'
        })
      ]
      
      render(
        <MessageList 
          messages={messages} 
          currentLevel={DialogueLevel.OBSERVATION}
          showTimestamp={true}
        />
      )
      
      expect(screen.getByText('刚刚')).toBeInTheDocument()
      expect(screen.getByText('5分钟前')).toBeInTheDocument()
      expect(screen.getByText('2小时前')).toBeInTheDocument()
    })
  })
})