/**
 * 虚拟课堂管理页面
 * 提供创建课堂、加入课堂的入口
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, LogIn, QrCode, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClassroomPage() {
  const router = useRouter()
  const [classroomCode, setClassroomCode] = useState('')

  // 生成随机课堂代码
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // 创建新课堂
  const handleCreateClassroom = () => {
    const code = generateCode()
    router.push(`/classroom/${code}/teacher`)
  }

  // 加入课堂
  const handleJoinClassroom = () => {
    if (classroomCode.trim()) {
      router.push(`/classroom/${classroomCode}/join`)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            虚拟课堂
          </h1>
          <p className="text-muted-foreground">
            实时互动教学,AI辅助课堂讨论,提升学习效果
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 创建课堂 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <CardTitle>创建课堂</CardTitle>
              <CardDescription>
                开启新的互动教学课堂,生成课堂代码供学生加入
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCreateClassroom} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                立即创建
              </Button>
            </CardContent>
          </Card>

          {/* 加入课堂 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
                <LogIn className="w-6 h-6 text-white" />
              </div>
              <CardTitle>加入课堂</CardTitle>
              <CardDescription>
                输入课堂代码参与实时互动教学
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">课堂代码</Label>
                <Input
                  id="code"
                  placeholder="输入6位课堂代码"
                  value={classroomCode}
                  onChange={(e) => setClassroomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase"
                />
              </div>
              <Button
                onClick={handleJoinClassroom}
                disabled={classroomCode.length !== 6}
                className="w-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                加入课堂
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 功能介绍 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              虚拟课堂功能
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <QrCode className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold mb-1">二维码加入</h3>
                <p className="text-xs text-muted-foreground">
                  生成二维码,学生扫码快速加入课堂
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <BookOpen className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-semibold mb-1">苏格拉底式教学</h3>
                <p className="text-xs text-muted-foreground">
                  AI辅助提问,引导式深度思辨
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Users className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-semibold mb-1">实时互动</h3>
                <p className="text-xs text-muted-foreground">
                  投票问答、文本讨论、实时反馈
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">教学模式</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>投票问答:</strong> 发布选择题,实时查看学生投票结果和统计</li>
                <li><strong>文本讨论:</strong> 开放式问题讨论,收集学生观点和想法</li>
                <li><strong>AI辅助:</strong> 基于判决书案例的智能提问建议</li>
                <li><strong>学习追踪:</strong> 记录课堂互动数据,生成学习报告</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
