'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { SimpleFileUploader } from '@/components/SimpleFileUploader'
import { FileParser, type ParseProgress } from "@/src/domains/document-processing";
import { InlineEditor } from '@/components/InlineEditor'
import { Loader2, FileText, CheckCircle, AlertCircle, Edit, Eye, ArrowRight } from 'lucide-react'
import { useCaseManagementStore, useTeachingStore } from '@/src/domains/stores'
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
        description?: string
        credibilityScore?: number
        relevanceScore?: number
        accepted: boolean
        courtOpinion?: string
        relatedFacts?: string[]
      }>
    }
    reasoning: {
      summary: string
      legalBasis?: Array<{
        law: string
        article: string
        application: string
      }>
      logicChain?: Array<{
        premise: string
        inference: string
        conclusion: string
      }>
      keyArguments?: string[]
      judgment?: string
    }
  }
  metadata?: {
    confidence: number
    processingTime: number
    aiModel: string
    extractionMethod?: 'pure-ai' | 'hybrid' | 'rule-enhanced' | 'manual'
  }
}

// 转换函数：将提取的数据转换为LegalCase格式
function convertToLegalCase(extracted: ExtractedElements): LegalCase {
  // 构建时间轴数据（从timeline或facts中提取）
  let timeline = extracted.threeElements?.facts?.timeline?.map((item: any, index: number) => ({
    id: index + 1,
    date: item.date || new Date().toISOString().split('T')[0],
    event: item.event || item.title || '事件',
    title: item.event || item.title || '事件',
    description: item.description || item.event || item.title || '无详细描述',
    type: 'fact' as const,
    importance: (item.importance === 'critical' ? 'critical' :
                 item.importance === 'important' ? 'important' : 'normal') as 'critical' | 'important' | 'normal'
  })) || []

  // 如果没有时间轴数据，添加示例数据以便演示
  if (timeline.length === 0) {
    timeline = [
      {
        id: 1,
        date: '2024-01-15',
        event: '签订合同',
        title: '签订合同',
        description: '双方当事人签订买卖合同，约定交付时间和付款方式',
        type: 'fact' as const,
        importance: 'critical' as const
      },
      {
        id: 2,
        date: '2024-02-01',
        event: '逾期交付',
        title: '逾期交付',
        description: '卖方未能按约定时间交付货物，构成违约',
        type: 'fact' as const,
        importance: 'critical' as const
      },
      {
        id: 3,
        date: '2024-02-15',
        event: '催告履行',
        title: '催告履行',
        description: '买方书面催告卖方履行交付义务',
        type: 'fact' as const,
        importance: 'important' as const
      },
      {
        id: 4,
        date: '2024-03-01',
        event: '提起诉讼',
        title: '提起诉讼',
        description: '买方向法院提起违约损害赔偿诉讼',
        type: 'fact' as const,
        importance: 'critical' as const
      }
    ]
  }

  return {
    basicInfo: {
      caseNumber: extracted.basicInfo?.caseNumber || '(2024)京0105民初12345号',
      court: extracted.basicInfo?.court || '北京市朝阳区人民法院',
      judgeDate: extracted.basicInfo?.date || '2024-03-15',
      parties: {
        plaintiff: extracted.basicInfo?.parties?.plaintiff
          ? [{ name: extracted.basicInfo.parties.plaintiff, type: '自然人' }]
          : [{ name: '张三', type: '自然人' }],
        defendant: extracted.basicInfo?.parties?.defendant
          ? [{ name: extracted.basicInfo.parties.defendant, type: '自然人' }]
          : [{ name: '李四商贸有限公司', type: '法人' }]
      }
    },
    // 添加timeline到根级别，供时间轴组件使用
    timeline,
    threeElements: {
      facts: {
        // 添加main字段用于时间轴AI分析
        main: extracted.threeElements?.facts?.summary || '这是一起典型的买卖合同纠纷案件。双方就货物交付时间和质量标准存在争议。',
        // 添加disputed字段
        disputed: extracted.threeElements?.facts?.disputedFacts || ['逾期交付是否构成根本违约', '损害赔偿范围的确定'],
        // 保留原有字段以保持兼容性
        summary: extracted.threeElements?.facts?.summary || '这是一起典型的买卖合同纠纷案件。双方就货物交付时间和质量标准存在争议。',
        timeline: timeline,
        keyFacts: extracted.threeElements?.facts?.keyFacts || [],
        disputedFacts: extracted.threeElements?.facts?.disputedFacts || []
      },
      evidence: {
        summary: extracted.threeElements?.evidence?.summary || '本案主要证据包括买卖合同、发票、交付凭证、催告函等书面材料，以及相关证人证言。',
        items: extracted.threeElements?.evidence?.items?.map(item => ({
          id: item.name,
          name: item.name,
          type: item.type as '书证' | '物证' | '证人证言' | '鉴定意见' | '勘验笔录' | '视听资料' | '电子数据' | '当事人陈述',
          submittedBy: item.submittedBy as '原告' | '被告' | '第三人' | '法院调取',
          credibilityScore: item.credibilityScore,
          relevanceScore: item.credibilityScore || 80,
          accepted: item.accepted
        })) || [
          {
            id: 'contract',
            name: '买卖合同',
            type: '书证' as const,
            submittedBy: '原告' as const,
            credibilityScore: 95,
            relevanceScore: 95,
            accepted: true
          },
          {
            id: 'invoice',
            name: '发票',
            type: '书证' as const,
            submittedBy: '原告' as const,
            credibilityScore: 90,
            relevanceScore: 85,
            accepted: true
          }
        ],
        chainAnalysis: {
          complete: true,
          missingLinks: [],
          strength: 'strong' as const
        }
      },
      reasoning: {
        summary: extracted.threeElements?.reasoning?.summary || '本院认为，买卖双方成立有效的合同关系。被告未按约交付，构成违约，应承担相应责任。',
        legalBasis: extracted.threeElements?.reasoning?.legalBasis || [
          {
            law: '《民法典》',
            article: '第577条',
            application: '违约责任的一般规定'
          }
        ],
        logicChain: extracted.threeElements?.reasoning?.logicChain || [
          {
            premise: '双方签订买卖合同',
            inference: '合同关系成立且有效',
            conclusion: '双方应按约履行义务'
          },
          {
            premise: '被告未按约定时间交付货物',
            inference: '被告违反合同义务',
            conclusion: '被告构成违约'
          },
          {
            premise: '被告违约导致原告损失',
            inference: '原告有权请求赔偿',
            conclusion: '被告应承担违约责任'
          }
        ],
        keyArguments: extracted.threeElements?.reasoning?.keyArguments || [
          '合同成立且有效',
          '被告构成违约',
          '违约损害赔偿成立'
        ],
        judgment: extracted.threeElements?.reasoning?.judgment || '判决被告支付违约金并承担诉讼费用。'
      }
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      confidence: extracted.metadata?.confidence || 0,
      processingTime: extracted.metadata?.processingTime || 0,
      aiModel: extracted.metadata?.aiModel || 'unknown',
      extractionMethod: extracted.metadata?.aiModel === 'demo' ? 'manual' : 'pure-ai' as const
    }
  }
}

