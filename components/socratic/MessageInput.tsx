/**
 * 消息输入组件
 * @description 苏格拉底式问答的消息输入界面，支持多种输入模式和快捷操作
 * @author 墨匠 - 2025-09-08
 */

'use client'

import React, { useState, useRef, useCallback, KeyboardEvent, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { 
  Send, 
  Mic, 
  MicOff,
  Paperclip,
  X,
  AlertCircle,
  Loader2,
  ChevronUp,
  Sparkles,
  HandMetal,
  HelpCircle,
  Lightbulb
} from 'lucide-react'
import { 
  DialogueLevel,
  LEVEL_CONFIG,
  MessageRole
} from '../../lib/types/socratic'

// 输入模式
export enum InputMode {
  TEXT = 'text',
  VOICE = 'voice',
  THINKING = 'thinking'
}

// 快捷提示类型
export interface QuickPrompt {
  id: string
  text: string
  icon?: React.ReactNode
  level?: DialogueLevel
}

// 组件属性
export interface MessageInputProps {
  onSend: (content: string, role?: MessageRole) => void
  onRaiseHand?: () => void
  onRequestHint?: () => void
  currentLevel?: DialogueLevel
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  minLength?: number
  showQuickPrompts?: boolean
  quickPrompts?: QuickPrompt[]
  showLevelIndicator?: boolean
  showVoiceInput?: boolean
  showAttachment?: boolean
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  clearAfterSend?: boolean
  role?: MessageRole
}

// 默认快捷提示
const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'clarify',
    text: '请详细解释一下',
    icon: <HelpCircle className="h-3 w-3" />
  },
  {
    id: 'example',
    text: '能举个例子吗？',
    icon: <Lightbulb className="h-3 w-3" />
  },
  {
    id: 'summary',
    text: '请总结一下要点',
    icon: <Sparkles className="h-3 w-3" />
  }
]

