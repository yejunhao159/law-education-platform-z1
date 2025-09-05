#!/usr/bin/env node

/**
 * Quick Test Script for Legal Intelligence System
 * 快速测试脚本 - 验证核心功能
 */

import { DocumentPreprocessor } from '../lib/legal-intelligence/preprocessor'
import { RuleExtractor } from '../lib/legal-intelligence/rule-extractor'
import { SmartMerger } from '../lib/legal-intelligence/smart-merger'
import { ProvisionMapper } from '../lib/legal-intelligence/provision-mapper'
import { AIPromptOptimizer } from '../lib/legal-intelligence/prompt-optimizer'

// 测试文本
const testDocument = `
北京市朝阳区人民法院
民事判决书
(2024)京0105民初12345号

原告：张三，男，1980年1月1日出生，汉族，住北京市朝阳区XX路XX号
被告：李四贸易有限公司，住所地北京市海淀区XX路XX号
法定代表人：王五，该公司总经理

原告张三诉被告李四贸易有限公司民间借贷纠纷一案，本院于2024年3月15日立案受理。原告张三的诉讼请求：1.判令被告归还借款本金人民币100万元；2.判令被告支付利息5万元（按年利率8%计算）；3.诉讼费由被告承担。

事实和理由：2023年1月15日，原告与被告签订《借款合同》，约定被告向原告借款100万元，借款期限12个月，年利率8%。合同签订后，原告于2023年2月1日通过银行转账方式将100万元支付给被告。被告收到款项后出具了收条。

借款到期后，被告未按约定归还本金和利息。原告多次催要无果，故诉至法院。

被告辩称：确实收到原告100万元，但已经归还了30万元，剩余部分因经营困难暂时无法偿还。

本院查明：双方签订的《借款合同》真实有效。原告已履行了出借义务，被告应当按约定归还借款本息。被告主张已还款30万元，但未提供相应证据。

本院认为：根据《中华人民共和国民法典》第667条、第674条、第676条的规定，借款合同是借款人向贷款人借款，到期返还借款并支付利息的合同。本案中，原被告之间的借贷关系成立且合法有效，被告应当履行还款义务。

判决如下：
一、被告李四贸易有限公司于本判决生效之日起十日内归还原告张三借款本金100万元；
二、被告李四贸易有限公司于本判决生效之日起十日内支付原告张三利息5万元；
三、如被告未按期履行，应加倍支付迟延履行期间的债务利息。

案件受理费12000元，由被告负担。

如不服本判决，可在判决书送达之日起十五日内向本院递交上诉状。

审判长：赵法官
审判员：钱法官  
审判员：孙法官
2024年5月20日
书记员：周书记
`

console.log('🧪 法律智能系统快速测试\n')
console.log('━'.repeat(60))

// 测试计数器
let totalTests = 0
let passedTests = 0
let failedTests = 0

