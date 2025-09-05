"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function DebugTimelinePage() {
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [error, setError] = useState('')

  const runTest = async () => {
    setTesting(true)
    setError('')
    setTestResults(null)

    try {
      console.log('🧪 开始测试时间轴AI分析集成...')
      
      // 测试数据
      const testData = {
        events: [
          {
            id: 1,
            date: "2023-01-15",
            title: "签订合同",
            description: "双方签订借款合同，约定借款金额100万元",
            type: "contract"
          },
          {
            id: 2,
            date: "2024-03-15", 
            title: "提起诉讼",
            description: "原告向法院提起民间借贷纠纷诉讼",
            type: "litigation"
          }
        ],
        analysisType: 'comprehensive'
      }

      console.log('📡 发送请求到 /api/timeline-analysis')
      console.log('📋 请求数据:', JSON.stringify(testData, null, 2))

      const response = await fetch('/api/timeline-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })

      console.log('📊 响应状态:', response.status)
      console.log('📊 响应OK:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ 错误响应:', errorText)
        throw new Error(`请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ 分析结果:', result)
      
      setTestResults(result)
    } catch (err) {
      console.error('❌ 测试失败:', err)
      setError(err instanceof Error ? err.message : '测试失败')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">🧪 时间轴AI分析调试页面</h1>
          <p className="text-gray-600">测试AI集成、数据流转和API响应</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🔍 集成状态检查</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold">🌐 环境信息</h3>
                <p className="text-sm text-gray-600">当前URL: {typeof window !== 'undefined' ? window.location.href : '服务器端'}</p>
                <p className="text-sm text-gray-600">用户代理: {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : '未知'}</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">⚙️ 配置检查</h3>
                <p className="text-sm text-gray-600">API端点: /api/timeline-analysis</p>
                <p className="text-sm text-gray-600">分析类型: comprehensive</p>
              </div>
            </div>
            
            <Button 
              onClick={runTest} 
              disabled={testing}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在测试...
                </>
              ) : (
                <>
                  🚀 开始集成测试
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                ✅ 测试成功 - AI分析结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 基础信息 */}
                {testResults.analysis?.summary && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">📊 案件概要</h3>
                    <div className="grid gap-2 text-sm">
                      <p>案件类型: {testResults.analysis.summary.caseType}</p>
                      <p>时间跨度: {testResults.analysis.summary.timeSpan}</p>
                      <p>涉案金额: {testResults.analysis.summary.disputedAmount ? `${testResults.analysis.summary.disputedAmount}元` : '未知'}</p>
                    </div>
                  </div>
                )}

                {/* 关键洞察 */}
                {testResults.analysis?.timelineInsights?.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">💡 关键洞察 ({testResults.analysis.timelineInsights.length})</h3>
                    <div className="space-y-2">
                      {testResults.analysis.timelineInsights.slice(0, 3).map((insight: any, i: number) => (
                        <div key={i} className="text-sm">
                          <strong>{insight.title}:</strong> {insight.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 法律建议 */}
                {testResults.analysis?.legalRecommendations && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">⚖️ 法律建议</h3>
                    {testResults.analysis.legalRecommendations.suggestedActions?.length > 0 && (
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {testResults.analysis.legalRecommendations.suggestedActions.slice(0, 3).map((action: string, i: number) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* 原始数据展示 */}
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold">🔍 查看完整响应数据</summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}