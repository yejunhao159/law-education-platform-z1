'use client'

import React, { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StoryView } from './StoryView'
import { DataFlowView } from './DataFlowView'
import { QuickEdit } from './QuickEdit'
import { useCaseStore, useStoryMode, useCaseData } from '@/lib/stores/useCaseStore'
import { BookOpen, FileText, Edit, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react'

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
      {/* 标题区域 */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">第二幕：案情导入</h2>
        <p className="text-gray-600">理解案件背景，掌握事实脉络</p>
      </div>

      {/* 模式切换 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">展示模式</CardTitle>
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
          <CardDescription>
            {storyMode 
              ? '以叙事方式呈现案件，更易理解案情发展' 
              : '以结构化数据呈现，便于快速查看关键信息'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 内容展示 */}
      <Tabs defaultValue="view" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            案情展示
          </TabsTrigger>
          <TabsTrigger value="flow" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            数据流转
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            快速编辑
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="mt-6">
          {storyMode ? (
            <StoryView />
          ) : (
            <DataFlowView />
          )}
        </TabsContent>

        <TabsContent value="flow" className="mt-6">
          <DataFlowView showFlowDiagram />
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          <QuickEdit />
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                案号：{caseData.basicInfo.caseNumber}
              </Badge>
              <Badge variant="secondary">
                法院：{caseData.basicInfo.court}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setCurrentAct('prologue')}
              >
                返回序幕
              </Button>
              <Button 
                onClick={() => setCurrentAct('act3')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                进入事实认定
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}