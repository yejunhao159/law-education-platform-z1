/**
 * 苏格拉底数据流验证脚本
 * @description 测试从案例导入到苏格拉底环节的完整数据流转
 * @author Sean - 2025
 */

import { convertLegalCaseToCaseInfo, validateCaseInfo, debugCaseConversion } from '../lib/utils/case-data-converter'
import type { LegalCase } from '../types/legal-case'

// 模拟LegalCase数据
const mockLegalCase: LegalCase = {
  id: 'test-case-001',
  basicInfo: {
    caseNumber: '(2024)京01民初123号',
    court: '北京市第一中级人民法院',
    judgeDate: '2024-09-15',
    caseType: '民事',
    judge: ['张法官', '李法官'],
    clerk: '王书记员',
    parties: {
      plaintiff: [
        { name: '张三', type: '自然人', attorney: ['律师甲'] }
      ],
      defendant: [
        { name: '李四', type: '自然人', attorney: ['律师乙'] }
      ]
    }
  },
  threeElements: {
    facts: {
      summary: '这是一起合同纠纷案件，涉及货物买卖合同的履行问题。',
      timeline: [
        {
          date: '2024-01-15',
          event: '双方签订买卖合同',
          importance: 'critical',
          actors: ['张三', '李四'],
          location: '北京市'
        },
        {
          date: '2024-02-01',
          event: '张三交付货物',
          importance: 'important',
          actors: ['张三'],
          location: '北京市'
        },
        {
          date: '2024-03-01',
          event: '李四拒绝支付货款',
          importance: 'critical',
          actors: ['李四'],
          location: '北京市'
        }
      ],
      keyFacts: [
        '合同约定货物质量标准为一等品',
        '实际交付货物存在质量瑕疵',
        '买方以质量问题为由拒绝付款'
      ],
      disputedFacts: [
        '货物是否符合合同约定的质量标准',
        '买方是否有权拒绝支付货款',
        '卖方是否应承担违约责任'
      ]
    },
    evidence: {
      items: [
        {
          id: 'evidence-001',
          name: '买卖合同',
          type: 'document',
          description: '双方签订的货物买卖合同原件',
          credibility: 90,
          relevance: 95,
          importance: 'critical'
        },
        {
          id: 'evidence-002',
          name: '质量检测报告',
          type: 'document',
          description: '第三方机构出具的货物质量检测报告',
          credibility: 85,
          relevance: 90,
          importance: 'important'
        }
      ],
      chains: [
        {
          id: 'chain-001',
          name: '合同履行证据链',
          items: ['evidence-001', 'evidence-002'],
          strength: 85
        }
      ]
    },
    reasoning: {
      legalClauses: [
        '《民法典》第563条',
        '《民法典》第582条',
        '《合同法司法解释》第8条'
      ],
      judgment: '判决被告李四支付货款50万元，驳回原告其他诉讼请求。',
      steps: [
        {
          id: 'step-001',
          type: 'fact-finding',
          content: '根据证据认定，货物确实存在质量问题。',
          legalBasis: ['evidence-002']
        },
        {
          id: 'step-002',
          type: 'legal-application',
          content: '但质量问题不足以构成根本违约，买方应当支付货款。',
          legalBasis: ['《民法典》第563条']
        }
      ]
    }
  },
  metadata: {
    extractedAt: '2024-09-17T10:00:00.000Z',
    confidence: 88,
    aiModel: 'deepseek-chat',
    processingTime: 1500,
    extractionMethod: 'hybrid',
    version: '1.0.0'
  }
} as any

