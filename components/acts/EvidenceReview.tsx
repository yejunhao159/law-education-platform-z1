'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import { 
  Scale, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Link,
  Eye,
  Shield,
  TrendingUp,
  MessageSquare,
  ChevronRight
} from 'lucide-react'

interface ClaimElement {
  id: string
  name: string
  description: string
  required: boolean
  proved: boolean
}

interface EnhancedEvidence {
  id: string
  name: string
  type: '书证' | '物证' | '证人证言' | '鉴定意见' | '勘验笔录' | '视听资料' | '电子数据' | '当事人陈述'
  submittedBy: '原告' | '被告' | '第三人' | '法院调取'
  description?: string
  credibilityScore: number
  relevanceScore: number
  legalityScore: number
  accepted: boolean
  courtOpinion?: string
  challenges?: string[]
  claimElements?: string[]
  burdenReverse?: boolean
  legalBasis?: string
  relatedFacts?: string[]
}

export function EvidenceReview() {
  const caseData = useCaseStore(state => state.caseData)
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'chain' | 'claim'>('list')
  
  const claimElements: ClaimElement[] = [
    {
      id: 'contract_formation',
      name: '合同成立',
      description: '双方当事人就房屋买卖达成合意',
      required: true,
      proved: false
    },
    {
      id: 'contract_validity',
      name: '合同有效',
      description: '合同符合法律规定，不存在无效情形',
      required: true,
      proved: false
    },
    {
      id: 'plaintiff_performance',
      name: '原告履行义务',
      description: '买方已履行或愿意履行自己的合同义务',
      required: true,
      proved: false
    },
    {
      id: 'defendant_breach',
      name: '被告违约',
      description: '卖方未履行合同约定的义务',
      required: true,
      proved: false
    },
    {
      id: 'no_force_majeure',
      name: '无不可抗力',
      description: '违约行为不是因不可抗力造成',
      required: true,
      proved: false
    }
  ]
  
  const extractAndEnhanceEvidences = (): EnhancedEvidence[] => {
    if (!caseData?.threeElements?.evidence?.items) return []
    
    return caseData.threeElements.evidence.items.map((item: any, index: number): EnhancedEvidence => {
      const enhanced: EnhancedEvidence = {
        id: item.id || `evidence-${index}`,
        name: item.name,
        type: item.type,
        submittedBy: item.submittedBy,
        description: item.description,
        credibilityScore: item.credibilityScore,
        relevanceScore: item.relevanceScore,
        legalityScore: 100, // 默认合法性评分
        accepted: item.accepted,
        courtOpinion: item.courtOpinion,
        relatedFacts: item.relatedFacts,
        challenges: []
      }
      
      // 智能推断请求权要件关联
      const claimElements: string[] = []
      const lowerName = item.name.toLowerCase()
      const lowerDesc = (item.description || '').toLowerCase()
      
      if (lowerName.includes('合同') || lowerDesc.includes('合同')) {
        claimElements.push('contract_formation', 'contract_validity')
        enhanced.legalBasis = '《民法典》第469条：当事人订立合同，可以采用书面形式'
      }
      
      if (lowerName.includes('转账') || lowerDesc.includes('支付')) {
        claimElements.push('plaintiff_performance')
        if (!enhanced.legalBasis) enhanced.legalBasis = '《民事诉讼法》第63条：证据包括电子数据'
      }
      
      if (item.type === '证人证言') {
        claimElements.push('defendant_breach')
        if (!enhanced.legalBasis) enhanced.legalBasis = '《民事诉讼法》第70条：证人证言需其他证据佐证'
      }
      
      enhanced.claimElements = claimElements
      enhanced.burdenReverse = item.type === '鉴定意见'
      
      return enhanced
    })
  }
  
  const evidences = extractAndEnhanceEvidences()
  
  const calculateChainStrength = () => {
    const acceptedEvidences = evidences.filter(e => e.accepted)
    if (acceptedEvidences.length === 0) return 0
    
    const avgCredibility = acceptedEvidences.reduce((sum, e) => sum + e.credibilityScore, 0) / acceptedEvidences.length
    const avgRelevance = acceptedEvidences.reduce((sum, e) => sum + e.relevanceScore, 0) / acceptedEvidences.length
    
    return Math.round((avgCredibility + avgRelevance) / 2)
  }
  
  const getEvidenceTypeIcon = (type: string) => {
    switch (type) {
      case '书证': return <FileText className="w-4 h-4" />
      case '物证': return <Shield className="w-4 h-4" />
      case '证人证言': return <MessageSquare className="w-4 h-4" />
      case '鉴定意见': return <Eye className="w-4 h-4" />
      case '勘验笔录': return <Eye className="w-4 h-4" />
      case '视听资料': return <Eye className="w-4 h-4" />
      case '电子数据': return <Link className="w-4 h-4" />
      case '当事人陈述': return <MessageSquare className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }
  
  const chainStrength = calculateChainStrength()

  return (
    <div className="space-y-6">
      {/* 证据链强度总览 */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Scale className="w-5 h-5" />
              证据链分析 (真实数据)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              共 {evidences.length} 份证据，{evidences.filter(e => e.accepted).length} 份被采纳
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{chainStrength}%</div>
            <p className="text-xs text-gray-500">证据链强度</p>
          </div>
        </div>
        <Progress value={chainStrength} className="h-2" />
        <div className="flex items-center justify-between mt-4 text-sm">
          <Badge variant="outline" className="bg-white">
            <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
            采纳 {evidences.filter(e => e.accepted).length}
          </Badge>
          <Badge variant="outline" className="bg-white">
            <XCircle className="w-3 h-3 mr-1 text-red-600" />
            不采纳 {evidences.filter(e => !e.accepted).length}
          </Badge>
        </div>
      </Card>
      
      {/* 视图切换 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">证据详情</h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            列表视图
          </Button>
          <Button
            variant={viewMode === 'claim' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('claim')}
          >
            请求权分析
          </Button>
        </div>
      </div>
      
      {/* 证据展示 */}
      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidences.map((evidence) => (
            <Card 
              key={evidence.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedEvidence === evidence.id ? 'ring-2 ring-blue-500' : ''
              } ${!evidence.accepted ? 'opacity-75' : ''}`}
              onClick={() => setSelectedEvidence(evidence.id === selectedEvidence ? null : evidence.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getEvidenceTypeIcon(evidence.type)}
                  <h4 className="font-semibold text-gray-800">{evidence.name}</h4>
                </div>
                <Badge variant={evidence.accepted ? 'default' : 'secondary'}>
                  {evidence.accepted ? '采纳' : '不采纳'}
                </Badge>
              </div>
              
              {evidence.description && (
                <p className="text-sm text-gray-600 mb-3">{evidence.description}</p>
              )}
              
              {/* 三性评分 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">真实性</span>
                  <div className="flex items-center gap-2">
                    <Progress value={evidence.credibilityScore} className="w-20 h-1.5" />
                    <span className="font-medium">{evidence.credibilityScore}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">关联性</span>
                  <div className="flex items-center gap-2">
                    <Progress value={evidence.relevanceScore} className="w-20 h-1.5" />
                    <span className="font-medium">{evidence.relevanceScore}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">合法性</span>
                  <div className="flex items-center gap-2">
                    <Progress value={evidence.legalityScore} className="w-20 h-1.5" />
                    <span className="font-medium">{evidence.legalityScore}%</span>
                  </div>
                </div>
              </div>
              
              {/* 展开详情 */}
              {selectedEvidence === evidence.id && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{evidence.type}</Badge>
                    <Badge variant="outline">提供方：{evidence.submittedBy}</Badge>
                    {evidence.burdenReverse && (
                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                        举证责任倒置
                      </Badge>
                    )}
                  </div>
                  
                  {evidence.courtOpinion && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">法院意见</p>
                      <p className="text-sm text-blue-800">{evidence.courtOpinion}</p>
                    </div>
                  )}
                  
                  {evidence.claimElements && evidence.claimElements.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-900 mb-2">请求权要件证明</p>
                      <div className="flex flex-wrap gap-1">
                        {evidence.claimElements.map((element) => {
                          const claim = claimElements.find(c => c.id === element)
                          return claim ? (
                            <Badge key={element} variant="outline" className="bg-green-100 text-green-800 text-xs">
                              {claim.name}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                  
                  {evidence.legalBasis && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 mb-1">法律依据</p>
                      <p className="text-sm text-gray-700">{evidence.legalBasis}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : viewMode === 'claim' ? (
        // 请求权分析视图
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            请求权基础分析（房屋买卖合同纠纷）
          </h4>
          
          <div className="space-y-6">
            {claimElements.map((element, index) => {
              const supportingEvidences = evidences.filter(e => 
                e.claimElements?.includes(element.id) && e.accepted
              )
              const isProved = supportingEvidences.length > 0
              
              return (
                <div 
                  key={element.id} 
                  className={`p-4 border rounded-lg ${
                    isProved ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                        isProved ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900">{element.name}</h5>
                        <p className="text-sm text-gray-600">{element.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {element.required && (
                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                          必要条件
                        </Badge>
                      )}
                      <Badge 
                        variant={isProved ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {isProved ? '已证明' : '未证明'}
                      </Badge>
                    </div>
                  </div>
                  
                  {supportingEvidences.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-green-900 mb-2">
                        支持证据 ({supportingEvidences.length}项)：
                      </p>
                      <div className="space-y-2">
                        {supportingEvidences.map((evidence) => (
                          <div 
                            key={evidence.id}
                            className="flex items-center justify-between p-3 bg-white rounded border"
                          >
                            <div className="flex items-center gap-2">
                              {getEvidenceTypeIcon(evidence.type)}
                              <span className="text-sm font-medium">{evidence.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {evidence.type}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              可信度：{evidence.credibilityScore}% | 关联性：{evidence.relevanceScore}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded border border-dashed border-red-300">
                      <p className="text-sm text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        缺乏证据支持，可能影响请求权成立
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* 综合分析 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              请求权成立分析
            </h5>
            {(() => {
              const provedElements = claimElements.filter(e => 
                evidences.some(ev => ev.claimElements?.includes(e.id) && ev.accepted)
              )
              const requiredElements = claimElements.filter(e => e.required)
              const provedRequired = provedElements.filter(e => e.required)
              
              return (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-800">必要条件证明情况：</span>
                    <span className={`font-semibold ${
                      provedRequired.length === requiredElements.length ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {provedRequired.length}/{requiredElements.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-800">整体证明强度：</span>
                    <span className="font-semibold text-blue-700">
                      {Math.round((provedElements.length / claimElements.length) * 100)}%
                    </span>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded">
                    <p className="text-blue-800">
                      {provedRequired.length === requiredElements.length ? 
                        '✅ 所有必要条件均有证据支持，请求权基础充分' : 
                        '⚠️ 部分必要条件缺乏证据支持，需要补强证据或调整诉讼策略'
                      }
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        </Card>
      ) : null}
    </div>
  )
}