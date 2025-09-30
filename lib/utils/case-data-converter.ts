/**
 * 案例数据转换工具
 * @description 统一LegalCase到CaseInfo的转换逻辑，避免重复代码
 * @author Sean - 2025
 */

import type { LegalCase } from '@/types/legal-case'
import type { CaseInfo } from '@/src/domains/socratic-dialogue/types'

/**
 * 将LegalCase转换为CaseInfo
 * @param legalCase LegalCase数据
 * @returns CaseInfo数据
 */
export function convertLegalCaseToCaseInfo(legalCase: LegalCase): CaseInfo {
  // 提取当事人信息
  const extractParties = () => {
    if (legalCase.basicInfo?.parties) {
      return {
        plaintiff: legalCase.basicInfo.parties.plaintiff?.map((p: any) => p.name) || [],
        defendant: legalCase.basicInfo.parties.defendant?.map((p: any) => p.name) || [],
        thirdParty: legalCase.basicInfo.parties.thirdParty?.map((p: any) => p.name) || []
      }
    }
    return undefined
  }

  // 提取事实列表
  const extractFacts = (): string[] => {
    const facts: string[] = []
    if (legalCase.threeElements?.facts) {
      if (legalCase.threeElements.facts.summary) {
        facts.push(legalCase.threeElements.facts.summary)
      }
      if (legalCase.threeElements.facts.keyFacts) {
        facts.push(...legalCase.threeElements.facts.keyFacts)
      }
      if (legalCase.threeElements.facts.timeline) {
        facts.push(...legalCase.threeElements.facts.timeline.map((t: any) => t.event))
      }
    }
    return facts.length > 0 ? facts : ['暂无事实信息']
  }

  // 提取争议焦点
  const extractDisputes = (): string[] => {
    return legalCase.threeElements?.facts?.disputedFacts || []
  }

  // 提取证据
  const extractEvidence = (): any[] => {
    return legalCase.threeElements?.evidence?.items || []
  }

  // 提取法条
  const extractLaws = (): string[] => {
    return legalCase.threeElements?.reasoning?.legalClauses || []
  }

  // 提取时间线
  const extractTimeline = () => {
    return legalCase.threeElements?.facts?.timeline || []
  }

  // 生成标题
  const generateTitle = (): string => {
    return legalCase.basicInfo?.caseNumber ||
           (legalCase as any).title ||
           '未命名案例'
  }

  // 生成描述
  const generateDescription = (): string => {
    return legalCase.threeElements?.facts?.summary ||
           (legalCase as any).summary ||
           '暂无案例描述'
  }

  // 转换数据
  const convertedCase: CaseInfo = {
    id: legalCase.id || 'case-' + Date.now(),
    title: generateTitle(),
    description: generateDescription(),
    type: (legalCase.basicInfo?.caseType as '民事' | '刑事' | '行政' | '执行') || '民事',
    caseNumber: legalCase.basicInfo?.caseNumber,
    court: legalCase.basicInfo?.court,
    judgeDate: legalCase.basicInfo?.judgeDate,
    facts: extractFacts(),
    disputes: extractDisputes(),
    evidence: extractEvidence(),
    laws: extractLaws(),
    judgment: legalCase.threeElements?.reasoning?.judgment,
    difficulty: 'medium',
    category: legalCase.basicInfo?.caseType || '民事案件',
    sourceText: (legalCase as any).fullText || '',
    timeline: extractTimeline(),
    parties: extractParties()
  }

  return convertedCase
}

/**
 * 验证转换后的数据完整性
 * @param caseInfo 转换后的CaseInfo
 * @returns 验证结果
 */
export function validateCaseInfo(caseInfo: CaseInfo): {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
} {
  const missingFields: string[] = []
  const warnings: string[] = []

  // 检查必需字段
  if (!caseInfo.id) missingFields.push('id')
  if (!caseInfo.facts || caseInfo.facts.length === 0) missingFields.push('facts')
  if (!caseInfo.disputes) warnings.push('disputes字段为空，可能影响苏格拉底对话质量')

  // 检查可选但重要的字段
  if (!caseInfo.title) warnings.push('缺少案例标题')
  if (!caseInfo.description) warnings.push('缺少案例描述')
  if (!caseInfo.evidence || caseInfo.evidence.length === 0) {
    warnings.push('缺少证据信息，可能影响深度分析')
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  }
}

/**
 * 调试用：打印转换详情
 * @param original 原始LegalCase数据
 * @param converted 转换后的CaseInfo数据
 */
export function debugCaseConversion(original: LegalCase, converted: CaseInfo) {
  console.group('🔍 案例数据转换调试')
  console.log('原始数据结构:', {
    hasBasicInfo: !!original.basicInfo,
    hasThreeElements: !!original.threeElements,
    factsSummary: original.threeElements?.facts?.summary?.substring(0, 50) + '...',
    timelineEvents: original.threeElements?.facts?.timeline?.length || 0,
    evidenceItems: original.threeElements?.evidence?.items?.length || 0
  })

  console.log('转换后数据:', {
    id: converted.id,
    title: converted.title,
    factsCount: converted.facts.length,
    disputesCount: converted.disputes.length,
    evidenceCount: converted.evidence?.length || 0,
    hasTimeline: !!converted.timeline && converted.timeline.length > 0
  })

  const validation = validateCaseInfo(converted)
  console.log('验证结果:', validation)

  console.groupEnd()
}