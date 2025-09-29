/**
 * Document Preprocessor
 * 文档预处理器 - 负责文本清理、标准化和元数据提取
 */

import { 
  ProcessedDocument, 
  DocumentMetadata,
  ElementType 
} from '@/types/legal-intelligence'
import { COURT_PATTERNS } from './patterns'

/**
 * 文档预处理器类
 */
export class DocumentPreprocessor {
  /**
   * 处理文档主入口
   */
  static processDocument(text: string, fileName?: string): ProcessedDocument {
    // 添加空值检查
    if (!text || typeof text !== 'string') {
      console.warn('DocumentPreprocessor: 接收到无效文本，使用空字符串');
      text = '';
    }

    // 检测语言
    const language = this.detectLanguage(text)

    // 清理文本
    const cleanedText = this.cleanText(text)

    // 分句
    const sentences = this.splitIntoSentences(cleanedText)

    // 分段
    const paragraphs = this.splitIntoParagraphs(cleanedText)

    // 提取元数据
    const metadata = this.extractMetadata(text, fileName)

    return {
      originalText: text,
      cleanedText,
      sentences,
      paragraphs,
      metadata,
      language,
      encoding: 'UTF-8'
    }
  }
  
  /**
   * 清理文本
   */
  private static cleanText(text: string): string {
    // 添加空值检查
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text
      // 标准化空白字符
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\u00A0/g, ' ') // 非断行空格
      .replace(/\u3000/g, ' ') // 全角空格
      
