'use client'

import React, { useState } from 'react'
import { InteractiveTimeline } from '@/components/acts/InteractiveTimeline'
import { TimelineNodeDetail } from '@/components/acts/TimelineNodeDetail'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import type { TimelineAnalysis, ViewPerspective } from '@/types/legal-case'

interface TestTimelineEvent {
  id: string
  date: string
  title: string
  description: string
  type: 'fact' | 'procedure' | 'evidence' | 'decision'
  importance: 'high' | 'medium' | 'low'
  actor?: string
  isKeyLearningNode?: boolean
}

// 测试数据
const mockEvents: TestTimelineEvent[] = [
  {
    id: 'event-1',
    date: '2023-01-15',
    title: '签订借款合同',
    description: '原告与被告签订借款合同，约定借款金额100万元，年利率8%，借款期限1年',
    importance: 'high',
    actor: '原告、被告',
    isKeyLearningNode: true,
    type: 'fact'
  },
  {
    id: 'event-2',
    date: '2023-02-01',
    title: '支付借款',
    description: '原告按照合同约定，向被告账户转账100万元',
    importance: 'medium',
    actor: '原告',
    isKeyLearningNode: true,
    type: 'fact'
  },
  {
    id: 'event-3',
    date: '2024-02-01',
    title: '到期未还款',
    description: '借款期限届满，被告未按约定归还本金和利息',
    importance: 'high',
    actor: '被告',
    isKeyLearningNode: true,
    type: 'fact'
  },
  {
    id: 'event-4',
    date: '2024-03-15',
    title: '起诉立案',
    description: '原告向法院提起诉讼，要求被告归还借款本金及利息',
    importance: 'medium',
    actor: '原告',
    isKeyLearningNode: true,
    type: 'procedure'
  },
  {
    id: 'event-5',
    date: '2024-05-20',
    title: '法院判决',
    description: '法院判决被告归还借款本金100万元及利息8万元',
    importance: 'high',
    actor: '法院',
    isKeyLearningNode: true,
    type: 'decision'
  }
]

const mockAnalysis: TimelineAnalysis = {
  importance: {
    score: 95,
    level: 'critical',
    reason: '该事件是案件的核心争议点，直接影响判决结果'
  },
  legalAnalysis: {
    legalRelation: '债权债务关系',
    applicableLaws: ['《民法典》第667条', '《民法典》第676条'],
    legalPrinciples: ['合同必须履行原则', '诚实信用原则'],
    burdenOfProof: '原告承担借款事实的举证责任',
    keyTerms: [
      { term: '借款合同', definition: '借款人向贷款人借款，到期返还借款并支付利息的合同' },
      { term: '诉讼时效', definition: '权利人请求人民法院保护民事权利的法定期间' }
    ],
    partyPositions: {
      plaintiff: '原告主张已按约定支付借款，被告应归还本金和利息',
      defendant: '被告辩称借款用于公司经营，因经营困难暂时无力偿还'
    }
  },
  perspectiveAnalysis: {
    perspective: 'neutral',
    focusPoints: ['合同的有效性', '借款事实的认定', '利息计算标准'],
    strategicOptions: ['调解协商', '申请财产保全', '强制执行'],
    riskAssessment: '被告可能存在转移财产风险，建议尽快采取保全措施'
  },
  relatedEvidence: [
    {
      name: '借款合同',
      type: '书证',
      description: '双方签订的借款合同原件',
      probativeValue: '高',
      credibility: '高'
    },
    {
      name: '转账记录',
      type: '电子证据',
      description: '原告向被告转账100万元的银行流水',
      probativeValue: '高',
      credibility: '高'
    }
  ]
}

export default function TestTimelinePage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [perspective, setPerspective] = useState<ViewPerspective>('neutral')
  const [teachingMode, setTeachingMode] = useState(false)
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const [analysisLoading, setAnalysisLoading] = useState<Map<string, boolean>>(new Map())
  const [eventAnalyses, setEventAnalyses] = useState<Map<string, TimelineAnalysis>>(new Map())
  
  // 使用Zustand store的新方法
  const {
    timelinePerspective,
    setTimelinePerspective,
    selectedTimelineNode,
    setSelectedTimelineNode,
    teachingModeEnabled,
    toggleTeachingMode,
    completedLearningNodes,
    markLearningNodeComplete
  } = useCaseStore()
  
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(selectedNodeId === nodeId ? null : nodeId)
    setSelectedTimelineNode(selectedNodeId === nodeId ? null : nodeId)
  }
  
  const handleAnalyzeEvent = (event: TestTimelineEvent) => {
    // 模拟AI分析
    setAnalysisLoading(prev => new Map(prev).set(event.id, true))
    
    setTimeout(() => {
      setEventAnalyses(prev => new Map(prev).set(`${event.id}-${perspective}`, mockAnalysis))
      setAnalysisLoading(prev => {
        const newMap = new Map(prev)
        newMap.delete(event.id)
        return newMap
      })
    }, 1000)
  }
  
  const selectedEvent = mockEvents.find(e => e.id === selectedNodeId)
  const selectedAnalysis = selectedNodeId ? eventAnalyses.get(`${selectedNodeId}-${perspective}`) : undefined
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">互动式时间轴组件测试</h1>
        
        {/* 控制面板 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">视角选择：</span>
            <div className="flex gap-1">
              {(['neutral', 'plaintiff', 'defendant', 'judge'] as const).map(p => (
                <Button
                  key={p}
                  variant={perspective === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPerspective(p)
                    setTimelinePerspective(p)
                  }}
                >
                  {p === 'neutral' ? '中性' :
                   p === 'plaintiff' ? '原告' :
                   p === 'defendant' ? '被告' : '法官'}
                </Button>
              ))}
            </div>
          </div>
          
          <Button
            variant={teachingMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setTeachingMode(!teachingMode)
              toggleTeachingMode()
            }}
          >
            教学模式: {teachingMode ? '开启' : '关闭'}
          </Button>
          
          <Badge variant="secondary">
            已完成节点: {completedNodes.size}/{mockEvents.length}
          </Badge>
        </div>
        
        {/* 时间轴组件 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">时间轴</h3>
            <InteractiveTimeline
              events={mockEvents}
              selectedNodeId={selectedNodeId}
              onNodeClick={handleNodeClick}
              onAnalyzeEvent={handleAnalyzeEvent}
              perspective={perspective}
              teachingMode={teachingMode}
              completedNodes={completedNodes}
              analysisLoading={analysisLoading}
              eventAnalyses={eventAnalyses}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">节点详情</h3>
            {selectedEvent ? (
              <TimelineNodeDetail
                event={selectedEvent}
                analysis={selectedAnalysis}
                perspective={perspective}
                teachingMode={teachingMode}
                onClose={() => {
                  setSelectedNodeId(null)
                  setSelectedTimelineNode(null)
                }}
              />
            ) : (
              <Card className="p-8 text-center text-gray-500">
                <p>请点击左侧时间轴节点查看详情</p>
              </Card>
            )}
          </div>
        </div>
      </Card>
      
      {/* 状态监控面板 */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-2">Zustand Store 状态监控</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">当前视角：</span>
            <Badge className="ml-2">{timelinePerspective}</Badge>
          </div>
          <div>
            <span className="text-gray-500">选中节点：</span>
            <Badge className="ml-2">{selectedTimelineNode || '无'}</Badge>
          </div>
          <div>
            <span className="text-gray-500">教学模式：</span>
            <Badge className="ml-2">{teachingModeEnabled ? '开启' : '关闭'}</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}