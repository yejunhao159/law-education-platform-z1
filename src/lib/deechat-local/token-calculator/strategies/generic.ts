import { BaseTokenizerStrategy } from './base'
import { Provider, ModelInfo } from '../../types'

export class GenericTokenizer extends BaseTokenizerStrategy {
  constructor() {
    super(Provider.GENERIC)
  }

  protected initializeModels(): void {
    // 通用模型配置 - 用于未知模型的fallback
    this.modelConfig.set('generic', {
      provider: Provider.GENERIC,
      modelName: 'generic',
      maxTokens: 4096, // 保守估计
      pricing: {
        inputPrice: 0.01,  // 平均价格
        outputPrice: 0.02,
        currency: 'USD'
      }
    })

    // 添加法学教育平台常用模型配置
    this.modelConfig.set('legal-basic', {
      provider: Provider.GENERIC,
      modelName: 'legal-basic',
      maxTokens: 8192,
      pricing: {
        inputPrice: 0.008,
        outputPrice: 0.016,
        currency: 'USD'
      }
    })
  }

  count(text: string, model = 'generic'): number {
    const preprocessed = this.preprocessLegalText(text)
    return this.estimateTokens(preprocessed)
  }

  // 不支持编码/解码
  encode(text: string, model?: string): number[] {
    throw new Error('Generic tokenizer does not support token encoding - only approximate token counting is available')
  }

  decode(tokens: number[], model?: string): string {
    throw new Error('Generic tokenizer does not support token decoding - only approximate token counting is available')
  }

