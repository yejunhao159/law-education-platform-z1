/**
 * 课堂码组件
 * @description 显示和管理课堂加入码，支持二维码生成和分享
 * @author DeepSeek - 2025
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { Separator } from '../ui/separator'
import { 
  Copy,
  QrCode,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Share2,
  Link,
  Timer,
  UserPlus,
  ArrowRight,
  Loader2
} from 'lucide-react'
import QRCode from 'qrcode'
import type { ClassroomSession } from '../../lib/types/socratic'

// 课堂码状态
export type CodeStatus = 'active' | 'expired' | 'full' | 'loading'

// 组件配置
export interface ClassroomCodeConfig {
  /** 最大学生数 */
  maxStudents?: number
  /** 自动刷新间隔（秒） */
  refreshInterval?: number
  /** 显示二维码 */
  showQRCode?: boolean
  /** 允许分享 */
  allowShare?: boolean
  /** 显示统计信息 */
  showStats?: boolean
}

// 组件属性
export interface ClassroomCodeProps {
  /** 课堂会话 */
  session?: ClassroomSession | null
  /** 是否为教师视图 */
  isTeacher?: boolean
  /** 是否正在加载 */
  isLoading?: boolean
  /** 配置选项 */
  config?: ClassroomCodeConfig
  /** 生成新码回调 */
  onGenerateCode?: () => void
  /** 加入课堂回调 */
  onJoinClassroom?: (code: string) => void
  /** 复制码回调 */
  onCopyCode?: (code: string) => void
  /** 分享回调 */
  onShare?: (code: string) => void
  /** 样式类名 */
  className?: string
}

/**
 * 课堂码组件
 */
