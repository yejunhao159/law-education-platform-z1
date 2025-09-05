'use client'

import React, { useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import { Act2CaseIntro } from '@/components/acts/Act2CaseIntro'
import { BookOpen, ArrowRight, CheckCircle } from 'lucide-react'

// 真实案例数据
const realCaseData = {
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
        {
          date: '2023-01-15',
          event: '签订借款合同',
          detail: '原告张某与被告李某签订《个人借款合同》，约定：借款金额人民币100万元整，借款期限12个月（自2023年2月1日至2024年1月31日），年利率8%，按月付息，到期还本。合同对违约责任、管辖法院等事项进行了明确约定。',
          isKeyEvent: true,
          party: '张某、李某',
          legalAnalysis: {
            legalRelation: '民间借贷合同关系',
            burdenOfProof: '原告需举证证明借贷合意及款项交付',
            limitation: '1年（至2024-01-31）',
            claims: ['原告主张：双方自愿签订合同，合同合法有效', '被告认可：确实签订了借款合同'],
            keyPoint: '借贷合同的成立与生效要件'
          }
        },
        {
          date: '2023-01-20',
          event: '办理公证',
          detail: '双方前往北京市朝阳公证处，对《个人借款合同》进行公证，公证书编号：(2023)京朝证字第1234号。公证书载明：双方当事人自愿签订合同，意思表示真实，合同内容不违反法律法规的强制性规定。',
          isKeyEvent: false,
          party: '张某、李某',
          legalAnalysis: {
            keyPoint: '公证文书的证明力',
            legalBasis: '《民事诉讼法》第69条'
          }
        },
        {
          date: '2023-02-01',
          event: '转账支付借款',
          detail: '原告张某通过中国工商银行网上银行，向被告李某在中国建设银行开立的账户（尾号8888）转账100万元。银行转账凭证显示：转账用途"借款"，实际到账100万元。被告当日通过微信向原告确认收到借款。',
          isKeyEvent: true,
          party: '张某',
          legalAnalysis: {
            burdenOfProof: '银行流水作为借款交付的直接证据',
            keyPoint: '借款实际交付的认定',
            legalBasis: '《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第16条'
          }
        },
        {
          date: '2023-03-01',
          event: '支付第一期利息',
          detail: '被告李某按约定向原告张某支付2023年2月份利息6667元（100万×8%÷12）。转账备注：2月利息。',
          isKeyEvent: false,
          party: '李某',
          legalAnalysis: {
            keyPoint: '利息支付行为对借贷关系的确认作用'
          }
        },
        {
          date: '2023-06-15',
          event: '停止支付利息',
          detail: '被告李某自2023年6月起未再支付利息。原告多次通过电话、微信催讨，被告以资金周转困难为由请求宽限。原告保留了相关聊天记录和通话录音。',
          isKeyEvent: true,
          party: '李某',
          legalAnalysis: {
            legalRelation: '违约行为的开始',
            keyPoint: '违约事实的固定与证明'
          }
        },
        {
          date: '2024-02-01',
          event: '借款到期未还',
          detail: '借款期限届满，被告李某未按照合同约定归还本金100万元及剩余利息。根据合同约定，被告应支付本金100万元、剩余8个月利息53336元（100万×8%÷12×8）及逾期利息。',
          isKeyEvent: true,
          party: '李某',
          legalAnalysis: {
            legalRelation: '根本违约',
            burdenOfProof: '被告需举证证明已还款或存在法定免责事由',
            keyPoint: '违约责任的确定',
            claims: ['原告主张：被告构成根本违约，应承担全部责任', '被告抗辩：因不可抗力导致经营困难'],
            legalBasis: '《民法典》第579条、第580条'
          }
        },
        {
          date: '2024-02-15',
          event: '发送律师函催款',
          detail: '原告委托北京某律师事务所向被告发送《催款律师函》，要求被告于2024年2月29日前归还本金100万元、利息53336元及逾期利息，否则将提起诉讼。律师函通过EMS送达，被告于2024年2月18日签收。',
          isKeyEvent: false,
          party: '张某',
          legalAnalysis: {
            limitation: '15天宽限期',
            keyPoint: '诉前催告程序',
            legalBasis: '《民法典》第560条'
          }
        },
        {
          date: '2024-03-01',
          event: '被告提出和解方案',
          detail: '被告李某主动联系原告，提出和解方案：承认欠款事实，但请求分期还款，提议分24期归还本金和利息。原告未接受该方案，认为被告无诚意且缺乏担保。',
          isKeyEvent: false,
          party: '李某',
          legalAnalysis: {
            keyPoint: '和解协商的法律效力',
            claims: ['被告承认债务存在', '双方未达成新的还款协议']
          }
        },
        {
          date: '2024-03-15',
          event: '提起民事诉讼',
          detail: '原告张某向北京市朝阳区人民法院提起民事诉讼，请求判令：1.被告归还借款本金100万元；2.被告支付利息53336元（自2023年2月1日至2024年1月31日）；3.被告支付逾期利息（以100万元为基数，按年利率24%计算，自2024年2月1日起至实际清偿之日止）；4.被告承担本案诉讼费用。',
          isKeyEvent: true,
          party: '张某',
          legalAnalysis: {
            legalRelation: '诉讼法律关系',
            claims: ['请求归还本金100万元', '请求支付利息53336元', '请求支付逾期利息（年利率24%）', '请求被告承担诉讼费'],
            keyPoint: '诉讼请求的合法性审查',
            legalBasis: '《民事诉讼法》第122条'
          }
        },
        {
          date: '2024-04-10',
          event: '法庭审理',
          detail: '法院公开开庭审理本案。原告出示了借款合同、公证书、银行转账凭证、聊天记录等证据。被告承认借款事实，但辩称因疫情影响导致生意亏损，请求法院酌情减少利息。法庭组织双方进行了调解，但未能达成一致。',
          isKeyEvent: true,
          party: '法院',
          legalAnalysis: {
            keyPoint: '庭审查明的事实',
            burdenOfProof: '原告举证责任已完成，被告未能举证证明免责事由',
            claims: ['法院认定：借贷关系成立且合法有效', '法院认定：被告构成违约']
          }
        },
        {
          date: '2024-05-20',
          event: '法院作出判决',
          detail: '法院判决：一、被告李某于判决生效之日起十日内向原告张某归还借款本金100万元；二、被告李某向原告张某支付利息53336元；三、被告李某向原告张某支付逾期利息（以100万元为基数，按年利率16%计算，自2024年2月1日起至实际清偿之日止）；四、案件受理费12800元，由被告李某负担。',
          isKeyEvent: true,
          party: '法院',
          legalAnalysis: {
            legalRelation: '生效判决确定的债权债务关系',
            keyPoint: '判决主文的执行力',
            legalBasis: '《民法典》第580条、《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第25条',
            claims: ['法院支持原告大部分诉求', '逾期利息调整为年利率16%（LPR四倍）']
          }
        }
      ]
    },
    reasoning: {
      summary: '本院认为，原、被告之间的借贷关系成立且合法有效。被告未按约定归还借款构成违约，应承担相应的违约责任。关于逾期利息，根据相关司法解释，调整为LPR四倍计算。'
    }
  },
  metadata: {
    confidence: 95,
    extractedAt: new Date().toISOString()
  }
}

