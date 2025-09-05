'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Circle,
  ArrowRight,
  Scale,
  BookOpen,
  Timer,
  Brain,
  Loader2,
  Sparkles
} from 'lucide-react'

interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'fact' | 'procedure' | 'evidence' | 'decision' | 'legal'
  importance: 'high' | 'medium' | 'low'
  actor?: string
  // 法学思维要素
  legalAnalysis?: {
    legalRelation?: string // 法律关系
    burdenOfProof?: string // 举证责任
    limitation?: string // 时效计算
    claims?: string[] // 各方主张
    keyPoint?: string // 关键法律点
  }
  // 因果关系
  relatedTo?: string[] // 关联事件ID
}

export function CaseTimelineSimplified() {
  const caseData = useCaseStore(state => state.caseData)
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({})
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null)
  
  // 从案件数据中提取时间线事件
  const extractTimelineEvents = (): TimelineEvent[] => {
    if (!caseData) return []
    
    const events: TimelineEvent[] = []
    
    // 从事实中提取时间点 - 增强法学要素提取
    if (caseData.threeElements?.facts?.timeline) {
      caseData.threeElements.facts.timeline.forEach((item: any, index: number) => {
        const event: TimelineEvent = {
          id: `fact-${index}`,
          date: item.date,
          title: item.event,
          description: item.detail || '',
          type: 'fact',
          importance: item.isKeyEvent ? 'high' : 'medium',
          actor: item.party
        }
        
        // 提取法学要素
        if (item.legalAnalysis) {
          event.legalAnalysis = item.legalAnalysis
        }
        
        // 智能识别法律要素
        if (item.detail) {
          const detail = item.detail.toLowerCase()
          const legalAnalysis: any = {}
          
          // 识别法律关系
          if (detail.includes('合同') || detail.includes('协议')) {
            legalAnalysis.legalRelation = '合同关系'
          } else if (detail.includes('侵权') || detail.includes('损害')) {
            legalAnalysis.legalRelation = '侵权关系'
          }
          
          // 识别举证责任
          if (detail.includes('证明') || detail.includes('举证')) {
            legalAnalysis.burdenOfProof = item.party || '当事方'
          }
          
          // 识别时效
          if (detail.includes('期限') || detail.includes('时效')) {
            const match = detail.match(/(\d+)[天日月年]/)
            if (match) {
              legalAnalysis.limitation = match[0]
            }
          }
          
          if (Object.keys(legalAnalysis).length > 0) {
            event.legalAnalysis = legalAnalysis
          }
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
        actor: '法院'
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
        actor: '法院'
      })
    }
    
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  
  const events = extractTimelineEvents()
  
  const getEventColor = (type: string, importance: string = 'medium') => {
    // 使用完整的类名避免动态生成
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
  
  const getEventBorderColor = (type: string) => {
    switch (type) {
      case 'fact': return 'border-blue-200'
      case 'procedure': return 'border-purple-200'
      case 'evidence': return 'border-yellow-200'
      case 'decision': return 'border-green-200'
      case 'legal': return 'border-indigo-200'
      default: return 'border-gray-200'
    }
  }
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'fact': return <FileText className="w-4 h-4" />
      case 'procedure': return <Gavel className="w-4 h-4" />
      case 'evidence': return <Scale className="w-4 h-4" />
      case 'decision': return <AlertCircle className="w-4 h-4" />
      case 'legal': return <BookOpen className="w-4 h-4" />
      default: return <Circle className="w-4 h-4" />
    }
  }
  
  const getEventLabel = (type: string) => {
    switch (type) {
      case 'fact': return '事实'
      case 'procedure': return '程序'
      case 'evidence': return '证据'
      case 'decision': return '判决'
      case 'legal': return '法律'
      default: return '其他'
    }
  }
  
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
    // 如果有AI分析的摘要，使用AI摘要
    if (aiAnalysis[event.id]?.summary) {
      return aiAnalysis[event.id].summary
    }
    
    // 否则生成默认摘要
    const desc = event.description || event.title
    if (desc.length <= 40) return desc
    
    // 提取关键信息
    const amount = desc.match(/(\d+[\.\d]*万?元)/)?.[0] || ''
    const action = event.title
    const party = event.actor || ''
    
    return `${party}${action}${amount ? `，涉及${amount}` : ''}`.slice(0, 40)
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
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">案件时间轴</h3>
        <Badge variant="outline" className="text-sm">
          共 {events.length} 个事件
        </Badge>
      </div>
      
      {/* 时间轴主体 - 水平布局 */}
      <div className="relative">
        {/* 水平时间线 */}
        <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200" />
        
        {/* 时间节点 */}
        <div className="relative flex justify-between items-start pb-4">
          {events.map((event, index) => {
            const isExpanded = expandedNodeId === event.id
            const isKeyEvent = event.importance === 'high'
            
            return (
              <motion.div
                key={event.id}
                className="flex-1 min-w-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* 节点容器 */}
                <div className="relative">
                  {/* 连接线 */}
                  <div className="absolute top-12 left-1/2 w-0.5 h-6 bg-gray-300 -translate-x-1/2" />
                  
                  {/* 时间节点圆点 - 增强视觉效果 */}
                  <motion.div
                    className={`relative mx-auto w-6 h-6 rounded-full border-4 border-white shadow-lg cursor-pointer z-10 ${getEventColor(event.type, event.importance)}`}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleNodeClick(event.id)}
                  >
                    {isKeyEvent && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-current opacity-50"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  
                  {/* 内容卡片 - 重要内容在左，时间在右 */}
                  <div className="mt-8 px-2">
                    <Card 
                      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                        isExpanded ? 'ring-2 ring-blue-400 shadow-lg' : ''
                      }`}
                      onClick={() => handleNodeClick(event.id, event)}
                    >
                      {/* 标题和时间 - 调换位置 */}
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
                      
                      {/* 默认显示摘要 */}
                      {!isExpanded && (
                        <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                          {generateSummary(event)}
                          {event.importance === 'high' && (
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
                                  <span className="text-sm text-gray-500">AI正在分析法律要点...</span>
                                </div>
                              ) : aiAnalysis[event.id] ? (
                                <div className="space-y-3">
                                  {/* AI分析的法学要点 */}
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
                                  
                                  {/* 相关法条 */}
                                  {aiAnalysis[event.id].legalBasis && aiAnalysis[event.id].legalBasis.length > 0 && (
                                    <div className="p-3 bg-purple-50 rounded-md">
                                      <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="w-4 h-4 text-purple-600" />
                                        <span className="font-medium text-sm text-purple-900">相关法条</span>
                                      </div>
                                      <ul className="space-y-1">
                                        {aiAnalysis[event.id].legalBasis.map((law: string, idx: number) => (
                                          <li key={idx} className="text-xs text-purple-800">
                                            • {law}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {/* 深度分析 */}
                                  {aiAnalysis[event.id].analysis && (
                                    <div className="p-3 bg-gray-50 rounded-md space-y-2">
                                      {aiAnalysis[event.id].analysis.legalRelation && (
                                        <div className="text-xs">
                                          <span className="font-medium text-gray-700">法律关系：</span>
                                          <span className="text-gray-600 ml-1">{aiAnalysis[event.id].analysis.legalRelation}</span>
                                        </div>
                                      )}
                                      {aiAnalysis[event.id].analysis.burdenOfProof && (
                                        <div className="text-xs">
                                          <span className="font-medium text-gray-700">举证责任：</span>
                                          <span className="text-gray-600 ml-1">{aiAnalysis[event.id].analysis.burdenOfProof}</span>
                                        </div>
                                      )}
                                      {aiAnalysis[event.id].analysis.keyPoint && (
                                        <div className="text-xs">
                                          <span className="font-medium text-gray-700">关键点：</span>
                                          <span className="text-gray-600 ml-1">{aiAnalysis[event.id].analysis.keyPoint}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : event.legalAnalysis && (
                                <div className="space-y-2 mb-3 p-2 bg-gray-50 rounded-md">
                                  {event.legalAnalysis.legalRelation && (
                                    <div className="flex items-start gap-2 text-xs">
                                      <Scale className="w-3 h-3 text-indigo-600 mt-0.5" />
                                      <div>
                                        <span className="font-medium text-gray-700">法律关系：</span>
                                        <span className="text-gray-600">{event.legalAnalysis.legalRelation}</span>
                                      </div>
                                    </div>
                                  )}
                                  {event.legalAnalysis.burdenOfProof && (
                                    <div className="flex items-start gap-2 text-xs">
                                      <FileText className="w-3 h-3 text-purple-600 mt-0.5" />
                                      <div>
                                        <span className="font-medium text-gray-700">举证责任：</span>
                                        <span className="text-gray-600">{event.legalAnalysis.burdenOfProof}</span>
                                      </div>
                                    </div>
                                  )}
                                  {event.legalAnalysis.limitation && (
                                    <div className="flex items-start gap-2 text-xs">
                                      <Timer className="w-3 h-3 text-orange-600 mt-0.5" />
                                      <div>
                                        <span className="font-medium text-gray-700">时效期间：</span>
                                        <span className="text-gray-600">{event.legalAnalysis.limitation}</span>
                                      </div>
                                    </div>
                                  )}
                                  {event.legalAnalysis.claims && event.legalAnalysis.claims.length > 0 && (
                                    <div className="text-xs">
                                      <span className="font-medium text-gray-700">各方主张：</span>
                                      <ul className="mt-1 space-y-1">
                                        {event.legalAnalysis.claims.map((claim, idx) => (
                                          <li key={idx} className="text-gray-600 pl-3">• {claim}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1">
                                  {getEventIcon(event.type)}
                                  <Badge 
                                    variant="outline"
                                    className={`text-xs ${getEventBorderColor(event.type)}`}
                                  >
                                    {getEventLabel(event.type)}
                                  </Badge>
                                </div>
                                <Badge 
                                  variant={event.importance === 'high' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {event.importance === 'high' ? '关键' : 
                                   event.importance === 'medium' ? '重要' : '一般'}
                                </Badge>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* 展开/收起指示器 */}
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
          })}
        </div>
      </div>
      
      {/* 垂直布局（移动端） */}
      <div className="lg:hidden space-y-4 mt-8">
        {events.map((event, index) => {
          const isExpanded = expandedNodeId === event.id
          const isKeyEvent = event.importance === 'high'
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              {/* 垂直连接线 */}
              {index < events.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-full bg-gradient-to-b from-blue-200 to-transparent" />
              )}
              
              <div className="flex gap-4">
                {/* 时间节点 */}
                <div className="flex-shrink-0">
                  <motion.div
                    className={`w-8 h-8 rounded-full border-4 border-white shadow-lg cursor-pointer ${getEventColor(event.type)}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNodeClick(event.id)}
                  >
                    {isKeyEvent && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-current opacity-50"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                </div>
                
                {/* 内容卡片 */}
                <Card 
                  className={`flex-1 p-4 cursor-pointer transition-all hover:shadow-md ${
                    isExpanded ? 'ring-2 ring-blue-400 shadow-lg' : ''
                  }`}
                  onClick={() => handleNodeClick(event.id, event)}
                >
                  {/* 标题行 - 内容在左，时间在右 */}
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
                      {isKeyEvent && (
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
                          
                          {/* 法学要素展示 */}
                          {event.legalAnalysis && (
                            <div className="space-y-2 mb-3 p-2 bg-gray-50 rounded-md">
                              {event.legalAnalysis.legalRelation && (
                                <div className="flex items-start gap-2 text-xs">
                                  <Scale className="w-3 h-3 text-indigo-600 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-gray-700">法律关系：</span>
                                    <span className="text-gray-600">{event.legalAnalysis.legalRelation}</span>
                                  </div>
                                </div>
                              )}
                              {event.legalAnalysis.burdenOfProof && (
                                <div className="flex items-start gap-2 text-xs">
                                  <FileText className="w-3 h-3 text-purple-600 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-gray-700">举证责任：</span>
                                    <span className="text-gray-600">{event.legalAnalysis.burdenOfProof}</span>
                                  </div>
                                </div>
                              )}
                              {event.legalAnalysis.limitation && (
                                <div className="flex items-start gap-2 text-xs">
                                  <Timer className="w-3 h-3 text-orange-600 mt-0.5" />
                                  <div>
                                    <span className="font-medium text-gray-700">时效期间：</span>
                                    <span className="text-gray-600">{event.legalAnalysis.limitation}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* 展开/收起指示器 */}
                  <div className="flex items-center justify-end mt-2">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </Card>
              </div>
            </motion.div>
          )
        })}
      </div>
      
      {/* 简单的统计信息 */}
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
              {events.filter(e => e.importance === 'high').length} 个
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}