"use client"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy } from 'lucide-react'
import { useCurrentCase } from '@/src/domains/stores'

export default function Act6JudgmentSummary() {
  const caseData = useCurrentCase()

  const mockCase = {
    title: caseData?.basicInfo?.caseNumber || "张某诉李某房屋买卖合同纠纷案",
    caseNumber: caseData?.basicInfo?.caseNumber || "（2023）京0108民初12345号",
    court: caseData?.basicInfo?.court || "北京市海淀区人民法院",
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">判决分析总结</h2>
        <p className="text-gray-600">分析裁判理由和法律适用</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="p-8 bg-white border border-gray-300">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">{mockCase.title}</h3>
            <p className="text-gray-600">{mockCase.caseNumber}</p>
            <p className="text-gray-600">{mockCase.court}</p>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-800 mb-2">裁判要旨</h4>
              <p className="text-gray-700 leading-relaxed">
                {caseData?.threeElements?.reasoning?.summary || 
                  "房价正常波动不构成情势变更。当事人应当按照合同约定全面履行义务，不得以房价上涨为由拒绝履行。"
                }
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-2">法律适用</h4>
              <p className="text-gray-700 leading-relaxed">
                {caseData?.threeElements?.reasoning?.legalBasis?.join('、') || 
                  "依据《民法典》第509条、第533条的规定，结合本案具体情况，判决被告继续履行合同义务。"
                }
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-2">学习要点</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>情势变更制度的适用条件</li>
                <li>合同履行中的风险承担原则</li>
                <li>房屋买卖合同的特殊性</li>
                <li>诚实信用原则在合同履行中的体现</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-2">思考与讨论</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700">
                  通过本案的学习，思考以下问题：
                </p>
                <ol className="list-decimal list-inside text-gray-700 mt-2 space-y-1 ml-4">
                  <li>如何界定"不可预见"的标准？</li>
                  <li>商业风险与情势变更的区别是什么？</li>
                  <li>法律如何平衡合同自由与交易安全？</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Trophy className="w-4 h-4 mr-2" />
              完成学习
            </Button>
          </div>
        </Card>

        <Card className="mt-6 p-6 bg-green-50 border border-green-200">
          <h4 className="font-bold text-green-800 mb-2">学习成就</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">100%</div>
              <div className="text-sm text-gray-600">完成度</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">7</div>
              <div className="text-sm text-gray-600">学习环节</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">A+</div>
              <div className="text-sm text-gray-600">综合评价</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}