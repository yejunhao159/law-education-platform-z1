'use client'

import React, { useEffect } from 'react'
import { CaseTimelineSimplified } from '@/components/acts/CaseTimelineSimplified'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCaseStore } from '@/lib/stores/useCaseStore'

// 模拟案件数据 - 增强版，包含法学要素
const mockCaseData = {
  basicInfo: {
    court: '北京市朝阳区人民法院',
    filingDate: '2024-03-15',
    judgmentDate: '2024-05-20'
  },
  threeElements: {
    facts: {
      timeline: [
        {
          date: '2023-01-15',
          event: '签订借款合同',
          detail: '原告与被告签订借款合同，约定借款金额100万元，年利率8%，借款期限1年。合同明确约定了还款方式和违约责任条款。',
          isKeyEvent: true,
          party: '原告、被告',
          legalAnalysis: {
            legalRelation: '借贷合同关系',
            burdenOfProof: '原告需举证证明借贷关系成立',
            limitation: '1年（至2024-01-15）',
            claims: ['原告主张：合同有效成立', '被告认可：签订了借款合同'],
            keyPoint: '借贷合同的成立与生效'
          }
        },
        {
          date: '2023-02-01',
          event: '支付借款',
          detail: '原告按照合同约定，通过银行转账方式向被告账户转账100万元，有银行流水为证',
          isKeyEvent: false,
          party: '原告',
          legalAnalysis: {
            burdenOfProof: '原告已履行出借义务，有转账记录为证',
            keyPoint: '借款交付事实'
          }
        },
        {
          date: '2023-06-15',
          event: '第一次催款',
          detail: '原告通过电话和短信方式催促被告还款，保留了相关通话录音和短信记录',
          isKeyEvent: false,
          party: '原告',
          legalAnalysis: {
            keyPoint: '债权人行使催告权'
          }
        },
        {
          date: '2024-02-01',
          event: '到期未还款',
          detail: '借款期限届满，被告未按约定归还本金100万元和利息8万元，构成违约',
          isKeyEvent: true,
          party: '被告',
          legalAnalysis: {
            legalRelation: '违约责任关系',
            burdenOfProof: '被告需举证证明已还款或有正当理由',
            keyPoint: '违约事实的认定',
            claims: ['原告主张：被告构成违约', '被告抗辩：因经营困难暂时无力偿还']
          }
        },
        {
          date: '2024-02-15',
          event: '发送律师函',
          detail: '原告委托律师向被告发送律师函，要求被告于10日内归还本金及利息，否则将提起诉讼',
          isKeyEvent: false,
          party: '原告',
          legalAnalysis: {
            limitation: '10天催告期',
            keyPoint: '诉前催告程序'
          }
        },
        {
          date: '2024-03-01',
          event: '提起诉讼',
          detail: '被告未在催告期内还款，原告向法院提起民事诉讼，请求判令被告归还借款本金100万元、利息8万元及逾期利息',
          isKeyEvent: true,
          party: '原告',
          legalAnalysis: {
            legalRelation: '诉讼法律关系',
            claims: ['请求归还本金100万元', '请求支付利息8万元', '请求支付逾期利息'],
            keyPoint: '诉讼请求的确定'
          }
        }
      ]
    }
  }
}

export default function TimelineSimplifiedPage() {
  const setCaseData = useCaseStore(state => state.setCaseData)
  const caseData = useCaseStore(state => state.caseData)
  
  useEffect(() => {
    // 设置模拟数据
    setCaseData(mockCaseData as any)
  }, [setCaseData])
  
  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <Card className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">简化版时间轴展示</h1>
          <p className="text-gray-600">
            优化布局：重要内容在左，时间在右 | 移除了冗余的AI分析和性能监控功能
          </p>
        </div>
        
        {/* 时间轴组件 */}
        <CaseTimelineSimplified />
        
        {/* 特性说明 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">📍 视觉优化</h3>
            <p className="text-sm text-blue-700">
              重要内容在左侧突出显示，时间标记移至右侧，符合从左到右的阅读习惯
            </p>
          </Card>
          
          <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">✨ 功能精简</h3>
            <p className="text-sm text-green-700">
              移除了复杂的AI分析、多视角切换和性能监控，专注于核心时间轴展示
            </p>
          </Card>
          
          <Card className="p-4 bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">🎯 交互简洁</h3>
            <p className="text-sm text-purple-700">
              点击节点展开详情，简单直观的交互设计，无需学习成本
            </p>
          </Card>
        </div>
        
        {/* 对比说明 */}
        <Card className="mt-6 p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-800 mb-3">改进对比</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌ 移除：</span>
              <span className="text-gray-600">
                AI智能分析、原告/被告/法官视角切换、性能监控面板、复杂的教学模式
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅ 优化：</span>
              <span className="text-gray-600">
                时间和内容位置调换、水平时间轴布局、响应式移动端适配、简洁的展开/收起交互
              </span>
            </div>
          </div>
        </Card>
      </Card>
    </div>
  )
}