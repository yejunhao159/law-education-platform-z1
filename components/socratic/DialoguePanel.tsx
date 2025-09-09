/**
 * 对话面板组件
 * @description 显示对话面板和控制界面
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialoguePanelProps {
  className?: string
  participantCount?: number
  messageCount?: number
  status?: 'active' | 'paused' | 'ended'
  onStatusChange?: (status: 'active' | 'paused' | 'ended') => void
}

export const DialoguePanel: React.FC<DialoguePanelProps> = ({
  className,
  participantCount = 0,
  messageCount = 0,
  status = 'active'
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'ended':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return '进行中'
      case 'paused':
        return '已暂停'
      case 'ended':
        return '已结束'
      default:
        return '未知'
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>对话面板</span>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>{participantCount} 人参与</span>
          </div>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>{messageCount} 条消息</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}