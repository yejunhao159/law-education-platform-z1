"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  FileText,
  Clock,
  Scale,
  Target,
  Brain,
  Gavel,
  User,
  ChevronRight,
  Play,
  Hand,
  Star,
  Trophy,
  MessageCircle,
  Users,
  ThumbsUp,
  ThumbsDown,
  Send,
  Mic,
  MicOff,
} from "lucide-react"

const sevenActs = [
  { id: "prologue", name: "序幕：案例导入", icon: Upload, description: "判决书上传与解析" },
  { id: "act1", name: "第一幕：要素分析", icon: FileText, description: "事实、法理、推理三要素分解" },
  { id: "act2", name: "第二幕：事实梳理", icon: Clock, description: "案件事实时间线重构" },
  { id: "act3", name: "第三幕：证据审查", icon: Scale, description: "证据效力与证明力分析" },
  { id: "act4", name: "第四幕：争点确定", icon: Target, description: "法律争议焦点识别" },
  { id: "act5", name: "第五幕：法理辨析", icon: Brain, description: "多角色AI对抗辩论" },
  { id: "act6", name: "第六幕：判决分析", icon: Gavel, description: "裁判理由与法律适用" },
]

const mockCase = {
  title: "张某诉李某房屋买卖合同纠纷案",
  caseNumber: "（2023）京0108民初12345号",
  court: "北京市海淀区人民法院",
  threeElements: {
    facts: {
      title: "案件事实",
      content:
        "2023年1月15日，张某（出卖人）与李某（买受人）签订《房屋买卖合同》，约定房屋总价200万元。李某依约支付首付款50万元。后因房价上涨，张某拒绝履行过户义务。",
      keywords: ["合同签订", "价款支付", "拒绝履行", "房价变动"],
    },
    law: {
      title: "法律依据",
      content:
        "《中华人民共和国民法典》第509条规定，当事人应当按照约定全面履行自己的义务。第533条规定情势变更的适用条件。",
      keywords: ["全面履行", "情势变更", "合同义务", "法定条件"],
    },
    reasoning: {
      title: "裁判理由",
      content: "房价正常波动不构成情势变更，不能免除合同义务。张某应继续履行合同，配合办理房屋过户登记手续。",
      keywords: ["正常波动", "继续履行", "过户义务", "合同效力"],
    },
  },
  timeline: [
    { date: "2023年1月15日", event: "签订房屋买卖合同", type: "合同行为", importance: "关键" },
    { date: "2023年2月1日", event: "支付首付款50万元", type: "履行行为", importance: "一般" },
    { date: "2023年3月10日", event: "周边房价开始上涨", type: "客观情况", importance: "一般" },
    { date: "2023年4月20日", event: "出卖人拒绝配合过户", type: "违约行为", importance: "关键" },
    { date: "2023年7月15日", event: "买受人提起诉讼", type: "诉讼行为", importance: "关键" },
  ],
  evidence: [
    { id: 1, name: "房屋买卖合同", type: "书证", credibility: 95, relevance: "直接证据" },
    { id: 2, name: "银行转账凭证", type: "书证", credibility: 90, relevance: "直接证据" },
    { id: 3, name: "房产评估报告", type: "鉴定意见", credibility: 85, relevance: "辅助证据" },
    { id: 4, name: "中介人员证言", type: "证人证言", credibility: 70, relevance: "辅助证据" },
  ],
}

const socraticQuestions = {
  level1: {
    question: "同学们，我们先从最基本的问题开始：什么是合同？",
    followUp: "很好，那么合同一旦签订，当事人是否可以随意反悔呢？",
    purpose: "建立基础概念认知",
  },
  level2: {
    question: "既然合同具有约束力，那么在什么情况下当事人可以不履行合同义务？",
    followUp: "请大家思考：房价上涨是否属于这些例外情况？",
    purpose: "引导深入思考例外情况",
  },
  level3: {
    question: "假设你是张某，面对房价上涨，你会如何在法律框架内保护自己的利益？",
    followUp: "如果你是李某，你又会如何应对？",
    purpose: "培养换位思考和实务操作能力",
  },
  level4: {
    question: "从社会效果角度，如果允许出卖人因房价上涨而违约，会产生什么后果？",
    followUp: "这种后果是否符合我们的价值判断？",
    purpose: "提升法理思辨和价值判断能力",
  },
}

