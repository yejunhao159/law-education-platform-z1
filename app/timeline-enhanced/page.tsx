'use client'

import React, { useEffect } from 'react'
import { CaseTimelineEnhanced } from '@/components/acts/CaseTimelineEnhanced'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import { CheckCircle, Layers, Filter, Grid3x3, Minimize2 } from 'lucide-react'

// 增强的测试数据 - 包含更多事件以测试长时间轴
const enhancedCaseData = {
  basicInfo: {
    court: '北京市朝阳区人民法院',
    caseNumber: '(2024)京0105民初12345号',
    caseType: '民间借贷纠纷',
    filingDate: '2024-03-15',
    judgmentDate: '2024-05-20'
  },
  threeElements: {
    facts: {
      timeline: [
        // 诉前阶段事件
        {
          date: '2023-01-15',
          event: '签订借款合同',
          detail: '原告张某与被告李某签订《个人借款合同》，约定借款金额100万元，期限12个月，年利率8%',
          isKeyEvent: true,
          party: '张某、李某'
        },
        {
          date: '2023-01-20',
          event: '办理公证',
          detail: '双方前往公证处对借款合同进行公证',
          isKeyEvent: false,
          party: '张某、李某'
        },
        {
          date: '2023-02-01',
          event: '支付借款',
          detail: '原告通过银行转账100万元至被告账户',
          isKeyEvent: true,
          party: '张某'
        },
        {
          date: '2023-03-01',
          event: '支付第一期利息',
          detail: '被告按期支付2月份利息6667元',
          isKeyEvent: false,
          party: '李某'
        },
        {
          date: '2023-04-01',
          event: '支付第二期利息',
          detail: '被告按期支付3月份利息6667元',
          isKeyEvent: false,
          party: '李某'
        },
        {
          date: '2023-05-01',
          event: '支付第三期利息',
          detail: '被告按期支付4月份利息6667元',
          isKeyEvent: false,
          party: '李某'
        },
        {
          date: '2023-06-15',
          event: '停止支付利息',
          detail: '被告未支付5月份利息，原告多次催讨',
          isKeyEvent: true,
          party: '李某'
        },
        {
          date: '2023-08-01',
          event: '第一次书面催款',
          detail: '原告发送书面催款通知，要求被告履行还款义务',
          isKeyEvent: false,
          party: '张某'
        },
        {
          date: '2023-10-15',
          event: '协商还款方案',
          detail: '双方协商还款事宜，被告承诺分期还款但未履行',
          isKeyEvent: false,
          party: '张某、李某'
        },
        {
          date: '2024-01-15',
          event: '合同到期',
          detail: '借款合同到期，被告未归还本金',
          isKeyEvent: true,
          party: '李某'
        },
        {
          date: '2024-02-01',
          event: '到期未还款',
          detail: '借款期限届满，被告未归还本金100万元及剩余利息',
          isKeyEvent: true,
          party: '李某'
        },
        {
          date: '2024-02-15',
          event: '发送律师函',
          detail: '原告委托律师发送催款律师函，限期10日内还款',
          isKeyEvent: false,
          party: '张某'
        },
        {
          date: '2024-03-01',
          event: '和解失败',
          detail: '被告提出分24期还款方案，原告未接受',
          isKeyEvent: false,
          party: '李某'
        },
        // 诉讼阶段事件
        {
          date: '2024-03-15',
          event: '提起诉讼',
          detail: '原告向法院提起民事诉讼，请求判令被告归还本金及利息',
          isKeyEvent: true,
          party: '张某'
        },
        {
          date: '2024-03-18',
          event: '法院受理',
          detail: '北京市朝阳区人民法院受理案件并发出受理通知书',
          isKeyEvent: false,
          party: '法院'
        },
        {
          date: '2024-03-25',
          event: '送达起诉状',
          detail: '法院向被告送达起诉状副本及应诉通知书',
          isKeyEvent: false,
          party: '法院'
        },
        {
          date: '2024-04-01',
          event: '被告提交答辩状',
          detail: '被告提交答辩状，承认借款事实但请求减少利息',
          isKeyEvent: false,
          party: '李某'
        },
        {
          date: '2024-04-05',
          event: '证据交换',
          detail: '双方进行证据交换，原告提供借款合同、转账记录等证据',
          isKeyEvent: false,
          party: '双方'
        },
        {
          date: '2024-04-10',
          event: '法庭审理',
          detail: '法院公开开庭审理，双方进行举证质证和法庭辩论',
          isKeyEvent: true,
          party: '法院'
        },
        {
          date: '2024-04-15',
          event: '庭后调解',
          detail: '法庭组织双方进行调解，但未达成一致',
          isKeyEvent: false,
          party: '法院'
        },
        {
          date: '2024-05-20',
          event: '作出判决',
          detail: '法院判决被告归还本金100万元及利息，逾期利息按年利率16%计算',
          isKeyEvent: true,
          party: '法院'
        },
        // 判后阶段事件（如果有）
        {
          date: '2024-05-25',
          event: '判决书送达',
          detail: '法院向双方当事人送达判决书',
          isKeyEvent: false,
          party: '法院'
        },
        {
          date: '2024-06-05',
          event: '判决生效',
          detail: '被告未上诉，一审判决生效',
          isKeyEvent: true,
          party: '法院'
        }
      ]
    },
    reasoning: {
      summary: '本院认为，原、被告之间的借贷关系成立且合法有效。被告未按约定归还借款构成违约，应承担违约责任。'
    }
  },
  metadata: {
    confidence: 95
  }
}