export const ClassroomCode: React.FC<ClassroomCodeProps> = ({
  session = null,
  isTeacher = false,
  isLoading = false,
  config = {},
  onGenerateCode,
  onJoinClassroom,
  onCopyCode,
  onShare,
  className
}) => {
  // 默认配置
  const defaultConfig: ClassroomCodeConfig = {
    maxStudents: 50,
    refreshInterval: 300, // 5分钟
    showQRCode: true,
    allowShare: true,
    showStats: true,
    ...config
  }

  // 状态管理
  const [inputCode, setInputCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // 计算课堂码状态
  const codeStatus = useMemo<CodeStatus>(() => {
    if (isLoading) return 'loading'
    if (!session) return 'loading'
    if (session.status === 'ended') return 'expired'
    if (Date.now() > session.expiresAt) return 'expired'
    
    const studentCount = session.students?.size || 0
    if (studentCount >= (defaultConfig.maxStudents || 50)) return 'full'
    
    return 'active'
  }, [session, isLoading, defaultConfig.maxStudents])

  // 计算剩余时间
  const remainingTime = useMemo(() => {
    if (!session) return null
    const remaining = Math.max(0, session.expiresAt - Date.now())
    return Math.floor(remaining / 1000) // 秒
  }, [session])

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}小时${mins}分钟`
    }
    return `${mins}分${secs}秒`
  }

  // 倒计时更新
  useEffect(() => {
    if (!session || codeStatus === 'expired') return
    
    const timer = setInterval(() => {
      // 触发重新渲染以更新时间
      setInputCode(prev => prev)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [session, codeStatus])

  // 复制课堂码
  const handleCopyCode = useCallback(async () => {
    if (!session?.code) return
    
    try {
      await navigator.clipboard.writeText(session.code)
      setCopied(true)
      onCopyCode?.(session.code)
      
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }, [session, onCopyCode])

  // 分享课堂码
  const handleShare = useCallback(() => {
    if (!session?.code) return
    
    if (navigator.share) {
      navigator.share({
        title: '课堂邀请码',
        text: `加入课堂，输入邀请码：${session.code}`,
        url: window.location.href
      }).catch(console.error)
    }
    
    onShare?.(session.code)
  }, [session, onShare])

  // 加入课堂
  const handleJoinClassroom = useCallback(async () => {
    if (!inputCode || inputCode.length !== 6) {
      setJoinError('请输入6位课堂码')
      return
    }
    
    setIsJoining(true)
    setJoinError(null)
    
    try {
      await onJoinClassroom?.(inputCode.toUpperCase())
      setInputCode('')
    } catch (error: any) {
      setJoinError(error.message || '加入失败，请检查课堂码')
    } finally {
      setIsJoining(false)
    }
  }, [inputCode, onJoinClassroom])

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length <= 6) {
      setInputCode(value)
      setJoinError(null)
    }
  }

  // 生成二维码数据
  const [qrCodeDataURL, setQRCodeDataURL] = useState<string>('')

  useEffect(() => {
    if (session?.code && codeStatus === 'active') {
      const generateQRCode = async () => {
        try {
          // 智能生成二维码URL：优先使用环境变量，其次替换localhost为局域网IP
          let baseUrl = window.location.origin

          // 如果是localhost，尝试获取真实的访问地址
          if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
            // 优先使用环境变量配置的公网地址
            const publicUrl = process.env.NEXT_PUBLIC_BASE_URL
            if (publicUrl) {
              baseUrl = publicUrl
            } else {
              // 如果没有配置，提示用户使用局域网IP访问
              console.warn('⚠️ 检测到localhost访问，手机扫码可能无法使用')
              console.warn('💡 请使用局域网IP访问（如 http://192.168.x.x:3000）或配置 NEXT_PUBLIC_BASE_URL 环境变量')
            }
          }

          // 教师端生成的二维码应该指向学生加入页面，而不是教师页面
          const studentPath = `/classroom/${session.code}/join`
          const qrContent = `${baseUrl}${studentPath}`
          console.log('📱 二维码URL:', qrContent)

          const dataURL = await QRCode.toDataURL(qrContent, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          })
          setQRCodeDataURL(dataURL)
        } catch (error) {
          console.error('生成二维码失败:', error)
          setQRCodeDataURL('')
        }
      }
      generateQRCode()
    } else {
      setQRCodeDataURL('')
    }
  }, [session?.code, codeStatus])

  // 渲染教师视图
  const renderTeacherView = () => {
    if (!session) {
      return (
        <Card className={cn("w-full max-w-md", className)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              课堂邀请码
            </CardTitle>
            <CardDescription>
              生成邀请码让学生加入课堂
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={onGenerateCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> 创建课堂</>
              )}
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              课堂邀请码
            </CardTitle>
            <Badge variant={
              codeStatus === 'active' ? 'default' :
              codeStatus === 'expired' ? 'destructive' :
              codeStatus === 'full' ? 'secondary' : 'outline'
            }>
              {codeStatus === 'active' ? '活跃' :
               codeStatus === 'expired' ? '已过期' :
               codeStatus === 'full' ? '已满' : '加载中'}
            </Badge>
          </div>
          <CardDescription>
            分享此码让学生加入课堂
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 课堂码显示 */}
          <div className="relative">
            <div className="text-center p-6 bg-muted rounded-lg">
              <div className="text-3xl font-mono font-bold tracking-wider" data-testid="classroom-code">
                {session.code}
              </div>
              {remainingTime !== null && codeStatus === 'active' && (
                <div className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Timer className="h-3 w-3" />
                  剩余 {formatTime(remainingTime)}
                </div>
              )}
            </div>
            
            {/* 操作按钮 */}
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCopyCode}
                disabled={codeStatus !== 'active'}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              {defaultConfig.allowShare && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleShare}
                  disabled={codeStatus !== 'active'}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 二维码 */}
          {defaultConfig.showQRCode && codeStatus === 'active' && qrCodeDataURL && (
            <>
              <Separator />
              <div className="flex flex-col items-center space-y-2">
                <img
                  src={qrCodeDataURL}
                  alt="课堂二维码"
                  className="w-48 h-48 border rounded-lg shadow-sm"
                />
                <p className="text-xs text-muted-foreground text-center">
                  扫描二维码快速加入课堂
                </p>
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    💡 <strong>扫码失败？</strong>手机浏览器访问 <span className="font-mono font-semibold">{window.location.host}</span> 并输入课堂码即可
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}

          {/* 统计信息 */}
          {defaultConfig.showStats && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">已加入</div>
                  <div className="text-2xl font-semibold flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {session.students?.size || 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">容量</div>
                  <div className="text-2xl font-semibold">
                    {defaultConfig.maxStudents}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 刷新按钮 */}
          {codeStatus === 'expired' && (
            <Button 
              className="w-full" 
              onClick={onGenerateCode}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              生成新码
            </Button>
          )}

          {/* 链接提示 */}
          <Alert>
            <Link className="h-4 w-4" />
            <AlertDescription>
              学生可访问 {window.location.host} 并输入邀请码加入
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // 渲染学生视图
  const renderStudentView = () => (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          加入课堂
        </CardTitle>
        <CardDescription>
          输入教师提供的6位课堂码
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" data-testid="student-view">
        <div className="space-y-2">
          <Label htmlFor="classroom-code">课堂码</Label>
          <div className="flex gap-2">
            <Input
              id="classroom-code"
              type="text"
              value={inputCode}
              onChange={handleInputChange}
              placeholder="输入6位课堂码"
              className="font-mono text-center text-lg tracking-wider"
              maxLength={6}
              disabled={isJoining}
            />
            <Button
              onClick={handleJoinClassroom}
              disabled={inputCode.length !== 6 || isJoining}
            >
              {isJoining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>加入课堂</>
              )}
            </Button>
          </div>
          
          {/* 输入提示 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{inputCode.length}/6</span>
            {inputCode.length === 6 && (
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                按回车或点击箭头加入
              </span>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {joinError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{joinError}</AlertDescription>
          </Alert>
        )}

        {/* 提示信息 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            课堂码由教师提供，通常显示在屏幕上或通过其他方式分享给你
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )

  // 根据角色渲染不同视图
  return isTeacher ? renderTeacherView() : renderStudentView()
}

export default ClassroomCode