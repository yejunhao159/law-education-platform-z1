'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { TimelineAnalysis, LegalAnalysis, PerspectiveAnalysis } from '@/types/legal-case'
import {
  Scale,
  FileText,
  AlertTriangle,
  Shield,
  Lightbulb,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Gavel,
  Users,
  Target,
  Brain,
  Info,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface AnalysisDisplayProps {
  analysis: TimelineAnalysis
  teachingMode?: boolean
  perspective?: string
  onClose?: () => void
}

export function AnalysisDisplay({ 
  analysis, 
  teachingMode = false,
  perspective = 'neutral',
  onClose 
}: AnalysisDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['factual', 'legal', 'evidence'])
  )
  const [activeTab, setActiveTab] = useState('analysis')

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const legalAnalysis = analysis.perspectiveAnalysis || analysis.legalAnalysis
  if (!legalAnalysis) return null

  return (
    <div className="w-full space-y-4">
      {/* 分析标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">
            <Scale className="w-4 h-4 mr-2" />
            法学分析
          </TabsTrigger>
          <TabsTrigger value="strategy">
            <Target className="w-4 h-4 mr-2" />
            策略建议
          </TabsTrigger>
          <TabsTrigger value="legal">
            <Gavel className="w-4 h-4 mr-2" />
            法律依据
          </TabsTrigger>
        </TabsList>

        {/* 法学分析标签 */}
        <TabsContent value="analysis" className="space-y-3 mt-4">
          {/* 事实认定分析 */}
          <Collapsible open={expandedSections.has('factual')}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger 
                onClick={() => toggleSection('factual')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">事实认定分析</h3>
                </div>
                {expandedSections.has('factual') ? 
                  <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                }
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {legalAnalysis.factualAnalysis}
                  </p>
                  
                  {/* 教学模式提示 */}
                  {teachingMode && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Brain className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-yellow-900">学习要点</p>
                          <p className="text-xs text-yellow-800">
                            事实认定是判决的基础，需要通过证据证明待证事实的存在或不存在。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 法理分析 */}
          <Collapsible open={expandedSections.has('jurisprudence')}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger 
                onClick={() => toggleSection('jurisprudence')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">法理分析</h3>
                </div>
                {expandedSections.has('jurisprudence') ? 
                  <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                }
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {legalAnalysis.jurisprudence}
                  </p>
                  
                  {/* 法律原则 */}
                  {legalAnalysis.legalPrinciples && legalAnalysis.legalPrinciples.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600">适用的法律原则：</p>
                      <div className="flex flex-wrap gap-2">
                        {legalAnalysis.legalPrinciples.map((principle, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {principle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 举证要求 */}
          <Collapsible open={expandedSections.has('evidence')}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger 
                onClick={() => toggleSection('evidence')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">举证要求</h3>
                </div>
                {expandedSections.has('evidence') ? 
                  <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                }
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {legalAnalysis.evidenceRequirement}
                  </p>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 风险评估 */}
          <Collapsible open={expandedSections.has('risk')}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger 
                onClick={() => toggleSection('risk')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">风险评估</h3>
                </div>
                {expandedSections.has('risk') ? 
                  <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                }
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {legalAnalysis.riskAssessment}
                  </p>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        {/* 策略建议标签 */}
        <TabsContent value="strategy" className="space-y-3 mt-4">
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-gray-900">诉讼策略建议</h3>
              </div>
              
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {legalAnalysis.strategicAdvice}
              </div>

              {/* 视角特定内容 */}
              {analysis.perspectiveAnalysis && (
                <div className="mt-4 space-y-3">
                  {/* 原告视角 */}
                  {perspective === 'plaintiff' && analysis.perspectiveAnalysis.favorablePoints && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-green-900 mb-2">有利要点</p>
                      <ul className="space-y-1">
                        {analysis.perspectiveAnalysis.favorablePoints.map((point, idx) => (
                          <li key={idx} className="text-xs text-green-800 flex items-start gap-1">
                            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perspective === 'plaintiff' && analysis.perspectiveAnalysis.concerns && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-red-900 mb-2">风险关注</p>
                      <ul className="space-y-1">
                        {analysis.perspectiveAnalysis.concerns.map((concern, idx) => (
                          <li key={idx} className="text-xs text-red-800 flex items-start gap-1">
                            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 被告视角 */}
                  {perspective === 'defendant' && analysis.perspectiveAnalysis.defensiveStrategy && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-900 mb-2">防御策略</p>
                      <ul className="space-y-1">
                        {analysis.perspectiveAnalysis.defensiveStrategy.map((strategy, idx) => (
                          <li key={idx} className="text-xs text-blue-800 flex items-start gap-1">
                            <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{strategy}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {perspective === 'defendant' && analysis.perspectiveAnalysis.counterArguments && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-orange-900 mb-2">反驳论点</p>
                      <ul className="space-y-1">
                        {analysis.perspectiveAnalysis.counterArguments.map((arg, idx) => (
                          <li key={idx} className="text-xs text-orange-800 flex items-start gap-1">
                            <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{arg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 法官视角 */}
                  {perspective === 'judge' && analysis.perspectiveAnalysis.keyFocus && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-purple-900 mb-2">审判关注重点</p>
                      <ul className="space-y-1">
                        {analysis.perspectiveAnalysis.keyFocus.map((focus, idx) => (
                          <li key={idx} className="text-xs text-purple-800 flex items-start gap-1">
                            <Gavel className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{focus}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 法律依据标签 */}
        <TabsContent value="legal" className="space-y-3 mt-4">
          {/* 适用法条 */}
          {legalAnalysis.applicableLaws && legalAnalysis.applicableLaws.length > 0 && (
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">适用法条</h3>
                </div>
                <div className="space-y-2">
                  {legalAnalysis.applicableLaws.map((law, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="mt-0.5">
                        {idx + 1}
                      </Badge>
                      <p className="text-gray-700">{law}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* 相关判例 */}
          {legalAnalysis.precedents && legalAnalysis.precedents.length > 0 && (
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">相关判例</h3>
                </div>
                <div className="space-y-2">
                  {legalAnalysis.precedents.map((precedent, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">{precedent}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* 关键术语 */}
          {legalAnalysis.keyTerms && legalAnalysis.keyTerms.length > 0 && (
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">法律术语释义</h3>
                </div>
                <div className="space-y-3">
                  {legalAnalysis.keyTerms.map((term, idx) => (
                    <div key={idx} className="border-l-2 border-green-200 pl-3">
                      <p className="text-sm font-medium text-gray-900">{term.term}</p>
                      <p className="text-xs text-gray-600 mt-1">{term.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 教学模式特殊内容 */}
      {teachingMode && analysis.perspectiveAnalysis?.teachingPoints && (
        <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-yellow-700" />
              <h3 className="font-semibold text-yellow-900">教学引导</h3>
            </div>
            <div className="grid gap-2">
              {analysis.perspectiveAnalysis.teachingPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-200 text-yellow-900 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-yellow-900">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 信心度指示器 */}
      {analysis.confidence !== undefined && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-2">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>AI分析可信度</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                style={{ width: `${analysis.confidence}%` }}
              />
            </div>
            <span className="font-medium">{analysis.confidence}%</span>
          </div>
        </div>
      )}
    </div>
  )
}