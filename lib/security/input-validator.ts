/**
 * 输入验证和过滤器
 * @description 提供全面的输入验证和XSS/注入攻击防护
 * @author 法律教育平台团队
 */

import { createLogger } from '../logging'

const logger = createLogger('security')

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean
  sanitized?: string
  reason?: string
  details?: Record<string, any>
}

/**
 * 验证配置
 */
export interface ValidatorConfig {
  maxLength?: number
  allowHtml?: boolean
  allowSpecialChars?: boolean
  customPatterns?: RegExp[]
}

/**
 * 输入验证器类
 */
export class InputValidator {
  // 危险模式列表
  private static readonly DANGEROUS_PATTERNS = [
    // Prompt注入模式
    /ignore\s+all\s+previous\s+instructions?/gi,
    /忽略.*之前.*指令/g,
    /forget\s+everything/gi,
    /忘记.*一切/g,
    /system\s*:\s*you\s+are/gi,
    /系统.*提示.*你.*是/g,
    /<\/?(system|instruction|prompt)>/gi,
    /\{\{(system|instruction|prompt)\}\}/gi,
    /^(INSTRUCTION|ROLE|SYSTEM)\s*:/gim,
    /^(NEW\s+)?ROLE\s*:/gim,
    
    // SQL注入模式
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b)/gi,
    /(--|\||;|\/\*|\*\/)/g,
    
    // NoSQL注入模式
    /\$\w+/g, // MongoDB操作符
    
