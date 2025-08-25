'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCaseStore, useCaseData } from '@/lib/stores/useCaseStore'
import { Save, X, Edit2, Plus, Trash2 } from 'lucide-react'
import type { LegalCase } from '@/types/legal-case'

export function QuickEdit() {
  const caseData = useCaseData()
  const { setCaseData } = useCaseStore()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempData, setTempData] = useState<LegalCase | null>(null)

  if (!caseData) {
    return null
  }

  const startEdit = (field: string) => {
    setEditingField(field)
    setTempData(JSON.parse(JSON.stringify(caseData))) // Deep clone
  }

  const cancelEdit = () => {
    setEditingField(null)
    setTempData(null)
  }

  const saveEdit = () => {
    if (tempData) {
      setCaseData(tempData)
      setEditingField(null)
      setTempData(null)
    }
  }

  const updateField = (path: string[], value: any) => {
    if (!tempData) return
    
    const newData = { ...tempData }
    let current: any = newData
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    current[path[path.length - 1]] = value
    
    setTempData(newData)
  }

  const addToArray = (path: string[], item: any) => {
    if (!tempData) return
    
    const newData = { ...tempData }
    let current: any = newData
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    const array = current[path[path.length - 1]]
    if (Array.isArray(array)) {
      array.push(item)
      setTempData(newData)
    }
  }

  const removeFromArray = (path: string[], index: number) => {
    if (!tempData) return
    
    const newData = { ...tempData }
    let current: any = newData
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    const array = current[path[path.length - 1]]
    if (Array.isArray(array)) {
      array.splice(index, 1)
      setTempData(newData)
    }
  }

  const data = tempData || caseData

  return (
    <div className="space-y-6">
      {/* 基本信息编辑 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">基本信息</CardTitle>
            {editingField === 'basicInfo' ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
                <Button size="sm" onClick={saveEdit}>
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => startEdit('basicInfo')}>
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>案号</Label>
              <Input
                value={data.basicInfo.caseNumber}
                onChange={(e) => updateField(['basicInfo', 'caseNumber'], e.target.value)}
                disabled={editingField !== 'basicInfo'}
              />
            </div>
            <div>
              <Label>法院</Label>
              <Input
                value={data.basicInfo.court}
                onChange={(e) => updateField(['basicInfo', 'court'], e.target.value)}
                disabled={editingField !== 'basicInfo'}
              />
            </div>
            <div className="col-span-2">
              <Label>判决日期</Label>
              <Input
                value={data.basicInfo.date}
                onChange={(e) => updateField(['basicInfo', 'date'], e.target.value)}
                disabled={editingField !== 'basicInfo'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 事实摘要编辑 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">事实摘要</CardTitle>
            {editingField === 'facts' ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
                <Button size="sm" onClick={saveEdit}>
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => startEdit('facts')}>
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>事实概述</Label>
            <Textarea
              value={data.threeElements.facts.summary}
              onChange={(e) => updateField(['threeElements', 'facts', 'summary'], e.target.value)}
              disabled={editingField !== 'facts'}
              rows={4}
            />
          </div>
          
          {/* 关键事实 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>关键事实</Label>
              {editingField === 'facts' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToArray(['threeElements', 'facts', 'keyFacts'], '新的关键事实')}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {data.threeElements.facts.keyFacts.map((fact, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={fact}
                    onChange={(e) => {
                      const newFacts = [...data.threeElements.facts.keyFacts]
                      newFacts[idx] = e.target.value
                      updateField(['threeElements', 'facts', 'keyFacts'], newFacts)
                    }}
                    disabled={editingField !== 'facts'}
                  />
                  {editingField === 'facts' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromArray(['threeElements', 'facts', 'keyFacts'], idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 争议事实 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>争议事实</Label>
              {editingField === 'facts' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToArray(['threeElements', 'facts', 'disputedFacts'], '新的争议事实')}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {data.threeElements.facts.disputedFacts.map((fact, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={fact}
                    onChange={(e) => {
                      const newFacts = [...data.threeElements.facts.disputedFacts]
                      newFacts[idx] = e.target.value
                      updateField(['threeElements', 'facts', 'disputedFacts'], newFacts)
                    }}
                    disabled={editingField !== 'facts'}
                  />
                  {editingField === 'facts' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromArray(['threeElements', 'facts', 'disputedFacts'], idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 判决结果编辑 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">判决结果</CardTitle>
            {editingField === 'judgment' ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
                <Button size="sm" onClick={saveEdit}>
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => startEdit('judgment')}>
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.threeElements.reasoning.judgment}
            onChange={(e) => updateField(['threeElements', 'reasoning', 'judgment'], e.target.value)}
            disabled={editingField !== 'judgment'}
            rows={3}
            placeholder="输入判决结果..."
          />
        </CardContent>
      </Card>

      {/* 保存提示 */}
      {editingField && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
          <p className="text-sm text-gray-600 mb-2">正在编辑：{editingField}</p>
          <p className="text-xs text-gray-500">记得保存您的更改</p>
        </div>
      )}
    </div>
  )
}