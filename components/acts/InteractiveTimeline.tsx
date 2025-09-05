'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { TimelineEvent, TimelineAnalysis, ViewPerspective } from '@/types/legal-case'
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  FileText,
  Scale,
  Shield,
  Brain,
  Users,
  ChevronRight,
  Info,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Gavel,
  BookOpen,
  Star
} from 'lucide-react'

interface TimelineEventExtended {
  id: string
  date: string
  title: string
  description: string
  type: 'fact' | 'procedure' | 'evidence' | 'decision'
  importance: 'high' | 'medium' | 'low'
  actor?: string
  isKeyLearningNode?: boolean
  teachingPoints?: string[]
}

interface InteractiveTimelineProps {
  events: TimelineEventExtended[]
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onAnalyzeEvent?: (event: TimelineEventExtended) => void
  perspective?: ViewPerspective
  teachingMode?: boolean
  completedNodes?: Set<string>
  analysisLoading?: Map<string, boolean>
  eventAnalyses?: Map<string, TimelineAnalysis>
  className?: string
}

export function InteractiveTimeline({
  events,
  selectedNodeId,
  onNodeClick,
  onAnalyzeEvent,
  perspective = 'neutral',
  teachingMode = false,
  completedNodes = new Set(),
  analysisLoading = new Map(),
  eventAnalyses = new Map(),
  className
}: InteractiveTimelineProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  
  // 获取事件图标
  const getEventIcon = useCallback((type: string) => {
    switch (type) {
      case 'fact': return <FileText className="w-4 h-4" />
      case 'procedure': return <Gavel className="w-4 h-4" />
      case 'evidence': return <BookOpen className="w-4 h-4" />
      case 'decision': return <Scale className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }, [])
  
  // 获取事件颜色配置
  const getEventColorScheme = useCallback((type: string, importance: string) => {
    const baseColors = {
      fact: { bg: 'bg-blue-500', border: 'border-blue-300', text: 'text-blue-700', light: 'bg-blue-50' },
      procedure: { bg: 'bg-purple-500', border: 'border-purple-300', text: 'text-purple-700', light: 'bg-purple-50' },
      evidence: { bg: 'bg-yellow-500', border: 'border-yellow-300', text: 'text-yellow-700', light: 'bg-yellow-50' },
      decision: { bg: 'bg-green-500', border: 'border-green-300', text: 'text-green-700', light: 'bg-green-50' }
    }
    
    const importanceModifier = {
      high: { ring: 'ring-red-200', badge: 'bg-red-100 text-red-800', pulse: true },
      medium: { ring: 'ring-orange-200', badge: 'bg-orange-100 text-orange-800', pulse: false },
      low: { ring: 'ring-gray-200', badge: 'bg-gray-100 text-gray-700', pulse: false }
    }
    
    return {
      ...baseColors[type as keyof typeof baseColors] || baseColors.fact,
      ...importanceModifier[importance as keyof typeof importanceModifier] || importanceModifier.low
    }
  }, [])
  
  // 判断是否需要显示连线
  const shouldShowConnection = useCallback((event: TimelineEventExtended, nextEvent?: TimelineEventExtended) => {
    if (!nextEvent) return false
    
    // 判断因果关系
    const keywords = ['导致', '因此', '所以', '引起', '造成']
    return keywords.some(keyword => 
      nextEvent.description?.includes(keyword) || 
      event.description?.includes(keyword)
    )
  }, [])
  
  // 处理节点点击
  const handleNodeClick = useCallback((event: TimelineEventExtended) => {
    if (expandingNodeId === event.id) return // 防止重复点击
    
    setExpandingNodeId(event.id)
    
    // 添加展开动画延迟
    setTimeout(() => {
      onNodeClick(event.id)
      if (onAnalyzeEvent && selectedNodeId !== event.id) {
        onAnalyzeEvent(event)
      }
      setExpandingNodeId(null)
    }, 200)
  }, [expandingNodeId, onNodeClick, onAnalyzeEvent, selectedNodeId])
  
  // 渲染时间节点
  const renderTimelineNode = useCallback((event: TimelineEventExtended, index: number) => {
    const isSelected = selectedNodeId === event.id
    const isHovered = hoveredNodeId === event.id
    const isCompleted = completedNodes.has(event.id)
    const isLoading = analysisLoading.get(event.id)
    const hasAnalysis = eventAnalyses.has(`${event.id}-${perspective}`)
    const colorScheme = getEventColorScheme(event.type, event.importance)
    const nextEvent = events[index + 1]
    const showConnection = shouldShowConnection(event, nextEvent)
    
    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="relative"
      >
        {/* 连线 */}
        {showConnection && (
          <div className="absolute left-4 top-8 w-0.5 h-16 bg-gradient-to-b from-orange-300 to-orange-100">
            <motion.div
              className="absolute inset-0 bg-orange-400"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
          </div>
        )}
        
        {/* 时间节点圆点 */}
        <motion.div
          className={cn(
            "absolute left-2 w-4 h-4 rounded-full border-2 border-white cursor-pointer z-20",
            colorScheme.bg,
            isSelected && "scale-150 ring-4",
            isSelected && colorScheme.ring,
            isCompleted && teachingMode && "ring-2 ring-green-300"
          )}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleNodeClick(event)}
          onMouseEnter={() => setHoveredNodeId(event.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
        >
          {colorScheme.pulse && event.importance === 'high' && !isSelected && (
            <motion.div
              className={cn("absolute inset-0 rounded-full", colorScheme.bg)}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
        
        {/* 时间节点卡片 */}
        <div className="ml-8">
          <motion.div
            layout
            className={cn(
              "bg-white border-2 rounded-lg shadow-sm transition-all",
              isSelected ? "border-blue-400 shadow-xl" : colorScheme.border,
              "hover:shadow-lg"
            )}
            animate={{
              scale: expandingNodeId === event.id ? 1.02 : 1,
              y: isSelected ? -2 : 0
            }}
          >
            <div className="p-4">
              {/* 标题行 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  {getEventIcon(event.type)}
                  <h4 className="font-semibold text-gray-800">{event.title}</h4>
                  
                  {/* 标签 */}
                  <div className="flex gap-1">
                    {teachingMode && event.isKeyLearningNode && (
                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                        <Brain className="w-3 h-3 mr-1" />
                        关键
                      </Badge>
                    )}
                    {hasAnalysis && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        <Sparkles className="w-3 h-3 mr-1" />
                        已分析
                      </Badge>
                    )}
                    {isCompleted && teachingMode && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </div>
                
                {/* 时间和重要性 */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={colorScheme.badge}>
                    {event.importance === 'high' ? (
                      <><Star className="w-3 h-3 mr-1" />关键</>
                    ) : event.importance === 'medium' ? '重要' : '一般'}
                  </Badge>
                  <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {event.date}
                  </span>
                </div>
              </div>
              
              {/* 描述 */}
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {event.description}
              </p>
              
              {/* 参与方和快速操作 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {event.actor && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{event.actor}</span>
                    </div>
                  )}
                  
                  {/* 视角相关性指示器 */}
                  {perspective !== 'neutral' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className={cn(
                            "flex items-center gap-1 text-xs px-2 py-1 rounded",
                            perspective === 'plaintiff' ? colorScheme.light + ' ' + colorScheme.text :
                            perspective === 'defendant' ? 'bg-orange-50 text-orange-700' :
                            'bg-purple-50 text-purple-700'
                          )}>
                            {perspective === 'plaintiff' ? <User className="w-3 h-3" /> :
                             perspective === 'defendant' ? <Shield className="w-3 h-3" /> :
                             <Scale className="w-3 h-3" />}
                            相关度高
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>该事件对{
                            perspective === 'plaintiff' ? '原告' :
                            perspective === 'defendant' ? '被告' : '法官'
                          }视角特别重要</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                {/* 点击提示 */}
                {!isSelected && (
                  <motion.div
                    className="flex items-center gap-1 text-xs text-blue-600 cursor-pointer"
                    whileHover={{ x: 2 }}
                  >
                    <span>点击查看分析</span>
                    <ChevronRight className="w-3 h-3" />
                  </motion.div>
                )}
                
                {isLoading && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-3 h-3" />
                    </motion.div>
                    <span>分析中...</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Hover预览 */}
            <AnimatePresence>
              {isHovered && !isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-100 overflow-hidden"
                >
                  <div className="p-3 bg-gray-50">
                    <p className="text-xs text-gray-600">
                      {event.type === 'fact' && '🔍 关键事实：可能影响案件走向'}
                      {event.type === 'procedure' && '⚖️ 程序事项：注意诉讼时效'}
                      {event.type === 'evidence' && '📋 证据提交：影响举证责任'}
                      {event.type === 'decision' && '🎯 裁判结果：最终判决'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    )
  }, [
    selectedNodeId,
    hoveredNodeId,
    completedNodes,
    analysisLoading,
    eventAnalyses,
    perspective,
    teachingMode,
    expandingNodeId,
    events,
    getEventIcon,
    getEventColorScheme,
    shouldShowConnection,
    handleNodeClick
  ])
  
  return (
    <div ref={timelineRef} className={cn("relative pl-8", className)}>
      {/* 时间轴主线 */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-200 via-blue-200 to-green-200" />
      
      {/* 时间节点列表 */}
      <div className="space-y-6">
        {events.map((event, index) => renderTimelineNode(event, index))}
      </div>
      
      {/* 空状态 */}
      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">暂无时间轴数据</p>
          <p className="text-sm">请先上传并解析判决书文件</p>
        </div>
      )}
    </div>
  )
}