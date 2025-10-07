'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCaseStore, useCurrentCase } from '@/src/domains/stores'
import {
  BookOpen,
  Users,
  AlertCircle,
  Gavel,
  ChevronRight,
  ChevronLeft,
  Clock
} from 'lucide-react'

const iconMap = {
  BookOpen,
  Users,
  AlertCircle,
  Gavel
}

export function StoryView() {
  const { storyChapters, updateStoryChapter } = useCaseStore()
  const caseData = useCurrentCase()
  const [currentChapter, setCurrentChapter] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  if (!storyChapters.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">正在生成故事章节...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chapter = storyChapters[currentChapter]

  if (!chapter) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">章节不存在</div>
      </Card>
    )
  }

  const Icon = iconMap[chapter.icon as keyof typeof iconMap] || BookOpen

  const handleEdit = () => {
    setEditContent(chapter.content)
    setIsEditing(true)
  }

  const handleSave = () => {
    updateStoryChapter(chapter.id, editContent)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditContent('')
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* 章节导航 */}
      <div className="flex items-center justify-center gap-2">
        {storyChapters.map((ch, idx) => (
          <Button
            key={ch.id}
            variant={idx === currentChapter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentChapter(idx)}
            className="w-32"
          >
            {ch.title}
          </Button>
        ))}
      </div>

      {/* 当前章节内容 */}
      <Card className="relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${chapter.color || 'blue'}-500 to-${chapter.color || 'blue'}-600`}
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${chapter.color || 'blue'}-100`}>
                <Icon className={`w-6 h-6 text-${chapter.color || 'blue'}-600`} />
              </div>
              <div>
                <CardTitle className="text-xl">{chapter.title}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">第 {currentChapter + 1} 章 / 共 {storyChapters.length} 章</p>
              </div>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                编辑内容
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[200px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="编辑章节内容..."
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  取消
                </Button>
                <Button size="sm" onClick={handleSave}>
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {chapter.content}
                </p>
              </div>

              {/* 相关信息展示 */}
              {chapter.id === 'background' && caseData && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    关键时间线
                  </h4>
                  <div className="space-y-2">
                    {caseData.threeElements.facts.timeline.slice(0, 3).map((event, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0">
                          {event.date}
                        </Badge>
                        <p className="text-sm text-gray-600">{event.event}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chapter.id === 'parties' && caseData && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2 text-blue-800">原告方</h4>
                    {caseData.basicInfo.parties.plaintiff.map((p, idx) => (
                      <div key={idx} className="text-sm text-blue-700">
                        {p.name} ({p.type})
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-medium mb-2 text-red-800">被告方</h4>
                    {caseData.basicInfo.parties.defendant.map((p, idx) => (
                      <div key={idx} className="text-sm text-red-700">
                        {p.name} ({p.type})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chapter.id === 'disputes' && caseData && (
                <div className="mt-6 space-y-2">
                  {caseData.threeElements.facts.disputedFacts.map((fact, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-1 shrink-0" />
                      <p className="text-sm text-gray-700">{fact}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 章节切换按钮 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentChapter(Math.max(0, currentChapter - 1))}
          disabled={currentChapter === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          上一章
        </Button>
        <div className="flex gap-1">
          {storyChapters.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentChapter ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={() => setCurrentChapter(Math.min(storyChapters.length - 1, currentChapter + 1))}
          disabled={currentChapter === storyChapters.length - 1}
        >
          下一章
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}