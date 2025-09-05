'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { TimelineEvent, TimelineAnalysis, ViewPerspective } from '@/types/legal-case'
import {
  FileText,
  Scale,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Gavel,
  Shield,
  Target,
  Brain,
  BookOpen,
  TrendingUp,
  Calendar,
  AlertCircle,
  Sparkles,
  Users,
  FileCheck
} from 'lucide-react'

interface TimelineEventDetail {
  id: string
  date: string
  title: string
  description: string
  type: string
  importance: string
  actor?: string
  isKeyLearningNode?: boolean
}

interface TimelineNodeDetailProps {
  event: TimelineEventDetail
  analysis?: TimelineAnalysis
  perspective?: ViewPerspective
  teachingMode?: boolean
  onClose?: () => void
  className?: string
}

interface LegalElement {
  id: string
  label: string
  value: string | number
  description?: string
  icon: React.ReactNode
  importance: 'high' | 'medium' | 'low'
}

export function TimelineNodeDetail({
  event,
  analysis,
  perspective = 'neutral',
  teachingMode = false,
  onClose,
  className
}: TimelineNodeDetailProps) {
  const [expandedSection, setExpandedSection] = useState<string>('basic')
  const [activeTab, setActiveTab] = useState('facts')
  
  // 计算法律要素
  const legalElements = useMemo<LegalElement[]>(() => {
    const elements: LegalElement[] = []
    
    // 法律关系
    elements.push({
      id: 'legal-relation',
      label: '法律关系',
      value: analysis?.legalAnalysis?.legalRelation || '待分析',
      description: '当事人之间的权利义务关系',
      icon: <Users className="w-4 h-4" />,
      importance: 'high'
    })
    
    // 举证责任
    elements.push({
      id: 'burden-of-proof',
      label: '举证责任',
      value: analysis?.legalAnalysis?.burdenOfProof || '待确定',
      description: '需要承担举证责任的一方',
      icon: <FileCheck className="w-4 h-4" />,
      importance: event.type === 'evidence' ? 'high' : 'medium'
    })
    
    // 时效计算
    if (event.type === 'procedure' || event.type === 'fact') {
      const daysPassed = Math.floor(
        (new Date().getTime() - new Date(event.date).getTime()) / (1000 * 60 * 60 * 24)
      )
      elements.push({
        id: 'limitation',
        label: '时效期间',
        value: `已过${daysPassed}天`,
        description: '距今时间，注意诉讼时效',
        icon: <Clock className="w-4 h-4" />,
        importance: daysPassed > 730 ? 'high' : 'medium'
      })
    }
    
    // 重要性评分
    if (analysis?.importance?.score) {
      elements.push({
        id: 'importance-score',
        label: '重要性评分',
        value: analysis.importance.score,
        description: analysis.importance.reason,
        icon: <TrendingUp className="w-4 h-4" />,
        importance: analysis.importance.score >= 80 ? 'high' : 
                   analysis.importance.score >= 50 ? 'medium' : 'low'
      })
    }
    
    return elements
  }, [event, analysis])
  
  // 渐进式信息层级
  const informationLayers = useMemo(() => {
    return {
      basic: {
        label: '基础信息',
        icon: <Info className="w-4 h-4" />,
        content: (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">事件类型</span>
              <Badge variant="outline">{event.type}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">发生日期</span>
              <span className="text-sm font-medium">{event.date}</span>
            </div>
            {event.actor && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">参与方</span>
                <span className="text-sm font-medium">{event.actor}</span>
              </div>
            )}
            <Separator />
            <p className="text-sm text-gray-700">{event.description}</p>
          </div>
        )
      },
      legal: {
        label: '法律分析',
        icon: <Scale className="w-4 h-4" />,
        content: analysis?.legalAnalysis ? (
          <div className="space-y-4">
            {/* 法学要素网格 */}
            <div className="grid grid-cols-2 gap-3">
              {legalElements.map(element => (
                <div
                  key={element.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    element.importance === 'high' ? 'border-red-200 bg-red-50' :
                    element.importance === 'medium' ? 'border-orange-200 bg-orange-50' :
                    'border-gray-200 bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {element.icon}
                    <span className="text-xs font-medium text-gray-700">
                      {element.label}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {element.value}
                  </div>
                  {element.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {element.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            {/* 法律原则 */}
            {analysis.legalAnalysis.legalPrinciples && (
              <div>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Gavel className="w-4 h-4" />
                  适用法律原则
                </h5>
                <div className="flex flex-wrap gap-2">
                  {analysis.legalAnalysis.legalPrinciples.map((principle, idx) => (
                    <Badge key={idx} variant="secondary">
                      {principle}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* 各方主张 */}
            {analysis.legalAnalysis.partyPositions && (
              <div>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  各方主张和理由
                </h5>
                <div className="space-y-2">
                  {Object.entries(analysis.legalAnalysis.partyPositions).map(([party, position]) => (
                    <div key={party} className="p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        {party === 'plaintiff' ? <User className="w-3 h-3" /> :
                         party === 'defendant' ? <Shield className="w-3 h-3" /> :
                         <Scale className="w-3 h-3" />}
                        <span className="text-xs font-medium">
                          {party === 'plaintiff' ? '原告' :
                           party === 'defendant' ? '被告' : '法院'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{position as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">正在生成法律分析...</p>
          </div>
        )
      },
      evidence: {
        label: '相关证据',
        icon: <FileText className="w-4 h-4" />,
        content: (
          <div className="space-y-3">
            {analysis?.relatedEvidence && analysis.relatedEvidence.length > 0 ? (
              analysis.relatedEvidence.map((evidence, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <h6 className="text-sm font-medium">{evidence.name}</h6>
                    <Badge variant="outline" className="text-xs">
                      {evidence.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{evidence.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>证明力: {evidence.probativeValue || '待评估'}</span>
                    <span>可信度: {evidence.credibility || '待评估'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">暂无相关证据</p>
              </div>
            )}
          </div>
        )
      }
    }
  }, [event, analysis, legalElements])
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn("w-full", className)}
    >
      <Card className="overflow-hidden">
        {/* 标题栏 */}
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {event.title}
                {event.importance === 'high' && (
                  <Badge variant="destructive" className="text-xs">
                    关键节点
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {event.date}
                </span>
                {event.actor && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {event.actor}
                  </span>
                )}
              </div>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          {/* 渐进式内容展示 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="facts">
                {informationLayers.basic.icon}
                <span className="ml-2">{informationLayers.basic.label}</span>
              </TabsTrigger>
              <TabsTrigger value="legal">
                {informationLayers.legal.icon}
                <span className="ml-2">{informationLayers.legal.label}</span>
              </TabsTrigger>
              <TabsTrigger value="evidence">
                {informationLayers.evidence.icon}
                <span className="ml-2">{informationLayers.evidence.label}</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="facts" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="facts"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {informationLayers.basic.content}
                </motion.div>
              </AnimatePresence>
            </TabsContent>
            
            <TabsContent value="legal" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="legal"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {informationLayers.legal.content}
                </motion.div>
              </AnimatePresence>
            </TabsContent>
            
            <TabsContent value="evidence" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="evidence"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {informationLayers.evidence.content}
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
          
          {/* 教学模式增强 */}
          {teachingMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200"
            >
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-yellow-700" />
                学习要点
              </h5>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                  <span>理解该事件在案件发展中的作用</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                  <span>掌握相关法律概念和原则</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                  <span>分析不同视角下的利益考量</span>
                </li>
              </ul>
            </motion.div>
          )}
          
          {/* 视角提示 */}
          {perspective !== 'neutral' && (
            <div className={cn(
              "mt-4 p-3 rounded-lg border",
              perspective === 'plaintiff' ? 'bg-blue-50 border-blue-200' :
              perspective === 'defendant' ? 'bg-orange-50 border-orange-200' :
              'bg-purple-50 border-purple-200'
            )}>
              <div className="flex items-center gap-2 text-sm">
                {perspective === 'plaintiff' ? <User className="w-4 h-4 text-blue-600" /> :
                 perspective === 'defendant' ? <Shield className="w-4 h-4 text-orange-600" /> :
                 <Scale className="w-4 h-4 text-purple-600" />}
                <span className="font-medium">
                  {perspective === 'plaintiff' ? '原告视角关注点' :
                   perspective === 'defendant' ? '被告视角关注点' :
                   '法官视角关注点'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {perspective === 'plaintiff' ? '重点关注权利主张的法律依据和证据支持' :
                 perspective === 'defendant' ? '重点关注抗辩理由和风险防控策略' :
                 '重点关注事实认定标准和法律适用原则'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}