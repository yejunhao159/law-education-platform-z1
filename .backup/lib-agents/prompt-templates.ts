/**
 * 苏格拉底式问答Prompt模板管理器
 * @module agents/prompt-templates
 * @description 管理五层级的AI提示词模板，支持变量替换和本地化
 */

import { 
  DialogueLevel, 
  Difficulty, 
  CaseInfo, 
  Message,
  MessageRole 
} from '@/lib/types/socratic'

// ============== 模板变量接口 ==============

/**
 * 模板变量接口
 */
export interface TemplateVariables {
  /** 案例信息 */
  case?: CaseInfo
  /** 学生姓名 */
  studentName?: string
  /** 当前层级 */
  currentLevel?: DialogueLevel
  /** 历史消息 */
  messageHistory?: Message[]
  /** 关键概念 */
  keyConcepts?: string[]
  /** 学生答案 */
  studentAnswer?: string
  /** 期望的关键点 */
  expectedPoints?: string[]
  /** 难度级别 */
  difficulty?: Difficulty
  /** 自定义参数 */
  customParams?: Record<string, string | number | boolean>
}

/**
 * 模板元数据
 */
export interface TemplateMetadata {
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 模板作者 */
  author?: string
  /** 创建时间 */
  createdAt: number
  /** 最后修改时间 */
  lastModified: number
  /** 版本号 */
  version: string
  /** 适用的法律领域 */
  legalAreas?: string[]
  /** 语言 */
  language: 'zh-CN'
}

/**
 * Prompt模板接口
 */
export interface PromptTemplate {
  /** 系统消息模板 */
  system: string
  /** 用户消息模板 */
  user: string
  /** 助手消息前缀（可选） */
  assistant?: string
  /** 模板元数据 */
  metadata: TemplateMetadata
  /** 必需的变量列表 */
  requiredVariables: string[]
  /** 可选的变量列表 */
  optionalVariables: string[]
}

// ============== 层级模板定义 ==============

/**
 * 观察层模板（Level 1）
 * 引导学生观察和识别基本事实信息
 */
