/**
 * Legal Analysis API - 统一入口
 * 职责：处理HTTP请求/响应，对接LegalAnalysisFacade
 * DeepPractice Standards Compliant
 *
 * 架构模式：参考 /app/api/socratic/route.ts 的成功实践
 *
 * 支持的分析类型：
 * - narrative：智能故事生成
 * - claim：请求权分析
 * - dispute：争议焦点分析
 * - evidence：证据质量评估
 * - extract：三要素提取
 * - timeline：时间轴生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { legalAnalysisFacade } from '@/src/domains/legal-analysis/services/LegalAnalysisFacade';
import { LegalErrorCode, type LegalAnalysisAction } from '@/src/domains/legal-analysis/types';

/**
 * POST /api/legal-analysis - 法律分析统一入口
 */
export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const requestData = await parseRequest(req);

    console.log('🎯 法律分析请求:', {
      action: requestData.action,
      paramsKeys: Object.keys(requestData.params || {}),
      timestamp: new Date().toISOString()
    });

    // 执行业务逻辑 - 调用LegalAnalysisFacade
    const result = await legalAnalysisFacade.analyze(requestData.action, requestData.params);

    console.log('✅ 法律分析响应:', {
      success: result.success,
      hasData: result.success && result.data ? true : false,
      error: !result.success && result.error ? result.error.code : undefined,
      processingTime: result.metadata?.processingTime
    });

    // 返回响应
    return NextResponse.json(result, {
      status: getStatusCode(result),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ Legal Analysis API错误:', error);
    return handleError(error);
  }
}

/**
 * GET /api/legal-analysis - 健康检查
 */
export async function GET() {
  try {
    const healthStatus = legalAnalysisFacade.getHealthStatus();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ...healthStatus
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// ========== 私有辅助方法 ==========

/**
 * 解析请求数据并验证格式
 */
async function parseRequest(req: NextRequest): Promise<{
  action: LegalAnalysisAction;
  params: any;
}> {
  try {
    const body = await req.json();

    // 基础验证
    if (!body || typeof body !== 'object') {
      throw new Error('请求体不能为空');
    }

    if (!body.action) {
      throw new Error('缺少action参数');
    }

    // 验证action类型
    const validActions: LegalAnalysisAction[] = [
      'narrative',
      'claim',
      'dispute',
      'evidence',
      'extract',
      'timeline'
    ];

    if (!validActions.includes(body.action)) {
      throw new Error(`无效的action类型: ${body.action}。有效值: ${validActions.join(', ')}`);
    }

    // 构建标准请求格式
    const requestData = {
      action: body.action as LegalAnalysisAction,
      params: body.params || body // 兼容两种传参方式
    };

    console.log('📝 解析后的请求数据:', {
      action: requestData.action,
      hasParams: !!requestData.params
    });

    return requestData;
  } catch (error) {
    console.error('❌ 请求解析失败:', error);
    throw new Error('请求数据格式错误: ' + (error instanceof Error ? error.message : '未知错误'));
  }
}

/**
 * 获取响应状态码
 */
function getStatusCode(result: any): number {
  if (result.success) {
    return 200;
  }

  // 检查error是否存在（类型守卫）
  if (!result.success && result.error) {
    switch (result.error.code) {
      case LegalErrorCode.INVALID_INPUT:
        return 400;
      case LegalErrorCode.SERVICE_UNAVAILABLE:
        return 503;
      case LegalErrorCode.AI_SERVICE_ERROR:
      case LegalErrorCode.EXTRACTION_FAILED:
      case LegalErrorCode.ANALYSIS_FAILED:
        return 500;
      default:
        return 500;
    }
  }

  return 500; // 默认返回500
}

/**
 * 统一错误处理
 */
function handleError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '未知错误';

  console.error('🚨 法律分析API错误详情:', {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });

  // 根据错误类型返回不同的错误码
  let errorCode = LegalErrorCode.INTERNAL_ERROR;
  let statusCode = 500;
  let errorMessage = '服务器内部错误';

  if (message.includes('请求数据格式错误') || message.includes('缺少action')) {
    errorCode = LegalErrorCode.INVALID_INPUT;
    statusCode = 400;
    errorMessage = '请求格式不正确';
  } else if (message.includes('API Key') || message.includes('API错误')) {
    errorCode = LegalErrorCode.SERVICE_UNAVAILABLE;
    statusCode = 503;
    errorMessage = 'AI服务暂时不可用';
  }

  return NextResponse.json({
    success: false,
    error: {
      message: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
      // 开发环境下提供详细错误信息
      ...(process.env.NODE_ENV === 'development' && { details: message })
    }
  }, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}