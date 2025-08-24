'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Save, X, Plus, Trash2, Edit2, Check } from 'lucide-react'

interface ElementEditorProps {
  elementType: 'facts' | 'evidence' | 'reasoning'
  title: string
  data: any
  onSave: (data: any) => void
  onCancel?: () => void
}

export function ElementEditor({ elementType, title, data, onSave, onCancel }: ElementEditorProps) {
  const [editData, setEditData] = useState(data)
  const [isEditing, setIsEditing] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)

  useEffect(() => {
    setEditData(data)
  }, [data])

  const handleSave = useCallback(() => {
    onSave(editData)
    setIsEditing(false)
    setEditingField(null)
  }, [editData, onSave])

  const handleCancel = useCallback(() => {
    setEditData(data)
    setIsEditing(false)
    setEditingField(null)
    onCancel?.()
  }, [data, onCancel])

  const updateField = useCallback((field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const renderFactsEditor = () => (
    <div className="space-y-4">
      {/* 事实摘要 */}
      <div>
        <label className="text-sm font-medium mb-1 block">事实摘要</label>
        {editingField === 'summary' ? (
          <div className="flex gap-2">
            <textarea
              className="flex-1 min-h-[100px] px-3 py-2 text-sm border rounded-md"
              value={editData.summary || ''}
              onChange={(e) => updateField('summary', e.target.value)}
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  updateField('summary', data.summary)
                  setEditingField(null)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="p-3 bg-muted rounded-md text-sm cursor-pointer hover:bg-muted/80"
            onClick={() => setEditingField('summary')}
          >
            {editData.summary || '点击添加摘要'}
          </div>
        )}
      </div>

      {/* 关键事实 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">关键事实</label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const newFacts = [...(editData.keyFacts || []), '']
              updateField('keyFacts', newFacts)
              setEditingField(`keyFact-${newFacts.length - 1}`)
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {editData.keyFacts?.map((fact: string, index: number) => (
            <div key={index} className="flex gap-2">
              {editingField === `keyFact-${index}` ? (
                <>
                  <input
                    className="flex-1 px-3 py-2 text-sm border rounded-md"
                    value={fact}
                    onChange={(e) => {
                      const newFacts = [...editData.keyFacts]
                      newFacts[index] = e.target.value
                      updateField('keyFacts', newFacts)
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingField(null)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div
                    className="flex-1 p-2 bg-muted rounded-md text-sm cursor-pointer hover:bg-muted/80"
                    onClick={() => setEditingField(`keyFact-${index}`)}
                  >
                    {fact || '点击编辑'}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newFacts = editData.keyFacts.filter((_: any, i: number) => i !== index)
                      updateField('keyFacts', newFacts)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 时间线 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">时间线</label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const newTimeline = [...(editData.timeline || []), {
                date: '',
                event: '',
                importance: 'normal'
              }]
              updateField('timeline', newTimeline)
              setEditingField(`timeline-${newTimeline.length - 1}`)
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {editData.timeline?.map((item: any, index: number) => (
            <div key={index} className="p-3 bg-muted rounded-md">
              {editingField === `timeline-${index}` ? (
                <div className="space-y-2">
                  <input
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="日期"
                    value={item.date}
                    onChange={(e) => {
                      const newTimeline = [...editData.timeline]
                      newTimeline[index].date = e.target.value
                      updateField('timeline', newTimeline)
                    }}
                  />
                  <textarea
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="事件描述"
                    value={item.event}
                    onChange={(e) => {
                      const newTimeline = [...editData.timeline]
                      newTimeline[index].event = e.target.value
                      updateField('timeline', newTimeline)
                    }}
                  />
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 text-sm border rounded-md"
                      value={item.importance}
                      onChange={(e) => {
                        const newTimeline = [...editData.timeline]
                        newTimeline[index].importance = e.target.value
                        updateField('timeline', newTimeline)
                      }}
                    >
                      <option value="normal">一般</option>
                      <option value="important">重要</option>
                      <option value="critical">关键</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={() => setEditingField(null)}
                    >
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer hover:bg-muted/80"
                  onClick={() => setEditingField(`timeline-${index}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.date || '未设置日期'}</span>
                    <Badge variant={item.importance === 'critical' ? 'destructive' : item.importance === 'important' ? 'default' : 'secondary'}>
                      {item.importance === 'critical' ? '关键' : item.importance === 'important' ? '重要' : '一般'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.event || '未设置事件'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderEvidenceEditor = () => (
    <div className="space-y-4">
      {/* 证据摘要 */}
      <div>
        <label className="text-sm font-medium mb-1 block">证据概况</label>
        {editingField === 'summary' ? (
          <div className="flex gap-2">
            <textarea
              className="flex-1 min-h-[100px] px-3 py-2 text-sm border rounded-md"
              value={editData.summary || ''}
              onChange={(e) => updateField('summary', e.target.value)}
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingField(null)}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className="p-3 bg-muted rounded-md text-sm cursor-pointer hover:bg-muted/80"
            onClick={() => setEditingField('summary')}
          >
            {editData.summary || '点击添加概况'}
          </div>
        )}
      </div>

      {/* 证据列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">证据清单</label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const newItems = [...(editData.items || []), {
                name: '',
                type: '书证',
                submittedBy: '原告',
                credibilityScore: 50,
                accepted: true
              }]
              updateField('items', newItems)
              setEditingField(`evidence-${newItems.length - 1}`)
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {editData.items?.map((item: any, index: number) => (
            <div key={index} className="p-3 bg-muted rounded-md">
              {editingField === `evidence-${index}` ? (
                <div className="space-y-2">
                  <input
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="证据名称"
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...editData.items]
                      newItems[index].name = e.target.value
                      updateField('items', newItems)
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="px-3 py-2 text-sm border rounded-md"
                      value={item.type}
                      onChange={(e) => {
                        const newItems = [...editData.items]
                        newItems[index].type = e.target.value
                        updateField('items', newItems)
                      }}
                    >
                      <option value="书证">书证</option>
                      <option value="物证">物证</option>
                      <option value="证人证言">证人证言</option>
                      <option value="鉴定意见">鉴定意见</option>
                      <option value="电子数据">电子数据</option>
                    </select>
                    <select
                      className="px-3 py-2 text-sm border rounded-md"
                      value={item.submittedBy}
                      onChange={(e) => {
                        const newItems = [...editData.items]
                        newItems[index].submittedBy = e.target.value
                        updateField('items', newItems)
                      }}
                    >
                      <option value="原告">原告</option>
                      <option value="被告">被告</option>
                      <option value="第三人">第三人</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">可信度：</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={item.credibilityScore}
                      onChange={(e) => {
                        const newItems = [...editData.items]
                        newItems[index].credibilityScore = parseInt(e.target.value)
                        updateField('items', newItems)
                      }}
                      className="flex-1"
                    />
                    <span className="text-sm">{item.credibilityScore}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.accepted}
                        onChange={(e) => {
                          const newItems = [...editData.items]
                          newItems[index].accepted = e.target.checked
                          updateField('items', newItems)
                        }}
                      />
                      <span className="text-sm">法院采纳</span>
                    </label>
                    <Button
                      size="sm"
                      onClick={() => setEditingField(null)}
                    >
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer hover:bg-muted/80"
                  onClick={() => setEditingField(`evidence-${index}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.name || '未命名证据'}</span>
                    <Badge variant={item.accepted ? 'default' : 'destructive'}>
                      {item.accepted ? '采纳' : '不采纳'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{item.type}</span>
                    <span>提交方：{item.submittedBy}</span>
                    <span>可信度：{item.credibilityScore}%</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderReasoningEditor = () => (
    <div className="space-y-4">
      {/* 裁判理由摘要 */}
      <div>
        <label className="text-sm font-medium mb-1 block">裁判理由</label>
        {editingField === 'summary' ? (
          <div className="flex gap-2">
            <textarea
              className="flex-1 min-h-[100px] px-3 py-2 text-sm border rounded-md"
              value={editData.summary || ''}
              onChange={(e) => updateField('summary', e.target.value)}
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingField(null)}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className="p-3 bg-muted rounded-md text-sm cursor-pointer hover:bg-muted/80"
            onClick={() => setEditingField('summary')}
          >
            {editData.summary || '点击添加理由'}
          </div>
        )}
      </div>

      {/* 法律依据 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">法律依据</label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const newBasis = [...(editData.legalBasis || []), {
                law: '',
                article: '',
                application: ''
              }]
              updateField('legalBasis', newBasis)
              setEditingField(`legal-${newBasis.length - 1}`)
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {editData.legalBasis?.map((item: any, index: number) => (
            <div key={index} className="p-3 bg-muted rounded-md">
              {editingField === `legal-${index}` ? (
                <div className="space-y-2">
                  <input
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="法律名称"
                    value={item.law}
                    onChange={(e) => {
                      const newBasis = [...editData.legalBasis]
                      newBasis[index].law = e.target.value
                      updateField('legalBasis', newBasis)
                    }}
                  />
                  <input
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="条文"
                    value={item.article}
                    onChange={(e) => {
                      const newBasis = [...editData.legalBasis]
                      newBasis[index].article = e.target.value
                      updateField('legalBasis', newBasis)
                    }}
                  />
                  <textarea
                    className="w-full px-3 py-2 text-sm border rounded-md"
                    placeholder="如何应用"
                    value={item.application}
                    onChange={(e) => {
                      const newBasis = [...editData.legalBasis]
                      newBasis[index].application = e.target.value
                      updateField('legalBasis', newBasis)
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => setEditingField(null)}
                  >
                    保存
                  </Button>
                </div>
              ) : (
                <div
                  className="cursor-pointer hover:bg-muted/80"
                  onClick={() => setEditingField(`legal-${index}`)}
                >
                  <div className="font-medium text-sm">{item.law || '未设置法律'}</div>
                  <div className="text-sm text-muted-foreground">{item.article || '未设置条文'}</div>
                  <div className="text-sm text-muted-foreground mt-1">{item.application || '未设置应用说明'}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 判决结果 */}
      <div>
        <label className="text-sm font-medium mb-1 block">判决结果</label>
        {editingField === 'judgment' ? (
          <div className="flex gap-2">
            <textarea
              className="flex-1 min-h-[80px] px-3 py-2 text-sm border rounded-md"
              value={editData.judgment || ''}
              onChange={(e) => updateField('judgment', e.target.value)}
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingField(null)}
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            className="p-3 bg-muted rounded-md text-sm cursor-pointer hover:bg-muted/80"
            onClick={() => setEditingField('judgment')}
          >
            {editData.judgment || '点击添加判决结果'}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSave}
                >
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                >
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {elementType === 'facts' && renderFactsEditor()}
        {elementType === 'evidence' && renderEvidenceEditor()}
        {elementType === 'reasoning' && renderReasoningEditor()}
      </CardContent>
    </Card>
  )
}