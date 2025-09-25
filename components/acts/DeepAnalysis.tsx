"use client"

import { useState, useEffect } from 'react'
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
  Users,
  Star,
  TrendingUp,
  FileText,
  Loader2
} from 'lucide-react'

// 导入现有组件
import { CaseOverview } from './CaseOverview'

// 导入证据学习组件
import { EvidenceQuizSection } from '@/components/evidence/EvidenceQuizSection'

// 导入类型
import type {
  TimelineAnalysisResponse,
  TimelineAnalysis,
  TurningPoint,
  LegalRisk,
  EvidenceChainAnalysis
} from '../../src/domains/legal-analysis/services/types/TimelineTypes'

interface DeepAnalysisProps {
  onComplete?: () => void
}

export default function DeepAnalysis({ onComplete }: DeepAnalysisProps) {
  const caseData = useCurrentCase()
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<TimelineAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // 新增：四大分析功能的状态管理
  const [disputeAnalysis, setDisputeAnalysis] = useState<any>(null)
  const [claimAnalysis, setClaimAnalysis] = useState<any>(null)
  const [evidenceAnalysis, setEvidenceAnalysis] = useState<any>(null)
  const [analysisProgress, setAnalysisProgress] = useState<string>('准备开始分析...')

  // 自动开始AI分析
  useEffect(() => {
    if (caseData?.threeElements?.facts?.timeline && caseData.threeElements.facts.timeline.length > 0 && !analysisResult && !isAnalyzing) {
      performTimelineAnalysis()
    }
  }, [caseData?.threeElements?.facts?.timeline])

  const performTimelineAnalysis = async () => {
    if (!caseData?.threeElements?.facts?.timeline) return

    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisProgress('🚀 开始综合智能分析...')

    try {
      console.log('🚀 开始四大分析功能并行处理...')

      // 准备请求数据
      const timelineEvents = caseData.threeElements.facts.timeline
      const documentText = timelineEvents.map(e =>
        `${e.date}：${e.title}。${e.description || ''}`
      ).join('\n')

      // 并行调用四个API
      setAnalysisProgress('🔄 并行调用四大分析API...')
      const [timelineResult, disputeResult, claimResult, evidenceResult] = await Promise.allSettled([
        // 1. 时间轴分析（已有）
        fetch('/api/timeline-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: timelineEvents,
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
            events: timelineEvents,
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
            evidence: timelineEvents.filter(e => e.evidence && e.evidence.length > 0).map(e => ({
              id: e.id || e.date,
              content: e.description || e.title,
              type: e.type || 'document'
            })),
            claimElements: timelineEvents.map(e => ({
              id: e.id || e.date,
              name: e.title,
              description: e.description || e.title,
              type: e.type || 'fact'
            })),
            mode: 'comprehensive', // 使用AI增强的综合分析模式
            caseContext: {
              basicInfo: {
                caseNumber: caseData.basicInfo?.caseNumber,
                caseType: caseData.basicInfo?.caseType || 'civil',
                court: caseData.basicInfo?.court
              },
              disputes: caseData.threeElements?.disputes || [],
              timeline: timelineEvents
            }
          })
        }).then(res => res.ok ? res.json() : Promise.reject(new Error(`Evidence analysis failed: ${res.status}`)))
      ])

      setAnalysisProgress('📊 处理分析结果...')

      // 处理时间轴分析结果
      if (timelineResult.status === 'fulfilled' && timelineResult.value.success) {
        setAnalysisResult(timelineResult.value.data.analysis)
        console.log('✅ 时间轴分析完成')
      } else {
        console.warn('⚠️ 时间轴分析失败:', timelineResult.status === 'rejected' ? timelineResult.reason.message : '未知错误')
      }

      // 处理争议分析结果
      if (disputeResult.status === 'fulfilled' && disputeResult.value.success) {
        setDisputeAnalysis(disputeResult.value)
        console.log('✅ 争议分析完成')
      } else {
        const errorMsg = disputeResult.status === 'rejected'
          ? (disputeResult.reason?.message || disputeResult.reason?.toString() || '争议分析服务异常')
          : (disputeResult.value?.error || '争议分析返回格式异常');
        console.warn('⚠️ 争议分析失败:', errorMsg)
        setAnalysisError(`争议分析失败: ${errorMsg}`)
      }

      // 处理请求权分析结果
      if (claimResult.status === 'fulfilled' && claimResult.value.id) {
        setClaimAnalysis(claimResult.value)
        console.log('✅ 请求权分析完成')
      } else {
        const errorMsg = claimResult.status === 'rejected'
          ? (claimResult.reason?.message || claimResult.reason?.toString() || '请求权分析服务异常')
          : (claimResult.value?.error || '请求权分析返回格式异常');
        console.warn('⚠️ 请求权分析失败:', errorMsg)
        if (!analysisError) { // 避免覆盖之前的错误信息
          setAnalysisError(`请求权分析失败: ${errorMsg}`)
        }
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
        console.log('✅ AI增强证据分析完成', {
          mode: enhancedEvidence.mode,
          qualityCount: enhancedEvidence.qualityAssessments?.length || 0,
          chainCount: enhancedEvidence.chainAnalyses?.length || 0
        });
      } else {
        const errorMsg = evidenceResult.status === 'rejected'
          ? (evidenceResult.reason?.message || evidenceResult.reason?.toString() || 'AI证据分析服务异常')
          : (evidenceResult.value?.error || 'AI证据分析返回格式异常');
        console.warn('⚠️ AI证据分析失败:', errorMsg);
        if (!analysisError) {
          setAnalysisError(`证据分析失败: ${errorMsg}`);
        }
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
              onClick={performTimelineAnalysis}
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
              {caseData?.threeElements?.facts?.timeline?.map((event, index) => (
                <div key={event.id || index} className="relative">
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
                          <h5 className="font-medium text-gray-900">{event.title}</h5>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                        </div>

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

                      {/* AI增强信息 */}
                      {(analysisResult || disputeAnalysis || claimAnalysis || evidenceAnalysis) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          {/* 检查是否为转折点 */}
                          {analysisResult?.keyTurningPoints.some(tp =>
                            tp.date === event.date || tp.description.includes(event.title)
                          ) && (
                            <div className="flex items-center gap-2 text-sm text-orange-600">
                              <TrendingUp className="w-4 h-4" />
                              <span className="font-medium">关键转折点</span>
                            </div>
                          )}

                          {/* 争议标记 */}
                          {disputeAnalysis?.disputes?.some((dispute: any) =>
                            dispute.relatedEvents?.includes(event.id || event.date) ||
                            event.title.toLowerCase().includes('争议') ||
                            event.description?.toLowerCase().includes('争议')
                          ) && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium">争议焦点</span>
                            </div>
                          )}

                          {/* 请求权标记 */}
                          {claimAnalysis?.claims?.primary?.some((claim: any) =>
                            claim.events?.includes(event.id || event.date) ||
                            event.type === 'legal' || event.type === 'claim'
                          ) && (
                            <div className="flex items-center gap-2 text-sm text-purple-600">
                              <Gavel className="w-4 h-4" />
                              <span className="font-medium">请求权基础</span>
                            </div>
                          )}

                          {/* 证据标记 */}
                          {(event.evidence && event.evidence.length > 0) && evidenceAnalysis?.mappings?.some((mapping: any) =>
                            mapping.evidenceId === (event.id || event.date)
                          ) && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <FileText className="w-4 h-4" />
                              <span className="font-medium">关键证据</span>
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
                  关键转折点与争议
                </h5>
                <div className="space-y-2">
                  {/* 时间轴转折点 */}
                  {analysisResult?.keyTurningPoints?.slice(0, 2).map((point, index) => (
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
                  {(!analysisResult?.keyTurningPoints?.length && !disputeAnalysis?.disputes?.length) && (
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

              {/* 证据体系 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-semibold flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  证据体系
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
                  {analysisResult?.evidenceChain?.gaps?.length > 0 && (
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

              {/* AI预测与建议 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-semibold flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-green-600" />
                  AI预测与建议
                </h5>
                <div className="space-y-2">
                  {/* AI预测 */}
                  {analysisResult?.predictions?.slice(0, 2).map((prediction, index) => (
                    <div key={`prediction-${index}`} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(prediction.probability * 100)}% 概率
                        </Badge>
                      </div>
                      <div className="text-green-700">{prediction.reasoning}</div>
                    </div>
                  ))}
                  {/* 综合建议 */}
                  {claimAnalysis?.strategy?.recommendations?.slice(0, 2).map((rec: any, index: number) => (
                    <div key={`rec-${index}`} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-green-600" />
                        <div className="text-green-700">{rec}</div>
                      </div>
                    </div>
                  ))}
                  {(!analysisResult?.predictions?.length && !claimAnalysis?.strategy?.recommendations?.length) && (
                    <div className="text-sm text-gray-500 italic">暂无预测或建议数据</div>
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
          evidences={caseData?.threeElements?.facts?.timeline
            ?.filter(event => event.evidence && event.evidence.length > 0)
            ?.map(event => ({
              id: event.id || event.date,
              title: event.title,
              description: event.description || event.title,
              type: event.type || 'document',
              content: event.description || '',
              relevance: 1.0, // 默认相关性，将由AI分析确定
              source: 'timeline-event',
              date: event.date
            })) || []
          }
          autoGenerate={true}
          maxQuizzes={5}
          onSessionComplete={(session) => {
            console.log('AI证据学习问答会话完成:', {
              sessionId: session.id,
              score: session.score,
              totalQuestions: session.quizzes.length,
              accuracy: session.score / session.totalPossibleScore,
              aiGeneratedCount: session.quizzes.filter(q => q.metadata?.source === 'ai-generated').length
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
    </div>
  )
}