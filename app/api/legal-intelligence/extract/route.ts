import { NextRequest, NextResponse } from 'next/server'
import { DocumentPreprocessor } from '@/lib/legal-intelligence/preprocessor'
import { RuleExtractor } from '@/lib/legal-intelligence/rule-extractor'
import { AIPromptOptimizer } from '@/lib/legal-intelligence/prompt-optimizer'
import { SmartMerger } from '@/lib/legal-intelligence/smart-merger'
import { ProvisionMapper } from '@/lib/legal-intelligence/provision-mapper'
import { ExtractedData } from '@/types/legal-intelligence'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

/**
 * 法律智能提取API
 */
export async function POST(req: NextRequest) {
  try {
    const { text, options = {} } = await req.json()
    
    if (!text) {
      return NextResponse.json(
        { error: '请提供要分析的文本' },
        { status: 400 }
      )
    }
    
    // 配置选项
    const {
      enableAI = true,
      elementType = 'all',
      enhanceWithProvisions = true,
      cacheEnabled = true
    } = options
    
    console.log('📊 开始法律智能提取...')
    
    // Step 1: 文档预处理
    console.log('Step 1: 文档预处理...')
    const processedDoc = DocumentPreprocessor.processDocument(text)
    
    // Step 2: 规则提取
    console.log('Step 2: 规则提取...')
    const ruleData = RuleExtractor.extract(processedDoc)
    
    // Step 3: AI提取（如果启用）
    let aiData: ExtractedData | null = null
    if (enableAI && DEEPSEEK_API_KEY) {
      console.log('Step 3: AI增强提取...')
      aiData = await performAIExtraction(processedDoc.cleanedText, elementType)
    }
    
    // Step 4: 智能合并
    console.log('Step 4: 智能合并结果...')
    let finalData: ExtractedData
    if (aiData) {
      finalData = SmartMerger.merge(ruleData, aiData, {
        strategy: 'confidence-based',
        aiWeight: 0.6,
        ruleWeight: 0.4
      })
    } else {
      finalData = ruleData
    }
    
    // Step 5: 法律条款增强
    if (enhanceWithProvisions) {
      console.log('Step 5: 法律条款增强...')
      
      // 检测案件类型
      const caseType = detectCaseType(finalData)
      
      // 映射相关法律条款
      const provisions = ProvisionMapper.mapCaseTypeToProvisions(caseType)
      
      // 基于事实查找额外条款
      const factTexts = finalData.facts.map(f => f.content)
      const additionalProvisions = ProvisionMapper.findRelevantStatutes(factTexts)
      
      // 增强现有法律条款
      finalData.legalClauses = ProvisionMapper.enhanceLegalClauses(finalData.legalClauses)
      
      // 生成法律引用
      let references: string[] = []
      try {
        references = ProvisionMapper.generateLegalReferences(finalData)
      } catch (refError) {
        console.error('生成法律引用失败:', refError)
        references = []
      }
      
      // 添加到结果
      (finalData as any).provisions = provisions
      (finalData as any).additionalProvisions = additionalProvisions
      (finalData as any).legalReferences = references
      (finalData as any).caseType = caseType
    }
    
    // Step 6: 生成分析建议
    const suggestions = generateSuggestions(finalData)
    
    console.log('✅ 法律智能提取完成')
    
    return NextResponse.json({
      success: true,
      data: finalData,
      metadata: {
        documentType: processedDoc.metadata.documentType,
        confidence: finalData.confidence,
        extractionMethod: aiData ? 'hybrid' : 'rule-based',
        processingTime: new Date().toISOString()
      },
      suggestions
    })
    
  } catch (error) {
    console.error('❌ 法律智能提取错误:', error)
    return NextResponse.json(
      { 
        error: '提取过程中发生错误',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

/**
 * 执行AI提取
 */
async function performAIExtraction(
  text: string,
  elementType: string
): Promise<ExtractedData | null> {
  try {
    // 生成优化的提示词
    const prompt = AIPromptOptimizer.generateExtractionPrompt(
      elementType as any,
      text
    )
    
    const systemPrompt = AIPromptOptimizer.getSystemPrompt(elementType as any)
    
    // 调用DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // 降低温度以获得更一致的输出
        max_tokens: 2000
      })
    })
    
    if (!response.ok) {
      console.error('AI API调用失败:', response.status)
      return null
    }
    
    const data = await response.json()
    const content = data.choices[0].message.content
    
    // 尝试修复和解析JSON
    const parsed = AIPromptOptimizer.fixCommonIssues(content)
    
    if (!parsed) {
      console.error('无法解析AI返回的JSON')
      return null
    }
    
    // 构造ExtractedData格式
    return {
      dates: parsed.dates || [],
      parties: parsed.parties || [],
      amounts: parsed.amounts || [],
      legalClauses: parsed.legalClauses || [],
      facts: parsed.facts || [],
      metadata: {
        uploadTime: new Date().toISOString(),
        documentType: 'unknown',
        extractionTime: new Date().toISOString(),
        extractionVersion: '1.0.0'
      },
      confidence: 0.8,
      source: 'ai'
    }
    
  } catch (error) {
    console.error('AI提取错误:', error)
    return null
  }
}

/**
 * 检测案件类型
 */
function detectCaseType(data: ExtractedData): string {
  // 基于提取的数据智能判断案件类型
  const hasLoan = data.amounts.some(a => 
    a.type === 'principal' || a.type === 'interest'
  )
  const hasContract = data.legalClauses.some(c => 
    c.type === 'contract'
  )
  const hasLabor = data.facts.some(f => 
    f.content.includes('工资') || f.content.includes('劳动')
  )
  
  if (hasLoan) return '民间借贷纠纷'
  if (hasLabor) return '劳动争议'
  if (hasContract) return '合同纠纷'
  
  return '民事纠纷'
}

/**
 * 生成建议
 */
function generateSuggestions(data: ExtractedData): string[] {
  const suggestions: string[] = []
  
  // 基于日期的建议
  const criticalDates = data.dates.filter(d => d.importance === 'critical')
  if (criticalDates.length > 0) {
    suggestions.push(`注意关键日期：${criticalDates.map(d => d.description).join('、')}`)
  }
  
  // 基于金额的建议
  const largeAmounts = data.amounts.filter(a => a.value > 100000)
  if (largeAmounts.length > 0) {
    suggestions.push(`涉及较大金额，建议重点审查相关证据`)
  }
  
  // 基于当事人的建议
  if (data.parties.filter(p => p.type === 'defendant').length > 1) {
    suggestions.push('多名被告，注意连带责任问题')
  }
  
  // 基于争议事实的建议
  const disputedFacts = data.facts.filter(f => f.type === 'disputed')
  if (disputedFacts.length > 0) {
    suggestions.push(`存在${disputedFacts.length}个争议事实，需要充分举证`)
  }
  
  // 基于法律条款的建议
  const coreClause = data.legalClauses.filter(c => c.importance === 'core')
  if (coreClause.length > 0) {
    suggestions.push(`重点研究核心法律条款：${coreClause[0].source || '相关法律'}`)
  }
  
  return suggestions
}