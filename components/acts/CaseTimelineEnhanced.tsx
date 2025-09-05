'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  User, 
  FileText,
  Gavel,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Circle,
  Scale,
  BookOpen,
  Timer,
  Brain,
  Loader2,
  Sparkles,
  Filter,
  Grid3x3,
  List,
  Layers,
  Minimize2,
  Maximize2
} from 'lucide-react'

interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'fact' | 'procedure' | 'evidence' | 'decision' | 'legal'
  importance: 'high' | 'medium' | 'low'
  actor?: string
  phase?: 'pre-litigation' | 'litigation' | 'post-judgment' // 阶段分类
  // 法学思维要素
  legalAnalysis?: {
    legalRelation?: string
    burdenOfProof?: string
    limitation?: string
    claims?: string[]
    keyPoint?: string
  }
  relatedTo?: string[]
}

interface TimelinePhase {
  id: string
  name: string
  dateRange: string
  events: TimelineEvent[]
  collapsed?: boolean
}

type ViewMode = 'linear' | 'grouped' | 'grid' | 'compact'

export function CaseTimelineEnhanced() {
  const caseData = useCaseStore(state => state.caseData)
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({})
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grouped')
  const [showPhaseStats, setShowPhaseStats] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())
  
  // 从案件数据中提取时间线事件
  const extractTimelineEvents = (): TimelineEvent[] => {
    if (!caseData) return []
    
    const events: TimelineEvent[] = []
    
    // 从事实中提取时间点 - 增强版，包含阶段分类
    if (caseData.threeElements?.facts?.timeline) {
      caseData.threeElements.facts.timeline.forEach((item: any, index: number) => {
        const event: TimelineEvent = {
          id: `fact-${index}`,
          date: item.date,
          title: item.event,
          description: item.detail || '',
          type: 'fact',
          importance: item.isKeyEvent ? 'high' : 'medium',
          actor: item.party,
          phase: determinePhase(item.date, caseData.basicInfo)
        }
        
        // 提取法学要素
        if (item.legalAnalysis) {
          event.legalAnalysis = item.legalAnalysis
        }
        
        events.push(event)
      })
    }
    
    // 添加程序性事件
    if (caseData.basicInfo?.filingDate) {
      events.push({
        id: 'filing',
        date: caseData.basicInfo.filingDate,
        title: '案件受理',
        description: `${caseData.basicInfo.court}受理案件`,
        type: 'procedure',
        importance: 'high',
        actor: '法院',
        phase: 'litigation'
      })
    }
    
    if (caseData.basicInfo?.judgmentDate) {
      events.push({
        id: 'judgment',
        date: caseData.basicInfo.judgmentDate,
        title: '作出判决',
        description: '法院作出一审判决',
        type: 'decision',
        importance: 'high',
        actor: '法院',
        phase: 'litigation'
      })
    }
    
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  
  // 判断事件属于哪个阶段
  const determinePhase = (eventDate: string, basicInfo: any): 'pre-litigation' | 'litigation' | 'post-judgment' => {
    if (!basicInfo) return 'pre-litigation'
    
    const date = new Date(eventDate)
    const filingDate = basicInfo.filingDate ? new Date(basicInfo.filingDate) : null
    const judgmentDate = basicInfo.judgmentDate ? new Date(basicInfo.judgmentDate) : null
    
    if (judgmentDate && date > judgmentDate) {
      return 'post-judgment'
    } else if (filingDate && date >= filingDate) {
      return 'litigation'
    } else {
      return 'pre-litigation'
    }
  }
  
  const events = extractTimelineEvents()
  
  // 按类型筛选事件
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events
    if (filterType === 'key') return events.filter(e => e.importance === 'high')
    return events.filter(e => e.type === filterType)
  }, [events, filterType])
  
  // 将事件按阶段分组
  const groupEventsByPhase = useMemo((): TimelinePhase[] => {
    const phases: TimelinePhase[] = [
      {
        id: 'pre-litigation',
        name: '诉前阶段',
        dateRange: '',
        events: [],
        collapsed: false
      },
      {
        id: 'litigation',
        name: '诉讼阶段',
        dateRange: '',
        events: [],
        collapsed: false
      },
      {
        id: 'post-judgment',
        name: '判后阶段',
        dateRange: '',
        events: [],
        collapsed: false
      }
    ]
    
    // 将筛选后的事件分组
    const eventsToGroup = filterType === 'all' ? events : filteredEvents
    
    eventsToGroup.forEach(event => {
      const phase = phases.find(p => p.id === event.phase)
      if (phase) {
        phase.events.push(event)
      }
    })
    
    // 计算每个阶段的日期范围和事件统计
    phases.forEach(phase => {
      if (phase.events.length > 0) {
        const dates = phase.events.map(e => e.date).sort()
        const startDate = new Date(dates[0]).toLocaleDateString('zh-CN')
        const endDate = new Date(dates[dates.length - 1]).toLocaleDateString('zh-CN')
        phase.dateRange = startDate === endDate ? startDate : `${startDate} 至 ${endDate}`
      }
    })
    
    // 只返回有事件的阶段
    return phases.filter(p => p.events.length > 0)
  }, [events, filteredEvents, filterType])
  
  // 获取分页的事件（紧凑模式）
  const [currentPage, setCurrentPage] = useState(0)
  const eventsPerPage = 5
  const paginatedEvents = useMemo(() => {
    const start = currentPage * eventsPerPage
    return filteredEvents.slice(start, start + eventsPerPage)
  }, [filteredEvents, currentPage])
  
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage)
  
  // 处理节点点击
  const handleNodeClick = useCallback(async (nodeId: string, event?: TimelineEvent) => {
    const isExpanding = expandedNodeId !== nodeId
    setExpandedNodeId(isExpanding ? nodeId : null)
    
    // 如果展开节点且还没有AI分析，调用AI分析
    if (isExpanding && event && !aiAnalysis[nodeId]) {
      setLoadingAnalysis(nodeId)
      try {
        const response = await fetch('/api/legal-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: {
              date: event.date,
              title: event.title,
              description: event.description,
              party: event.actor
            },
            caseContext: caseData?.basicInfo?.caseType || '民事案件'
          })
        })
        
        if (response.ok) {
          const analysis = await response.json()
          setAiAnalysis(prev => ({ ...prev, [nodeId]: analysis }))
        }
      } catch (error) {
        console.error('Failed to get AI analysis:', error)
      } finally {
        setLoadingAnalysis(null)
      }
    }
  }, [expandedNodeId, aiAnalysis, caseData])
  
  // 生成事件摘要
  const generateSummary = (event: TimelineEvent): string => {
    if (aiAnalysis[event.id]?.summary) {
      return aiAnalysis[event.id].summary
    }
    
    const desc = event.description || event.title
    if (desc.length <= 40) return desc
    
    const amount = desc.match(/(\d+[\.\d]*万?元)/)?.[0] || ''
    const action = event.title
    const party = event.actor || ''
    
    return `${party}${action}${amount ? `，涉及${amount}` : ''}`.slice(0, 40)
  }
  
  const getEventColor = (type: string, importance: string = 'medium') => {
    if (importance === 'high') {
      switch (type) {
        case 'fact': return 'bg-blue-600 hover:bg-blue-700'
        case 'procedure': return 'bg-purple-600 hover:bg-purple-700'
        case 'evidence': return 'bg-yellow-600 hover:bg-yellow-700'
        case 'decision': return 'bg-green-600 hover:bg-green-700'
        case 'legal': return 'bg-indigo-600 hover:bg-indigo-700'
        default: return 'bg-gray-600 hover:bg-gray-700'
      }
    } else if (importance === 'medium') {
      switch (type) {
        case 'fact': return 'bg-blue-500 hover:bg-blue-600'
        case 'procedure': return 'bg-purple-500 hover:bg-purple-600'
        case 'evidence': return 'bg-yellow-500 hover:bg-yellow-600'
        case 'decision': return 'bg-green-500 hover:bg-green-600'
        case 'legal': return 'bg-indigo-500 hover:bg-indigo-600'
        default: return 'bg-gray-500 hover:bg-gray-600'
      }
    } else {
      switch (type) {
        case 'fact': return 'bg-blue-400 hover:bg-blue-500'
        case 'procedure': return 'bg-purple-400 hover:bg-purple-500'
        case 'evidence': return 'bg-yellow-400 hover:bg-yellow-500'
        case 'decision': return 'bg-green-400 hover:bg-green-500'
        case 'legal': return 'bg-indigo-400 hover:bg-indigo-500'
        default: return 'bg-gray-400 hover:bg-gray-500'
      }
    }
  }
  
  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'fact': return '事实'
      case 'procedure': return '程序'
      case 'evidence': return '证据'
      case 'decision': return '判决'
      case 'legal': return '法律'
      default: return '其他'
    }
  }
  
  const togglePhaseCollapse = (phaseId: string) => {
    setCollapsedPhases(prev => {
      const newSet = new Set(prev)
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId)
      } else {
        newSet.add(phaseId)
      }
      return newSet
    })
  }
  
  // 渲染单个事件卡片
  const renderEventCard = (event: TimelineEvent, index: number) => {
    const isExpanded = expandedNodeId === event.id
    
    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card 
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            isExpanded ? 'ring-2 ring-blue-400 shadow-lg' : ''
          }`}
          onClick={() => handleNodeClick(event.id, event)}
        >
          {/* 标题行 */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">
                {event.title}
              </h4>
              {event.actor && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <User className="w-3 h-3" />
                  <span>{event.actor}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline" className="text-xs">
                {event.date}
              </Badge>
              {event.importance === 'high' && (
                <Badge variant="destructive" className="text-xs">
                  关键
                </Badge>
              )}
            </div>
          </div>
          
          {/* 默认显示摘要 */}
          {!isExpanded && (
            <div className="text-sm text-gray-600 line-clamp-2">
              {generateSummary(event)}
            </div>
          )}
          
          {/* 展开的详细内容 */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mb-3">
                    {event.description}
                  </p>
                  
                  {/* AI法律分析 */}
                  {loadingAnalysis === event.id ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-500">AI正在分析法律要点...</span>
                    </div>
                  ) : aiAnalysis[event.id] && (
                    <div className="space-y-3">
                      {/* AI分析内容 */}
                      {aiAnalysis[event.id].legalPoints && (
                        <div className="p-3 bg-blue-50 rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-sm text-blue-900">AI法学要点分析</span>
                          </div>
                          <ul className="space-y-1">
                            {aiAnalysis[event.id].legalPoints.map((point: string, idx: number) => (
                              <li key={idx} className="text-xs text-blue-800 flex items-start gap-1">
                                <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    )
  }
  
  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-gray-600 mb-2">暂无时间轴数据</p>
        <p className="text-sm text-gray-500">请先上传并解析判决书文件</p>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* 控制栏 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-gray-800">案件时间轴</h3>
          <Badge variant="outline" className="text-sm">
            共 {events.length} 个事件
          </Badge>
        </div>
        
        {/* 视图切换 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'linear' ? 'default' : 'outline'}
            onClick={() => setViewMode('linear')}
          >
            <List className="w-4 h-4 mr-1" />
            线性
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            onClick={() => setViewMode('grouped')}
          >
            <Layers className="w-4 h-4 mr-1" />
            分组
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4 mr-1" />
            网格
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'compact' ? 'default' : 'outline'}
            onClick={() => setViewMode('compact')}
          >
            <Minimize2 className="w-4 h-4 mr-1" />
            紧凑
          </Button>
        </div>
        
        {/* 筛选器 */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            className="text-sm border rounded-md px-2 py-1"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">全部事件</option>
            <option value="key">关键事件</option>
            <option value="fact">事实事件</option>
            <option value="procedure">程序事件</option>
            <option value="evidence">证据事件</option>
            <option value="decision">判决事件</option>
          </select>
        </div>
      </div>
      
      {/* 根据视图模式渲染不同布局 */}
      {viewMode === 'linear' && (
        <div className="space-y-4">
          {filteredEvents.map((event, index) => renderEventCard(event, index))}
        </div>
      )}
      
      {viewMode === 'grouped' && (
        <div className="space-y-6">
          {groupEventsByPhase.length > 0 ? (
            groupEventsByPhase.map(phase => {
              const keyEventsCount = phase.events.filter(e => e.importance === 'high').length
              const phaseIcon = phase.id === 'pre-litigation' ? '⚖️' : 
                               phase.id === 'litigation' ? '🏛️' : '📋'
              const phaseColorClass = phase.id === 'pre-litigation' ? 'border-blue-500' : 
                                       phase.id === 'litigation' ? 'border-purple-500' : 'border-green-500'
              const phaseGradientClass = phase.id === 'pre-litigation' ? 'from-blue-50' : 
                                         phase.id === 'litigation' ? 'from-purple-50' : 'from-green-50'
              const phaseProgressClass = phase.id === 'pre-litigation' ? 'bg-blue-500' : 
                                         phase.id === 'litigation' ? 'bg-purple-500' : 'bg-green-500'
              
              return (
                <Card key={phase.id} className={`overflow-hidden border-l-4 ${phaseColorClass}`}>
                  {/* 阶段标题栏 - 可点击折叠 */}
                  <div 
                    className={`px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 bg-gradient-to-r ${phaseGradientClass} to-white`}
                    onClick={() => togglePhaseCollapse(phase.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{phaseIcon}</span>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">
                            {phase.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {phase.events.length} 个事件
                            </Badge>
                            {keyEventsCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {keyEventsCount} 个关键事件
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {phase.dateRange}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 阶段进度条 */}
                        <div className="hidden md:flex items-center gap-2 mr-4">
                          <span className="text-xs text-gray-500">完成度</span>
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${phaseProgressClass} transition-all`}
                              style={{ width: `${(phase.events.length / events.length) * 100}%` }}
                            />
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="hover:bg-white/50">
                          {collapsedPhases.has(phase.id) ? (
                            <>
                              <span className="text-xs mr-1">展开</span>
                              <ChevronDown className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <span className="text-xs mr-1">收起</span>
                              <ChevronUp className="w-4 h-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 事件内容区 - 支持展开/折叠动画 */}
                  <AnimatePresence>
                    {!collapsedPhases.has(phase.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 py-4 space-y-3 bg-gray-50/50">
                          {/* 阶段摘要 */}
                          {phase.events.length > 3 && (
                            <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">阶段概览：</span>
                                本阶段共{phase.events.length}个事件，
                                {keyEventsCount > 0 && `包含${keyEventsCount}个关键节点，`}
                                时间跨度{phase.dateRange}
                              </p>
                            </div>
                          )}
                          
                          {/* 事件列表 */}
                          <div className="space-y-3">
                            {phase.events.map((event, index) => (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                {renderEventCard(event, index)}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">当前筛选条件下没有事件</p>
            </Card>
          )}
        </div>
      )}
      
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event, index) => renderEventCard(event, index))}
        </div>
      )}
      
      {viewMode === 'compact' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {paginatedEvents.map((event, index) => renderEventCard(event, index))}
          </div>
          
          {/* 分页控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={currentPage === index ? 'default' : 'ghost'}
                    onClick={() => setCurrentPage(index)}
                    className="w-8 h-8 p-0"
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* 统计信息 */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">案件时间跨度</p>
            <p className="text-lg font-semibold text-gray-900">
              {events[0]?.date} 至 {events[events.length - 1]?.date}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">关键事件</p>
            <p className="text-lg font-semibold text-gray-900">
              {events.filter(e => e.importance === 'high').length} 个
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}