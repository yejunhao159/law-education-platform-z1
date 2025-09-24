/**
 * 案例选择器组件
 * @description 选择法学案例进行苏格拉底式讨论
 * 简化版：移除难度选择，专注案例内容
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExampleCase {
  id: string
  title: string
  description: string
  category: string
  estimatedTime: number
}

interface ExampleSelectorProps {
  className?: string
  selectedExample?: string
  onExampleSelect?: (exampleId: string) => void
  examples?: ExampleCase[]
}

const defaultExamples: ExampleCase[] = [
  {
    id: 'contract-breach',
    title: '合同违约案例',
    description: '探讨合同违约的构成要件和法律后果',
    category: '合同法',
    estimatedTime: 30
  },
  {
    id: 'tort-liability',
    title: '侵权责任案例',
    description: '分析侵权行为的认定和赔偿标准',
    category: '侵权法',
    estimatedTime: 45
  },
  {
    id: 'criminal-defense',
    title: '刑事辩护案例',
    description: '研究刑事案件的辩护策略和程序问题',
    category: '刑法',
    estimatedTime: 60
  },
  {
    id: 'property-dispute',
    title: '物权纠纷案例',
    description: '解析物权的保护方式和救济途径',
    category: '物权法',
    estimatedTime: 40
  },
  {
    id: 'administrative-law',
    title: '行政法案例',
    description: '分析行政行为的合法性和救济机制',
    category: '行政法',
    estimatedTime: 50
  }
]

const getCategoryColor = (category: string) => {
  switch (category) {
    case '合同法': return 'bg-blue-100 text-blue-800'
    case '侵权法': return 'bg-red-100 text-red-800'
    case '刑法': return 'bg-orange-100 text-orange-800'
    case '物权法': return 'bg-green-100 text-green-800'
    case '行政法': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function ExampleSelector({
  className,
  selectedExample,
  onExampleSelect,
  examples = defaultExamples
}: ExampleSelectorProps) {
  const selectedExampleData = examples.find(ex => ex.id === selectedExample)

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          选择案例
        </CardTitle>
        <p className="text-sm text-gray-600">
          选择一个法学案例开始苏格拉底式教学对话
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Select value={selectedExample} onValueChange={onExampleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="请选择一个案例..." />
          </SelectTrigger>
          <SelectContent>
            {examples.map((example) => (
              <SelectItem key={example.id} value={example.id}>
                <div className="flex items-center gap-2">
                  <span>{example.title}</span>
                  <Badge className={getCategoryColor(example.category)}>
                    {example.category}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedExampleData && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">{selectedExampleData.title}</h3>
              <div className="flex gap-2">
                <Badge className={getCategoryColor(selectedExampleData.category)}>
                  {selectedExampleData.category}
                </Badge>
                <Badge variant="outline">
                  约 {selectedExampleData.estimatedTime} 分钟
                </Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600">{selectedExampleData.description}</p>
          </div>
        )}

        {!selectedExample && (
          <div className="text-center text-gray-500 py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>请选择一个案例开始学习</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}