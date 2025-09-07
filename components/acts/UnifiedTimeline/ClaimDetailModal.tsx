'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { 
  ClaimDetailModalProps, 
  ClaimStructure, 
  ClaimElement 
} from '@/types/timeline-claim-analysis'
import {
  Target,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Scale,
  Lightbulb,
  TrendingUp,
  Clock,
  Users,
  Gavel,
  Brain,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Info,
  ExternalLink,
  Copy,
  Download
} from 'lucide-react'

export function ClaimDetailModal({
  claim,
  isOpen,
  onClose,
  onElementCheck
}: ClaimDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['elements']))
  const [interactiveMode, setInteractiveMode] = useState(false)

  // 计算请求权完成度
  const completionRate = useMemo(() => {
    if (!claim.elements || claim.elements.length === 0) return 0
    const satisfiedElements = claim.elements.filter(e => e.satisfied).length
    return Math.round((satisfiedElements / claim.elements.length) * 100)
  }, [claim.elements])

  // 获取结论样式
  const getConclusionStyle = () => {
    switch (claim.conclusion) {
      case 'established':
        return {
          badge: 'bg-green-100 text-green-800 border-green-300',
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: '请求权成立'
        }
      case 'partial':
        return {
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <AlertCircle className="w-4 h-4 text-yellow-600" />,
          text: '部分成立'
        }
      case 'failed':
        return {
          badge: 'bg-red-100 text-red-800 border-red-300',
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          text: '请求权不成立'
        }
      default:
        return {
          badge: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <AlertCircle className="w-4 h-4 text-gray-600" />,
          text: '待分析'
        }
    }
  }

  const conclusionStyle = getConclusionStyle()

  // 切换展开状态
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // 处理要件勾选
  const handleElementCheck = (elementIndex: number, satisfied: boolean) => {
    if (onElementCheck) {
      const element = claim.elements[elementIndex]
      onElementCheck(element.name, satisfied)
    }
  }

  // 复制法条内容
  const copyLegalText = (text: string) => {
    navigator.clipboard.writeText(text)
    // 这里可以添加toast通知
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                请求权详细分析
                <Badge className={conclusionStyle.badge}>
                  {conclusionStyle.icon}
                  <span className="ml-1">{conclusionStyle.text}</span>
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{claim.basis}</span>
                  {claim.type !== 'primary' && (
                    <Badge variant="outline" className="text-xs">
                      {claim.type === 'alternative' ? '备选请求权' : '附属请求权'}
                    </Badge>
                  )}
                  {claim.priority && (
                    <Badge variant="outline" className="text-xs">
                      优先级: {claim.priority}
                    </Badge>
                  )}
                </div>
              </DialogDescription>
            </div>
            
            {/* 完成度指示器 */}
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
              <div className="text-xs text-gray-500">构成要件满足度</div>
            </div>
          </div>

          {/* 进度条 */}
          <Progress value={completionRate} className="mt-3" />
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                概览
              </TabsTrigger>
              <TabsTrigger value="elements" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                构成要件
              </TabsTrigger>
              <TabsTrigger value="legal" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                法律条文
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                深度分析
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4">
              {/* 概览标签 */}
              <TabsContent value="overview" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {/* 基本信息 */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        请求权基础
                      </h3>
                      <p className="text-blue-800">{claim.basis}</p>
                      {claim.basisText && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="text-sm text-gray-700">{claim.basisText}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLegalText(claim.basisText!)}
                            className="mt-2 h-8"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            复制条文
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 推理过程 */}
                    {claim.reasoning && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          法律推理
                        </h3>
                        <p className="text-green-800 text-sm leading-relaxed">{claim.reasoning}</p>
                      </div>
                    )}

                    {/* 要件概览 */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        构成要件概览
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {claim.elements.map((element, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "p-3 rounded border flex items-center gap-2",
                              element.satisfied 
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-red-50 border-red-200 text-red-800"
                            )}
                          >
                            {element.satisfied ? 
                              <CheckCircle className="w-4 h-4" /> : 
                              <XCircle className="w-4 h-4" />
                            }
                            <span className="text-sm font-medium">{element.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* 构成要件标签 */}
              <TabsContent value="elements" className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">构成要件检验</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">交互模式</span>
                    <Switch
                      checked={interactiveMode}
                      onCheckedChange={setInteractiveMode}
                    />
                  </div>
                </div>

                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {claim.elements.map((element, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          element.satisfied 
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {element.satisfied ? 
                                <CheckCircle className="w-5 h-5 text-green-600" /> : 
                                <XCircle className="w-5 h-5 text-red-600" />
                              }
                              <h4 className="font-semibold">{element.name}</h4>
                              {interactiveMode && (
                                <Switch
                                  checked={element.satisfied}
                                  onCheckedChange={(checked) => handleElementCheck(idx, checked)}
                                />
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{element.description}</p>
                          </div>
                        </div>

                        {/* 证据列表 */}
                        {element.evidence.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              支撑证据
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {element.evidence.map((evidence, evidIdx) => (
                                <Badge key={evidIdx} variant="outline" className="text-xs">
                                  {evidence}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 分析说明 */}
                        {element.analysis && (
                          <div className="p-3 bg-white rounded border">
                            <h5 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              分析说明
                            </h5>
                            <p className="text-xs text-gray-600">{element.analysis}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* 法律条文标签 */}
              <TabsContent value="legal" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          {claim.basis}
                        </h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Copy className="w-3 h-3 mr-1" />
                            复制
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            查看原文
                          </Button>
                        </div>
                      </div>
                      
                      {claim.basisText ? (
                        <div className="p-4 bg-white rounded border">
                          <p className="text-gray-800 leading-relaxed">{claim.basisText}</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded border text-center text-gray-500">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">法条全文正在加载中...</p>
                        </div>
                      )}
                    </div>

                    {/* 相关法条 */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Gavel className="w-4 h-4" />
                        相关法律条文
                      </h3>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <p>• 《民法典》第577条 - 违约责任</p>
                          <p>• 《民法典》第585条 - 违约金</p>
                          <p>• 《合同法司法解释》第35条 - 违约金调整</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* 深度分析标签 */}
              <TabsContent value="analysis" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {/* 学理分析 */}
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        学理分析
                      </h3>
                      <div className="text-sm text-purple-800 space-y-2">
                        <p>• <strong>请求权性质</strong>：属于{claim.type === 'contractual' ? '合同请求权' : '其他请求权'}体系</p>
                        <p>• <strong>保护法益</strong>：旨在保护当事人的合法权益和交易安全</p>
                        <p>• <strong>适用范围</strong>：适用于相应的法律关系和争议情形</p>
                        <p>• <strong>限制条件</strong>：需要满足法定的构成要件和适用条件</p>
                      </div>
                    </div>

                    {/* 判例参考 */}
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        判例要旨
                      </h3>
                      <div className="text-sm text-yellow-800">
                        <p className="mb-2"><strong>典型案例</strong>：最高法院相关指导案例显示...</p>
                        <p className="mb-2"><strong>裁判要旨</strong>：构成要件的认定需要结合具体案情...</p>
                        <p><strong>实务要点</strong>：举证责任的分配和证明标准...</p>
                      </div>
                    </div>

                    {/* 风险提示 */}
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        实务提示
                      </h3>
                      <div className="text-sm text-orange-800 space-y-2">
                        <p>• <strong>举证要点</strong>：重点收集与构成要件相关的关键证据</p>
                        <p>• <strong>时效风险</strong>：注意诉讼时效期间和起算时点</p>
                        <p>• <strong>抗辩防范</strong>：预见可能的抗辩理由并做好应对</p>
                        <p>• <strong>救济途径</strong>：了解相关的法律救济方式和程序</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                完成度: {completionRate}%
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                要件数: {claim.elements.length}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                导出分析
              </Button>
              <Button onClick={onClose}>
                关闭
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}