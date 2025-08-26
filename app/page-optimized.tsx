"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useCaseStore, useCurrentAct, useCaseData } from "@/lib/stores/useCaseStore"
import {
  Upload,
  FileText,
  Clock,
  Scale,
  Target,
  Brain,
  Gavel,
  User,
  ChevronRight,
  Loader2,
} from "lucide-react"

// 懒加载各幕组件 - 只有需要时才加载
const ThreeElementsExtractor = lazy(() => 
  import("@/components/ThreeElementsExtractor").then(mod => ({ default: mod.ThreeElementsExtractor }))
)
const Act2CaseIntro = lazy(() => 
  import("@/components/acts/Act2CaseIntro").then(mod => ({ default: mod.Act2CaseIntro }))
)
const Act3FactDetermination = lazy(() => 
  import("@/components/acts/Act3FactDetermination").then(mod => ({ default: mod.Act3FactDetermination }))
)

// 加载组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    <span className="ml-3 text-gray-600">加载中...</span>
  </div>
)

// 幕定义
const sevenActs = [
  { id: "prologue", name: "序幕：案例导入", icon: Upload, description: "判决书上传与解析" },
  { id: "act1", name: "第一幕：要素分析", icon: FileText, description: "事实、法理、推理三要素分解" },
  { id: "act2", name: "第二幕：事实梳理", icon: Clock, description: "案件事实时间线重构" },
  { id: "act3", name: "第三幕：证据审查", icon: Scale, description: "证据效力与证明力分析" },
  { id: "act4", name: "第四幕：争点确定", icon: Target, description: "法律争议焦点识别" },
  { id: "act5", name: "第五幕：法理辨析", icon: Brain, description: "多角色AI对抗辩论" },
  { id: "act6", name: "第六幕：判决分析", icon: Gavel, description: "裁判理由与法律适用" },
]

// Act4-6 组件懒加载
const Act4Component = lazy(() => import("@/components/acts/Act4FocusAnalysis"))
const Act5Component = lazy(() => import("@/components/acts/Act5SocraticDiscussion"))
const Act6Component = lazy(() => import("@/components/acts/Act6JudgmentSummary"))

// 简化的 Acts 1, 4, 5, 6 组件（提取为独立文件更好）
const Act1SimpleView = ({ extractedElements }: any) => (
  <div className="space-y-8">
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">案件要素分析</h2>
      <p className="text-gray-600">按照司法三段论结构分解案件</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* 简化的要素卡片展示 */}
      {Object.entries(extractedElements?.data?.threeElements || {}).map(([key, element]: [string, any]) => (
        <Card key={key} className="p-6">
          <h3 className="text-xl font-bold mb-4">
            {key === 'facts' ? '事实认定' : key === 'evidence' ? '证据质证' : '法官说理'}
          </h3>
          <p className="text-sm text-gray-600">{element.summary || '暂无内容'}</p>
        </Card>
      ))}
    </div>
  </div>
)

export default function OptimizedLawTeachingSystem() {
  const currentActId = useCurrentAct()
  const caseData = useCaseData()
  const { setCurrentAct } = useCaseStore()
  
  const actIdToIndex: Record<string, number> = {
    'prologue': 0,
    'act1': 1,
    'act2': 2,
    'act3': 3,
    'act4': 4,
    'act5': 5,
    'act6': 6
  }
  const currentAct = actIdToIndex[currentActId] || 0
  
  const [extractedElements, setExtractedElements] = useState<any>(null)
  
  useEffect(() => {
    if (caseData) {
      setExtractedElements({
        data: caseData,
        confidence: caseData.metadata?.confidence || 90
      })
    }
  }, [caseData])

  const renderActContent = () => {
    const act = sevenActs[currentAct]

    // 使用错误边界包裹每个幕的内容
    return (
      <ErrorBoundary
        fallback={
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-bold mb-2">加载失败</h3>
            <p className="text-gray-600 mb-4">无法加载{act.name}的内容</p>
            <Button onClick={() => window.location.reload()}>刷新页面</Button>
          </Card>
        }
      >
        <Suspense fallback={<LoadingSpinner />}>
          {(() => {
            switch (act.id) {
              case "prologue":
                return (
                  <div className="space-y-8">
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-gray-800 mb-4">判决书智能解析与三要素提取</h2>
                      <p className="text-gray-600 text-lg">上传判决书文件，AI将自动提取核心要素</p>
                    </div>
                    <div className="max-w-5xl mx-auto">
                      <ThreeElementsExtractor />
                    </div>
                  </div>
                )
              case "act1":
                return <Act1SimpleView extractedElements={extractedElements} />
              case "act2":
                return <Act2CaseIntro />
              case "act3":
                return <Act3FactDetermination />
              case "act4":
                return <Act4Component />
              case "act5":
                return <Act5Component />
              case "act6":
                return <Act6Component />
              default:
                return null
            }
          })()}
        </Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">法学AI教学系统</h1>
              <p className="text-sm text-gray-600">基于苏力教授教学理念设计</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">教学模式</Badge>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {sevenActs.map((act, index) => (
              <div
                key={act.id}
                className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                  index === currentAct
                    ? "bg-blue-100 text-blue-800"
                    : index < currentAct
                      ? "bg-green-100 text-green-800"
                      : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setCurrentAct(sevenActs[index].id)}
              >
                <act.icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden lg:block">{act.name}</span>
                <span className="text-sm font-medium lg:hidden">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorBoundary>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              {renderActContent()}
            </div>
          </ErrorBoundary>

          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    const prevIndex = Math.max(currentAct - 1, 0)
                    setCurrentAct(sevenActs[prevIndex].id)
                  }}
                  variant="outline"
                  disabled={currentAct === 0}
                >
                  上一步
                </Button>
                <Button
                  onClick={() => {
                    const nextIndex = Math.min(currentAct + 1, sevenActs.length - 1)
                    setCurrentAct(sevenActs[nextIndex].id)
                  }}
                  disabled={currentAct >= sevenActs.length - 1}
                >
                  下一步
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <span className="text-sm text-gray-600">{sevenActs[currentAct].description}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}