'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { SimpleFileUploader } from '@/components/SimpleFileUploader'
import { FileParser, type ParseProgress } from '@/lib/file-parser'
import { ElementEditor } from '@/components/ElementEditor'
import { InlineEditor } from '@/components/InlineEditor'
import { Loader2, FileText, CheckCircle, AlertCircle, Edit, Eye, ArrowRight } from 'lucide-react'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import type { LegalCase } from '@/types/legal-case'

interface ExtractedElements {
  basicInfo?: {
    caseNumber?: string
    court?: string
    date?: string
    parties?: {
      plaintiff?: string
      defendant?: string
    }
  }
  threeElements: {
    facts: {
      summary: string
      timeline?: Array<{
        date: string
        event: string
        importance: string
      }>
      keyFacts?: string[]
      disputedFacts?: string[]
    }
    evidence: {
      summary: string
      items?: Array<{
        name: string
        type: string
        submittedBy: string
        credibilityScore: number
        accepted: boolean
      }>
    }
    reasoning: {
      summary: string
      legalBasis?: Array<{
        law: string
        article: string
        application: string
      }>
      keyArguments?: string[]
      judgment?: string
    }
  }
  metadata?: {
    confidence: number
    processingTime: number
    aiModel: string
  }
}

// 转换函数：将提取的数据转换为LegalCase格式
function convertToLegalCase(extracted: ExtractedElements): LegalCase {
  // 构建时间轴数据（从timeline或facts中提取）
  const timeline = extracted.threeElements.facts.timeline?.map((item: any, index: number) => ({
    id: index + 1,
    date: item.date || new Date().toISOString().split('T')[0],
    title: item.event || item.title || '事件',
    description: item.description || item.event || '',
    type: 'other' as const,
    importance: 'reference' as const
  })) || []

  return {
    basicInfo: {
      caseNumber: extracted.basicInfo?.caseNumber || '',
      court: extracted.basicInfo?.court || '',
      date: extracted.basicInfo?.date || '',
      parties: {
        plaintiff: typeof extracted.basicInfo?.parties?.plaintiff === 'string' 
          ? [{ name: extracted.basicInfo.parties.plaintiff, type: '自然人' }]
          : extracted.basicInfo?.parties?.plaintiff 
            ? [{ name: extracted.basicInfo.parties.plaintiff.name || '未知', type: '自然人' }]
            : [],
        defendant: typeof extracted.basicInfo?.parties?.defendant === 'string'
          ? [{ name: extracted.basicInfo.parties.defendant, type: '自然人' }]
          : extracted.basicInfo?.parties?.defendant
            ? [{ name: extracted.basicInfo.parties.defendant.name || '未知', type: '自然人' }]
            : []
      }
    },
    // 添加timeline到根级别，供TimelineAIAnalysis使用
    timeline,
    threeElements: {
      facts: {
        // 添加main字段用于TimelineAIAnalysis组件
        main: extracted.threeElements.facts.summary,
        // 添加disputed字段
        disputed: extracted.threeElements.facts.disputedFacts || [],
        // 保留原有字段以保持兼容性
        summary: extracted.threeElements.facts.summary,
        timeline: extracted.threeElements.facts.timeline || [],
        keyFacts: extracted.threeElements.facts.keyFacts || [],
        disputedFacts: extracted.threeElements.facts.disputedFacts || []
      },
      evidence: {
        summary: extracted.threeElements.evidence.summary,
        items: extracted.threeElements.evidence.items?.map(item => ({
          id: item.name,
          name: item.name,
          type: item.type,
          submittedBy: item.submittedBy,
          credibilityScore: item.credibilityScore,
          accepted: item.accepted,
          content: ''
        })) || []
      },
      reasoning: {
        summary: extracted.threeElements.reasoning.summary,
        legalBasis: extracted.threeElements.reasoning.legalBasis || [],
        keyArguments: extracted.threeElements.reasoning.keyArguments || [],
        judgment: extracted.threeElements.reasoning.judgment || ''
      }
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      confidence: extracted.metadata?.confidence || 0,
      processingTime: extracted.metadata?.processingTime || 0,
      aiModel: extracted.metadata?.aiModel || 'unknown'
    }
  }
}

