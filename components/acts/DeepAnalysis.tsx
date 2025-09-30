"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCurrentCase } from '@/src/domains/stores'
import {
  CheckCircle,
  ChevronRight,
  BookOpen,
  Gavel,
  Calendar,
  Brain,
  Target,
  AlertTriangle,
  AlertCircle,
  Circle,
  Star,
  TrendingUp,
  FileText,
  Loader2
} from 'lucide-react'

// 导入现有组件
import { CaseOverview } from './CaseOverview'

// 导入证据学习组件
import { EvidenceQuizSection } from '@/components/evidence/EvidenceQuizSection'
// 导入请求权分析弹窗
import { EventClaimAnalysisDialog } from '@/components/legal/EventClaimAnalysisDialog'
// 导入类型定义
import type { TurningPoint } from '@/src/domains/legal-analysis/services/types/TimelineTypes'

// 导入类型
import type {
  TimelineAnalysis
} from '../../src/domains/legal-analysis/services/types/TimelineTypes'

// 扩展证据类型定义以支持对象格式
interface EvidenceItem {
  id?: string;
  content?: string;
  description?: string;
  title?: string;
  type?: string;
  [key: string]: any;
}

// 扩展时间轴事件类型以支持对象数组evidence和兼容实际数据结构
interface EnhancedTimelineEvent {
  id?: string;
  date: string;
  title?: string;  // 可选，因为实际数据可能有event字段
  event?: string;  // 兼容实际数据结构
  description?: string;
  detail?: string; // 兼容实际数据结构
  type?: string;
  importance?: 'critical' | 'important' | 'normal' | 'high' | 'medium' | 'low';
  evidence?: EvidenceItem[];
  actors?: string[];
  location?: string;
  relatedEvidence?: string[];
  isKeyEvent?: boolean;
  party?: string;
  [key: string]: any;
}

// 导入数据适配器
import { adaptCaseData, validateCaseData } from '@/src/utils/case-data-adapter'


interface DeepAnalysisProps {
  onComplete?: () => void
}

