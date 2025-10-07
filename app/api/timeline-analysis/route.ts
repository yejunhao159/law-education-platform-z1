/**
 * 时间轴分析API - 重构版
 * 职责：仅处理HTTP请求/响应，业务逻辑移至Application Service
 * DeepPractice Standards Compliant
 */

import { NextRequest, NextResponse } from 'next/server';
import { TimelineAnalysisApplicationService } from '../../../src/domains/legal-analysis/services/TimelineAnalysisApplicationService';
import { TimelineErrorCode, AnalysisType } from '../../../src/domains/legal-analysis/services/types/TimelineTypes';

// 创建服务实例
const timelineService = new TimelineAnalysisApplicationService();

/**
 * POST /api/timeline-analysis - 时间轴智能分析
 */
export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const requestData = await parseRequest(req);

    // 强制开启AI分析以支持智能时间轴功能
    const enhancedRequestData = {
      ...requestData,
      includeAI: true,
      analysisType: AnalysisType.COMPREHENSIVE
    };

    // 执行业务逻辑（Service成功返回数据，失败抛异常）
    const result = await timelineService.analyzeTimeline(enhancedRequestData);

    // Service成功返回，直接返回200
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Timeline API错误:', error);
    return handleError(error);
  }
}

/**
 * OPTIONS - CORS支持
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// ========== 私有辅助方法 ==========

/**
 * 解析请求数据
 */
async function parseRequest(req: NextRequest) {
  try {
    const body = await req.json();

    // 构建标准请求对象
    return {
      events: body.events || [],
      analysisType: body.analysisType || AnalysisType.COMPREHENSIVE,
      includeAI: body.includeAI !== false, // 默认启用AI
      focusAreas: body.focusAreas || [],
      options: {
        ...body.options,
        enableRiskAnalysis: body.options?.enableRiskAnalysis !== false,
        enablePredictions: body.options?.enablePredictions !== false,
        enableEvidenceChain: body.options?.enableEvidenceChain !== false,
        maxTurningPoints: body.options?.maxTurningPoints || 5,
        confidenceThreshold: body.options?.confidenceThreshold || 0.7
      }
    };
  } catch (error) {
    throw new Error('请求数据格式错误');
  }
}

/**
 * 获取错误状态码
 */
function _getErrorStatusCode(errorCode?: TimelineErrorCode): number {
  switch (errorCode) {
    case TimelineErrorCode.INVALID_EVENTS:
    case TimelineErrorCode.MISSING_DATA:
      return 400;
    case TimelineErrorCode.AI_SERVICE_ERROR:
      return 503;
    case TimelineErrorCode.PROCESSING_ERROR:
    case TimelineErrorCode.INTERNAL_ERROR:
    default:
      return 500;
  }
}

/**
 * 统一错误处理
 */
function handleError(error: unknown): NextResponse {
  const _message = error instanceof Error ? error.message : '未知错误';

  return NextResponse.json({
    success: false,
    error: {
      message: '服务器内部错误',
      code: TimelineErrorCode.INTERNAL_ERROR
    }
  }, {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}