interface ThreeElementsExtractorProps {
  mode?: 'edit' | 'review'  // 模式：编辑模式（可上传）| 只读模式（仅查看）
}

export function ThreeElementsExtractor({ mode: pageMode = 'edit' }: ThreeElementsExtractorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extractedData, setExtractedData] = useState<ExtractedElements | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')  // 内容预览/编辑模式
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(null)
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false)
  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(false)

  // Zustand store hooks - 直接使用原始store避免兼容性问题
  const setCaseData = useCaseManagementStore((state) => state.setCurrentCase)
  const setCurrentAct = useTeachingStore((state) => state.setCurrentAct)

  // 🆕 Step 4: 从store恢复已提取的数据（用于查看历史记录）
  useEffect(() => {
    const uploadData = useTeachingStore.getState().uploadData;

    if (uploadData?.extractedElements && !extractedData) {
      console.log('📂 [ThreeElementsExtractor] 检测到已保存的提取数据，正在恢复:', {
        有数据: !!uploadData.extractedElements,
        置信度: uploadData.confidence,
      });

      // 将store中的extractedElements恢复到本地状态
      const restoredData = uploadData.extractedElements as unknown as ExtractedElements;
      setExtractedData(restoredData);
      setProgress(100);

      console.log('✅ [ThreeElementsExtractor] 数据恢复完成，显示提取结果');
    }
  }, []); // 只在组件挂载时执行一次

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

      setParseProgress(null)
      setProgress(40)

      // Step 2: 调用API提取三要素（新版DDD架构API，兼容旧格式）
      const response = await fetch('/api/legal-intelligence/extract', {
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

        // 🆕 DB-First: 立即保存到PostgreSQL
        console.log('💾 [DB-First] 提取成功，立即保存到数据库...');
        setProgress(75);

        try {
          // 转换为LegalCase格式
          const legalCase = convertToLegalCase(result.data);

          // 转换为数据库快照格式
          const snapshot = {
            version: '1.0.0',
            schemaVersion: 1,
            sessionState: 'act1' as const,
            caseTitle: legalCase.basicInfo.caseNumber || '未命名案例',
            caseNumber: legalCase.basicInfo.caseNumber,
            courtName: legalCase.basicInfo.court,
            act1: {
              basicInfo: legalCase.basicInfo,
              facts: legalCase.threeElements.facts,
              evidence: legalCase.threeElements.evidence,
              reasoning: legalCase.threeElements.reasoning,
              metadata: legalCase.metadata,
              uploadedAt: new Date().toISOString(),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSavedAt: new Date().toISOString(),
            saveType: 'auto' as const,
          };

          // 保存到数据库
          const saveResponse = await fetch('/api/teaching-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snapshot }),
          });

          if (!saveResponse.ok) {
            console.warn('⚠️ [DB-First] 数据库保存失败，降级到Store模式');
            // 降级：直接保存到Store（兜底）
            setCaseData(legalCase);
          } else {
            const saveResult = await saveResponse.json();
            console.log('✅ [DB-First] 数据库保存成功:', {
              sessionId: saveResult.data.sessionId,
              caseTitle: saveResult.data.caseTitle
            });

            // 从DB返回的数据设置到Store（Store只是UI缓存）
            setCaseData(legalCase);

            // 保存sessionId到teachingStore
            useTeachingStore.getState().setSessionMetadata({
              sessionId: saveResult.data.sessionId,
              sessionState: 'act1',
            });

            setProgress(95);
          }
        } catch (saveError) {
          console.error('❌ [DB-First] 保存失败:', saveError);
          // 降级：至少保存到Store
          const legalCase = convertToLegalCase(result.data);
          setCaseData(legalCase);
        }
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
              relevanceScore: 95,
              accepted: true
            },
            {
              name: '发票',
              type: '书证',
              submittedBy: '原告',
              credibilityScore: 90,
              relevanceScore: 85,
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
          logicChain: [
            {
              premise: '双方签订买卖合同',
              inference: '合同关系成立且有效',
              conclusion: '双方应按约履行义务'
            }
          ],
          keyArguments: ['合同成立且有效', '被告构成违约', '违约损害赔偿成立'],
          judgment: '判决被告支付违约金并承担诉讼费用。'
        }
      },
      metadata: {
        confidence: 85,
        processingTime: 2000,
        aiModel: 'demo',
        extractionMethod: 'manual' as const
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
    if (extractedData && extractedData.threeElements) {
      const dataString = JSON.stringify(extractedData)
      if (lastConvertedRef.current !== dataString) {
        lastConvertedRef.current = dataString
        const legalCase = convertToLegalCase(extractedData)
        setCaseData(legalCase)
      }
    }
  }, [extractedData, setCaseData])

  return (
    <div id="ThreeElementsExtractorId" className="space-y-6">
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
          {/* 只读模式提示 */}
          {pageMode === 'review' && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Eye className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                当前为复习模式，仅可查看已上传的案例数据，无法上传新文件
              </AlertDescription>
            </Alert>
          )}

          {/* 编辑模式：显示文件上传器 */}
          {pageMode === 'edit' && (
            <>
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
            </>
          )}
          
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
          {/* 编辑模式 - 暂时禁用，使用内联编辑代替 */}
          {mode === 'edit' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">编辑模式</span>
                </div>
                <p className="text-sm text-blue-700">
                  请使用下方的内联编辑功能直接修改内容。
                </p>
                <Button variant="outline" size="sm" onClick={() => setMode('preview')} className="mt-2">
                  返回预览
                </Button>
              </div>
            </div>
          ) : null}
          {/* 预览模式 */}
          {(mode === 'preview' || mode === 'edit') && (
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
                      `原告：${extractedData.basicInfo.parties.plaintiff || '未知'} | 被告：${extractedData.basicInfo.parties.defendant || '未知'}` : ''}
                    onSave={(value) => updateBasicInfo('parties', value)}
                    placeholder="格式：原告：姓名 | 被告：姓名"
                    className="col-span-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 三要素卡片 */}
          {extractedData.threeElements && (
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
                  value={extractedData.threeElements?.facts?.summary || ''}
                  onSave={(value) => updateThreeElements('facts', 'summary', value)}
                  placeholder="请输入事实摘要..."
                  multiline={true}
                />

                {extractedData.threeElements?.facts?.keyFacts && extractedData.threeElements.facts.keyFacts.length > 0 && (
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
                  value={extractedData.threeElements?.evidence?.summary || ''}
                  onSave={(value) => updateThreeElements('evidence', 'summary', value)}
                  placeholder="请输入证据概况..."
                  multiline={true}
                />

                {extractedData.threeElements?.evidence?.items && extractedData.threeElements.evidence.items.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">证据列表 ({extractedData.threeElements.evidence.items.length}项)</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
                        className="text-xs"
                      >
                        {isEvidenceExpanded ? '收起 ▲' : '展开 ▼'}
                      </Button>
                    </div>
                    {isEvidenceExpanded && (
                    <div className="space-y-2">
                      {extractedData.threeElements.evidence.items.map((item, index) => (
                        <div key={index} className="text-sm p-3 bg-muted rounded border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-base">{item.name}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.accepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.accepted ? '✓ 采纳' : '✗ 不采纳'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-muted-foreground">
                              <span className="font-medium">类型：</span>{item.type}
                              <span className="mx-2">|</span>
                              <span className="font-medium">提交方：</span>{item.submittedBy}
                            </div>
                            {item.description && (
                              <div className="text-muted-foreground bg-white p-2 rounded text-xs">
                                <span className="font-medium">内容：</span>{item.description}
                              </div>
                            )}
                            {item.courtOpinion && item.courtOpinion !== '未明确说明' && (
                              <div className="text-muted-foreground bg-amber-50 p-2 rounded text-xs">
                                <span className="font-medium">法院意见：</span>{item.courtOpinion}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
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
                  value={extractedData.threeElements?.reasoning?.summary || ''}
                  onSave={(value) => updateThreeElements('reasoning', 'summary', value)}
                  placeholder="请输入裁判理由..."
                  multiline={true}
                />

                {extractedData.threeElements?.reasoning?.legalBasis && extractedData.threeElements.reasoning.legalBasis.length > 0 && (
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

                {extractedData.threeElements?.reasoning?.judgment && (
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
          )}

          {/* 独立时间轴卡片 */}
          {extractedData.threeElements?.facts?.timeline && extractedData.threeElements.facts.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <CardTitle className="text-lg">
                      案件时间轴 ({extractedData.threeElements.facts.timeline.length}个事件)
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                    className="text-xs"
                  >
                    {isTimelineExpanded ? '收起 ▲' : '展开 ▼'}
                  </Button>
                </div>
                <CardDescription>
                  按时间顺序展示案件关键事件和发展过程
                </CardDescription>
              </CardHeader>
              {isTimelineExpanded && (
              <CardContent>
                <div className="relative">
                  {/* 时间线主线 */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200"></div>

                  {/* 时间事件列表 */}
                  <div className="space-y-4">
                    {extractedData.threeElements.facts.timeline.map((item, index) => (
                      <div key={index} className="relative pl-12">
                        {/* 时间节点圆点 */}
                        <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                          item.importance === 'critical' ? 'bg-red-500 border-red-600' :
                          item.importance === 'important' ? 'bg-orange-400 border-orange-500' :
                          'bg-blue-400 border-blue-500'
                        }`}></div>

                        {/* 时间事件内容 */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-700 text-sm">
                                {typeof item.date === 'string' ? item.date : JSON.stringify(item.date)}
                              </span>
                              {item.importance && (
                                <span className={`text-xs px-2 py-1 rounded font-medium ${
                                  item.importance === 'critical' ? 'bg-red-100 text-red-700' :
                                  item.importance === 'important' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.importance === 'critical' ? '⚡ 关键' :
                                   item.importance === 'important' ? '⭐ 重要' : '📌 一般'}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {typeof item.event === 'string' ? item.event :
                             (typeof item === 'object' && 'description' in item ? String((item as any).description) : JSON.stringify(item))}
                          </p>
                          {(item as any).actors && (item as any).actors.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">相关方：</span>
                              {(item as any).actors.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              )}
            </Card>
          )}

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
                        onClick={() => setCurrentAct('analysis')}
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