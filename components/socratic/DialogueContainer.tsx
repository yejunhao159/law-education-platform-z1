/**
 * 对话容器组件
 * @description 管理对话消息的显示和容器布局
 */

'use client'

import React, { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface DialogueContainerProps {
  children: ReactNode
  className?: string
  height?: string
}

export const DialogueContainer: React.FC<DialogueContainerProps> = ({
  children,
  className,
  height = "h-[400px]"
}) => {
  return (
    <div className={cn("border rounded-lg bg-background", className)}>
      <ScrollArea className={height}>
        <div className="p-4 space-y-4">
          {children}
        </div>
      </ScrollArea>
    </div>
  )
}