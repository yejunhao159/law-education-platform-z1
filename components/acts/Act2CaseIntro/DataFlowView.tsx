'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCaseData } from '@/lib/stores/useCaseStore'
import { 
  FileText, 
  Clock, 
  Users, 
  Scale, 
  Gavel,
  ArrowDown,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface DataFlowViewProps {
  showFlowDiagram?: boolean
}

export function DataFlowView({ showFlowDiagram = false }: DataFlowViewProps) {
  const caseData = useCaseData()

  if (!caseData) {
    return null
  }

  const { basicInfo, threeElements } = caseData

  if (showFlowDiagram) {
    return (
      <div className="space-y-6">
        {/* 数据流转图 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">数据流转路径</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              {/* 序幕 */}
              <div className="w-full max-w-md">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">序幕：文件上传</p>
                    <p className="text-sm text-gray-600">判决书已成功解析</p>
                  </div>
                </div>
              </div>
              <ArrowDown className="w-5 h-5 text-gray-400" />
              
              {/* 第一幕 */}
              <div className="w-full max-w-md">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">第一幕：三要素提取</p>
                    <p className="text-sm text-gray-600">事实、证据、说理已分解</p>
                  </div>
                </div>
              </div>
              <ArrowDown className="w-5 h-5 text-gray-400" />
              
              {/* 第二幕 - 当前 */}
              <div className="w-full max-w-md">
                <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-400 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-800">第二幕：案情导入（当前）</p>
                    <p className="text-sm text-blue-600">正在整理案件信息</p>
                  </div>
                </div>
              </div>
              <ArrowDown className="w-5 h-5 text-gray-400" />
              
              {/* 第三幕 */}
              <div className="w-full max-w-md">
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-600">第三幕：事实认定</p>
                    <p className="text-sm text-gray-500">待完成</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            案件基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">案号</p>
              <p className="font-medium">{basicInfo.caseNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">审理法院</p>
              <p className="font-medium">{basicInfo.court}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">判决日期</p>
              <p className="font-medium">{basicInfo.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">案件类型</p>
              <Badge variant="secondary">民事案件</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 当事人信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            当事人信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-blue-700">原告方</h4>
              <div className="space-y-2">
                {basicInfo.parties.plaintiff.map((party, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">{party.name}</p>
                    <Badge variant="outline" className="mt-1">{party.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-red-700">被告方</h4>
              <div className="space-y-2">
                {basicInfo.parties.defendant.map((party, idx) => (
                  <div key={idx} className="p-3 bg-red-50 rounded-lg">
                    <p className="font-medium">{party.name}</p>
                    <Badge variant="outline" className="mt-1">{party.type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 事实摘要 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            事实摘要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed mb-4">
            {threeElements.facts.summary}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>关键事实：{threeElements.facts.keyFacts.length} 项</span>
            <span>争议事实：{threeElements.facts.disputedFacts.length} 项</span>
            <span>时间线事件：{threeElements.facts.timeline.length} 个</span>
          </div>
        </CardContent>
      </Card>

      {/* 证据概况 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5" />
            证据概况
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed mb-4">
            {threeElements.evidence.summary}
          </p>
          <div className="flex flex-wrap gap-2">
            {threeElements.evidence.items.slice(0, 5).map((item, idx) => (
              <Badge 
                key={idx} 
                variant={item.accepted ? 'default' : 'secondary'}
              >
                {item.name}
              </Badge>
            ))}
            {threeElements.evidence.items.length > 5 && (
              <Badge variant="outline">
                +{threeElements.evidence.items.length - 5} 更多
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 裁判要点 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="w-5 h-5" />
            裁判要点
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed mb-4">
            {threeElements.reasoning.summary}
          </p>
          {threeElements.reasoning.judgment && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-800 mb-2">判决结果</h4>
              <p className="text-sm text-purple-700">
                {threeElements.reasoning.judgment}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}