/**
 * Act5 苏格拉底式对话主组件
 * @description 集成所有子组件，实现完整的苏格拉底式问答系统
 * @author DeepSeek - 2025
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageSquare,
  Users,
  Brain,
  BookOpen,
  ChartBar,
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'

// 导入子组件
import { DialogueContainer } from '../socratic/DialogueContainer'
import { DialoguePanel } from '../socratic/DialoguePanel'
import { MessageInput } from '../socratic/MessageInput'
import { LevelProgress } from '../socratic/LevelProgress'
import { TeacherPanel } from '../socratic/TeacherPanel'
import { VotingPanel } from '../socratic/VotingPanel'
import { ClassroomCode } from '../socratic/ClassroomCode'
import { ExampleSelector } from '../socratic/ExampleSelector'
import { LevelSelector } from '../socratic/LevelSelector'

// 导入类型和常量
import {
  DialogueLevel,
  ControlMode,
  SessionMode,
  LEVEL_CONFIG,
  DIALOGUE_EXAMPLES,
  type ClassroomSession,
  type DialogueMetrics,
  type StudentInfo,
  type VoteData,
  type Message,
  type DialogueSession,
  type AgentResponse
} from '@/lib/types/socratic'

// 导入状态管理
import { useSocraticStore } from '@/lib/stores/useSocraticStore'
import { useEvidenceInteractionStore } from '@/lib/stores/useEvidenceInteractionStore'
import { useCaseStore } from '@/lib/stores/useCaseStore'

// 导入WebSocket钩子
import { useWebSocket } from '@/lib/hooks/useWebSocket'

// 视图模式
export type ViewMode = 'student' | 'teacher' | 'demo'

// 组件属性
export interface Act5SocraticDiscussionProps {
  /** 初始视图模式 */
  initialMode?: ViewMode
  /** 初始会话模式 */
  sessionMode?: SessionMode
  /** 是否自动开始 */
  autoStart?: boolean
  /** 自定义样式 */
  className?: string
}

/**
 * Act5 苏格拉底式对话主组件
 */