      // 移除多余空格
      .replace(/ {2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      
      // 标准化标点符号
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/。{2,}/g, '。')
      .replace(/，{2,}/g, '，')
      
      // 移除特殊字符
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // 零宽字符
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 控制字符
      
      // 修正常见OCR错误
      .replace(/[０-９]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFEE0))
      .replace(/[Ａ-Ｚａ-ｚ]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFEE0))
      
      .trim()
  }
  
  /**
   * 分句
   */
  private static splitIntoSentences(text: string): string[] {
    // 添加空值检查
    if (!text || typeof text !== 'string') {
      return [];
    }
    // 中文句子分割
    const sentences = text
      .split(/[。！？；\n]/g)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    // 进一步处理长句
    const result: string[] = []
    for (const sentence of sentences) {
      if (sentence.length > 200) {
        // 对超长句子按逗号再分割
        const subSentences = sentence.split(/[，,]/g)
        if (subSentences.length > 1) {
          result.push(...subSentences.map(s => s.trim()).filter(s => s.length > 0))
        } else {
          result.push(sentence)
        }
      } else {
        result.push(sentence)
      }
    }
    
    return result
  }
  
  /**
   * 分段
   */
  private static splitIntoParagraphs(text: string): string[] {
    // 添加空值检查
    if (!text || typeof text !== 'string') {
      return [];
    }
    return text
      .split(/\n\n+/g)
      .map(p => p.trim())
      .filter(p => p.length > 0)
  }
  
  /**
   * 检测语言
   */
  private static detectLanguage(text: string): 'zh' | 'en' {
    // 计算中文字符比例
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || []
    const totalChars = text.replace(/\s/g, '').length
    
    if (totalChars === 0) return 'zh'
    
    const chineseRatio = chineseChars.length / totalChars
    return chineseRatio > 0.3 ? 'zh' : 'en'
  }
  
  /**
   * 提取文档元数据
   */
  private static extractMetadata(text: string, fileName?: string): DocumentMetadata {
    const metadata: DocumentMetadata = {
      fileName,
      uploadTime: new Date().toISOString(),
      documentType: this.detectDocumentType(text),
      extractionTime: new Date().toISOString(),
      extractionVersion: '1.0.0'
    }
    
    // 提取法院信息
    const courtMatches = [...text.matchAll(COURT_PATTERNS.COURT_NAME)]
    if (courtMatches.length > 0 && courtMatches[0][1]) {
      metadata.court = courtMatches[0][1]
    }
    
    // 提取案号
    const caseNumberMatch = text.match(COURT_PATTERNS.CASE_NUMBER)
    if (caseNumberMatch) {
      metadata.caseNumber = caseNumberMatch[0]
    }
    
    // 提取判决日期
    const judgeDateMatch = text.match(/判决日期[：:]?\s*(\d{4}年\d{1,2}月\d{1,2}日)/)
    if (judgeDateMatch) {
      metadata.judgeDate = this.normalizeDate(judgeDateMatch[1])
    }
    
    // 估算页数
    metadata.pageCount = Math.ceil(text.length / 1500) // 假设每页约1500字
    
    return metadata
  }
  
  /**
   * 检测文档类型
   */
  private static detectDocumentType(text: string): DocumentMetadata['documentType'] {
    const indicators = {
      judgment: ['判决如下', '本院认为', '审理终结', '判决书'],
      complaint: ['诉讼请求', '起诉状', '原告诉称', '事实与理由'],
      contract: ['甲方', '乙方', '签订合同', '合同编号', '条款如下'],
      evidence: ['证据', '证明', '公证', '鉴定意见']
    }
    
    for (const [type, keywords] of Object.entries(indicators)) {
      const matched = keywords.some(keyword => text.includes(keyword))
      if (matched) {
        return type as DocumentMetadata['documentType']
      }
    }
    
    return 'unknown'
  }
  
  /**
   * 标准化日期格式
   */
  private static normalizeDate(dateStr: string): string {
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
    if (match) {
      const [_, year, month, day] = match
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  }
  
  /**
   * 增强文本以便提取
   */
  static enhanceTextForExtraction(text: string, elementType?: ElementType): string {
    let enhanced = text
    
    // 根据元素类型进行特定增强
    switch (elementType) {
      case 'date':
        // 标准化日期表达
        enhanced = enhanced
          .replace(/去年/g, `${new Date().getFullYear() - 1}年`)
          .replace(/今年/g, `${new Date().getFullYear()}年`)
          .replace(/明年/g, `${new Date().getFullYear() + 1}年`)
          .replace(/上个?月/g, `${new Date().getMonth()}月`) // 简化处理
          .replace(/本月/g, `${new Date().getMonth() + 1}月`)
        break
        
      case 'party':
        // 增强当事人识别
        enhanced = enhanced
          .replace(/原告方/g, '原告')
          .replace(/被告方/g, '被告')
          .replace(/申请人/g, '原告')
          .replace(/被申请人/g, '被告')
        break
        
      case 'amount':
        // 标准化金额表达
        enhanced = enhanced
          .replace(/人民币/g, '')
          .replace(/元整/g, '元')
          .replace(/万元整/g, '万元')
        break
    }
    
    return enhanced
  }
  
  /**
   * 提取文档结构
   */
  static extractDocumentStructure(text: string): DocumentStructure {
    const structure: DocumentStructure = {
      header: '',
      sections: [],
      footer: ''
    }
    
    const lines = text.split('\n')
    let currentSection: Section | null = null
    let inHeader = true
    let inFooter = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 检测章节标题
      if (this.isSectionTitle(line)) {
        if (currentSection) {
          structure.sections.push(currentSection)
        }
        currentSection = {
          title: line,
          content: [],
          subsections: []
        }
        inHeader = false
      }
      // 检测页脚开始
      else if (this.isFooterStart(line)) {
        inFooter = true
        if (currentSection) {
          structure.sections.push(currentSection)
          currentSection = null
        }
      }
      // 添加内容到相应部分
      else if (inFooter) {
        structure.footer += line + '\n'
      } else if (inHeader && !currentSection) {
        structure.header += line + '\n'
      } else if (currentSection) {
        currentSection.content.push(line)
      }
    }
    
    // 添加最后一个章节
    if (currentSection) {
      structure.sections.push(currentSection)
    }
    
    return structure
  }
  
  /**
   * 判断是否为章节标题
   */
  private static isSectionTitle(line: string): boolean {
    const patterns = [
      /^第[一二三四五六七八九十]+[章节部分]/,
      /^[一二三四五六七八九十]+[、.．]/,
      /^[(（][一二三四五六七八九十\d]+[)）]/,
      /^(原告诉称|被告辩称|本院认为|本院查明|判决如下)/,
      /^(诉讼请求|事实[与和]理由|证据|法律依据)/
    ]
    
    return patterns.some(pattern => pattern.test(line))
  }
  
  /**
   * 判断是否为页脚开始
   */
  private static isFooterStart(line: string): boolean {
    const footerIndicators = [
      '审判长', '审判员', '书记员', 
      '年　　月　　日', '（院印）', '公告',
      '本判决', '如不服', '上诉'
    ]
    
    return footerIndicators.some(indicator => line.includes(indicator))
  }
  
  /**
   * 计算文本复杂度
   */
  static calculateComplexity(text: string): TextComplexity {
    const sentences = this.splitIntoSentences(text)
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    
    // 计算专业术语密度
    const legalTerms = this.countLegalTerms(text)
    const termDensity = legalTerms / text.length * 1000 // 每千字的术语数
    
    // 确定复杂度等级
    let level: 'low' | 'medium' | 'high'
    if (avgSentenceLength < 30 && termDensity < 10) {
      level = 'low'
    } else if (avgSentenceLength < 50 && termDensity < 20) {
      level = 'medium'
    } else {
      level = 'high'
    }
    
    return {
      level,
      avgSentenceLength,
      termDensity,
      totalSentences: sentences.length,
      totalCharacters: text.length
    }
  }
  
  /**
   * 统计法律术语
   */
  private static countLegalTerms(text: string): number {
    const legalTerms = [
      '原告', '被告', '诉讼', '判决', '证据', '法院',
      '合同', '违约', '赔偿', '责任', '权利', '义务',
      '法律', '规定', '条款', '起诉', '答辩', '审理'
    ]
    
    let count = 0
    for (const term of legalTerms) {
      const matches = text.match(new RegExp(term, 'g'))
      if (matches) {
        count += matches.length
      }
    }
    
    return count
  }
}

/**
 * 文档结构接口
 */
interface DocumentStructure {
  header: string
  sections: Section[]
  footer: string
}

/**
 * 章节接口
 */
interface Section {
  title: string
  content: string[]
  subsections: Section[]
}

/**
 * 文本复杂度接口
 */
interface TextComplexity {
  level: 'low' | 'medium' | 'high'
  avgSentenceLength: number
  termDensity: number
  totalSentences: number
  totalCharacters: number
}

export default DocumentPreprocessor