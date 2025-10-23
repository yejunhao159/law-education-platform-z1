/**
 * 时间轴分析API - 重构版
 * 职责：仅处理HTTP请求/响应，业务逻辑移至Application Service
 * DeepPractice Standards Compliant
 */

import { NextRequest, NextResponse } from 'next/server';
import { TimelineAnalysisApplicationService } from '../../../src/domains/legal-analysis/services/TimelineAnalysisApplicationService';
import { TimelineErrorCode, AnalysisType } from '../../../src/domains/legal-analysis/services/types/TimelineTypes';
import { teachingSessionRepository } from '@/src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository';
import { jwtUtils } from '@/lib/auth/jwt';

// 创建服务实例
const timelineService = new TimelineAnalysisApplicationService();

/**
 * POST /api/timeline-analysis - 时间轴智能分析
 */
export async function POST(req: NextRequest) {
  try {
    // 获取当前用户（从JWT）
    const currentUser = await jwtUtils.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 解析请求
    const requestData = await parseRequest(req);
    const { sessionId } = requestData;

    console.log('🚀 [时间轴分析API] 请求信息:', {
      hasSessionId: !!sessionId,
      eventsCount: requestData.events?.length
    });

    // 智能缓存策略：只有在非强制重新生成时才使用缓存
    const forceRegenerate = requestData.forceRegenerate === true;

    if (sessionId && !forceRegenerate) {
      const existingSession = await teachingSessionRepository.findById(sessionId, currentUser.userId);
      if (existingSession?.act2?.timelineAnalysis) {
        console.log('✅ [时间轴分析API] 从数据库读取已有分析（缓存模式）');
        return NextResponse.json({
          success: true,
          data: {
            analysis: existingSession.act2.timelineAnalysis,
            fromCache: true
          }
        }, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    if (forceRegenerate) {
      console.log('🔄 [时间轴分析API] 强制重新生成模式，跳过缓存');
    }

    // 强制开启AI分析以支持智能时间轴功能
    const enhancedRequestData = {
      ...requestData,
      includeAI: true,
      analysisType: AnalysisType.COMPREHENSIVE
    };

    // 执行业务逻辑（Service成功返回数据，失败抛异常）
    console.log('🎨 [时间轴分析API] 生成新的AI分析...');
    const result = await timelineService.analyzeTimeline(enhancedRequestData);

    // 保存到数据库（如果提供了sessionId）
    if (sessionId && result.success) {
      try {
        const existingSession = await teachingSessionRepository.findById(sessionId, currentUser.userId);
        if (existingSession && existingSession.act1) {
          console.log('💾 [时间轴分析API] 保存分析到数据库...');

          // 🔍 调试：查看API返回的完整分析数据
          console.log('🔍 [时间轴分析API] 准备保存的完整analysis对象:', {
            hasAnalysis: !!result.data.analysis,
            analysisKeys: result.data.analysis ? Object.keys(result.data.analysis) : [],
            turningPointsCount: result.data.analysis?.turningPoints?.length || result.data.analysis?.keyTurningPoints?.length || 0,
            legalRisksCount: result.data.analysis?.legalRisks?.length || 0,
            hasSummary: !!result.data.analysis?.summary,
            confidence: result.data.analysis?.confidence,
            hasEvidenceMapping: !!result.data.analysis?.evidenceMapping,
            analysisSource: result.data.analysis?.analysisSource
          });

          const snapshot = {
            schemaVersion: 1 as const,
            version: '1.0.0' as const,
            sessionState: existingSession.sessionState === 'act1' ? 'act2' as const : existingSession.sessionState,
            caseTitle: existingSession.caseTitle,
            caseNumber: existingSession.caseNumber || undefined,
            courtName: existingSession.courtName || undefined,
            act1: existingSession.act1,
            act2: {
              ...existingSession.act2,
              timelineAnalysis: result.data.analysis,
              completedAt: existingSession.act2?.completedAt || new Date().toISOString()
            },
            act3: existingSession.act3,
            act4: existingSession.act4,
            createdAt: existingSession.createdAt,
            updatedAt: new Date().toISOString(),
            lastSavedAt: new Date().toISOString(),
            saveType: 'auto' as const
          };

          await teachingSessionRepository.saveSnapshot(currentUser.userId, snapshot, sessionId);
          console.log('✅ [时间轴分析API] 分析已保存到数据库');
        }
      } catch (saveError) {
        console.error('⚠️ [时间轴分析API] 保存到数据库失败，但分析生成成功:', saveError);
      }
    }

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
      sessionId: body.sessionId, // 🆕 添加sessionId
      forceRegenerate: body.forceRegenerate === true, // 🆕 强制重新生成标志
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
 * 统一错误处理
 */
function handleError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '未知错误';

  return NextResponse.json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'development' ? message : '服务器内部错误',
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
