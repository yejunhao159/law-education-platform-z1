"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, MessageCircle, Users, Send, Hand, ThumbsUp, ThumbsDown, QrCode, ArrowRight } from 'lucide-react'

export default function Act5SocraticDiscussion() {
  const [currentLevel, setCurrentLevel] = useState(3)
  const [studentResponse, setStudentResponse] = useState('')
  const [votingActive, setVotingActive] = useState(false)
  const [votes, setVotes] = useState({ agree: 0, disagree: 0 })

  const levels = [
    { level: "破冰层", completed: true },
    { level: "事实层", completed: true },
    { level: "法理层", completed: false, current: true },
    { level: "应用层", completed: false },
    { level: "价值层", completed: false },
  ]

  const messages = [
    {
      student: "张同学",
      message: "我觉得情势变更需要满足不可预见性",
      time: "14:23",
      type: "student",
    },
    {
      student: "AI助手",
      message: "张同学说得很好！那么什么叫'不可预见'呢？",
      time: "14:23",
      type: "ai",
    },
    {
      student: "李同学",
      message: "就是签合同时双方都没想到会发生的事情",
      time: "14:24",
      type: "student",
    },
    {
      student: "王同学",
      message: "但是房价上涨不是很常见吗？",
      time: "14:24",
      type: "student"
    },
    {
      student: "老师",
      message: "王同学提出了一个关键问题！大家觉得房价波动是否可预见？",
      time: "14:25",
      type: "teacher",
    },
  ]

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
                    第{currentLevel}层 - 法理层
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    概念理解
                  </Badge>
                </div>
                <p className="font-medium text-gray-800 mb-2">
                  什么情况下可以适用情势变更原则？
                </p>
                <p className="text-sm text-gray-600">
                  教学目标：理解情势变更的构成要件和适用条件
                </p>
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
                    key={index}
                    className={`flex gap-3 ${
                      msg.type === "teacher" 
                        ? "bg-blue-100 p-2 rounded" 
                        : msg.type === "ai" 
                        ? "bg-green-100 p-2 rounded" 
                        : ""
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          msg.type === "teacher"
                            ? "bg-blue-600 text-white"
                            : msg.type === "ai"
                            ? "bg-green-600 text-white"
                            : "bg-gray-300 text-gray-700"
                        }`}
                      >
                        {msg.student.charAt(0)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-800">{msg.student}</span>
                        <span className="text-xs text-gray-500">{msg.time}</span>
                      </div>
                      <p className="text-sm text-gray-700">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入您的观点..."
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                  value={studentResponse}
                  onChange={(e) => setStudentResponse(e.target.value)}
                />
                <Button size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>

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
                <Button size="sm" variant="outline">
                  <ArrowRight className="w-3 h-3 mr-1" />
                  下一层级
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