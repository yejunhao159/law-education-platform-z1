/**
 * Act5 教师模式 - 苏格拉底式教学
 * 简化版本，专为教师使用设计
 */

'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import TeacherSocratic from '@/components/socratic/TeacherSocratic'
import { useCurrentCase, useTeachingStore } from '@/src/domains/stores'

export default function Act5TeacherMode() {
  const caseData = useCurrentCase()
  const { socraticData } = useTeachingStore()
  const [caseInfo, setCaseInfo] = useState<{
    title: string;
    facts: string[];
    laws: string[];
    dispute: string;
  } | null>(null)

  useEffect(() => {
    // 准备案例数据
    if (caseData) {
      const facts = caseData.timeline?.map(event => event.event).filter(Boolean) ||
                    ['暂无事实数据'];

      const laws = caseData.verdict?.liability?.map(l => l.legalBasis).filter(Boolean) ||
                   ['民法典相关条款'];

      const dispute = caseData.basicInfo?.caseNature ||
                      '案件争议焦点';

      const title = caseData.title ||
                    caseData.basicInfo?.caseNumber ||
                    '法律案例分析';

      setCaseInfo({
        title,
        facts: Array.isArray(facts) ? facts : [facts],
        laws: Array.isArray(laws) ? laws : [laws],
        dispute
      });
    } else {
      // 使用示例数据
      setCaseInfo({
        title: '合同纠纷示例案',
        facts: [
          '2023年6月15日，原告与被告签订买卖合同',
          '合同约定被告应于7月15日前支付货款100万元',
          '被告至今未支付任何款项',
          '原告多次催告无果'
        ],
        laws: [
          '民法典第563条 合同解除',
          '民法典第577条 违约责任',
          '民法典第579条 金钱债务履行'
        ],
        dispute: '被告未按期支付货款是否构成根本违约，原告是否有权解除合同'
      });
    }
  }, [caseData, extractedElements])

  if (!caseInfo) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          正在加载案例数据...
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 提示信息 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>教师模式</strong>：通过苏格拉底式提问引导学生深入思考。
          系统会根据您的提问提供智能建议，帮助您更好地进行法学思维训练。
        </AlertDescription>
      </Alert>

      {/* 主界面 */}
      <TeacherSocratic caseData={caseInfo} />
    </div>
  )
}