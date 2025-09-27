/**
 * 统一服务响应验证器
 * 解决"只有骨头没有肉"的问题 - 确保服务返回真实有效的数据
 */

export interface ServiceValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * 验证AI服务响应是否包含实际内容
 * 防止返回硬编码的默认值或空数据
 */
export function validateServiceResponse(
  response: any,
  requiredFields: string[] = [],
  options: {
    checkForHardcodedValues?: boolean
    minContentLength?: number
    requireAIGenerated?: boolean
  } = {}
): ServiceValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. 检查必需字段
  for (const field of requiredFields) {
    if (!hasNestedProperty(response, field)) {
      errors.push(`缺少必需字段: ${field}`)
    }
  }

  // 2. 检查硬编码值（这些是常见的降级策略默认值）
  if (options.checkForHardcodedValues !== false) {
    const hardcodedPhrases = [
      '需要进一步分析',
      '待确定',
      '待完善',
      '建议进一步分析案件细节',
      '收集和整理相关证据材料',
      '内容生成中...',
      '基于时间轴事件的案情发展...'
    ]

    const responseStr = JSON.stringify(response)
    const foundHardcoded = hardcodedPhrases.filter(phrase =>
      responseStr.includes(phrase)
    )

    if (foundHardcoded.length > 0) {
      warnings.push(`检测到可能的硬编码默认值: ${foundHardcoded.join(', ')}`)
    }
  }

  // 3. 检查内容长度
  if (options.minContentLength) {
    const contentFields = findContentFields(response)
    const shortContents = contentFields.filter(
      content => content && content.length < options.minContentLength!
    )

    if (shortContents.length > 0) {
      warnings.push(`${shortContents.length}个字段的内容过短（少于${options.minContentLength}字符）`)
    }
  }

  // 4. 检查是否是真实的AI生成内容
  if (options.requireAIGenerated) {
    // 检查是否有AI分析的特征
    const aiIndicators = [
      'confidence',
      'metadata.model',
      'metadata.processingTime',
      'analysis'
    ]

    const hasAIIndicators = aiIndicators.some(indicator =>
      hasNestedProperty(response, indicator)
    )

    if (!hasAIIndicators) {
      warnings.push('响应可能不是AI生成的（缺少AI分析特征）')
    }

    // 检查置信度
    const confidence = getNestedProperty(response, 'confidence') ||
                      getNestedProperty(response, 'metadata.confidence')
    if (confidence !== undefined && confidence < 0.5) {
      warnings.push(`AI置信度过低: ${confidence}`)
    }
  }

  // 5. 检查数组字段是否为空
  const arrayFields = findArrayFields(response)
  const emptyArrays = arrayFields.filter(arr => arr.length === 0)
  if (emptyArrays.length > 0) {
    warnings.push(`${emptyArrays.length}个数组字段为空`)
  }

  // 6. 特定服务的验证
  if (response.disputes !== undefined) {
    // 争议分析服务验证
    if (Array.isArray(response.disputes) && response.disputes.length === 0) {
      errors.push('争议分析结果为空')
    }
  }

  if (response.chapters !== undefined) {
    // 故事生成服务验证
    if (Array.isArray(response.chapters) && response.chapters.length === 0) {
      errors.push('故事章节生成失败')
    }
  }

  if (response.claims !== undefined) {
    // 请求权分析服务验证
    const claims = response.claims
    if (claims.primary?.length === 0 &&
        claims.alternative?.length === 0 &&
        claims.defense?.length === 0) {
      errors.push('请求权分析结果为空')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * 检查嵌套属性是否存在
 */
function hasNestedProperty(obj: any, path: string): boolean {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return false
    }
    current = current[key]
  }

  return true
}

/**
 * 获取嵌套属性值
 */
function getNestedProperty(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }

  return current
}

/**
 * 查找所有包含内容的字段
 */
function findContentFields(obj: any, fields: string[] = []): string[] {
  if (typeof obj !== 'object' || obj === null) return fields

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > 0) {
      if (key.includes('content') || key.includes('description') ||
          key.includes('analysis') || key.includes('summary')) {
        fields.push(value)
      }
    } else if (typeof value === 'object') {
      findContentFields(value, fields)
    }
  }

  return fields
}

/**
 * 查找所有数组字段
 */
function findArrayFields(obj: any, arrays: any[] = []): any[] {
  if (typeof obj !== 'object' || obj === null) return arrays

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      arrays.push(value)
    } else if (typeof value === 'object') {
      findArrayFields(value, arrays)
    }
  }

  return arrays
}

/**
 * 创建标准化的错误响应
 */
export function createStandardErrorResponse(
  error: Error | string,
  code: string = 'SERVICE_ERROR'
): {
  success: false
  error: {
    code: string
    message: string
    timestamp: string
  }
} {
  return {
    success: false,
    error: {
      code,
      message: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 创建标准化的成功响应
 */
export function createStandardSuccessResponse<T>(
  data: T,
  metadata?: Record<string, any>
): {
  success: true
  data: T
  metadata: Record<string, any>
} {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }
}