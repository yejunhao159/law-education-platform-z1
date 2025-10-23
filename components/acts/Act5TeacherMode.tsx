/**
 * Act5 教师模式 - 苏格拉底式教学
 * 简化版本，专为教师使用设计
 */

'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import TeacherSocratic from '@/components/socratic/TeacherSocratic'
import { useCurrentCase } from '@/src/domains/stores'

interface Act5TeacherModeProps {
  mode?: 'edit' | 'review'  // 模式：编辑模式 | 只读模式
}

export default function Act5TeacherMode({ mode = 'edit' }: Act5TeacherModeProps) {
  const caseData = useCurrentCase()

  // 提供示例数据作为fallback
  const fallbackCase = {
    id: 'demo-case',
    basicInfo: {
      caseNumber: '合同纠纷示例案',
      court: '示例法院',
      judgeDate: '2023-12-01',
      caseType: '民事' as const,
      parties: {
        plaintiff: [{ name: '原告' }],
        defendant: [{ name: '被告' }]
      }
    },
    threeElements: {
      facts: {
        summary: '本案系买卖合同纠纷案件',
        timeline: [
          { date: '2023-06-15', event: '原告与被告签订买卖合同', title: '签订合同', importance: 'critical' as const },
          { date: '2023-07-15', event: '合同约定的付款期限', title: '付款期限', importance: 'critical' as const },
          { date: '2023-08-01', event: '被告至今未支付任何款项', title: '违约', importance: 'critical' as const },
          { date: '2023-08-15', event: '原告多次催告无果', title: '催告', importance: 'important' as const }
        ],
        keyFacts: [
          '双方于2023年6月15日签订买卖合同',
          '合同约定付款期限为2023年7月15日',
          '被告至今未支付任何款项',
          '原告多次催告无果'
        ],
        disputedFacts: [
          '被告是否收到催告函',
          '被告未付款是否有正当理由'
        ]
      },
      evidence: {
        summary: '原告提交买卖合同、催告函等证据',
        items: [
          {
            name: '买卖合同',
            type: '书证' as const,
            submittedBy: '原告' as const,
            description: '证明双方存在合同关系',
            accepted: true,
            courtOpinion: '证据真实有效，予以采纳'
          },
          {
            name: '催告函',
            type: '书证' as const,
            submittedBy: '原告' as const,
            description: '证明原告多次催告被告',
            accepted: true,
            courtOpinion: '证据真实有效，予以采纳'
          }
        ],
        chainAnalysis: {
          complete: true,
          missingLinks: [],
          strength: 'strong' as const,
          analysis: '证据形成完整证据链'
        }
      },
      reasoning: {
        summary: '被告逾期不履行付款义务构成违约',
        legalBasis: [
          {
            law: '民法典',
            article: '第563条',
            content: '有下列情形之一的，当事人可以解除合同',
            application: '被告逾期不支付货款构成根本违约，原告有权解除合同'
          },
          {
            law: '民法典',
            article: '第577条',
            content: '当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担违约责任',
            application: '被告应承担违约责任'
          }
        ],
        logicChain: [
          {
            premise: '双方签订买卖合同，约定付款期限',
            inference: '被告至今未支付，已超过约定期限',
            conclusion: '被告构成违约'
          }
        ],
        keyArguments: [
          '被告违约事实清楚',
          '原告有权解除合同',
          '被告应承担违约责任'
        ],
        judgment: '判决解除合同，被告承担违约责任'
      }
    },
    timeline: [
      { date: '2023-06-15', event: '原告与被告签订买卖合同', title: '签订合同', importance: 'critical' as const },
      { date: '2023-07-15', event: '合同约定的付款期限', title: '付款期限', importance: 'critical' as const },
      { date: '2023-08-01', event: '被告至今未支付任何款项', title: '违约', importance: 'critical' as const },
      { date: '2023-08-15', event: '原告多次催告无果', title: '催告', importance: 'important' as const }
    ],
    metadata: {
      extractedAt: new Date().toISOString(),
      confidence: 80,
      aiModel: 'demo',
      processingTime: 0,
      extractionMethod: 'manual' as const
    }
  }

  // 使用真实数据或fallback数据
  const activeCaseData = caseData || fallbackCase

  if (!activeCaseData) {
    return (
      <Card id="act5TeacherModeId" className="p-6">
        <div className="text-center text-gray-500">
          正在加载案例数据...
        </div>
      </Card>
    )
  }

  return (
    <div id="act5TeacherModeId" className="space-y-4">
      {/* 提示信息 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>教师模式</strong>：通过苏格拉底式提问引导学生深入思考。
          系统会根据您的提问提供智能建议，帮助您更好地进行法学思维训练。
          {!caseData && <span className="text-amber-600 ml-2">（当前使用示例案件数据）</span>}
        </AlertDescription>
      </Alert>

      {/* 主界面 - 传递完整的案件数据 */}
      <TeacherSocratic caseData={activeCaseData} mode={mode} />
    </div>
  )
}