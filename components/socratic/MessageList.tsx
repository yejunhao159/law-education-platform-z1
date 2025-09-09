/**
 * 消息列表组件
 * @description 展示苏格拉底式问答的消息历史，支持虚拟滚动优化
 * @author 墨匠 - 2025-09-08
 */

'use client'

import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import { Skeleton } from '../ui/skeleton'
import { 
  MessageRole, 
  DialogueLevel, 
  LEVEL_CONFIG,
  type Message 
} from '../../lib/types/socratic'
import { 
  User, 
  Bot, 
  GraduationCap, 
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react'

// 消息列表组件属性
interface MessageListProps {
  messages: Message[]
  currentLevel: DialogueLevel
  isLoading?: boolean
  showTimestamp?: boolean
  showQualityScore?: boolean
  showLevelBadge?: boolean
  autoScroll?: boolean
  maxHeight?: string
  className?: string
  onMessageClick?: (message: Message) => void
}

// 获取角色图标
const getRoleIcon = (role: MessageRole) => {
  switch (role) {
    case MessageRole.STUDENT:
      return <User className="h-4 w-4" />
    case MessageRole.AGENT:
      return <Bot className="h-4 w-4" />
    case MessageRole.TEACHER:
      return <GraduationCap className="h-4 w-4" />
    case MessageRole.SYSTEM:
      return <AlertCircle className="h-4 w-4" />
    default:
      return <User className="h-4 w-4" />
  }
}

// 获取角色显示名称
const getRoleDisplayName = (role: MessageRole) => {
  switch (role) {
    case MessageRole.STUDENT:
      return '学生'
    case MessageRole.AGENT:
      return 'AI助教'
    case MessageRole.TEACHER:
      return '教师'
    case MessageRole.SYSTEM:
      return '系统'
    default:
      return '未知'
  }
}

// 获取角色头像
const getRoleAvatar = (role: MessageRole) => {
  switch (role) {
    case MessageRole.STUDENT:
      return 'S'
    case MessageRole.AGENT:
      return 'AI'
    case MessageRole.TEACHER:
      return 'T'
    case MessageRole.SYSTEM:
      return 'SYS'
    default:
      return '?'
  }
}

// 获取层级颜色
const getLevelColor = (level: DialogueLevel) => {
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
}

// 格式化时间戳
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  
  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }
  
  // 小于24小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }
  
  // 同一天
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  // 其他情况
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 单个消息组件
const MessageItem: React.FC<{
  message: Message
  showTimestamp?: boolean
  showQualityScore?: boolean
  showLevelBadge?: boolean
  isLatest?: boolean
  onClick?: () => void
}> = ({ 
  message, 
  showTimestamp = true, 
  showQualityScore = false,
  showLevelBadge = true,
  isLatest = false,
  onClick 
}) => {
  const isAgent = message.role === MessageRole.AGENT
  const isStudent = message.role === MessageRole.STUDENT
  const isSystem = message.role === MessageRole.SYSTEM
  
  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 transition-colors',
        'hover:bg-muted/50',
        isLatest && 'animate-in fade-in-0 slide-in-from-bottom-2',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* 头像 */}
      <Avatar className={cn(
        'h-8 w-8 shrink-0',
        isAgent && 'ring-2 ring-primary/20'
      )}>
        <AvatarFallback className={cn(
          isAgent && 'bg-primary text-primary-foreground',
          isStudent && 'bg-blue-500 text-white',
          isSystem && 'bg-gray-500 text-white'
        )}>
          {getRoleAvatar(message.role)}
        </AvatarFallback>
      </Avatar>
      
      {/* 消息内容 */}
      <div className="flex-1 space-y-2">
        {/* 消息头部 */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {getRoleDisplayName(message.role)}
          </span>
          
          {showLevelBadge && (
            <Badge 
              variant="secondary" 
              className={cn('text-xs', getLevelColor(message.level))}
            >
              {LEVEL_CONFIG[message.level].name}
            </Badge>
          )}
          
          {showTimestamp && (
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimestamp(message.timestamp)}
            </span>
          )}
        </div>
        
        {/* 消息正文 */}
        <div className={cn(
          'text-sm leading-relaxed',
          message.streaming && 'animate-pulse'
        )}>
          {message.content}
        </div>
        
        {/* 元数据 */}
        {message.metadata && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* 质量评分 */}
            {showQualityScore && message.metadata.quality !== undefined && (
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                质量: {message.metadata.quality}%
              </Badge>
            )}
            
            {/* 关键词 */}
            {message.metadata.keywords && message.metadata.keywords.length > 0 && (
              <div className="flex gap-1">
                {message.metadata.keywords.slice(0, 3).map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {message.metadata.keywords.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{message.metadata.keywords.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            {/* 建议 */}
            {message.metadata.suggestions && message.metadata.suggestions.length > 0 && (
              <div className="w-full mt-2 p-2 bg-muted rounded-md">
                <div className="text-xs text-muted-foreground mb-1">改进建议：</div>
                <ul className="text-xs space-y-1">
                  {message.metadata.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 思考时间 */}
            {message.metadata.thinkingTime && (
              <Badge variant="outline" className="text-xs">
                思考: {(message.metadata.thinkingTime / 1000).toFixed(1)}s
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 加载骨架屏
const MessageSkeleton: React.FC = () => (
  <div className="flex gap-3 px-4 py-3">
    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
)

// 空状态组件
const EmptyState: React.FC<{ currentLevel: DialogueLevel }> = ({ currentLevel }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="rounded-full bg-muted p-3 mb-4">
      <Bot className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="font-medium text-sm mb-1">暂无消息</h3>
    <p className="text-xs text-muted-foreground max-w-[200px]">
      开始你的苏格拉底式对话，从{LEVEL_CONFIG[currentLevel].name}开始探索
    </p>
  </div>
)

/**
 * 消息列表组件
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentLevel,
  isLoading = false,
  showTimestamp = true,
  showQualityScore = false,
  showLevelBadge = true,
  autoScroll = true,
  maxHeight = '600px',
  className,
  onMessageClick
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const scrollContentRef = useRef<HTMLDivElement>(null)
  
  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && scrollContentRef.current) {
      const scrollContainer = scrollContentRef.current.parentElement
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, autoScroll])
  
  // 按层级分组消息
  const groupedMessages = useMemo(() => {
    const groups: Map<DialogueLevel, Message[]> = new Map()
    
    messages.forEach(message => {
      if (!groups.has(message.level)) {
        groups.set(message.level, [])
      }
      groups.get(message.level)!.push(message)
    })
    
    return groups
  }, [messages])
  
  // 处理消息点击
  const handleMessageClick = useCallback((message: Message) => {
    onMessageClick?.(message)
  }, [onMessageClick])
  
  return (
    <Card className={cn('relative', className)}>
      <ScrollArea 
        ref={scrollAreaRef}
        className="w-full"
        style={{ height: maxHeight }}
      >
        <div ref={scrollContentRef} className="min-h-full">
          {/* 空状态 */}
          {messages.length === 0 && !isLoading && (
            <EmptyState currentLevel={currentLevel} />
          )}
          
          {/* 消息列表 */}
          {messages.length > 0 && (
            <div className="divide-y">
              {messages.map((message, index) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  showTimestamp={showTimestamp}
                  showQualityScore={showQualityScore}
                  showLevelBadge={showLevelBadge}
                  isLatest={index === messages.length - 1}
                  onClick={() => handleMessageClick(message)}
                />
              ))}
            </div>
          )}
          
          {/* 加载状态 */}
          {isLoading && (
            <>
              <MessageSkeleton />
              <MessageSkeleton />
            </>
          )}
        </div>
      </ScrollArea>
      
      {/* 层级指示器 */}
      <div className="absolute top-2 right-2 pointer-events-none">
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs font-medium',
            getLevelColor(currentLevel)
          )}
        >
          当前层级: {LEVEL_CONFIG[currentLevel].name}
        </Badge>
      </div>
    </Card>
  )
}

// 导出默认组件
export default MessageList