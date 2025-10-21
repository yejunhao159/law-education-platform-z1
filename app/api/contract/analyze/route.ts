/**
 * 合同分析API路由
 * POST /api/contract/analyze
 *
 * 功能：
 * 1. 接收合同文本
 * 2. 调用ContractParsingService解析合同
 * 3. 返回结构化的分析结果
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContractParsingService } from '@/src/domains/contract-analysis/services/ContractParsingService';

/**
 * POST 请求处理器
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 解析请求体
    const body = await req.json();
    const { contractText } = body;

    // 2. 验证输入
    if (!contractText || typeof contractText !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: '缺少合同文本或格式不正确',
          message: '请提供有效的合同文本内容',
        },
        { status: 400 }
      );
    }

    // 检查文本长度
    if (contractText.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: '合同文本过短',
          message: '合同内容至少需要50个字符',
        },
        { status: 400 }
      );
    }

    if (contractText.length > 50000) {
      return NextResponse.json(
        {
          success: false,
          error: '合同文本过长',
          message: '合同内容不能超过50000个字符',
        },
        { status: 400 }
      );
    }

    console.log(`📋 收到合同分析请求，文本长度: ${contractText.length}`);

    // 3. 调用合同解析服务
    const parsingService = new ContractParsingService();
    const parsedContract = await parsingService.parseContract(contractText);

    // 4. 构建响应数据
    const duration = Date.now() - startTime;

    console.log(`✅ 合同分析完成，耗时: ${duration}ms`);

    return NextResponse.json(
      {
        success: true,
        data: {
          contract: parsedContract,
          analysis: {
            // 基础分析结果
            contractType: parsedContract.metadata.contractType,
            parties: parsedContract.metadata.parties,
            clauseCount: parsedContract.clauses.length,
            extractionQuality:
              parsedContract.extractionConfidence >= 0.7 ? 'good' : 'low',

            // 简单的统计信息
            stats: {
              totalClauses: parsedContract.clauses.length,
              clausesByCategory: this.getClausesByCategory(parsedContract.clauses),
              wordCount: contractText.length,
              estimatedReadTime: Math.ceil(contractText.length / 500), // 假设500字/分钟
            },
          },
          meta: {
            processingTime: duration,
            timestamp: new Date().toISOString(),
          },
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Processing-Time': duration.toString(),
        },
      }
    );
  } catch (error) {
    console.error('❌ 合同分析API错误:', error);

    // 错误处理
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return NextResponse.json(
      {
        success: false,
        error: 'ANALYSIS_FAILED',
        message: '合同分析失败，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * 辅助函数：按分类统计条款
 */
function getClausesByCategory(clauses: any[]) {
  const categoryCount: Record<string, number> = {};

  for (const clause of clauses) {
    const category = clause.category || '其他';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  }

  return categoryCount;
}

/**
 * GET 请求处理器 - 返回API信息
 */
export async function GET() {
  return NextResponse.json({
    service: 'Contract Analysis API',
    version: '1.0.0',
    endpoints: {
      analyze: {
        method: 'POST',
        path: '/api/contract/analyze',
        description: '分析合同文本，返回结构化数据',
        parameters: {
          contractText: {
            type: 'string',
            required: true,
            description: '合同纯文本内容',
            minLength: 50,
            maxLength: 50000,
          },
        },
      },
    },
    status: 'active',
  });
}