    // XSS模式
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // 事件处理器
  ]

  // 不可见Unicode字符
  private static readonly INVISIBLE_CHARS = [
    '\u202E', // 右到左覆盖
    '\u202D', // 左到右覆盖
    '\u200B', // 零宽空格
    '\u200C', // 零宽非连接符
    '\u200D', // 零宽连接符
    '\uFEFF', // 零宽非断空格
  ]

  // HTML实体映射
  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  // 缓存验证结果
  private cache = new Map<string, ValidationResult>()
  private readonly cacheMaxSize = 1000
  private readonly cacheTimeout = 60000 // 1分钟

  /**
   * 清理文本，移除HTML和危险内容
   */
  public sanitizeText(input: string | null | undefined): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    // 先移除script、style等危险标签及其内容
    let sanitized = input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    
    // 移除其他HTML标签（但保留内容）
    sanitized = sanitized.replace(/<[^>]*>/g, '')
    
    // 移除不可见字符
    InputValidator.INVISIBLE_CHARS.forEach(char => {
      sanitized = sanitized.replace(new RegExp(char, 'g'), '')
    })
    
    // 移除多余的空白
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    
    return sanitized
  }

  /**
   * 转义HTML特殊字符
   */
  private escapeHtml(str: string): string {
    return str.replace(/[&<>"'\/]/g, (match) => 
      InputValidator.HTML_ENTITIES[match] || match
    )
  }

  /**
   * 验证Prompt输入，防止注入攻击
   */
  public validatePrompt(prompt: string | null | undefined): ValidationResult {
    if (!prompt || typeof prompt !== 'string') {
      return { isValid: false, reason: '输入为空或无效' }
    }

    // 检查缓存
    const cacheKey = `prompt:${prompt}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    // 长度检查
    if (prompt.length > 5000) {
      return this.createResult(false, '输入过长（最大5000字符）')
    }

    // 检查不可见字符
    for (const char of InputValidator.INVISIBLE_CHARS) {
      if (prompt.includes(char)) {
        this.logSecurityEvent('invisible_chars', { prompt: prompt.substring(0, 50) })
        return this.createResult(false, '包含不可见字符')
      }
    }

    // 检查危险模式
    for (const pattern of InputValidator.DANGEROUS_PATTERNS) {
      if (pattern.test(prompt)) {
        this.logSecurityEvent('prompt_injection', { 
          pattern: pattern.toString(),
          prompt: prompt.substring(0, 50) 
        })
        return this.createResult(false, '输入可能包含注入攻击')
      }
    }

    // 检查特殊字符密度
    const specialChars = prompt.match(/[{}[\]()<>|\\]/g)
    if (specialChars && specialChars.length > prompt.length * 0.2) {
      return this.createResult(false, '特殊字符过多')
    }

    // 清理并返回
    const sanitized = this.sanitizeText(prompt)
    const result = this.createResult(true, undefined, sanitized)
    this.addToCache(cacheKey, result)
    
    return result
  }

  /**
   * 验证案例内容
   */
  public validateCaseContent(content: string): ValidationResult {
    if (!content || typeof content !== 'string') {
      return { isValid: false, reason: '内容为空或无效' }
    }

    // 大小限制（50KB）
    if (content.length > 50000) {
      return this.createResult(false, '内容过大（最大50KB）')
    }

    try {
      // 尝试解析JSON
      const parsed = JSON.parse(content)
      
      // 递归清理对象中的字符串
      const sanitized = this.sanitizeObject(parsed)
      
      return this.createResult(true, undefined, JSON.stringify(sanitized))
    } catch (e) {
      // 如果不是JSON，作为普通文本处理
      const sanitized = this.sanitizeText(content)
      return this.createResult(true, undefined, sanitized)
    }
  }

  /**
   * 递归清理对象中的字符串值
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeText(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        // 清理键名
        const sanitizedKey = this.sanitizeText(key)
        sanitized[sanitizedKey] = this.sanitizeObject(value)
      }
      return sanitized
    }
    
    return obj
  }

  /**
   * 验证课堂码
   */
  public validateClassroomCode(code: string): ValidationResult {
    if (!code || typeof code !== 'string') {
      return { isValid: false, reason: '课堂码无效' }
    }

    // 必须是6位字母数字
    if (!/^[A-Z0-9]{6}$/i.test(code)) {
      return { isValid: false, reason: '课堂码必须是6位字母或数字' }
    }

    return { isValid: true, sanitized: code.toUpperCase() }
  }

  /**
   * 验证学生答案
   */
  public validateAnswer(answer: string): ValidationResult {
    if (!answer || typeof answer !== 'string') {
      return { isValid: false, reason: '答案为空' }
    }

    // 长度限制（2000字符）
    if (answer.length > 2000) {
      return this.createResult(false, '答案过长（最大2000字符）')
    }

    // 检查重复字符攻击
    const repeatedPattern = /(.)\1{50,}/
    if (repeatedPattern.test(answer)) {
      return this.createResult(false, '包含过多重复字符')
    }

    // 清理HTML
    const sanitized = this.sanitizeText(answer)
    
    return this.createResult(true, undefined, sanitized)
  }

  /**
   * 验证API输入
   */
  public validateApiInput(input: any): ValidationResult {
    if (!input) {
      return { isValid: false, reason: '输入为空' }
    }

    // 转换为字符串进行检查
    const jsonStr = JSON.stringify(input)
    
    // 检查SQL注入
    if (/(\bDROP\b|\bDELETE\b|\bTRUNCATE\b)/i.test(jsonStr)) {
      this.logSecurityEvent('sql_injection', { input: jsonStr.substring(0, 100) })
      return { isValid: false, reason: '包含危险字符' }
    }
    
    // 检查NoSQL注入
    if (/\$\w+/.test(jsonStr)) {
      this.logSecurityEvent('nosql_injection', { input: jsonStr.substring(0, 100) })
      return { isValid: false, reason: '包含危险操作符' }
    }
    
    // 递归清理
    const sanitized = this.sanitizeObject(input)
    
    return this.createResult(true, undefined, sanitized)
  }

  /**
   * 创建验证结果
   */
  private createResult(
    isValid: boolean, 
    reason?: string, 
    sanitized?: any
  ): ValidationResult {
    const result: ValidationResult = { isValid }
    if (reason) result.reason = reason
    if (sanitized !== undefined) result.sanitized = sanitized
    return result
  }

  /**
   * 记录安全事件
   */
  private logSecurityEvent(type: string, details: any): void {
    console.warn(`[Security] ${type}:`, details)
    logger.warn(`Security event: ${type}`, {
      type,
      details,
      timestamp: Date.now()
    })
  }

  /**
   * 缓存管理
   */
  private getFromCache(key: string): ValidationResult | null {
    const cached = this.cache.get(key)
    if (cached) {
      // 检查是否过期
      const age = Date.now() - (cached.details?.timestamp || 0)
      if (age < this.cacheTimeout) {
        return cached
      }
      this.cache.delete(key)
    }
    return null
  }

  private addToCache(key: string, result: ValidationResult): void {
    // 限制缓存大小
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    result.details = { ...result.details, timestamp: Date.now() }
    this.cache.set(key, result)
  }

  /**
   * 清空缓存
   */
  public clearCache(): void {
    this.cache.clear()
  }
}

// 导出单例实例
export const inputValidator = new InputValidator()

// 导出便捷函数
export const sanitizeText = (text: string) => inputValidator.sanitizeText(text)
export const validatePrompt = (prompt: string) => inputValidator.validatePrompt(prompt)
export const validateAnswer = (answer: string) => inputValidator.validateAnswer(answer)
export const validateApiInput = (input: any) => inputValidator.validateApiInput(input)