function runTest(name: string, testFunc: () => boolean | Promise<boolean>) {
  totalTests++
  try {
    const result = testFunc()
    if (result) {
      console.log(`✅ ${name}`)
      passedTests++
    } else {
      console.log(`❌ ${name}`)
      failedTests++
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error}`)
    failedTests++
  }
}

async function runTests() {
  console.log('\n📝 测试文档预处理器...\n')
  
  runTest('文档清理和标准化', () => {
    const doc = DocumentPreprocessor.processDocument(testDocument)
    return doc.cleanedText.length > 0 && !doc.cleanedText.includes('\u200B')
  })
  
  runTest('句子分割', () => {
    const doc = DocumentPreprocessor.processDocument(testDocument)
    return doc.sentences.length > 10
  })
  
  runTest('元数据提取', () => {
    const doc = DocumentPreprocessor.processDocument(testDocument)
    return doc.metadata.court === '北京市朝阳区人民法院' &&
           doc.metadata.caseNumber === '(2024)京0105民初12345号'
  })
  
  console.log('\n🔍 测试规则提取器...\n')
  
  runTest('日期提取', () => {
    const dates = RuleExtractor.extractDates(testDocument)
    const hasFilingDate = dates.some(d => d.date === '2024-03-15' && d.type === 'filing')
    const hasJudgmentDate = dates.some(d => d.date === '2024-05-20')
    return dates.length >= 5 && hasFilingDate && hasJudgmentDate
  })
  
  runTest('当事人提取', () => {
    const parties = RuleExtractor.extractParties(testDocument)
    const hasPlaintiff = parties.some(p => p.name === '张三' && p.type === 'plaintiff')
    const hasDefendant = parties.some(p => p.name.includes('李四贸易') && p.type === 'defendant')
    const hasLegalRep = parties.some(p => p.legalRepresentative === '王五')
    return parties.length >= 2 && hasPlaintiff && hasDefendant
  })
  
  runTest('金额提取', () => {
    const amounts = RuleExtractor.extractAmounts(testDocument)
    const hasPrincipal = amounts.some(a => a.value === 1000000 && a.type === 'principal')
    const hasInterest = amounts.some(a => a.value === 50000 || (a.value === 8 && a.type === 'interest'))
    return amounts.length >= 2 && hasPrincipal
  })
  
  runTest('法律条款提取', () => {
    const clauses = RuleExtractor.extractLegalClauses(testDocument)
    const hasCivilCode = clauses.some(c => c.source === '中华人民共和国民法典')
    const hasArticle667 = clauses.some(c => c.article === '667')
    return clauses.length >= 1 && hasCivilCode
  })
  
  runTest('事实提取', () => {
    const facts = RuleExtractor.extractFacts(testDocument)
    const hasClaimedFacts = facts.some(f => f.type === 'claimed')
    const hasProvenFacts = facts.some(f => f.type === 'proven')
    return facts.length >= 3 && (hasClaimedFacts || hasProvenFacts)
  })
  
  console.log('\n🤖 测试AI提示优化器...\n')
  
  runTest('生成日期提取提示', () => {
    const prompt = AIPromptOptimizer.generateExtractionPrompt('date', '测试文本')
    return prompt.includes('日期') && prompt.includes('ISO格式')
  })
  
  runTest('生成当事人提取提示', () => {
    const prompt = AIPromptOptimizer.generateExtractionPrompt('party', '测试文本')
    return prompt.includes('当事人') && prompt.includes('原告')
  })
  
  runTest('修复JSON输出', () => {
    const badJson = '```json\n{"test": "value",}\n```'
    const fixed = AIPromptOptimizer.fixCommonIssues(badJson)
    return fixed && fixed.test === 'value'
  })
  
  console.log('\n🔄 测试智能合并器...\n')
  
  runTest('合并规则和AI结果', () => {
    const doc = DocumentPreprocessor.processDocument(testDocument)
    const ruleData = RuleExtractor.extract(doc)
    
    // 模拟AI数据（稍有不同）
    const aiData = {
      ...ruleData,
      source: 'ai' as const,
      confidence: 0.9,
      dates: [
        ...ruleData.dates,
        { date: '2024-06-01', type: 'deadline' as const, description: 'AI额外日期', importance: 'reference' as const, confidence: 0.7 }
      ]
    }
    
    const merged = SmartMerger.merge(ruleData, aiData)
    return merged.source === 'merged' && 
           merged.dates.length > ruleData.dates.length &&
           merged.confidence > 0.85
  })
  
  console.log('\n📚 测试法律条款映射器...\n')
  
  runTest('案件类型映射', () => {
    const provisions = ProvisionMapper.mapCaseTypeToProvisions('民间借贷纠纷')
    const hasArticle667 = provisions.some(p => p.article === '第667条')
    return provisions.length > 0 && hasArticle667
  })
  
  runTest('根据事实查找条款', () => {
    const facts = ['借款合同纠纷', '违约责任', '利息计算']
    const statutes = ProvisionMapper.findRelevantStatutes(facts)
    return statutes.length > 0
  })
  
  runTest('生成法律引用', () => {
    const doc = DocumentPreprocessor.processDocument(testDocument)
    const extractedData = RuleExtractor.extract(doc)
    const references = ProvisionMapper.generateLegalReferences(extractedData)
    return references.length > 0 && references.some(r => r.includes('民法典'))
  })
  
  console.log('\n🎯 测试完整流程...\n')
  
  runTest('端到端提取', () => {
    // 完整流程测试
    const doc = DocumentPreprocessor.processDocument(testDocument)
    const extracted = RuleExtractor.extract(doc)
    
    // 验证所有要素都被提取
    const hasAllElements = 
      extracted.dates.length > 0 &&
      extracted.parties.length > 0 &&
      extracted.amounts.length > 0 &&
      extracted.legalClauses.length > 0 &&
      extracted.facts.length > 0
    
    return hasAllElements
  })
  
  runTest('案件类型检测', () => {
    const doc = DocumentPreprocessor.processDocument(testDocument)
    const extracted = RuleExtractor.extract(doc)
    
    // 基于提取数据判断案件类型
    const hasLoan = extracted.amounts.some(a => a.type === 'principal')
    const expectedType = hasLoan ? '民间借贷纠纷' : '合同纠纷'
    
    return expectedType === '民间借贷纠纷'
  })
  
  console.log('\n' + '━'.repeat(60))
  console.log('\n📊 测试结果汇总\n')
  console.log(`总测试数: ${totalTests}`)
  console.log(`✅ 通过: ${passedTests}`)
  console.log(`❌ 失败: ${failedTests}`)
  console.log(`通过率: ${(passedTests / totalTests * 100).toFixed(1)}%`)
  
  if (failedTests === 0) {
    console.log('\n🎉 所有测试通过！法律智能系统运行正常。\n')
    process.exit(0)
  } else {
    console.log(`\n⚠️ ${failedTests} 个测试失败，请检查相关功能。\n`)
    process.exit(1)
  }
}

// 运行测试
runTests().catch(console.error)