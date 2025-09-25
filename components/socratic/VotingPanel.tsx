/**
 * 投票面板组件
 * @description 苏格拉底式问答的课堂投票功能，支持实时投票和结果展示
 * @author DeepSeek - 2025
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Alert, AlertDescription } from '../ui/alert'
import { ScrollArea } from '../ui/scroll-area'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Vote,
  Users,
  Clock,
  ChartBar,
  PieChartIcon,
  Plus,
  X,
  Check,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Timer,
  Eye,
  EyeOff,
  Wifi,
  WifiOff
} from 'lucide-react'
import {
  type VoteData,
  type VoteChoice,
  type StudentInfo
} from '../../lib/types/socratic'
import { useSSEVoting } from '../../src/hooks/useSSEVoting'
import { SSEConnectionStatus } from '../../src/lib/sse/types'

// 图表颜色
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
]

// 投票状态
export type VoteStatus = 'draft' | 'active' | 'closed'

// 投票类型
export type VoteType = 'single' | 'multiple' | 'ranking'

// 投票配置
export interface VotingConfig {
  /** 允许匿名投票 */
  allowAnonymous?: boolean
  /** 显示实时结果 */
  showRealTimeResults?: boolean
  /** 自动关闭时间（秒） */
  autoCloseAfter?: number
  /** 最少选项数 */
  minChoices?: number
  /** 最多选项数 */
  maxChoices?: number
  /** 允许修改投票 */
  allowChangeVote?: boolean
  /** 显示投票者 */
  showVoters?: boolean
}

// 组件属性
export interface VotingPanelProps {
  /** 课堂ID（用于SSE连接） */
  classroomId: string
  /** 会话ID（用于投票操作） */
  sessionId?: string
  /** 当前用户ID */
  currentUserId?: string
  /** 是否为教师 */
  isTeacher?: boolean
  /** 教师ID（教师权限验证） */
  teacherId?: string
  /** 投票配置 */
  config?: VotingConfig
  /** 样式类名 */
  className?: string
  /** 已弃用的属性（向后兼容） */
  currentVote?: VoteData | null
  students?: Map<string, StudentInfo>
  onCreateVote?: (question: string, choices: string[], type: VoteType, config?: VotingConfig) => void
  onVote?: (voteId: string, choiceIds: string[]) => void
  onCloseVote?: (voteId: string) => void
  onResetVote?: (voteId: string) => void
}

/**
 * 投票面板组件
 */