export default function LawTeachingSystem() {
  const [currentAct, setCurrentAct] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [processingStage, setProcessingStage] = useState("")
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [timelinePosition, setTimelinePosition] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [studentResponse, setStudentResponse] = useState("")

  const [raisedHands, setRaisedHands] = useState<string[]>([])
  const [currentSocraticLevel, setCurrentSocraticLevel] = useState(1)
  const [classroomChat, setClassroomChat] = useState<
    Array<{ id: number; student: string; message: string; timestamp: string }>
  >([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [votingActive, setVotingActive] = useState(false)
  const [votes, setVotes] = useState({ agree: 0, disagree: 0 })
  const [micEnabled, setMicEnabled] = useState(false)

  const mockStudents = [
    "张同学",
    "李同学",
    "王同学",
    "刘同学",
    "陈同学",
    "杨同学",
    "赵同学",
    "黄同学",
    "周同学",
    "吴同学",
    "徐同学",
    "孙同学",
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      setProcessingStage("正在解析判决书...")
      setTimeout(() => setProcessingStage("正在提取案件要素..."), 1500)
      setTimeout(() => setProcessingStage("正在构建案例结构..."), 3000)
      setTimeout(() => {
        setProcessingStage("解析完成")
        setCurrentAct(1)
      }, 4500)
    }
  }

  const handleRaiseHand = (student: string) => {
    if (!raisedHands.includes(student)) {
      setRaisedHands([...raisedHands, student])
    }
  }

  const selectRandomStudent = () => {
    const randomStudent = mockStudents[Math.floor(Math.random() * mockStudents.length)]
    setSelectedStudent(randomStudent)
    setRaisedHands(raisedHands.filter((s) => s !== randomStudent))
  }

  const startVoting = () => {
    setVotingActive(true)
    setVotes({ agree: 0, disagree: 0 })
  }

  const handleVote = (type: "agree" | "disagree") => {
    setVotes((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }))
  }

  const sendChatMessage = (message: string) => {
    const newMessage = {
      id: Date.now(),
      student: "当前学生",
      message,
      timestamp: new Date().toLocaleTimeString(),
    }
    setClassroomChat([...classroomChat, newMessage])
  }

  const renderActContent = () => {
    const act = sevenActs[currentAct]

    switch (act.id) {
      case "prologue":
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">案例导入系统</h2>
              <p className="text-gray-600 text-lg">请上传判决书文件，系统将自动进行结构化分析</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">上传判决书</h3>
                <p className="text-gray-500 mb-6">支持 PDF、Word 格式文件</p>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button className="bg-blue-600 hover:bg-blue-700 cursor-pointer">选择文件</Button>
                </label>

                {processingStage && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-blue-700">{processingStage}</span>
                    </div>
                    {uploadedFile && processingStage !== "解析完成" && (
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>✓ 识别案件类型：民事纠纷</p>
                        <p>✓ 提取当事人：张某、李某</p>
                        <p>✓ 确定争议标的：房屋买卖合同</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "act1":
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">案件要素分析</h2>
              <p className="text-gray-600">按照司法三段论结构分解案件</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Object.entries(mockCase.threeElements).map(([key, element]) => (
                <Card
                  key={key}
                  className={`border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedElement === key
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedElement(selectedElement === key ? null : key)}
                >
                  <div className="text-center">
                    <div className="mb-4">
                      {key === "facts" && <FileText className="w-8 h-8 text-blue-600 mx-auto" />}
                      {key === "law" && <Scale className="w-8 h-8 text-green-600 mx-auto" />}
                      {key === "reasoning" && <Brain className="w-8 h-8 text-purple-600 mx-auto" />}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">{element.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{element.content}</p>

                    {selectedElement === key && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-2">关键要素：</h4>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {element.keywords.map((keyword, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )

      case "act2":
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">案件事实梳理</h2>
              <p className="text-gray-600">按时间顺序重构案件发生过程</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-4">
                {mockCase.timeline.map((item, index) => (
                  <Card
                    key={index}
                    className={`p-4 border-l-4 transition-all duration-300 ${
                      item.importance === "关键" ? "border-l-red-500 bg-red-50" : "border-l-gray-300 bg-gray-50"
                    } ${index <= timelinePosition ? "opacity-100" : "opacity-40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant={item.importance === "关键" ? "destructive" : "secondary"}>{item.date}</Badge>
                        <span className="font-medium text-gray-800">{item.event}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        {item.importance === "关键" && <Star className="w-4 h-4 text-yellow-500" />}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="text-center mt-6">
                <Button
                  onClick={() => setTimelinePosition(Math.min(timelinePosition + 1, mockCase.timeline.length - 1))}
                  className="mr-4"
                  disabled={timelinePosition >= mockCase.timeline.length - 1}
                >
                  <Play className="w-4 h-4 mr-2" />
                  显示下一事件
                </Button>
                <Button variant="outline" onClick={() => setTimelinePosition(0)}>
                  重新开始
                </Button>
              </div>
            </div>
          </div>
        )

      case "act3":
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">证据审查分析</h2>
              <p className="text-gray-600">评估证据的证明力和关联性</p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        证据名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        证据类型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        证明力
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        关联性
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockCase.evidence.map((evidence) => (
                      <tr key={evidence.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {evidence.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">{evidence.type}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Progress value={evidence.credibility} className="w-20 h-2 mr-2" />
                            <span className="text-sm text-gray-600">{evidence.credibility}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={evidence.relevance === "直接证据" ? "default" : "secondary"}>
                            {evidence.relevance}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case "act4":
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">争议焦点确定</h2>
              <p className="text-gray-600">识别案件的核心法律争议问题</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <Card className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">本案争议焦点</h3>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">争议焦点一</h4>
                    <p className="text-gray-600">房价上涨是否构成情势变更，出卖人能否据此解除合同？</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">争议焦点二</h4>
                    <p className="text-gray-600">出卖人拒绝履行过户义务的行为是否构成根本违约？</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">争议焦点三</h4>
                    <p className="text-gray-600">买受人请求继续履行合同的诉讼请求是否应当支持？</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )

      case "act5":
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">苏格拉底式提问与课堂互动</h2>
              <p className="text-gray-600">基于渐进式启发的深度思辨教学</p>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-blue-800">苏格拉底提问 - 第{currentSocraticLevel}层</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border border-blue-200">
                      <p className="text-gray-800 font-medium mb-2">
                        {socraticQuestions[`level${currentSocraticLevel}` as keyof typeof socraticQuestions].question}
                      </p>
                      <p className="text-sm text-gray-600">
                        教学目的:{" "}
                        {socraticQuestions[`level${currentSocraticLevel}` as keyof typeof socraticQuestions].purpose}
                      </p>
                    </div>

                    {selectedStudent && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 font-medium">
                          请 <span className="font-bold">{selectedStudent}</span> 回答这个问题
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button onClick={selectRandomStudent} variant="outline">
                        <Users className="w-4 h-4 mr-2" />
                        随机选择学生
                      </Button>
                      <Button
                        onClick={() => setCurrentSocraticLevel(Math.min(currentSocraticLevel + 1, 4))}
                        disabled={currentSocraticLevel >= 4}
                      >
                        深入提问
                      </Button>
                      <Button onClick={startVoting} variant="outline">
                        发起投票
                      </Button>
                    </div>
                  </div>
                </Card>

                {votingActive && (
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">课堂投票：房价上涨是否构成情势变更？</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Button onClick={() => handleVote("agree")} className="bg-green-600 hover:bg-green-700">
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        同意 ({votes.agree})
                      </Button>
                      <Button onClick={() => handleVote("disagree")} className="bg-red-600 hover:bg-red-700">
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        不同意 ({votes.disagree})
                      </Button>
                    </div>
                    <div className="text-sm text-gray-600">
                      总投票数: {votes.agree + votes.disagree} | 同意率:{" "}
                      {votes.agree + votes.disagree > 0
                        ? Math.round((votes.agree / (votes.agree + votes.disagree)) * 100)
                        : 0}
                      %
                    </div>
                  </Card>
                )}

                <Card className="p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">学生回答区</h3>
                  <div className="space-y-4">
                    <textarea
                      value={studentResponse}
                      onChange={(e) => setStudentResponse(e.target.value)}
                      placeholder="请结合法理和案例事实，阐述您的观点..."
                      className="w-full h-32 border border-gray-300 rounded-lg p-3 text-sm"
                    />
                    <div className="flex gap-3">
                      <Button onClick={() => sendChatMessage(studentResponse)}>
                        <Send className="w-4 h-4 mr-2" />
                        提交回答
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMicEnabled(!micEnabled)}
                        className={micEnabled ? "bg-red-50 border-red-200" : ""}
                      >
                        {micEnabled ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                        {micEnabled ? "关闭麦克风" : "开启麦克风"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="p-4">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                    <Hand className="w-4 h-4 mr-2" />
                    举手发言 ({raisedHands.length})
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {raisedHands.map((student, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <span className="text-sm">{student}</span>
                        <Button size="sm" variant="outline" onClick={() => setSelectedStudent(student)}>
                          选中
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full mt-3"
                    size="sm"
                    onClick={() => handleRaiseHand(mockStudents[Math.floor(Math.random() * mockStudents.length)])}
                  >
                    模拟学生举手
                  </Button>
                </Card>

                <Card className="p-4">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    课堂讨论
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {classroomChat.map((chat) => (
                      <div key={chat.id} className="p-2 bg-gray-50 rounded text-xs">
                        <div className="font-medium text-gray-800">{chat.student}</div>
                        <div className="text-gray-600">{chat.message}</div>
                        <div className="text-gray-400 text-xs">{chat.timestamp}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-bold text-gray-800 mb-3">在线学生 (24人)</h3>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {mockStudents.map((student, index) => (
                      <div
                        key={index}
                        className={`p-1 rounded text-center ${
                          selectedStudent === student
                            ? "bg-blue-100 text-blue-800"
                            : raisedHands.includes(student)
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {student}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )

      case "act6":
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
                      房价正常波动不构成情势变更。当事人应当按照合同约定全面履行义务，不得以房价上涨为由拒绝履行。
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-800 mb-2">法律适用</h4>
                    <p className="text-gray-700 leading-relaxed">
                      依据《民法典》第509条、第533条的规定，结合本案具体情况，判决被告继续履行合同义务。
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-800 mb-2">学习要点</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>情势变更制度的适用条件</li>
                      <li>合同履行中的风险承担原则</li>
                      <li>房屋买卖合同的特殊性</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Trophy className="w-4 h-4 mr-2" />
                    完成学习
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">法学AI教学系统</h1>
              <p className="text-sm text-gray-600">基于苏力教授教学理念设计</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">教学模式</Badge>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {sevenActs.map((act, index) => (
              <div
                key={act.id}
                className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                  index === currentAct
                    ? "bg-blue-100 text-blue-800"
                    : index < currentAct
                      ? "bg-green-100 text-green-800"
                      : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setCurrentAct(index)}
              >
                <act.icon className="w-4 h-4" />
                <span className="text-sm font-medium hidden lg:block">{act.name}</span>
                <span className="text-sm font-medium lg:hidden">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">{renderActContent()}</div>

          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setCurrentAct(Math.max(currentAct - 1, 0))}
                  variant="outline"
                  disabled={currentAct === 0}
                >
                  上一步
                </Button>
                <Button
                  onClick={() => setCurrentAct(Math.min(currentAct + 1, sevenActs.length - 1))}
                  disabled={currentAct >= sevenActs.length - 1}
                >
                  下一步
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <span className="text-sm text-gray-600">{sevenActs[currentAct].description}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Hand className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-gray-600">举手: {raisedHands.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">讨论: {classroomChat.length}</span>
                </div>
                <span className="text-sm text-gray-600">在线学生: 24人</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
