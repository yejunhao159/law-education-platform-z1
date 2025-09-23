'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  useCaseStore,
  useClaimAnalysis,
  useTimelineViewMode,
  useIsAnalyzingClaims
} from '@/src/domains/stores'
import type { UnifiedTimelineProps, TimelineEvent, ClaimAnalysisResult } from '@/types/timeline-claim-analysis'
import { TimelineErrorBoundary } from './TimelineErrorBoundary'
import { useClaimAnalysisCache } from '@/lib/cache/claim-analysis-cache'
import { 
  Clock, 
  Layers, 
  Brain, 
  AlertCircle,
  Scale,
  FileText,
  ChevronRight,
  Loader2,
  Zap
} from 'lucide-react'

function UnifiedTimelineInner({
  events: propEvents,
  analysis: propAnalysis,
  mode: propMode,
  enableAI = true,
  onNodeClick,
  onAnalysisComplete,
  className = ''
}: UnifiedTimelineProps) {
  // 使用精确的 selector，只订阅必要的数据
  const caseTimeline = useCaseStore((state) => state.caseData?.threeElements?.facts?.timeline)
  const caseType = useCaseStore((state) => state.caseData?.basicInfo?.caseType)
  const storeAnalysis = useClaimAnalysis()
  const storeMode = useTimelineViewMode()
  const isAnalyzing = useIsAnalyzingClaims()

  // 从 store 获取方法，但使用 useCallback 稳定化引用
  const setClaimAnalysis = useCaseStore((state) => state.setClaimAnalysis)
  const setIsAnalyzingClaims = useCaseStore((state) => state.setIsAnalyzingClaims)
  const setTimelineViewMode = useCaseStore((state) => state.setTimelineViewMode)

  // 优先使用传入的props，否则使用store数据
  const events = propEvents || caseTimeline || []
  const analysis = propAnalysis || storeAnalysis
  const mode = propMode || storeMode

  // 使用 useMemo 缓存稳定的数据引用，避免不必要的重新渲染
  const stableEvents = useMemo(() => events, [JSON.stringify(events)])
  const stableAnalysis = useMemo(() => analysis, [JSON.stringify(analysis)])
  const stableMode = useMemo(() => mode, [mode])

  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [viewFilter, setViewFilter] = useState<'all' | 'critical' | 'claims'>('all')
  
  // 使用 useCallback 优化事件处理函数
  const handleNodeClick = useCallback((event: TimelineEvent) => {
    setSelectedEvent(event)
    onNodeClick?.(event)
  }, [onNodeClick])

  // 过滤事件 - 使用稳定的数据引用
  const filteredEvents = useMemo(() => {
    return stableEvents.filter(event => {
      if (viewFilter === 'all') return true
      if (viewFilter === 'critical') return event.importance === 'critical'
      if (viewFilter === 'claims') return event.claims && event.claims.elements.length > 0
      return true
    })
  }, [stableEvents, viewFilter])

  // 根据模式切换视图 - 使用稳定的引用
  const renderContent = useCallback(() => {
    switch (stableMode) {
      case 'simple':
        return <SimpleTimelineView events={filteredEvents} onNodeClick={handleNodeClick} />
      case 'enhanced':
        return <EnhancedTimelineView events={filteredEvents} onNodeClick={handleNodeClick} />
      case 'analysis':
        return <AnalysisTimelineView events={filteredEvents} analysis={stableAnalysis} onNodeClick={handleNodeClick} />
      default:
        return <SimpleTimelineView events={filteredEvents} onNodeClick={handleNodeClick} />
    }
  }, [stableMode, filteredEvents, stableAnalysis, handleNodeClick])
  
  // AI分析按钮
  const cache = useClaimAnalysisCache()
  const [isUsingCache, setIsUsingCache] = useState(false)

  // 使用 useCallback 优化 AI 分析函数，移除对 store 对象的直接依赖
  const handleAIAnalysis = useCallback(async () => {
    if (!enableAI || !stableEvents.length) return

    // 先检查缓存
    const cachedResult = cache.get(stableEvents, caseType)
    if (cachedResult) {
      setIsUsingCache(true)
      setClaimAnalysis(cachedResult)
      onAnalysisComplete?.(cachedResult)
      setTimeout(() => setIsUsingCache(false), 2000)
      return
    }

    setIsAnalyzingClaims(true)

    try {
      // 调用AI分析API
      const response = await fetch('/api/claim-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: stableEvents,
          caseType: caseType,
          focusAreas: ['claims', 'defenses', 'limitations', 'burden-of-proof'],
          depth: 'comprehensive'
        })
      })

      if (!response.ok) throw new Error('分析失败')

      const result: ClaimAnalysisResult = await response.json()

      // 存入缓存
      cache.set(stableEvents, result, caseType)

      setClaimAnalysis(result)
      onAnalysisComplete?.(result)
    } catch (error) {
      console.error('AI分析错误:', error)
      // 显示错误提示
      alert('分析失败，请稍后重试')
    } finally {
      setIsAnalyzingClaims(false)
    }
  }, [enableAI, stableEvents, caseType, cache, setClaimAnalysis, setIsAnalyzingClaims, onAnalysisComplete])

  // 使用 useCallback 优化模式切换函数，移除对 store 对象的依赖
  const handleModeChange = useCallback(() => {
    // 这里可以添加防抖机制
    setTimelineViewMode(stableMode === 'simple' ? 'enhanced' : stableMode === 'enhanced' ? 'analysis' : 'simple')
  }, [stableMode, setTimelineViewMode])
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 控制栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* 视图模式切换 */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <Button
              size="sm"
              variant={stableMode === 'simple' ? 'default' : 'ghost'}
              onClick={() => setTimelineViewMode('simple')}
              className="h-7"
            >
              <Layers className="w-4 h-4 mr-1" />
              简单
            </Button>
            <Button
              size="sm"
              variant={stableMode === 'enhanced' ? 'default' : 'ghost'}
              onClick={() => setTimelineViewMode('enhanced')}
              className="h-7"
            >
              <Clock className="w-4 h-4 mr-1" />
              增强
            </Button>
            <Button
              size="sm"
              variant={stableMode === 'analysis' ? 'default' : 'ghost'}
              onClick={() => setTimelineViewMode('analysis')}
              className="h-7"
            >
              <Brain className="w-4 h-4 mr-1" />
              分析
            </Button>
          </div>
          
          {/* 过滤器 */}
          <select
            value={viewFilter}
            onChange={(e) => setViewFilter(e.target.value as any)}
            className="h-8 px-3 text-sm border rounded-md"
          >
            <option value="all">全部事件</option>
            <option value="critical">关键事件</option>
            <option value="claims">请求权相关</option>
          </select>
        </div>
        
        {/* AI分析按钮 */}
        {enableAI && stableMode === 'analysis' && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAIAnalysis}
              disabled={isAnalyzing || !stableEvents.length}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  分析中...
                </>
              ) : isUsingCache ? (
                <>
                  <Zap className="w-4 h-4" />
                  使用缓存
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  AI请求权分析
                </>
              )}
            </Button>
            {/* 缓存状态指示器 */}
            {cache.stats().size > 0 && (
              <Badge variant="outline" className="text-xs">
                缓存: {cache.stats().size}/{cache.stats().maxSize}
              </Badge>
            )}
          </div>
        )}
      </div>
      
      {/* 主内容区 */}
      <Card>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
      
      {/* 选中事件详情 */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">事件详情</CardTitle>
          </CardHeader>
          <CardContent>
            <EventDetail event={selectedEvent} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// 简单时间轴视图组件
function SimpleTimelineView({ 
  events, 
  onNodeClick 
}: { 
  events: TimelineEvent[]
  onNodeClick: (event: TimelineEvent) => void 
}) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div
          key={event.id}
          className="flex gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
          onClick={() => onNodeClick(event)}
        >
          <div className="flex-shrink-0 w-24 text-sm text-gray-500">
            {event.date}
          </div>
          <div className="flex-1">
            <div className="font-medium">{event.title}</div>
            <div className="text-sm text-gray-600 mt-1">{event.description}</div>
            {event.importance === 'critical' && (
              <Badge variant="destructive" className="mt-2">关键事件</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// 增强时间轴视图组件
function EnhancedTimelineView({ 
  events, 
  onNodeClick 
}: { 
  events: TimelineEvent[]
  onNodeClick: (event: TimelineEvent) => void 
}) {
  return (
    <div className="relative">
      {/* 时间轴线 */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      
      <div className="space-y-6">
        {events.map((event, index) => (
          <div
            key={event.id}
            className="flex gap-4 cursor-pointer group"
            onClick={() => onNodeClick(event)}
          >
            {/* 时间轴节点 */}
            <div className="relative flex-shrink-0 w-16">
              <div className={`
                absolute left-6 w-4 h-4 rounded-full border-2 bg-white
                ${event.importance === 'critical' ? 'border-red-500' : 'border-blue-500'}
                group-hover:scale-125 transition-transform
              `}></div>
            </div>
            
            {/* 事件内容 */}
            <div className="flex-1 bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-500">{event.date}</div>
                  <div className="font-medium mt-1">{event.title}</div>
                  <div className="text-sm text-gray-600 mt-2">{event.description}</div>
                  
                  {/* 标签 */}
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline">{event.type}</Badge>
                    {event.claims && (
                      <Badge variant="secondary">
                        <Scale className="w-3 h-3 mr-1" />
                        请求权
                      </Badge>
                    )}
                    {event.burdenOfProof && (
                      <Badge variant="secondary">
                        <FileText className="w-3 h-3 mr-1" />
                        举证责任
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 分析时间轴视图组件
function AnalysisTimelineView({ 
  events, 
  analysis,
  onNodeClick 
}: { 
  events: TimelineEvent[]
  analysis: ClaimAnalysisResult | null
  onNodeClick: (event: TimelineEvent) => void 
}) {
  // Always show tabs structure in analysis mode, with placeholder content when no analysis
  return (
    <Tabs defaultValue="timeline" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="timeline">时间轴</TabsTrigger>
        <TabsTrigger value="claims">请求权</TabsTrigger>
        <TabsTrigger value="burden">举证责任</TabsTrigger>
        <TabsTrigger value="strategy">策略建议</TabsTrigger>
      </TabsList>
      
      <TabsContent value="timeline" className="mt-4">
        {analysis ? (
          <EnhancedTimelineView events={events} onNodeClick={onNodeClick} />
        ) : (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">点击"AI请求权分析"按钮开始分析</p>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="claims" className="mt-4">
        {analysis ? (
          <ClaimsAnalysisView analysis={analysis} />
        ) : (
          <div className="text-center py-8 text-gray-500">暂无请求权分析数据</div>
        )}
      </TabsContent>
      
      <TabsContent value="burden" className="mt-4">
        {analysis ? (
          <BurdenOfProofView analysis={analysis} />
        ) : (
          <div className="text-center py-8 text-gray-500">暂无举证责任数据</div>
        )}
      </TabsContent>
      
      <TabsContent value="strategy" className="mt-4">
        {analysis ? (
          <StrategyView analysis={analysis} />
        ) : (
          <div className="text-center py-8 text-gray-500">暂无策略建议数据</div>
        )}
      </TabsContent>
    </Tabs>
  )
}

// 请求权分析视图
function ClaimsAnalysisView({ analysis }: { analysis: ClaimAnalysisResult }) {
  return (
    <div className="space-y-4">
      {/* 主要请求权 */}
      <div>
        <h4 className="font-medium mb-3">主要请求权</h4>
        {analysis.claims.primary.map(claim => (
          <Card key={claim.id} className="mb-3">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="mb-2">{claim.basis}</Badge>
                  <div className="text-sm text-gray-600 mt-2">
                    {claim.basisText}
                  </div>
                  {/* 构成要件 */}
                  <div className="mt-3 space-y-2">
                    {claim.elements.map((element, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${
                          element.satisfied ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-sm">{element.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Badge variant={
                  claim.conclusion === 'established' ? 'success' :
                  claim.conclusion === 'partial' ? 'warning' : 'destructive'
                }>
                  {claim.conclusion === 'established' ? '成立' :
                   claim.conclusion === 'partial' ? '部分成立' : '不成立'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* 抗辩事由 */}
      {analysis.claims.defense.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">抗辩事由</h4>
          {analysis.claims.defense.map(defense => (
            <Alert key={defense.id} className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{defense.type}:</strong> {defense.description}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  )
}

// 举证责任视图
function BurdenOfProofView({ analysis }: { analysis: ClaimAnalysisResult }) {
  return (
    <div className="space-y-4">
      {analysis.burdenOfProof.map((item, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div>
                <div className="font-medium">{item.fact}</div>
                <div className="text-sm text-gray-500 mt-1">
                  举证方：{item.party}
                </div>
              </div>
              
              {/* 现有证据 */}
              {item.evidence.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-1">现有证据：</div>
                  <div className="flex flex-wrap gap-2">
                    {item.evidence.map((ev, idx) => (
                      <Badge key={idx} variant="outline">{ev}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 证据缺口 */}
              {item.gap && item.gap.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    证据缺口：{item.gap.join('、')}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 评估结果 */}
              <Badge variant={
                item.evaluation === 'sufficient' ? 'success' :
                item.evaluation === 'insufficient' ? 'destructive' : 'warning'
              }>
                {item.evaluation === 'sufficient' ? '证据充分' :
                 item.evaluation === 'insufficient' ? '证据不足' : '存在争议'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// 策略建议视图
function StrategyView({ analysis }: { analysis: ClaimAnalysisResult }) {
  return (
    <div className="space-y-4">
      {/* 建议 */}
      <div>
        <h4 className="font-medium mb-3 text-green-600">策略建议</h4>
        <ul className="space-y-2">
          {analysis.strategy.recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-green-500 mt-0.5" />
              <span className="text-sm">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* 风险 */}
      <div>
        <h4 className="font-medium mb-3 text-red-600">风险提示</h4>
        <ul className="space-y-2">
          {analysis.strategy.risks.map((risk, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <span className="text-sm">{risk}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* 机会 */}
      <div>
        <h4 className="font-medium mb-3 text-blue-600">机会点</h4>
        <ul className="space-y-2">
          {analysis.strategy.opportunities.map((opp, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5" />
              <span className="text-sm">{opp}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// 事件详情组件
function EventDetail({ event }: { event: TimelineEvent }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500">日期</div>
        <div className="font-medium">{event.date}</div>
      </div>
      
      <div>
        <div className="text-sm text-gray-500">标题</div>
        <div className="font-medium">{event.title}</div>
      </div>
      
      <div>
        <div className="text-sm text-gray-500">描述</div>
        <div className="text-gray-700">{event.description}</div>
      </div>
      
      {event.claims && (
        <div>
          <div className="text-sm text-gray-500 mb-2">请求权分析</div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm">
              <strong>法律基础：</strong> {event.claims.basis.join('、')}
            </div>
            <div className="text-sm mt-2">
              <strong>类型：</strong> {event.claims.type}
            </div>
            <div className="text-sm mt-2">
              <strong>满足状态：</strong> 
              <Badge variant={event.claims.fulfilled ? 'success' : 'destructive'} className="ml-2">
                {event.claims.fulfilled ? '满足' : '未满足'}
              </Badge>
            </div>
          </div>
        </div>
      )}
      
      {event.burdenOfProof && (
        <div>
          <div className="text-sm text-gray-500 mb-2">举证责任</div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm">
              <strong>举证方：</strong> {event.burdenOfProof.party}
            </div>
            <div className="text-sm mt-2">
              <strong>证明标准：</strong> {event.burdenOfProof.standard}
            </div>
            {event.burdenOfProof.evidence.length > 0 && (
              <div className="text-sm mt-2">
                <strong>相关证据：</strong> {event.burdenOfProof.evidence.join('、')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}// 导出包装在错误边界中的组件
export function UnifiedTimeline(props: UnifiedTimelineProps) {
  return (
    <TimelineErrorBoundary>
      <UnifiedTimelineInner {...props} />
    </TimelineErrorBoundary>
  )
}