/**
 * 消息输入组件
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onRaiseHand,
  onRequestHint,
  currentLevel = DialogueLevel.OBSERVATION,
  isLoading = false,
  disabled = false,
  placeholder,
  maxLength = 1000,
  minLength = 1,
  showQuickPrompts = true,
  quickPrompts = DEFAULT_QUICK_PROMPTS,
  showLevelIndicator = true,
  showVoiceInput = false,
  showAttachment = false,
  className,
  inputClassName,
  autoFocus = false,
  clearAfterSend = true,
  role = MessageRole.STUDENT
}) => {
  const [content, setContent] = useState('')
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.TEXT)
  const [isRecording, setIsRecording] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(0)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 更新字符计数
  useEffect(() => {
    setCharCount(content.length)
  }, [content])
  
  // 自动聚焦
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])
  
  // 获取占位符文本
  const getPlaceholder = useCallback(() => {
    if (placeholder) return placeholder
    
    const levelName = LEVEL_CONFIG[currentLevel].name
    const levelDesc = LEVEL_CONFIG[currentLevel].description
    
    return `在${levelName}，${levelDesc.toLowerCase()}（按Enter发送，Shift+Enter换行）`
  }, [placeholder, currentLevel])
  
  // 验证输入
  const validateInput = useCallback((text: string): boolean => {
    if (!text || text.trim().length < minLength) {
      setError(`消息至少需要${minLength}个字符`)
      return false
    }
    
    if (text.length > maxLength) {
      setError(`消息不能超过${maxLength}个字符`)
      return false
    }
    
    setError(null)
    return true
  }, [minLength, maxLength])
  
  // 处理发送
  const handleSend = useCallback(() => {
    const trimmedContent = content.trim()
    
    if (!validateInput(trimmedContent)) {
      return
    }
    
    if (isLoading || disabled) {
      return
    }
    
    // 发送消息
    onSend(trimmedContent, role)
    
    // 清空输入
    if (clearAfterSend) {
      setContent('')
      setCharCount(0)
      setError(null)
    }
    
    // 重新聚焦
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [content, isLoading, disabled, onSend, role, clearAfterSend, validateInput])
  
  // 处理键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter发送，Shift+Enter换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    
    // Ctrl/Cmd + Enter 也可以发送
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
    
    // Escape清空输入
    if (e.key === 'Escape') {
      setContent('')
      setError(null)
    }
  }, [handleSend])
  
  // 处理快捷提示点击
  const handleQuickPrompt = useCallback((prompt: QuickPrompt) => {
    setContent(prompt.text)
    setCharCount(prompt.text.length)
    
    // 聚焦并选中文本
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [])
  
  // 处理语音输入
  const handleVoiceToggle = useCallback(() => {
    if (!showVoiceInput) return
    
    if (isRecording) {
      // 停止录音
      setIsRecording(false)
      setInputMode(InputMode.TEXT)
      // TODO: 实际实现时需要调用语音识别API
    } else {
      // 开始录音
      setIsRecording(true)
      setInputMode(InputMode.VOICE)
      // TODO: 实际实现时需要请求麦克风权限并开始录音
    }
  }, [isRecording, showVoiceInput])
  
  // 处理文件附件
  const handleAttachment = useCallback(() => {
    if (!showAttachment || !fileInputRef.current) return
    fileInputRef.current.click()
  }, [showAttachment])
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }, [])
  
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])
  
  // 获取层级颜色
  const getLevelColor = useCallback((level: DialogueLevel) => {
    switch (level) {
      case DialogueLevel.OBSERVATION:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case DialogueLevel.FACTS:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case DialogueLevel.ANALYSIS:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case DialogueLevel.APPLICATION:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case DialogueLevel.VALUES:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }, [])
  
  return (
    <Card className={cn('p-4 space-y-3', className)}>
      {/* 层级指示器 */}
      {showLevelIndicator && (
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline" 
            className={cn('text-xs', getLevelColor(currentLevel))}
          >
            {LEVEL_CONFIG[currentLevel].name}: {LEVEL_CONFIG[currentLevel].objective}
          </Badge>
          
          <div className="flex gap-2">
            {onRaiseHand && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRaiseHand}
                disabled={disabled || isLoading}
                className="h-7 px-2"
              >
                <HandMetal className="h-4 w-4 mr-1" />
                举手
              </Button>
            )}
            
            {onRequestHint && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRequestHint}
                disabled={disabled || isLoading}
                className="h-7 px-2"
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                提示
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* 快捷提示 */}
      {showQuickPrompts && quickPrompts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map(prompt => (
            <Button
              key={prompt.id}
              size="sm"
              variant="outline"
              onClick={() => handleQuickPrompt(prompt)}
              disabled={disabled || isLoading}
              className="h-7 text-xs"
            >
              {prompt.icon}
              <span className="ml-1">{prompt.text}</span>
            </Button>
          ))}
        </div>
      )}
      
      {/* 附件列表 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <Badge key={index} variant="secondary" className="pr-1">
              <Paperclip className="h-3 w-3 mr-1" />
              <span className="text-xs max-w-[100px] truncate">{file.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeAttachment(index)}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* 输入区域 */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={disabled || isLoading || inputMode !== InputMode.TEXT}
          className={cn(
            'min-h-[80px] pr-12 resize-none',
            inputClassName,
            error && 'border-red-500 focus:ring-red-500'
          )}
          maxLength={maxLength}
        />
        
        {/* 语音录音指示器 */}
        {inputMode === InputMode.VOICE && isRecording && (
          <div className="absolute inset-0 bg-background/95 flex items-center justify-center rounded-md">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <Mic className="h-6 w-6 text-red-500" />
              </div>
              <span className="text-sm">正在录音...</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleVoiceToggle}
              >
                停止
              </Button>
            </div>
          </div>
        )}
        
        {/* 字符计数 */}
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
          {charCount}/{maxLength}
        </div>
        
        {/* 操作按钮 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {/* 附件按钮 */}
          {showAttachment && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled || isLoading}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAttachment}
                disabled={disabled || isLoading}
                className="h-7 w-7 p-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {/* 语音输入按钮 */}
          {showVoiceInput && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleVoiceToggle}
              disabled={disabled || isLoading}
              className="h-7 w-7 p-0"
            >
              {isRecording ? (
                <MicOff className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {/* 发送按钮 */}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={disabled || isLoading || content.trim().length === 0}
            className="h-7 w-7 p-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
      
      {/* 输入提示 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Enter 发送 • Shift+Enter 换行 • Esc 清空</span>
        {inputMode === InputMode.THINKING && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            AI正在思考...
          </span>
        )}
      </div>
    </Card>
  )
}

// 导出默认组件
export default MessageInput