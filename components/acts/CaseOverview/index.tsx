'use client'

/**
 * 案件概况组件 (CaseOverview)
 *
 * 职责：展示案件基本信息，支持故事模式和数据模式切换
 * 重构说明：
 * - 从 Act2CaseIntro 重命名为 CaseOverview，更语义化
 * - 移除了重复的时间轴功能，专注于案件基本信息展示
 * - 时间轴功能统一在 DeepAnalysis 中实现，避免功能重复
 *
 * 使用场景：第二幕深度分析中的案件概况卡片
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StoryView } from './StoryView'
import { useCurrentCase, useStoryMode } from '@/src/domains/stores'
import { useTeachingStore } from '@/src/domains/teaching-acts/stores/useTeachingStore'
import { BookOpen, FileText, ToggleLeft, ToggleRight, Clock } from 'lucide-react'

export function CaseOverview() {
  // 直接使用领域 store，避免兼容性层
  const caseData = useCurrentCase()
  const storyMode = useStoryMode()

  // 使用精确的 selector 订阅
  const storyChapters = useTeachingStore((state) => state.storyChapters)
  const toggleStoryMode = useTeachingStore((state) => state.toggleStoryMode)
  const setCurrentAct = useTeachingStore((state) => state.setCurrentAct)

  // 本地状态控制，完全避免 store 方法的循环依赖
  const [hasInitializedStory, setHasInitializedStory] = useState(false)
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)

  // 稳定的生成故事章节函数
  const generateStoryChapters = useCallback(async () => {
    if (!caseData || isGeneratingStory) return

    setIsGeneratingStory(true)
    try {
      // 基于案例数据生成故事章节
      const mockChapters = [
        {
          id: 'chapter-1',
          title: '案件起源',
          content: `${caseData.basicInfo?.caseNumber || '本案'} 的故事开始于...`,
          icon: '📋',
          color: 'blue'
        },
        {
          id: 'chapter-2',
          title: '争议焦点',
          content: '案件的核心争议在于...',
          icon: '⚖️',
          color: 'orange'
        },
        {
          id: 'chapter-3',
          title: '法院审理',
          content: `${caseData.basicInfo?.court || '法院'} 经过审理认为...`,
          icon: '🏛️',
          color: 'green'
        }
      ]

      // 直接调用 store 的 setStoryChapters 方法
      useTeachingStore.getState().setStoryChapters(mockChapters)
    } catch (error) {
      console.warn('生成故事章节失败:', error)
    } finally {
      setIsGeneratingStory(false)
    }
  }, [caseData, isGeneratingStory])

  // 计算是否需要生成故事，使用更稳定的依赖
  const shouldGenerateStory = useMemo(() => {
    return !!(caseData && storyMode && storyChapters.length === 0 && !hasInitializedStory && !isGeneratingStory)
  }, [caseData, storyMode, storyChapters.length, hasInitializedStory, isGeneratingStory])

  // 严格控制故事生成时机
  useEffect(() => {
    if (shouldGenerateStory) {
      setHasInitializedStory(true)
      // 使用 queueMicrotask 确保在下个微任务中执行
      queueMicrotask(() => {
        generateStoryChapters()
      })
    }
  }, [shouldGenerateStory, generateStoryChapters])

  // 重置初始化状态（当切换到非故事模式时）
  useEffect(() => {
    if (!storyMode) {
      setHasInitializedStory(false)
      setIsGeneratingStory(false)
    }
  }, [storyMode])

  if (!caseData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无案件数据</h3>
            <p className="text-gray-500 mb-4">请先在序幕中上传并解析判决书文件</p>
            <Button onClick={() => setCurrentAct('upload')}>
              返回序幕
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 模式切换 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">案件概况</CardTitle>
              <CardDescription>
                {storyMode 
                  ? '以叙事方式呈现案件，更易理解案情发展' 
                  : '以结构化数据呈现，便于快速查看关键信息'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleStoryMode}
              className="flex items-center gap-2"
            >
              {storyMode ? (
                <>
                  <ToggleRight className="w-4 h-4" />
                  故事模式
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  数据模式
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 案件基本信息 */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">
              案号：{caseData.basicInfo.caseNumber}
            </Badge>
            <Badge variant="secondary">
              法院：{caseData.basicInfo.court}
            </Badge>
            {caseData.basicInfo.caseType && (
              <Badge variant="default">
                {caseData.basicInfo.caseType}
              </Badge>
            )}
          </div>
          
          {/* 内容展示 - 移除重复时间轴，仅展示基本信息 */}
          {storyMode ? (
            <StoryView />
          ) : (
            <div className="space-y-4">
              {/* 基本案件信息展示 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 案件状态 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    案件状态
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>审级: {caseData.basicInfo.level || '一审'}</p>
                    <p>案件性质: {caseData.basicInfo.nature || '民事纠纷'}</p>
                    <p>审理程序: {caseData.basicInfo.procedure || '普通程序'}</p>
                  </div>
                </div>

                {/* 当事人信息 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    当事人
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {caseData.threeElements?.facts?.parties ? (
                      caseData.threeElements.facts.parties.slice(0, 3).map((party, index) => (
                        <p key={index}>{party}</p>
                      ))
                    ) : (
                      <p>暂无当事人信息</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 提示信息 */}
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-700">
                  详细的时间轴分析将在下方的"AI智能分析"部分展示
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}