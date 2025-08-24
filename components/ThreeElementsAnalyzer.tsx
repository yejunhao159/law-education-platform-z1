'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, Upload, Loader2, Download, Edit, Save, X, 
  CheckCircle, AlertCircle, Calendar, Scale, Brain, 
  Sparkles, ChevronRight, Eye, Clock, Users
} from 'lucide-react'

interface ThreeElementsAnalyzerProps {
  documentText?: string
  onAnalysisComplete?: (data: any) => void
  onProceedToNextAct?: () => void
}

export function ThreeElementsAnalyzer({ 
  documentText = '', 
  onAnalysisComplete,
  onProceedToNextAct 
}: ThreeElementsAnalyzerProps) {
  const [text, setText] = useState(documentText)
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'facts' | 'evidence' | 'reasoning'>('facts')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      setText(content)
      setError(null)
    } catch (err) {
      setError('文件读取失败，请确保是文本文件')
    }
  }

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('请先上传或输入判决书内容')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/extract-elements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          useAI: true, // 使用配置好的DeepSeek API
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '分析失败')
      }

      setAnalysisResult(result)
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败')
    } finally {
      setIsProcessing(false)
    }
  }, [text, onAnalysisComplete])

  const downloadResult = useCallback(() => {
    if (!analysisResult) return
    
    const dataStr = JSON.stringify(analysisResult, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', `analysis_${Date.now()}.json`)
    linkElement.click()
  }, [analysisResult])

  const renderFactsTab = () => {
    const facts = analysisResult?.data?.threeElements?.facts
    if (!facts) return null

    return (
      <div className="space-y-6">
        {/* 事实摘要 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              事实摘要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 leading-relaxed">
              {facts.summary || '暂无摘要'}
            </p>
          </CardContent>
        </Card>

        {/* 时间线 */}
        {facts.timeline && facts.timeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                案件时间线
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {facts.timeline.map((item: any, index: number) => (
                  <div key={index} className="flex gap-3 items-start">
                    <Badge 
                      variant={item.importance === 'critical' ? 'destructive' : 
                              item.importance === 'important' ? 'default' : 'secondary'}
                      className="min-w-fit"
                    >
                      {item.date}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">{item.event}</p>
                      {item.actors && item.actors.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.actors.map((actor: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {actor}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 关键事实与争议 */}
        <div className="grid md:grid-cols-2 gap-4">
          {facts.keyFacts && facts.keyFacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  关键事实
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {facts.keyFacts.map((fact: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {facts.disputedFacts && facts.disputedFacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  争议事实
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {facts.disputedFacts.map((fact: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">•</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  const renderEvidenceTab = () => {
    const evidence = analysisResult?.data?.threeElements?.evidence
    if (!evidence) return null

    return (
      <div className="space-y-6">
        {/* 证据概况 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4" />
              证据概况
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 leading-relaxed">
              {evidence.summary || '暂无概况'}
            </p>
            
            {evidence.chainAnalysis && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>证据链完整性</span>
                  <Badge variant={evidence.chainAnalysis.complete ? 'default' : 'secondary'}>
                    {evidence.chainAnalysis.complete ? '完整' : '不完整'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span>证明力强度</span>
                  <Badge 
                    variant={evidence.chainAnalysis.strength === 'strong' ? 'default' : 
                            evidence.chainAnalysis.strength === 'moderate' ? 'secondary' : 'outline'}
                  >
                    {evidence.chainAnalysis.strength === 'strong' ? '强' :
                     evidence.chainAnalysis.strength === 'moderate' ? '中等' : '弱'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 证据列表 */}
        {evidence.items && evidence.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">证据清单</CardTitle>
              <CardDescription>共 {evidence.items.length} 项证据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {evidence.items.map((item: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-medium text-sm">{item.name}</h5>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{item.type}</Badge>
                          <Badge variant="outline" className="text-xs">
                            提交方：{item.submittedBy}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant={item.accepted ? 'default' : 'destructive'}>
                        {item.accepted ? '采纳' : '不采纳'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>可信度</span>
                          <span>{item.credibilityScore}%</span>
                        </div>
                        <Progress value={item.credibilityScore} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>相关性</span>
                          <span>{item.relevanceScore}%</span>
                        </div>
                        <Progress value={item.relevanceScore} className="h-1.5" />
                      </div>
                    </div>

                    {item.courtOpinion && (
                      <p className="text-xs text-gray-600 mt-2 pt-2 border-t">
                        法院意见：{item.courtOpinion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderReasoningTab = () => {
    const reasoning = analysisResult?.data?.threeElements?.reasoning
    if (!reasoning) return null

    return (
      <div className="space-y-6">
        {/* 裁判理由 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4" />
              裁判理由
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 leading-relaxed">
              {reasoning.summary || '暂无摘要'}
            </p>
          </CardContent>
        </Card>

        {/* 法律依据 */}
        {reasoning.legalBasis && reasoning.legalBasis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">法律依据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reasoning.legalBasis.map((item: any, index: number) => (
                  <div key={index} className="border-l-3 border-purple-400 pl-3">
                    <h5 className="font-medium text-sm">{item.law}</h5>
                    <p className="text-sm text-gray-600 mt-1">{item.article}</p>
                    {item.application && (
                      <p className="text-xs text-gray-500 mt-1">
                        应用：{item.application}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 逻辑推理 */}
        {reasoning.logicChain && reasoning.logicChain.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">推理逻辑</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reasoning.logicChain.map((item: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-500">前提：</span>
                        <span className="ml-2">{item.premise}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">推理：</span>
                        <span className="ml-2">{item.inference}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">结论：</span>
                        <span className="ml-2 font-medium">{item.conclusion}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 判决结果 */}
        {reasoning.judgment && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-base">判决结果</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{reasoning.judgment}</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      {!analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              上传判决书
            </CardTitle>
            <CardDescription>
              支持TXT、MD格式文本文件，AI将自动提取三要素
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                accept=".txt,.md"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>

            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="或直接粘贴判决书内容..."
                className="w-full h-32 p-3 border rounded-md text-sm"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isProcessing || !text.trim()}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI正在分析...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  智能提取三要素
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 分析结果 */}
      {analysisResult && (
        <>
          {/* 结果概览 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI分析结果</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={downloadResult}>
                    <Download className="w-4 h-4 mr-1" />
                    导出
                  </Button>
                  {onProceedToNextAct && (
                    <Button size="sm" onClick={onProceedToNextAct}>
                      进入下一幕
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisResult.data?.threeElements?.facts?.timeline?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">时间线事件</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResult.data?.threeElements?.evidence?.items?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">证据数量</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResult.data?.threeElements?.reasoning?.legalBasis?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">法律依据</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {analysisResult.confidence || 0}%
                  </div>
                  <div className="text-xs text-gray-600">置信度</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 三要素详情 */}
          <Card>
            <CardHeader>
              <div className="flex gap-2 border-b">
                <button
                  onClick={() => setActiveTab('facts')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'facts' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  事实认定
                </button>
                <button
                  onClick={() => setActiveTab('evidence')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'evidence' 
                      ? 'border-green-500 text-green-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Scale className="w-4 h-4 inline mr-1" />
                  证据质证
                </button>
                <button
                  onClick={() => setActiveTab('reasoning')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'reasoning' 
                      ? 'border-purple-500 text-purple-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Brain className="w-4 h-4 inline mr-1" />
                  法官说理
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {activeTab === 'facts' && renderFactsTab()}
              {activeTab === 'evidence' && renderEvidenceTab()}
              {activeTab === 'reasoning' && renderReasoningTab()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}