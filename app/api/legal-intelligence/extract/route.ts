/**
 * 法律智能提取API - 重构版
 * 职责：仅处理HTTP请求/响应，业务逻辑移至Application Service
 * DeepPractice Standards Compliant
 */

import { NextRequest, NextResponse } from 'next/server';
import { LegalExtractionApplicationService } from '../../../../src/domains/legal-analysis/services/LegalExtractionApplicationService';
import type { ExtractionRequest } from '../../../../src/domains/legal-analysis/services/types/ExtractionTypes';

// 创建服务实例
const extractionService = new LegalExtractionApplicationService();

/**
 * 法律智能提取API
 */
export async function POST(req: NextRequest) {
  try {
    // 解析请求
    const request = await parseRequest(req);

    // 执行业务逻辑
    const result = await extractionService.extractLegalElements(request);

    // 返回响应
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        {
          error: result.error || '提取过程中发生错误',
          message: result.error
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ API层错误:', error);
    return handleError(error);
  }
}

/**
 * 解析请求数据
 */
async function parseRequest(req: NextRequest): Promise<ExtractionRequest> {
  try {
    const body = await req.json();

    // 基本验证
    if (!body.text) {
      throw new Error('请提供要分析的文本');
    }

    // 构建标准请求对象
    const request: ExtractionRequest = {
      text: body.text,
      options: {
        enableAI: body.options?.enableAI ?? true,
        elementType: body.options?.elementType ?? 'all',
        enhanceWithProvisions: body.options?.enhanceWithProvisions ?? true,
        cacheEnabled: body.options?.cacheEnabled ?? true
      }
    };

    return request;

  } catch (error) {
    throw new Error('请求数据格式错误');
  }
}

/**
 * 统一错误处理
 */
function handleError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '未知错误';

  // 根据错误类型返回不同状态码
  const status = message.includes('请提供') || message.includes('格式错误') ? 400 : 500;

  return NextResponse.json(
    {
      error: '提取过程中发生错误',
      message: message
    },
    { status }
  );
}