export default function TestIntegrationPage() {
  const { setCaseData, caseData } = useCaseStore()
  
  useEffect(() => {
    // 设置真实案例数据
    setCaseData(realCaseData as any)
  }, [setCaseData])
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">时间轴集成测试</h1>
          <p className="text-gray-600">
            测试优化后的时间轴在真实案例中的表现
          </p>
          <div className="flex gap-2 mt-4">
            <Badge variant="outline">AI法律分析</Badge>
            <Badge variant="outline">默认摘要显示</Badge>
            <Badge variant="outline">点击展开详情</Badge>
          </div>
        </div>
        
        {/* 案件基本信息 */}
        <Card className="mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">案号</p>
              <p className="font-semibold">{realCaseData.basicInfo.caseNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">审理法院</p>
              <p className="font-semibold">{realCaseData.basicInfo.court}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">案件类型</p>
              <p className="font-semibold">{realCaseData.basicInfo.caseType}</p>
            </div>
          </div>
        </Card>
        
        {/* 时间轴展示 - 使用Act2CaseIntro组件 */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">案件时间轴（优化版）</h2>
          </div>
          <Act2CaseIntro />
        </Card>
        
        {/* 功能说明 */}
        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-4">✨ 集成功能说明</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>智能摘要：</strong>每个事件默认显示30-40字的核心摘要，无需点击即可快速了解案情脉络
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>AI法律分析：</strong>点击展开事件后，自动调用AI分析法学要点、相关法条、举证责任等
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>视觉优化：</strong>重要内容在左，时间在右，符合阅读习惯；关键事件有特殊标记
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>法学要素：</strong>自动识别法律关系、举证责任、时效期间、各方主张等专业要素
              </div>
            </div>
          </div>
        </Card>
        
        {/* 使用提示 */}
        <Card className="mt-6 p-6 bg-green-50 border-green-200">
          <h3 className="font-semibold text-green-900 mb-3">📝 使用提示</h3>
          <ol className="space-y-2 text-sm text-green-800">
            <li>1. 默认情况下，所有事件显示摘要，可以快速浏览整个案件流程</li>
            <li>2. 点击任意事件卡片，展开查看完整描述和法律分析</li>
            <li>3. 关键事件（红色标记）通常是案件的转折点，值得重点关注</li>
            <li>4. AI分析需要配置DEEPSEEK_API_KEY环境变量才能看到真实结果</li>
            <li>5. 可以在故事模式和数据模式之间切换，获得不同的阅读体验</li>
          </ol>
        </Card>
        
        {/* 操作按钮 */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button 
            size="lg"
            onClick={() => window.location.href = '/'}
          >
            返回主页
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            size="lg"
            variant="outline"
            onClick={() => window.location.href = '/timeline-simplified'}
          >
            查看独立时间轴
          </Button>
        </div>
      </div>
    </div>
  )
}