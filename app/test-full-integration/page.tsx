"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import TimelineAIAnalysis from '@/components/acts/TimelineAIAnalysis'
import { Upload, FileText, Brain } from 'lucide-react'

// 模拟的案件数据
const mockCaseData = {
  "threeElements": {
    "facts": {
      "main": "2023年1月15日，原告张三与被告李四贸易有限公司签订了一份借款合同，约定借款金额为人民币100万元，年利率8%，借款期限为一年。2023年1月20日，张三通过银行转账方式向李四公司支付了借款本金100万元。2024年1月15日借款到期后，李四公司未按约定归还本金和利息。2024年2月10日，张三多次催收未果，遂于2024年3月15日向北京市朝阳区人民法院提起民间借贷纠纷诉讼。",
      "disputed": [
        "是否存在真实的借贷关系",
        "借款合同的效力问题", 
        "利息计算标准及合理性",
        "被告的还款义务及违约责任"
      ]
    },
    "law": {
      "applicable": [
        "《中华人民共和国民法典》第667条",
        "《中华人民共和国民法典》第676条", 
        "《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第25条"
      ]
    },
    "reasoning": {
      "summary": "根据合同法相关规定，原被告之间的借款合同合法有效，被告应当按约履行还款义务。原告提供的银行转账记录能够证明借款事实，被告未能提供有效抗辩理由，应承担相应的违约责任。"
    }
  },
  "timeline": [
    {
      "date": "2023-01-15",
      "title": "签订借款合同",
      "description": "原告张三与被告李四贸易有限公司签订借款合同",
      "type": "contract",
      "importance": "critical"
    },
    {
      "date": "2023-01-20", 
      "title": "支付借款本金",
      "description": "张三通过银行转账向李四公司支付100万元借款",
      "type": "payment",
      "importance": "critical"
    },
    {
      "date": "2024-01-15",
      "title": "借款到期",
      "description": "合同约定的还款期限届满",
      "type": "deadline", 
      "importance": "critical"
    },
    {
      "date": "2024-02-10",
      "title": "催收通知",
      "description": "张三多次催收，李四公司未响应",
      "type": "notice",
      "importance": "important"
    },
    {
      "date": "2024-03-15",
      "title": "提起诉讼", 
      "description": "张三向北京市朝阳区人民法院提起诉讼",
      "type": "filing",
      "importance": "critical"
    }
  ],
  "metadata": {
    "caseType": "民间借贷纠纷",
    "court": "北京市朝阳区人民法院",
    "amount": 1000000,
    "confidence": 95
  }
}

export default function TestFullIntegration() {
  const { setCaseData, caseData } = useCaseStore()
  const [dataLoaded, setDataLoaded] = useState(false)

  const loadMockData = () => {
    console.log('🔧 加载模拟案件数据...')
    setCaseData(mockCaseData)
    setDataLoaded(true)
    console.log('✅ 案件数据已加载到store:', mockCaseData)
  }

  const clearData = () => {
    console.log('🗑️ 清空案件数据...')
    setCaseData(null)
    setDataLoaded(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">🧪 完整集成测试页面</h1>
          <p className="text-gray-600">测试TimelineAIAnalysis组件与案件数据的完整集成</p>
          <p className="text-sm text-gray-500 mt-2">
            当前端口: {typeof window !== 'undefined' ? window.location.port : '未知'} | 
            应用状态: {dataLoaded ? '✅ 数据已加载' : '❌ 无数据'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 左侧：数据控制 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                数据管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={loadMockData} 
                className="w-full"
                variant={dataLoaded ? "outline" : "default"}
              >
                {dataLoaded ? "✅ 数据已加载" : "📤 加载模拟数据"}
              </Button>
              
              <Button 
                onClick={clearData} 
                variant="outline" 
                className="w-full"
                disabled={!dataLoaded}
              >
                🗑️ 清空数据
              </Button>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📊 当前状态</h4>
                <div className="text-xs space-y-1">
                  <p>Store数据: {caseData ? '✅ 存在' : '❌ 空'}</p>
                  <p>三要素: {caseData?.threeElements ? '✅ 有' : '❌ 无'}</p>
                  <p>时间轴: {caseData?.timeline ? `✅ ${caseData.timeline.length}项` : '❌ 无'}</p>
                  {caseData?.metadata && (
                    <p>案件类型: {caseData.metadata.caseType}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 中间：案件信息预览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                案件信息预览
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseData ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>案件类型:</strong> {caseData.metadata?.caseType || '未知'}
                  </div>
                  <div>
                    <strong>主要事实:</strong>
                    <p className="mt-1 text-gray-600 text-xs leading-relaxed">
                      {caseData.threeElements?.facts?.main?.substring(0, 150)}...
                    </p>
                  </div>
                  <div>
                    <strong>时间轴事件:</strong> {caseData.timeline?.length || 0}个
                  </div>
                  <div>
                    <strong>争议焦点:</strong> {caseData.threeElements?.facts?.disputed?.length || 0}个
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>暂无案件数据</p>
                  <p className="text-xs mt-2">请先加载模拟数据</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：快速测试 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                快速测试
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={() => console.log('当前caseData:', caseData)} 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  📋 打印Store数据到控制台
                </Button>
                
                <Button 
                  onClick={() => {
                    if (caseData?.timeline) {
                      console.log('时间轴事件:', caseData.timeline)
                    } else {
                      console.log('无时间轴数据')
                    }
                  }}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  📅 检查时间轴数据
                </Button>

                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p className="font-medium">💡 使用提示:</p>
                  <p className="mt-1">1. 先加载模拟数据</p>
                  <p>2. 观察下方的AI分析组件</p>
                  <p>3. 点击"AI深度分析"按钮</p>
                  <p>4. 查看浏览器控制台的调试信息</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 底部：TimelineAIAnalysis组件 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              时间轴AI分析组件测试
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineAIAnalysis />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}