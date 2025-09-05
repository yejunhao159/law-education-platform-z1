/**
 * Document Preprocessor Unit Tests
 * TDD测试 - 文档预处理器
 */

import { DocumentPreprocessor } from '../preprocessor'
import { ProcessedDocument, DocumentMetadata } from '@/types/legal-intelligence'

describe('DocumentPreprocessor', () => {
  
  describe('processDocument', () => {
    it('应该正确处理基本文档', () => {
      const text = '原告张三诉被告李四借款合同纠纷一案。'
      const result = DocumentPreprocessor.processDocument(text)
      
      expect(result).toHaveProperty('originalText')
      expect(result).toHaveProperty('cleanedText')
      expect(result).toHaveProperty('sentences')
      expect(result).toHaveProperty('paragraphs')
      expect(result).toHaveProperty('metadata')
      expect(result).toHaveProperty('language')
      expect(result.language).toBe('zh')
    })
    
    it('应该清理多余空格和特殊字符', () => {
      const text = '原告  张三   诉\n\n\n被告李四。\u200B\u3000测试'
      const result = DocumentPreprocessor.processDocument(text)
      
      expect(result.cleanedText).not.toContain('  ')
      expect(result.cleanedText).not.toContain('\u200B')
      expect(result.cleanedText).not.toContain('\u3000')
      expect(result.cleanedText).not.toMatch(/\n{3,}/)
    })
    
    it('应该正确分句', () => {
      const text = '这是第一句。这是第二句！这是第三句？第四句；最后一句。'
      const result = DocumentPreprocessor.processDocument(text)
      
      expect(result.sentences).toHaveLength(5)
      expect(result.sentences[0]).toBe('这是第一句')
      expect(result.sentences[1]).toBe('这是第二句')
      expect(result.sentences[2]).toBe('这是第三句')
    })
    
    it('应该处理超长句子', () => {
      const longSentence = '这是一个' + '非常'.repeat(100) + '长的句子，' + '包含'.repeat(50) + '很多内容。'
      const result = DocumentPreprocessor.processDocument(longSentence)
      
      // 超长句子应该被分割
      result.sentences.forEach(sentence => {
        expect(sentence.length).toBeLessThanOrEqual(250)
      })
    })
    
    it('应该正确分段', () => {
      const text = '第一段内容。\n\n第二段内容。\n\n\n第三段内容。'
      const result = DocumentPreprocessor.processDocument(text)
      
      expect(result.paragraphs).toHaveLength(3)
      expect(result.paragraphs[0]).toBe('第一段内容。')
      expect(result.paragraphs[1]).toBe('第二段内容。')
      expect(result.paragraphs[2]).toBe('第三段内容。')
    })
    
    it('应该正确检测中文文档', () => {
      const chineseText = '这是中文文档内容'
      const result = DocumentPreprocessor.processDocument(chineseText)
      expect(result.language).toBe('zh')
    })
    
    it('应该正确检测英文文档', () => {
      const englishText = 'This is an English document with mostly English content.'
      const result = DocumentPreprocessor.processDocument(englishText)
      expect(result.language).toBe('en')
    })
    
    it('应该提取文档元数据', () => {
      const text = '北京市朝阳区人民法院\n民事判决书\n(2024)京0105民初12345号'
      const result = DocumentPreprocessor.processDocument(text, 'test.txt')
      
      expect(result.metadata.fileName).toBe('test.txt')
      expect(result.metadata.court).toBe('北京市朝阳区人民法院')
      expect(result.metadata.caseNumber).toBe('(2024)京0105民初12345号')
      expect(result.metadata.documentType).toBe('judgment')
    })
    
    it('应该检测判决书类型', () => {
      const text = '本院认为，原告的诉讼请求合理，判决如下：'
      const result = DocumentPreprocessor.processDocument(text)
      expect(result.metadata.documentType).toBe('judgment')
    })
    
    it('应该检测起诉状类型', () => {
      const text = '诉讼请求：1.要求被告返还借款。事实与理由：'
      const result = DocumentPreprocessor.processDocument(text)
      expect(result.metadata.documentType).toBe('complaint')
    })
    
    it('应该检测合同类型', () => {
      const text = '甲方：张三\n乙方：李四\n双方签订如下合同条款：'
      const result = DocumentPreprocessor.processDocument(text)
      expect(result.metadata.documentType).toBe('contract')
    })
    
    it('应该标准化全角字符', () => {
      const text = '０１２３４５６７８９ＡＢＣＤＥＦＧ'
      const result = DocumentPreprocessor.processDocument(text)
      expect(result.cleanedText).toBe('0123456789ABCDEFG')
    })
    
    it('应该标准化标点符号', () => {
      const text = '测试""引号\'\'和。。。多个句号，，，多个逗号'
      const result = DocumentPreprocessor.processDocument(text)
      
      expect(result.cleanedText).toBe('测试"引号\'和。多个句号，多个逗号')
    })
  })
  
  describe('enhanceTextForExtraction', () => {
    it('应该增强日期提取文本', () => {
      const text = '去年签订合同，今年履行，明年到期'
      const currentYear = new Date().getFullYear()
      const enhanced = DocumentPreprocessor.enhanceTextForExtraction(text, 'date')
      
      expect(enhanced).toContain(`${currentYear - 1}年`)
      expect(enhanced).toContain(`${currentYear}年`)
      expect(enhanced).toContain(`${currentYear + 1}年`)
    })
    
    it('应该增强当事人提取文本', () => {
      const text = '原告方张三，被告方李四，申请人王五，被申请人赵六'
      const enhanced = DocumentPreprocessor.enhanceTextForExtraction(text, 'party')
      
      expect(enhanced).toContain('原告张三')
      expect(enhanced).toContain('被告李四')
      expect(enhanced).toContain('原告王五')
      expect(enhanced).toContain('被告赵六')
    })
    
    it('应该增强金额提取文本', () => {
      const text = '人民币100万元整，美元5万元整'
      const enhanced = DocumentPreprocessor.enhanceTextForExtraction(text, 'amount')
      
      expect(enhanced).toContain('100万元')
      expect(enhanced).not.toContain('人民币')
      expect(enhanced).not.toContain('元整')
    })
  })
  
  describe('extractDocumentStructure', () => {
    it('应该提取文档结构', () => {
      const text = `北京市朝阳区人民法院
民事判决书

一、案件基本情况
原告张三诉被告李四

二、事实认定
经审理查明

三、判决如下
被告应返还原告借款

审判长：王法官
2024年1月1日`
      
      const structure = DocumentPreprocessor.extractDocumentStructure(text)
      
      expect(structure.header).toContain('北京市朝阳区人民法院')
      expect(structure.sections).toHaveLength(3)
      expect(structure.sections[0].title).toContain('案件基本情况')
      expect(structure.footer).toContain('审判长')
    })
    
    it('应该识别章节标题', () => {
      const text = `第一章 总则
内容1

第二节 具体规定  
内容2

三、其他事项
内容3`
      
      const structure = DocumentPreprocessor.extractDocumentStructure(text)
      expect(structure.sections).toHaveLength(3)
    })
  })
  
  describe('calculateComplexity', () => {
    it('应该计算文本复杂度', () => {
      const simpleText = '这是简单文本。很短。易懂。'
      const complexity = DocumentPreprocessor.calculateComplexity(simpleText)
      
      expect(complexity.level).toBe('low')
      expect(complexity.totalCharacters).toBe(simpleText.length)
      expect(complexity.totalSentences).toBe(3)
      expect(complexity.avgSentenceLength).toBeLessThan(10)
    })
    
    it('应该识别高复杂度文本', () => {
      const complexText = '原告张三与被告李四之间的借款合同纠纷一案，' +
        '根据《中华人民共和国民法典》第六百六十七条之规定，' +
        '结合最高人民法院关于审理民间借贷案件适用法律若干问题的规定第二十五条，' +
        '本院认为被告应当承担违约责任并支付逾期利息。'
      
      const complexity = DocumentPreprocessor.calculateComplexity(complexText)
      
      expect(complexity.level).toBe('high')
      expect(complexity.termDensity).toBeGreaterThan(10)
    })
    
    it('应该计算法律术语密度', () => {
      const legalText = '原告被告诉讼判决证据法院合同违约赔偿责任'
      const complexity = DocumentPreprocessor.calculateComplexity(legalText)
      
      expect(complexity.termDensity).toBeGreaterThan(0)
    })
  })
  
  describe('边界情况处理', () => {
    it('应该处理空文本', () => {
      const result = DocumentPreprocessor.processDocument('')
      
      expect(result.cleanedText).toBe('')
      expect(result.sentences).toHaveLength(0)
      expect(result.paragraphs).toHaveLength(0)
    })
    
    it('应该处理只有空格的文本', () => {
      const result = DocumentPreprocessor.processDocument('   \n\n  \t  ')
      
      expect(result.cleanedText).toBe('')
      expect(result.sentences).toHaveLength(0)
    })
    
    it('应该处理特殊字符', () => {
      const text = '测试\x00\x01\x02\x03内容'
      const result = DocumentPreprocessor.processDocument(text)
      
      expect(result.cleanedText).toBe('测试内容')
    })
    
    it('应该处理混合语言文档', () => {
      const text = '这是中文 This is English 又是中文'
      const result = DocumentPreprocessor.processDocument(text)
      
      // 中文占比更高应该识别为中文
      expect(result.language).toBe('zh')
    })
  })
  
  describe('性能测试', () => {
    it('应该在合理时间内处理大文档', () => {
      const largeText = '测试内容。'.repeat(10000) // 10000个句子
      
      const startTime = Date.now()
      const result = DocumentPreprocessor.processDocument(largeText)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // 应该在1秒内完成
      expect(result.sentences.length).toBeGreaterThan(0)
    })
  })
})