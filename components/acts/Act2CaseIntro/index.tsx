'use client'

import React, { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StoryView } from './StoryView'
import { UnifiedTimeline } from '@/components/timeline/UnifiedTimeline'
import { useCaseStore, useStoryMode, useCaseData } from '@/lib/stores/useCaseStore'
import { BookOpen, FileText, ToggleLeft, ToggleRight, Clock } from 'lucide-react'

export function Act2CaseIntro() {
  const { toggleStoryMode, setCurrentAct, generateStoryChapters } = useCaseStore()
  const storyMode = useStoryMode()
  const caseData = useCaseData()

  // 如果有案件数据且开启故事模式，生成故事章节
  useEffect(() => {
    if (caseData && storyMode && !useCaseStore.getState().storyChapters.length) {
      generateStoryChapters()
    }
  }, [caseData, storyMode, generateStoryChapters])

  if (!caseData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无案件数据</h3>
            <p className="text-gray-500 mb-4">请先在序幕中上传并解析判决书文件</p>
            <Button onClick={() => setCurrentAct('prologue')}>
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