export const Act5SocraticDiscussion: React.FC<Act5SocraticDiscussionProps> = ({
  initialMode = 'demo',
  sessionMode = SessionMode.DEMO,
  autoStart = false,
  className
}) => {
  // 状态管理
  const {
    currentSession: session,
    messages,
    currentLevel,
    isLoading,
    errorMessage: error,
    createSession,
    sendMessage,
    setCurrentLevel: updateLevel,
    resetStore: resetSession,
    endSession,
    setCase,
    currentCase
  } = useSocraticStore()

  // 获取上传的案例数据
  const { caseData } = useCaseStore()

  const {
    addFeedback,
    addPoints
  } = useEvidenceInteractionStore()

  // 本地状态
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode)
  const [classroomSession, setClassroomSession] = useState<ClassroomSession | null>(null)
  const [currentVote, setCurrentVote] = useState<VoteData | null>(null)
  const [metrics, setMetrics] = useState<DialogueMetrics | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // WebSocket连接（仅在课堂模式下使用）
  const {
    isConnected: wsConnected,
    error: wsError,
    sendMessage: wsSendMessage,
    subscribe,
    unsubscribe
  } = useWebSocket(
    sessionMode === SessionMode.CLASSROOM ? 'wss://api.example.com/socratic' : null,
    {
      reconnect: true,
      maxRetries: 5
    }
  )

  // 初始化会话处理函数
  const initSession = useCallback(async (options: any) => {
    const result = await createSession({
      sessionMode: sessionMode
    })
    if (result.success) {
      updateLevel(DialogueLevel.OBSERVATION)
    } else {
      setConnectionError(result.error || '创建会话失败')
    }
  }, [sessionMode, createSession, updateLevel])

  // 初始化会话
  useEffect(() => {
    if (autoStart && !session) {
      initSession({
        mode: sessionMode,
        controlMode: ControlMode.AUTO,
        level: DialogueLevel.OBSERVATION
      })
    }
  }, [autoStart, session, sessionMode])

  // 设置案例数据
  useEffect(() => {
    if (caseData && !currentCase) {
      setCase({
        id: caseData.id || 'case-' + Date.now(),
        title: caseData.title,
        description: caseData.summary || caseData.facts?.join('\n') || '',
        facts: caseData.facts || [],
        evidence: caseData.evidence || [],
        legalIssues: caseData.disputes || [],
        difficulty: 'medium',
        category: '民事案件',
        sourceText: caseData.fullText || ''
      })
    }
  }, [caseData, currentCase, setCase])

  // WebSocket事件处理
  useEffect(() => {
    if (sessionMode !== SessionMode.CLASSROOM) return

    const handlers = {
      'student:joined': (data: any) => {
        console.log('学生加入:', data)
        // 更新学生列表
      },
      'vote:created': (data: VoteData) => {
        setCurrentVote(data)
      },
      'vote:updated': (data: VoteData) => {
        setCurrentVote(data)
      },
      'message:received': (data: Message) => {
        // 处理接收到的消息
      }
    }

    // 订阅事件
    Object.entries(handlers).forEach(([event, handler]) => {
      subscribe(event, handler)
    })

    // 清理
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        unsubscribe(event, handler)
      })
    }
  }, [sessionMode, subscribe, unsubscribe])

  // 更新连接状态
  useEffect(() => {
    if (sessionMode === SessionMode.CLASSROOM) {
      setIsConnected(wsConnected)
      setConnectionError(wsError)
    } else {
      setIsConnected(true)
      setConnectionError(null)
    }
  }, [sessionMode, wsConnected, wsError])

  // 计算当前进度
  const progress = useMemo(() => {
    if (!session) return 0
    const levels = Object.values(DialogueLevel).filter(v => typeof v === 'number')
    const currentIndex = levels.indexOf(currentLevel)
    return ((currentIndex + 1) / levels.length) * 100
  }, [session, currentLevel])

  // 处理消息发送
  const handleSendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!session) return

    try {
      // 发送消息到store
      await sendMessage(content, attachments)

      // 如果是课堂模式，通过WebSocket广播
      if (sessionMode === SessionMode.CLASSROOM && wsSendMessage) {
        wsSendMessage({
          type: 'message:send',
          data: { content, attachments }
        })
      }

      // 添加反馈
      addFeedback({
        type: 'success',
        message: '消息已发送',
        score: 5
      })
    } catch (error) {
      console.error('发送消息失败:', error)
      addFeedback({
        type: 'error',
        message: '发送失败，请重试'
      })
    }
  }, [session, sendMessage, sessionMode, wsSendMessage, addFeedback])

  // 处理层级切换
  const handleLevelChange = useCallback((level: DialogueLevel) => {
    updateLevel(level)
    addFeedback({
      type: 'info',
      message: `切换到${LEVEL_CONFIG[level].name}层级`
    })
  }, [updateLevel, addFeedback])

  // 处理投票创建
  const handleCreateVote = useCallback((question: string, choices: string[]) => {
    const voteData: VoteData = {
      id: `vote-${Date.now()}`,
      question,
      choices: choices.map((text, index) => ({
        id: `choice-${index}`,
        text,
        count: 0
      })),
      votedStudents: new Set(),
      createdAt: Date.now(),
      endsAt: Date.now() + 300000, // 5分钟
      isEnded: false
    }

    setCurrentVote(voteData)

    // 广播投票
    if (sessionMode === SessionMode.CLASSROOM && wsSendMessage) {
      wsSendMessage({
        type: 'vote:create',
        data: voteData
      })
    }
  }, [sessionMode, wsSendMessage])

  // 处理投票
  const handleVote = useCallback((voteId: string, choiceIds: string[]) => {
    if (!currentVote || currentVote.id !== voteId) return

    // 更新投票数据
    const updatedVote = { ...currentVote }
    choiceIds.forEach(choiceId => {
      const choice = updatedVote.choices.find(c => c.id === choiceId)
      if (choice) {
        choice.count++
      }
    })
    updatedVote.votedStudents.add('current-user') // 实际应使用真实用户ID

    setCurrentVote(updatedVote)

    // 广播投票更新
    if (sessionMode === SessionMode.CLASSROOM && wsSendMessage) {
      wsSendMessage({
        type: 'vote:submit',
        data: { voteId, choiceIds }
      })
    }

    addPoints(10)
    addFeedback({
      type: 'success',
      message: '投票成功！+10分'
    })
  }, [currentVote, sessionMode, wsSendMessage, addPoints, addFeedback])

  // 生成课堂码
  const handleGenerateCode = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const newSession: ClassroomSession = {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 21600000, // 6小时
      status: 'waiting',
      students: new Map(),
      teacherId: 'current-teacher'
    }
    setClassroomSession(newSession)

    // 通知服务器创建课堂
    if (wsSendMessage) {
      wsSendMessage({
        type: 'classroom:create',
        data: newSession
      })
    }
  }, [wsSendMessage])

  // 加入课堂
  const handleJoinClassroom = useCallback(async (code: string) => {
    // 验证并加入课堂
    if (wsSendMessage) {
      wsSendMessage({
        type: 'classroom:join',
        data: { code }
      })
    }

    addFeedback({
      type: 'success',
      message: '成功加入课堂！'
    })
  }, [wsSendMessage, addFeedback])

  // 渲染连接状态
  const renderConnectionStatus = () => {
    if (sessionMode !== SessionMode.CLASSROOM) return null

    return (
      <div className="flex items-center gap-2 text-sm">
        {isConnected ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-green-600">已连接</span>
          </>
        ) : connectionError ? (
          <>
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-600">连接失败</span>
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
            <span className="text-yellow-600">连接中...</span>
          </>
        )}
      </div>
    )
  }

  // 渲染主界面
  const renderMainInterface = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：对话区域 */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                苏格拉底式对话
              </CardTitle>
              {renderConnectionStatus()}
            </div>
            <CardDescription>
              通过层层递进的问答，深入理解法律概念
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 层级进度 */}
            <LevelProgress
              currentLevel={currentLevel}
              completedLevels={session?.completedLevels || []}
              onLevelClick={handleLevelChange}
              className="mb-4"
            />

            {/* 对话面板 */}
            <DialoguePanel
              participantCount={session?.participants?.length || 0}
              messageCount={messages.length}
              status={session ? 'active' : 'ended'}
              className="mb-4"
            />

            {/* 消息输入 */}
            <MessageInput
              onSend={handleSendMessage}
              disabled={!session || isLoading}
              placeholder="输入你的回答或问题..."
              showVoiceInput={false}
              showAttachment={true}
            />
          </CardContent>
        </Card>

        {/* 投票面板 */}
        {(viewMode === 'teacher' || currentVote) && (
          <VotingPanel
            currentVote={currentVote}
            students={classroomSession?.students}
            isTeacher={viewMode === 'teacher'}
            onCreateVote={handleCreateVote}
            onVote={handleVote}
            onCloseVote={(id) => setCurrentVote(null)}
          />
        )}
      </div>

      {/* 右侧：控制面板 */}
      <div className="space-y-4">
        {/* 视图切换 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">视图模式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={viewMode === 'student' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('student')}
              >
                学生
              </Button>
              <Button
                variant={viewMode === 'teacher' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('teacher')}
              >
                教师
              </Button>
              <Button
                variant={viewMode === 'demo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('demo')}
              >
                演示
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 课堂码 */}
        {sessionMode === SessionMode.CLASSROOM && (
          <ClassroomCode
            session={classroomSession}
            isTeacher={viewMode === 'teacher'}
            onGenerateCode={handleGenerateCode}
            onJoinClassroom={handleJoinClassroom}
          />
        )}

        {/* 教师控制面板 */}
        {viewMode === 'teacher' && (
          <TeacherPanel
            data-testid="teacher-panel"
            session={classroomSession}
            metrics={metrics}
            isTeacher={true}
            onModeChange={(mode) => console.log('Mode changed:', mode)}
            onLevelChange={handleLevelChange}
            onStartSession={() => initSession({
              mode: sessionMode,
              controlMode: ControlMode.AUTO,
              level: DialogueLevel.OBSERVATION
            })}
            onEndSession={endSession}
            onResetSession={resetSession}
            onStartVote={handleCreateVote}
            config={{
              allowModeSwitch: true,
              allowLevelSwitch: true,
              showStatistics: true,
              showVoting: true
            }}
          />
        )}

        {/* 示例选择器 */}
        {viewMode === 'demo' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">示例场景</CardTitle>
            </CardHeader>
            <CardContent>
              <ExampleSelector
                examples={Object.entries(DIALOGUE_EXAMPLES).map(([id, data]) => ({
                  id,
                  title: data.title,
                  description: data.description,
                  difficulty: data.difficulty,
                  category: '法学案例',
                  estimatedTime: data.estimatedTime
                }))}
                onExampleSelect={(example) => {
                  // 加载示例
                  console.log('Selected example:', example)
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* 统计信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ChartBar className="h-4 w-4" />
              对话统计
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">消息数</span>
              <span className="font-medium">{messages.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">当前层级</span>
              <Badge variant="outline">
                {LEVEL_CONFIG[currentLevel].name}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">完成度</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            {classroomSession && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">在线学生</span>
                <span className="font-medium">{classroomSession.students.size}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // 渲染错误提示
  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-4"
            onClick={resetSession}
          >
            重试
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Act 5: 苏格拉底式法律对话
          </h2>
          <p className="text-muted-foreground mt-1">
            通过引导式问答深入理解法律原理
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={resetSession}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重置
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={endSession}
              >
                <Pause className="h-4 w-4 mr-2" />
                结束
              </Button>
            </>
          ) : (
            <Button
              onClick={() => initSession({
                mode: sessionMode,
                controlMode: ControlMode.AUTO,
                level: DialogueLevel.OBSERVATION
              })}
            >
              <Play className="h-4 w-4 mr-2" />
              开始对话
            </Button>
          )}
        </div>
      </div>

      {/* 主界面 */}
      {renderMainInterface()}
    </div>
  )
}

export default Act5SocraticDiscussion