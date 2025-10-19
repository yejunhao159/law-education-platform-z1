/**
 * 我的课程页面
 * 展示用户的课程列表和学习进度
 */

import { BookOpen, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CoursesPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            我的课程
          </h1>
          <p className="text-muted-foreground">
            查看和管理您的法学课程学习进度
          </p>
        </div>

        {/* Placeholder Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              课程功能开发中
            </CardTitle>
            <CardDescription>
              即将推出完整的课程管理系统
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <BookOpen className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold mb-1">课程目录</h3>
                <p className="text-sm text-muted-foreground">
                  浏览和选择法学专业课程
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Clock className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-semibold mb-1">学习进度</h3>
                <p className="text-sm text-muted-foreground">
                  追踪每门课程的完成情况
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-semibold mb-1">学习统计</h3>
                <p className="text-sm text-muted-foreground">
                  查看学习时长和成绩分析
                </p>
              </div>
            </div>

            <div className="p-6 bg-muted/50 rounded-lg text-center">
              <p className="text-muted-foreground">
                该功能正在开发中,敬请期待...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
