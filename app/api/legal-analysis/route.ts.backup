/**
 * 法律事件分析API
 * @description 基于AI和规则引擎的法律事件深度分析系统，为法学教育提供智能化的法律要点提取和分析
 * @author DeepPractice Legal Intelligence System
 * @version 1.0.0
 *
 * 已迁移至统一AI调用代理模式 - Issue #21
 *
 * 核心功能：
 * - 法律事件智能摘要生成
 * - 法学要点自动提取
 * - 相关法条精确匹配
 * - 多维度法律分析（法律关系、举证责任、时效问题）
 * - AI分析失败时的规则引擎备选方案
 * - 容错性强的JSON解析机制
 *
 * 技术特点：
 * - DeepSeek AI模型驱动的专业法律分析（通过AICallProxy统一调用）
 * - 双重保障：AI分析 + 规则引擎备选
 * - 智能JSON提取和格式化
 * - 完整的错误处理和降级策略
 */

import { NextRequest, NextResponse } from 'next/server'
import { interceptDeepSeekCall } from '@/src/infrastructure/ai/AICallProxy'
import {
  handleAPIError,
  createErrorResponse,
  ErrorType,
  generateRequestId
} from '@/src/utils/api-error-handler'

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

/**
 * 法律分析请求接口
 * @description 定义API请求体的数据结构
 */
interface LegalAnalysisRequest {
  /** 待分析的法律事件信息 */
  event: {
    /** 事件发生日期 */
    date: string
    /** 事件标题 */
    title: string
    /** 事件详细描述 */
    description: string
    /** 相关当事方（可选） */
    party?: string
  }
  /** 案件背景上下文（可选） */
  caseContext?: string
}

/**
 * 法律分析响应接口
 * @description 定义API响应数据的结构化格式
 */
interface LegalAnalysisResponse {
  /** 简短摘要（30字以内） */
  summary: string
  /** 法学要点列表 */
  legalPoints: string[]
  /** 相关法条依据 */
  legalBasis: string[]
  /** 深度分析结果 */
  analysis: {
    /** 法律关系认定 */
    legalRelation?: string
    /** 举证责任分配 */
    burdenOfProof?: string
    /** 诉讼时效分析 */
    limitation?: string
    /** 关键法律要点 */
    keyPoint?: string
    /** 风险评估 */
    riskAssessment?: string
  }
}

/**
 * 基于规则引擎的法律分析备选方案
 * @description 当AI分析失败时，使用关键词匹配和规则库生成基础法律分析
 * @param event - 待分析的法律事件对象
 * @returns 规则引擎生成的法律分析结果
 *
 * 分析逻辑：
 * - Step 1: 关键词提取和分类识别
 * - Step 2: 基于法律知识库的要点匹配
 * - Step 3: 相关法条自动关联
 * - Step 4: 分析要素智能推导
 *
 * 支持的法律领域：
 * - 合同法律关系分析
 * - 违约责任认定
 * - 证据和举证问题
 * - 诉讼程序要点
 */
function generateRuleBasedAnalysis(event: any): LegalAnalysisResponse {
  const desc = event.description?.toLowerCase() || ''
  const title = event.title?.toLowerCase() || ''
  
  // 智能提取摘要
  const eventTitle = event?.title || '未知事件'
  const summary = eventTitle.length > 30 
    ? eventTitle.substring(0, 27) + '...'
    : eventTitle
  
  // 根据关键词提取法学要点
  const legalPoints: string[] = []
  if (desc.includes('合同') || desc.includes('协议')) {
    legalPoints.push('合同效力认定')
    legalPoints.push('双方权利义务关系')
  }
  if (desc.includes('违约') || desc.includes('未履行')) {
    legalPoints.push('违约责任承担')
    legalPoints.push('损害赔偿计算')
  }
  if (desc.includes('证据') || desc.includes('证明')) {
    legalPoints.push('举证责任分配')
    legalPoints.push('证据效力认定')
  }
  if (desc.includes('诉讼') || desc.includes('起诉')) {
    legalPoints.push('诉讼时效问题')
    legalPoints.push('管辖权确定')
  }
  
  // 提取相关法条
  const legalBasis: string[] = []
  if (desc.includes('借款') || desc.includes('借贷')) {
    legalBasis.push('《民法典》第667条（借款合同）')
    legalBasis.push('《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》')
  }
  if (desc.includes('合同')) {
    legalBasis.push('《民法典》合同编相关条款')
  }
  if (desc.includes('违约')) {
    legalBasis.push('《民法典》第577条（违约责任）')
  }
  
  // 分析要素
  const analysis: any = {}
  if (desc.includes('合同') || desc.includes('借款')) {
    analysis.legalRelation = '合同法律关系'
  }
  if (desc.includes('原告') && desc.includes('被告')) {
    analysis.burdenOfProof = '谁主张谁举证'
  }
  if (title.includes('起诉') || title.includes('诉讼')) {
    analysis.keyPoint = '诉讼程序启动'
  }
  
  return {
    summary,
    legalPoints: legalPoints.length > 0 ? legalPoints : ['需进一步分析'],
    legalBasis: legalBasis.length > 0 ? legalBasis : ['相关法律法规'],
    analysis
  }
}

