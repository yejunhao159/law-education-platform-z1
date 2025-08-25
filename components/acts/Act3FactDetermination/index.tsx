'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Timeline } from './Timeline'
import { DisputeMarker } from './DisputeMarker'
import { EvidenceLinker } from './EvidenceLinker'
import { Comparison } from './Comparison'
import { useCaseStore, useCaseData } from '@/lib/stores/useCaseStore'
import { 
  Clock, 
  AlertTriangle, 
  Scale, 
  Users, 
  ArrowRight,
  FileText 
} from 'lucide-react'

export function Act3FactDetermination() {
  const { setCurrentAct } = useCaseStore()
  const caseData = useCaseData()
  const [activeTab, setActiveTab] = useState('timeline')

  if (!caseData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无案件数据</h3>
            <p className="text-gray-500 mb-4">请先上传并解析判决书文件</p>
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
        <h2 className="text-3xl font-bold text-gray-800 mb-2">第三幕：事实认定</h2>
        <p className="text-gray-600">识别争议焦点，梳理证据支撑</p>
      </div>

      {/* 功能介绍 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">教学功能</CardTitle>
          <CardDescription>
            通过时间轴梳理事实、标记争议程度、关联证据支撑，帮助学生理解事实认定的过程
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium">时间轴展示</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-sm font-medium">争议标记</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Scale className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm font-medium">证据关联</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium">对比分析</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要功能区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">时间轴</TabsTrigger>
          <TabsTrigger value="dispute">争议标记</TabsTrigger>
          <TabsTrigger value="evidence">证据关联</TabsTrigger>
          <TabsTrigger value="comparison">对比分析</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Timeline />
        </TabsContent>

        <TabsContent value="dispute" className="mt-6">
          <DisputeMarker />
        </TabsContent>

        <TabsContent value="evidence" className="mt-6">
          <EvidenceLinker />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Comparison />
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              已分析 {caseData.threeElements.facts.timeline.length} 个事件，
              {caseData.threeElements.facts.disputedFacts.length} 个争议事实
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setCurrentAct('act2')}
              >
                返回第二幕
              </Button>
              <Button 
                onClick={() => setCurrentAct('act4')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                进入第四幕
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}