/**
 * 法律案件请求权分析API
 * @description 基于时间轴事件进行综合性请求权分析，整合AI能力和法学理论
 * @author DeepPractice Legal Intelligence System
 * @version 1.0.0
 *
 * 核心功能：
 * - 时间轴事件请求权映射分析
 * - 多层级请求权基础识别
 * - 构成要件满足性评估
 * - 抗辩事由发现与评估
 * - 举证责任智能分配
 * - 诉讼时效自动计算
 * - 综合策略建议生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeTimelineClaimsWithAI } from '@/src/domains/legal-analysis/services/ClaimAnalysisService'
import type { ClaimAnalysisRequest, ClaimAnalysisResult } from '@/types/timeline-claim-analysis'

/**
 * POST /api/claim-analysis
 * @description 执行基于时间轴的综合请求权分析
 * @param request - HTTP请求对象，包含事件数据和分析配置
 * @returns 结构化的请求权分析结果
 *
 * 请求体结构：
 * - events: TimelineEvent[] - 时间轴事件数组（必需）
 * - caseType?: string - 案件类型标识
 * - focusAreas?: string[] - 重点分析领域
 * - depth?: 'basic'|'detailed'|'comprehensive' - 分析深度级别
 *
 * 响应结构：
 * - ClaimAnalysisResult - 包含请求权、时效、举证责任等完整分析
 */
export async function POST(request: NextRequest) {
  // 性能监控：记录处理开始时间
  const startTime = Date.now()

  try {
    // Step 1: 解析请求体并初步验证JSON格式
    const body = await request.json()

    // 记录请求概况用于调试和监控
    console.log('🎯 Received claim analysis request:', {
      eventCount: body.events?.length || 0,
      caseType: body.caseType,
      depth: body.depth
    })

    // Step 2: 输入数据验证 - 检查事件数据的基本完整性
    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: '缺少事件数据' },
        { status: 400 }
      )
    }

    // Step 3: 构建标准化的分析请求对象
    // 设置默认值确保分析的完整性
    const analysisRequest: ClaimAnalysisRequest = {
      events: body.events,
      caseType: body.caseType,
      // 默认分析所有核心领域
      focusAreas: body.focusAreas || ['claims', 'defenses', 'limitations', 'burden-of-proof'],
      // 默认使用最全面的分析深度
      depth: body.depth || 'comprehensive'
    }

    // Step 4: 调用AI请求权分析服务
    // 这是核心的业务逻辑调用，委托给专门的分析器
    const analysisResult = await analyzeTimelineClaimsWithAI(analysisRequest)

    // Step 5: 计算总处理时间用于性能监控
    const processingTime = Date.now() - startTime
    console.log('✅ Claim analysis completed in', processingTime, 'ms')

    // Step 6: 构建完整的分析结果响应
    // 确保元数据包含处理时间等关键信息
    const result: ClaimAnalysisResult = {
      ...analysisResult,
      metadata: {
        ...analysisResult.metadata,
        processingTime
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    // 错误日志记录，用于系统监控和问题诊断
    console.error('❌ Claim analysis error:', error)

    // 计算错误响应的处理时间
    const processingTime = Date.now() - startTime

    // Step 7: 分类错误处理 - 根据错误类型返回适当的HTTP状态码和错误信息
    if (error instanceof Error) {

      // 处理AI服务相关错误（503 Service Unavailable）
      if (error.message.includes('API Key未配置') || error.message.includes('API错误')) {
        return NextResponse.json(
          {
            error: 'AI服务暂时不可用，请稍后重试',
            // 开发环境下提供详细错误信息用于调试
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 503 }
        )
      }

      // 处理输入数据相关错误（400 Bad Request）
      if (error.message.includes('分析请求失败')) {
        return NextResponse.json(
          {
            error: '分析请求失败，请检查输入数据',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 400 }
        )
      }
    }

    // Step 8: 通用错误处理（500 Internal Server Error）
    // 对于未分类的错误，返回通用错误响应
    return NextResponse.json(
      {
        error: '分析失败，请稍后重试',
        processingTime,
        // 仅在开发环境中暴露错误详情，生产环境中保护敏感信息
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}