'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { TimelineEvent } from '@/types/timeline-claim-analysis'
import {
  Scale,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Gavel,
  Shield,
  BookOpen,
  Users,
  Circle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Link2,
  Zap
} from 'lucide-react'

interface TimelineNodeProps {
  event: TimelineEvent
  isSelected?: boolean
  isExpanded?: boolean
  showClaimAnnotations?: boolean
  perspective?: 'neutral' | 'plaintiff' | 'defendant' | 'judge'
  onSelect?: (event: TimelineEvent) => void
  onToggleExpanded?: (eventId: string) => void
  className?: string
}

interface ClaimAnnotation {
  id: string
  type: 'claim' | 'defense' | 'relation-change' | 'limitation'
  label: string
  description: string
  basis?: string[]
  importance: 'high' | 'medium' | 'low'
  color: string
}

export function TimelineNode({
  event,
  isSelected = false,
  isExpanded = false,
  showClaimAnnotations = true,
  perspective = 'neutral',
  onSelect,
  onToggleExpanded,
  className
}: TimelineNodeProps) {
  const [showDetails, setShowDetails] = useState(false)

  // 生成请求权标注
  const claimAnnotations = useMemo<ClaimAnnotation[]>(() => {
    if (!showClaimAnnotations) return []

    const annotations: ClaimAnnotation[] = []

    // 基于事件的请求权信息生成标注
    if (event.claims) {
      // 主请求权
      if (event.claims.elements.length > 0) {
        annotations.push({
          id: `claim-${event.id}`,
          type: 'claim',
          label: event.claims.type === 'contractual' ? '合同请求权' :
                 event.claims.type === 'tort' ? '侵权请求权' :
                 event.claims.type === 'unjust-enrichment' ? '不当得利请求权' :
                 event.claims.type === 'property' ? '物权请求权' : '其他请求权',
          description: `基于${event.claims.basis.join('、')}的请求权`,
          basis: event.claims.basis,
          importance: event.claims.fulfilled ? 'high' : 'medium',
          color: event.claims.fulfilled ? 'bg-green-100 text-green-800 border-green-300' :
                                        'bg-yellow-100 text-yellow-800 border-yellow-300'
        })
      }
    }

    // 法律关系变化
    if (event.legalRelation) {
      annotations.push({
        id: `relation-${event.id}`,
        type: 'relation-change',
        label: `${event.legalRelation.change === 'created' ? '设立' :
                 event.legalRelation.change === 'modified' ? '变更' : '终止'}${event.legalRelation.type}`,
        description: event.legalRelation.description || `法律关系${event.legalRelation.change === 'created' ? '设立' : 
                     event.legalRelation.change === 'modified' ? '变更' : '终止'}`,
        importance: 'high',
        color: 'bg-blue-100 text-blue-800 border-blue-300'
      })
    }

    // 举证责任
    if (event.burdenOfProof) {
      annotations.push({
        id: `proof-${event.id}`,
        type: 'defense',
        label: `举证责任：${event.burdenOfProof.party}`,
        description: `举证标准：${event.burdenOfProof.standard}`,
        importance: event.burdenOfProof.satisfied ? 'medium' : 'high',
        color: event.burdenOfProof.satisfied ? 'bg-green-100 text-green-800 border-green-300' :
                                             'bg-red-100 text-red-800 border-red-300'
      })
    }

    // 时效相关
    if (event.limitation) {
      const isNearExpiry = event.limitation.suspended || event.limitation.interrupted
      annotations.push({
        id: `limitation-${event.id}`,
        type: 'limitation',
        label: `时效期间${event.limitation.period}月`,
        description: `起算日：${event.limitation.startDate}${isNearExpiry ? '（有中止/中断）' : ''}`,
        importance: isNearExpiry ? 'high' : 'medium',
        color: isNearExpiry ? 'bg-orange-100 text-orange-800 border-orange-300' :
                             'bg-gray-100 text-gray-800 border-gray-300'
      })
    }

    return annotations
  }, [event, showClaimAnnotations])

  // 获取事件节点的视觉样式
  const getNodeStyle = () => {
    const baseStyle = "w-8 h-8 rounded-full border-4 border-white shadow-lg cursor-pointer transition-all duration-200"
    
    if (isSelected) {
      return `${baseStyle} ring-4 ring-blue-300 ring-opacity-50`
    }

    // 根据重要性和类型确定颜色
    if (event.importance === 'critical') {
      switch (event.type) {
        case 'fact': return `${baseStyle} bg-blue-600 hover:bg-blue-700`
        case 'procedure': return `${baseStyle} bg-purple-600 hover:bg-purple-700`
        case 'evidence': return `${baseStyle} bg-yellow-600 hover:bg-yellow-700`
        case 'filing': return `${baseStyle} bg-green-600 hover:bg-green-700`
        case 'judgment': return `${baseStyle} bg-red-600 hover:bg-red-700`
        default: return `${baseStyle} bg-gray-600 hover:bg-gray-700`
      }
    } else if (event.importance === 'important') {
      switch (event.type) {
        case 'fact': return `${baseStyle} bg-blue-500 hover:bg-blue-600`
        case 'procedure': return `${baseStyle} bg-purple-500 hover:bg-purple-600`
        case 'evidence': return `${baseStyle} bg-yellow-500 hover:bg-yellow-600`
        case 'filing': return `${baseStyle} bg-green-500 hover:bg-green-600`
        case 'judgment': return `${baseStyle} bg-red-500 hover:bg-red-600`
        default: return `${baseStyle} bg-gray-500 hover:bg-gray-600`
      }
    } else {
      switch (event.type) {
        case 'fact': return `${baseStyle} bg-blue-400 hover:bg-blue-500`
        case 'procedure': return `${baseStyle} bg-purple-400 hover:bg-purple-500`
        case 'evidence': return `${baseStyle} bg-yellow-400 hover:bg-yellow-500`
        case 'filing': return `${baseStyle} bg-green-400 hover:bg-green-500`
        case 'judgment': return `${baseStyle} bg-red-400 hover:bg-red-500`
        default: return `${baseStyle} bg-gray-400 hover:bg-gray-500`
      }
    }
  }

  // 获取事件图标
  const getEventIcon = () => {
    switch (event.type) {
      case 'fact': return <FileText className="w-4 h-4 text-white" />
      case 'procedure': return <Gavel className="w-4 h-4 text-white" />
      case 'evidence': return <Scale className="w-4 h-4 text-white" />
      case 'filing': return <AlertTriangle className="w-4 h-4 text-white" />
      case 'judgment': return <CheckCircle className="w-4 h-4 text-white" />
      case 'legal': return <BookOpen className="w-4 h-4 text-white" />
      default: return <Circle className="w-4 h-4 text-white" />
    }
  }

  const handleNodeClick = () => {
    if (onSelect) {
      onSelect(event)
    }
    if (onToggleExpanded) {
      onToggleExpanded(event.id)
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* 时间节点 */}
      <motion.div
        className={getNodeStyle()}
        onClick={handleNodeClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          scale: isSelected ? 1.1 : 1,
          rotate: event.importance === 'critical' ? [0, 5, -5, 0] : 0
        }}
        transition={{
          rotate: {
            duration: 2,
            repeat: event.importance === 'critical' ? Infinity : 0,
            ease: "easeInOut"
          }
        }}
        title={`${event.title} - ${event.date}${event.actor ? ` (${event.actor})` : ''}`}
      >
        {getEventIcon()}
        
        {/* 关键事件的光环效果 */}
        {event.importance === 'critical' && (
          <motion.div
            className="absolute inset-0 rounded-full bg-current opacity-30"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      {/* 请求权标注标签 */}
      {showClaimAnnotations && claimAnnotations.length > 0 && (
        <div className="absolute -top-2 left-full ml-2 flex flex-col gap-1 min-w-0">
          {claimAnnotations.map((annotation, index) => (
            <motion.div
              key={annotation.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium border whitespace-nowrap cursor-help",
                annotation.color
              )}
              title={`${annotation.label} - ${annotation.description}${annotation.basis ? ` (法条依据: ${annotation.basis.join('、')})` : ''}`}
            >
              <div className="flex items-center gap-1">
                {annotation.type === 'claim' && <Target className="w-3 h-3" />}
                {annotation.type === 'defense' && <Shield className="w-3 h-3" />}
                {annotation.type === 'relation-change' && <Link2 className="w-3 h-3" />}
                {annotation.type === 'limitation' && <Clock className="w-3 h-3" />}
                <span className="truncate max-w-24">{annotation.label}</span>
                {annotation.importance === 'high' && <Zap className="w-3 h-3" />}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 详细信息卡片 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 left-0 z-20 w-80"
          >
            <Card className="shadow-lg border-2 border-blue-200">
              <CardContent className="p-4">
                {/* 标题 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{event.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{event.date}</span>
                      {event.actor && (
                        <>
                          <span>•</span>
                          <span>{event.actor}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleExpanded?.(event.id)}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                </div>

                {/* 描述 */}
                <p className="text-sm text-gray-700 mb-3">{event.description}</p>

                {/* 请求权详细信息 */}
                {event.claims && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <h5 className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      请求权分析
                    </h5>
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="font-medium">类型：</span>
                        <Badge variant="outline" className="ml-1 text-xs">
                          {event.claims.type === 'contractual' ? '合同请求权' :
                           event.claims.type === 'tort' ? '侵权请求权' :
                           event.claims.type === 'unjust-enrichment' ? '不当得利请求权' :
                           event.claims.type === 'property' ? '物权请求权' : '其他请求权'}
                        </Badge>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">法条依据：</span>
                        <span className="ml-1">{event.claims.basis.join('、')}</span>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">构成要件：</span>
                        <span className={cn(
                          "ml-1 px-1 py-0.5 rounded text-xs",
                          event.claims.fulfilled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        )}>
                          {event.claims.fulfilled ? '已满足' : '部分满足'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 法律关系变化 */}
                {event.legalRelation && (
                  <div className="mb-3 p-3 bg-purple-50 rounded-md border border-purple-200">
                    <h5 className="text-xs font-semibold text-purple-900 mb-2 flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      法律关系变化
                    </h5>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="font-medium">关系类型：</span>
                        <span className="ml-1">{event.legalRelation.type}</span>
                      </div>
                      <div>
                        <span className="font-medium">变化性质：</span>
                        <Badge variant="outline" className="ml-1 text-xs">
                          {event.legalRelation.change === 'created' ? '设立' :
                           event.legalRelation.change === 'modified' ? '变更' : '终止'}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">涉及当事人：</span>
                        <span className="ml-1">{event.legalRelation.parties.join('、')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 视角相关提示 */}
                {perspective !== 'neutral' && (
                  <div className={cn(
                    "p-2 rounded-md text-xs",
                    perspective === 'plaintiff' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                    perspective === 'defendant' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
                    'bg-purple-50 text-purple-800 border border-purple-200'
                  )}>
                    <div className="flex items-center gap-1 font-medium mb-1">
                      {perspective === 'plaintiff' ? <User className="w-3 h-3" /> :
                       perspective === 'defendant' ? <Shield className="w-3 h-3" /> :
                       <Scale className="w-3 h-3" />}
                      {perspective === 'plaintiff' ? '原告关注点' :
                       perspective === 'defendant' ? '被告关注点' : '法官关注点'}
                    </div>
                    <p>
                      {perspective === 'plaintiff' ? '重点关注权利主张的成立要件和证据支持' :
                       perspective === 'defendant' ? '重点关注抗辩理由和免责事由' :
                       '重点关注事实认定和法律适用的准确性'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}