'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCaseData, useCaseStore } from '@/lib/stores/useCaseStore'
import { Clock, Calendar, ChevronDown, ChevronUp, Star, AlertCircle } from 'lucide-react'

export function Timeline() {
  const caseData = useCaseData()
  const { timelineView, setTimelineView, factDisputes } = useCaseStore()
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  if (!caseData) return null

  const timeline = caseData.threeElements.facts.timeline

  const toggleExpand = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const getEventId = (event: any) => `${event.date}-${event.event}`

  const getDisputeLevel = (event: any) => {
    return factDisputes.get(getEventId(event)) || 'agreed'
  }

  const disputeColors = {
    agreed: 'border-green-500 bg-green-50',
    partial: 'border-yellow-500 bg-yellow-50',
    disputed: 'border-red-500 bg-red-50'
  }

  const disputeLabels = {
    agreed: '双方认可',
    partial: '部分争议',
    disputed: '核心争议'
  }

  return (
    <div className="space-y-4">
      {/* 视图切换 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">事实时间轴</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={timelineView === 'vertical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimelineView('vertical')}
              >
                纵向布局
              </Button>
              <Button
                variant={timelineView === 'horizontal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimelineView('horizontal')}
              >
                横向布局
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 时间轴展示 */}
      {timelineView === 'vertical' ? (
        <div className="relative">
          {/* 时间轴线 */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />
          
          <div className="space-y-6">
            {timeline.map((event, index) => {
              const eventId = getEventId(event)
              const disputeLevel = getDisputeLevel(event)
              const isExpanded = expandedEvents.has(eventId)
              
              return (
                <div key={index} className="relative flex gap-4">
                  {/* 时间节点 */}
                  <div className="relative z-10">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      disputeLevel === 'disputed' ? 'bg-red-500' :
                      disputeLevel === 'partial' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}>
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  {/* 事件卡片 */}
                  <Card className={`flex-1 border-l-4 ${disputeColors[disputeLevel]}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {event.date}
                          </Badge>
                          <h3 className="font-semibold text-lg">{event.event}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.importance === '关键' && (
                            <Star className="w-5 h-5 text-yellow-500" />
                          )}
                          <Badge variant={
                            disputeLevel === 'disputed' ? 'destructive' :
                            disputeLevel === 'partial' ? 'default' :
                            'secondary'
                          }>
                            {disputeLabels[disputeLevel]}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* 展开详情 */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-medium text-gray-600">重要性</p>
                              <p className="text-sm">{event.importance}</p>
                            </div>
                            {event.actors && (
                              <div>
                                <p className="text-sm font-medium text-gray-600">涉及方</p>
                                <div className="flex gap-1 mt-1">
                                  {event.actors.map((actor: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {actor}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {event.description && (
                              <div>
                                <p className="text-sm font-medium text-gray-600">详细描述</p>
                                <p className="text-sm text-gray-700">{event.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(eventId)}
                        className="mt-2"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-1" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            详情
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* 横向布局 */
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* 时间轴线 */}
            <div className="relative h-1 bg-gray-300 my-8">
              {timeline.map((_, index) => (
                <div
                  key={index}
                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full"
                  style={{ left: `${(index / (timeline.length - 1)) * 100}%` }}
                />
              ))}
            </div>
            
            {/* 事件卡片 */}
            <div className="flex gap-4 px-4">
              {timeline.map((event, index) => {
                const eventId = getEventId(event)
                const disputeLevel = getDisputeLevel(event)
                
                return (
                  <Card 
                    key={index} 
                    className={`w-64 border-t-4 ${disputeColors[disputeLevel]}`}
                  >
                    <CardContent className="pt-4">
                      <Badge variant="outline" className="mb-2">
                        {event.date}
                      </Badge>
                      <h4 className="font-medium mb-2">{event.event}</h4>
                      <Badge variant={
                        disputeLevel === 'disputed' ? 'destructive' :
                        disputeLevel === 'partial' ? 'default' :
                        'secondary'
                      } className="text-xs">
                        {disputeLabels[disputeLevel]}
                      </Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 图例说明 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-around">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span className="text-sm">双方认可的事实</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <span className="text-sm">部分争议的事实</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span className="text-sm">核心争议事实</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">关键事件</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}