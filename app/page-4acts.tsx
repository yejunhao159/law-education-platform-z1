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
  Brain,
  MessageCircle,
  Gavel,
  User,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileSearch,
  Scale,
  Target,
} from "lucide-react"

// 懒加载各幕组件
const ThreeElementsExtractor = lazy(() => 
  import("@/components/ThreeElementsExtractor").then(mod => ({ default: mod.ThreeElementsExtractor }))
)
const DeepAnalysis = lazy(() => 
  import("@/components/acts/DeepAnalysis").then(mod => ({ default: mod.default }))
)
const Act5SocraticDiscussion = lazy(() => 
  import("@/components/acts/Act5SocraticDiscussion").then(mod => ({ default: mod.default }))
)
const Act6JudgmentSummary = lazy(() => 
  import("@/components/acts/Act6JudgmentSummary").then(mod => ({ default: mod.default }))
)

// 加载组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    <span className="ml-3 text-gray-600">加载中...</span>
  </div>
)

// 4幕定义
const fourActs = [
  { 
    id: "upload", 
    name: "案例导入", 
    icon: Upload, 
    description: "上传判决书并智能解析",
    progress: 25
  },
  { 
    id: "analysis", 
    name: "深度分析", 
    icon: Brain, 
    description: "事实认定 • 争点聚焦 • 证据链",
    progress: 50
  },
  { 
    id: "socratic", 
    name: "苏格拉底讨论", 
    icon: MessageCircle, 
    description: "AI引导式深度思辨",
    progress: 75
  },
  { 
    id: "summary", 
    name: "总结提升", 
    icon: Gavel, 
    description: "判决分析 • 学习报告",
    progress: 100
  }
]

export default function FourActsLawTeachingSystem() {
  const currentActId = useCurrentAct()
  const caseData = useCaseData()
  const { setCurrentAct, markActComplete } = useCaseStore()
  
  const actIdToIndex: Record<string, number> = {
    'upload': 0,
    'analysis': 1,
    'socratic': 2,
    'summary': 3
  }
  const currentAct = actIdToIndex[currentActId] || 0
  
  const [extractedElements, setExtractedElements] = useState<any>(null)
  const [overallProgress, setOverallProgress] = useState(0)
  
  useEffect(() => {
    if (caseData) {
      setExtractedElements({
        data: caseData,
        confidence: caseData.metadata?.confidence || 90
      })
    }
  }, [caseData])

  useEffect(() => {
    // 更新整体进度
    const progress = fourActs[currentAct]?.progress || 0
    setOverallProgress(progress)
  }, [currentAct])

  const handleActComplete = () => {
    markActComplete(fourActs[currentAct].id)
    if (currentAct < fourActs.length - 1) {
      setCurrentAct(fourActs[currentAct + 1].id)
    }
  }

  const renderActContent = () => {
    const act = fourActs[currentAct]

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
              case "upload":
                return (
                  <div className="space-y-8">
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-gray-800 mb-4">判决书智能解析</h2>
                      <p className="text-gray-600 text-lg">上传判决书文件，AI将自动提取核心要素并开启教学流程</p>
                    </div>
                    <div className="max-w-5xl mx-auto">
                      <ThreeElementsExtractor />
                    </div>
                    {caseData && (
                      <div className="text-center mt-6">
                        <Button size="lg" onClick={handleActComplete}>
                          开始深度分析
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              case "analysis":
                return <DeepAnalysis onComplete={handleActComplete} />
              case "socratic":
                return (
                  <div className="space-y-6">
                    <Act5SocraticDiscussion />
                    <div className="text-center">
                      <Button size="lg" onClick={handleActComplete}>
                        进入总结阶段
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                )
              case "summary":
                return <Act6JudgmentSummary />
              default:
                return null
            }
          })()}
        </Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">法学AI教学系统</h1>
              <p className="text-sm text-gray-600">四步深度学习法 · 基于苏力教授教学理念</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500">整体进度</p>
                <p className="text-lg font-bold text-blue-600">{overallProgress}%</p>
              </div>
              <Progress value={overallProgress} className="w-32 h-2" />
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 精简版导航栏 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {fourActs.map((act, index) => {
              const isActive = index === currentAct
              const isCompleted = index < currentAct
              
              return (
                <div key={act.id} className="flex-1 flex items-center">
                  <div
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all flex-1 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : isCompleted
                          ? "bg-green-50 text-green-700"
                          : "text-gray-400 hover:text-gray-600"
                    }`}
                    onClick={() => {
                      if (isCompleted || isActive) {
                        setCurrentAct(fourActs[index].id)
                      }
                    }}
                  >
                    <div className={`p-2 rounded-full ${
                      isActive ? "bg-blue-100" : isCompleted ? "bg-green-100" : "bg-gray-100"
                    }`}>
                      <act.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{act.name}</p>
                      <p className="text-xs opacity-80">{act.description}</p>
                    </div>
                    {isCompleted && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        ✓ 完成
                      </Badge>
                    )}
                  </div>
                  {index < fourActs.length - 1 && (
                    <ChevronRight className={`w-4 h-4 mx-2 ${
                      isCompleted ? "text-green-500" : "text-gray-300"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {renderActContent()}
          </div>

          {/* 快速导航 */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    const prevIndex = Math.max(currentAct - 1, 0)
                    setCurrentAct(fourActs[prevIndex].id)
                  }}
                  variant="outline"
                  disabled={currentAct === 0}
                >
                  上一步
                </Button>
                <Button
                  onClick={() => {
                    const nextIndex = Math.min(currentAct + 1, fourActs.length - 1)
                    setCurrentAct(fourActs[nextIndex].id)
                  }}
                  disabled={currentAct >= fourActs.length - 1 || !caseData}
                >
                  下一步
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {fourActs.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentAct
                        ? "bg-blue-600 w-8"
                        : index < currentAct
                          ? "bg-green-500"
                          : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}