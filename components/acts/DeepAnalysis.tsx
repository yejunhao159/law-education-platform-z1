"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCurrentCase } from '@/src/domains/stores'
import { 
  Target, 
  CheckCircle,
  ChevronRight,
  BookOpen,
  Gavel,
  Calendar
} from 'lucide-react'

// 导入现有组件
import { Act2CaseIntro } from './Act2CaseIntro'

// 导入新的智能分析组件（基于三要素数据）
import { DisputeFocusFromThreeElements } from '@/components/dispute/DisputeFocusFromThreeElements'
import { EvidenceQualityFromThreeElements } from '@/components/evidence/EvidenceQualityFromThreeElements'

interface DeepAnalysisProps {
  onComplete?: () => void
}

export default function DeepAnalysis({ onComplete }: DeepAnalysisProps) {
  const caseData = useCurrentCase()
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [activeView, setActiveView] = useState<'classic' | 'intelligent'>('classic')

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">深度案例分析</h2>
        <p className="text-gray-600">理解案件核心要素，为讨论奠定基础</p>
      </div>

      {/* 视图切换按钮 */}
      <div className="flex justify-center gap-2 mb-6">
        <Button
          variant={activeView === 'classic' ? 'default' : 'outline'}
          onClick={() => setActiveView('classic')}
          className="gap-2"
        >
          <BookOpen className="w-4 h-4" />
          经典分析
        </Button>
        <Button
          variant={activeView === 'intelligent' ? 'default' : 'outline'}
          onClick={() => setActiveView('intelligent')}
          className="gap-2"
        >
          <Target className="w-4 h-4" />
          智能分析
        </Button>
      </div>

      {/* 根据选择显示不同视图 */}
      {activeView === 'classic' ? (
        /* 经典分析视图 */
        <div className="space-y-6">
        
        {/* 案件概况卡片 */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">案件概况</h3>
          </div>
          <Act2CaseIntro />
        </Card>


        {/* 时间轴分析提示 */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">请求权时间轴分析</h3>
          </div>
          <p className="text-blue-800 text-sm">
            请回到第二幕"案件概况"查看完整的时间轴分析功能，包括AI智能分析、多视角切换等功能。
          </p>
        </Card>

        {/* 法官说理要点 - 简化展示 */}
        {caseData?.threeElements?.reasoning && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Gavel className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">裁判要点</h3>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {caseData.threeElements.reasoning.summary}
              </p>
            </div>
          </Card>
        )}
        </div>
      ) : (
        /* 智能分析视图 - 使用基于三要素数据的组件 */
        <div className="space-y-6">
          {/* 争议焦点智能分析（从三要素数据提取） */}
          <DisputeFocusFromThreeElements />
          
          {/* 证据质量评估系统（从三要素数据评估） */}
          <EvidenceQualityFromThreeElements />
        </div>
      )}

      {/* 完成按钮 */}
      <div className="text-center pt-4">
        {!analysisComplete ? (
          <Button 
            size="lg" 
            onClick={() => setAnalysisComplete(true)}
            className="gap-2"
          >
            完成案例分析
            <CheckCircle className="w-5 h-5" />
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">分析完成，可以进入苏格拉底讨论</span>
            </div>
            <div>
              <Button size="lg" onClick={onComplete} className="gap-2">
                进入苏格拉底讨论
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}