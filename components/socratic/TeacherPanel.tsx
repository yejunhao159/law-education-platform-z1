/**
 * 教师控制面板组件
 * @description 苏格拉底式问答的教师控制界面，提供课堂管理功能
 * @author 墨匠 - 2025-09-08
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Alert, AlertDescription } from '../ui/alert'
import { 
  ControlMode,
  DialogueLevel,
  LEVEL_CONFIG,
  type ClassroomSession,
  type DialogueMetrics,
  type StudentInfo as Student
} from '../../lib/types/socratic'
import { 
  Users,
  Play,
  Pause,
  RotateCcw,
  Settings,
  ChartBar,
  MessageSquare,
  Brain,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  HandMetal,
  Vote,
  TrendingUp,
  Clock,
  Award,
  BarChart3
} from 'lucide-react'

// 教师面板配置
export interface TeacherPanelConfig {
  allowModeSwitch?: boolean
  allowIntervention?: boolean
  allowVoting?: boolean
  allowStatistics?: boolean
  showStudentList?: boolean
  showMetrics?: boolean
}

// 教师面板属性
export interface TeacherPanelProps {
  session: ClassroomSession | null
  metrics?: DialogueMetrics
  config?: TeacherPanelConfig
  isTeacher?: boolean
  onModeChange?: (mode: ControlMode) => void
  onLevelChange?: (level: DialogueLevel) => void
  onStartSession?: () => void
  onEndSession?: () => void
  onResetSession?: () => void
  onStartVote?: (question: string, options: string[]) => void
  onIntervene?: (message: string) => void
  onMuteStudent?: (studentId: string) => void
  onKickStudent?: (studentId: string) => void
  className?: string
}

// 学生状态
interface StudentStatus {
  id: string
  name: string
  isActive: boolean
  isMuted: boolean
  hasRaisedHand: boolean
  messageCount: number
  lastActiveAt: number
}

// 投票配置
interface VoteConfig {
  question: string
  options: string[]
  duration: number
}

/**
 * 教师控制面板组件
 */
