/**
 * 层级进度组件
 * @description 展示苏格拉底式问答的层级进度和转换
 * @author 墨匠 - 2025-09-08
 */

'use client'

import React, { useMemo, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { 
  DialogueLevel, 
  LEVEL_CONFIG,
  type DialogueMetrics
} from '../../lib/types/socratic'
import { 
  ChevronRight, 
  CheckCircle2,
  Circle,
  Lock,
  Trophy,
  TrendingUp,
  AlertCircle,
  Clock,
  Target,
  Sparkles,
  Brain
} from 'lucide-react'

// 层级状态
export enum LevelStatus {
  LOCKED = 'locked',
  AVAILABLE = 'available',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

// 层级进度数据
export interface LevelProgressData {
  level: DialogueLevel
  status: LevelStatus
  score: number
  timeSpent: number
  messageCount: number
  qualityScore: number
  keyInsights: string[]
  completedAt?: number
}

// 组件属性
export interface LevelProgressProps {
  currentLevel: DialogueLevel
  progressData: LevelProgressData[]
  metrics?: DialogueMetrics
  onLevelChange?: (level: DialogueLevel) => void
  onViewDetails?: (level: DialogueLevel) => void
  allowSkip?: boolean
  showMetrics?: boolean
  showInsights?: boolean
  className?: string
  variant?: 'linear' | 'circular' | 'compact'
}

// 获取层级图标
const getLevelIcon = (level: DialogueLevel, status: LevelStatus) => {
  if (status === LevelStatus.LOCKED) {
    return <Lock className="h-4 w-4" />
  }
  
  if (status === LevelStatus.COMPLETED) {
    return <CheckCircle2 className="h-4 w-4" />
  }
  
  if (status === LevelStatus.IN_PROGRESS) {
    return <Circle className="h-4 w-4 animate-pulse" />
  }
  
  // 根据层级返回特定图标
  switch (level) {
    case DialogueLevel.OBSERVATION:
      return <Target className="h-4 w-4" />
    case DialogueLevel.FACTS:
      return <Brain className="h-4 w-4" />
    case DialogueLevel.ANALYSIS:
      return <TrendingUp className="h-4 w-4" />
    case DialogueLevel.APPLICATION:
      return <Sparkles className="h-4 w-4" />
    case DialogueLevel.VALUES:
      return <Trophy className="h-4 w-4" />
    default:
      return <Circle className="h-4 w-4" />
  }
}

// 获取层级颜色
const getLevelColor = (level: DialogueLevel, status: LevelStatus) => {
  if (status === LevelStatus.LOCKED) {
    return 'text-muted-foreground bg-muted'
  }
  
  if (status === LevelStatus.COMPLETED) {
    return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
  }
  
  switch (level) {
    case DialogueLevel.OBSERVATION:
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900'
    case DialogueLevel.FACTS:
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
    case DialogueLevel.ANALYSIS:
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900'
    case DialogueLevel.APPLICATION:
      return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900'
    case DialogueLevel.VALUES:
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900'
  }
}

// 格式化时间
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}分${remainingSeconds}秒`
      : `${minutes}分钟`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  return remainingMinutes > 0
    ? `${hours}小时${remainingMinutes}分`
    : `${hours}小时`
}

// 线性进度组件
const LinearProgress: React.FC<LevelProgressProps> = ({
  currentLevel,
  progressData,
  metrics,
  onLevelChange,
  onViewDetails,
  allowSkip = false,
  showMetrics = true,
  showInsights = false,
  className
}) => {
  const overallProgress = useMemo(() => {
    if (!progressData || progressData.length === 0) return 0
    const completed = progressData.filter(p => p.status === LevelStatus.COMPLETED).length
    return (completed / progressData.length) * 100
  }, [progressData])
  
  return (
    <Card className={cn('p-6 space-y-4', className)}>
      {/* 总体进度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">对话进度</h3>
          <span className="text-sm text-muted-foreground">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>
      
      {/* 层级列表 */}
      <div className="space-y-3">
        {progressData && progressData.map((data, index) => {
          const config = LEVEL_CONFIG[data.level]
          const isActive = data.level === currentLevel
          const canNavigate = data.status !== LevelStatus.LOCKED && onLevelChange
          
          return (
            <div
              key={data.level}
              className={cn(
                'group relative flex items-start gap-3 p-3 rounded-lg transition-colors',
                isActive && 'bg-accent',
                canNavigate && 'cursor-pointer hover:bg-accent/50',
                data.status === LevelStatus.LOCKED && 'opacity-50'
              )}
              onClick={() => canNavigate && onLevelChange(data.level)}
            >
              {/* 连接线 */}
              {progressData && index < progressData.length - 1 && (
                <div className="absolute left-6 top-10 w-0.5 h-full bg-border" />
              )}
              
              {/* 图标 */}
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                getLevelColor(data.level, data.status)
              )}>
                {getLevelIcon(data.level, data.status)}
              </div>
              
              {/* 内容 */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{config.name}</span>
                  {isActive && (
                    <Badge variant="secondary" className="text-xs">
                      当前
                    </Badge>
                  )}
                  {data.status === LevelStatus.COMPLETED && (
                    <Badge variant="success" className="text-xs">
                      已完成
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {config.objective}
                </p>
                
                {/* 指标 */}
                {showMetrics && data.status !== LevelStatus.LOCKED && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {data.score > 0 && (
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs">{data.score}分</span>
                      </div>
                    )}
                    
                    {data.timeSpent > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span className="text-xs">{formatTime(data.timeSpent)}</span>
                      </div>
                    )}
                    
                    {data.messageCount > 0 && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs">{data.messageCount}条消息</span>
                      </div>
                    )}
                    
                    {data.qualityScore > 0 && (
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        <span className="text-xs">质量: {data.qualityScore}%</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 关键洞察 */}
                {showInsights && data.keyInsights.length > 0 && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                    {data.keyInsights.slice(0, 2).map((insight, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 操作按钮 */}
                {onViewDetails && data.status !== LevelStatus.LOCKED && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs mt-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewDetails(data.level)
                    }}
                  >
                    查看详情
                  </Button>
                )}
              </div>
              
              {/* 跳过按钮 */}
              {allowSkip && data.status === LevelStatus.IN_PROGRESS && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    const nextLevel = progressData[index + 1]
                    if (nextLevel && onLevelChange) {
                      onLevelChange(nextLevel.level)
                    }
                  }}
                >
                  跳过
                </Button>
              )}
            </div>
          )
        })}
      </div>
      
      {/* 总体指标 */}
      {showMetrics && metrics && (
        <div className="pt-3 border-t space-y-2">
          <h4 className="text-sm font-medium">总体表现</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">平均质量</span>
              <div className="flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {metrics.averageQuality}%
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">总时长</span>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {formatTime(metrics.totalTime)}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">消息数</span>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {metrics.totalMessages}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">完成度</span>
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">
                  {metrics.completionRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// 紧凑进度组件
const CompactProgress: React.FC<LevelProgressProps> = ({
  currentLevel,
  progressData,
  onLevelChange,
  className
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {progressData && progressData.map((data, index) => {
        const config = LEVEL_CONFIG[data.level]
        const isActive = data.level === currentLevel
        const canNavigate = data.status !== LevelStatus.LOCKED && onLevelChange
        
        return (
          <React.Fragment key={data.level}>
            <button
              className={cn(
                'group relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                'hover:bg-accent/50',
                isActive && 'bg-accent',
                data.status === LevelStatus.LOCKED && 'opacity-50 cursor-not-allowed',
                canNavigate && 'cursor-pointer'
              )}
              onClick={() => canNavigate && onLevelChange(data.level)}
              disabled={data.status === LevelStatus.LOCKED}
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                getLevelColor(data.level, data.status),
                isActive && 'ring-2 ring-primary ring-offset-2'
              )}>
                {getLevelIcon(data.level, data.status)}
              </div>
              
              <span className="text-xs font-medium">
                {config.name}
              </span>
              
              {data.status === LevelStatus.COMPLETED && (
                <div className="absolute -top-1 -right-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500 lucide-check-circle-2" />
                </div>
              )}
            </button>
            
            {index < progressData.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/**
 * 层级进度组件
 */
export const LevelProgress: React.FC<LevelProgressProps> = (props) => {
  const { variant = 'linear' } = props
  
  switch (variant) {
    case 'compact':
      return <CompactProgress {...props} />
    case 'linear':
    default:
      return <LinearProgress {...props} />
  }
}

// 导出默认组件
export default LevelProgress