async function testSocraticDataFlow() {
  console.log('🧪 开始测试苏格拉底数据流转...\n')

  try {
    // 第一步：测试数据转换
    console.log('📊 Step 1: 测试LegalCase到CaseInfo的转换')
    console.log('=' .repeat(50))

    const convertedCase = convertLegalCaseToCaseInfo(mockLegalCase)

    // 调试转换过程
    debugCaseConversion(mockLegalCase, convertedCase)

    console.log('\n✅ 数据转换成功！')

    // 第二步：验证数据完整性
    console.log('\n🔍 Step 2: 验证转换后数据完整性')
    console.log('=' .repeat(50))

    const validation = validateCaseInfo(convertedCase)

    console.log('验证结果:', {
      isValid: validation.isValid,
      missingFields: validation.missingFields,
      warningsCount: validation.warnings.length
    })

    if (validation.warnings.length > 0) {
      console.log('\n⚠️ 警告信息:')
      validation.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`)
      })
    }

    if (validation.missingFields.length > 0) {
      console.log('\n❌ 缺失字段:')
      validation.missingFields.forEach((field, index) => {
        console.log(`  ${index + 1}. ${field}`)
      })
    }

    // 第三步：检查关键字段映射
    console.log('\n🔗 Step 3: 检查关键字段映射')
    console.log('=' .repeat(50))

    const mappingCheck = {
      '案例ID': !!convertedCase.id,
      '案例标题': !!convertedCase.title,
      '事实列表': convertedCase.facts.length > 0,
      '争议焦点': convertedCase.disputes.length > 0,
      '证据信息': convertedCase.evidence && convertedCase.evidence.length > 0,
      '法条依据': convertedCase.laws && convertedCase.laws.length > 0,
      '时间线': convertedCase.timeline && convertedCase.timeline.length > 0,
      '当事人': !!convertedCase.parties
    }

    console.log('字段映射检查:')
    Object.entries(mappingCheck).forEach(([field, hasValue]) => {
      const status = hasValue ? '✅' : '❌'
      console.log(`  ${status} ${field}: ${hasValue}`)
    })

    // 第四步：模拟苏格拉底模块数据使用
    console.log('\n🎭 Step 4: 模拟苏格拉底模块数据使用')
    console.log('=' .repeat(50))

    // 模拟苏格拉底对话需要的数据
    const socraticData = {
      caseTitle: convertedCase.title,
      factCount: convertedCase.facts.length,
      disputeCount: convertedCase.disputes.length,
      hasEvidence: !!convertedCase.evidence && convertedCase.evidence.length > 0,
      timelineEvents: convertedCase.timeline?.length || 0,
      canStartDialogue: convertedCase.facts.length > 0 && convertedCase.disputes.length > 0
    }

    console.log('苏格拉底模块可用数据:')
    console.log(`  📋 案例标题: ${socraticData.caseTitle}`)
    console.log(`  📝 事实数量: ${socraticData.factCount}`)
    console.log(`  ⚖️ 争议数量: ${socraticData.disputeCount}`)
    console.log(`  📁 证据可用: ${socraticData.hasEvidence ? '是' : '否'}`)
    console.log(`  ⏰ 时间线事件: ${socraticData.timelineEvents}`)
    console.log(`  🚀 可开始对话: ${socraticData.canStartDialogue ? '是' : '否'}`)

    // 最终结果
    console.log('\n🎉 Step 5: 测试结果总结')
    console.log('=' .repeat(50))

    const overallResult = {
      conversionSuccess: true,
      validationPassed: validation.isValid,
      criticalFieldsMapped: mappingCheck['事实列表'] && mappingCheck['争议焦点'],
      readyForSocratic: socraticData.canStartDialogue
    }

    console.log('测试结果总结:')
    console.log(`  ✅ 数据转换: ${overallResult.conversionSuccess ? '成功' : '失败'}`)
    console.log(`  ✅ 数据验证: ${overallResult.validationPassed ? '通过' : '失败'}`)
    console.log(`  ✅ 关键字段: ${overallResult.criticalFieldsMapped ? '已映射' : '缺失'}`)
    console.log(`  ✅ 苏格拉底就绪: ${overallResult.readyForSocratic ? '是' : '否'}`)

    const allTestsPassed = Object.values(overallResult).every(result => result === true)

    if (allTestsPassed) {
      console.log('\n🎊 恭喜！数据流转测试全部通过！')
      console.log('苏格拉底模块现在应该能够正常接收和使用案例数据了。')
    } else {
      console.log('\n⚠️ 部分测试未通过，需要进一步检查。')
    }

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error)
    console.log('\n🔧 建议检查:')
    console.log('  1. 数据类型定义是否一致')
    console.log('  2. 转换函数是否正确处理所有字段')
    console.log('  3. 是否存在循环依赖或导入问题')
  }
}

// 运行测试
console.log('🚀 启动苏格拉底数据流转验证测试\n')
testSocraticDataFlow().then(() => {
  console.log('\n✨ 测试完成！')
}).catch(error => {
  console.error('\n💥 测试失败:', error)
})