/**
 * 法学分析引擎 - 智能提取和分析案件中的法律要素
 */

export interface LegalAnalysis {
  legalRelation?: string      // 法律关系
  burdenOfProof?: string      // 举证责任
  limitation?: string         // 时效期间
  claims?: string[]          // 各方主张
  keyPoint?: string          // 关键法律点
  legalBasis?: string        // 法律依据
  rightsAndObligations?: {   // 权利义务
    plaintiff?: string[]
    defendant?: string[]
  }
}

export interface TimelineEventWithAnalysis {
  date: string
  event: string
  detail: string
  party?: string
  isKeyEvent?: boolean
  legalAnalysis?: LegalAnalysis
}

/**
 * 分析时间线事件的法律要素
 */
export function analyzeLegalElements(event: TimelineEventWithAnalysis): LegalAnalysis {
  const analysis: LegalAnalysis = {}
  const detail = event.detail?.toLowerCase() || ''
  const eventTitle = event.event?.toLowerCase() || ''
  
  // 1. 识别法律关系类型
  analysis.legalRelation = identifyLegalRelation(detail, eventTitle)
  
  // 2. 分析举证责任
  analysis.burdenOfProof = analyzeBurdenOfProof(detail, event.party)
  
  // 3. 计算时效期间
  analysis.limitation = calculateLimitation(detail, event.date)
  
  // 4. 提取各方主张
  analysis.claims = extractClaims(detail, event.party)
  
  // 5. 识别关键法律点
  analysis.keyPoint = identifyKeyLegalPoint(detail, eventTitle)
  
  // 6. 提取法律依据
  analysis.legalBasis = extractLegalBasis(detail)
  
  return analysis
}

/**
 * 识别法律关系类型
 */
function identifyLegalRelation(detail: string, eventTitle: string): string | undefined {
  const patterns = [
    { keywords: ['借款', '贷款', '借贷', '还款'], relation: '借贷关系' },
    { keywords: ['合同', '协议', '签订', '履行'], relation: '合同关系' },
    { keywords: ['买卖', '购买', '销售', '交付'], relation: '买卖关系' },
    { keywords: ['租赁', '出租', '承租', '租金'], relation: '租赁关系' },
    { keywords: ['侵权', '损害', '赔偿', '侵害'], relation: '侵权关系' },
    { keywords: ['劳动', '用工', '工资', '解除'], relation: '劳动关系' },
    { keywords: ['保证', '担保', '抵押', '质押'], relation: '担保关系' },
    { keywords: ['委托', '代理', '授权'], relation: '委托代理关系' },
    { keywords: ['赠与', '捐赠'], relation: '赠与关系' },
    { keywords: ['继承', '遗产', '遗嘱'], relation: '继承关系' }
  ]
  
  const combined = `${detail} ${eventTitle}`
  
  for (const pattern of patterns) {
    if (pattern.keywords.some(keyword => combined.includes(keyword))) {
      return pattern.relation
    }
  }
  
  return undefined
}

/**
 * 分析举证责任分配
 */
function analyzeBurdenOfProof(detail: string, party?: string): string | undefined {
  const proofKeywords = ['证明', '举证', '证据', '提供', '出示', '证实']
  
  if (proofKeywords.some(keyword => detail.includes(keyword))) {
    if (party) {
      return `${party}承担举证责任`
    }
    
    // 根据法律关系推断举证责任
    if (detail.includes('违约') || detail.includes('未履行')) {
      return '原告需证明合同关系及被告违约事实'
    }
    if (detail.includes('损害') || detail.includes('侵权')) {
      return '原告需证明损害事实及因果关系'
    }
    if (detail.includes('还款') || detail.includes('归还')) {
      return '被告需证明已履行还款义务'
    }
  }
  
  return undefined
}

/**
 * 计算时效期间
 */
function calculateLimitation(detail: string, eventDate?: string): string | undefined {
  // 提取时间期限
  const timePatterns = [
    /(\d+)年/,
    /(\d+)个?月/,
    /(\d+)[天日]/,
    /期限.*?(\d+)/
  ]
  
  for (const pattern of timePatterns) {
    const match = detail.match(pattern)
    if (match) {
      const number = match[1]
      const unit = match[0].replace(number, '').replace(/[个期限]/g, '')
      
      // 如果有事件日期，计算到期日
      if (eventDate) {
        const startDate = new Date(eventDate)
        let endDate = new Date(startDate)
        
        if (unit.includes('年')) {
          endDate.setFullYear(endDate.getFullYear() + parseInt(number))
        } else if (unit.includes('月')) {
          endDate.setMonth(endDate.getMonth() + parseInt(number))
        } else if (unit.includes('天') || unit.includes('日')) {
          endDate.setDate(endDate.getDate() + parseInt(number))
        }
        
        return `${number}${unit}（至${endDate.toISOString().split('T')[0]}）`
      }
      
      return `${number}${unit}`
    }
  }
  
  // 识别诉讼时效
  if (detail.includes('诉讼时效')) {
    if (detail.includes('三年')) return '3年诉讼时效'
    if (detail.includes('两年') || detail.includes('二年')) return '2年诉讼时效'
    if (detail.includes('一年')) return '1年诉讼时效'
  }
  
  return undefined
}

