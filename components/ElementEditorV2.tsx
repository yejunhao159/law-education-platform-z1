'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Save, X, Plus, Trash2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ElementEditorProps {
  data: any
  onSave: (data: any) => void
  onCancel: () => void
}

export function ElementEditor({ data, onSave, onCancel }: ElementEditorProps) {
  const [editData, setEditData] = useState(JSON.parse(JSON.stringify(data)))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('basic')

  // 更新基本信息
  const updateBasicInfo = useCallback((field: string, value: string) => {
    setEditData((prev: any) => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        [field]: value
      }
    }))
    // 清除错误
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  // 更新当事人信息
  const updateParty = useCallback((type: 'plaintiff' | 'defendant', value: string) => {
    setEditData((prev: any) => ({
      ...prev,
      basicInfo: {
        ...prev.basicInfo,
        parties: {
          ...prev.basicInfo?.parties,
          [type]: value
        }
      }
    }))
  }, [])

  // 更新三要素 - 事实
  const updateFacts = useCallback((field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      threeElements: {
        ...prev.threeElements,
        facts: {
          ...prev.threeElements.facts,
          [field]: value
        }
      }
    }))
  }, [])

  // 更新三要素 - 证据
  const updateEvidence = useCallback((field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      threeElements: {
        ...prev.threeElements,
        evidence: {
          ...prev.threeElements.evidence,
          [field]: value
        }
      }
    }))
  }, [])

  // 更新三要素 - 裁判理由
  const updateReasoning = useCallback((field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      threeElements: {
        ...prev.threeElements,
        reasoning: {
          ...prev.threeElements.reasoning,
          [field]: value
        }
      }
    }))
  }, [])

  // 添加时间线事件
  const addTimelineEvent = useCallback(() => {
    const newEvent = {
      date: '',
      event: '',
      importance: 'normal',
      actors: []
    }
    updateFacts('timeline', [...(editData.threeElements?.facts?.timeline || []), newEvent])
  }, [editData, updateFacts])

  // 删除时间线事件
  const removeTimelineEvent = useCallback((index: number) => {
    const timeline = editData.threeElements?.facts?.timeline || []
    updateFacts('timeline', timeline.filter((_: any, i: number) => i !== index))
  }, [editData, updateFacts])

  // 添加证据项
  const addEvidenceItem = useCallback(() => {
    const newItem = {
      name: '',
      type: '书证',
      submittedBy: '原告',
      credibilityScore: 50,
      relevanceScore: 50,
      accepted: false
    }
    updateEvidence('items', [...(editData.threeElements?.evidence?.items || []), newItem])
  }, [editData, updateEvidence])

  // 删除证据项
  const removeEvidenceItem = useCallback((index: number) => {
    const items = editData.threeElements?.evidence?.items || []
    updateEvidence('items', items.filter((_: any, i: number) => i !== index))
  }, [editData, updateEvidence])

  // 验证数据
  const validateData = useCallback(() => {
    const newErrors: Record<string, string> = {}
    
    // 验证必填字段
    if (!editData.basicInfo?.caseNumber) {
      newErrors.caseNumber = '案号不能为空'
    }
    if (!editData.basicInfo?.court) {
      newErrors.court = '法院名称不能为空'
    }
    if (!editData.basicInfo?.date) {
      newErrors.date = '判决日期不能为空'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [editData])

  // 保存处理
  const handleSave = useCallback(() => {
    if (validateData()) {
      onSave(editData)
    } else {
      setActiveTab('basic')
    }
  }, [editData, onSave, validateData])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>编辑判决书三要素</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                <Save className="w-4 h-4 mr-1" />
                保存
              </Button>
              <Button onClick={onCancel} variant="outline" size="sm">
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(errors).length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                请修正以下错误：{Object.values(errors).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="facts">事实认定</TabsTrigger>
              <TabsTrigger value="evidence">证据质证</TabsTrigger>
              <TabsTrigger value="reasoning">法官说理</TabsTrigger>
            </TabsList>

            {/* 基本信息 */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="caseNumber">案号 *</Label>
                  <Input
                    id="caseNumber"
                    value={editData.basicInfo?.caseNumber || ''}
                    onChange={(e) => updateBasicInfo('caseNumber', e.target.value)}
                    className={errors.caseNumber ? 'border-red-500' : ''}
                  />
                  {errors.caseNumber && (
                    <p className="text-sm text-red-500 mt-1">{errors.caseNumber}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="court">法院 *</Label>
                  <Input
                    id="court"
                    value={editData.basicInfo?.court || ''}
                    onChange={(e) => updateBasicInfo('court', e.target.value)}
                    className={errors.court ? 'border-red-500' : ''}
                  />
                  {errors.court && (
                    <p className="text-sm text-red-500 mt-1">{errors.court}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date">判决日期 *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editData.basicInfo?.date || ''}
                    onChange={(e) => updateBasicInfo('date', e.target.value)}
                    className={errors.date ? 'border-red-500' : ''}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-500 mt-1">{errors.date}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>当事人</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plaintiff" className="text-sm">原告</Label>
                    <Input
                      id="plaintiff"
                      value={editData.basicInfo?.parties?.plaintiff || ''}
                      onChange={(e) => updateParty('plaintiff', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="defendant" className="text-sm">被告</Label>
                    <Input
                      id="defendant"
                      value={editData.basicInfo?.parties?.defendant || ''}
                      onChange={(e) => updateParty('defendant', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 事实认定 */}
            <TabsContent value="facts" className="space-y-4">
              <div>
                <Label htmlFor="factsSummary">事实摘要</Label>
                <Textarea
                  id="factsSummary"
                  value={editData.threeElements?.facts?.summary || ''}
                  onChange={(e) => updateFacts('summary', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>时间线</Label>
                  <Button onClick={addTimelineEvent} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    添加事件
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editData.threeElements?.facts?.timeline || []).map((event: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={event.date || ''}
                            onChange={(e) => {
                              const timeline = [...(editData.threeElements?.facts?.timeline || [])]
                              timeline[index] = { ...timeline[index], date: e.target.value }
                              updateFacts('timeline', timeline)
                            }}
                            className="w-40"
                          />
                          <Input
                            value={event.event || ''}
                            onChange={(e) => {
                              const timeline = [...(editData.threeElements?.facts?.timeline || [])]
                              timeline[index] = { ...timeline[index], event: e.target.value }
                              updateFacts('timeline', timeline)
                            }}
                            placeholder="事件描述"
                            className="flex-1"
                          />
                          <select
                            value={event.importance || 'normal'}
                            onChange={(e) => {
                              const timeline = [...(editData.threeElements?.facts?.timeline || [])]
                              timeline[index] = { ...timeline[index], importance: e.target.value }
                              updateFacts('timeline', timeline)
                            }}
                            className="px-3 py-2 border rounded-md"
                          >
                            <option value="critical">关键</option>
                            <option value="important">重要</option>
                            <option value="normal">一般</option>
                          </select>
                          <Button
                            onClick={() => removeTimelineEvent(index)}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="keyFacts">关键事实</Label>
                <Textarea
                  id="keyFacts"
                  value={(editData.threeElements?.facts?.keyFacts || []).join('\n')}
                  onChange={(e) => updateFacts('keyFacts', e.target.value.split('\n').filter(Boolean))}
                  placeholder="每行一个关键事实"
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="disputedFacts">争议事实</Label>
                <Textarea
                  id="disputedFacts"
                  value={(editData.threeElements?.facts?.disputedFacts || []).join('\n')}
                  onChange={(e) => updateFacts('disputedFacts', e.target.value.split('\n').filter(Boolean))}
                  placeholder="每行一个争议事实"
                  className="min-h-[80px]"
                />
              </div>
            </TabsContent>

            {/* 证据质证 */}
            <TabsContent value="evidence" className="space-y-4">
              <div>
                <Label htmlFor="evidenceSummary">证据摘要</Label>
                <Textarea
                  id="evidenceSummary"
                  value={editData.threeElements?.evidence?.summary || ''}
                  onChange={(e) => updateEvidence('summary', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>证据列表</Label>
                  <Button onClick={addEvidenceItem} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    添加证据
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editData.threeElements?.evidence?.items || []).map((item: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Input
                            value={item.name || ''}
                            onChange={(e) => {
                              const items = [...(editData.threeElements?.evidence?.items || [])]
                              items[index] = { ...items[index], name: e.target.value }
                              updateEvidence('items', items)
                            }}
                            placeholder="证据名称"
                          />
                          <div className="flex gap-2">
                            <select
                              value={item.type || '书证'}
                              onChange={(e) => {
                                const items = [...(editData.threeElements?.evidence?.items || [])]
                                items[index] = { ...items[index], type: e.target.value }
                                updateEvidence('items', items)
                              }}
                              className="px-3 py-2 border rounded-md flex-1"
                            >
                              <option value="书证">书证</option>
                              <option value="物证">物证</option>
                              <option value="证人证言">证人证言</option>
                              <option value="鉴定意见">鉴定意见</option>
                              <option value="勘验笔录">勘验笔录</option>
                              <option value="视听资料">视听资料</option>
                              <option value="电子数据">电子数据</option>
                            </select>
                            <Button
                              onClick={() => removeEvidenceItem(index)}
                              size="sm"
                              variant="ghost"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <label className="flex items-center gap-1">
                            <span>提交方：</span>
                            <select
                              value={item.submittedBy || '原告'}
                              onChange={(e) => {
                                const items = [...(editData.threeElements?.evidence?.items || [])]
                                items[index] = { ...items[index], submittedBy: e.target.value }
                                updateEvidence('items', items)
                              }}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value="原告">原告</option>
                              <option value="被告">被告</option>
                              <option value="第三人">第三人</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-1">
                            <span>可信度：</span>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.credibilityScore || 50}
                              onChange={(e) => {
                                const items = [...(editData.threeElements?.evidence?.items || [])]
                                items[index] = { ...items[index], credibilityScore: parseInt(e.target.value) }
                                updateEvidence('items', items)
                              }}
                              className="w-16 h-7"
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={item.accepted || false}
                              onChange={(e) => {
                                const items = [...(editData.threeElements?.evidence?.items || [])]
                                items[index] = { ...items[index], accepted: e.target.checked }
                                updateEvidence('items', items)
                              }}
                            />
                            <span>采纳</span>
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 法官说理 */}
            <TabsContent value="reasoning" className="space-y-4">
              <div>
                <Label htmlFor="reasoningSummary">裁判理由摘要</Label>
                <Textarea
                  id="reasoningSummary"
                  value={editData.threeElements?.reasoning?.summary || ''}
                  onChange={(e) => updateReasoning('summary', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="keyArguments">核心论点</Label>
                <Textarea
                  id="keyArguments"
                  value={(editData.threeElements?.reasoning?.keyArguments || []).join('\n')}
                  onChange={(e) => updateReasoning('keyArguments', e.target.value.split('\n').filter(Boolean))}
                  placeholder="每行一个核心论点"
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="judgment">判决结果</Label>
                <Textarea
                  id="judgment"
                  value={editData.threeElements?.reasoning?.judgment || ''}
                  onChange={(e) => updateReasoning('judgment', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}