export function ThreeElementsExtractor() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extractedData, setExtractedData] = useState<ExtractedElements | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [documentText, setDocumentText] = useState<string>('')
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [editedData, setEditedData] = useState<ExtractedElements | null>(null)
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(null)
  
  // Zustand store hooks
  const { setCaseData, setCurrentAct } = useCaseStore()

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null)
    setExtractedData(null)
    setParseProgress(null)
    setProgress(10)
    setIsProcessing(true)

    try {
      // Step 1: 解析文件内容 (带进度回调)
      const text = await FileParser.parse(file, (parseProgress) => {
        setParseProgress(parseProgress)
        // 文件解析占总进度的30%
        setProgress(10 + Math.round(parseProgress.progress * 0.3))
      })
      
      setDocumentText(text)
      setParseProgress(null)
      setProgress(40)

      // Step 2: 调用API提取三要素
      const response = await fetch('/api/extract-elements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          useAI: true,
        }),
      })

      setProgress(70)

      if (!response.ok) {
        throw new Error('提取失败')
      }

      const result = await response.json()
      setProgress(90)

      if (result.success) {
        setExtractedData(result.data)
        // 转换并保存到全局store
        const legalCase = convertToLegalCase(result.data)
        setCaseData(legalCase)
      } else {
        throw new Error(result.error || '提取失败')
      }

      setProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理文件时出错')
    } finally {
      setIsProcessing(false)
    }
  }, [])


  const handleEditClick = useCallback(() => {
    setMode('edit')
    setEditedData(extractedData)
  }, [extractedData])

  const handleSaveEdit = useCallback((data: ExtractedElements) => {
    setEditedData(data)
    setExtractedData(data)
    setMode('preview')
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditedData(null)
    setMode('preview')
  }, [])

  // 内联编辑处理函数
  const updateBasicInfo = useCallback((field: string, value: string) => {
    const currentData = editedData || extractedData
    if (!currentData) return

    const updatedData = {
      ...currentData,
      basicInfo: {
        ...currentData.basicInfo,
        [field]: value
      }
    }
    setEditedData(updatedData)
    setExtractedData(updatedData) // 实时更新显示数据
  }, [editedData, extractedData])

  const updateThreeElements = useCallback((element: 'facts' | 'evidence' | 'reasoning', field: string, value: string) => {
    const currentData = editedData || extractedData
    if (!currentData) return

    const updatedData = {
      ...currentData,
      threeElements: {
        ...currentData.threeElements,
        [element]: {
          ...currentData.threeElements[element],
          [field]: value
        }
      }
    }
    setEditedData(updatedData)
    setExtractedData(updatedData) // 实时更新显示数据
  }, [editedData, extractedData])

  return (
    <div className="space-y-6">
      {/* 文件上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            判决书三要素智能提取
          </CardTitle>
          <CardDescription>
            上传判决书文件（支持PDF、DOCX、MD、TXT格式），AI将自动提取事实认定、证据质证、法官说理三个核心要素
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleFileUploader onFileSelect={handleFileSelect} />
          
          {isProcessing && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  {parseProgress ? parseProgress.message : '正在处理文档...'}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              {parseProgress && (
                <p className="text-xs text-gray-500">
                  {parseProgress.stage === 'parsing' ? '📄' : 
                   parseProgress.stage === 'reading' ? '📖' : 
                   parseProgress.stage === 'loading' ? '⚡' : '🔄'} {parseProgress.message}
                </p>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 提取结果展示 */}
      {extractedData && (
        <div className="space-y-4">
          {/* 编辑模式 */}
          {mode === 'edit' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">编辑模式</span>
                </div>
                <p className="text-sm text-blue-700">
                  您可以直接编辑AI提取的内容，修改后点击"保存预览"即可保存更改。
                </p>
              </div>
              <ElementEditor
                data={editedData || extractedData}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
              />
            </div>
          ) : (
            <>
              {/* 预览模式 - 基本信息 */}
              {extractedData.basicInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">基本信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <InlineEditor
                    label="案号"
                    value={extractedData.basicInfo?.caseNumber || ''}
                    onSave={(value) => updateBasicInfo('caseNumber', value)}
                    placeholder="请输入案号..."
                    className="col-span-2"
                  />
                  
                  <InlineEditor
                    label="法院"
                    value={extractedData.basicInfo?.court || ''}
                    onSave={(value) => updateBasicInfo('court', value)}
                    placeholder="请输入法院名称..."
                  />
                  
                  <InlineEditor
                    label="日期"
                    value={extractedData.basicInfo?.date || ''}
                    onSave={(value) => updateBasicInfo('date', value)}
                    placeholder="请输入判决日期..."
                  />
                  
                  <InlineEditor
                    label="当事人"
                    value={extractedData.basicInfo?.parties ? 
                      `原告：${typeof extractedData.basicInfo.parties.plaintiff === 'string' 
                        ? extractedData.basicInfo.parties.plaintiff 
                        : extractedData.basicInfo.parties.plaintiff?.name || '未知'} | 被告：${typeof extractedData.basicInfo.parties.defendant === 'string'
                        ? extractedData.basicInfo.parties.defendant 
                        : extractedData.basicInfo.parties.defendant?.name || '未知'}` : ''}
                    onSave={(value) => updateBasicInfo('parties', value)}
                    placeholder="格式：原告：姓名 | 被告：姓名"
                    className="col-span-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 三要素卡片 */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* 事实认定 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  事实认定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InlineEditor
                  label="事实摘要"
                  value={extractedData.threeElements.facts.summary || ''}
                  onSave={(value) => updateThreeElements('facts', 'summary', value)}
                  placeholder="请输入事实摘要..."
                  multiline={true}
                />
                
                {extractedData.threeElements.facts.keyFacts && extractedData.threeElements.facts.keyFacts.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">关键事实</h4>
                    <ul className="text-sm space-y-1">
                      {extractedData.threeElements.facts.keyFacts.map((fact, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span className="text-muted-foreground">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {extractedData.threeElements.facts.timeline && extractedData.threeElements.facts.timeline.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">时间线</h4>
                    <div className="space-y-2">
                      {extractedData.threeElements.facts.timeline.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium">{item.date}</div>
                          <div className="text-muted-foreground">{item.event}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 证据质证 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  证据质证
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InlineEditor
                  label="证据概况"
                  value={extractedData.threeElements.evidence.summary || ''}
                  onSave={(value) => updateThreeElements('evidence', 'summary', value)}
                  placeholder="请输入证据概况..."
                  multiline={true}
                />

                {extractedData.threeElements.evidence.items && extractedData.threeElements.evidence.items.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">主要证据</h4>
                    <div className="space-y-2">
                      {extractedData.threeElements.evidence.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm p-2 bg-muted rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{item.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              item.accepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.accepted ? '采纳' : '不采纳'}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-1">
                            {item.type} - 提交方：{item.submittedBy}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            可信度：{item.credibilityScore}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 法官说理 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                  法官说理
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InlineEditor
                  label="裁判理由"
                  value={extractedData.threeElements.reasoning.summary || ''}
                  onSave={(value) => updateThreeElements('reasoning', 'summary', value)}
                  placeholder="请输入裁判理由..."
                  multiline={true}
                />

                {extractedData.threeElements.reasoning.legalBasis && extractedData.threeElements.reasoning.legalBasis.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-1">法律依据</h4>
                    <div className="space-y-1">
                      {extractedData.threeElements.reasoning.legalBasis.slice(0, 2).map((item, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium">{item.law}</div>
                          <div className="text-muted-foreground">{item.article}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extractedData.threeElements.reasoning.judgment && (
                  <div>
                    <h4 className="font-medium mb-1">判决结果</h4>
                    <p className="text-sm text-muted-foreground">
                      {extractedData.threeElements.reasoning.judgment}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 元数据和操作按钮 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {extractedData.metadata && (
                    <>
                      <span>置信度：{extractedData.metadata.confidence}%</span>
                      <span>处理时间：{extractedData.metadata.processingTime}ms</span>
                      <span>AI模型：{extractedData.metadata.aiModel}</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {mode === 'preview' ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleEditClick}>
                        <Edit className="w-4 h-4 mr-1" />
                        编辑内容
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => setCurrentAct('act1')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        进入要素分析
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setMode('preview')}>
                      <Eye className="w-4 h-4 mr-1" />
                      保存预览
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}