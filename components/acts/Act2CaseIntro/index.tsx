'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StoryView } from './StoryView'
import { UnifiedTimeline } from '@/components/timeline/UnifiedTimeline'
import { useCurrentCase, useStoryMode } from '@/src/domains/stores'
import { useTeachingStore } from '@/src/domains/teaching-acts/stores/useTeachingStore'
import { BookOpen, FileText, ToggleLeft, ToggleRight, Clock } from 'lucide-react'

export function Act2CaseIntro() {
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
          
          {/* 内容展示 - 时间轴作为主要呈现方式 */}
          {storyMode ? (
            <StoryView />
          ) : (
            <div className="space-y-4">
              {/* 时间轴展示 - 法学思维驱动 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold">案件发展脉络</h4>
                  <Badge variant="outline" className="text-xs">
                    请求权分析法
                  </Badge>
                </div>
                {/* 使用统一时间轴组件 */}
                <UnifiedTimeline 
                  events={caseData?.threeElements?.facts?.timeline}
                  enableAI={true}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}