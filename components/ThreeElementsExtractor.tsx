'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { SimpleFileUploader } from '@/components/SimpleFileUploader'
import { FileParser, type ParseProgress } from "@/src/domains/document-processing";
import { ElementEditor } from '@/components/ElementEditor'
import { InlineEditor } from '@/components/InlineEditor'
import { Loader2, FileText, CheckCircle, AlertCircle, Edit, Eye, ArrowRight } from 'lucide-react'
import { useCurrentCase, useCaseManagementStore, useTeachingStore } from '@/src/domains/stores'
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
  let timeline = extracted.threeElements.facts.timeline?.map((item: any, index: number) => ({
    id: `event-${index + 1}`,
    date: item.date || new Date().toISOString().split('T')[0],
    title: item.event || item.title || '事件',
    description: item.description || item.event || item.title || '无详细描述',
    type: 'fact' as const,
    importance: (item.importance === 'critical' ? 'critical' : 
                 item.importance === 'important' ? 'important' : 'reference') as const
  })) || []

  // 如果没有时间轴数据，添加示例数据以便演示
  if (timeline.length === 0) {
    timeline = [
      {
        id: 'event-1',
        date: '2024-01-15',
        title: '签订合同',
        description: '双方当事人签订买卖合同，约定交付时间和付款方式',
        type: 'fact' as const,
        importance: 'critical' as const
      },
      {
        id: 'event-2', 
        date: '2024-02-01',
        title: '逾期交付',
        description: '卖方未能按约定时间交付货物，构成违约',
        type: 'fact' as const,
        importance: 'critical' as const
      },
      {
        id: 'event-3',
        date: '2024-02-15', 
        title: '催告履行',
        description: '买方书面催告卖方履行交付义务',
        type: 'procedure' as const,
        importance: 'important' as const
      },
      {
        id: 'event-4',
        date: '2024-03-01',
        title: '提起诉讼',
        description: '买方向法院提起违约损害赔偿诉讼',
        type: 'filing' as const,
        importance: 'critical' as const
      }
    ]
  }

  return {
    basicInfo: {
      caseNumber: extracted.basicInfo?.caseNumber || '(2024)京0105民初12345号',
      court: extracted.basicInfo?.court || '北京市朝阳区人民法院',
      date: extracted.basicInfo?.date || '2024-03-15',
      parties: {
        plaintiff: typeof extracted.basicInfo?.parties?.plaintiff === 'string' 
          ? [{ name: extracted.basicInfo.parties.plaintiff, type: '自然人' }]
          : extracted.basicInfo?.parties?.plaintiff 
            ? [{ name: extracted.basicInfo.parties.plaintiff.name || '未知', type: '自然人' }]
            : [{ name: '张三', type: '自然人' }],
        defendant: typeof extracted.basicInfo?.parties?.defendant === 'string'
          ? [{ name: extracted.basicInfo.parties.defendant, type: '自然人' }]
          : extracted.basicInfo?.parties?.defendant
            ? [{ name: extracted.basicInfo.parties.defendant.name || '未知', type: '自然人' }]
            : [{ name: '李四商贸有限公司', type: '法人' }]
      }
    },
    // 添加timeline到根级别，供时间轴组件使用
    timeline,
    threeElements: {
      facts: {
        // 添加main字段用于时间轴AI分析
        main: extracted.threeElements.facts.summary || '这是一起典型的买卖合同纠纷案件。双方就货物交付时间和质量标准存在争议。',
        // 添加disputed字段
        disputed: extracted.threeElements.facts.disputedFacts || ['逾期交付是否构成根本违约', '损害赔偿范围的确定'],
        // 保留原有字段以保持兼容性
        summary: extracted.threeElements.facts.summary || '这是一起典型的买卖合同纠纷案件。双方就货物交付时间和质量标准存在争议。',
        timeline: timeline,
        keyFacts: extracted.threeElements.facts.keyFacts || [],
        disputedFacts: extracted.threeElements.facts.disputedFacts || []
      },
      evidence: {
        summary: extracted.threeElements.evidence.summary || '本案主要证据包括买卖合同、发票、交付凭证、催告函等书面材料，以及相关证人证言。',
        items: extracted.threeElements.evidence.items?.map(item => ({
          id: item.name,
          name: item.name,
          type: item.type,
          submittedBy: item.submittedBy,
          credibilityScore: item.credibilityScore,
          accepted: item.accepted,
          content: ''
        })) || [
          {
            id: 'contract',
            name: '买卖合同',
            type: '书证',
            submittedBy: '原告',
            credibilityScore: 95,
            accepted: true,
            content: '双方签订的标准买卖合同'
          },
          {
            id: 'invoice', 
            name: '发票',
            type: '书证',
            submittedBy: '原告',
            credibilityScore: 90,
            accepted: true,
            content: '购货发票及相关凭证'
          }
        ]
      },
      reasoning: {
        summary: extracted.threeElements.reasoning.summary || '本院认为，买卖双方成立有效的合同关系。被告未按约交付，构成违约，应承担相应责任。',
        legalBasis: extracted.threeElements.reasoning.legalBasis || [
          {
            law: '《民法典》',
            article: '第577条',
            application: '违约责任的一般规定'
          }
        ],
        keyArguments: extracted.threeElements.reasoning.keyArguments || [
          '合同成立且有效',
          '被告构成违约',
          '违约损害赔偿成立'
        ],
        judgment: extracted.threeElements.reasoning.judgment || '判决被告支付违约金并承担诉讼费用。'
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
  
  // Zustand store hooks - 直接使用原始store避免兼容性问题
  const setCaseData = useCaseManagementStore((state) => state.setCurrentCase)
  const setCurrentAct = useTeachingStore((state) => state.setCurrentAct)

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
  }, [setCaseData])


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

  // 加载演示数据
  const handleLoadDemoData = useCallback(() => {
    const demoData: ExtractedElements = {
      basicInfo: {
        caseNumber: '(2024)京0105民初12345号',
        court: '北京市朝阳区人民法院',
        date: '2024-03-15',
        parties: {
          plaintiff: '张三',
          defendant: '李四商贸有限公司'
        }
      },
      threeElements: {
        facts: {
          summary: '这是一起典型的买卖合同纠纷案件。双方就货物交付时间和质量标准存在争议。',
          timeline: [
            {
              date: '2024-01-15',
              event: '签订合同',
              importance: 'critical'
            },
            {
              date: '2024-02-01', 
              event: '逾期交付',
              importance: 'critical'
            },
            {
              date: '2024-02-15',
              event: '催告履行', 
              importance: 'important'
            },
            {
              date: '2024-03-01',
              event: '提起诉讼',
              importance: 'critical'
            }
          ],
          keyFacts: ['合同签订', '逾期交付', '损失发生'],
          disputedFacts: ['逾期交付是否构成根本违约', '损害赔偿范围的确定']
        },
        evidence: {
          summary: '本案主要证据包括买卖合同、发票、交付凭证、催告函等书面材料，以及相关证人证言。',
          items: [
            {
              name: '买卖合同',
              type: '书证',
              submittedBy: '原告',
              credibilityScore: 95,
              accepted: true
            },
            {
              name: '发票',
              type: '书证', 
              submittedBy: '原告',
              credibilityScore: 90,
              accepted: true
            }
          ]
        },
        reasoning: {
          summary: '本院认为，买卖双方成立有效的合同关系。被告未按约交付，构成违约，应承担相应责任。',
          legalBasis: [
            {
              law: '《民法典》',
              article: '第577条',
              application: '违约责任的一般规定'
            }
          ],
          keyArguments: ['合同成立且有效', '被告构成违约', '违约损害赔偿成立'],
          judgment: '判决被告支付违约金并承担诉讼费用。'
        }
      },
      metadata: {
        confidence: 85,
        processingTime: 2000,
        aiModel: 'demo'
      }
    }
    
    setExtractedData(demoData)
    const legalCase = convertToLegalCase(demoData)
    setCaseData(legalCase)
    setProgress(100)
  }, [setCaseData])

  // 内联编辑处理函数 - 使用 useCallback 避免无限循环
  const updateBasicInfo = useCallback((field: string, value: string) => {
    setExtractedData(currentData => {
      if (!currentData) return null

      return {
        ...currentData,
        basicInfo: {
          ...currentData.basicInfo,
          [field]: value
        }
      }
    })
  }, [])

  const updateThreeElements = useCallback((element: 'facts' | 'evidence' | 'reasoning', field: string, value: string) => {
    setExtractedData(currentData => {
      if (!currentData) return null

      return {
        ...currentData,
        threeElements: {
          ...currentData.threeElements,
          [element]: {
            ...currentData.threeElements[element],
            [field]: value
          }
        }
      }
    })
  }, [])

  // 分离的同步函数，避免在setState中调用
  // 使用 useRef 缓存转换结果，避免无限重新渲染
  const lastConvertedRef = useRef<string | null>(null)

  useEffect(() => {
    if (extractedData) {
      const dataString = JSON.stringify(extractedData)
      if (lastConvertedRef.current !== dataString) {
        lastConvertedRef.current = dataString
        const legalCase = convertToLegalCase(extractedData)
        setCaseData(legalCase)
      }
    }
  }, [extractedData, setCaseData])

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
          
          {/* 演示数据按钮 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">或者直接体验演示数据</p>
                <Button 
                  variant="outline" 
                  onClick={handleLoadDemoData}
                  className="gap-2"
                  disabled={isProcessing}
                >
                  <FileText className="w-4 h-4" />
                  加载演示案例
                </Button>
                <p className="text-xs text-gray-500 mt-1">买卖合同纠纷案例</p>
              </div>
            </div>
          </div>
          
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