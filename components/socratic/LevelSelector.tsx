/**
 * 层级选择器组件
 * @description 选择苏格拉底式对话的难度层级
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Brain, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type DialogueLevel = 'level1' | 'level2' | 'level3' | 'level4' | 'level5'

interface LevelConfig {
  id: DialogueLevel
  name: string
  description: string
  complexity: number
  estimatedTime: number
  skills: string[]
}

interface LevelSelectorProps {
  className?: string
  selectedLevel?: DialogueLevel
  onLevelSelect?: (level: DialogueLevel) => void
}

const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 'level1',
    name: '基础认知',
    description: '理解基本法律概念和定义',
    complexity: 1,
    estimatedTime: 15,
    skills: ['概念理解', '基础记忆']
  },
  {
    id: 'level2',
    name: '理解应用',
    description: '将法律概念应用到具体情境',
    complexity: 2,
    estimatedTime: 20,
    skills: ['概念应用', '情境分析']
  },
  {
    id: 'level3',
    name: '分析综合',
    description: '分析法律问题的各个要素和关系',
    complexity: 3,
    estimatedTime: 30,
    skills: ['逻辑分析', '要素识别']
  },
  {
    id: 'level4',
    name: '批判评价',
    description: '评价不同法律观点和论证的合理性',
    complexity: 4,
    estimatedTime: 40,
    skills: ['批判思维', '论证评价']
  },
  {
    id: 'level5',
    name: '创新创造',
    description: '提出新的法律解决方案和观点',
    complexity: 5,
    estimatedTime: 50,
    skills: ['创新思维', '方案设计']
  }
]

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  className,
  selectedLevel,
  onLevelSelect
}) => {
  const getComplexityColor = (complexity: number) => {
    const colors = [
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-yellow-100 text-yellow-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800'
    ]
    return colors[complexity - 1] || 'bg-gray-100 text-gray-800'
  }

  const selectedLevelData = LEVEL_CONFIGS.find(level => level.id === selectedLevel)

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>选择层级</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedLevel} onValueChange={onLevelSelect}>
          <SelectTrigger>
            <SelectValue placeholder="请选择对话层级..." />
          </SelectTrigger>
          <SelectContent>
            {LEVEL_CONFIGS.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{level.name}</span>
                  <Badge className={getComplexityColor(level.complexity)}>
                    Level {level.complexity}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedLevelData && (
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{selectedLevelData.name}</h4>
              <div className="flex items-center space-x-2">
                <Badge className={getComplexityColor(selectedLevelData.complexity)}>
                  Level {selectedLevelData.complexity}
                </Badge>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{selectedLevelData.estimatedTime}min</span>
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {selectedLevelData.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedLevelData.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}