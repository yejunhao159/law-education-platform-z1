'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TimelineEvent } from '@/types/timeline-claim-analysis'
import {
  Scale,
  User,
  Shield,
  Gavel,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock
} from 'lucide-react'

interface BurdenOfProofBadgeProps {
  burdenOfProof: NonNullable<TimelineEvent['burdenOfProof']>
  compact?: boolean
  interactive?: boolean
  className?: string
}

export function BurdenOfProofBadge({
  burdenOfProof,
  compact = false,
  interactive = false,
  className
}: BurdenOfProofBadgeProps) {
  const [expanded, setExpanded] = useState(false)

  // 获取当事人角色图标
  const getPartyIcon = (party: string) => {
    switch (party.toLowerCase()) {
      case '原告':
      case 'plaintiff':
        return <User className="w-3 h-3" />
      case '被告':
      case 'defendant':
        return <Shield className="w-3 h-3" />
      case '第三人':
      case 'third-party':
        return <Gavel className="w-3 h-3" />
      default:
        return <Scale className="w-3 h-3" />
    }
  }

  // 获取当事人角色颜色
  const getPartyColor = (party: string) => {
    switch (party.toLowerCase()) {
      case '原告':
      case 'plaintiff':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-300'
        }
      case '被告':
      case 'defendant':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          border: 'border-orange-300'
        }
      case '第三人':
      case 'third-party':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          border: 'border-purple-300'
        }
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-300'
        }
    }
  }

  // 获取证明标准描述
  const getStandardDescription = (standard: string) => {
    switch (standard) {
      case 'preponderance':
        return {
          label: '优势证据',
          description: '证据的证明力占优势即可',
          icon: <Scale className="w-3 h-3" />
        }
      case 'clear-and-convincing':
        return {
          label: '清楚和令人信服',
          description: '证据需要达到高度可信的程度',
          icon: <CheckCircle className="w-3 h-3" />
        }
      case 'beyond-reasonable-doubt':
        return {
          label: '排除合理怀疑',
          description: '证据需要排除一切合理怀疑',
          icon: <FileCheck className="w-3 h-3" />
        }
      default:
        return {
          label: standard,
          description: '根据法律规定的证明标准',
          icon: <Scale className="w-3 h-3" />
        }
    }
  }

  // 获取满足状态样式
  const getSatisfactionStyle = () => {
    if (burdenOfProof.satisfied === true) {
      return {
        icon: <CheckCircle className="w-3 h-3 text-green-600" />,
        badge: 'bg-green-100 text-green-800 border-green-300',
        label: '已满足'
      }
    } else if (burdenOfProof.satisfied === false) {
      return {
        icon: <XCircle className="w-3 h-3 text-red-600" />,
        badge: 'bg-red-100 text-red-800 border-red-300',
        label: '未满足'
      }
    } else {
      return {
        icon: <AlertTriangle className="w-3 h-3 text-yellow-600" />,
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        label: '待确定'
      }
    }
  }

  const partyColor = getPartyColor(burdenOfProof.party)
  const standardInfo = getStandardDescription(burdenOfProof.standard)
  const satisfactionStyle = getSatisfactionStyle()

  // 紧凑模式
  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1", className)}>
        <Badge 
          className={cn(
            "text-xs px-2 py-1 border",
            partyColor.bg,
            partyColor.text,
            partyColor.border
          )}
        >
          {getPartyIcon(burdenOfProof.party)}
          <span className="ml-1">{burdenOfProof.party}</span>
        </Badge>
        {satisfactionStyle.icon}
      </div>
    )
  }

  // 完整模式
  return (
    <motion.div 
      className={cn(
        "p-3 rounded-lg border-2 bg-white shadow-sm",
        partyColor.border,
        className
      )}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 主要信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded border",
            partyColor.bg,
            partyColor.text,
            partyColor.border
          )}>
            {getPartyIcon(burdenOfProof.party)}
            <span className="text-xs font-medium">{burdenOfProof.party}</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Scale className="w-3 h-3" />
            <span>举证责任</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs border", satisfactionStyle.badge)}>
            {satisfactionStyle.icon}
            <span className="ml-1">{satisfactionStyle.label}</span>
          </Badge>
          
          {interactive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 w-6 p-0"
            >
              {expanded ? 
                <ChevronUp className="w-3 h-3" /> : 
                <ChevronDown className="w-3 h-3" />
              }
            </Button>
          )}
        </div>
      </div>

      {/* 证明标准 */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-700">
        {standardInfo.icon}
        <span className="font-medium">证明标准：</span>
        <span>{standardInfo.label}</span>
      </div>

      {/* 相关证据概览 */}
      {burdenOfProof.evidence.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
            <FileText className="w-3 h-3" />
            <span>现有证据 ({burdenOfProof.evidence.length}项)</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {burdenOfProof.evidence.slice(0, expanded ? undefined : 3).map((evidence, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {evidence}
              </Badge>
            ))}
            {!expanded && burdenOfProof.evidence.length > 3 && (
              <Badge variant="outline" className="text-xs text-gray-500">
                +{burdenOfProof.evidence.length - 3} 更多
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* 展开详情 */}
      {expanded && interactive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-gray-200"
        >
          {/* 详细标准说明 */}
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              证明标准详情
            </h4>
            <p className="text-xs text-gray-600">{standardInfo.description}</p>
          </div>

          {/* 证据详情 */}
          {burdenOfProof.evidence.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                现有证据清单
              </h4>
              <div className="space-y-1">
                {burdenOfProof.evidence.map((evidence, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="text-gray-700">{evidence}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 举证建议 */}
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <h4 className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
              <FileCheck className="w-3 h-3" />
              举证建议
            </h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• 收集与争议事实直接相关的证据</p>
              <p>• 确保证据的真实性、合法性和关联性</p>
              <p>• 注意举证期限和程序要求</p>
              {burdenOfProof.satisfied === false && (
                <p className="text-red-700">• 当前证据可能不足，建议补强</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// 简化版举证责任标签
export function SimpleBurdenOfProofBadge({
  burdenOfProof,
  className
}: {
  burdenOfProof: NonNullable<TimelineEvent['burdenOfProof']>
  className?: string
}) {
  const partyColor = {
    '原告': 'bg-blue-100 text-blue-800 border-blue-300',
    '被告': 'bg-orange-100 text-orange-800 border-orange-300',
    '第三人': 'bg-purple-100 text-purple-800 border-purple-300'
  }[burdenOfProof.party] || 'bg-gray-100 text-gray-800 border-gray-300'

  const satisfactionIcon = burdenOfProof.satisfied === true ? 
    <CheckCircle className="w-3 h-3 text-green-600" /> :
    burdenOfProof.satisfied === false ?
    <XCircle className="w-3 h-3 text-red-600" /> :
    <AlertTriangle className="w-3 h-3 text-yellow-600" />

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Badge className={cn("text-xs border", partyColor)}>
        <Scale className="w-3 h-3 mr-1" />
        {burdenOfProof.party}
      </Badge>
      {satisfactionIcon}
    </div>
  )
}

// 举证责任组合显示
export function BurdenOfProofGroup({
  burdens,
  className
}: {
  burdens: NonNullable<TimelineEvent['burdenOfProof']>[]
  className?: string
}) {
  if (burdens.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {burdens.map((burden, idx) => (
        <SimpleBurdenOfProofBadge
          key={idx}
          burdenOfProof={burden}
        />
      ))}
    </div>
  )
}