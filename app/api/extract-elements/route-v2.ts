/**
 * 三要素提取API - 过渡版本
 * 支持新旧两种服务切换，实现平滑迁移
 *
 * 使用方式：
 * - 默认：使用旧版服务（保持兼容）
 * - X-API-Version: v2：使用新版DDD服务
 * - X-API-Version: auto：自动选择最佳服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { LegalExtractionApplicationService } from '@/src/domains/legal-analysis/services/LegalExtractionApplicationService';
import { ExtractionAdapter } from '@/src/adapters/extraction-adapter';
import { LegalParser } from '@/src/domains/document-processing';
import { LegalAIAgent, IntelligentMerger } from '@/lib/ai-legal-agent';

/**
 * 版本选择策略
 */
function selectVersion(request: NextRequest): 'v1' | 'v2' | 'auto' {
  const version = request.headers.get('X-API-Version');

  if (version === 'v2') return 'v2';
  if (version === 'auto') return 'auto';

  // 默认使用v1保持兼容
  return 'v1';
}

/**
 * 统一的POST处理器
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const version = selectVersion(request);

  try {
    const body = await request.json();
    const { text, useAI = true, apiKey } = body;

    if (!text) {
      return NextResponse.json(
        { error: '请提供判决书文本' },
        { status: 400 }
      );
    }

    console.log(`📊 使用版本: ${version}`);

    // 根据版本选择服务
    switch (version) {
      case 'v2':
        return await handleV2(text, useAI);

      case 'auto':
        return await handleAuto(text, useAI, apiKey);

      case 'v1':
      default:
        return await handleV1(text, useAI, apiKey);
    }

  } catch (error) {
    console.error('三要素提取失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '处理失败',
      version
    }, { status: 500 });
  }
}

/**
 * V2版本处理 - 使用新版DDD服务
 */
async function handleV2(text: string, useAI: boolean): Promise<NextResponse> {
  console.log('🚀 使用新版DDD服务');

  const extractionService = new LegalExtractionApplicationService();
  const result = await extractionService.extractThreeElements(text, { useAI });

  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: result.error || '提取失败',
      method: 'v2-service'
    }, { status: 500 });
  }

  // 返回标准三要素格式
  return NextResponse.json({
    success: true,
    method: result.method || 'ai-enhanced',
    data: result.data,
    confidence: result.data?.metadata?.confidence || 85,
    version: 'v2'
  });
}

/**
 * V1版本处理 - 使用旧版服务（保持原逻辑）
 */
async function handleV1(text: string, useAI: boolean, apiKey?: string): Promise<NextResponse> {
  console.log('📦 使用旧版服务');

  // Step 1: 规则引擎提取
  const ruleBasedResult = LegalParser.parse(text);

  if (!useAI) {
    // 仅规则引擎模式
    return NextResponse.json({
      success: true,
      method: 'rule-based',
      data: formatV1RuleResult(ruleBasedResult),
      confidence: 60,
      version: 'v1'
    });
  }

  // Step 2: AI增强
  try {
    const aiAgent = new LegalAIAgent(apiKey);
    const aiResult = await aiAgent.extractThreeElements(text);
    const mergedResult = IntelligentMerger.merge(aiResult, ruleBasedResult);

    return NextResponse.json({
      success: true,
      method: 'ai-enhanced',
      data: formatV1AIResult(aiResult, ruleBasedResult),
      confidence: aiResult.metadata?.confidence || 85,
      version: 'v1'
    });

  } catch (aiError) {
    // AI失败降级
    console.error('AI分析失败，降级到规则引擎:', aiError);

    return NextResponse.json({
      success: true,
      method: 'rule-based-fallback',
      data: formatV1RuleResult(ruleBasedResult),
      confidence: 60,
      warning: 'AI服务暂时不可用，使用规则引擎结果',
      version: 'v1'
    });
  }
}

/**
 * Auto版本处理 - 智能选择最佳服务
 */
async function handleAuto(text: string, useAI: boolean, apiKey?: string): Promise<NextResponse> {
  console.log('🤖 自动选择最佳服务');

  // 尝试新版服务
  try {
    const v2Result = await handleV2(text, useAI);
    const v2Data = await v2Result.json();

    // 如果新版服务成功且置信度高，使用新版
    if (v2Data.success && v2Data.confidence >= 80) {
      console.log('✅ 选择新版服务（置信度高）');
      return NextResponse.json({ ...v2Data, selectedVersion: 'v2' });
    }
  } catch (error) {
    console.warn('新版服务失败，尝试旧版:', error);
  }

  // 降级到旧版服务
  console.log('📦 降级到旧版服务');
  const v1Result = await handleV1(text, useAI, apiKey);
  const v1Data = await v1Result.json();

  return NextResponse.json({ ...v1Data, selectedVersion: 'v1' });
}

/**
 * 格式化V1规则引擎结果
 */
function formatV1RuleResult(ruleBasedResult: any): any {
  return {
    basicInfo: {
      caseNumber: ruleBasedResult.caseNumber || '',
      court: ruleBasedResult.court || '',
      date: ruleBasedResult.date || '',
      parties: { plaintiff: '', defendant: '' }
    },
    threeElements: {
      facts: {
        summary: '基于规则引擎提取的事实摘要',
        timeline: [],
        keyFacts: [],
        disputedFacts: [],
        undisputedFacts: []
      },
      evidence: {
        summary: '基于规则引擎提取的证据概况',
        items: ruleBasedResult.evidence || []
      },
      reasoning: {
        summary: '基于规则引擎提取的推理摘要',
        legalBasis: [],
        logicChain: [],
        keyArguments: [],
        judgment: ''
      }
    },
    metadata: {
      confidence: 60,
      processingTime: Date.now(),
      aiModel: 'rule-based-engine'
    }
  };
}

/**
 * 格式化V1 AI结果
 */
function formatV1AIResult(aiResult: any, ruleBasedResult: any): any {
  return {
    basicInfo: {
      caseNumber: aiResult.basicInfo?.caseNumber || ruleBasedResult.caseNumber || '',
      court: aiResult.basicInfo?.court || ruleBasedResult.court || '',
      date: aiResult.basicInfo?.judgeDate || ruleBasedResult.date || '',
      parties: aiResult.basicInfo?.parties || { plaintiff: '', defendant: '' }
    },
    threeElements: {
      facts: {
        summary: aiResult.facts?.summary || '事实摘要待完善',
        timeline: aiResult.facts?.timeline || [],
        keyFacts: aiResult.facts?.keyFacts || [],
        disputedFacts: aiResult.facts?.disputedFacts || [],
        undisputedFacts: aiResult.facts?.undisputedFacts || []
      },
      evidence: {
        summary: aiResult.evidence?.summary || '证据概况待完善',
        items: aiResult.evidence?.items || []
      },
      reasoning: {
        summary: aiResult.reasoning?.summary || '推理摘要待完善',
        legalBasis: aiResult.reasoning?.legalBasis || [],
        logicChain: aiResult.reasoning?.logicChain || [],
        keyArguments: aiResult.reasoning?.keyArguments || [],
        judgment: aiResult.reasoning?.judgment || ''
      }
    },
    metadata: {
      confidence: aiResult.metadata?.confidence || 85,
      processingTime: aiResult.metadata?.processingTime || Date.now(),
      aiModel: aiResult.metadata?.aiModel || 'deepseek-chat'
    }
  };
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
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Version',
    }
  });
}