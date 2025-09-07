import { NextRequest, NextResponse } from 'next/server'
import { analyzeTimelineClaimsWithAI } from '@/lib/ai-claim-analyzer'
import type { ClaimAnalysisRequest, ClaimAnalysisResult } from '@/types/timeline-claim-analysis'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    console.log('🎯 Received claim analysis request:', {
      eventCount: body.events?.length || 0,
      caseType: body.caseType,
      depth: body.depth
    })

    // 验证请求数据
    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: '缺少事件数据' },
        { status: 400 }
      )
    }

    // 构建分析请求
    const analysisRequest: ClaimAnalysisRequest = {
      events: body.events,
      caseType: body.caseType,
      focusAreas: body.focusAreas || ['claims', 'defenses', 'limitations', 'burden-of-proof'],
      depth: body.depth || 'comprehensive'
    }

    // 执行AI请求权分析
    const analysisResult = await analyzeTimelineClaimsWithAI(analysisRequest)

    const processingTime = Date.now() - startTime
    console.log('✅ Claim analysis completed in', processingTime, 'ms')

    // 确保返回完整的分析结果
    const result: ClaimAnalysisResult = {
      ...analysisResult,
      metadata: {
        ...analysisResult.metadata,
        processingTime
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Claim analysis error:', error)
    
    const processingTime = Date.now() - startTime
    
    // 根据错误类型返回不同的响应
    if (error instanceof Error) {
      if (error.message.includes('API Key未配置') || error.message.includes('API错误')) {
        return NextResponse.json(
          { 
            error: 'AI服务暂时不可用，请稍后重试',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 503 }
        )
      }
      
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

    // 通用错误处理
    return NextResponse.json(
      { 
        error: '分析失败，请稍后重试',
        processingTime,
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}