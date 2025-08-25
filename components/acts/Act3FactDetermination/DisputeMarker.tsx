'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCaseData, useCaseStore } from '@/lib/stores/useCaseStore'
import { CheckCircle, AlertCircle, XCircle, Users } from 'lucide-react'
import type { DisputeLevel } from '@/lib/stores/useCaseStore'

export function DisputeMarker() {
  const caseData = useCaseData()
  const { factDisputes, markFactDispute } = useCaseStore()

  if (!caseData) return null

  const allFacts = [
    ...caseData.threeElements.facts.timeline.map(e => ({
      id: `${e.date}-${e.event}`,
      content: `${e.date}: ${e.event}`,
      type: 'timeline' as const
    })),
    ...caseData.threeElements.facts.keyFacts.map((f, idx) => ({
      id: `key-${idx}`,
      content: f,
      type: 'key' as const
    })),
    ...caseData.threeElements.facts.disputedFacts.map((f, idx) => ({
      id: `disputed-${idx}`,
      content: f,
      type: 'disputed' as const
    }))
  ]

  const getDisputeLevel = (factId: string): DisputeLevel => {
    return factDisputes.get(factId) || 'agreed'
  }

  const handleMarkDispute = (factId: string, level: DisputeLevel) => {
    markFactDispute(factId, level)
  }

  const disputeStats = {
    agreed: allFacts.filter(f => getDisputeLevel(f.id) === 'agreed').length,
    partial: allFacts.filter(f => getDisputeLevel(f.id) === 'partial').length,
    disputed: allFacts.filter(f => getDisputeLevel(f.id) === 'disputed').length
  }

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">双方认可</p>
                <p className="text-2xl font-bold text-green-800">{disputeStats.agreed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">部分争议</p>
                <p className="text-2xl font-bold text-yellow-800">{disputeStats.partial}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">核心争议</p>
                <p className="text-2xl font-bold text-red-800">{disputeStats.disputed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 事实列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            事实争议标记
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allFacts.map(fact => {
              const currentLevel = getDisputeLevel(fact.id)
              
              return (
                <div 
                  key={fact.id}
                  className={`p-4 rounded-lg border-l-4 transition-all ${
                    currentLevel === 'disputed' ? 'border-red-500 bg-red-50' :
                    currentLevel === 'partial' ? 'border-yellow-500 bg-yellow-50' :
                    'border-green-500 bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          {fact.type === 'timeline' ? '时间线事实' :
                           fact.type === 'key' ? '关键事实' : '争议事实'}
                        </Badge>
                        <Badge variant={
                          currentLevel === 'disputed' ? 'destructive' :
                          currentLevel === 'partial' ? 'default' :
                          'secondary'
                        }>
                          {currentLevel === 'disputed' ? '核心争议' :
                           currentLevel === 'partial' ? '部分争议' : '双方认可'}
                        </Badge>
                      </div>
                      <p className="text-gray-700">{fact.content}</p>
                    </div>
                    
                    <div className="flex gap-1 ml-4">
                      <Button
                        size="sm"
                        variant={currentLevel === 'agreed' ? 'default' : 'outline'}
                        onClick={() => handleMarkDispute(fact.id, 'agreed')}
                        className="w-24"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        认可
                      </Button>
                      <Button
                        size="sm"
                        variant={currentLevel === 'partial' ? 'default' : 'outline'}
                        onClick={() => handleMarkDispute(fact.id, 'partial')}
                        className="w-24"
                      >
                        <AlertCircle className="w-4 h-4 mr-1" />
                        部分
                      </Button>
                      <Button
                        size="sm"
                        variant={currentLevel === 'disputed' ? 'default' : 'outline'}
                        onClick={() => handleMarkDispute(fact.id, 'disputed')}
                        className="w-24"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        争议
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 操作提示 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">标记说明</p>
              <ul className="space-y-1 text-blue-700">
                <li>• <strong>双方认可</strong>：原被告双方对该事实无异议</li>
                <li>• <strong>部分争议</strong>：对事实的部分细节存在分歧</li>
                <li>• <strong>核心争议</strong>：该事实是案件争议的焦点</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}