/**
 * 提取各方主张
 */
function extractClaims(detail: string, party?: string): string[] | undefined {
  const claims: string[] = []
  const claimKeywords = ['主张', '认为', '要求', '请求', '申请', '提出']
  
  // 分句处理
  const sentences = detail.split(/[。；]/)
  
  for (const sentence of sentences) {
    if (claimKeywords.some(keyword => sentence.includes(keyword))) {
      const claim = sentence.trim()
      if (claim && party) {
        claims.push(`${party}：${claim}`)
      } else if (claim) {
        claims.push(claim)
      }
    }
  }
  
  // 特定主张模式识别
  if (detail.includes('赔偿')) {
    const match = detail.match(/赔偿.*?(\d+[\d,]*\.?\d*)[元万]/)
    if (match) {
      claims.push(`要求赔偿${match[1]}元`)
    }
  }
  
  if (detail.includes('返还') || detail.includes('归还')) {
    claims.push('要求返还相关款项或财产')
  }
  
  if (detail.includes('解除') || detail.includes('撤销')) {
    claims.push('要求解除或撤销相关法律关系')
  }
  
  return claims.length > 0 ? claims : undefined
}

/**
 * 识别关键法律点
 */
function identifyKeyLegalPoint(detail: string, eventTitle: string): string | undefined {
  const keyPoints = [
    { keywords: ['违约', '未履行'], point: '合同违约责任' },
    { keywords: ['过错', '故意', '过失'], point: '过错责任认定' },
    { keywords: ['因果关系'], point: '因果关系认定' },
    { keywords: ['损失', '损害'], point: '损害赔偿计算' },
    { keywords: ['证据', '证明力'], point: '证据效力认定' },
    { keywords: ['管辖', '受理'], point: '管辖权确定' },
    { keywords: ['时效', '期限'], point: '时效问题' },
    { keywords: ['效力', '无效', '有效'], point: '法律行为效力' },
    { keywords: ['责任', '承担'], point: '责任承担方式' }
  ]
  
  const combined = `${detail} ${eventTitle}`
  
  for (const item of keyPoints) {
    if (item.keywords.some(keyword => combined.includes(keyword))) {
      return item.point
    }
  }
  
  return undefined
}

/**
 * 提取法律依据
 */
function extractLegalBasis(detail: string): string | undefined {
  const laws: string[] = []
  
  // 匹配法律条文引用
  const patterns = [
    /《([^》]+)》(?:第)?(\d+条)/g,
    /根据.*?《([^》]+)》/g,
    /依据.*?《([^》]+)》/g,
    /《([^》]+法)》/g
  ]
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(detail)) !== null) {
      if (match[2]) {
        laws.push(`《${match[1]}》第${match[2]}`)
      } else {
        laws.push(`《${match[1]}》`)
      }
    }
  }
  
  // 常见法律简称识别
  const commonLaws = [
    { keywords: ['合同法'], law: '《合同法》' },
    { keywords: ['民法典'], law: '《民法典》' },
    { keywords: ['民诉法', '民事诉讼法'], law: '《民事诉讼法》' },
    { keywords: ['劳动法'], law: '《劳动法》' },
    { keywords: ['劳动合同法'], law: '《劳动合同法》' },
    { keywords: ['侵权责任法'], law: '《侵权责任法》' },
    { keywords: ['担保法'], law: '《担保法》' },
    { keywords: ['公司法'], law: '《公司法》' }
  ]
  
  for (const item of commonLaws) {
    if (item.keywords.some(keyword => detail.includes(keyword))) {
      if (!laws.includes(item.law)) {
        laws.push(item.law)
      }
    }
  }
  
  return laws.length > 0 ? laws.join('、') : undefined
}

/**
 * 批量分析时间线事件
 */
export function analyzeTimelineEvents(events: TimelineEventWithAnalysis[]): TimelineEventWithAnalysis[] {
  return events.map(event => ({
    ...event,
    legalAnalysis: analyzeLegalElements(event)
  }))
}

/**
 * 生成法律分析摘要
 */
export function generateLegalSummary(events: TimelineEventWithAnalysis[]): string {
  const relations = new Set<string>()
  const keyPoints = new Set<string>()
  const laws = new Set<string>()
  
  for (const event of events) {
    if (event.legalAnalysis) {
      if (event.legalAnalysis.legalRelation) {
        relations.add(event.legalAnalysis.legalRelation)
      }
      if (event.legalAnalysis.keyPoint) {
        keyPoints.add(event.legalAnalysis.keyPoint)
      }
      if (event.legalAnalysis.legalBasis) {
        event.legalAnalysis.legalBasis.split('、').forEach(law => laws.add(law))
      }
    }
  }
  
  const summary: string[] = []
  
  if (relations.size > 0) {
    summary.push(`本案涉及的法律关系：${Array.from(relations).join('、')}`)
  }
  
  if (keyPoints.size > 0) {
    summary.push(`关键法律问题：${Array.from(keyPoints).join('、')}`)
  }
  
  if (laws.size > 0) {
    summary.push(`相关法律依据：${Array.from(laws).join('、')}`)
  }
  
  return summary.join('。')
}