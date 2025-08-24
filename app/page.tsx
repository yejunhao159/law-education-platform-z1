"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ThreeElementsExtractor } from "@/components/ThreeElementsExtractor"
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
  Send,
  Eye,
  Heart,
  Lightbulb,
  QrCode,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowRight,
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
    title: "破冰式提问",
    subtitle: "消除心理障碍，从好奇开始",
    questions: [
      "这个案例中最让你感到意外的是什么？",
      "如果你是当事人，第一反应会是什么？",
      "这个故事让你想起了什么生活经历？",
    ],
    purpose: "建立基础认知，消除面子顾虑",
    icon: Eye,
    color: "blue",
    features: ["全程匿名提交", "正向标签鼓励", "展示多元观点"],
  },
  level2: {
    title: "事实澄清式提问",
    subtitle: "建立共同基础，确认事实",
    questions: ["我们能确认的事实有哪些？", "哪些信息还不够清楚？", "证据A和证据B是否矛盾？"],
    purpose: "梳理事实，建立共识基础",
    icon: FileText,
    color: "green",
    features: ["事实梳理工具", "集体智慧汇聚", "争议点可视化"],
  },
  level3: {
    title: "逻辑推理式提问",
    subtitle: "训练思辨能力，构建逻辑链",
    questions: ["如果A是真的，那么会推出什么结论？", "你的这个结论依据的前提是什么？", "还有其他可能的解释吗？"],
    purpose: "培养逻辑思维和推理能力",
    icon: Brain,
    color: "purple",
    features: ["推理链可视化", "假设检验工具", "多路径探索"],
  },
  level4: {
    title: "价值判断式提问",
    subtitle: "触及深层思考，探讨价值观",
    questions: ["你认为公平的标准是什么？", "如果这样判决，会对社会产生什么影响？", "法律正义和生活正义哪个更重要？"],
    purpose: "从个人经验到普遍原则",
    icon: Heart,
    color: "red",
    features: ["价值天平工具", "后果模拟器", "文化对比展示"],
  },
  level5: {
    title: "反思批判式提问",
    subtitle: "培养独立思维，挑战初始观点",
    questions: [
      "你最初的判断改变了吗？为什么？",
      "如果你要说服持反对意见的人，你的最强论据是什么？",
      "这个案例让你对什么法律概念产生了新的理解？",
    ],
    purpose: "深度反思，形成独立见解",
    icon: Lightbulb,
    color: "yellow",
    features: ["观点演变追踪", "论证强度分析", "概念理解深化"],
  },
}

interface ParsedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    caseNumber?: string;
    parties?: string;
    court?: string;
    date?: string;
  };
}

