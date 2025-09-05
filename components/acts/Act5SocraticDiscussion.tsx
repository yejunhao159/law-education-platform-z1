"use client"

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCaseStore } from '@/lib/stores/useCaseStore'
import { Brain, MessageCircle, Users, Send, Hand, ThumbsUp, ThumbsDown, QrCode, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Act5SocraticDiscussion() {
  const [currentLevel, setCurrentLevel] = useState(1)
  const [votingActive, setVotingActive] = useState(false)
  const [votes, setVotes] = useState({ agree: 0, disagree: 0 })
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [questionCount, setQuestionCount] = useState(0)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system',
      role: 'assistant',
      content: '欢迎来到苏格拉底式讨论！让我们一起深入探讨这个案例。首先，你认为这个案件的核心争议是什么？'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const caseData = useCaseStore(state => state.caseData)

  const levels = [
    { 
      level: "观察层", 
      description: "你看到了什么？",
      completed: currentLevel > 1,
      current: currentLevel === 1 
    },
    { 
      level: "事实层", 
      description: "发生了什么？",
      completed: currentLevel > 2,
      current: currentLevel === 2 
    },
    { 
      level: "分析层", 
      description: "为什么会这样？",
      completed: currentLevel > 3,
      current: currentLevel === 3 
    },
    { 
      level: "应用层", 
      description: "法律如何适用？",
      completed: currentLevel > 4,
      current: currentLevel === 4 
    },
    { 
      level: "价值层", 
      description: "这样公平吗？",
      completed: currentLevel > 5,
      current: currentLevel === 5 
    },
  ]
  
  // 苏格拉底式提问策略
  const socraticPrompts = {
    1: '基于表面观察提问，引导学生描述所见',
    2: '深入事实细节，让学生梳理时间线',
    3: '分析因果关系，探讨法律要件',
    4: '应用法律条文，检验理解深度',
    5: '价值判断讨论，反思公平正义'
  }

  // 处理用户输入提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // 模拟苏格拉底式追问
    setTimeout(() => {
      const socraticQuestions = [
        "这很有意思！但是你能告诉我为什么你会这样认为吗？",
        "如果情况相反会怎样？你的观点还会成立吗？",
        "这个判断的依据是什么？能举个具体例子吗？",
        "假设你是对方当事人，你会如何反驳这个观点？",
        "这样的结论对社会会产生什么影响？"
      ]

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: socraticQuestions[Math.floor(Math.random() * socraticQuestions.length)]
      }

      setMessages(prev => [...prev, aiResponse])
      setQuestionCount(prev => prev + 1)
      setIsLoading(false)

      // 每3个问题自动进入下一层级
      if (questionCount > 0 && questionCount % 3 === 0 && currentLevel < 5) {
        setCurrentLevel(prev => prev + 1)
      }
    }, 1000)
  }

  // 输入变化处理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  // 添加教师介入功能
  const handleTeacherIntervene = () => {
    const teacherPrompt = `老师提醒：让我们回到${levels[currentLevel - 1].description}这个核心问题上。`
    const teacherMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: teacherPrompt
    }
    setMessages(prev => [...prev, teacherMessage])
  }
  
  // 智能提示系统
  const getHint = () => {
    const hints = {
      1: ['仔细阅读判决书开头', '找出原被告双方', '注意案件类型'],
      2: ['按时间顺序梳理', '找关键转折点', '注意因果关系'],
      3: ['思考法律要件', '对比类似案例', '分析构成要素'],
      4: ['查找相关法条', '理解法律精神', '考虑例外情况'],
      5: ['换位思考', '考虑社会影响', '平衡各方利益']
    }
    return hints[currentLevel] || []
  }

  const handleVote = (type: 'agree' | 'disagree') => {
    setVotes(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }))
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">苏格拉底式深度讨论</h2>
        <p className="text-gray-600">五层递进式提问，启发学生深度思考</p>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* 当前问题展示 */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              当前讨论层级
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    第{currentLevel}层 - {levels[currentLevel - 1]?.level}
                  </Badge>
                  <Badge className="text-xs bg-blue-600">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI引导中
                  </Badge>
                </div>
                <p className="font-medium text-gray-800 mb-2">
                  {levels[currentLevel - 1]?.description}
                </p>
                <p className="text-sm text-gray-600">
                  已追问 {questionCount} 次 | 预计还需 {Math.max(0, 3 - (questionCount % 3))} 次进入下一层
                </p>
              </div>
              
              {/* 教学控制面板 */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">教学模式</span>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant={mode === 'auto' ? 'default' : 'outline'}
                      onClick={() => setMode('auto')}
                      className="text-xs h-7"
                    >
                      自动
                    </Button>
                    <Button 
                      size="sm" 
                      variant={mode === 'manual' ? 'default' : 'outline'}
                      onClick={() => setMode('manual')}
                      className="text-xs h-7"
                    >
                      手动
                    </Button>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleTeacherIntervene}
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  教师介入引导
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800 text-sm">层级进度</h4>
                <div className="space-y-1">
                  {levels.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-xs p-2 rounded ${
                        item.current ? "bg-blue-100" : item.completed ? "bg-green-100" : "bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          item.current ? "bg-blue-600" : item.completed ? "bg-green-600" : "bg-gray-300"
                        }`}
                      />
                      <span>{item.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 核心讨论区 */}
          <Card className="col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
                实时讨论区
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">24人在线</Badge>
                <Button size="sm" variant="outline">
                  <QrCode className="w-4 h-4 mr-2" />
                  显示二维码
                </Button>
              </div>
            </div>

            <div className="h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
              <div className="space-y-3">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex gap-3 ${
                      msg.role === 'assistant' 
                        ? "bg-green-50 p-3 rounded-lg" 
                        : "bg-white p-3 rounded-lg border"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          msg.role === 'assistant'
                            ? "bg-green-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {msg.role === 'assistant' ? 'AI' : '学'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-800">
                          {msg.role === 'assistant' ? '苏格拉底AI' : '学生'}
                        </span>
                        {msg.role === 'assistant' && (
                          <Badge variant="outline" className="text-xs">
                            第{Math.min(5, Math.floor(index / 2) + 1)}层追问
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 bg-green-50 p-3 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">苏格拉底正在思考追问...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入您的思考和回答..."
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                  value={input}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
              
              {/* 智能提示 */}
              {input.length === 0 && getHint().length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">💡 思考提示：</p>
                  <ul className="space-y-1">
                    {getHint().map((hint, i) => (
                      <li key={i} className="text-xs text-gray-600">• {hint}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                <Button size="sm" variant="outline">
                  <Users className="w-3 h-3 mr-1" />
                  随机选人
                </Button>
                <Button size="sm" variant="outline" onClick={() => setVotingActive(true)}>
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  发起投票
                </Button>
                <Button size="sm" variant="outline">
                  <Hand className="w-3 h-3 mr-1" />
                  举手发言
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setCurrentLevel(prev => Math.min(5, prev + 1))}
                  disabled={currentLevel >= 5}
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  {currentLevel >= 5 ? '已完成' : '下一层级'}
                </Button>
              </div>

              {votingActive && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    实时投票：房价上涨是否构成情势变更？
                  </h4>
                  <div className="flex gap-4">
                    <Button size="sm" onClick={() => handleVote("agree")} className="flex-1">
                      <ThumbsUp className="w-3 h-3 mr-1" />是 ({votes.agree})
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleVote("disagree")} className="flex-1">
                      <ThumbsDown className="w-3 h-3 mr-1" />否 ({votes.disagree})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}