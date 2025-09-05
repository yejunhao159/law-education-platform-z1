'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import { timelineAnalyzer } from '@/lib/ai-timeline-analyzer'
import { AnalysisDisplay } from './AnalysisDisplay'
import { cacheManager } from '@/lib/utils/analysis-cache'
import type { TimelineAnalysis, ViewPerspective, ImportanceLevel } from '@/types/legal-case'
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
  TrendingUp,
  Loader2,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react'

interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'fact' | 'procedure' | 'evidence' | 'decision'
  importance: 'high' | 'medium' | 'low'
  actor?: string
  isKeyLearningNode?: boolean
  teachingPoints?: string[]
  analysis?: TimelineAnalysis // AI分析结果
  analysisLoading?: boolean // 分析加载状态
}

export function CaseTimeline() {
  const caseData = useCaseStore(state => state.caseData)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [perspective, setPerspective] = useState<ViewPerspective>('neutral')
  const [teachingMode, setTeachingMode] = useState(false)
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const [eventAnalyses, setEventAnalyses] = useState<Map<string, TimelineAnalysis>>(new Map())
  const [analysisLoading, setAnalysisLoading] = useState<Map<string, boolean>>(new Map())
  const [selectedAnalysis, setSelectedAnalysis] = useState<TimelineAnalysis | null>(null)
  const [showPerformancePanel, setShowPerformancePanel] = useState(false)
  const [performanceStats, setPerformanceStats] = useState(() => cacheManager.getStatsSummary())
  
  // 从案件数据中提取时间线事件
  const extractTimelineEvents = (): TimelineEvent[] => {
    if (!caseData) return []
    
    const events: TimelineEvent[] = []
    
    // 从事实中提取时间点
    if (caseData.threeElements?.facts?.timeline) {
      caseData.threeElements.facts.timeline.forEach((item: any, index: number) => {
        events.push({
          id: `fact-${index}`,
          date: item.date,
          title: item.event,
          description: item.detail || '',
          type: 'fact',
          importance: item.isKeyEvent ? 'high' : 'medium',
          actor: item.party,
          isKeyLearningNode: item.isKeyEvent || false,
          teachingPoints: item.event.includes('签订') ? ['合同成立的要件', '意思表示的认定'] : undefined
        })
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
        isKeyLearningNode: true,
        teachingPoints: ['起诉条件', '诉讼主体资格', '管辖权确定']
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
        isKeyLearningNode: true,
        teachingPoints: ['判决书结构', '事实认定标准', '法律适用原则']
      })
    }
    
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  
  const events = extractTimelineEvents()
  
  // 生成学习目标
  const generateLearningObjectives = (event: TimelineEvent, analysis: TimelineAnalysis, perspective: ViewPerspective): string[] => {
    const objectives: string[] = []
    
    // 基础法律概念
    objectives.push(`理解"${event.title}"的法律性质和构成要件`)
    
    // 视角特定目标
    switch (perspective) {
      case 'plaintiff':
        objectives.push('掌握原告主张权利的法律依据和举证要求')
        objectives.push('分析该事件对原告案件的有利影响')
        break
      case 'defendant':
        objectives.push('识别被告可能的抗辩理由和防御策略')
        objectives.push('评估该事件对被告的风险程度')
        break
      case 'judge':
        objectives.push('掌握法官审理此类事件的关注重点')
        objectives.push('理解平衡各方利益的裁判思路')
        break
      default:
        objectives.push('全面分析该事件的各种法律后果')
        objectives.push('掌握不同当事人的利益考量')
    }
    
    // 基于分析内容的目标
    if (analysis.importance?.level === 'critical') {
      objectives.push('深入理解该关键事件对整个案件的决定性影响')
    }
    
    if (analysis.legalAnalysis?.legalPrinciples) {
      objectives.push(`掌握${analysis.legalAnalysis.legalPrinciples.slice(0, 2).join('、')}的适用`)
    }
    
    return objectives
  }
  
  // 生成思考题
  const generateThinkingQuestions = (event: TimelineEvent, analysis: TimelineAnalysis, perspective: ViewPerspective): string[] => {
    const questions: string[] = []
    
    // 基础分析题
    questions.push(`如何评价"${event.title}"这一事件的重要程度？请说明理由。`)
    
    // 视角特定问题
    switch (perspective) {
      case 'plaintiff':
        questions.push('如果您是原告律师，会如何利用这个事件支持您的主张？')
        questions.push('这个事件可能面临哪些举证困难？如何克服？')
        break
      case 'defendant':
        questions.push('如果您是被告律师，会如何质疑或反驳这个事件？')
        questions.push('针对这个事件，有哪些有效的抗辩策略？')
        break
      case 'judge':
        questions.push('作为法官，您会重点审查这个事件的哪些方面？')
        questions.push('如何在各方利益之间寻找平衡点？')
        break
      default:
        questions.push('不同当事人对这个事件会有哪些不同的理解？')
        questions.push('这个事件可能产生哪些连锁反应？')
    }
    
    // 基于分析深度的问题
    if (analysis.legalAnalysis?.applicableLaws && analysis.legalAnalysis.applicableLaws.length > 0) {
      questions.push(`该事件适用${analysis.legalAnalysis.applicableLaws[0]}的哪些具体条款？`)
    }
    
    if (analysis.perspectiveAnalysis?.strategicOptions) {
      questions.push('基于当前情况，最优的策略选择是什么？为什么？')
    }
    
    return questions
  }
  
  // 生成进阶学习建议
  const generateAdvancedLearningTips = (event: TimelineEvent, analysis: TimelineAnalysis, perspective: ViewPerspective): string[] => {
    const tips: string[] = []
    
    // 法条学习
    if (analysis.legalAnalysis?.applicableLaws && analysis.legalAnalysis.applicableLaws.length > 0) {
      tips.push(`深入研读${analysis.legalAnalysis.applicableLaws[0]}的相关条文和立法背景`)
    }
    
    // 判例研究
    if (analysis.legalAnalysis?.precedents && analysis.legalAnalysis.precedents.length > 0) {
      tips.push(`研究${analysis.legalAnalysis.precedents[0]}等类似案例的裁判思路`)
    }
    
    // 视角特定建议
    switch (perspective) {
      case 'plaintiff':
        tips.push('练习起草相关的起诉状和证据清单')
        tips.push('模拟法庭陈述，提升表达说服力')
        break
      case 'defendant':
        tips.push('练习撰写答辩状和反驳意见')
        tips.push('研究程序性抗辩的具体操作')
        break
      case 'judge':
        tips.push('练习撰写法律文书的说理部分')
        tips.push('研究类似案件的不同裁判观点')
        break
      default:
        tips.push('对比分析不同法院对类似案件的处理方式')
        tips.push('关注相关领域的最新司法解释和指导案例')
    }
    
    // 实务技能
    tips.push('参与模拟法庭或案例讨论，提升实战能力')
    tips.push('关注该领域的最新法律动态和理论发展')
    
    return tips
  }
  
  // 触发AI分析
  const handleAnalyzeEvent = useCallback(async (event: TimelineEvent) => {
    console.log('🎯 开始分析事件:', event.title, event.date)
    if (!caseData || analysisLoading.get(event.id)) {
      console.log('❌ 分析条件不满足:', { caseData: !!caseData, loading: analysisLoading.get(event.id) })
      return
    }
    
    const analysisKey = `${event.id}-${perspective}`
    
    // 检查是否已有分析结果
    if (eventAnalyses.has(analysisKey)) {
      console.log('✅ 使用缓存的分析结果:', analysisKey)
      setSelectedAnalysis(eventAnalyses.get(analysisKey)!)
      return
    }
    
    console.log('🔄 开始新的AI分析请求:', analysisKey)
    // 设置加载状态
    setAnalysisLoading(prev => new Map(prev).set(event.id, true))
    
    try {
      // 构建时间轴事件数据
      const timelineEvent = {
        date: event.date,
        event: event.title,
        detail: event.description,
        importance: event.importance === 'high' ? 'critical' as const : 
                    event.importance === 'medium' ? 'important' as const : 
                    'normal' as const,
        party: event.actor,
        isKeyEvent: event.isKeyLearningNode
      }
      
      // 调用AI分析服务
      const analysis = await timelineAnalyzer.analyzeTimelineEvent(
        timelineEvent,
        caseData,
        { perspective }
      )
      
      // 保存分析结果
      setEventAnalyses(prev => new Map(prev).set(analysisKey, analysis))
      setSelectedAnalysis(analysis)
      
    } catch (error) {
      console.error('分析失败:', error)
    } finally {
      setAnalysisLoading(prev => {
        const newMap = new Map(prev)
        newMap.delete(event.id)
        return newMap
      })
    }
  }, [caseData, perspective, analysisLoading, eventAnalyses])
  
  // 智能视角切换处理
  const handlePerspectiveChange = useCallback(async (newPerspective: ViewPerspective) => {
    if (newPerspective === perspective) return
    
    const oldPerspective = perspective
    setPerspective(newPerspective)
    
    // 如果当前有选中的节点，尝试获取新视角的分析
    if (selectedNodeId) {
      const selectedEvent = events.find(e => e.id === selectedNodeId)
      if (selectedEvent) {
        const newAnalysisKey = `${selectedEvent.id}-${newPerspective}`
        
        // 检查是否已有该视角的缓存分析
        if (eventAnalyses.has(newAnalysisKey)) {
          setSelectedAnalysis(eventAnalyses.get(newAnalysisKey)!)
          console.log(`🎯 切换到${newPerspective}视角 - 使用缓存分析`)
        } else {
          // 预加载新视角分析
          setSelectedAnalysis(null) // 先清空当前分析
          console.log(`🔄 切换到${newPerspective}视角 - 正在加载分析...`)
          await handleAnalyzeEvent(selectedEvent)
        }
      }
    } else {
      setSelectedAnalysis(null)
    }
    
    console.log(`📊 视角切换: ${oldPerspective} → ${newPerspective}`)
  }, [perspective, selectedNodeId, events, eventAnalyses, handleAnalyzeEvent])
  
  // 视角变化时的提示信息
  useEffect(() => {
    if (perspective !== 'neutral') {
      console.log(`👁️ 当前视角: ${perspective === 'plaintiff' ? '原告' : perspective === 'defendant' ? '被告' : '法官'}`)
    }
  }, [perspective])

  // 定期更新性能统计
  useEffect(() => {
    const updateStats = () => {
      setPerformanceStats(cacheManager.getStatsSummary())
    }

    // 立即更新一次
    updateStats()

    // 每5秒更新一次
    const interval = setInterval(updateStats, 5000)

    return () => clearInterval(interval)
  }, [eventAnalyses]) // 当分析数据变化时触发更新
  
  const getEventColor = (type: string) => {
    switch (type) {
      case 'fact': return 'bg-blue-500'
      case 'procedure': return 'bg-purple-500'
      case 'evidence': return 'bg-yellow-500'
      case 'decision': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }
  
  // 根据重要性获取边框颜色
  const getImportanceBorderColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'border-red-300 ring-red-100'
      case 'medium': return 'border-orange-300 ring-orange-100'
      case 'low': return 'border-gray-300 ring-gray-100'
      default: return 'border-gray-200'
    }
  }
  
  // 根据AI分析的重要性评分获取颜色
  const getImportanceScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 80) return 'text-red-600 font-bold'
    if (score >= 60) return 'text-orange-600 font-semibold'
    if (score >= 40) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold">交互式案件时间轴</h3>
            <Badge variant="outline" className="bg-white">
              使用真实数据
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">分析视角：</span>
            <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
              {([
                { key: 'neutral', label: '中性', icon: Scale, description: '客观全面的中立分析' },
                { key: 'plaintiff', label: '原告', icon: User, description: '从原告角度分析优势和策略' },
                { key: 'defendant', label: '被告', icon: Shield, description: '从被告角度分析抗辩和风险' },
                { key: 'judge', label: '法官', icon: Scale, description: '从法官角度分析裁判要点' }
              ] as const).map(({ key, label, icon: Icon, description }) => (
                <Button
                  key={key}
                  variant={perspective === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handlePerspectiveChange(key)}
                  className={`text-xs transition-all duration-200 ${
                    perspective === key 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' 
                      : 'hover:bg-blue-50 text-gray-700 hover:text-blue-600'
                  }`}
                  title={description}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={teachingMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTeachingMode(!teachingMode)}
              className="gap-2"
            >
              <Brain className="w-4 h-4" />
              {teachingMode ? '退出教学' : '教学模式'}
            </Button>
            
            <Button
              variant={showPerformancePanel ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPerformancePanel(!showPerformancePanel)}
              className="gap-2"
              title="查看缓存性能统计"
            >
              <TrendingUp className="w-4 h-4" />
              性能监控
            </Button>
          </div>
        </div>
      </div>
      
      {/* 教学模式增强进度面板 */}
      {teachingMode && events.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 基础进度 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-900 flex items-center gap-1">
                  <Brain className="w-4 h-4" />
                  学习进度
                </span>
                <span className="text-sm text-amber-800 font-semibold">
                  {completedNodes.size}/{events.filter(e => e.isKeyLearningNode).length}
                </span>
              </div>
              <Progress 
                value={events.filter(e => e.isKeyLearningNode).length > 0 
                  ? (completedNodes.size / events.filter(e => e.isKeyLearningNode).length) * 100 
                  : 0} 
                className="h-3" 
              />
              <p className="text-xs text-amber-700 mt-1">
                关键节点掌握情况
              </p>
            </div>
            
            {/* 分析统计 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-900 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  AI分析覆盖
                </span>
                <span className="text-sm text-amber-800 font-semibold">
                  {eventAnalyses.size}/{events.length}
                </span>
              </div>
              <Progress 
                value={events.length > 0 ? (eventAnalyses.size / (events.length * 4)) * 100 : 0}
                className="h-3" 
              />
              <p className="text-xs text-amber-700 mt-1">
                多视角分析完成度
              </p>
            </div>
            
            {/* 当前视角提示 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-900 flex items-center gap-1">
                  {perspective === 'plaintiff' ? <User className="w-4 h-4" /> :
                   perspective === 'defendant' ? <Shield className="w-4 h-4" /> :
                   perspective === 'judge' ? <Scale className="w-4 h-4" /> :
                   <Users className="w-4 h-4" />}
                  当前视角
                </span>
                <Badge variant="secondary" className="bg-white text-amber-800">
                  {perspective === 'neutral' ? '综合' : 
                   perspective === 'plaintiff' ? '原告' : 
                   perspective === 'defendant' ? '被告' : '法官'}
                </Badge>
              </div>
              <div className="text-xs text-amber-700 space-y-1">
                <div>• 点击节点查看{perspective === 'neutral' ? '综合' : perspective === 'plaintiff' ? '原告' : perspective === 'defendant' ? '被告' : '法官'}视角分析</div>
                <div>• 使用顶部按钮切换不同视角</div>
              </div>
            </div>
          </div>
          
          {/* 学习建议 */}
          {completedNodes.size > 0 && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">学习建议</span>
              </div>
              <div className="text-sm text-gray-700">
                {completedNodes.size === events.filter(e => e.isKeyLearningNode).length ? (
                  <span className="text-green-700">
                    🎉 恭喜！您已完成所有关键节点的学习。建议尝试不同视角的分析，加深理解。
                  </span>
                ) : completedNodes.size >= events.filter(e => e.isKeyLearningNode).length * 0.7 ? (
                  <span className="text-blue-700">
                    💪 学习进度良好！继续完成剩余的关键节点，注意整体案件脉络的把握。
                  </span>
                ) : (
                  <span className="text-amber-700">
                    📚 建议重点关注标记为"关键"的学习节点，这些是理解案件的核心要点。
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
      
      {/* 交互式时间轴 */}
      <div className="relative pl-8">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-200 via-blue-200 to-green-200"></div>
        
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">暂无时间轴数据</p>
            <p className="text-sm">请先上传并解析判决书文件，系统将自动提取时间轴信息</p>
          </div>
        ) : events.map((event) => {
          const isSelected = selectedNodeId === event.id
          const isCompleted = completedNodes.has(event.id)
          const isKeyNode = teachingMode ? event.isKeyLearningNode : true
          
          return (
            <div 
              key={event.id} 
              className={`relative mb-6 last:mb-0 transition-all duration-300 ${
                !isKeyNode ? 'opacity-50' : ''
              }`}
            >
              <div 
                className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white cursor-pointer transition-all hover:scale-110 z-10 ${
                  isSelected 
                    ? 'ring-4 ring-blue-200 scale-125' 
                    : isCompleted && teachingMode
                      ? 'ring-2 ring-green-200'
                      : ''
                } ${getEventColor(event.type)}`}
                onClick={() => {
                  setSelectedNodeId(isSelected ? null : event.id)
                  if (teachingMode && event.isKeyLearningNode && !completedNodes.has(event.id)) {
                    setCompletedNodes(prev => new Set([...prev, event.id]))
                  }
                  // 触发AI分析
                  if (!isSelected) {
                    handleAnalyzeEvent(event)
                  }
                }}
              ></div>
              
              <div className="ml-8">
                <div className={`bg-white border-2 rounded-lg shadow-sm transition-all hover:shadow-md ${
                  isSelected ? 'border-blue-400 shadow-lg ring-2 ring-blue-100' : 
                  getImportanceBorderColor(event.importance)
                }`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        {event.title}
                        {teachingMode && event.isKeyLearningNode && (
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            <Brain className="w-3 h-3 mr-1" />
                            关键
                          </Badge>
                        )}
                        {isCompleted && teachingMode && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={event.importance === 'high' ? 'border-red-300 text-red-700' : 'border-gray-300'}
                        >
                          {event.importance === 'high' ? '关键' : event.importance === 'medium' ? '重要' : '一般'}
                        </Badge>
                        <span className="text-base font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">{event.date}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                    
                    {event.actor && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{event.actor}</span>
                      </div>
                    )}
                    
                    {/* AI分析触发提示 */}
                    {!isSelected && (
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                          <Sparkles className="w-3 h-3" />
                          <span>点击查看 
                            {perspective === 'plaintiff' ? '原告视角' : 
                             perspective === 'defendant' ? '被告视角' : 
                             perspective === 'judge' ? '法官视角' : ''}
                            AI智能分析
                          </span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                        {analysisLoading.get(event.id) && (
                          <div className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            <span className="text-xs text-gray-500">
                              {perspective === 'neutral' ? '分析中...' :
                               perspective === 'plaintiff' ? '原告分析中...' :
                               perspective === 'defendant' ? '被告分析中...' :
                               '法官分析中...'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* AI分析结果展示 */}
                  {isSelected && selectedAnalysis && (
                    <div className="border-t border-gray-100">
                      {/* 快速视角切换栏 */}
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">快速切换视角:</span>
                            <div className="flex gap-1">
                              {(['neutral', 'plaintiff', 'defendant', 'judge'] as const).map((p) => {
                                const analysisKey = `${event.id}-${p}`
                                const hasCache = eventAnalyses.has(analysisKey)
                                
                                return (
                                  <Button
                                    key={p}
                                    variant={perspective === p ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handlePerspectiveChange(p)}
                                    className={`text-xs h-6 px-2 ${hasCache ? 'ring-1 ring-green-200' : ''}`}
                                    title={hasCache ? '已缓存分析结果' : '点击加载分析'}
                                  >
                                    {p === 'neutral' ? '中性' : 
                                     p === 'plaintiff' ? '原告' : 
                                     p === 'defendant' ? '被告' : '法官'}
                                    {hasCache && (
                                      <div className="w-1 h-1 bg-green-500 rounded-full ml-1"></div>
                                    )}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedNodeId(null)
                              setSelectedAnalysis(null)
                            }}
                            className="text-xs h-6"
                          >
                            关闭
                          </Button>
                        </div>
                      </div>
                      
                      <AnalysisDisplay 
                        analysis={selectedAnalysis}
                        teachingMode={teachingMode}
                        perspective={perspective}
                        onClose={() => {
                          setSelectedNodeId(null)
                          setSelectedAnalysis(null)
                        }}
                      />
                    </div>
                  )}
                  
                  {/* 加载状态 */}
                  {isSelected && analysisLoading.get(event.id) && !selectedAnalysis && (
                    <div className="border-t border-gray-100 p-4 flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                      <span className="text-sm text-gray-600">正在生成深度分析...</span>
                    </div>
                  )}
                  
                  {/* 增强教学模式展示 */}
                  {isSelected && teachingMode && (
                    <div className="border-t border-gray-100 bg-gradient-to-b from-yellow-50 to-amber-50">
                      {/* AI增强教学分析 */}
                      {selectedAnalysis && (
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between mb-3">
                            <h6 className="font-semibold text-amber-900 flex items-center gap-2">
                              <Brain className="w-5 h-5" />
                              AI增强教学分析
                            </h6>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                              {perspective === 'neutral' ? '综合教学' : 
                               perspective === 'plaintiff' ? '原告教学' : 
                               perspective === 'defendant' ? '被告教学' : '审判教学'}
                            </Badge>
                          </div>
                          
                          {/* 学习目标 */}
                          <div className="bg-white rounded-lg p-3 border border-amber-200">
                            <h7 className="font-medium text-sm text-amber-900 mb-2 flex items-center gap-1">
                              🎯 本节点学习目标
                            </h7>
                            <ul className="text-sm text-gray-700 space-y-1">
                              {generateLearningObjectives(event, selectedAnalysis, perspective).map((objective, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{objective}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* 关键概念释义 */}
                          {selectedAnalysis.legalAnalysis?.keyTerms && selectedAnalysis.legalAnalysis.keyTerms.length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-amber-200">
                              <h7 className="font-medium text-sm text-amber-900 mb-2 flex items-center gap-1">
                                📚 关键法律概念
                              </h7>
                              <div className="space-y-2">
                                {selectedAnalysis.legalAnalysis.keyTerms.map((term, idx) => (
                                  <div key={idx} className="p-2 bg-amber-50 rounded border border-amber-100">
                                    <div className="font-medium text-sm text-amber-900">{term.term}</div>
                                    <div className="text-xs text-gray-600 mt-1">{term.definition}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* 思考题 */}
                          <div className="bg-white rounded-lg p-3 border border-amber-200">
                            <h7 className="font-medium text-sm text-amber-900 mb-2 flex items-center gap-1">
                              🤔 深度思考题
                            </h7>
                            <div className="space-y-2">
                              {generateThinkingQuestions(event, selectedAnalysis, perspective).map((question, idx) => (
                                <div key={idx} className="p-2 bg-blue-50 rounded border border-blue-100">
                                  <div className="text-sm text-gray-700">{question}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* 进阶学习建议 */}
                          <div className="bg-white rounded-lg p-3 border border-amber-200">
                            <h7 className="font-medium text-sm text-amber-900 mb-2 flex items-center gap-1">
                              📈 进阶学习建议
                            </h7>
                            <div className="text-sm text-gray-700 space-y-1">
                              {generateAdvancedLearningTips(event, selectedAnalysis, perspective).map((tip, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <TrendingUp className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>{tip}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 传统教学要点（无AI分析时显示） */}
                      {!selectedAnalysis && event.teachingPoints && event.teachingPoints.length > 0 && (
                        <div className="p-4">
                          <div className="bg-white p-3 rounded border border-yellow-200">
                            <h6 className="font-medium text-sm text-yellow-900 mb-2 flex items-center gap-1">
                              <Brain className="w-4 h-4" />
                              基础教学要点
                            </h6>
                            <ul className="text-sm text-yellow-800 space-y-1">
                              {event.teachingPoints.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-yellow-600">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                              <p className="text-xs text-blue-700">
                                💡 点击上方节点可获取AI增强的深度教学分析
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 知识检测 */}
                      <div className="px-4 pb-4">
                        <div className="bg-white rounded-lg p-3 border border-purple-200">
                          <h7 className="font-medium text-sm text-purple-900 mb-2 flex items-center gap-1">
                            ✅ 知识掌握检测
                          </h7>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              您是否已理解本节点的核心知识点？
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={completedNodes.has(event.id) ? "default" : "outline"}
                                onClick={() => {
                                  if (completedNodes.has(event.id)) {
                                    setCompletedNodes(prev => {
                                      const newSet = new Set(prev)
                                      newSet.delete(event.id)
                                      return newSet
                                    })
                                  } else {
                                    setCompletedNodes(prev => new Set([...prev, event.id]))
                                  }
                                }}
                                className="text-xs"
                              >
                                {completedNodes.has(event.id) ? '✓ 已掌握' : '标记掌握'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* 视角说明卡片 */}
      {perspective !== 'neutral' && (
        <Card className={`p-4 ${
          perspective === 'plaintiff' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' :
          perspective === 'defendant' ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200' :
          'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              perspective === 'plaintiff' ? 'bg-blue-100' :
              perspective === 'defendant' ? 'bg-amber-100' :
              'bg-purple-100'
            }`}>
              {perspective === 'plaintiff' ? <User className="w-4 h-4 text-blue-600" /> :
               perspective === 'defendant' ? <Shield className="w-4 h-4 text-amber-600" /> :
               <Scale className="w-4 h-4 text-purple-600" />}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                {perspective === 'plaintiff' ? '原告视角分析' :
                 perspective === 'defendant' ? '被告视角分析' :
                 '法官视角分析'}
              </h4>
              <p className="text-sm text-gray-700">
                {perspective === 'plaintiff' ? '从原告立场出发，重点关注权利主张的依据、证据优势和诉讼策略制定。' :
                 perspective === 'defendant' ? '从被告立场出发，重点关注抗辩理由、风险防控和应诉策略选择。' :
                 '从法官立场出发，重点关注事实认定、法律适用和利益平衡的裁判考量。'}
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* 性能监控面板 */}
      {showPerformancePanel && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-100">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900">系统性能监控</h4>
                <p className="text-xs text-green-700">实时缓存和分析性能统计</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPerformancePanel(false)}
              className="text-green-700 hover:text-green-900"
            >
              <AlertCircle className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 缓存命中率 */}
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <div className="text-xs text-green-600 mb-1">缓存命中率</div>
              <div className="text-lg font-bold text-green-800">{performanceStats.hitRate}</div>
              <div className="text-xs text-gray-500">越高越好</div>
            </div>
            
            {/* 平均响应时间 */}
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <div className="text-xs text-green-600 mb-1">平均响应时间</div>
              <div className="text-lg font-bold text-green-800">{performanceStats.avgTime}</div>
              <div className="text-xs text-gray-500">越低越好</div>
            </div>
            
            {/* 内存使用 */}
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <div className="text-xs text-green-600 mb-1">内存使用</div>
              <div className="text-lg font-bold text-green-800">{performanceStats.memoryUsage}</div>
              <div className="text-xs text-gray-500">缓存大小</div>
            </div>
            
            {/* 错误次数 */}
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <div className="text-xs text-green-600 mb-1">错误统计</div>
              <div className={`text-lg font-bold ${performanceStats.errors > 0 ? 'text-red-600' : 'text-green-800'}`}>
                {performanceStats.errors}
              </div>
              <div className="text-xs text-gray-500">总错误数</div>
            </div>
          </div>
          
          {/* 分析统计 */}
          <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">智能分析状态</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                实时更新
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-green-600">已缓存分析</div>
                <div className="font-semibold">{eventAnalyses.size} 个</div>
              </div>
              <div>
                <div className="text-green-600">事件总数</div>
                <div className="font-semibold">{events.length} 个</div>
              </div>
              <div>
                <div className="text-green-600">覆盖率</div>
                <div className="font-semibold">
                  {events.length > 0 ? Math.round((eventAnalyses.size / events.length) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log(cacheManager.getPerformanceReport())
                alert('性能报告已输出到控制台')
              }}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              <FileText className="w-3 h-3 mr-1" />
              详细报告
            </Button>
            <Button
              variant="outline" 
              size="sm"
              onClick={async () => {
                const cleaned = await cacheManager.cleanup()
                setPerformanceStats(cacheManager.getStatsSummary())
                alert(`清理完成，删除了 ${cleaned} 个过期项目`)
              }}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              清理缓存
            </Button>
          </div>
        </Card>
      )}
      
      {events.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-blue-50">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            时序分析要点 ({perspective === 'neutral' ? '中性' : 
                         perspective === 'plaintiff' ? '原告' : 
                         perspective === 'defendant' ? '被告' : '法官'}视角)
          </h4>
          <p className="text-sm text-gray-700">
            案件时间跨度：{events[0]?.date} 至 {events[events.length - 1]?.date}，
            共 {events.length} 个关键事件。现在使用从判决书中提取的真实数据，
            而不是虚拟数据。
          </p>
          
          {teachingMode && (
            <div className="mt-3 p-3 bg-white rounded border">
              <h5 className="font-medium text-sm text-blue-900 mb-2">学习建议</h5>
              <p className="text-sm text-blue-800">
                建议重点关注时间节点的法律意义，理解不同视角下的争议焦点，
                掌握诉讼时效、举证责任等程序法要点。
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}