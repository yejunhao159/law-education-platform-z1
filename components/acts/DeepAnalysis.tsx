"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import { 
  Clock, 
  Scale, 
  Target, 
  FileText,
  CheckCircle,
  ChevronRight,
  BookOpen,
  Gavel,
  Calendar
} from 'lucide-react'

// 导入现有组件
import { Act2CaseIntro } from './Act2CaseIntro'
import Act4FocusAnalysis from './Act4FocusAnalysis'
import { EvidenceReview } from './EvidenceReview'
import TimelineAIAnalysis from './TimelineAIAnalysis'

interface DeepAnalysisProps {
  onComplete?: () => void
}

export default function DeepAnalysis({ onComplete }: DeepAnalysisProps) {
  const caseData = useCaseStore(state => state.caseData)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">深度案例分析</h2>
        <p className="text-gray-600">理解案件核心要素，为讨论奠定基础</p>
      </div>

      {/* 统一的分析视图 - 不再使用tabs */}
      <div className="space-y-6">
        
        {/* 案件概况卡片 */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">案件概况</h3>
          </div>
          <Act2CaseIntro />
        </Card>

        {/* 核心争议焦点 - 简化版 */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">争议焦点</h3>
          </div>
          <Act4FocusAnalysis />
        </Card>

        {/* 证据质证 */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">证据质证</h3>
          </div>
          <EvidenceReview />
        </Card>

        {/* 时间轴AI分析 */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">时间轴AI分析</h3>
          </div>
          <TimelineAIAnalysis />
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