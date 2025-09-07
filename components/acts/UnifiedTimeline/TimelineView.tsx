'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  ChevronRight,
  Circle,
  Scale,
  BookOpen,
  Timer,
  Brain,
  Loader2,
  Sparkles,
  Filter
} from 'lucide-react'
import type { TimelineEvent } from '@/types/timeline-claim-analysis'

interface TimelineViewProps {
  events: TimelineEvent[]
  mode?: 'simple' | 'enhanced'
  onEventClick?: (event: TimelineEvent) => void
  className?: string
}

interface TimelinePhase {
  id: string
  name: string
  dateRange: string
  events: TimelineEvent[]
  collapsed?: boolean
}

export function TimelineView({ 
  events = [], 
  mode = 'simple', 
  onEventClick,
  className = '' 
}: TimelineViewProps) {
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({})
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null)
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>('all')

  // 按阶段分组事件（仅在enhanced模式下使用）
  const groupedByPhase = useMemo(() => {
    if (mode !== 'enhanced') return []

    const phases: TimelinePhase[] = [
      {
        id: 'pre-litigation',
        name: '诉前阶段',
        dateRange: '',
        events: []
      },
      {
        id: 'litigation', 
        name: '诉讼阶段',
        dateRange: '',
        events: []
      },
      {
        id: 'post-judgment',
        name: '判后阶段', 
        dateRange: '',
        events: []
      }
    ]

    events.forEach(event => {
      const phase = determinePhase(event.date, event.type)
      const phaseIndex = phases.findIndex(p => p.id === phase)
      if (phaseIndex >= 0) {
        phases[phaseIndex].events.push(event)
      } else {
        phases[0].events.push(event) // 默认放到诉前阶段
      }
    })

    // 计算每个阶段的日期范围
    phases.forEach(phase => {
      if (phase.events.length > 0) {
        const dates = phase.events.map(e => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime())
        const startDate = dates[0].toLocaleDateString('zh-CN')
        const endDate = dates[dates.length - 1].toLocaleDateString('zh-CN')
        phase.dateRange = dates.length > 1 ? `${startDate} - ${endDate}` : startDate
      }
    })

    return phases.filter(phase => phase.events.length > 0)
  }, [events, mode])

  // 过滤事件
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events
    if (filterType === 'critical') return events.filter(e => e.importance === 'critical')
    if (filterType === 'important') return events.filter(e => e.importance === 'important')
    return events.filter(e => e.type === filterType)
  }, [events, filterType])

  // 确定事件阶段
  function determinePhase(date: string, type: string): string {
    // 简单的阶段判断逻辑，可以根据实际需要优化
    if (type === 'filing' || type === 'procedure') return 'litigation'
    if (type === 'judgment' || type === 'execution') return 'post-judgment'
    return 'pre-litigation'
  }

  // 获取事件颜色
  const getEventColor = (type: string, importance: string = 'reference') => {
    if (importance === 'critical') {
      switch (type) {
        case 'fact': return 'bg-blue-600 hover:bg-blue-700'
        case 'procedure': return 'bg-purple-600 hover:bg-purple-700'
        case 'evidence': return 'bg-yellow-600 hover:bg-yellow-700'
        case 'filing': return 'bg-green-600 hover:bg-green-700'
        case 'legal': return 'bg-indigo-600 hover:bg-indigo-700'
        default: return 'bg-gray-600 hover:bg-gray-700'
      }
    } else if (importance === 'important') {
      switch (type) {
        case 'fact': return 'bg-blue-500 hover:bg-blue-600'
        case 'procedure': return 'bg-purple-500 hover:bg-purple-600'
        case 'evidence': return 'bg-yellow-500 hover:bg-yellow-600'
        case 'filing': return 'bg-green-500 hover:bg-green-600'
        case 'legal': return 'bg-indigo-500 hover:bg-indigo-600'
        default: return 'bg-gray-500 hover:bg-gray-600'
      }
    } else {
      switch (type) {
        case 'fact': return 'bg-blue-400 hover:bg-blue-500'
        case 'procedure': return 'bg-purple-400 hover:bg-purple-500'
        case 'evidence': return 'bg-yellow-400 hover:bg-yellow-500'
        case 'filing': return 'bg-green-400 hover:bg-green-500'
        case 'legal': return 'bg-indigo-400 hover:bg-indigo-500'
        default: return 'bg-gray-400 hover:bg-gray-500'
      }
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'fact': return <FileText className="w-4 h-4" />
      case 'procedure': return <Gavel className="w-4 h-4" />
      case 'evidence': return <Scale className="w-4 h-4" />
      case 'filing': return <AlertCircle className="w-4 h-4" />
      case 'legal': return <BookOpen className="w-4 h-4" />
      default: return <Circle className="w-4 h-4" />
    }
  }

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'fact': return '事实'
      case 'procedure': return '程序'
      case 'evidence': return '证据'
      case 'filing': return '起诉'
      case 'legal': return '法律'
      default: return '其他'
    }
  }

  // 处理节点点击
  const handleNodeClick = useCallback(async (nodeId: string, event?: TimelineEvent) => {
    const isExpanding = expandedNodeId !== nodeId
    setExpandedNodeId(isExpanding ? nodeId : null)
    
    // 调用外部点击处理器
    if (event && onEventClick) {
      onEventClick(event)
    }
    
    // AI分析逻辑（如果需要的话）
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
            caseContext: '民事案件'
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
  }, [expandedNodeId, aiAnalysis, onEventClick])

  // 渲染单个事件
  const renderEvent = (event: TimelineEvent, index: number, isInPhase = false) => {
    const isExpanded = expandedNodeId === event.id
    const isKeyEvent = event.importance === 'critical'

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={isInPhase ? '' : 'flex-1 min-w-0'}
      >
        <div className="relative">
          {/* 时间节点圆点 */}
          <motion.div
            className={`relative mx-auto w-6 h-6 rounded-full border-4 border-white shadow-lg cursor-pointer z-10 ${getEventColor(event.type, event.importance)}`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleNodeClick(event.id, event)}
          >
            {isKeyEvent && (
              <motion.div
                className="absolute inset-0 rounded-full bg-current opacity-50"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
          
          {/* 内容卡片 */}
          <div className="mt-4 px-2">
            <Card 
              className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                isExpanded ? 'ring-2 ring-blue-400 shadow-lg' : ''
              }`}
              onClick={() => handleNodeClick(event.id, event)}
            >
              {/* 标题和时间 */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-800 truncate">
                    {event.title}
                  </h4>
                  {event.actor && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <User className="w-3 h-3" />
                      <span>{event.actor}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {event.date}
                  </Badge>
                </div>
              </div>
              
              {/* 默认摘要 */}
              {!isExpanded && (
                <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                  {event.description}
                  {event.importance === 'critical' && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      重要
                    </Badge>
                  )}
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
                          <span className="text-sm text-gray-500">AI正在分析...</span>
                        </div>
                      ) : aiAnalysis[event.id] && (
                        <div className="space-y-3">
                          {/* AI分析结果 */}
                          {aiAnalysis[event.id].legalPoints && (
                            <div className="p-3 bg-blue-50 rounded-md">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-sm text-blue-900">AI法学要点</span>
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
                      
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <div className="flex items-center gap-1">
                          {getEventIcon(event.type)}
                          <Badge variant="outline" className="text-xs">
                            {getEventLabel(event.type)}
                          </Badge>
                        </div>
                        <Badge 
                          variant={event.importance === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {event.importance === 'critical' ? '关键' : 
                           event.importance === 'important' ? '重要' : '一般'}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* 展开指示器 */}
              {!isExpanded && event.description && (
                <div className="flex items-center justify-center mt-2 text-xs text-gray-400">
                  <ChevronDown className="w-3 h-3" />
                </div>
              )}
            </Card>
          </div>
        </div>
      </motion.div>
    )
  }

  // 渲染阶段组（enhanced模式）
  const renderPhaseGroup = (phase: TimelinePhase, phaseIndex: number) => {
    const isCollapsed = collapsedPhases.has(phase.id)
    
    return (
      <div key={phase.id} className="mb-8">
        {/* 阶段标题 */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => {
              const newCollapsed = new Set(collapsedPhases)
              if (isCollapsed) {
                newCollapsed.delete(phase.id)
              } else {
                newCollapsed.add(phase.id)
              }
              setCollapsedPhases(newCollapsed)
            }}
            className="flex items-center gap-2 text-lg font-semibold"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            {phase.name}
            <Badge variant="secondary" className="ml-2">
              {phase.events.length}
            </Badge>
          </Button>
          <div className="text-sm text-gray-500">{phase.dateRange}</div>
        </div>

        {/* 阶段事件 */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4"
            >
              {phase.events.map((event, index) => (
                <div key={event.id} className="relative ml-4">
                  {/* 垂直连接线 */}
                  {index < phase.events.length - 1 && (
                    <div className="absolute left-3 top-8 w-0.5 h-full bg-gray-200" />
                  )}
                  {renderEvent(event, index, true)}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
    <div className={`space-y-4 ${className}`}>
      {/* 标题和过滤器 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">案件时间轴</h3>
        <div className="flex items-center gap-2">
          {mode === 'enhanced' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">全部事件</option>
              <option value="critical">关键事件</option>
              <option value="important">重要事件</option>
              <option value="fact">事实</option>
              <option value="procedure">程序</option>
              <option value="evidence">证据</option>
            </select>
          )}
          <Badge variant="outline" className="text-sm">
            共 {filteredEvents.length} 个事件
          </Badge>
        </div>
      </div>
      
      {/* 时间轴内容 */}
      {mode === 'simple' ? (
        /* 简化模式：水平时间轴 */
        <div className="relative">
          <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200" />
          <div className="relative flex justify-between items-start pb-4">
            {filteredEvents.map((event, index) => renderEvent(event, index))}
          </div>
        </div>
      ) : (
        /* 增强模式：按阶段分组 */
        <div className="space-y-6">
          {groupedByPhase.map((phase, index) => renderPhaseGroup(phase, index))}
        </div>
      )}
      
      {/* 统计信息 */}
      <Card className="p-4 mt-6 bg-gradient-to-r from-blue-50 to-purple-50">
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
              {events.filter(e => e.importance === 'critical').length} 个
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}