export const TeacherPanel: React.FC<TeacherPanelProps> = ({
  session,
  metrics,
  config = {
    allowModeSwitch: true,
    allowIntervention: true,
    allowVoting: true,
    allowStatistics: true,
    showStudentList: true,
    showMetrics: true
  },
  isTeacher = true,
  onModeChange,
  onLevelChange,
  onStartSession,
  onEndSession,
  onResetSession,
  onStartVote,
  onIntervene,
  onMuteStudent,
  onKickStudent,
  className
}) => {
  const [selectedTab, setSelectedTab] = useState('control')
  const [interventionMessage, setInterventionMessage] = useState('')
  const [voteConfig, setVoteConfig] = useState<VoteConfig>({
    question: '',
    options: ['', ''],
    duration: 60
  })
  const [showStudentDetails, setShowStudentDetails] = useState(true)
  
  // 模拟学生数据（实际应从session中获取）
  const students = useMemo<StudentStatus[]>(() => {
    if (!session?.students) return []
    
    return Array.from(session.students.values()).map(s => ({
      id: s.id,
      name: s.displayName,
      isActive: s.isOnline && Date.now() - s.lastActiveAt < 60000,
      isMuted: false,
      hasRaisedHand: s.handRaised || false,
      messageCount: Math.floor(Math.random() * 20),
      lastActiveAt: s.lastActiveAt
    }))
  }, [session])
  
  // 活跃学生数
  const activeStudentCount = useMemo(() => {
    return students.filter(s => s.isActive).length
  }, [students])
  
  // 举手学生数
  const raisedHandCount = useMemo(() => {
    return students.filter(s => s.hasRaisedHand).length
  }, [students])
  
  // 处理模式切换
  const handleModeChange = useCallback((mode: string) => {
    onModeChange?.(mode as ControlMode)
  }, [onModeChange])
  
  // 处理层级切换
  const handleLevelChange = useCallback((level: string) => {
    onLevelChange?.(parseInt(level) as DialogueLevel)
  }, [onLevelChange])
  
  // 处理介入
  const handleIntervene = useCallback(() => {
    if (interventionMessage.trim()) {
      onIntervene?.(interventionMessage)
      setInterventionMessage('')
    }
  }, [interventionMessage, onIntervene])
  
  // 处理发起投票
  const handleStartVote = useCallback(() => {
    const validOptions = voteConfig.options.filter(o => o.trim())
    if (voteConfig.question.trim() && validOptions.length >= 2) {
      onStartVote?.(voteConfig.question, validOptions)
      setVoteConfig({
        question: '',
        options: ['', ''],
        duration: 60
      })
    }
  }, [voteConfig, onStartVote])
  
  // 添加投票选项
  const addVoteOption = useCallback(() => {
    setVoteConfig(prev => ({
      ...prev,
      options: [...prev.options, '']
    }))
  }, [])
  
  // 更新投票选项
  const updateVoteOption = useCallback((index: number, value: string) => {
    setVoteConfig(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }))
  }, [])
  
  // 删除投票选项
  const removeVoteOption = useCallback((index: number) => {
    setVoteConfig(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }, [])
  
  if (!isTeacher) {
    return (
      <Card className={cn('p-4', className)}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            只有教师可以访问控制面板
          </AlertDescription>
        </Alert>
      </Card>
    )
  }
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            教师控制面板
          </span>
          {session && (
            <Badge variant="outline">
              课堂码: {session.code}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 会话状态 */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <Badge variant={session ? 'default' : 'secondary'}>
              {session ? '进行中' : '未开始'}
            </Badge>
            
            {session && (
              <>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{activeStudentCount}/{students.length}</span>
                </div>
                
                {raisedHandCount > 0 && (
                  <div className="flex items-center gap-1">
                    <HandMetal className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">{raisedHandCount}</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            {!session ? (
              <Button size="sm" onClick={onStartSession}>
                <Play className="h-4 w-4 mr-1" />
                开始课堂
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={onResetSession}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  重置
                </Button>
                <Button size="sm" variant="destructive" onClick={onEndSession}>
                  <Pause className="h-4 w-4 mr-1" />
                  结束
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* 功能标签页 */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="control">控制</TabsTrigger>
            <TabsTrigger value="students">学生</TabsTrigger>
            <TabsTrigger value="vote">投票</TabsTrigger>
            <TabsTrigger value="stats">统计</TabsTrigger>
          </TabsList>
          
          {/* 控制面板 */}
          <TabsContent value="control" className="space-y-4">
            {config.allowModeSwitch && (
              <div className="space-y-2">
                <Label>对话模式</Label>
                <Select 
                  value={ControlMode.AUTO}
                  onValueChange={handleModeChange}
                  disabled={!session}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ControlMode.AUTO}>
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        全自动
                      </div>
                    </SelectItem>
                    <SelectItem value={ControlMode.SEMI_AUTO}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        半自动
                      </div>
                    </SelectItem>
                    <SelectItem value={ControlMode.MANUAL}>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        手动控制
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>当前层级</Label>
              <Select 
                value={DialogueLevel.OBSERVATION.toString()}
                onValueChange={handleLevelChange}
                disabled={!session}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
                    <SelectItem key={level} value={level}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          L{level}
                        </Badge>
                        {config.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {config.allowIntervention && (
              <div className="space-y-2">
                <Label>教师介入</Label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={interventionMessage}
                    onChange={(e) => setInterventionMessage(e.target.value)}
                    placeholder="输入介入消息..."
                    className="flex-1 px-3 py-1 text-sm border rounded-md"
                    disabled={!session}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleIntervene}
                    disabled={!session || !interventionMessage.trim()}
                  >
                    发送
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* 学生列表 */}
          <TabsContent value="students" className="space-y-4">
            {config.showStudentList && (
              <>
                <div className="flex items-center justify-between">
                  <Label>学生列表 ({students.length})</Label>
                  <Switch
                    checked={showStudentDetails}
                    onCheckedChange={setShowStudentDetails}
                  />
                </div>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {students.map(student => (
                    <div 
                      key={student.id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'h-2 w-2 rounded-full',
                          student.isActive ? 'bg-green-500' : 'bg-gray-400'
                        )} />
                        <span className="text-sm font-medium">{student.name}</span>
                        {student.hasRaisedHand && (
                          <HandMetal className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      
                      {showStudentDetails && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {student.messageCount}条
                          </Badge>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => onMuteStudent?.(student.id)}
                          >
                            {student.isMuted ? (
                              <VolumeX className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500"
                            onClick={() => onKickStudent?.(student.id)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
          
          {/* 投票功能 */}
          <TabsContent value="vote" className="space-y-4">
            {config.allowVoting && (
              <>
                <div className="space-y-2">
                  <Label>投票问题</Label>
                  <input
                    type="text"
                    value={voteConfig.question}
                    onChange={(e) => setVoteConfig(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="输入投票问题..."
                    className="w-full px-3 py-1 text-sm border rounded-md"
                    disabled={!session}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>选项</Label>
                  {voteConfig.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateVoteOption(index, e.target.value)}
                        placeholder={`选项 ${index + 1}`}
                        className="flex-1 px-3 py-1 text-sm border rounded-md"
                        disabled={!session}
                      />
                      {voteConfig.options.length > 2 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeVoteOption(index)}
                          disabled={!session}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {voteConfig.options.length < 5 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addVoteOption}
                      disabled={!session}
                    >
                      添加选项
                    </Button>
                  )}
                </div>
                
                <Button 
                  className="w-full"
                  onClick={handleStartVote}
                  disabled={
                    !session || 
                    !voteConfig.question.trim() || 
                    voteConfig.options.filter(o => o.trim()).length < 2
                  }
                >
                  <Vote className="h-4 w-4 mr-2" />
                  发起投票
                </Button>
              </>
            )}
          </TabsContent>
          
          {/* 统计数据 */}
          <TabsContent value="stats" className="space-y-4">
            {config.showMetrics && metrics && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      平均质量
                    </div>
                    <div className="text-xl font-bold">{metrics.averageQuality}%</div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      总时长
                    </div>
                    <div className="text-xl font-bold">{Math.floor(metrics.totalTime / 60)}分钟</div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      消息数
                    </div>
                    <div className="text-xl font-bold">{metrics.totalMessages}</div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Award className="h-4 w-4" />
                      完成度
                    </div>
                    <div className="text-xl font-bold">{metrics.completionRate}%</div>
                  </div>
                </div>
                
                {/* 层级进度 */}
                <div className="space-y-2">
                  <Label>层级进度</Label>
                  <div className="space-y-1">
                    {Object.entries(metrics.levelProgress).map(([level, progress]) => (
                      <div key={level} className="flex items-center gap-2">
                        <span className="text-xs w-16">{LEVEL_CONFIG[parseInt(level) as DialogueLevel].name}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs w-10 text-right">{progress}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// 导出默认组件
export default TeacherPanel