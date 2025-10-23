/**
 * 教学会话详情页面
 * 从数据库加载快照并恢复到Store，然后跳转到四幕界面
 */

'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useTeachingStore } from '@/src/domains/teaching-acts/stores/useTeachingStore'
import { useCaseManagementStore } from '@/src/domains/stores'
import { SnapshotConverter } from '@/src/domains/teaching-acts/utils/SnapshotConverterV2'
import type { LegalCase } from '@/src/types'

interface Props {
  params: Promise<{
    id: string
  }>
}

// 辅助函数：将extractedElements转换为LegalCase格式
function convertExtractedToLegalCase(
  extractedElements: any,
  caseTitle: string,
  sessionId: string
): LegalCase {
  // extractedElements可能有不同的结构
  const data = extractedElements.data || extractedElements
  const now = new Date().toISOString()

  return {
    id: sessionId,
    basicInfo: data.basicInfo || {
      caseNumber: data.caseNumber || caseTitle,
      court: data.court || '未知法院',
      judgeDate: data.date || data.judgeDate || now.split('T')[0],
      parties: data.parties || {
        plaintiff: [],
        defendant: []
      }
    },
    threeElements: data.threeElements || {
      facts: {
        summary: data.事实 || data.facts?.summary || '',
        timeline: data.timeline || [],
        keyFacts: [],
        disputedFacts: [],
      },
      evidence: {
        summary: data.证据 || data.evidence?.summary || '',
        items: data.evidence?.items || [],
        chainAnalysis: {
          complete: false,
          missingLinks: [],
          strength: 'weak' as const
        }
      },
      reasoning: {
        summary: data.理由 || data.reasoning?.summary || '',
        legalBasis: data.reasoning?.legalBasis || [],
        logicChain: [],
        strength: 'moderate' as const
      }
    },
    timeline: data.timeline || [],
    metadata: {
      extractedAt: now,
      confidence: extractedElements.confidence || 0,
      processingTime: 0,
      aiModel: 'restored-from-database',
      extractionMethod: 'manual' as const
    },
    originalText: data.originalText
  }
}

export default function SessionDetailPage({ params }: Props) {
  // Next.js 15: unwrap params Promise
  const resolvedParams = use(params)
  const sessionId = resolvedParams.id

  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    setExtractedElements,
    setAnalysisResult,
    setCaseLearningReport,
    setCurrentAct,
  } = useTeachingStore()

  // 获取案例管理store的setCurrentCase方法
  const { setCurrentCase } = useCaseManagementStore()

  useEffect(() => {
    loadSessionAndRestore()
  }, [sessionId])

  const loadSessionAndRestore = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('📚 [复习模式] 加载历史案例:', sessionId)

      // 1. 从API获取快照数据
      const response = await fetch(`/api/teaching-sessions/${sessionId}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '加载失败')
      }

      const session = result.data

      // 2. 使用SnapshotConverter转换数据
      const storeData = SnapshotConverter.toStore(session)

      // 3. 恢复到Zustand Store
      // 先清空当前状态
      useTeachingStore.getState().reset()
      useCaseManagementStore.getState().reset()

      useTeachingStore.getState().setSessionMetadata({
        sessionId: storeData.sessionId || session.id,
        sessionState: storeData.sessionState || session.sessionState || 'act1',
      })

      // 恢复各幕数据
      if (storeData.uploadData?.extractedElements) {
        setExtractedElements(
          storeData.uploadData.extractedElements,
          storeData.uploadData.confidence || 0
        )

        // 🔑 关键：同时恢复到CaseManagementStore
        // 将extractedElements转换为LegalCase格式
        const legalCase: LegalCase = convertExtractedToLegalCase(
          storeData.uploadData.extractedElements,
          session.caseTitle,
          session.id
        )
        setCurrentCase(legalCase)
      }

      if (storeData.analysisData?.result) {
        setAnalysisResult(storeData.analysisData.result)
      }

      // 恢复AI故事章节到store
      if (storeData.storyChapters && storeData.storyChapters.length > 0) {
        useTeachingStore.getState().setStoryChapters(storeData.storyChapters)
      }

      if (storeData.summaryData?.caseLearningReport) {
        setCaseLearningReport(storeData.summaryData.caseLearningReport)
      }

      // 4. 设置当前幕为第一幕（从头开始查看）
      setCurrentAct('upload')

      console.log('✅ [复习模式] 数据恢复完成，跳转到只读界面')

      // 5. 跳转到四幕教学界面（只读模式）
      setTimeout(() => {
        router.push(`/dashboard/judgment?mode=review&sessionId=${sessionId}`)
      }, 500)

    } catch (err) {
      console.error('❌ [复习模式] 加载失败:', err)
      setError(err instanceof Error ? err.message : '加载失败')
      setLoading(false)
    }
  }

  // 加载状态
  if (loading) {
    return (
      <div id="MyCoursewareDetailPageId" className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <h2 className="text-xl font-semibold mb-2">正在加载案例</h2>
            <p className="text-muted-foreground text-sm">
              正在从数据库恢复学习数据，请稍候...
            </p>
            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>加载案例数据</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-100" />
                <span>恢复分析结果</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-200" />
                <span>准备学习报告</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div id="MyCoursewareDetailPageId" className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/my-courseware')}
                className="flex-1"
              >
                返回列表
              </Button>
              <Button
                onClick={loadSessionAndRestore}
                className="flex-1"
              >
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