/**
 * POST /api/legal-analysis - 法律事件智能分析处理器
 * @description 接收法律事件数据，通过AI和规则引擎进行深度法律分析
 * @param req - Next.js请求对象，包含事件信息和案件背景
 * @returns 结构化的法律分析结果
 *
 * 请求体格式：
 * {
 *   "event": {
 *     "date": "事件日期",
 *     "title": "事件标题",
 *     "description": "详细描述",
 *     "party": "当事方（可选）"
 *   },
 *   "caseContext": "案件背景（可选）"
 * }
 *
 * 响应格式：
 * {
 *   "summary": "30字以内摘要",
 *   "legalPoints": ["法学要点1", "法学要点2"],
 *   "legalBasis": ["相关法条1", "相关法条2"],
 *   "analysis": {
 *     "legalRelation": "法律关系认定",
 *     "burdenOfProof": "举证责任分配",
 *     "limitation": "时效问题",
 *     "keyPoint": "关键法律要点",
 *     "riskAssessment": "风险评估"
 *   }
 * }
 *
 * 处理流程：
 * - Step 1: 请求数据解析和验证
 * - Step 2: 构建专业法学分析提示词
 * - Step 3: DeepSeek AI模型分析调用
 * - Step 4: AI响应的智能JSON解析
 * - Step 5: 失败时规则引擎备选分析
 * - Step 6: 统一错误处理和降级策略
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Step 1: 解析请求数据并进行类型检查
    const { event, caseContext } = await req.json() as LegalAnalysisRequest

    // 输入验证
    if (!event || !event.title || !event.description) {
      return NextResponse.json(
        createErrorResponse(
          ErrorType.VALIDATION,
          new Error('缺少必填字段'),
          '请求参数不完整，需要提供事件标题和描述',
          undefined,
          requestId
        ),
        { status: 400 }
      );
    }

    // Step 2: 构建专业的法学分析提示词模板
    const prompt = `你是一位专业的法学教授，请分析以下案件事件的法律意义。

案件背景：${caseContext || '民事诉讼案件'}

事件信息：
- 日期：${event?.date || '未知日期'}
- 事件：${event?.title || '未知事件'}
- 详情：${event?.description || '无详细描述'}
- 当事方：${event?.party || '未知'}

请提供以下分析：

1. 事件摘要（不超过30字，概括核心内容）
2. 法学要点（3-5个关键法律问题）
3. 相关法条（具体到条款）
4. 深度分析：
   - 法律关系认定
   - 举证责任分配
   - 时效问题
   - 关键法律点
   - 风险评估

请用专业但易懂的语言回答，返回JSON格式。`

    // Step 3: 调用统一AI服务进行专业法律分析（通过代理模式）
    const response = await interceptDeepSeekCall(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位经验丰富的法学教授，擅长用简洁清晰的语言分析法律问题。请严格按照JSON格式返回分析结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
        // 移除 response_format，因为DeepSeek可能不支持这个参数
      })
    })

    // Step 4: 检查API响应状态
    if (!response.ok) {
      // API调用失败时的降级处理：提供友好错误信息和基础分析结果
      const fallbackData = generateRuleBasedAnalysis(event);

      return NextResponse.json(
        handleAPIError(
          new Error(`DeepSeek API失败: ${response.status} ${response.statusText}`),
          '法律分析AI服务',
          fallbackData,
          requestId
        ),
        { status: 200 } // 返回200因为有fallback数据
      );
    }

    const data = await response.json()

    // Step 5: 智能解析AI响应的JSON数据
    let aiAnalysis: LegalAnalysisResponse
    try {
      const content = data.choices[0].message.content
      
      // 尝试提取JSON（如果内容包含其他文字）
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0])
      } else {
        // 如果没有找到JSON，尝试直接解析
        aiAnalysis = JSON.parse(content)
      }
      
      // 确保返回的数据结构完整
      return NextResponse.json({
        summary: aiAnalysis.summary || event.title.substring(0, 30),
        legalPoints: aiAnalysis.legalPoints || [],
        legalBasis: aiAnalysis.legalBasis || [],
        analysis: aiAnalysis.analysis || {}
      })
      
    } catch (parseError) {
      // Step 6: JSON解析失败时的错误处理和日志记录
      const fallbackData = generateRuleBasedAnalysis(event);

      return NextResponse.json(
        handleAPIError(
          parseError,
          'AI分析结果解析',
          fallbackData,
          requestId
        ),
        { status: 200 } // 返回200因为有fallback数据
      );
    }

  } catch (error) {
    // Step 7: 全局异常处理和错误日志记录
    const fallbackData = {
      summary: '事件概要',
      legalPoints: ['法律关系分析', '证据要求', '程序问题'],
      legalBasis: ['相关法律条文'],
      analysis: {
        legalRelation: '需进一步分析',
        burdenOfProof: '待确定',
        keyPoint: '关键法律问题'
      }
    };

    return NextResponse.json(
      handleAPIError(
        error,
        '法律分析服务',
        fallbackData,
        requestId
      ),
      { status: 500 }
    );
  }
}