export const OBSERVATION_TEMPLATES: Record<string, PromptTemplate> = {
  questionGeneration: {
    system: `你是一位经验丰富的法学教授，擅长使用苏格拉底式教学法。你正在引导学生分析法律案例。

当前处于【观察层】阶段，目标是引导学生仔细观察案例，识别基本事实信息。

请遵循以下原则：
1. 不要直接给出答案，而要通过问题引导学生自己发现
2. 问题要具体且聚焦，避免过于抽象
3. 鼓励学生关注细节，培养敏锐的观察力
4. 适当提供引导，但不要越俎代庖

难度级别：{{difficulty}}
案例类型：{{case.type}}`,

    user: `案例信息：
标题：{{case.id}}
案例事实：
{{#each case.facts}}
- {{this}}
{{/each}}

请基于以上案例，生成1-2个引导学生观察基本事实的苏格拉底式问题。
问题应该帮助学生注意到案例中的关键细节和基本信息。

历史对话：
{{#each messageHistory}}
{{role}}: {{content}}
{{/each}}`,

    metadata: {
      name: '观察层问题生成模板',
      description: '生成引导学生观察案例基本事实的问题',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['case.type', 'case.id', 'case.facts', 'difficulty'],
    optionalVariables: ['messageHistory', 'keyConcepts']
  },

  answerAnalysis: {
    system: `你是一位法学教授，正在评估学生在观察层的回答。

评估重点：
1. 学生是否准确识别了关键事实
2. 学生是否遗漏了重要信息
3. 学生的观察是否细致和全面
4. 学生是否有明显的理解偏差

请提供建设性的反馈，鼓励学生继续深入思考。`,

    user: `学生回答：{{studentAnswer}}

请分析这个回答的质量，重点评估：
1. 事实识别的准确性（0-100分）
2. 观察的全面性（是否遗漏关键点）
3. 理解的深度
4. 需要改进的方面

请给出具体的反馈建议。`,

    metadata: {
      name: '观察层答案分析模板',
      description: '分析学生在观察层的回答质量',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['studentAnswer'],
    optionalVariables: ['expectedPoints', 'keyConcepts']
  }
}

/**
 * 事实层模板（Level 2）
 * 引导学生梳理时间线和因果关系
 */
export const FACTS_TEMPLATES: Record<string, PromptTemplate> = {
  questionGeneration: {
    system: `你正在引导学生进行【事实层】分析，目标是帮助学生梳理事件的时间顺序和因果关系。

在这个层级，学生需要：
1. 理清事件的发生顺序
2. 识别关键时间节点
3. 理解事件之间的因果关系
4. 区分直接事实和推论

请提出恰当的引导性问题。`,

    user: `基于前面的观察，现在我们需要理清事实关系。

案例背景：{{case.id}}
已观察到的关键事实：
{{#each keyConcepts}}
- {{this}}
{{/each}}

请生成2-3个问题，引导学生：
1. 梳理事件的时间顺序
2. 分析事件间的因果关系
3. 区分客观事实与主观推断

难度：{{difficulty}}`,

    metadata: {
      name: '事实层问题生成模板',
      description: '生成引导学生梳理事实关系的问题',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['case.id', 'difficulty'],
    optionalVariables: ['keyConcepts', 'messageHistory']
  },

  answerAnalysis: {
    system: `评估学生在事实层的表现，重点关注：
1. 时间线梳理的准确性
2. 因果关系分析的逻辑性
3. 事实与推论的区分能力
4. 分析的系统性和完整性`,

    user: `学生在事实层的回答：{{studentAnswer}}

请评估：
1. 时间线是否清晰准确
2. 因果关系分析是否合理
3. 是否正确区分了事实和推论
4. 分析是否全面系统

给出具体改进建议。`,

    metadata: {
      name: '事实层答案分析模板',
      description: '分析学生事实层回答的质量',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['studentAnswer'],
    optionalVariables: ['expectedPoints']
  }
}

/**
 * 分析层模板（Level 3）
 * 引导学生进行法律关系分析
 */
export const ANALYSIS_TEMPLATES: Record<string, PromptTemplate> = {
  questionGeneration: {
    system: `现在进入【分析层】，这是苏格拉底教学的核心层级。

目标是引导学生：
1. 识别法律关系的主体和客体
2. 分析权利义务关系
3. 找出法律争议的焦点
4. 初步判断法律性质

要善用反问和类比，让学生自己得出结论。`,

    user: `案例争议焦点：
{{#each case.disputes}}
- {{this}}
{{/each}}

相关法条（如果有）：
{{#each case.laws}}
- {{this}}
{{/each}}

基于已梳理的事实，请生成3-4个深度分析问题，引导学生：
1. 识别法律关系主体
2. 分析权利义务内容
3. 找出争议的本质
4. 思考适用的法律原则

案例类型：{{case.type}}
难度：{{difficulty}}`,

    metadata: {
      name: '分析层问题生成模板',
      description: '生成引导学生进行法律关系分析的问题',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['case.type', 'difficulty'],
    optionalVariables: ['case.disputes', 'case.laws', 'keyConcepts']
  },

  answerAnalysis: {
    system: `评估学生的法律分析能力，重点：
1. 法律关系识别的准确性
2. 权利义务分析的深度
3. 争议焦点把握的准确性
4. 法律逻辑的严谨性`,

    user: `学生的分析：{{studentAnswer}}

请评估：
1. 法律关系识别是否准确
2. 权利义务分析是否到位
3. 争议焦点是否抓住要害
4. 分析逻辑是否严谨

期望要点：
{{#each expectedPoints}}
- {{this}}
{{/each}}`,

    metadata: {
      name: '分析层答案评估模板',
      description: '评估学生法律分析回答的质量',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['studentAnswer'],
    optionalVariables: ['expectedPoints']
  }
}

/**
 * 应用层模板（Level 4）  
 * 引导学生应用具体法条
 */
export const APPLICATION_TEMPLATES: Record<string, PromptTemplate> = {
  questionGeneration: {
    system: `进入【应用层】，引导学生将抽象的法律原则应用到具体案例。

重点：
1. 法条的选择和适用
2. 构成要件的分析
3. 举证责任的分配
4. 法律后果的认定

要让学生学会"三段论"式的法律推理。`,

    user: `现在需要将法律条文应用到具体案例中。

相关法条：
{{#each case.laws}}
- {{this}}
{{/each}}

争议焦点：
{{#each case.disputes}}
- {{this}}
{{/each}}

请生成2-3个应用层问题，引导学生：
1. 选择适用的法条
2. 分析构成要件
3. 进行法律推理
4. 得出初步结论

难度：{{difficulty}}`,

    metadata: {
      name: '应用层问题生成模板',
      description: '生成引导学生应用法条的问题',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['difficulty'],
    optionalVariables: ['case.laws', 'case.disputes', 'keyConcepts']
  },

  answerAnalysis: {
    system: `评估学生的法条应用能力：
1. 法条选择是否准确
2. 构成要件分析是否全面
3. 法律推理是否严谨
4. 结论是否合理`,

    user: `学生的法条应用分析：{{studentAnswer}}

请评估：
1. 选用法条是否恰当
2. 要件分析是否充分
3. 推理过程是否严谨
4. 结论是否站得住脚

并指出需要改进的地方。`,

    metadata: {
      name: '应用层答案评估模板',
      description: '评估学生法条应用的准确性',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['studentAnswer'],
    optionalVariables: ['expectedPoints']
  }
}

/**
 * 价值层模板（Level 5）
 * 引导学生思考公平正义等价值问题
 */
export const VALUES_TEMPLATES: Record<string, PromptTemplate> = {
  questionGeneration: {
    system: `最后是【价值层】，引导学生超越技术层面，思考法律背后的价值理念。

目标：
1. 思考公平正义的实现
2. 平衡各方利益
3. 考虑社会效果
4. 反思法律的局限性

这是最高层次的法律思维。`,

    user: `通过前面的分析，我们已经得出了法律上的结论：
{{#if case.judgment}}
参考判决：{{case.judgment}}
{{/if}}

现在让我们进入更深层次的思考。

请生成1-2个价值层问题，引导学生思考：
1. 这样的判决是否体现了公平正义
2. 各方利益是否得到了合理平衡
3. 对社会会产生什么影响
4. 法律还有哪些需要完善的地方

案例类型：{{case.type}}`,

    metadata: {
      name: '价值层问题生成模板',
      description: '生成引导学生思考价值问题的问题',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['case.type'],
    optionalVariables: ['case.judgment']
  },

  answerAnalysis: {
    system: `评估学生的价值思考能力：
1. 价值判断是否有理有据
2. 利益平衡考虑是否周全
3. 社会影响思考是否深入
4. 批判思维是否恰当`,

    user: `学生的价值层思考：{{studentAnswer}}

请评估：
1. 价值判断是否合理
2. 是否考虑了多方利益
3. 对社会影响的认识是否到位
4. 批判思维是否成熟

这是最高层次的评估，请给予鼓励性的反馈。`,

    metadata: {
      name: '价值层答案评估模板',
      description: '评估学生价值思考的深度',
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0',
      language: 'zh-CN'
    },

    requiredVariables: ['studentAnswer'],
    optionalVariables: []
  }
}

// ============== 模板管理器类 ==============

/**
 * Prompt模板管理器
 */
export class PromptTemplateManager {
  private templates: Map<string, Record<string, PromptTemplate>>
  
  constructor() {
    this.templates = new Map([
      ['observation', OBSERVATION_TEMPLATES],
      ['facts', FACTS_TEMPLATES], 
      ['analysis', ANALYSIS_TEMPLATES],
      ['application', APPLICATION_TEMPLATES],
      ['values', VALUES_TEMPLATES]
    ])
  }

  /**
   * 根据层级获取模板
   * @param level - 对话层级
   * @returns 该层级的所有模板
   */
  getTemplatesByLevel(level: DialogueLevel): Record<string, PromptTemplate> {
    const levelMap = {
      [DialogueLevel.OBSERVATION]: 'observation',
      [DialogueLevel.FACTS]: 'facts',
      [DialogueLevel.ANALYSIS]: 'analysis', 
      [DialogueLevel.APPLICATION]: 'application',
      [DialogueLevel.VALUES]: 'values'
    }
    
    const templates = this.templates.get(levelMap[level])
    if (!templates) {
      throw new Error(`No templates found for level ${level}`)
    }
    
    return templates
  }

  /**
   * 获取特定模板
   * @param level - 对话层级
   * @param templateName - 模板名称
   * @returns 指定的模板
   */
  getTemplate(level: DialogueLevel, templateName: string): PromptTemplate {
    const templates = this.getTemplatesByLevel(level)
    const template = templates[templateName]
    
    if (!template) {
      throw new Error(`Template ${templateName} not found for level ${level}`)
    }
    
    return template
  }

  /**
   * 渲染模板
   * @param template - 要渲染的模板
   * @param variables - 模板变量
   * @returns 渲染后的结果
   */
  renderTemplate(template: PromptTemplate, variables: TemplateVariables): {
    system: string
    user: string
    assistant?: string
  } {
    // 验证必需变量
    this.validateRequiredVariables(template, variables)
    
    // 渲染各部分
    const system = this.replaceVariables(template.system, variables)
    const user = this.replaceVariables(template.user, variables)
    const assistant = template.assistant ? 
      this.replaceVariables(template.assistant, variables) : undefined
    
    return { system, user, assistant }
  }

  /**
   * 验证必需变量是否都已提供
   * @param template - 模板
   * @param variables - 变量
   */
  private validateRequiredVariables(
    template: PromptTemplate, 
    variables: TemplateVariables
  ): void {
    const missingVariables: string[] = []
    
    for (const required of template.requiredVariables) {
      if (!this.hasVariable(variables, required)) {
        missingVariables.push(required)
      }
    }
    
    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required variables: ${missingVariables.join(', ')}`
      )
    }
  }

  /**
   * 检查变量是否存在
   * @param variables - 变量对象
   * @param path - 变量路径（支持点号表示法）
   * @returns 是否存在
   */
  private hasVariable(variables: TemplateVariables, path: string): boolean {
    const keys = path.split('.')
    let current: any = variables
    
    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return false
      }
      current = current[key]
    }
    
    return current !== undefined
  }

  /**
   * 替换模板中的变量
   * @param template - 模板字符串
   * @param variables - 变量对象
   * @returns 替换后的字符串
   */
  private replaceVariables(template: string, variables: TemplateVariables): string {
    let result = template
    
    // 简单的变量替换（支持点号表示法）
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, varPath) => {
      const keys = varPath.trim().split('.')
      let value: any = variables
      
      for (const key of keys) {
        if (value == null) break
        value = value[key]
      }
      
      return value != null ? String(value) : match
    })
    
    // 处理条件判断 {{#if variable}}
    result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, 
      (match, condition, content) => {
        const conditionValue = this.evaluateCondition(condition.trim(), variables)
        return conditionValue ? content : ''
      }
    )
    
    // 处理数组循环 {{#each array}}
    result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayPath, itemTemplate) => {
        const array = this.getVariableValue(arrayPath.trim(), variables)
        if (!Array.isArray(array)) return ''
        
        return array.map(item => 
          itemTemplate.replace(/\{\{this\}\}/g, String(item))
        ).join('')
      }
    )
    
    return result
  }

  /**
   * 评估条件表达式
   * @param condition - 条件表达式
   * @param variables - 变量对象
   * @returns 条件结果
   */
  private evaluateCondition(condition: string, variables: TemplateVariables): boolean {
    const value = this.getVariableValue(condition, variables)
    return Boolean(value)
  }

  /**
   * 获取变量值
   * @param path - 变量路径
   * @param variables - 变量对象
   * @returns 变量值
   */
  private getVariableValue(path: string, variables: TemplateVariables): any {
    const keys = path.split('.')
    let current: any = variables
    
    for (const key of keys) {
      if (current == null) return undefined
      current = current[key]
    }
    
    return current
  }

  /**
   * 添加自定义模板
   * @param level - 层级
   * @param name - 模板名称
   * @param template - 模板对象
   */
  addCustomTemplate(level: DialogueLevel, name: string, template: PromptTemplate): void {
    const templates = this.getTemplatesByLevel(level)
    templates[name] = template
  }

  /**
   * 获取所有支持的层级
   * @returns 层级列表
   */
  getSupportedLevels(): DialogueLevel[] {
    return [
      DialogueLevel.OBSERVATION,
      DialogueLevel.FACTS,
      DialogueLevel.ANALYSIS,
      DialogueLevel.APPLICATION,
      DialogueLevel.VALUES
    ]
  }

  /**
   * 获取层级的所有模板名称
   * @param level - 层级
   * @returns 模板名称列表
   */
  getTemplateNames(level: DialogueLevel): string[] {
    const templates = this.getTemplatesByLevel(level)
    return Object.keys(templates)
  }
}

// 导出单例实例
export const promptTemplateManager = new PromptTemplateManager()