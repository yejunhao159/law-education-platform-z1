/**
 * 我的课件页面
 * 展示历史学习的教学会话记录
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FolderOpen, FileText, Calendar, Trash2, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { TeachingSessionListItem } from '@/src/domains/teaching-acts/repositories/TeachingSessionRepository'
import { toast } from 'sonner'

export default function MyCoursewarePage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<TeachingSessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const limit = 12

  // 加载教学会话列表
  const loadSessions = async (currentPage: number, search: string = '') => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      })

      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/teaching-sessions?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '加载失败')
      }

      setSessions(result.data.sessions)
      setTotal(result.data.total)
      setTotalPages(result.data.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
      console.error('❌ [MyCourseware] 加载教学会话失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions(page, searchQuery)
  }, [page])

  // 搜索处理
  const handleSearch = () => {
    setPage(1)
    loadSessions(1, searchQuery)
  }

  // 删除会话
  const handleDelete = async (sessionId: string, caseTitle: string) => {
    if (!confirm(`确定删除案例"${caseTitle}"吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/teaching-sessions/${sessionId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '删除失败')
      }

      toast.success('删除成功')

      // 重新加载列表
      loadSessions(page, searchQuery)
    } catch (err) {
      toast.error('删除失败', {
        description: err instanceof Error ? err.message : '请稍后重试'
      })
      console.error('❌ [MyCourseware] 删除教学会话失败:', err)
    }
  }

  // 查看案例详情
  const handleViewSession = (sessionId: string) => {
    // TODO: 实现恢复到四幕界面的逻辑
    // 需要加载快照数据，恢复到Store，然后跳转到judgment页面
    router.push(`/dashboard/my-courseware/${sessionId}`)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <div id="MyCoursewarePageId" className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            我的课件
          </h1>
          <p className="text-muted-foreground">
            查看历史学习记录，随时复习案例分析
          </p>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="搜索案例标题、案号、法院..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-md"
            />
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              搜索
            </Button>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard/judgment')}>
            <FileText className="w-4 h-4 mr-2" />
            学习新案例
          </Button>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">加载中...</span>
          </div>
        )}

        {/* 空状态 */}
        {!loading && sessions.length === 0 && (
          <Card className="py-20">
            <CardContent className="text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">还没有学习记录</h3>
              <p className="text-muted-foreground mb-6">
                完成案例学习后，点击"完成学习"按钮即可保存到这里
              </p>
              <Button onClick={() => router.push('/dashboard/judgment')}>
                <FileText className="w-4 h-4 mr-2" />
                开始学习
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 案例列表 */}
        {!loading && sessions.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {sessions.map((session) => (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    {/* 案号（最突出） */}
                    {session.caseNumber && (
                      <div className="text-sm font-semibold text-primary mb-1">
                        {session.caseNumber}
                      </div>
                    )}
                    {/* 案件标题 */}
                    <CardTitle className="text-base line-clamp-2 leading-tight">
                      {session.caseTitle}
                    </CardTitle>
                    {/* 法院 */}
                    {session.courtName && (
                      <CardDescription className="mt-1">
                        <div className="text-xs flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {session.courtName}
                        </div>
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* 创建日期 */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(session.createdAt)}</span>
                      {session.lastViewedAt && session.lastViewedAt !== session.createdAt && (
                        <span className="text-xs text-muted-foreground/70">
                          · 最近查看: {formatDate(session.lastViewedAt)}
                        </span>
                      )}
                    </div>
                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewSession(session.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        查看
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(session.id, session.caseTitle)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一页
                </Button>
                <span className="text-sm text-muted-foreground">
                  第 {page} / {totalPages} 页 · 共 {total} 条记录
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  下一页
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
