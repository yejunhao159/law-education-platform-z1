"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Sparkles, Brain, AlertCircle } from 'lucide-react'

// 示例时间轴数据
const sampleEvents = [
  {
    id: 1,
    date: '2023-01-15',
    title: '签订借款合同',
    description: '张三与李四贸易有限公司签订借款合同，借款金额100万元，年利率8%',
    type: 'contract'
  },
  {
    id: 2,
    date: '2023-02-01',
    title: '支付借款',
    description: '张三通过银行转账方式将100万元支付给李四贸易有限公司',
    type: 'payment'
  },
  {
    id: 3,
    date: '2024-01-15',
    title: '借款到期',
    description: '借款到期，李四贸易有限公司未按约定归还本金和利息',
    type: 'deadline'
  },
  {
    id: 4,
    date: '2024-02-10',
    title: '催款通知',
    description: '张三多次向李四贸易有限公司催要借款，对方以经营困难为由拒绝',
    type: 'notice'
  },
  {
    id: 5,
    date: '2024-03-15',
    title: '提起诉讼',
    description: '张三向北京市朝阳区人民法院提起民间借贷纠纷诉讼',
    type: 'litigation'
  },
  {
    id: 6,
    date: '2024-05-20',
    title: '法院判决',
    description: '法院判决被告归还借款本金100万元及利息5万元',
    type: 'judgment'
  }
]

export default function TimelineAITest() {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string>('')

  // 使用新的AI分析API
  const analyzeTimeline = async () => {
    setAnalyzing(true)
    setError('')
    
    try {
      const response = await fetch('/api/timeline-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          events: sampleEvents,
          analysisType: 'comprehensive'
        })
      })
      
      if (!response.ok) {
        throw new Error('分析失败')
      }
      
      const result = await response.json()
      setAnalysis(result.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析出错')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            时间轴AI智能分析测试
          </h1>
          <p className="text-gray-600">集成法律智能系统的深度分析功能</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 左侧：时间轴展示 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                案件时间轴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleEvents.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full ${
                        event.type === 'litigation' ? 'bg-red-500' :
                        event.type === 'judgment' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`} />
                      {index < sampleEvents.length - 1 && (
                        <div className="w-0.5 h-16 bg-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">{event.date}</div>
                      <div className="font-semibold">{event.title}</div>
                      <div className="text-sm text-gray-600">{event.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={analyzeTimeline} 
                disabled={analyzing}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在分析...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI智能分析
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 右侧：分析结果 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI分析结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="text-red-700">{error}</div>
                </div>
              )}
              
              {!analysis && !error && (
                <div className="text-center text-gray-500 py-12">
                  点击"AI智能分析"按钮开始分析
                </div>
              )}
              
              {analysis && (
                <div className="space-y-6">
                  {/* 基础信息 */}
                  <div>
                    <h3 className="font-semibold mb-2 text-blue-600">📊 基础信息</h3>
                    <div className="bg-blue-50 p-3 rounded-lg space-y-1 text-sm">
                      <div>案件类型：{analysis.summary?.caseType || '未识别'}</div>
                      <div>时间跨度：{analysis.summary?.timeSpan || '未知'}</div>
                      <div>涉案金额：{analysis.summary?.disputedAmount ? `${analysis.summary.disputedAmount}元` : '未知'}</div>
                      <div>当事人：{analysis.summary?.keyParties?.join('、') || '未知'}</div>
                    </div>
                  </div>

                  {/* 时间轴洞察 */}
                  {analysis.timelineInsights?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-purple-600">💡 关键洞察</h3>
                      <div className="space-y-2">
                        {analysis.timelineInsights.map((insight: any, i: number) => (
                          <div key={i} className={`p-3 rounded-lg ${
                            insight.importance === 'high' ? 'bg-purple-50 border border-purple-200' :
                            'bg-gray-50 border border-gray-200'
                          }`}>
                            <div className="font-medium">{insight.title}</div>
                            <div className="text-sm text-gray-600 mt-1">{insight.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 法律建议 */}
                  {analysis.legalRecommendations && (
                    <div>
                      <h3 className="font-semibold mb-2 text-green-600">⚖️ 法律建议</h3>
                      <div className="bg-green-50 p-3 rounded-lg">
                        {analysis.legalRecommendations.suggestedActions?.length > 0 && (
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {analysis.legalRecommendations.suggestedActions.map((action: string, i: number) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 风险评估 */}
                  {analysis.legalRecommendations?.riskAssessment?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-red-600">⚠️ 风险提示</h3>
                      <div className="space-y-2">
                        {analysis.legalRecommendations.riskAssessment.map((risk: any, i: number) => (
                          <div key={i} className={`p-3 rounded-lg ${
                            risk.level === 'high' ? 'bg-red-50 border border-red-200' :
                            'bg-yellow-50 border border-yellow-200'
                          }`}>
                            <div className="text-sm">{risk.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI深度分析 */}
                  {analysis.aiInsights && !analysis.aiInsights.message && (
                    <div>
                      <h3 className="font-semibold mb-2 text-indigo-600">🤖 AI深度分析</h3>
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap">
                          {typeof analysis.aiInsights === 'string' 
                            ? analysis.aiInsights 
                            : JSON.stringify(analysis.aiInsights, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}