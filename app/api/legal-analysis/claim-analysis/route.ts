import { NextResponse } from 'next/server';
import { ClaimAnalysisService, createClaimAnalysisRequest } from '@/src/domains/legal-analysis/services/ClaimAnalysisService';

/**
 * 请求权分析API路由
 * 用于Act2自动生成完整的请求权分析
 */
export async function POST(request: Request) {
  try {
    const { events, depth = 'detailed', caseType } = await request.json();

    console.log('🎯 [API] 收到请求权分析请求:', {
      eventCount: events?.length || 0,
      depth,
      caseType
    });

    // 验证输入
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少有效的时间轴事件数据'
        },
        { status: 400 }
      );
    }

    // 创建请求对象
    const claimRequest = createClaimAnalysisRequest(events, {
      depth: depth as 'basic' | 'detailed' | 'comprehensive',
      caseType
    });

    console.log('📋 [API] 创建请求权分析请求完成');

    // 调用ClaimAnalysisService
    const service = new ClaimAnalysisService();
    const result = await service.analyzeClaimStructure(claimRequest);

    console.log('✅ [API] 请求权分析完成:', {
      id: result.id,
      primaryClaims: result.claims?.primary?.length || 0,
      alternativeClaims: result.claims?.alternative?.length || 0,
      defenses: result.claims?.defense?.length || 0,
      confidence: result.metadata?.confidence
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ [API] 请求权分析失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: '请求权分析失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
