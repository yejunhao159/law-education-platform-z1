/**
 * 案例选择器组件
 * @description 选择法学案例进行苏格拉底式讨论
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
  difficulty: 'beginner' | 'intermediate' | 'advanced'
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
    difficulty: 'beginner',
    category: '合同法',
    estimatedTime: 30
  },
  {
    id: 'tort-liability',
    title: '侵权责任案例',
    description: '分析侵权行为的认定和赔偿标准',
    difficulty: 'intermediate',
    category: '侵权法',
    estimatedTime: 45
  },
  {
    id: 'criminal-defense',
    title: '刑事辩护案例',
    description: '研究刑事案件中的辩护策略和程序',
    difficulty: 'advanced',
    category: '刑法',
    estimatedTime: 60
  }
]

export const ExampleSelector: React.FC<ExampleSelectorProps> = ({
  className,
  selectedExample,
  onExampleSelect,
  examples = defaultExamples
}) => {
  // 确保examples是数组
  const safeExamples = Array.isArray(examples) ? examples : defaultExamples
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '初级'
      case 'intermediate':
        return '中级'
      case 'advanced':
        return '高级'
      default:
        return '未知'
    }
  }

  const selectedExampleData = safeExamples.find(ex => ex.id === selectedExample)

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5" />
          <span>选择案例</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedExample} onValueChange={onExampleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="请选择一个法学案例..." />
          </SelectTrigger>
          <SelectContent>
            {safeExamples.map((example) => (
              <SelectItem key={example.id} value={example.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{example.title}</span>
                  <Badge className={getDifficultyColor(example.difficulty)}>
                    {getDifficultyText(example.difficulty)}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedExampleData && (
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{selectedExampleData.title}</h4>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{selectedExampleData.category}</Badge>
                <Badge className={getDifficultyColor(selectedExampleData.difficulty)}>
                  {getDifficultyText(selectedExampleData.difficulty)}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {selectedExampleData.description}
            </p>
            <p className="text-xs text-muted-foreground">
              预计时间: {selectedExampleData.estimatedTime} 分钟
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}