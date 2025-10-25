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
import { SnapshotConverter } from '@/src/domains/teaching-acts/utils/SnapshotConverterV2'

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
  const timeline = extracted.threeElements?.facts?.timeline?.map((item: any, index: number) => ({
    id: index + 1,
    date: item.date || new Date().toISOString().split('T')[0],
    event: item.event || item.title || '事件',
    title: item.event || item.title || '事件',
    description: item.description || item.event || item.title || '无详细描述',
    type: 'fact' as const,
    importance: (item.importance === 'critical' ? 'critical' :
                 item.importance === 'important' ? 'important' : 'normal') as 'critical' | 'important' | 'normal'
  })) || []

  return {
    basicInfo: {
      caseNumber: extracted.basicInfo?.caseNumber || '',
      court: extracted.basicInfo?.court || '',
      judgeDate: extracted.basicInfo?.date || new Date().toISOString().split('T')[0],
      parties: {
        plaintiff: extracted.basicInfo?.parties?.plaintiff
          ? [{ name: extracted.basicInfo.parties.plaintiff, type: '自然人' }]
          : [],
        defendant: extracted.basicInfo?.parties?.defendant
          ? [{ name: extracted.basicInfo.parties.defendant, type: '自然人' }]
          : []
      }
    },
    // 添加timeline到根级别，供时间轴组件使用
    timeline,
    threeElements: {
      facts: {
        // 添加main字段用于时间轴AI分析
        main: extracted.threeElements?.facts?.summary || '',
        // 添加disputed字段
        disputed: extracted.threeElements?.facts?.disputedFacts || [],
        // 保留原有字段以保持兼容性
        summary: extracted.threeElements?.facts?.summary || '',
        timeline: timeline,
        keyFacts: extracted.threeElements?.facts?.keyFacts || [],
        disputedFacts: extracted.threeElements?.facts?.disputedFacts || []
      },
      evidence: {
        summary: extracted.threeElements?.evidence?.summary || '',
        items: extracted.threeElements?.evidence?.items?.map(item => ({
          id: item.name,
          name: item.name,
          type: item.type as '书证' | '物证' | '证人证言' | '鉴定意见' | '勘验笔录' | '视听资料' | '电子数据' | '当事人陈述',
          submittedBy: item.submittedBy as '原告' | '被告' | '第三人' | '法院调取',
          credibilityScore: item.credibilityScore,
          relevanceScore: item.credibilityScore || 80,
          accepted: item.accepted
        })) || [],
        chainAnalysis: {
          complete: false,
          missingLinks: [],
          strength: 'weak' as const
        }
      },
      reasoning: {
        summary: extracted.threeElements?.reasoning?.summary || '',
        legalBasis: extracted.threeElements?.reasoning?.legalBasis || [],
        logicChain: extracted.threeElements?.reasoning?.logicChain || [],
        keyArguments: extracted.threeElements?.reasoning?.keyArguments || [],
        judgment: extracted.threeElements?.reasoning?.judgment || ''
      }
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      confidence: extracted.metadata?.confidence || 0,
      processingTime: extracted.metadata?.processingTime || 0,
      aiModel: extracted.metadata?.aiModel || 'unknown',
      extractionMethod: extracted.metadata?.aiModel === 'demo' ? 'manual' : 'ai' as const
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
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(false)

  // 跟踪已加载的sessionId，避免重复加载
  const loadedSessionIdRef = useRef<string | null>(null)

  // Zustand store hooks - 直接使用原始store避免兼容性问题
  const setCaseData = useCaseManagementStore((state) => state.setCurrentCase)
  const setCurrentAct = useTeachingStore((state) => state.setCurrentAct)

  // 获取 URL 中的 sessionId（复习模式下使用）
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const sessionId = searchParams?.get('sessionId')

  // 清理逻辑：当模式或sessionId改变时，重置状态
  useEffect(() => {
    if (pageMode !== 'review') {
      loadedSessionIdRef.current = null;
    }
  }, [pageMode]);

  // 🆕 复习模式：直接从数据库加载数据
  useEffect(() => {
    const loadDataFromDatabase = async () => {
      // 检查是否需要加载
      if (pageMode !== 'review' || !sessionId) {
        return;
      }

      // 检查是否已经加载过这个session
      if (loadedSessionIdRef.current === sessionId) {
        return;
      }

      // 检查是否正在加载或已有数据
      if (isLoadingFromDB || extractedData) {
        return;
      }

      console.log('📥 [ThreeElementsExtractor] 复习模式：从数据库加载数据...', { sessionId });
      setIsLoadingFromDB(true);

      try {
        // 1. 从数据库读取 session
        const response = await fetch(`/api/teaching-sessions/${sessionId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || '加载失败');
        }

        const session = result.data;
        console.log('✅ [ThreeElementsExtractor] 数据库数据已加载:', {
          caseTitle: session.caseTitle,
          sessionState: session.sessionState,
          hasAct1: !!session.act1,
          keyFactsCount: session.act1?.facts?.keyFacts?.length || 0,
          timelineCount: session.act1?.facts?.timeline?.length || 0,
          evidenceCount: session.act1?.evidence?.items?.length || 0,
        });

        // 🔍 详细打印数据结构
        console.log('🔍 [ThreeElementsExtractor] act1.facts完整结构:', JSON.stringify(session.act1?.facts, null, 2));
        console.log('🔍 [ThreeElementsExtractor] act1.evidence完整结构:', JSON.stringify(session.act1?.evidence, null, 2));

        // 2. 从 act1 转换为 ExtractedElements 格式
        if (!session.act1) {
          console.warn('⚠️ [ThreeElementsExtractor] act1为空，无法显示数据');
          throw new Error('该案例的第一幕数据尚未保存，请先在编辑模式下完成判决书提取');
        }

        if (session.act1) {
          const act1 = session.act1;

          const restoredData: ExtractedElements = {
            basicInfo: {
              caseNumber: act1.basicInfo?.caseNumber,
              court: act1.basicInfo?.court,
              date: act1.basicInfo?.judgeDate,
              parties: {
                plaintiff: act1.basicInfo?.parties?.plaintiff?.[0],
                defendant: act1.basicInfo?.parties?.defendant?.[0],
              },
            },
            threeElements: {
              facts: {
                summary: act1.facts?.summary || '',
                timeline: act1.facts?.timeline || [],
                keyFacts: act1.facts?.keyFacts || [],
                disputedFacts: act1.facts?.disputedFacts || [],
              },
              evidence: {
                summary: act1.evidence?.summary || '',
                items: act1.evidence?.items || [],
              },
              reasoning: {
                summary: act1.reasoning?.summary || '',
                legalBasis: act1.reasoning?.legalBasis || [],
                logicChain: act1.reasoning?.logicChain || [],
                keyArguments: act1.reasoning?.keyArguments || [],
                judgment: act1.reasoning?.judgment,
              },
            },
            metadata: {
              confidence: act1.metadata?.confidence || 0,
              processingTime: act1.metadata?.processingTime || 0,
              aiModel: act1.metadata?.aiModel || 'unknown',
              extractionMethod: act1.metadata?.extractionMethod || 'manual',
            },
          };

          setExtractedData(restoredData);
          setProgress(100);
          loadedSessionIdRef.current = sessionId; // 标记已加载
          console.log('✅ [ThreeElementsExtractor] 数据转换完成，显示提取结果');
          console.log('🔍 [ThreeElementsExtractor] restoredData.threeElements.facts:', {
            summary: restoredData.threeElements.facts.summary?.substring(0, 50) + '...',
            timelineCount: restoredData.threeElements.facts.timeline?.length,
            keyFactsCount: restoredData.threeElements.facts.keyFacts?.length,
            timelineFirstItem: restoredData.threeElements.facts.timeline?.[0],
            keyFactsFirstItem: restoredData.threeElements.facts.keyFacts?.[0],
          });
          console.log('🔍 [ThreeElementsExtractor] restoredData.threeElements.evidence:', {
            summary: restoredData.threeElements.evidence.summary?.substring(0, 50) + '...',
            itemsCount: restoredData.threeElements.evidence.items?.length,
            firstItem: restoredData.threeElements.evidence.items?.[0],
          });
        }
      } catch (err) {
        console.error('❌ [ThreeElementsExtractor] 从数据库加载失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoadingFromDB(false);
      }
    };

    loadDataFromDatabase();
  }, [pageMode, sessionId]); // 只依赖 pageMode 和 sessionId，避免循环

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

        // 🔍 调试：打印AI返回的原始数据
        console.log('🔍 [ThreeElementsExtractor] AI提取的原始数据:', {
          hasData: !!result.data,
          hasThreeElements: !!result.data?.threeElements,
          hasFacts: !!result.data?.threeElements?.facts,
          factsStructure: result.data?.threeElements?.facts,
          timelineLength: result.data?.threeElements?.facts?.timeline?.length || 0,
        });

        // 🆕 DB-First: 立即保存到PostgreSQL
        console.log('💾 [DB-First] 提取成功，立即保存到数据库...');
        setProgress(75);

        try {
          // 转换为LegalCase格式
          const legalCase = convertToLegalCase(result.data);

          // 🔍 调试：打印转换后的LegalCase
          console.log('🔍 [ThreeElementsExtractor] 转换后的LegalCase:', {
            hasThreeElements: !!legalCase.threeElements,
            hasFacts: !!legalCase.threeElements?.facts,
            factsKeys: legalCase.threeElements?.facts ? Object.keys(legalCase.threeElements.facts) : [],
            summary: legalCase.threeElements?.facts?.summary,
            timelineLength: legalCase.threeElements?.facts?.timeline?.length || 0,
            keyFactsLength: legalCase.threeElements?.facts?.keyFacts?.length || 0,
          });

          // 🔧 保存到useTeachingStore（SnapshotConverter需要从store读取数据）
          useTeachingStore.getState().setExtractedElements(
            legalCase,
            result.data.metadata?.confidence || 85
          );

          console.log('📦 [ThreeElementsExtractor] 已保存到Store，准备使用SnapshotConverter转换...');

          // 🔧 使用SnapshotConverter进行数据转换（parties: object→string, evidence: 中文→英文, extractionMethod: pure-ai→ai）
          const storeState = useTeachingStore.getState();
          const snapshot = SnapshotConverter.toDatabase(storeState, undefined, {
            saveType: 'auto',
          });

          console.log('✅ [ThreeElementsExtractor] SnapshotConverter转换完成:', {
            caseTitle: snapshot.caseTitle,
            plaintiffType: typeof snapshot.act1?.basicInfo?.parties?.plaintiff?.[0],
            evidenceType: (snapshot.act1?.evidence as any)?.items?.[0]?.type,
            extractionMethod: snapshot.act1?.metadata?.extractionMethod,
          });

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
      {/* 复习模式：加载状态 */}
      {pageMode === 'review' && (isLoadingFromDB || !extractedData) && !error && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">
              {isLoadingFromDB ? '正在从数据库加载案例数据...' : '正在加载案例数据...'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {sessionId ? `会话ID: ${sessionId.substring(0, 8)}...` : '请稍候...'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 文件上传区域 - 仅在编辑模式显示，或复习模式出错时显示 */}
      {(pageMode !== 'review' || (pageMode === 'review' && error)) && (
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
      )}

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