export default function TimelineEnhancedPage() {
  const { setCaseData } = useCaseStore()
  
  useEffect(() => {
    // 设置增强的测试数据
    setCaseData(enhancedCaseData as any)
  }, [setCaseData])
  
  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <Card className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">增强版时间轴展示</h1>
          <p className="text-gray-600">
            支持分组、筛选、折叠等高级功能，适合处理包含大量事件的复杂案件
          </p>
          <div className="flex gap-2 mt-4 flex-wrap">
            <Badge variant="outline" className="text-sm">
              <Layers className="w-3 h-3 mr-1" />
              阶段分组
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Filter className="w-3 h-3 mr-1" />
              事件筛选
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Grid3x3 className="w-3 h-3 mr-1" />
              多种视图
            </Badge>
            <Badge variant="outline" className="text-sm">
              <Minimize2 className="w-3 h-3 mr-1" />
              折叠展开
            </Badge>
          </div>
        </div>
        
        {/* 案件信息 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">案号</p>
              <p className="font-semibold">{enhancedCaseData.basicInfo.caseNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">案件类型</p>
              <p className="font-semibold">{enhancedCaseData.basicInfo.caseType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">事件数量</p>
              <p className="font-semibold">{enhancedCaseData.threeElements.facts.timeline.length} 个</p>
            </div>
          </div>
        </div>
        
        {/* 增强版时间轴组件 */}
        <CaseTimelineEnhanced />
        
        {/* 功能说明 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">📊 分组视图</h3>
            <p className="text-sm text-blue-700">
              自动按诉前、诉讼、判后三个阶段分组，每组可独立折叠
            </p>
          </Card>
          
          <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">🔍 智能筛选</h3>
            <p className="text-sm text-green-700">
              支持按事件类型、重要性筛选，快速定位关键信息
            </p>
          </Card>
          
          <Card className="p-4 bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">📐 多种布局</h3>
            <p className="text-sm text-purple-700">
              线性、分组、网格、紧凑四种视图，适应不同查看需求
            </p>
          </Card>
          
          <Card className="p-4 bg-orange-50 border-orange-200">
            <h3 className="font-semibold text-orange-800 mb-2">📈 进度统计</h3>
            <p className="text-sm text-orange-700">
              显示各阶段进度和关键事件统计，把握案件全局
            </p>
          </Card>
        </div>
        
        {/* 使用提示 */}
        <Card className="mt-6 p-4 bg-yellow-50 border-yellow-200">
          <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            使用提示
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• 默认为<strong>分组视图</strong>，清晰展示案件各阶段</li>
            <li>• 点击阶段标题可<strong>折叠/展开</strong>该阶段的所有事件</li>
            <li>• 使用顶部筛选器可快速查看<strong>关键事件</strong></li>
            <li>• <strong>紧凑视图</strong>适合事件特别多的情况，支持分页浏览</li>
            <li>• <strong>网格视图</strong>充分利用宽屏显示器的横向空间</li>
            <li>• 每个事件卡片都支持<strong>点击展开</strong>查看详情和AI分析</li>
          </ul>
        </Card>
      </Card>
    </div>
  )
}