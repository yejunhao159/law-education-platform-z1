"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Target, Brain, FileText, Sparkles, QrCode, Filter } from 'lucide-react'
import { useCurrentCase } from '@/src/domains/stores'

export default function Act4FocusAnalysis() {
  const [activeTab, setActiveTab] = useState('analysis')
  const caseData = useCurrentCase()
  
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">智能争议焦点提取</h2>
        <p className="text-gray-600">AI自动识别核心争议，平衡教学重点与法律焦点</p>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'analysis'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            争议焦点分析
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'questions'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            问题链生成
          </button>
          <button
            onClick={() => setActiveTab('interaction')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'interaction'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            互动参与
          </button>
        </div>

        {activeTab === 'analysis' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                判决书原文
              </h3>
              <div className="h-96 overflow-y-auto text-sm text-gray-700 leading-relaxed">
                <p className="mb-4">
                  {caseData?.content || '加载判决书内容中...'}
                </p>
              </div>
            </div>

            <div className="col-span-2">
              <Card className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-600" />
                  AI智能争议焦点分析
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      focus: "情势变更的适用条件",
                      importance: 95,
                      teachingValue: 90,
                      keywords: ["客观情况变化", "不可预见", "非商业风险"],
                    },
                    {
                      focus: "合同履行义务的性质",
                      importance: 88,
                      teachingValue: 85,
                      keywords: ["全面履行", "根本违约", "继续履行"],
                    },
                    {
                      focus: "房价波动的法律性质",
                      importance: 82,
                      teachingValue: 95,
                      keywords: ["市场风险", "正常波动", "商业判断"],
                    },
                  ].map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800">{item.focus}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            法律重要性: {item.importance}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            教学价值: {item.teachingValue}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      <Progress value={(item.importance + item.teachingValue) / 2} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              分层问题链生成工具
            </h3>
            <div className="space-y-4">
              <p className="text-gray-600">基于争议焦点生成层次化问题链，引导学生深入思考。</p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                生成问题链
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'interaction' && (
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <QrCode className="w-5 h-5 mr-2" />
                学生参与入口
              </h3>
              <div className="text-center space-y-4">
                <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto">
                  <QrCode className="w-12 h-12 text-gray-400" />
                </div>
                <Badge variant="outline">房间号: 2024-A1</Badge>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                AI实时分析
              </h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">24</div>
                  <div className="text-sm text-gray-600">已参与回答</div>
                </div>
                <Progress value={67} className="h-2" />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}