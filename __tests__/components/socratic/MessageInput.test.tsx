/**
 * MessageInput组件测试
 * @description 测试消息输入组件的各种功能和交互
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput, InputMode, QuickPrompt } from '../../../components/socratic/MessageInput'
import { 
  MessageRole, 
  DialogueLevel 
} from '../../../lib/types/socratic'

describe('MessageInput组件', () => {
  const mockOnSend = jest.fn()
  const mockOnRaiseHand = jest.fn()
  const mockOnRequestHint = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('基础渲染', () => {
    it('应该正确渲染输入框', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      expect(textarea).toBeInTheDocument()
    })
    
    it('应该显示层级指示器', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.ANALYSIS}
          showLevelIndicator={true}
        />
      )
      
      expect(screen.getByText(/分析层/)).toBeInTheDocument()
      expect(screen.getByText(/分析法律关系和构成要件/)).toBeInTheDocument()
    })
    
    it('应该根据配置隐藏层级指示器', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.ANALYSIS}
          showLevelIndicator={false}
        />
      )
      
      expect(screen.queryByText(/分析层.*理解关系/)).not.toBeInTheDocument()
    })
    
    it('应该显示字符计数', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          maxLength={500}
        />
      )
      
      expect(screen.getByText('0/500')).toBeInTheDocument()
    })
    
    it('应该显示自定义占位符', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          placeholder="请输入您的问题..."
        />
      )
      
      expect(screen.getByPlaceholderText('请输入您的问题...')).toBeInTheDocument()
    })
  })
  
  describe('文本输入', () => {
    it('应该处理文本输入', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      await user.type(textarea, '这是测试消息')
      
      expect(textarea).toHaveValue('这是测试消息')
      expect(screen.getByText('6/1000')).toBeInTheDocument()
    })
    
    it('应该限制最大字符数', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          maxLength={10}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      await user.type(textarea, 'abcdefghijklmnop')
      
      expect(textarea).toHaveValue('abcdefghij')
      expect(screen.getByText('10/10')).toBeInTheDocument()
    })
    
    it('应该验证最小字符数', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          minLength={5}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      const sendButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-send'))
      
      await user.type(textarea, 'Hi')
      fireEvent.click(sendButton!)
      
      expect(mockOnSend).not.toHaveBeenCalled()
      expect(screen.getByText('消息至少需要5个字符')).toBeInTheDocument()
    })
    
    it('应该清除输入错误', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          minLength={5}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      const sendButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-send'))
      
      // 触发错误
      await user.type(textarea, 'Hi')
      fireEvent.click(sendButton!)
      expect(screen.getByText('消息至少需要5个字符')).toBeInTheDocument()
      
      // 按Escape清除错误
      fireEvent.keyDown(textarea, { key: 'Escape' })
      
      // 错误应该被清除
      expect(screen.queryByText('消息至少需要5个字符')).not.toBeInTheDocument()
    })
  })
  
  describe('发送功能', () => {
    it('应该发送有效消息', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      const sendButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-send'))
      
      await user.type(textarea, '测试消息')
      fireEvent.click(sendButton!)
      
      expect(mockOnSend).toHaveBeenCalledWith('测试消息', MessageRole.STUDENT)
    })
    
    it('应该在发送后清空输入', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          clearAfterSend={true}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      const sendButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-send'))
      
      await user.type(textarea, '测试消息')
      fireEvent.click(sendButton!)
      
      expect(textarea).toHaveValue('')
      expect(screen.getByText('0/1000')).toBeInTheDocument()
    })
    
    it('应该保留输入内容', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          clearAfterSend={false}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      const sendButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-send'))
      
      await user.type(textarea, '测试消息')
      fireEvent.click(sendButton!)
      
      expect(textarea).toHaveValue('测试消息')
    })
    
    it('应该使用指定的角色', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          role={MessageRole.TEACHER}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      const sendButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-send'))
      
      await user.type(textarea, '教师消息')
      fireEvent.click(sendButton!)
      
      expect(mockOnSend).toHaveBeenCalledWith('教师消息', MessageRole.TEACHER)
    })
    
    it('应该在加载时禁用发送', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          isLoading={true}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      await user.type(textarea, 'test message')
      
      // 找到最后一个按钮（发送按钮）
      const buttons = container.querySelectorAll('button')
      const sendButton = buttons[buttons.length - 1]
      
      expect(sendButton).toBeDisabled()
      
      // 应该显示加载图标
      const loader = container.querySelector('.animate-spin')
      expect(loader).toBeInTheDocument()
    })
    
    it('应该在禁用时阻止发送', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          disabled={true}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      const sendButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-send'))
      
      expect(textarea).toBeDisabled()
      expect(sendButton).toBeDisabled()
    })
  })
  
  describe('键盘快捷键', () => {
    it('应该使用Enter键发送', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      await user.type(textarea, '测试消息')
      
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      
      expect(mockOnSend).toHaveBeenCalledWith('测试消息', MessageRole.STUDENT)
    })
    
    it('应该使用Shift+Enter换行', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      await user.type(textarea, '第一行')
      
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
      
      expect(mockOnSend).not.toHaveBeenCalled()
    })
    
    it('应该使用Ctrl+Enter发送', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      await user.type(textarea, '测试消息')
      
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
      
      expect(mockOnSend).toHaveBeenCalledWith('测试消息', MessageRole.STUDENT)
    })
    
    it('应该使用Escape清空输入', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      await user.type(textarea, '测试消息')
      
      fireEvent.keyDown(textarea, { key: 'Escape' })
      
      expect(textarea).toHaveValue('')
    })
  })
  
  describe('快捷提示', () => {
    it('应该显示默认快捷提示', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showQuickPrompts={true}
        />
      )
      
      expect(screen.getByText('请详细解释一下')).toBeInTheDocument()
      expect(screen.getByText('能举个例子吗？')).toBeInTheDocument()
      expect(screen.getByText('请总结一下要点')).toBeInTheDocument()
    })
    
    it('应该使用自定义快捷提示', () => {
      const customPrompts: QuickPrompt[] = [
        { id: '1', text: '自定义提示1' },
        { id: '2', text: '自定义提示2' }
      ]
      
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showQuickPrompts={true}
          quickPrompts={customPrompts}
        />
      )
      
      expect(screen.getByText('自定义提示1')).toBeInTheDocument()
      expect(screen.getByText('自定义提示2')).toBeInTheDocument()
    })
    
    it('应该处理快捷提示点击', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showQuickPrompts={true}
        />
      )
      
      const promptButton = screen.getByText('请详细解释一下')
      fireEvent.click(promptButton)
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      expect(textarea).toHaveValue('请详细解释一下')
    })
    
    it('应该隐藏快捷提示', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showQuickPrompts={false}
        />
      )
      
      expect(screen.queryByText('请详细解释一下')).not.toBeInTheDocument()
    })
  })
  
  describe('特殊功能按钮', () => {
    it('应该显示举手按钮', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          onRaiseHand={mockOnRaiseHand}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const raiseHandButton = screen.getByText('举手')
      expect(raiseHandButton).toBeInTheDocument()
      
      fireEvent.click(raiseHandButton)
      expect(mockOnRaiseHand).toHaveBeenCalled()
    })
    
    it('应该显示提示按钮', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          onRequestHint={mockOnRequestHint}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const hintButton = screen.getByText('提示')
      expect(hintButton).toBeInTheDocument()
      
      fireEvent.click(hintButton)
      expect(mockOnRequestHint).toHaveBeenCalled()
    })
    
    it('应该在加载时禁用特殊按钮', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          onRaiseHand={mockOnRaiseHand}
          onRequestHint={mockOnRequestHint}
          currentLevel={DialogueLevel.OBSERVATION}
          isLoading={true}
        />
      )
      
      const raiseHandButton = screen.getByText('举手')
      const hintButton = screen.getByText('提示')
      
      expect(raiseHandButton).toBeDisabled()
      expect(hintButton).toBeDisabled()
    })
  })
  
  describe('语音输入', () => {
    it('应该显示语音输入按钮', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showVoiceInput={true}
        />
      )
      
      const voiceButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-mic'))
      expect(voiceButton).toBeInTheDocument()
    })
    
    it('应该切换录音状态', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showVoiceInput={true}
        />
      )
      
      const voiceButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-mic'))
      
      // 开始录音
      fireEvent.click(voiceButton)
      expect(screen.getByText('正在录音...')).toBeInTheDocument()
      
      // 停止录音
      const stopButton = screen.getByText('停止')
      fireEvent.click(stopButton)
      expect(screen.queryByText('正在录音...')).not.toBeInTheDocument()
    })
    
    it('应该隐藏语音输入', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showVoiceInput={false}
        />
      )
      
      const voiceButton = screen.queryByRole('button', { name: /mic/i })
      expect(voiceButton).not.toBeInTheDocument()
    })
  })
  
  describe('文件附件', () => {
    it('应该显示附件按钮', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showAttachment={true}
        />
      )
      
      const attachButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-paperclip'))
      expect(attachButton).toBeInTheDocument()
    })
    
    it('应该处理文件选择', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showAttachment={true}
        />
      )
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })
      
      fireEvent.change(input)
      
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })
    
    it('应该删除附件', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showAttachment={true}
        />
      )
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })
      
      fireEvent.change(input)
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
      
      // 删除附件 - X按钮在Badge内
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(btn => btn.querySelector('.lucide-x'))
      fireEvent.click(deleteButton!)
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
    })
    
    it('应该隐藏附件功能', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          showAttachment={false}
        />
      )
      
      const attachButton = screen.queryByRole('button', { name: /paperclip/i })
      expect(attachButton).not.toBeInTheDocument()
    })
  })
  
  describe('自动聚焦', () => {
    it('应该自动聚焦输入框', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          autoFocus={true}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      expect(document.activeElement).toBe(textarea)
    })
    
    it('应该不自动聚焦', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          autoFocus={false}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      expect(document.activeElement).not.toBe(textarea)
    })
  })
  
  describe('样式自定义', () => {
    it('应该应用自定义类名', () => {
      const { container } = render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          className="custom-wrapper"
          inputClassName="custom-input"
        />
      )
      
      const wrapper = container.querySelector('.custom-wrapper')
      const input = container.querySelector('.custom-input')
      
      expect(wrapper).toBeInTheDocument()
      expect(input).toBeInTheDocument()
    })
  })
  
  describe('输入提示', () => {
    it('应该显示输入提示', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      expect(screen.getByText('Enter 发送 • Shift+Enter 换行 • Esc 清空')).toBeInTheDocument()
    })
  })
  
  describe('边缘情况', () => {
    it('应该处理空白输入', () => {
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const sendButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-send'))
      
      // 发送按钮在空输入时应该被禁用
      expect(sendButton).toBeDisabled()
      
      // 不应该调用onSend
      fireEvent.click(sendButton!)
      expect(mockOnSend).not.toHaveBeenCalled()
    })
    
    it('应该处理超长输入', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
          maxLength={10}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      const longText = 'a'.repeat(20)
      
      await user.type(textarea, longText)
      
      expect(textarea).toHaveValue('a'.repeat(10))
    })
    
    it('应该在发送后重新聚焦', async () => {
      const user = userEvent.setup()
      render(
        <MessageInput 
          onSend={mockOnSend}
          currentLevel={DialogueLevel.OBSERVATION}
        />
      )
      
      const textarea = screen.getByPlaceholderText(/在观察层/)
      await user.type(textarea, '测试消息')
      
      fireEvent.keyDown(textarea, { key: 'Enter' })
      
      expect(document.activeElement).toBe(textarea)
    })
  })
})