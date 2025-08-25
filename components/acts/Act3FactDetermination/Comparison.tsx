'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCaseData, useCaseStore } from '@/lib/stores/useCaseStore'
import { Users, MessageSquare, Eye, EyeOff } from 'lucide-react'

export function Comparison() {
  const caseData = useCaseData()
  const { comparisonMode, toggleComparisonMode, annotations, addAnnotation, removeAnnotation } = useCaseStore()
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [newAnnotation, setNewAnnotation] = useState('')
  const [annotatingId, setAnnotatingId] = useState<string | null>(null)

  if (!caseData) return null

  // 模拟原被告的陈述（实际项目中应该从数据中获取）
  const plaintiffClaims = [
    { id: 'p1', content: '2023年1月15日签订了购房合同', supported: true },
    { id: 'p2', content: '已支付首付款50万元', supported: true },
    { id: 'p3', content: '被告拒绝配合过户', supported: true },
    { id: 'p4', content: '房价上涨不是合法理由', supported: false }
  ]

  const defendantClaims = [
    { id: 'd1', content: '合同签订存在重大误解', supported: false },
    { id: 'd2', content: '房价上涨属于情势变更', supported: false },
    { id: 'd3', content: '首付款可以退还', supported: false },
    { id: 'd4', content: '原告存在违约行为', supported: false }
  ]

  const handleAddAnnotation = (id: string) => {
    if (newAnnotation.trim()) {
      addAnnotation(id, newAnnotation)
      setNewAnnotation('')
      setAnnotatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant={comparisonMode ? 'default' : 'outline'}
                size="sm"
                onClick={toggleComparisonMode}
              >
                <Users className="w-4 h-4 mr-1" />
                {comparisonMode ? '对比模式开启' : '对比模式关闭'}
              </Button>
              <Button
                variant={showAnnotations ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowAnnotations(!showAnnotations)}
              >
                {showAnnotations ? (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    显示批注
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-1" />
                    隐藏批注
                  </>
                )}
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              共 {annotations.size} 条批注
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 双方陈述对比 */}
      {comparisonMode && (
        <div className="grid grid-cols-2 gap-6">
          {/* 原告陈述 */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg text-blue-800">原告陈述</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {plaintiffClaims.map(claim => (
                  <div 
                    key={claim.id}
                    className={`p-3 rounded-lg border ${
                      claim.supported 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm">{claim.content}</p>
                      <Badge variant={claim.supported ? 'default' : 'secondary'}>
                        {claim.supported ? '有证据支撑' : '缺少证据'}
                      </Badge>
                    </div>
                    
                    {/* 批注区域 */}
                    {showAnnotations && (
                      <div className="mt-3 pt-3 border-t">
                        {annotations.get(claim.id) ? (
                          <div className="bg-yellow-50 p-2 rounded text-xs">
                            <div className="flex items-start justify-between">
                              <p className="text-gray-700">{annotations.get(claim.id)}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAnnotation(claim.id)}
                                className="h-auto p-1"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ) : annotatingId === claim.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={newAnnotation}
                              onChange={(e) => setNewAnnotation(e.target.value)}
                              placeholder="添加批注..."
                              className="text-xs"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAddAnnotation(claim.id)}
                              >
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAnnotatingId(null)
                                  setNewAnnotation('')
                                }}
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAnnotatingId(claim.id)}
                            className="text-xs h-auto py-1"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            添加批注
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 被告陈述 */}
          <Card className="border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-lg text-red-800">被告陈述</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {defendantClaims.map(claim => (
                  <div 
                    key={claim.id}
                    className={`p-3 rounded-lg border ${
                      claim.supported 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm">{claim.content}</p>
                      <Badge variant={claim.supported ? 'default' : 'secondary'}>
                        {claim.supported ? '有证据支撑' : '缺少证据'}
                      </Badge>
                    </div>
                    
                    {/* 批注区域 */}
                    {showAnnotations && (
                      <div className="mt-3 pt-3 border-t">
                        {annotations.get(claim.id) ? (
                          <div className="bg-yellow-50 p-2 rounded text-xs">
                            <div className="flex items-start justify-between">
                              <p className="text-gray-700">{annotations.get(claim.id)}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAnnotation(claim.id)}
                                className="h-auto p-1"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ) : annotatingId === claim.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={newAnnotation}
                              onChange={(e) => setNewAnnotation(e.target.value)}
                              placeholder="添加批注..."
                              className="text-xs"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAddAnnotation(claim.id)}
                              >
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAnnotatingId(null)
                                  setNewAnnotation('')
                                }}
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAnnotatingId(claim.id)}
                            className="text-xs h-auto py-1"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            添加批注
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 差异分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">关键差异分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">主要分歧点</h4>
              <ul className="space-y-2 text-sm text-yellow-700">
                <li>• 房价上涨是否构成情势变更</li>
                <li>• 合同签订时是否存在重大误解</li>
                <li>• 被告拒绝履行是否构成违约</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">无争议事实</h4>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• 双方签订了房屋买卖合同</li>
                <li>• 原告已支付首付款</li>
                <li>• 房价确实出现上涨</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}