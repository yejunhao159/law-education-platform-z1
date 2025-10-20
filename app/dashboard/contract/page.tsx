/**
 * 合同学习页面
 * AI辅助合同风险分析，帮助普通人理解合同条款
 */

'use client'

import { useState, useRef } from 'react'
import {
  FileText,
  Upload,
  AlertTriangle,
  MessageSquare,
  Send,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

// 风险等级
type RiskLevel = 'high' | 'medium' | 'low' | 'safe'

// 合同条款风险
interface ContractRisk {
  id: string
  clause: string
  riskLevel: RiskLevel
  title: string
  explanation: string
  potentialLoss: string
  suggestion: string
}

// AI对话消息
interface Message {
  role: 'user' | 'ai'
  content: string
  timestamp: number
}

// Mock 风险分析数据
const mockRisks: ContractRisk[] = [
  {
    id: '1',
    clause: '第3条：乙方应在签订合同后7日内支付全部款项，逾期视为违约。',
    riskLevel: 'high',
    title: '付款期限过短',
    explanation: '这个条款要求您在签约后7天内支付全款，时间非常紧迫。如果您需要申请贷款或筹集资金，7天可能不够。',
    potentialLoss: '如果无法按时付款，可能被认定违约，损失定金（通常为合同金额的10-20%），并可能需要支付违约金。',
    suggestion: '建议协商延长付款期限至30天，或者改为分期付款（如：签约付30%，交付前付70%）。'
  },
  {
    id: '2',
    clause: '第8条：因不可抗力导致的损失由乙方承担。',
    riskLevel: 'high',
    title: '不可抗力风险转嫁',
    explanation: '通常情况下，不可抗力（如地震、战争等）导致的损失应由双方各自承担，或按比例分担。这个条款把所有风险都转嫁给了您。',
    potentialLoss: '如果发生自然灾害等不可控事件，您可能需要承担全部损失，金额难以预估。',
    suggestion: '强烈建议修改为"因不可抗力导致的损失由双方各自承担"，或者删除此条款（按法律默认规则处理）。'
  },
  {
    id: '3',
    clause: '第12条：争议解决方式为提交至甲方所在地仲裁委员会仲裁。',
    riskLevel: 'medium',
    title: '争议解决地不利',
    explanation: '如果对方在外地，您需要去对方所在地参加仲裁，会增加时间和经济成本。',
    potentialLoss: '差旅费、律师异地办案费用增加，可能额外花费数千到上万元。',
    suggestion: '建议改为"双方协商确定仲裁地"，或者指定您所在地的仲裁机构。'
  },
  {
    id: '4',
    clause: '第5条：交付期限为合同签订后90天内。',
    riskLevel: 'low',
    title: '交付期限较宽松',
    explanation: '90天的交付期限比较合理，给对方留有充足的履约时间。',
    potentialLoss: '风险较低。',
    suggestion: '可以接受。建议在合同中增加"如需延期，甲方应提前15天书面通知乙方"的条款。'
  }
]

export default function ContractLearningPage() {
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [contractText, setContractText] = useState<string>('')
  const [risks, setRisks] = useState<ContractRisk[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      // 模拟AI分析
      simulateAnalysis(selectedFile)
    }
  }

  // 模拟AI分析合同
  const simulateAnalysis = (file: File) => {
    setAnalyzing(true)
    setContractText('')
    setRisks([])
    setMessages([])

    // 模拟加载过程
    setTimeout(() => {
      // 模拟提取的合同文本
      const mockContractText = `
合同编号：XXX-2024-001
签订日期：2024年10月20日

甲方（出卖方）：某某公司
乙方（购买方）：张三

第1条：合同标的
甲方同意向乙方出售商品房一套，位于XX市XX区XX路XX号。

第2条：价款
总价款为人民币100万元整。

第3条：付款方式
乙方应在签订合同后7日内支付全部款项，逾期视为违约。

第4条：质量保证
甲方保证所售房屋符合国家质量标准。

第5条：交付期限
交付期限为合同签订后90天内。

第6条：违约责任
任何一方违约，应向守约方支付合同总价款10%的违约金。

第7条：产权转移
乙方付清全款后，甲方协助办理产权过户手续。

第8条：不可抗力
因不可抗力导致的损失由乙方承担。

第9条：合同生效
本合同自双方签字盖章之日起生效。

第10条：其他约定
本合同未尽事宜，由双方协商解决。

第11条：合同份数
本合同一式两份，甲乙双方各执一份，具有同等法律效力。

第12条：争议解决
因本合同引起的争议，提交至甲方所在地仲裁委员会仲裁。

甲方（盖章）：_____________
乙方（签字）：_____________
      `.trim()

      setContractText(mockContractText)
      setRisks(mockRisks)

      // AI欢迎消息
      setMessages([{
        role: 'ai',
        content: `您好！我已经分析完这份合同，发现了 ${mockRisks.length} 个需要注意的地方，其中 ${mockRisks.filter(r => r.riskLevel === 'high').length} 个高风险条款。

我会用通俗的语言帮您理解每一条，您可以：
1. 点击右侧的风险条款查看详细说明
2. 随时问我任何关于合同的问题
3. 让我帮您起草修改建议

现在开始吧！有什么想了解的吗？`,
        timestamp: Date.now()
      }])

      setAnalyzing(false)
    }, 2000)
  }

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setSending(true)

    // 模拟AI回复
    setTimeout(() => {
      const aiMessage: Message = {
        role: 'ai',
        content: generateAIResponse(inputMessage),
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, aiMessage])
      setSending(false)
    }, 1000)
  }

  // 生成AI回复（简单模拟）
  const generateAIResponse = (question: string): string => {
    if (question.includes('违约金') || question.includes('违约')) {
      return '关于违约金，这份合同规定是合同总价款的10%，也就是10万元。这个比例在法律范围内（一般不超过30%），但还是挺高的。建议您特别注意第3条的付款期限，7天内付清全款压力比较大，很容易构成违约。'
    }
    if (question.includes('改') || question.includes('修改')) {
      return '建议重点修改以下几条：\n\n1. 第3条付款期限：改为30天或分期付款\n2. 第8条不可抗力：改为"双方各自承担"\n3. 第12条争议解决：改为您所在地或双方协商\n\n我可以帮您起草具体的修改建议，需要吗？'
    }
    return '这是一个很好的问题。根据合同内容和法律规定，我的理解是：这份合同总体来说条款不够平等，对您（买方）不太有利。建议在签字前与对方协商修改高风险条款，保护自己的权益。您还想了解哪方面的内容？'
  }

  // 风险等级样式
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200', label: '高风险' }
      case 'medium':
        return { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200', label: '中风险' }
      case 'low':
        return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200', label: '低风险' }
      case 'safe':
        return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200', label: '安全' }
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] p-8 overflow-hidden">
      <div className="h-full max-w-[1800px] mx-auto flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            合同学习
          </h1>
          <p className="text-muted-foreground">
            上传合同，AI帮您逐句分析风险，用通俗语言解释法律条款
          </p>
        </div>

        {!file ? (
          // 上传区域
          <Card className="flex-1 flex items-center justify-center">
            <CardContent className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Upload className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">上传合同开始分析</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                支持 PDF、Word、图片格式。AI会自动识别合同内容，标注风险条款，用大白话解释每一条的意思和潜在风险。
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-5 h-5" />
                选择合同文件
              </Button>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <ShieldAlert className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-semibold mb-1">风险识别</h3>
                  <p className="text-xs text-muted-foreground">
                    自动标注不平等条款、霸王条款、风险隐患
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
                  <h3 className="font-semibold mb-1">对话式学习</h3>
                  <p className="text-xs text-muted-foreground">
                    随时提问，AI用大白话解释法律条款
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <FileText className="w-8 h-8 text-green-600 mb-2" />
                  <h3 className="font-semibold mb-1">修改建议</h3>
                  <p className="text-xs text-muted-foreground">
                    提供具体的条款修改建议，保护您的权益
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : analyzing ? (
          // 分析中
          <Card className="flex-1 flex items-center justify-center">
            <CardContent className="text-center py-12">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">AI正在分析合同...</h2>
              <p className="text-sm text-muted-foreground">
                正在逐句识别风险条款，请稍候
              </p>
            </CardContent>
          </Card>
        ) : (
          // 分析结果 - 3/4预览 + 1/4对话
          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* 左侧：合同预览 (75%) */}
            <div className="flex-[3] flex flex-col overflow-hidden">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="flex-shrink-0 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {file.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        已识别 {risks.length} 个风险点
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null)
                        setContractText('')
                        setRisks([])
                        setMessages([])
                      }}
                    >
                      重新上传
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full px-6 pb-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {contractText.split('\n').map((line, idx) => {
                          // 检查是否是风险条款
                          const risk = risks.find(r => line.includes(r.clause.substring(0, 10)))
                          if (risk) {
                            const badge = getRiskBadge(risk.riskLevel)
                            const Icon = badge.icon
                            return (
                              <div
                                key={idx}
                                className={`p-3 my-2 rounded-lg border ${badge.bg} ${badge.border}`}
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  <Icon className={`w-4 h-4 ${badge.color} mt-0.5`} />
                                  <Badge variant="outline" className={badge.color}>
                                    {badge.label}
                                  </Badge>
                                </div>
                                <div className="font-medium mb-1">{line}</div>
                                <div className="text-xs text-muted-foreground">
                                  点击右侧查看详细分析 →
                                </div>
                              </div>
                            )
                          }
                          return <div key={idx}>{line}</div>
                        })}
                      </pre>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：AI对话 + 风险面板 (25%) */}
            <div className="flex-[1] flex flex-col gap-4 overflow-hidden">
              {/* 风险概览 */}
              <Card className="flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">风险概览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>高风险</span>
                    </span>
                    <span className="font-semibold">{risks.filter(r => r.riskLevel === 'high').length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span>中风险</span>
                    </span>
                    <span className="font-semibold">{risks.filter(r => r.riskLevel === 'medium').length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span>低风险</span>
                    </span>
                    <span className="font-semibold">{risks.filter(r => r.riskLevel === 'low').length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* AI对话区 */}
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="flex-shrink-0 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    AI助手
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                  {/* 消息列表 */}
                  <ScrollArea className="flex-1 px-4">
                    <div className="space-y-4 py-4">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        </div>
                      ))}
                      {sending && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* 输入框 */}
                  <div className="flex-shrink-0 p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        placeholder="问我任何关于合同的问题..."
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || sending}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => setInputMessage('违约金是多少？')}
                        className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                      >
                        违约金是多少？
                      </button>
                      <button
                        onClick={() => setInputMessage('哪些条款需要改？')}
                        className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                      >
                        哪些条款需要改？
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 风险详情 */}
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="flex-shrink-0 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    风险详情
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full px-4 pb-4">
                    <div className="space-y-3">
                      {risks.map((risk) => {
                        const badge = getRiskBadge(risk.riskLevel)
                        const Icon = badge.icon
                        return (
                          <div
                            key={risk.id}
                            className={`p-3 rounded-lg border ${badge.bg} ${badge.border}`}
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <Icon className={`w-4 h-4 ${badge.color} mt-0.5 flex-shrink-0`} />
                              <div className="flex-1">
                                <div className="font-semibold text-sm mb-1">{risk.title}</div>
                                <Badge variant="outline" className={`${badge.color} text-xs`}>
                                  {badge.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-xs space-y-2 ml-6">
                              <div>
                                <span className="font-medium">通俗解释：</span>
                                <p className="mt-1 text-muted-foreground">{risk.explanation}</p>
                              </div>
                              <div>
                                <span className="font-medium">可能损失：</span>
                                <p className="mt-1 text-muted-foreground">{risk.potentialLoss}</p>
                              </div>
                              <div>
                                <span className="font-medium">修改建议：</span>
                                <p className="mt-1 text-muted-foreground">{risk.suggestion}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