  // 核心估算算法 - 针对法律文档优化
  private estimateTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0
    }

    // 分析文本组成
    const analysis = this.analyzeText(text)

    // 基于不同字符类型的token估算
    let tokenCount = 0

    // 中文字符：法律文档中的中文，考虑法律术语的特殊性
    tokenCount += Math.ceil(analysis.chineseChars / 1.8) // 法律术语密度高，token分割更细

    // 日韩字符：类似中文
    tokenCount += Math.ceil(analysis.cjkChars / 2)

    // 英文单词：法律英文术语较长
    tokenCount += Math.ceil(analysis.englishWords * 0.8) // 法律英文术语平均更长

    // 数字：法条编号、案号、日期等
    tokenCount += analysis.numbers

    // 标点符号：法律文档标点密集
    tokenCount += Math.ceil(analysis.punctuation * 0.9) // 法律文档标点更重要

    // 法律特殊符号（条款号、法条引用等）
    tokenCount += analysis.legalSymbols

    // 特殊字符和emoji
    tokenCount += analysis.specialChars
    tokenCount += analysis.emojis

    // 空格处理
    tokenCount += analysis.whitespaceGroups

    return Math.max(1, tokenCount)
  }

  // 增强的文本分析 - 针对法律文档
  private analyzeText(text: string): LegalTextAnalysis {
    const analysis: LegalTextAnalysis = {
      chineseChars: 0,
      cjkChars: 0,
      englishWords: 0,
      numbers: 0,
      punctuation: 0,
      specialChars: 0,
      emojis: 0,
      whitespaceGroups: 0,
      legalSymbols: 0,
      legalTerms: 0,
      caseNumbers: 0,
      statuteReferences: 0
    }

    // 基础字符分析
    analysis.chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    analysis.cjkChars = (text.match(/[\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length
    analysis.englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    analysis.numbers = (text.match(/\d+/g) || []).length
    analysis.punctuation = (text.match(/[.,!?;:'"()\[\]{}\-_]/g) || []).length
    // 简化 emoji 检测 - 避免复杂的 Unicode 范围
    analysis.emojis = 0; // 暂时禁用 emoji 计数以避免兼容性问题
    analysis.whitespaceGroups = (text.match(/\s+/g) || []).length

    // 法律文档特有分析
    analysis.caseNumbers = (text.match(/\(\d{4}\).{0,20}第?\d+号/g) || []).length
    analysis.statuteReferences = (text.match(/第[零一二三四五六七八九十百千万\d]+条/g) || []).length
    analysis.legalSymbols = (text.match(/[《》〈〉【】§]/g) || []).length

    // 常见法律术语计数
    const legalTermsPattern = /(当事人|被告|原告|法院|判决|裁定|民法典|刑法|商法|合同|违约|侵权|损害赔偿|诉讼时效)/g
    analysis.legalTerms = (text.match(legalTermsPattern) || []).length

    // 其他特殊字符
    const totalMeasured = analysis.chineseChars + analysis.cjkChars +
      (text.match(/[a-zA-Z\d\s.,!?;:'"()\[\]{}\-_《》〈〉【】§]/g) || []).length + analysis.emojis
    analysis.specialChars = Math.max(0, text.length - totalMeasured)

    return analysis
  }

  // 获取详细的token估算信息 - 法律文档版
  getDetailedEstimate(text: string): LegalDetailedEstimate {
    const preprocessed = this.preprocessLegalText(text)
    const analysis = this.analyzeText(preprocessed)
    const tokenCount = this.estimateTokens(preprocessed)

    return {
      totalTokens: tokenCount,
      analysis,
      confidence: this.calculateLegalConfidence(analysis),
      documentType: this.detectDocumentType(text, analysis),
      complexity: this.assessLegalComplexity(analysis),
      note: 'This is an approximate token count optimized for legal documents. For accurate counts, use the specific provider\'s tokenizer.'
    }
  }

  // 法律文档置信度计算
  private calculateLegalConfidence(analysis: LegalTextAnalysis): number {
    let confidence = 0.8 // 基础置信度

    // 法律术语比例提高置信度
    const totalContent = analysis.chineseChars + analysis.englishWords * 4
    if (totalContent > 0) {
      const legalTermRatio = analysis.legalTerms / (totalContent / 10) // 每10个字符期望1个法律术语
      confidence += Math.min(0.1, legalTermRatio * 0.05)
    }

    // 法条引用和案号提高置信度
    if (analysis.statuteReferences > 0 || analysis.caseNumbers > 0) {
      confidence += 0.05
    }

    // 特殊字符过多会降低置信度
    if (analysis.specialChars > totalContent * 0.2) {
      confidence -= 0.2
    }

    return Math.max(0.6, Math.min(0.95, confidence)) // 法律文档最低60%置信度
  }

  // 检测文档类型
  private detectDocumentType(text: string, analysis: LegalTextAnalysis): string {
    if (analysis.caseNumbers > 0) {
      return 'judgment' // 判决书
    }
    if (analysis.statuteReferences > 5) {
      return 'statute' // 法条文本
    }
    if (text.includes('合同') || text.includes('协议')) {
      return 'contract' // 合同
    }
    return 'legal-document' // 一般法律文档
  }

  // 评估法律复杂度
  private assessLegalComplexity(analysis: LegalTextAnalysis): 'basic' | 'intermediate' | 'advanced' {
    const complexityScore = analysis.statuteReferences * 2 +
                          analysis.legalTerms * 1 +
                          analysis.caseNumbers * 3

    if (complexityScore > 50) return 'advanced'
    if (complexityScore > 20) return 'intermediate'
    return 'basic'
  }
}

// 扩展的分析接口
interface LegalTextAnalysis {
  chineseChars: number
  cjkChars: number
  englishWords: number
  numbers: number
  punctuation: number
  specialChars: number
  emojis: number
  whitespaceGroups: number
  legalSymbols: number
  legalTerms: number
  caseNumbers: number
  statuteReferences: number
}

interface LegalDetailedEstimate {
  totalTokens: number
  analysis: LegalTextAnalysis
  confidence: number
  documentType: string
  complexity: 'basic' | 'intermediate' | 'advanced'
  note: string
}