export default function LawTeachingSystem() {
  const [currentAct, setCurrentAct] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractedElements, setExtractedElements] = useState<any>(null)
  const [processingStage, setProcessingStage] = useState("")
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [timelinePosition, setTimelinePosition] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [studentResponse, setStudentResponse] = useState("")

  const [raisedHands, setRaisedHands] = useState<string[]>([])
  const [currentSocraticLevel, setCurrentSocraticLevel] = useState(1)
  const [classroomChat, setClassroomChat] = useState<
    Array<{ id: number; student: string; message: string; timestamp: string; level?: number }>
  >([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [votingActive, setVotingActive] = useState(false)
  const [votes, setVotes] = useState({ agree: 0, disagree: 0 })
  const [micEnabled, setMicEnabled] = useState(false)
  const [questionProgress, setQuestionProgress] = useState<number[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [studentThoughts, setStudentThoughts] = useState<Array<{ level: number; thought: string; student: string }>>([])
  const [anonymousMode, setAnonymousMode] = useState(true)
  const [factMatrix, setFactMatrix] = useState<Array<{ fact: string; status: "confirmed" | "disputed" | "unclear" }>>(
    [],
  )

  const [act4Tab, setAct4Tab] = useState("analysis")

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

  const handleFileUpload = (event: any) => {
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

  const startSocraticQuestion = (level: number) => {
    setCurrentSocraticLevel(level)
    setCurrentQuestionIndex(0)
    setQuestionProgress([...questionProgress, level])
  }

  const nextQuestion = () => {
    const currentLevel = socraticQuestions[`level${currentSocraticLevel}` as keyof typeof socraticQuestions]
    if (currentQuestionIndex < currentLevel.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const addStudentThought = (thought: string) => {
    const newThought = {
      level: currentSocraticLevel,
      thought,
      student: anonymousMode ? `匿名学生${Math.floor(Math.random() * 100)}` : selectedStudent || "当前学生",
    }
    setStudentThoughts([...studentThoughts, newThought])
  }

  const updateFactStatus = (fact: string, status: "confirmed" | "disputed" | "unclear") => {
    setFactMatrix((prev) => {
      const existing = prev.find((f) => f.fact === fact)
      if (existing) {
        return prev.map((f) => (f.fact === fact ? { ...f, status } : f))
      }
      return [...prev, { fact, status }]
    })
  }

  const renderActContent = () => {
    const act = sevenActs[currentAct]

    switch (act.id) {
      case "prologue":
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">判决书智能解析与三要素提取</h2>
              <p className="text-gray-600 text-lg">上传判决书文件，AI将自动提取事实认定、证据质证、法官说理三要素</p>
            </div>

            <div className="max-w-5xl mx-auto">
              <ThreeElementsExtractor />
            </div>
          </div>
        )

      case "act1":
        const elements = extractedElements?.data?.threeElements || mockCase.threeElements
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">案件要素分析</h2>
              <p className="text-gray-600">按照司法三段论结构分解案件</p>
              {extractedElements && (
                <Badge variant="outline" className="mt-2">
                  AI智能提取 • 置信度 {extractedElements.confidence}%
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Object.entries(elements).map(([key, element]: [string, any]) => (
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
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      {key === 'facts' ? '事实认定' : key === 'evidence' ? '证据质证' : '法官说理'}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {element.summary || element.content || '暂无内容'}
                    </p>

                    {selectedElement === key && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-700 mb-2">关键要素：</h4>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {key === 'facts' && element.keyFacts && element.keyFacts.slice(0, 3).map((fact: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {fact.substring(0, 20)}...
                            </Badge>
                          ))}
                          {key === 'evidence' && element.items && element.items.slice(0, 3).map((item: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {item.name}
                            </Badge>
                          ))}
                          {key === 'reasoning' && element.keyArguments && element.keyArguments.slice(0, 3).map((arg: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {arg.substring(0, 20)}...
                            </Badge>
                          ))}
                          {element.keywords && element.keywords.map((keyword: string, idx: number) => (
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
        const timeline = extractedElements?.data?.threeElements?.facts?.timeline || mockCase.timeline
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">案件事实梳理</h2>
              <p className="text-gray-600">按时间顺序重构案件发生过程</p>
              {extractedElements && (
                <Badge variant="outline" className="mt-2">
                  共 {timeline.length} 个关键事件
                </Badge>
              )}
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-4">
                {timeline.map((item: any, index: number) => (
                  <Card
                    key={index}
                    className={`p-4 border-l-4 transition-all duration-300 ${
                      item.importance === "critical" || item.importance === "关键" 
                        ? "border-l-red-500 bg-red-50" 
                        : item.importance === "important" || item.importance === "重要"
                        ? "border-l-yellow-500 bg-yellow-50"
                        : "border-l-gray-300 bg-gray-50"
                    } ${index <= timelinePosition ? "opacity-100" : "opacity-40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge 
                          variant={
                            item.importance === "critical" || item.importance === "关键" 
                              ? "destructive" 
                              : item.importance === "important" || item.importance === "重要"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {item.date}
                        </Badge>
                        <span className="font-medium text-gray-800">{item.event}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.actors && item.actors.length > 0 && (
                          <div className="flex gap-1">
                            {item.actors.map((actor: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {actor}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {item.type && (
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        )}
                        {(item.importance === "critical" || item.importance === "关键") && (
                          <Star className="w-4 h-4 text-yellow-500" />
                        )}
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
              <h2 className="text-3xl font-bold text-gray-800 mb-2">智能争议焦点提取</h2>
              <p className="text-gray-600">AI自动识别核心争议，平衡教学重点与法律焦点</p>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setAct4Tab("analysis")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    act4Tab === "analysis"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  争议焦点分析
                </button>
                <button
                  onClick={() => setAct4Tab("questions")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    act4Tab === "questions"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  问题链生成
                </button>
                <button
                  onClick={() => setAct4Tab("interaction")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    act4Tab === "interaction"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  互动参与
                </button>
              </div>

              {act4Tab === "analysis" && (
                <div className="grid grid-cols-3 gap-6">
                  {/* 判决书区域 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      判决书原文
                    </h3>
                    <div className="h-96 overflow-y-auto text-sm text-gray-700 leading-relaxed">
                      <div className="space-y-4">
                        <p className="bg-yellow-100 p-2 rounded">
                          <strong>争议焦点一：</strong>房价上涨是否构成情势变更，出卖人能否据此解除合同？
                        </p>
                        <p>
                          本院认为，情势变更是指合同成立以后，作为合同基础的客观情况发生了当事人在订立合同时无法预见的、不属于商业风险的重大变化...
                        </p>
                        <p className="bg-blue-100 p-2 rounded">
                          <strong>争议焦点二：</strong>出卖人拒绝履行过户义务的行为是否构成根本违约？
                        </p>
                        <p>
                          根据《民法典》第509条规定，当事人应当按照约定全面履行自己的义务。房价上涨属于正常的市场波动...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI分析结果 */}
                  <div className="col-span-2">
                    <Card className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <Target className="w-5 h-5 mr-2 text-blue-600" />
                        AI智能争议焦点分析
                      </h3>

                      <div className="space-y-4">
                        {[
                          {
                            focus: "情势变更的适用条件",
                            importance: 95,
                            teachingValue: 90,
                            keywords: ["客观情况变化", "不可预见", "非商业风险"],
                          },
                          {
                            focus: "合同履行义务的性质",
                            importance: 88,
                            teachingValue: 85,
                            keywords: ["全面履行", "根本违约", "继续履行"],
                          },
                          {
                            focus: "房价波动的法律性质",
                            importance: 82,
                            teachingValue: 95,
                            keywords: ["市场风险", "正常波动", "商业判断"],
                          },
                        ].map((item, index) => (
                          <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-800">{item.focus}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  法律重要性: {item.importance}%
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  教学价值: {item.teachingValue}%
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item.keywords.map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-600">平衡指数</span>
                                  <Progress value={(item.importance + item.teachingValue) / 2} className="h-2" />
                                </div>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => setAct4Tab("questions")}>
                                生成问题链
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {act4Tab === "questions" && (
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-purple-600" />
                    分层问题链生成工具
                  </h3>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <select className="border border-gray-300 rounded px-3 py-2 text-sm">
                        <option>情势变更的适用条件</option>
                        <option>合同履行义务的性质</option>
                        <option>房价波动的法律性质</option>
                      </select>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Sparkles className="w-4 h-4 mr-2" />
                        生成问题链
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {[
                        {
                          level: "破冰层",
                          question: "大家觉得房价上涨对买房人公平吗？",
                          type: "情感共鸣",
                          color: "bg-red-50 border-red-200",
                        },
                        {
                          level: "事实层",
                          question: "合同签订时双方对房价变化有什么约定？",
                          type: "事实澄清",
                          color: "bg-blue-50 border-blue-200",
                        },
                        {
                          level: "法理层",
                          question: "什么情况下可以适用情势变更原则？",
                          type: "概念理解",
                          color: "bg-green-50 border-green-200",
                        },
                        {
                          level: "应用层",
                          question: "本案是否符合情势变更的构成要件？",
                          type: "案例分析",
                          color: "bg-yellow-50 border-yellow-200",
                        },
                        {
                          level: "价值层",
                          question: "如何平衡合同自由与交易安全？",
                          type: "价值判断",
                          color: "bg-purple-50 border-purple-200",
                        },
                      ].map((item, index) => (
                        <div key={index} className={`p-4 border rounded-lg ${item.color}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs min-w-fit">
                                {item.level}
                              </Badge>
                              <span className="font-medium text-gray-800">{item.question}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.type}
                              </Badge>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setAct4Tab("interaction")}>
                              开始提问
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {act4Tab === "interaction" && (
                <div className="grid grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <QrCode className="w-5 h-5 mr-2" />
                      学生参与入口
                    </h3>
                    <div className="text-center space-y-4">
                      <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto">
                        <QrCode className="w-12 h-12 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">学生扫码参与讨论</p>
                        <Badge variant="outline" className="text-sm">
                          房间号: 2024-A1
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">24</div>
                        <div className="text-sm text-gray-600">已参与回答</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <Sparkles className="w-5 h-5 mr-2" />
                      AI实时分析
                    </h3>
                    <div className="space-y-4">
                      <div className="text-center space-y-2">
                        <div className="text-lg font-bold text-blue-600">合同自由</div>
                        <div className="text-sm font-medium text-green-600">市场风险</div>
                        <div className="text-base font-semibold text-purple-600">诚实信用</div>
                        <div className="text-sm text-gray-600">交易安全</div>
                        <div className="text-xs text-gray-500">情势变更</div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>支持情势变更</span>
                          <span className="font-medium">8人 (33%)</span>
                        </div>
                        <Progress value={33} className="h-2" />

                        <div className="flex items-center justify-between text-sm">
                          <span>反对情势变更</span>
                          <span className="font-medium">16人 (67%)</span>
                        </div>
                        <Progress value={67} className="h-2" />
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() => setAct4Tab("analysis")}
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        生成核心问题
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )

      case "act5":
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
                          第3层 - 法理层
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          概念理解
                        </Badge>
                      </div>
                      <p className="font-medium text-gray-800 mb-2">什么情况下可以适用情势变更原则？</p>
                      <p className="text-sm text-gray-600">教学目标：理解情势变更的构成要件和适用条件</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800 text-sm">层级进度</h4>
                      <div className="space-y-1">
                        {[
                          { level: "破冰层", completed: true },
                          { level: "事实层", completed: true },
                          { level: "法理层", completed: false, current: true },
                          { level: "应用层", completed: false },
                          { level: "价值层", completed: false },
                        ].map((item, index) => (
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
                      {[
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
                        { student: "王同学", message: "但是房价上涨不是很常见吗？", time: "14:24", type: "student" },
                        {
                          student: "老师",
                          message: "王同学提出了一个关键问题！大家觉得房价波动是否可预见？",
                          time: "14:25",
                          type: "teacher",
                        },
                      ].map((msg, index) => (
                        <div
                          key={index}
                          className={`flex gap-3 ${msg.type === "teacher" ? "bg-blue-100 p-2 rounded" : msg.type === "ai" ? "bg-green-100 p-2 rounded" : ""}`}
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
                      <Button
                        size="sm"
                        onClick={() => {
                          sendChatMessage(studentResponse)
                          setStudentResponse("")
                        }}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <Button size="sm" variant="outline" onClick={selectRandomStudent}>
                        <Users className="w-3 h-3 mr-1" />
                        随机选人
                      </Button>
                      <Button size="sm" variant="outline" onClick={startVoting}>
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
                        <h4 className="font-semibold text-gray-800 mb-2">实时投票：房价上涨是否构成情势变更？</h4>
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
