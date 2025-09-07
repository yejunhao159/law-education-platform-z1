'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import type { 
  TimelineEvent, 
  ClaimAnalysisResult, 
  ClaimAnalysisRequest,
  ClaimStructure,
  DefenseStructure 
} from '@/types/timeline-claim-analysis'
import {
  Brain,
  Sparkles,
  Loader2,
  AlertCircle,
  Target,
  Shield,
  Scale,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
  Play,
  RefreshCw
} from 'lucide-react'

interface ClaimAnalysisProps {
  events: TimelineEvent[]
  onAnalysisComplete?: (result: ClaimAnalysisResult) => void
  className?: string
}

export function ClaimAnalysis({ 
  events, 
  onAnalysisComplete, 
  className 
}: ClaimAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<ClaimAnalysisResult | null>(null)
  const [error, setError] = useState<string>('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['claims']))
  const [analysisStage, setAnalysisStage] = useState<string>('')

  const caseData = useCaseStore(state => state.caseData)
  const updateCaseData = useCaseStore(state => state.updateCaseData)

  // 分析阶段描述
  const analysisStages = [
    { key: 'preparing', label: '准备分析数据', progress: 10 },
    { key: 'extracting', label: '提取法律要素', progress: 25 },
    { key: 'analyzing-claims', label: '分析请求权结构', progress: 50 },
    { key: 'analyzing-defenses', label: '分析抗辩事由', progress: 70 },
    { key: 'timeline-mapping', label: '构建时间关系图', progress: 85 },
    { key: 'finalizing', label: '生成分析报告', progress: 100 }
  ]

  // 执行请求权分析
  const performClaimAnalysis = async () => {
    if (events.length === 0) {
      setError('没有可分析的时间轴事件')
      return
    }

    setIsAnalyzing(true)
    setError('')
    setAnalysisProgress(0)
    setAnalysisStage('preparing')

    try {
      // 模拟分析进度
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          const currentStage = analysisStages.find(stage => stage.progress > prev)
          if (currentStage) {
            setAnalysisStage(currentStage.key)
          }
          return Math.min(prev + 5, 95)
        })
      }, 800)

      // 构建分析请求
      const analysisRequest: ClaimAnalysisRequest = {
        events,
        caseType: caseData?.metadata?.caseType,
        focusAreas: ['claims', 'defenses', 'limitations', 'burden-of-proof'],
        depth: 'comprehensive'
      }

      console.log('🎯 发起请求权分析:', analysisRequest)

      const response = await fetch('/api/claim-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisRequest)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`分析请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ 请求权分析结果:', result)

      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setAnalysisStage('finalizing')
      
      const analysisResult: ClaimAnalysisResult = result.analysis || result
      setAnalysisResult(analysisResult)

      // 更新到 store
      updateCaseData({
        claimAnalysis: analysisResult
      })

      // 自动展开重要部分
      setExpandedSections(new Set(['claims', 'timeline', 'strategy']))

      // 回调通知
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult)
      }

    } catch (err) {
      console.error('❌ 请求权分析失败:', err)
      setError(err instanceof Error ? err.message : '分析过程中出现错误')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 切换展开/收起部分
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // 获取请求权结论标识
  const getConclusionBadge = (conclusion: ClaimStructure['conclusion']) => {
    switch (conclusion) {
      case 'established':
        return <Badge className="bg-green-100 text-green-800">成立</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">部分成立</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">不成立</Badge>
      default:
        return <Badge variant="outline">待分析</Badge>
    }
  }

  // 获取当前分析阶段描述
  const getCurrentStageDescription = () => {
    const stage = analysisStages.find(s => s.key === analysisStage)
    return stage?.label || '正在分析...'
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 分析控制面板 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              请求权结构分析
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={performClaimAnalysis}
                disabled={isAnalyzing || events.length === 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    分析中 {analysisProgress}%
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    开始分析
                  </>
                )}
              </Button>
              {analysisResult && (
                <Button
                  variant="outline"
                  onClick={performClaimAnalysis}
                  disabled={isAnalyzing}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新分析
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* 分析进度 */}
          {isAnalyzing && (
            <div className="space-y-3">
              <Progress value={analysisProgress} className="w-full" />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Sparkles className="w-4 h-4 animate-pulse" />
                {getCurrentStageDescription()}
              </div>
            </div>
          )}

          {/* 基础信息 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-700">
                {events.length}
              </div>
              <div className="text-xs text-blue-600">时间轴事件</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-700">
                {events.filter(e => e.claims).length}
              </div>
              <div className="text-xs text-green-600">涉及请求权</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-semibold text-orange-700">
                {events.filter(e => e.burdenOfProof).length}
              </div>
              <div className="text-xs text-orange-600">举证责任点</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 分析结果 */}
      {analysisResult && (
        <div className="space-y-4">
          {/* 请求权分析 */}
          <Card className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSection('claims')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  请求权结构
                  <Badge variant="outline">
                    {(analysisResult.claims.primary.length + analysisResult.claims.alternative.length)} 项
                  </Badge>
                </CardTitle>
                {expandedSections.has('claims') ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </div>
            </CardHeader>

            <AnimatePresence>
              {expandedSections.has('claims') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <CardContent>
                    {/* 主要请求权 */}
                    {analysisResult.claims.primary.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          主要请求权
                        </h4>
                        {analysisResult.claims.primary.map(claim => (
                          <div key={claim.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{claim.basis}</div>
                              {getConclusionBadge(claim.conclusion)}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {claim.reasoning}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {claim.elements.map((element, idx) => (
                                <div 
                                  key={idx}
                                  className={cn(
                                    "p-2 rounded text-xs flex items-center gap-2",
                                    element.satisfied 
                                      ? "bg-green-50 text-green-700"
                                      : "bg-red-50 text-red-700"
                                  )}
                                >
                                  {element.satisfied ? 
                                    <CheckCircle className="w-3 h-3" /> : 
                                    <XCircle className="w-3 h-3" />
                                  }
                                  {element.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 抗辩事由 */}
                    {analysisResult.claims.defense.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Shield className="w-4 h-4 text-orange-600" />
                            抗辩事由
                          </h4>
                          {analysisResult.claims.defense.map(defense => (
                            <div key={defense.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium">{defense.basis}</div>
                                <Badge variant="outline">
                                  {defense.type === 'denial' ? '否认抗辩' :
                                   defense.type === 'excuse' ? '免责抗辩' :
                                   defense.type === 'objection' ? '异议抗辩' : '反诉'}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                {defense.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* 时间轴分析 */}
          <Card className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSection('timeline')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  时序关系分析
                  <Badge variant="outline">
                    {analysisResult.timeline.keyPoints.length} 个关键点
                  </Badge>
                </CardTitle>
                {expandedSections.has('timeline') ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </div>
            </CardHeader>

            <AnimatePresence>
              {expandedSections.has('timeline') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <CardContent>
                    <div className="space-y-4">
                      {/* 关键时间点 */}
                      {analysisResult.timeline.keyPoints.map((point, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{point.event}</div>
                            <div className="text-xs text-gray-500">{point.date}</div>
                            <div className="text-xs text-gray-600 mt-1">{point.significance}</div>
                          </div>
                        </div>
                      ))}

                      {/* 时效期间 */}
                      {analysisResult.timeline.limitations.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-red-600" />
                              时效期间监控
                            </h4>
                            {analysisResult.timeline.limitations.map((limitation, idx) => (
                              <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="font-medium">{limitation.claim}</div>
                                  <Badge 
                                    className={cn(
                                      limitation.status === 'expired' ? 'bg-red-100 text-red-800' :
                                      limitation.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    )}
                                  >
                                    {limitation.status === 'expired' ? '已届满' :
                                     limitation.status === 'running' ? '进行中' : 
                                     limitation.status === 'suspended' ? '中止' : '中断'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-600">
                                  起算: {limitation.startDate} | 届满: {limitation.endDate} | 期间: {limitation.period}个月
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* 举证责任分析 */}
          {analysisResult.burdenOfProof.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection('burden')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="w-5 h-5 text-purple-600" />
                    举证责任分配
                    <Badge variant="outline">
                      {analysisResult.burdenOfProof.length} 个争点
                    </Badge>
                  </CardTitle>
                  {expandedSections.has('burden') ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  }
                </div>
              </CardHeader>

              <AnimatePresence>
                {expandedSections.has('burden') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.burdenOfProof.map((burden, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium">{burden.fact}</div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{burden.party}</Badge>
                                <Badge 
                                  className={cn(
                                    burden.evaluation === 'sufficient' ? 'bg-green-100 text-green-800' :
                                    burden.evaluation === 'insufficient' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  )}
                                >
                                  {burden.evaluation === 'sufficient' ? '证据充分' :
                                   burden.evaluation === 'insufficient' ? '证据不足' : '存在争议'}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600">
                              现有证据: {burden.evidence.join('、') || '无'}
                            </div>
                            {burden.gap && burden.gap.length > 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                证据缺口: {burden.gap.join('、')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}

          {/* 策略建议 */}
          <Card className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSection('strategy')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  策略建议
                </CardTitle>
                {expandedSections.has('strategy') ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </div>
            </CardHeader>

            <AnimatePresence>
              {expandedSections.has('strategy') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <CardContent>
                    <div className="space-y-4">
                      {/* 建议 */}
                      {analysisResult.strategy.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            行动建议
                          </h4>
                          <ul className="space-y-2">
                            {analysisResult.strategy.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 风险 */}
                      {analysisResult.strategy.risks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            风险提示
                          </h4>
                          <ul className="space-y-2">
                            {analysisResult.strategy.risks.map((risk, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-red-700">{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 机会 */}
                      {analysisResult.strategy.opportunities.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            机会点
                          </h4>
                          <ul className="space-y-2">
                            {analysisResult.strategy.opportunities.map((opp, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-blue-700">{opp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      )}
    </div>
  )
}