export default function DeepAnalysis({ onComplete }: DeepAnalysisProps) {
  const caseData = useCurrentCase()
  const adaptedCaseData = useMemo(() => {
    if (!caseData) {
      return null
    }
    try {
      return adaptCaseData(caseData as any)
    } catch (error) {
      console.warn('案例数据适配失败，继续使用原始数据', error)
      return caseData
    }
  }, [caseData])
  const effectiveCaseData = adaptedCaseData || caseData
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<TimelineAnalysis | null>(null)
  const [validTimelineEvents, setValidTimelineEvents] = useState<EnhancedTimelineEvent[]>([])
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedEventForAnalysis, setSelectedEventForAnalysis] = useState<EnhancedTimelineEvent | null>(null)

  // 类型安全的证据计数函数 - 兼容多种数据结构
  const getEvidenceCount = (event: EnhancedTimelineEvent): number => {
    // 检查 evidence 字段（原有格式）
    if (event.evidence && Array.isArray(event.evidence)) {
      return event.evidence.length;
    }

    // 检查 evidenceInfo 字段（TimelineEvent标准格式）
    if ((event as any).evidenceInfo) {
      return 1; // evidenceInfo表示有证据信息
    }

    // 检查是否有相关证据字段
    if ((event as any).relatedEvidence && Array.isArray((event as any).relatedEvidence)) {
      return (event as any).relatedEvidence.length;
    }

    return 0;
  }

  // 安全获取事件标题（兼容不同字段名）
  const getEventTitle = (event: EnhancedTimelineEvent): string => {
    return event.title || event.event || '未命名事件';
  }

  // 安全获取事件描述（兼容不同字段名）
  const getEventDescription = (event: EnhancedTimelineEvent): string => {
    return event.description || event.detail || event.event || '';
  }

  const normalizeEvidenceType = (type?: string): 'documentary' | 'testimonial' | 'physical' | 'expert' => {
    if (!type) return 'documentary'
    const normalized = type.toLowerCase()

    if (normalized.includes('test') || normalized.includes('证言') || normalized.includes('statement')) {
      return 'testimonial'
    }

    if (normalized.includes('physical') || normalized.includes('物') || normalized.includes('实物')) {
      return 'physical'
    }

    if (normalized.includes('expert') || normalized.includes('鉴定') || normalized.includes('report')) {
      return 'expert'
    }

    return 'documentary'
  }


  type StandardEvidence = {
    id: string
    title: string
    description: string
    content: string
    type: 'documentary' | 'testimonial' | 'physical' | 'expert'
    relatedEvents: string[]
    metadata: {
      source: string
      dateCreated: string
      author?: string
    }
  }

  const extractEvidenceFromCase = (caseData?: typeof effectiveCaseData): StandardEvidence[] => {
    const timeline = (caseData?.threeElements?.facts?.timeline as EnhancedTimelineEvent[]) || []
    const collected: StandardEvidence[] = []

    timeline.forEach((event, eventIndex) => {
      const baseRelated = event.id || event.date || `event-${eventIndex}`

      if (Array.isArray(event.evidence) && event.evidence.length > 0) {
        event.evidence.forEach((evidenceItem: any, idx: number) => {
          const type = normalizeEvidenceType(evidenceItem?.type)
          const title = evidenceItem?.title || evidenceItem?.name || getEventTitle(event)
          const description = evidenceItem?.description || evidenceItem?.summary || evidenceItem?.content || getEventDescription(event) || title
          const content = evidenceItem?.content || description
          const metadata = evidenceItem?.metadata || {}
          const relatedEvents = Array.isArray(evidenceItem?.relatedEvents) && evidenceItem.relatedEvents.length > 0
            ? evidenceItem.relatedEvents
            : [baseRelated]

          collected.push({
            id: evidenceItem?.id || evidenceItem?.evidenceId || `${baseRelated}-evidence-${idx}`,
            title,
            description,
            content,
            type,
            relatedEvents,
            metadata: {
              source: metadata.source || evidenceItem?.source || 'timeline-event',
              dateCreated: metadata.dateCreated || evidenceItem?.date || event.date || new Date().toISOString(),
              author: metadata.author || evidenceItem?.author
            }
          })
        })
      }

      if ((event as any).evidenceInfo) {
        const info = (event as any).evidenceInfo
        collected.push({
          id: `${baseRelated}-evidence-info`,
          title: getEventTitle(event),
          description: getEventDescription(event) || getEventTitle(event),
          content: getEventDescription(event) || getEventTitle(event),
          type: normalizeEvidenceType(info?.evidenceType),
          relatedEvents: [baseRelated],
          metadata: {
            source: 'timeline-evidenceInfo',
            dateCreated: event.date || new Date().toISOString()
          }
        })
      }

      if (Array.isArray((event as any).relatedEvidence)) {
        (event as any).relatedEvidence.forEach((relId: string, idx: number) => {
          collected.push({
            id: relId || `${baseRelated}-related-${idx}`,
            title: getEventTitle(event),
            description: getEventDescription(event) || getEventTitle(event),
            content: `${getEventTitle(event)} 相关证据`,
            type: 'documentary',
            relatedEvents: [baseRelated],
            metadata: {
              source: 'timeline-related',
              dateCreated: event.date || new Date().toISOString()
            }
          })
        })
      }

      if (!event.evidence?.length && !(event as any).evidenceInfo && !(event as any).relatedEvidence) {
        collected.push({
          id: `${baseRelated}-fallback`,
          title: getEventTitle(event),
          description: getEventDescription(event) || getEventTitle(event),
          content: getEventDescription(event) || '',
          type: 'documentary',
          relatedEvents: [baseRelated],
          metadata: {
            source: 'timeline-event',
            dateCreated: event.date || new Date().toISOString()
          }
        })
      }
    })

    return collected
  }

  const evidenceItemsForQuiz = useMemo(() => {
    return extractEvidenceFromCase(effectiveCaseData)
  }, [effectiveCaseData])


  // 新增：四大分析功能的状态管理
  const [disputeAnalysis, setDisputeAnalysis] = useState<any>(null)
  const [claimAnalysis, setClaimAnalysis] = useState<any>(null)
  const [evidenceAnalysis, setEvidenceAnalysis] = useState<any>(null)
  const [analysisProgress, setAnalysisProgress] = useState<string>('准备开始分析...')


  // 自动开始AI分析
  const latestCaseDataRef = useRef<typeof effectiveCaseData>(effectiveCaseData)

  useEffect(() => {
    latestCaseDataRef.current = effectiveCaseData
  }, [effectiveCaseData])

  const timelineSignature = useMemo(() => {
    const timeline = effectiveCaseData?.threeElements?.facts?.timeline as EnhancedTimelineEvent[] | undefined
    if (!timeline || timeline.length === 0) {
      return ''
    }
    return timeline
      .map((event, index) => `${event.id || event.date || index}-${getEvidenceCount(event)}`)
      .join('|')
  }, [effectiveCaseData])

  useEffect(() => {
    if (!timelineSignature) {
      return
    }
    const currentCaseData = latestCaseDataRef.current
    if (!currentCaseData?.threeElements?.facts?.timeline?.length) {
      return
    }
    if (!analysisResult && !isAnalyzing) {
      void performTimelineAnalysis(currentCaseData)
    }
  }, [timelineSignature, analysisResult, isAnalyzing])

  const performTimelineAnalysis = async (sourceCaseData: typeof effectiveCaseData) => {
    if (!sourceCaseData?.threeElements?.facts?.timeline) return

    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisProgress('🚀 开始综合智能分析...')

    try {
      console.log('🚀 开始四大分析功能并行处理...')

      // 使用数据适配器处理数据，确保证据正确映射到时间轴
      const validationResult = validateCaseData(sourceCaseData as any)

      if (!validationResult.valid) {
        console.warn('⚠️ 数据适配验证警告:', validationResult.issues)
      }

      // 从适配后的数据中提取时间轴事件（已包含映射的证据）
      const timelineEvents = sourceCaseData.threeElements?.facts?.timeline as EnhancedTimelineEvent[] || []

      // 过滤并确保每个事件都有必需的字段
      const validEvents = timelineEvents.filter(e => e && e.date).map(e => ({
        ...e,
        title: getEventTitle(e),
        event: e.event || getEventTitle(e),
        date: e.date
      }))

      // 保存到状态中以供渲染使用
      setValidTimelineEvents(validEvents)

      const documentText = validEvents.map(e =>
        `${e.date}：${e.title}。${getEventDescription(e)}`
      ).join('\n')

      console.log('📊 数据适配完成:', {
        原始证据数: sourceCaseData?.threeElements?.evidence?.items?.length || 0,
        原始时间轴事件数: timelineEvents.length,
        有效时间轴事件数: validEvents.length,
        包含证据的事件数: validEvents.filter(e => getEvidenceCount(e) > 0).length
      })

      if (validEvents.length === 0) {
        console.warn('⚠️ 未找到有效的时间轴事件，跳过AI分析')
        setAnalysisError('缺少可分析的时间轴事件，请先完善案件的时间轴信息。')
        setAnalysisProgress('⚠️ 检测到空时间轴，已跳过AI分析')
        setIsAnalyzing(false)
        return
      }

      // 并行调用四个API
      setAnalysisProgress('🔄 并行调用四大分析API...')
      const [timelineResult, disputeResult, claimResult, evidenceResult] = await Promise.allSettled([
        // 1. 时间轴分析（已有）
        fetch('/api/timeline-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: validEvents,
            analysisType: 'comprehensive',
            includeAI: true,
            focusAreas: ['turning_points', 'behavior_patterns', 'evidence_chain', 'legal_risks'],
            options: {
              enableRiskAnalysis: true,
              enablePredictions: true,
              enableEvidenceChain: true,
              maxTurningPoints: 5,
              confidenceThreshold: 0.7
            }
          })
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`Timeline analysis failed: ${res.status}`))),

        // 2. 争议点识别
        fetch('/api/dispute-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentText,
            caseType: 'civil',
            options: {
              extractClaimBasis: true,
              analyzeDifficulty: true,
              generateTeachingNotes: false,
              maxDisputes: 10,
              minConfidence: 0.7,
              language: 'zh-CN'
            }
          })
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`Dispute analysis failed: ${res.status}`))),

        // 3. 请求权分析
        fetch('/api/legal-analysis/claims', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: validEvents,
            caseType: 'civil',
            focusAreas: ['claims', 'defenses', 'limitations', 'burden-of-proof'],
            depth: 'comprehensive'
          })
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`Claim analysis failed: ${res.status}`))),

        // 4. 证据质量评估 - AI增强版
        fetch('/api/evidence-quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evidence: evidenceItemsForQuiz.map(ev => ({
              id: ev.id,
              content: ev.content,
              type: ev.type,
              relatedEvents: ev.relatedEvents,
              metadata: ev.metadata
            })),
            claimElements: validEvents.map(e => ({
              id: e.id || e.date,
              name: e.title,
              description: e.description || e.title,
              type: e.type || 'fact'
            })),
            mode: 'comprehensive', // 使用AI增强的综合分析模式
            caseContext: {
              basicInfo: {
                caseNumber: sourceCaseData?.basicInfo?.caseNumber,
                caseType: sourceCaseData?.basicInfo?.caseType || 'civil',
                court: sourceCaseData?.basicInfo?.court
              },
              disputes: (sourceCaseData as any)?.disputes || [],
              timeline: timelineEvents
            }
          })
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`Evidence analysis failed: ${res.status}`)))
      ])

      setAnalysisProgress('📊 处理分析结果...')

      type DiagnosticRow = {
        模块: string
        状态: '成功' | '失败'
        触发条件: string
        AI模式?: string
        数据摘要?: string
        提示?: string
      }

      const diagnostics: DiagnosticRow[] = []

      const recordDiagnostic = (row: DiagnosticRow) => {
        diagnostics.push(row)
      }

      // 处理时间轴分析结果
      if (timelineResult.status === 'fulfilled' && timelineResult.value.success) {
        setAnalysisResult(timelineResult.value.data.analysis)
        const metadata = timelineResult.value.metadata || {}
        const analysisData = timelineResult.value.data?.analysis
        const turningPoints = analysisData?.turningPoints?.length || 0
        const aiMode = metadata.analysisMethod || 'unknown'
        const aiWarnings = Array.isArray(metadata.aiWarnings)
          ? metadata.aiWarnings.filter(Boolean)
          : []
        const fallbackHint = aiMode !== 'ai-enhanced'
          ? '未使用AI增强，可能缺少DEEPSEEK_API_KEY'
          : undefined
        const emptyHint = turningPoints === 0
          ? '未生成任何转折点，检查输入事件或AI响应'
          : undefined

        const degraded = Boolean(fallbackHint || emptyHint)

        recordDiagnostic({
          模块: '时间轴分析',
          状态: degraded ? '失败' : '成功',
          AI模式: aiMode,
          数据摘要: `转折点 ${turningPoints} 个 / 事件 ${validEvents.length} 个`,
          触发条件: 'HTTP 200 & success=true',
          提示: fallbackHint || emptyHint || aiWarnings.join('；') || undefined
        })

        const logPayload = {
          analysisMethod: aiMode,
          turningPoints,
          riskCount: analysisData?.risks?.length || 0,
          evidenceChain: analysisData?.evidenceChain,
          fallbackHint,
          emptyHint,
          warnings: aiWarnings
        }

        if (degraded) {
          console.warn('⚠️ 时间轴分析降级:', logPayload)
          const degradeMessage = fallbackHint || emptyHint || '时间轴分析返回空结果'
          setAnalysisError(prev => prev ?? degradeMessage)
        } else {
          console.log('✅ 时间轴分析完成', logPayload)
          if (aiWarnings.length > 0) {
            console.info('ℹ️ 时间轴分析警告:', aiWarnings)
          }
        }
      } else {
        console.warn('⚠️ 时间轴分析失败:', timelineResult.status === 'rejected' ? timelineResult.reason.message : '未知错误')

        const failureReason = timelineResult.status === 'rejected'
          ? (timelineResult.reason?.message || timelineResult.reason?.toString?.() || '请求被拒绝')
          : (timelineResult.value?.error?.message || '返回结构缺少success=true')

        recordDiagnostic({
          模块: '时间轴分析',
          状态: '失败',
          触发条件: timelineResult.status === 'rejected' ? 'Promise rejected' : 'success!==true',
          提示: failureReason
        })
      }

      // 处理争议分析结果
      if (disputeResult.status === 'fulfilled' && disputeResult.value.success) {
        setDisputeAnalysis(disputeResult.value)
        const disputes = disputeResult.value.disputes || []
        const claimBasisCount = disputeResult.value.claimBasisMappings?.length || 0
        const emptyHint = disputes.length === 0
          ? '争议列表为空，检查AI响应或输入文本'
          : undefined

        const degraded = Boolean(emptyHint)

        recordDiagnostic({
          模块: '争议分析',
          状态: degraded ? '失败' : '成功',
          AI模式: 'ai-enhanced',
          数据摘要: `争议 ${disputes.length} 个 / 映射 ${claimBasisCount} 条`,
          触发条件: 'HTTP 200 & success=true',
          提示: emptyHint
        })

        const logPayload = {
          disputes: disputes.length,
          claimBasisMappings: claimBasisCount,
          warnings: disputeResult.value.warnings || [],
          emptyHint
        }

        if (degraded) {
          console.warn('⚠️ 争议分析降级:', logPayload)
          if (emptyHint) {
            setAnalysisError(prev => prev ?? emptyHint)
          }
        } else {
          console.log('✅ 争议分析完成', logPayload)
        }
      } else {
        const errorMsg = disputeResult.status === 'rejected'
          ? (disputeResult.reason?.message || disputeResult.reason?.toString() || '争议分析服务异常')
          : (disputeResult.value?.error || '争议分析返回格式异常');
        console.warn('⚠️ 争议分析失败:', errorMsg)
        setAnalysisError(`争议分析失败: ${errorMsg}`)

        recordDiagnostic({
          模块: '争议分析',
          状态: '失败',
          触发条件: disputeResult.status === 'rejected' ? 'Promise rejected' : 'success!==true',
          提示: errorMsg
        })
      }

      // 处理请求权分析结果
      if (claimResult.status === 'fulfilled' && claimResult.value.id) {
        setClaimAnalysis(claimResult.value)
        const primaryClaims = claimResult.value.claims?.primary?.length || 0
        const defenses = claimResult.value.claims?.defense?.length || 0
        const aiConfidence = claimResult.value.metadata?.confidence
        const emptyHint = primaryClaims === 0
          ? '未生成任何主要请求权，可能是AI调用失败或降级数据'
          : undefined

        const degraded = Boolean(emptyHint)

        recordDiagnostic({
          模块: '请求权分析',
          状态: degraded ? '失败' : '成功',
          AI模式: claimResult.value.metadata?.model || 'unknown',
          数据摘要: `主要请求权 ${primaryClaims} 项 / 抗辩 ${defenses} 项`,
          触发条件: 'HTTP 200 & payload.id存在',
          提示: emptyHint
        })

        const logPayload = {
          primaryClaims,
          defenses,
          burdenOfProof: claimResult.value.burdenOfProof?.length || 0,
          confidence: aiConfidence,
          emptyHint
        }

        if (degraded) {
          console.warn('⚠️ 请求权分析降级:', logPayload)
          if (emptyHint) {
            setAnalysisError(prev => prev ?? emptyHint)
          }
        } else {
          console.log('✅ 请求权分析完成', logPayload)
        }
      } else {
        const errorMsg = claimResult.status === 'rejected'
          ? (claimResult.reason?.message || claimResult.reason?.toString() || '请求权分析服务异常')
          : (claimResult.value?.error || '请求权分析返回格式异常');
        console.warn('⚠️ 请求权分析失败:', errorMsg)
        if (!analysisError) { // 避免覆盖之前的错误信息
          setAnalysisError(`请求权分析失败: ${errorMsg}`)
        }

        recordDiagnostic({
          模块: '请求权分析',
          状态: '失败',
          触发条件: claimResult.status === 'rejected' ? 'Promise rejected' : '缺少必要字段',
          提示: errorMsg
        })
      }

      // 处理证据分析结果 - 适配AI增强版响应结构
      if (evidenceResult.status === 'fulfilled' && evidenceResult.value.success) {
        const enhancedEvidence = evidenceResult.value;

        // 转换为兼容原有显示逻辑的格式
        const adaptedEvidenceAnalysis = {
          success: true,
          mode: enhancedEvidence.mode,
          // 保持向下兼容的mappings字段
          mappings: enhancedEvidence.basicMappings || enhancedEvidence.mappings || [],
          // AI增强的字段
          qualityAssessments: enhancedEvidence.qualityAssessments || [],
          chainAnalyses: enhancedEvidence.chainAnalyses || [],
          summary: enhancedEvidence.summary || {},
          // 传统字段
          analysis: enhancedEvidence.analysis,
          unmappedElements: enhancedEvidence.unmappedElements || [],
          conflicts: enhancedEvidence.conflicts || []
        };

        setEvidenceAnalysis(adaptedEvidenceAnalysis);

        const qualityCount = enhancedEvidence.qualityAssessments?.length || 0
        const chainCount = enhancedEvidence.chainAnalyses?.length || 0
        const emptyHint = qualityCount === 0 && chainCount === 0
          ? 'AI未返回质量或证据链分析，可能使用了降级数据'
          : undefined

        const degraded = Boolean(emptyHint)

        recordDiagnostic({
          模块: '证据分析',
          状态: degraded ? '失败' : '成功',
          AI模式: enhancedEvidence.mode || 'unknown',
          数据摘要: `质量评估 ${qualityCount} 条 / 证据链 ${chainCount} 条`,
          触发条件: 'HTTP 200 & success=true',
          提示: emptyHint
        })

        if (degraded) {
          console.warn('⚠️ 证据分析降级:', {
            mode: enhancedEvidence.mode,
            qualityCount,
            chainCount,
            emptyHint
          })
          if (emptyHint) {
            setAnalysisError(prev => prev ?? emptyHint)
          }
        } else {
          console.log('✅ AI增强证据分析完成', {
            mode: enhancedEvidence.mode,
            qualityCount,
            chainCount
          })
        }
      } else {
        const errorMsg = evidenceResult.status === 'rejected'
          ? (evidenceResult.reason?.message || evidenceResult.reason?.toString() || 'AI证据分析服务异常')
          : (evidenceResult.value?.error || 'AI证据分析返回格式异常');
        console.warn('⚠️ AI证据分析失败:', errorMsg);
        if (!analysisError) {
          setAnalysisError(`证据分析失败: ${errorMsg}`);
        }

        recordDiagnostic({
          模块: '证据分析',
          状态: '失败',
          触发条件: evidenceResult.status === 'rejected' ? 'Promise rejected' : 'success!==true',
          提示: errorMsg
        })
      }

      if (diagnostics.length > 0) {
        console.groupCollapsed('🛰️ 四大分析诊断信息 (展开查看详细原因为何显示为成功或失败)')
        console.table(diagnostics)
        diagnostics
          .filter(row => row.提示)
          .forEach(row => {
            console.info(`ℹ️ [${row.模块}]`, row.提示)
          })
        console.groupEnd()
      }

      setAnalysisProgress('✅ 综合智能分析完成!')
      console.log('🎉 四大分析功能全部完成')

    } catch (error) {
      console.error('❌ 综合分析错误:', error)
      setAnalysisError(error instanceof Error ? error.message : '未知错误')
      setAnalysisProgress('❌ 分析过程中发生错误')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">深度案例分析</h2>
        <p className="text-gray-600 flex items-center justify-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          AI增强的时间轴分析与证据学习
        </p>
      </div>

      {/* 案件概况卡片 */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">案件概况</h3>
        </div>
        <CaseOverview />
      </Card>

      {/* 智能时间轴分析 - 统一视图 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">AI智能分析</h3>
          {isAnalyzing && (
            <div className="ml-auto flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{analysisProgress}</span>
            </div>
          )}
          {analysisResult && (
            <div className="ml-auto flex items-center gap-2 text-sm text-green-600">
              <Brain className="w-4 h-4" />
              <span>AI增强分析已完成</span>
            </div>
          )}
        </div>

        {analysisError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">分析失败</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{analysisError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => performTimelineAnalysis(effectiveCaseData)}
              className="mt-2"
            >
              重新分析
            </Button>
          </div>
        )}

        {/* 统一的智能时间轴与分析结果 */}
        <div className="space-y-6">
          {/* 时间轴事件 */}
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              案件发展脉络
            </h4>
            <div className="space-y-4">
              {validTimelineEvents.map((event, index) => (
                <div key={event.id || `event-${index}`} className="relative">
                  {/* 时间轴线 */}
                  <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gray-200 -z-10" />

                  <div className="flex gap-4">
                    {/* 时间轴节点 */}
                    <div className="flex-shrink-0 w-12">
                      <div className={`w-3 h-3 rounded-full border-2 bg-white shadow-sm ${
                        event.importance === 'critical' ? 'border-red-500' :
                        event.importance === 'high' ? 'border-blue-500' : 'border-gray-400'
                      }`} />
                    </div>

                    {/* 事件内容 */}
                    <div className="flex-1 bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">{event.date}</div>
                          <h5 className="font-medium text-gray-900">{getEventTitle(event)}</h5>
                          {/* UI优化: 删除冗余的description,保持卡片简洁 */}
                        </div>

                        {/* 操作按钮和重要性标记 */}
                        <div className="flex items-center gap-2">
                          {/* 请求权分析按钮 */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedEventForAnalysis(event)}
                            className="text-xs"
                          >
                            <Gavel className="w-3 h-3 mr-1" />
                            请求权分析
                          </Button>

                          {/* 重要性标记 */}
                          {event.importance && (
                            <Badge variant={
                              event.importance === 'critical' ? 'destructive' :
                              event.importance === 'high' ? 'default' : 'secondary'
                            }>
                              {event.importance === 'critical' ? '关键事件' :
                               event.importance === 'high' ? '重要事件' : '一般事件'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* AI增强信息 */}
                      {(analysisResult || disputeAnalysis || claimAnalysis || evidenceAnalysis) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          {/* 检查是否为转折点 - 兼容两种字段名 */}
                          {(analysisResult?.keyTurningPoints || analysisResult?.turningPoints)?.some((tp: TurningPoint) =>
                            tp.date === event.date || tp.description.includes(getEventTitle(event))
                          ) && (
                            <div className="flex items-center gap-2 text-sm text-orange-600">
                              <TrendingUp className="w-4 h-4" />
                              <span className="font-medium">关键转折点</span>
                            </div>
                          )}

                          {/* 争议标记 - 优化显示逻辑 */}
                          {(() => {
                            const relatedDispute = disputeAnalysis?.disputes?.find((dispute: any) => {
                              const safeDispute = {
                                relatedEvents: dispute.relatedEvents || dispute.relatedEvidence || [],
                                title: dispute.title || '未命名争议',
                                description: dispute.description || '',
                                category: dispute.category || 'unknown'
                              };
                              return safeDispute.relatedEvents.includes(event.id || event.date) ||
                                     safeDispute.relatedEvents.includes(`E${index + 1}`) ||
                                     getEventTitle(event).toLowerCase().includes('争议') ||
                                     getEventDescription(event).toLowerCase().includes('争议');
                            });

                            if (relatedDispute) {
                              return (
                                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                  <div className="flex items-center gap-2 text-sm text-blue-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-medium">争议焦点：{relatedDispute.title}</span>
                                  </div>
                                  {relatedDispute.description && (
                                    <div className="text-xs text-blue-500 mt-1 ml-6">
                                      {relatedDispute.description.substring(0, 100)}...
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* 请求权标记 - 添加兜底处理 */}
                          {claimAnalysis?.claims?.primary?.some((claim: any) => {
                            // 兜底处理：处理可能的undefined和字段缺失
                            const events = claim?.events || claim?.relatedEvents || [];
                            return events.includes(event.id || event.date) ||
                                   events.includes(`E${index + 1}`) ||
                                   event.type === 'legal' || event.type === 'claim';
                          }) && (
                            <div className="flex items-center gap-2 text-sm text-purple-600">
                              <Gavel className="w-4 h-4" />
                              <span className="font-medium">请求权基础</span>
                            </div>
                          )}

                          {/* 证据标记 */}
                          {getEvidenceCount(event) > 0 && evidenceAnalysis?.mappings?.some((mapping: any) =>
                            mapping.evidenceId === (event.id || event.date)
                          ) && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <FileText className="w-4 h-4" />
                              <span className="font-medium">关键证据({getEvidenceCount(event)})</span>
                            </div>
                          )}

                          {/* 法律要素分类 */}
                          {event.type && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Circle className="w-3 h-3" />
                              <span>
                                {event.type === 'fact' ? '事实要素' :
                                 event.type === 'legal' ? '法律要素' :
                                 event.type === 'dispute' ? '争议要素' : '其他要素'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 综合AI分析结果 */}
          {(analysisResult || disputeAnalysis || claimAnalysis || evidenceAnalysis) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 关键转折点 & 争议焦点 */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h5 className="font-semibold flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  关键转折点与争议焦点
                </h5>
                <div className="space-y-2">
                  {/* 时间轴转折点 - 修复字段名：keyTurningPoints改为turningPoints */}
                  {(analysisResult?.keyTurningPoints || analysisResult?.turningPoints)?.slice(0, 3).map((point: TurningPoint, index: number) => (
                    <div key={`tp-${index}`} className="text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-orange-600" />
                        <div className="font-medium text-orange-900">{point.date}</div>
                      </div>
                      <div className="text-orange-700 ml-5">{point.legalSignificance}</div>
                    </div>
                  ))}
                  {/* 争议焦点 */}
                  {disputeAnalysis?.disputes?.slice(0, 2).map((dispute: any, index: number) => (
                    <div key={`dispute-${index}`} className="text-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-blue-600" />
                        <div className="font-medium text-blue-900">{dispute.title || '争议焦点'}</div>
                      </div>
                      <div className="text-blue-700 ml-5">{dispute.description?.substring(0, 50) || '待分析'}...</div>
                    </div>
                  ))}
                  {(!(analysisResult?.keyTurningPoints || analysisResult?.turningPoints)?.length && !disputeAnalysis?.disputes?.length) && (
                    <div className="text-sm text-gray-500 italic">暂无关键转折点或争议数据</div>
                  )}
                </div>
              </div>

              {/* 请求权分析 & 法律风险 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="font-semibold flex items-center gap-2 mb-3">
                  <Gavel className="w-5 h-5 text-red-600" />
                  请求权与风险
                </h5>
                <div className="space-y-2">
                  {/* 请求权分析 */}
                  {claimAnalysis?.claims?.primary?.slice(0, 2).map((claim: any, index: number) => (
                    <div key={`claim-${index}`} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Gavel className="w-3 h-3 text-purple-600" />
                        <div className="font-medium text-purple-900">
                          {claim.type || claim.name || '请求权基础'}
                        </div>
                      </div>
                      <div className="text-purple-700 ml-5">
                        {claim.description?.substring(0, 50) || '待分析'}...
                      </div>
                    </div>
                  ))}
                  {/* 法律风险 */}
                  {analysisResult?.legalRisks?.slice(0, 2).map((risk, index) => (
                    <div key={`risk-${index}`} className="text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        <Badge variant={risk.likelihood === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {risk.likelihood === 'high' ? '高风险' :
                           risk.likelihood === 'medium' ? '中风险' : '低风险'}
                        </Badge>
                        <span className="text-red-700">{risk.description}</span>
                      </div>
                    </div>
                  ))}
                  {(!claimAnalysis?.claims?.primary?.length && !analysisResult?.legalRisks?.length) && (
                    <div className="text-sm text-gray-500 italic">暂无请求权或风险数据</div>
                  )}
                </div>
              </div>

              {/* 证据体系 - 增强显示证据链关系 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-semibold flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  证据链条分析
                </h5>
                <div className="space-y-2 text-sm">
                  {/* 证据链完整性 */}
                  {analysisResult?.evidenceChain && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">完整性</span>
                        <span className="font-medium text-blue-700">
                          {Math.round(analysisResult.evidenceChain.completeness * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">逻辑一致性</span>
                        <span className="font-medium text-blue-700">
                          {Math.round(analysisResult.evidenceChain.logicalConsistency * 100)}%
                        </span>
                      </div>
                      {/* 证据优势 */}
                      {analysisResult.evidenceChain.strengths?.length > 0 && (
                        <div className="mt-2">
                          <div className="font-medium text-green-700">证据优势：</div>
                          <ul className="text-xs text-green-600 ml-2 mt-1">
                            {analysisResult.evidenceChain.strengths.slice(0, 2).map((strength, idx) => (
                              <li key={idx}>• {strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  {/* 证据质量评估 */}
                  {evidenceAnalysis?.mappings?.slice(0, 3).map((mapping: any, index: number) => (
                    <div key={`evidence-${index}`} className="flex items-center justify-between">
                      <span className="text-blue-600 text-xs">{mapping.evidenceId}</span>
                      <Badge variant="outline" className="text-xs">
                        质量: {Math.round((mapping.relevance || 0.7) * 100)}%
                      </Badge>
                    </div>
                  ))}
                  {/* 证据缺口 */}
                  {analysisResult?.evidenceChain?.gaps && analysisResult.evidenceChain.gaps.length > 0 && (
                    <div className="mt-2 text-xs text-orange-600">
                      <span className="font-medium">证据缺口：</span>
                      {analysisResult.evidenceChain.gaps.join('、')}
                    </div>
                  )}
                  {(!analysisResult?.evidenceChain && !evidenceAnalysis?.mappings?.length) && (
                    <div className="text-sm text-gray-500 italic">暂无证据分析数据</div>
                  )}
                </div>
              </div>

              {/* 行为模式分析 - 替换AI预测模块 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-semibold flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-green-600" />
                  行为模式与策略建议
                </h5>
                <div className="space-y-2">
                  {/* 行为模式分析 */}
                  {analysisResult?.behaviorPatterns?.slice(0, 2).map((pattern, index) => (
                    <div key={`pattern-${index}`} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {pattern.party}
                        </Badge>
                        <span className="text-green-700 font-medium">{pattern.pattern}</span>
                      </div>
                      <div className="text-green-600 text-xs ml-2">
                        动机：{pattern.motivation}
                      </div>
                    </div>
                  ))}
                  {/* 综合建议 */}
                  {claimAnalysis?.strategy?.recommendations?.slice(0, 2).map((rec: any, index: number) => {
                    // 处理不同格式的建议数据
                    const renderRecommendation = () => {
                      if (typeof rec === 'string') {
                        return rec;
                      }
                      if (typeof rec === 'object' && rec !== null) {
                        // 如果是对象，尝试渲染关键信息
                        if (rec.action) {
                          return (
                            <div>
                              <div className="font-medium">{rec.action}</div>
                              {rec.rationale && (
                                <div className="text-xs mt-1 text-gray-600">{rec.rationale}</div>
                              )}
                              {rec.priority && (
                                <span className="text-xs text-amber-600 ml-2">
                                  优先级: {rec.priority}
                                </span>
                              )}
                            </div>
                          );
                        }
                        // 如果对象没有action字段，尝试显示其他内容
                        return rec.description || rec.content || rec.text || '建议内容';
                      }
                      return '建议内容';
                    };

                    return (
                      <div key={`rec-${index}`} className="text-sm">
                        <div className="flex items-start gap-2">
                          <Star className="w-3 h-3 text-green-600 mt-1" />
                          <div className="text-green-700 flex-1">
                            {renderRecommendation()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!analysisResult?.behaviorPatterns?.length && !claimAnalysis?.strategy?.recommendations?.length) && (
                    <div className="text-sm text-gray-500 italic">暂无行为模式或建议数据</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 证据学习问答区域 */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold">证据学习</h3>
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
            <Brain className="w-4 h-4" />
            <span>基于时间轴智能生成</span>
          </div>
        </div>

        {/* 证据学习问答组件 - 基于真实时间轴证据 */}
        <EvidenceQuizSection
          evidences={evidenceItemsForQuiz}
          autoGenerate={true}
          maxQuizzes={5}
          onSessionComplete={(session) => {
            console.log('AI证据学习问答会话完成:', {
              sessionId: session.id,
              score: session.score,
              totalQuestions: session.quizzes.length,
              accuracy: session.score / session.totalPossibleScore,
              aiGeneratedCount: session.quizzes.filter(q => (q as any).metadata?.source === 'ai-generated').length
            });
          }}
          onAnswerSubmit={(quizId, answer) => {
            console.log('Answer submitted:', { quizId, answer });
          }}
        />
      </Card>

      {/* 法官说理要点 */}
      {caseData?.threeElements?.reasoning && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Gavel className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold">裁判要点</h3>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {caseData.threeElements.reasoning.summary}
            </p>
          </div>
        </Card>
      )}

      {/* 完成按钮 */}
      <div className="text-center pt-4">
        {!analysisComplete ? (
          <Button 
            size="lg" 
            onClick={() => setAnalysisComplete(true)}
            className="gap-2"
          >
            完成案例分析
            <CheckCircle className="w-5 h-5" />
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">分析完成，可以进入苏格拉底讨论</span>
            </div>
            <div>
              <Button size="lg" onClick={onComplete} className="gap-2">
                进入苏格拉底讨论
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 事件请求权分析弹窗 */}
      <EventClaimAnalysisDialog
        event={selectedEventForAnalysis}
        isOpen={!!selectedEventForAnalysis}
        onClose={() => setSelectedEventForAnalysis(null)}
      />
    </div>
  )
}
