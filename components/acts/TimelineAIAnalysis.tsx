"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import { 
  Clock, 
  Brain, 
  Sparkles, 
  AlertCircle,
  TrendingUp,
  Shield,
  Lightbulb,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Scale
} from 'lucide-react'

interface TimelineEvent {
  id: number
  date: string
  title: string
  description: string
  type: 'filing' | 'evidence' | 'hearing' | 'judgment' | 'execution' | 'other'
  importance?: 'critical' | 'important' | 'reference'
}

export default function TimelineAIAnalysis() {
  const caseData = useCaseStore(state => state.caseData)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']))
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // 从案件数据中提取时间轴事件
  useEffect(() => {
    console.log('🔍 TimelineAIAnalysis - 案件数据更新:', caseData)
    
    const debug = {
      hasCaseData: !!caseData,
      hasTimeline: !!caseData?.timeline,
      hasThreeElements: !!caseData?.threeElements,
      threeElementsKeys: caseData?.threeElements ? Object.keys(caseData.threeElements) : [],
      factsMain: caseData?.threeElements?.facts?.main ? caseData.threeElements.facts.main.substring(0, 200) + '...' : '无',
      timelineLength: caseData?.timeline?.length || 0
    }
    
    setDebugInfo(debug)
    console.log('🐛 调试信息:', debug)
    
    if (caseData?.timeline || caseData?.threeElements) {
      const extractedEvents = extractTimelineEvents(caseData)
      console.log('📅 提取的时间轴事件:', extractedEvents)
      setEvents(extractedEvents)
    } else {
      console.log('⚠️ 没有找到案件数据或时间轴信息')
      setEvents([])
    }
  }, [caseData])

  // 提取时间轴事件的辅助函数
  const extractTimelineEvents = (data: any): TimelineEvent[] => {
    const events: TimelineEvent[] = []
    let eventId = 1

    // 从三要素中提取日期事件
    if (data?.threeElements) {
      const { facts } = data.threeElements
      
      // 解析事实描述中的日期 - 支持更多日期格式
      if (facts?.main) {
        // 匹配中文和西文日期格式
        const datePatterns = [
          /(\d{4}年\d{1,2}月\d{1,2}日)/g,
          /(\d{4}-\d{1,2}-\d{1,2})/g,
          /(\d{4}\.\d{1,2}\.\d{1,2})/g,
          /(\d{4}\/\d{1,2}\/\d{1,2})/g
        ]
        
        datePatterns.forEach(pattern => {
          const matches = facts.main.match(pattern) || []
          matches.forEach((dateStr: string) => {
            // 避免重复日期
            const normalizedDate = convertChineseDateToISO(dateStr)
            if (!events.some(e => e.date === normalizedDate)) {
              const contextStart = Math.max(0, facts.main.indexOf(dateStr) - 50)
              const contextEnd = Math.min(facts.main.indexOf(dateStr) + 150, facts.main.length)
              const context = facts.main.substring(contextStart, contextEnd)
              
              events.push({
                id: eventId++,
                date: normalizedDate,
                title: extractEventTitle(context),
                description: context,
                type: detectEventType(context),
                importance: 'important'
              })
            }
          })
        })
      }
      
      // 从判决要点中提取事件
      if (facts?.disputed) {
        facts.disputed.forEach((dispute: string) => {
          const dateMatches = dispute.match(/(\d{4}年\d{1,2}月\d{1,2}日)/g) || []
          dateMatches.forEach((dateStr: string) => {
            const normalizedDate = convertChineseDateToISO(dateStr)
            if (!events.some(e => e.date === normalizedDate)) {
              events.push({
                id: eventId++,
                date: normalizedDate,
                title: extractEventTitle(dispute),
                description: dispute.substring(0, 100) + '...',
                type: detectEventType(dispute),
                importance: 'critical'
              })
            }
          })
        })
      }
    }

    // 如果有现成的时间轴数据
    if (data?.timeline && Array.isArray(data.timeline)) {
      data.timeline.forEach((item: any) => {
        events.push({
          id: eventId++,
          date: item.date || new Date().toISOString().split('T')[0],
          title: item.title || '事件',
          description: item.description || '',
          type: item.type || 'other',
          importance: item.importance || 'reference'
        })
      })
    }
    
    // 如果还是没有事件，创建一些示例事件用于演示
    if (events.length === 0 && data?.threeElements?.facts?.main) {
      const mainFact = data.threeElements.facts.main
      events.push({
        id: 1,
        date: new Date().toISOString().split('T')[0],
        title: '案件发生',
        description: mainFact.substring(0, 100) + '...',
        type: 'other',
        importance: 'reference'
      })
    }

    // 按日期排序
    return events.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }

  // 转换各种日期格式为ISO格式
  const convertChineseDateToISO = (dateStr: string): string => {
    // 中文日期格式
    let match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    }
    
    // 标准ISO格式 YYYY-MM-DD
    match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    }
    
    // 点分格式 YYYY.MM.DD
    match = dateStr.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    }
    
    // 斜杠格式 YYYY/MM/DD
    match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
    }
    
    return new Date().toISOString().split('T')[0]
  }

  // 提取事件标题
  const extractEventTitle = (context: string): string => {
    const titleMap = [
      { keywords: ['起诉', '立案', '诉讼'], title: '提起诉讼' },
      { keywords: ['判决', '裁决', '宣判'], title: '法院判决' },
      { keywords: ['签订', '签署', '签字'], title: '签订合同' },
      { keywords: ['支付', '转账', '汇款', '付款'], title: '支付款项' },
      { keywords: ['开庭', '审理', '庭审'], title: '开庭审理' },
      { keywords: ['证据', '举证', '质证'], title: '提交证据' },
      { keywords: ['执行', '强制执行', '查封'], title: '强制执行' },
      { keywords: ['调解', '和解', '协商'], title: '调解协商' },
      { keywords: ['上诉', '申诉'], title: '提起上诉' },
      { keywords: ['违约', '违反', '违背'], title: '违约行为' },
      { keywords: ['催收', '催款', '催促'], title: '催收款项' },
      { keywords: ['借款', '借贷', '贷款'], title: '借款事项' }
    ]
    
    for (const item of titleMap) {
      if (item.keywords.some(keyword => context.includes(keyword))) {
        return item.title
      }
    }
    
    return '相关事件'
  }

  // 检测事件类型
  const detectEventType = (context: string): TimelineEvent['type'] => {
    const typeMap = [
      { keywords: ['起诉', '立案', '诉讼'], type: 'filing' as const },
      { keywords: ['证据', '质证', '举证', '认证'], type: 'evidence' as const },
      { keywords: ['开庭', '审理', '庭审', '听证'], type: 'hearing' as const },
      { keywords: ['判决', '裁决', '宣判', '裁判'], type: 'judgment' as const },
      { keywords: ['执行', '强制执行', '查封', '扣押'], type: 'execution' as const }
    ]
    
    for (const item of typeMap) {
      if (item.keywords.some(keyword => context.includes(keyword))) {
        return item.type
      }
    }
    
    return 'other'
  }

  // 执行AI分析
  const performAIAnalysis = async () => {
    console.log('🚀 开始AI分析 - 当前事件数量:', events.length)
    console.log('📋 待分析事件:', events)
    
    if (events.length === 0) {
      const errorMsg = '没有可分析的时间轴事件。请确保已上传案件文档并完成三要素提取。'
      console.error('❌', errorMsg)
      setError(errorMsg)
      return
    }

    setAnalyzing(true)
    setError('')
    setAnalysisProgress(0)

    // 模拟进度
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + 10, 90))
    }, 500)

    try {
      const requestData = { 
        events,
        analysisType: 'comprehensive',
        caseContext: caseData?.threeElements
      }
      
      console.log('📡 发送分析请求:', requestData)
      
      const response = await fetch('/api/timeline-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      console.log('📊 API响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API错误响应:', errorText)
        throw new Error(`分析请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ 分析结果:', result)
      
      setAnalysis(result.analysis)
      setAnalysisProgress(100)
      
      // 自动展开重要部分
      setExpandedSections(new Set(['summary', 'insights', 'recommendations']))
    } catch (err) {
      console.error('❌ 分析过程出错:', err)
      setError(err instanceof Error ? err.message : '分析过程中出现错误')
    } finally {
      clearInterval(progressInterval)
      setAnalyzing(false)
    }
  }

  // 切换展开/收起
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // 事件类型颜色映射
  const getEventColor = (type: TimelineEvent['type']) => {
    switch(type) {
      case 'filing': return 'bg-blue-500'
      case 'evidence': return 'bg-purple-500'
      case 'hearing': return 'bg-orange-500'
      case 'judgment': return 'bg-green-500'
      case 'execution': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      {/* 调试信息 */}
      {debugInfo && (
        <details className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <summary className="cursor-pointer text-sm font-medium text-yellow-800">
            🐛 调试信息 (点击查看)
          </summary>
          <div className="mt-2 text-xs text-yellow-700 space-y-1">
            <p>案件数据: {debugInfo.hasCaseData ? '✅ 存在' : '❌ 不存在'}</p>
            <p>时间轴数据: {debugInfo.hasTimeline ? `✅ 存在 (${debugInfo.timelineLength}项)` : '❌ 不存在'}</p>
            <p>三要素数据: {debugInfo.hasThreeElements ? '✅ 存在' : '❌ 不存在'}</p>
            {debugInfo.threeElementsKeys.length > 0 && (
              <p>三要素字段: {debugInfo.threeElementsKeys.join(', ')}</p>
            )}
            {debugInfo.factsMain !== '无' && (
              <p>事实摘要: {debugInfo.factsMain}</p>
            )}
          </div>
        </details>
      )}

      {/* 时间轴展示 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            案件时间轴 ({events.length} 个事件)
          </h4>
          <Button
            size="sm"
            onClick={performAIAnalysis}
            disabled={analyzing || events.length === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                分析中 {analysisProgress}%
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI深度分析
              </>
            )}
          </Button>
        </div>

        {/* 进度条 */}
        {analyzing && (
          <Progress value={analysisProgress} className="mb-4" />
        )}

        {/* 时间轴 */}
        <div className="relative space-y-3 max-h-60 overflow-y-auto">
          {events.length > 0 ? (
            events.map((event, index) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${getEventColor(event.type)}`} />
                  {index < events.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-300" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="text-xs text-gray-500">{event.date}</div>
                  <div className="font-medium text-sm">{event.title}</div>
                  {event.description && (
                    <div className="text-xs text-gray-600 mt-1">{event.description.substring(0, 50)}...</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              暂无时间轴数据
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI分析结果 */}
      {analysis && (
        <div className="space-y-3">
          {/* 基础信息 */}
          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => toggleSection('summary')}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600" />
                案件概要
              </h4>
              {expandedSections.has('summary') ? 
                <ChevronUp className="w-4 h-4" /> : 
                <ChevronDown className="w-4 h-4" />
              }
            </div>
            {expandedSections.has('summary') && analysis.summary && (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">案件类型：</span>
                  <Badge variant="outline">{analysis.summary.caseType || '未识别'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">时间跨度：</span>
                  <span className="font-medium">{analysis.summary.timeSpan || '未知'}</span>
                </div>
                {analysis.summary.disputedAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">涉案金额：</span>
                    <span className="font-medium text-orange-600">
                      ¥{(analysis.summary.disputedAmount / 10000).toFixed(2)}万
                    </span>
                  </div>
                )}
                {analysis.summary.keyParties && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">当事人：</span>
                    <span className="font-medium">{analysis.summary.keyParties.join('、')}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 关键洞察 */}
          {analysis.timelineInsights && analysis.timelineInsights.length > 0 && (
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleSection('insights')}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  关键洞察 ({analysis.timelineInsights.length})
                </h4>
                {expandedSections.has('insights') ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </div>
              {expandedSections.has('insights') && (
                <div className="mt-3 space-y-2">
                  {analysis.timelineInsights.map((insight: any, i: number) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg text-sm ${
                        insight.importance === 'high' 
                          ? 'bg-yellow-50 border border-yellow-200' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="font-medium mb-1">{insight.title}</div>
                      <div className="text-gray-600">{insight.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* 法律建议 */}
          {analysis.legalRecommendations && (
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleSection('recommendations')}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Scale className="w-4 h-4 text-green-600" />
                  专业建议
                </h4>
                {expandedSections.has('recommendations') ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </div>
              {expandedSections.has('recommendations') && (
                <div className="mt-3 space-y-3">
                  {/* 行动建议 */}
                  {analysis.legalRecommendations.suggestedActions && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">行动建议</h5>
                      <ul className="space-y-1">
                        {analysis.legalRecommendations.suggestedActions.map((action: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* 风险提示 */}
                  {analysis.legalRecommendations.riskAssessment && 
                   analysis.legalRecommendations.riskAssessment.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">风险提示</h5>
                      <div className="space-y-2">
                        {analysis.legalRecommendations.riskAssessment.map((risk: any, i: number) => (
                          <Alert 
                            key={i} 
                            className={risk.level === 'high' ? 'border-red-200' : 'border-yellow-200'}
                          >
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{risk.description}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* AI深度分析 */}
          {analysis.aiInsights && !analysis.aiInsights.message && (
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => toggleSection('ai')}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  AI深度分析
                </h4>
                {expandedSections.has('ai') ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </div>
              {expandedSections.has('ai') && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                  <pre className="text-xs whitespace-pre-wrap text-gray-700">
                    {typeof analysis.aiInsights === 'string' 
                      ? analysis.aiInsights 
                      : JSON.stringify(analysis.aiInsights, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}