export const VotingPanel: React.FC<VotingPanelProps> = ({
  classroomId,
  sessionId,
  currentUserId = '',
  isTeacher = false,
  teacherId,
  config = {},
  className,
  // 向后兼容的属性（可选）
  currentVote: legacyCurrentVote = null,
  students: legacyStudents = new Map(),
  onCreateVote: legacyOnCreateVote,
  onVote: legacyOnVote,
  onCloseVote: legacyOnCloseVote,
  onResetVote: legacyOnResetVote
}) => {
  // 默认配置
  const defaultConfig: VotingConfig = {
    allowAnonymous: false,
    showRealTimeResults: true,
    autoCloseAfter: 300, // 5分钟
    minChoices: 1,
    maxChoices: 5, // 支持最多5个选项 (ABCDE)
    allowChangeVote: true,
    showVoters: false,
    ...config
  }

  // SSE连接
  const sseConfig = useMemo(() => ({
    classroomId,
    studentId: isTeacher ? undefined : currentUserId,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000
  }), [classroomId, isTeacher, currentUserId])

  const {
    connectionState,
    voteState,
    classroomState,
    connect,
    disconnect,
    reconnect,
    submitVote: sseSubmitVote,
    onVoteStarted,
    onVoteUpdate,
    onVoteEnded,
    onStudentActivity
  } = useSSEVoting(sseConfig)

  // 状态管理
  const [voteType, setVoteType] = useState<VoteType>('single')
  const [question, setQuestion] = useState('')
  const [choices, setChoices] = useState<string[]>(['', ''])
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set())
  const [showResults, setShowResults] = useState(defaultConfig.showRealTimeResults)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // 使用SSE的投票数据或回退到legacy数据
  const currentVote = voteState.voteId ? {
    id: voteState.voteId,
    question: voteState.question || '',
    choices: voteState.options.map(opt => ({
      id: opt.id,
      text: opt.text,
      count: opt.count,
      percentage: opt.percentage
    })),
    votedStudents: new Set<string>(), // SSE不直接提供此信息
    createdAt: voteState.startedAt || Date.now(),
    endsAt: voteState.endsAt,
    isEnded: !voteState.isActive,
    totalVotes: voteState.totalVotes
  } : legacyCurrentVote

  const students = legacyStudents // 保持向后兼容

  // 自动连接SSE
  useEffect(() => {
    if (classroomId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [classroomId, connect, disconnect])

  // SSE事件监听
  useEffect(() => {
    onVoteStarted((data) => {
      console.log('投票已开始:', data)
      setShowCreateForm(false)
    })

    onVoteUpdate((data) => {
      console.log('投票结果更新:', data)
    })

    onVoteEnded((data) => {
      console.log('投票已结束:', data)
    })

    onStudentActivity((data) => {
      console.log('学生活动:', data)
    })
  }, [onVoteStarted, onVoteUpdate, onVoteEnded, onStudentActivity])

  // 计算剩余时间
  const remainingTime = useMemo(() => {
    if (voteState.endsAt && voteState.isActive) {
      return Math.max(0, Math.floor((voteState.endsAt - Date.now()) / 1000))
    }
    return null
  }, [voteState.endsAt, voteState.isActive])

  // 计算投票统计
  const voteStats = useMemo(() => {
    if (!currentVote) {
      return {
        totalVotes: 0,
        participationRate: 0,
        leadingChoice: null,
        chartData: []
      }
    }

    const totalVotes = currentVote.votedStudents.size
    const totalStudents = students.size
    const participationRate = totalStudents > 0 ? (totalVotes / totalStudents) * 100 : 0

    const sortedChoices = [...currentVote.choices].sort((a, b) => b.count - a.count)
    const leadingChoice = sortedChoices[0] || null

    const chartData = currentVote.choices.map(choice => ({
      name: choice.text,
      value: choice.count,
      percentage: totalVotes > 0 ? (choice.count / totalVotes) * 100 : 0
    }))

    return {
      totalVotes,
      participationRate,
      leadingChoice,
      chartData
    }
  }, [currentVote, students])

  // 检查是否已投票（学生端）
  const hasVoted = useMemo(() => {
    if (isTeacher) return false
    return currentVote?.votedStudents.has(currentUserId) || false
  }, [currentVote, currentUserId, isTeacher])

  // 添加选项
  const handleAddChoice = useCallback(() => {
    if (choices.length < 5) { // ABCDE最多5个选项
      setChoices([...choices, ''])
    }
  }, [choices])

  // 删除选项
  const handleRemoveChoice = useCallback((index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index))
    }
  }, [choices])

  // 更新选项
  const handleUpdateChoice = useCallback((index: number, value: string) => {
    const newChoices = [...choices]
    newChoices[index] = value
    setChoices(newChoices)
  }, [choices])

  // 创建投票
  const handleCreateVote = useCallback(async () => {
    const validChoices = choices.filter(c => c.trim() !== '').slice(0, 5) // 最多5个选项

    if (!question.trim()) {
      alert('请输入投票问题')
      return
    }

    if (validChoices.length < 2) {
      alert('至少需要两个选项')
      return
    }

    if (!sessionId) {
      alert('未找到会话ID，请确保课堂会话已启动')
      return
    }

    try {
      const response = await fetch(`/api/classroom/${classroomId}/vote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          teacherId: teacherId || currentUserId,
          question: question.trim(),
          options: validChoices,
          duration: defaultConfig.autoCloseAfter
        })
      })

      if (response.ok) {
        setShowCreateForm(false)
        setQuestion('')
        setChoices(['', ''])
      } else {
        const error = await response.json()
        alert(`创建投票失败: ${error.error?.message || '未知错误'}`)
      }
    } catch (error) {
      console.error('创建投票错误:', error)
      alert('创建投票失败，请重试')
    }
  }, [question, choices, defaultConfig.autoCloseAfter, sessionId, classroomId, teacherId, currentUserId])

  // 提交投票
  const handleSubmitVote = useCallback(async () => {
    if (!currentVote || selectedChoices.size === 0) return

    if (selectedChoices.size > 1) {
      alert('ABCDE投票只能选择一个选项')
      return
    }

    if (isTeacher) {
      alert('教师无法参与投票')
      return
    }

    const selectedOption = Array.from(selectedChoices)[0]

    try {
      // 优先使用SSE提交投票
      const success = await sseSubmitVote(selectedOption)

      if (success) {
        setSelectedChoices(new Set())
      } else {
        alert('投票提交失败，请重试')
      }
    } catch (error) {
      console.error('提交投票错误:', error)
      alert('投票提交失败，请重试')
    }
  }, [currentVote, selectedChoices, isTeacher, sseSubmitVote])

  // 选择选项
  const handleSelectChoice = useCallback((choiceId: string) => {
    if (hasVoted) return

    // ABCDE投票只支持单选
    setSelectedChoices(new Set([choiceId]))
  }, [hasVoted])

  // 结束投票
  const handleCloseVote = useCallback(async () => {
    if (!currentVote || !sessionId) return

    try {
      const response = await fetch(
        `/api/classroom/${classroomId}/vote?sessionId=${sessionId}&teacherId=${teacherId || currentUserId}`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        const error = await response.json()
        alert(`结束投票失败: ${error.error?.message || '未知错误'}`)
      }
    } catch (error) {
      console.error('结束投票错误:', error)
      alert('结束投票失败，请重试')
    }
  }, [currentVote, sessionId, classroomId, teacherId, currentUserId])

  // 重新投票（重置投票）
  const handleResetVote = useCallback(() => {
    // 清理本地状态，准备创建新投票
    setSelectedChoices(new Set())
    setShowCreateForm(true)
    setQuestion('')
    setChoices(['', ''])
  }, [])

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 渲染创建表单
  const renderCreateForm = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          创建投票
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>投票问题</Label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="输入投票问题..."
            className="min-h-20"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>选项列表</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddChoice}
              disabled={choices.length >= 5}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加选项 ({choices.length}/5)
            </Button>
          </div>
          <div className="space-y-2">
            {choices.map((choice, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={choice}
                  onChange={(e) => handleUpdateChoice(index, e.target.value)}
                  placeholder={`选项 ${index + 1}`}
                />
                {choices.length > 2 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveChoice(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(false)}
          >
            取消
          </Button>
          <Button onClick={handleCreateVote}>
            创建投票
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // 渲染投票表单
  const renderVoteForm = () => {
    if (!currentVote) return null

    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              {currentVote.question}
            </CardTitle>
            {remainingTime !== null && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {formatTime(remainingTime)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {currentVote.choices.map((choice) => (
              <div
                key={choice.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedChoices.has(choice.id)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                )}
                onClick={() => !hasVoted && handleSelectChoice(choice.id)}
              >
                <div className="flex items-center justify-between">
                  <span>{choice.text}</span>
                  {selectedChoices.has(choice.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {!hasVoted && (
            <Button
              className="w-full"
              onClick={handleSubmitVote}
              disabled={selectedChoices.size === 0}
            >
              提交投票
            </Button>
          )}

          {hasVoted && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                您已完成投票
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  // 渲染结果图表
  const renderResults = () => {
    if (!currentVote || !showResults) return null

    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ChartBar className="h-5 w-5" />
              投票结果
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge>
                <Users className="h-3 w-3 mr-1" />
                {voteStats.totalVotes} / {students.size}
              </Badge>
              <Badge variant="outline">
                {voteStats.participationRate.toFixed(0)}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 柱状图 */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={voteStats.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {voteStats.chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 选项详情 */}
          <div className="space-y-2">
            {currentVote.choices.map((choice, index) => (
              <div key={choice.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{choice.text}</span>
                  <span className="text-muted-foreground">
                    {choice.count} 票 ({voteStats.chartData[index]?.percentage.toFixed(0)}%)
                  </span>
                </div>
                <Progress
                  value={voteStats.chartData[index]?.percentage || 0}
                  className="h-2"
                />
              </div>
            ))}
          </div>

          {/* 领先选项 */}
          {voteStats.leadingChoice && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                当前领先: {voteStats.leadingChoice.text} ({voteStats.leadingChoice.count} 票)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  // 渲染控制按钮
  const renderControls = () => {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 连接状态指示器 */}
          <Badge variant="outline" className="flex items-center gap-1">
            {connectionState.status === SSEConnectionStatus.CONNECTED ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                已连接
              </>
            ) : connectionState.status === SSEConnectionStatus.RECONNECTING ? (
              <>
                <RefreshCw className="h-3 w-3 text-yellow-500 animate-spin" />
                重连中
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-red-500" />
                未连接
              </>
            )}
          </Badge>

          {/* 课堂信息 */}
          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            {classroomState.connectedStudents} 在线
          </Badge>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-2">
            {!currentVote && (
              <Button
                onClick={() => setShowCreateForm(true)}
                disabled={connectionState.status !== SSEConnectionStatus.CONNECTED || !sessionId}
              >
                <Plus className="h-4 w-4 mr-2" />
                创建投票
              </Button>
            )}

            {currentVote && !currentVote.isEnded && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResults(!showResults)}
                >
                  {showResults ? (
                    <><EyeOff className="h-4 w-4 mr-1" /> 隐藏结果</>
                  ) : (
                    <><Eye className="h-4 w-4 mr-1" /> 显示结果</>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCloseVote}
                >
                  结束投票
                </Button>
              </>
            )}

            {currentVote?.isEnded && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetVote}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                重新投票
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 控制按钮 */}
      {renderControls()}

      {/* 创建表单 */}
      {showCreateForm && !currentVote && renderCreateForm()}

      {/* 投票表单 */}
      {currentVote && !currentVote.isEnded && renderVoteForm()}

      {/* 结果展示 */}
      {currentVote && renderResults()}

      {/* 空状态 */}
      {!currentVote && !showCreateForm && (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Vote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无投票</h3>
            <p className="text-muted-foreground">
              {isTeacher ? '点击"创建投票"开始新的投票' : '等待教师发起投票'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default VotingPanel