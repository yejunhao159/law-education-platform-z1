/**
 * Rule Extractor Unit Tests
 * TDD测试 - 规则提取器
 */

import { RuleExtractor } from '../rule-extractor'
import { DocumentPreprocessor } from '../preprocessor'
import { ProcessedDocument, DateElement, Party, Amount } from '@/types/legal-intelligence'

describe('RuleExtractor', () => {
  
  const createProcessedDoc = (text: string): ProcessedDocument => {
    return DocumentPreprocessor.processDocument(text)
  }
  
  describe('extract - 完整提取', () => {
    it('应该提取所有类型的元素', () => {
      const text = `北京市朝阳区人民法院
民事判决书
(2024)京0105民初12345号

原告：张三，男，1980年1月1日出生
被告：李四贸易有限公司，法定代表人：王五

原告于2024年3月15日向本院提起诉讼，请求判令被告归还借款本金100万元及利息。
根据《中华人民共和国民法典》第667条，判决如下：
被告应于判决生效后10日内归还原告借款本金100万元。`
      
      const doc = createProcessedDoc(text)
      const result = RuleExtractor.extract(doc)
      
      expect(result.dates.length).toBeGreaterThan(0)
      expect(result.parties.length).toBeGreaterThan(0)
      expect(result.amounts.length).toBeGreaterThan(0)
      expect(result.legalClauses.length).toBeGreaterThan(0)
      expect(result.facts.length).toBeGreaterThan(0)
      expect(result.source).toBe('rule')
      expect(result.confidence).toBe(0.85)
    })
  })
  
  describe('extractDates - 日期提取', () => {
    it('应该提取标准格式日期', () => {
      const text = '原告于2024年3月15日提起诉讼，被告于2024年4月1日答辩。'
      const dates = RuleExtractor.extractDates(text)
      
      expect(dates).toHaveLength(2)
      expect(dates[0].date).toBe('2024-03-15')
      expect(dates[1].date).toBe('2024-04-01')
    })
    
    it('应该提取不同分隔符的日期', () => {
      const text = '合同签订于2024-03-15，履行日期2024/04/01。'
      const dates = RuleExtractor.extractDates(text)
      
      expect(dates).toHaveLength(2)
      expect(dates[0].date).toBe('2024-03-15')
      expect(dates[1].date).toBe('2024-04-01')
    })
    
    it('应该识别日期类型', () => {
      const text = '2024年3月15日立案，2024年5月20日判决。'
      const dates = RuleExtractor.extractDates(text)
      
      const filingDate = dates.find(d => d.type === 'filing')
      const judgmentDate = dates.find(d => d.type === 'judgment')
      
      expect(filingDate).toBeDefined()
      expect(filingDate?.date).toBe('2024-03-15')
      expect(judgmentDate).toBeDefined()
      expect(judgmentDate?.date).toBe('2024-05-20')
    })
    
    it('应该提取期限信息', () => {
      const text = '被告应在判决生效后10日内履行，合同期限为12个月。'
      const dates = RuleExtractor.extractDates(text)
      
      const deadlines = dates.filter(d => d.type === 'deadline')
      expect(deadlines.length).toBeGreaterThan(0)
    })
    
    it('应该评估日期重要性', () => {
      const text = '2024年3月15日起诉，2024年5月20日判决，2024年1月1日发生纠纷。'
      const dates = RuleExtractor.extractDates(text)
      
      const filingDate = dates.find(d => d.description?.includes('起诉'))
      const judgmentDate = dates.find(d => d.description?.includes('判决'))
      
      expect(filingDate?.importance).toBe('critical')
      expect(judgmentDate?.importance).toBe('critical')
    })
    
    it('应该去除重复日期', () => {
      const text = '2024年3月15日起诉，原告于2024年3月15日提交证据。'
      const dates = RuleExtractor.extractDates(text)
      
      const march15Dates = dates.filter(d => d.date === '2024-03-15')
      expect(march15Dates).toHaveLength(1)
    })
    
    it('应该按时间顺序排序', () => {
      const text = '2024年5月判决，2024年3月起诉，2024年1月签订合同。'
      const dates = RuleExtractor.extractDates(text)
      
      expect(dates[0].date).toBe('2024-01-01')
      expect(dates[1].date).toBe('2024-03-01')
      expect(dates[2].date).toBe('2024-05-01')
    })
  })
  
  describe('extractParties - 当事人提取', () => {
    it('应该提取原告和被告', () => {
      const text = '原告：张三，被告：李四'
      const parties = RuleExtractor.extractParties(text)
      
      expect(parties).toHaveLength(2)
      
      const plaintiff = parties.find(p => p.type === 'plaintiff')
      expect(plaintiff?.name).toBe('张三')
      expect(plaintiff?.role).toBe('原告')
      
      const defendant = parties.find(p => p.type === 'defendant')
      expect(defendant?.name).toBe('李四')
      expect(defendant?.role).toBe('被告')
    })
    
    it('应该提取公司信息', () => {
      const text = '被告：北京科技有限公司，法定代表人：王五'
      const parties = RuleExtractor.extractParties(text)
      
      const company = parties.find(p => p.name.includes('北京科技'))
      expect(company).toBeDefined()
      expect(company?.type).toBe('defendant')
      expect(company?.legalRepresentative).toBe('王五')
    })
    
    it('应该提取律师事务所', () => {
      const text = '委托代理人：张律师，北京律师事务所'
      const parties = RuleExtractor.extractParties(text)
      
      const lawFirm = parties.find(p => p.name.includes('律师事务所'))
      expect(lawFirm).toBeDefined()
      expect(lawFirm?.type).toBe('lawyer')
      expect(lawFirm?.role).toBe('律师事务所')
    })
    
    it('应该避免重复提取', () => {
      const text = '原告张三诉被告李四，张三要求李四赔偿。'
      const parties = RuleExtractor.extractParties(text)
      
      const zhangsan = parties.filter(p => p.name === '张三')
      const lisi = parties.filter(p => p.name === '李四')
      
      expect(zhangsan).toHaveLength(1)
      expect(lisi).toHaveLength(1)
    })
    
    it('应该正确分类公司类型', () => {
      const text = '原告：张三贸易有限公司，被告：李四科技股份有限公司'
      const parties = RuleExtractor.extractParties(text)
      
      const plaintiffCompany = parties.find(p => p.name.includes('张三贸易'))
      const defendantCompany = parties.find(p => p.name.includes('李四科技'))
      
      expect(plaintiffCompany?.type).toBe('plaintiff')
      expect(plaintiffCompany?.role).toBe('原告（公司）')
      expect(defendantCompany?.type).toBe('defendant')
      expect(defendantCompany?.role).toBe('被告（公司）')
    })
    
    it('应该分配唯一ID', () => {
      const text = '原告：张三，被告：李四，第三人：王五'
      const parties = RuleExtractor.extractParties(text)
      
      const ids = parties.map(p => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })
  
  describe('extractAmounts - 金额提取', () => {
    it('应该提取数字金额', () => {
      const text = '借款本金100万元，利息5000元'
      const amounts = RuleExtractor.extractAmounts(text)
      
      expect(amounts.length).toBeGreaterThanOrEqual(2)
      
      const principal = amounts.find(a => a.type === 'principal')
      expect(principal?.value).toBe(1000000)
      expect(principal?.currency).toBe('CNY')
    })
    
    it('应该正确转换万元单位', () => {
      const text = '赔偿金额50万元'
      const amounts = RuleExtractor.extractAmounts(text)
      
      expect(amounts[0].value).toBe(500000)
    })
    
    it('应该提取利率', () => {
      const text = '年利率8%，月利率0.5%'
      const amounts = RuleExtractor.extractAmounts(text)
      
      const yearRate = amounts.find(a => a.description?.includes('年'))
      const monthRate = amounts.find(a => a.description?.includes('月'))
      
      expect(yearRate?.value).toBe(8)
      expect(yearRate?.type).toBe('interest')
      expect(monthRate?.value).toBe(0.5)
    })
    
    it('应该提取违约金', () => {
      const text = '违约金10000元'
      const amounts = RuleExtractor.extractAmounts(text)
      
      const penalty = amounts.find(a => a.type === 'penalty')
      expect(penalty?.value).toBe(10000)
    })
    
    it('应该提取赔偿金', () => {
      const text = '赔偿损失30000元'
      const amounts = RuleExtractor.extractAmounts(text)
      
      const compensation = amounts.find(a => a.type === 'compensation')
      expect(compensation?.value).toBe(30000)
    })
    
    it('应该按金额大小排序', () => {
      const text = '本金10万元，利息1万元，违约金5万元'
      const amounts = RuleExtractor.extractAmounts(text)
      
      expect(amounts[0].value).toBeGreaterThanOrEqual(amounts[1].value)
      expect(amounts[1].value).toBeGreaterThanOrEqual(amounts[2].value)
    })
    
    it('应该处理带逗号的金额', () => {
      const text = '金额1,000,000元'
      const amounts = RuleExtractor.extractAmounts(text)
      
      expect(amounts[0].value).toBe(1000000)
    })
    
    it('应该处理小数金额', () => {
      const text = '金额12345.67元'
      const amounts = RuleExtractor.extractAmounts(text)
      
      expect(amounts[0].value).toBe(12345.67)
    })
  })
  
  describe('extractLegalClauses - 法律条款提取', () => {
    it('应该提取法律引用', () => {
      const text = '根据《中华人民共和国民法典》第465条'
      const clauses = RuleExtractor.extractLegalClauses(text)
      
      expect(clauses.length).toBeGreaterThan(0)
      expect(clauses[0].source).toBe('中华人民共和国民法典')
      expect(clauses[0].article).toBe('465')
    })
    
    it('应该提取司法解释', () => {
      const text = '最高人民法院关于审理民间借贷案件适用法律若干问题的规定'
      const clauses = RuleExtractor.extractLegalClauses(text)
      
      const judicial = clauses.find(c => c.type === 'judicial-interpretation')
      expect(judicial).toBeDefined()
    })
    
    it('应该提取合同条款', () => {
      const text = '根据合同第5条约定'
      const clauses = RuleExtractor.extractLegalClauses(text)
      
      const contract = clauses.find(c => c.type === 'contract')
      expect(contract).toBeDefined()
      expect(contract?.article).toBe('第5条')
    })
    
    it('应该评估条款重要性', () => {
      const text = '根据《民法典》第577条关于违约责任的规定'
      const clauses = RuleExtractor.extractLegalClauses(text)
      
      expect(clauses[0].importance).toBe('core')
    })
    
    it('应该避免重复条款', () => {
      const text = '《民法典》第465条规定，根据《民法典》第465条'
      const clauses = RuleExtractor.extractLegalClauses(text)
      
      const clause465 = clauses.filter(c => c.article === '465')
      expect(clause465).toHaveLength(1)
    })
  })
  
  describe('extractFacts - 事实提取', () => {
    it('应该提取原告主张', () => {
      const text = '原告诉称：被告欠款未还，要求返还本金。'
      const facts = RuleExtractor.extractFacts(text)
      
      const claim = facts.find(f => f.type === 'claimed' && f.party === '原告')
      expect(claim).toBeDefined()
    })
    
    it('应该提取被告抗辩', () => {
      const text = '被告辩称：已经归还部分款项。'
      const facts = RuleExtractor.extractFacts(text)
      
      const dispute = facts.find(f => f.type === 'disputed' && f.party === '被告')
      expect(dispute).toBeDefined()
    })
    
    it('应该提取法院查明事实', () => {
      const text = '本院查明：双方存在借贷关系。'
      const facts = RuleExtractor.extractFacts(text)
      
      const proven = facts.find(f => f.type === 'proven' && f.party === '法院')
      expect(proven).toBeDefined()
    })
    
    it('应该提取双方认可事实', () => {
      const text = '双方确认：合同于2024年1月1日签订。'
      const facts = RuleExtractor.extractFacts(text)
      
      const agreed = facts.find(f => f.type === 'agreed')
      expect(agreed).toBeDefined()
    })
    
    it('应该评估法律意义', () => {
      const text = '被告违约未按期还款，造成原告经济损失。'
      const facts = RuleExtractor.extractFacts(text)
      
      const breach = facts.find(f => f.legalSignificance === '违约事实')
      const damage = facts.find(f => f.legalSignificance === '损害结果')
      
      expect(breach || damage).toBeDefined()
    })
    
    it('应该限制事实内容长度', () => {
      const longText = '这是一个非常长的事实描述' + '内容'.repeat(200)
      const facts = RuleExtractor.extractFacts(longText)
      
      facts.forEach(fact => {
        expect(fact.content.length).toBeLessThanOrEqual(300)
      })
    })
  })
  
  describe('边界情况处理', () => {
    it('应该处理空文档', () => {
      const doc = createProcessedDoc('')
      const result = RuleExtractor.extract(doc)
      
      expect(result.dates).toHaveLength(0)
      expect(result.parties).toHaveLength(0)
      expect(result.amounts).toHaveLength(0)
      expect(result.legalClauses).toHaveLength(0)
      expect(result.facts).toHaveLength(0)
    })
    
    it('应该处理无法识别的文本', () => {
      const doc = createProcessedDoc('这是一段没有任何法律要素的普通文本。')
      const result = RuleExtractor.extract(doc)
      
      expect(result.source).toBe('rule')
      expect(result.confidence).toBe(0.85)
    })
    
    it('应该处理格式错误的日期', () => {
      const text = '2024年13月45日，2024年0月0日'
      const dates = RuleExtractor.extractDates(text)
      
      // 应该过滤掉无效日期
      dates.forEach(date => {
        const d = new Date(date.date)
        expect(d.toString()).not.toBe('Invalid Date')
      })
    })
  })
  
  describe('性能测试', () => {
    it('应该高效处理大文档', () => {
      const largeText = `
        原告张三诉被告李四借款合同纠纷一案。
        2024年1月1日签订合同，借款100万元，年利率8%。
        根据《民法典》第667条。
      `.repeat(100)
      
      const startTime = Date.now()
      const result = RuleExtractor.extract(createProcessedDoc(largeText))
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(500) // 500ms内完成
      expect(result.dates.length).toBeGreaterThan(0)
      expect(result.parties.length).toBeGreaterThan(0)
      expect(result.amounts.length).toBeGreaterThan(0)
    })
  })
})