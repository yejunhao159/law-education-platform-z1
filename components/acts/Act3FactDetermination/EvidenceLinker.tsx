'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCaseData, useCaseStore } from '@/lib/stores/useCaseStore'
import { FileText, Link2, Link2Off, Scale, CheckCircle, XCircle } from 'lucide-react'

export function EvidenceLinker() {
  const caseData = useCaseData()
  const { evidenceLinks, linkEvidence, unlinkEvidence, factDisputes } = useCaseStore()
  const [selectedFact, setSelectedFact] = useState<string | null>(null)

  if (!caseData) return null

  const facts = caseData.threeElements.facts.timeline.map(e => ({
    id: `${e.date}-${e.event}`,
    content: `${e.date}: ${e.event}`,
    disputeLevel: factDisputes.get(`${e.date}-${e.event}`) || 'agreed'
  }))

  const evidence = caseData.threeElements.evidence.items

  const getLinkedEvidence = (factId: string) => {
    const linkedIds = evidenceLinks.get(factId) || []
    return evidence.filter(e => linkedIds.includes(e.id || e.name))
  }

  const isEvidenceLinked = (factId: string, evidenceId: string) => {
    const linkedIds = evidenceLinks.get(factId) || []
    return linkedIds.includes(evidenceId)
  }

  const handleToggleLink = (factId: string, evidenceId: string) => {
    if (isEvidenceLinked(factId, evidenceId)) {
      unlinkEvidence(factId, evidenceId)
    } else {
      linkEvidence(factId, evidenceId)
    }
  }

  const getEvidenceTypeIcon = (type: string) => {
    switch (type) {
      case '书证':
        return '📄'
      case '证人证言':
        return '👥'
      case '物证':
        return '🔍'
      case '电子证据':
        return '💻'
      case '鉴定意见':
        return '🔬'
      default:
        return '📋'
    }
  }

  return (
    <div className="space-y-6">
      {/* 选择事实 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">选择要关联证据的事实</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {facts.map(fact => (
              <div
                key={fact.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedFact === fact.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${
                  fact.disputeLevel === 'disputed' ? 'bg-red-50' :
                  fact.disputeLevel === 'partial' ? 'bg-yellow-50' : ''
                }`}
                onClick={() => setSelectedFact(fact.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm">{fact.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={
                        fact.disputeLevel === 'disputed' ? 'destructive' :
                        fact.disputeLevel === 'partial' ? 'default' :
                        'secondary'
                      } className="text-xs">
                        {fact.disputeLevel === 'disputed' ? '核心争议' :
                         fact.disputeLevel === 'partial' ? '部分争议' : '双方认可'}
                      </Badge>
                      {getLinkedEvidence(fact.id).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Link2 className="w-3 h-3 mr-1" />
                          {getLinkedEvidence(fact.id).length} 个证据
                        </Badge>
                      )}
                    </div>
                  </div>
                  {selectedFact === fact.id && (
                    <div className="ml-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 证据列表 */}
      {selectedFact && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="w-5 h-5" />
              可关联的证据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {evidence.map(item => {
                const isLinked = isEvidenceLinked(selectedFact, item.id || item.name)
                
                return (
                  <Card
                    key={item.id || item.name}
                    className={`relative ${
                      isLinked ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    {isLinked && (
                      <div className="absolute top-2 right-2">
                        <Link2 className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">
                          {getEvidenceTypeIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{item.name}</h4>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              <Badge 
                                variant={item.accepted ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {item.accepted ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    采纳
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    不采纳
                                  </>
                                )}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">
                              提交方：{item.submittedBy}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${item.credibilityScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">
                                {item.credibilityScore}%
                              </span>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant={isLinked ? 'destructive' : 'outline'}
                            className="w-full mt-3"
                            onClick={() => handleToggleLink(selectedFact, item.id || item.name)}
                          >
                            {isLinked ? (
                              <>
                                <Link2Off className="w-4 h-4 mr-1" />
                                取消关联
                              </>
                            ) : (
                              <>
                                <Link2 className="w-4 h-4 mr-1" />
                                关联证据
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 已关联的证据汇总 */}
      {selectedFact && getLinkedEvidence(selectedFact).length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">已关联的证据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getLinkedEvidence(selectedFact).map(item => (
                <div key={item.id || item.name} className="flex items-center justify-between p-2 bg-white rounded">
                  <div className="flex items-center gap-2">
                    <span>{getEvidenceTypeIcon(item.type)}</span>
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                  </div>
                  <Badge variant={item.accepted ? 'default' : 'secondary'}>
                    {item.accepted ? '已采纳' : '未采纳'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}