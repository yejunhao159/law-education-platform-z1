/**
 * 智能判决书三要素提取API
 * @description 基于规则引擎和AI融合的法律文档智能分析系统，专业提取判决书核心要素
 * @author DeepPractice Legal Intelligence System
 * @version 1.0.0
 *
 * 核心功能：
 * - 判决书三要素自动提取（事实、证据质证、法官说理）
 * - 规则引擎基础分析（快速、稳定）
 * - AI深度语义理解（精准、智能）
 * - 双重技术智能融合（优势互补）
 * - 自动降级备选机制（高可用性）
 * - 基本信息元数据提取（案号、法院、日期）
 *
 * 技术架构：
 * - 双轨并行：规则引擎 + AI Agent
 * - 智能融合：IntelligentMerger优势结合
 * - 降级保障：AI失败时规则引擎备选
 * - 置信度评估：动态信任分数机制
 */

import { NextRequest, NextResponse } from 'next/server';
import { LegalParser } from '@/src/domains/document-processing';
// 使用DeepSeek版本的AI Agent
import { LegalAIAgent, DeepSeekLegalAgent, IntelligentMerger } from '@/lib/ai-legal-agent';

/**
 * POST /api/extract-elements - 智能判决书三要素提取处理器
 * @description 接收判决书文本，通过规则引擎和AI融合技术进行三要素智能提取
 * @param request - Next.js请求对象，包含判决书文本和提取配置
 * @returns 结构化的三要素提取结果
 *
 * 请求体格式：
 * {
 *   "text": "判决书全文内容（必需）",
 *   "useAI": true,  // 是否启用AI增强（可选，默认true）
 *   "apiKey": "AI_API_KEY"  // API密钥（可选，优先使用环境变量）
 * }
 *
 * 响应格式：
 * {
 *   "success": true,
 *   "method": "ai-enhanced | rule-based | rule-based-fallback",
 *   "data": {
 *     "basicInfo": { "caseNumber": "", "court": "", "judgeDate": "" },
 *     "threeElements": { "facts": [], "evidence": [], "reasoning": [] },
 *     "ruleBasedSupplement": { "disputes": [], "basicEvidence": [] },
 *     "metadata": { "confidence": 0.85, "processingTime": 1200 }
 *   },
 *   "confidence": 85
 * }
 *
 * 处理流程：
 * - Step 1: 输入验证和参数解析
 * - Step 2: 规则引擎基础提取（始终执行）
 * - Step 3: AI深度分析（可选启用）
 * - Step 4: 智能融合优化（结合双方优势）
 * - Step 5: 失败降级和错误处理
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: 解析请求参数并进行输入验证
    const { text, useAI = true, apiKey } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: '请提供判决书文本' },
        { status: 400 }
      );
    }
    
    // Step 1: 规则引擎快速提取（始终执行，作为基础）
    console.log('Step 1: 使用规则引擎进行初步提取...');
    const ruleBasedResult = LegalParser.parse(text);
    
    // Step 2: 根据配置决定是否启用AI增强
    if (!useAI) {
      return NextResponse.json({
        success: true,
        method: 'rule-based',
        data: ruleBasedResult,
        confidence: 60
      });
    }
    
    // Step 3: AI深度分析与智能融合处理
    try {
      console.log('Step 2: 使用AI进行深度分析...');
      const aiAgent = new LegalAIAgent(apiKey);
      const aiResult = await aiAgent.extractThreeElements(text);

      // Step 3: 智能融合（结合两者优势）
      console.log('Step 3: 智能融合规则和AI结果...');
      const mergedResult = IntelligentMerger.merge(aiResult, ruleBasedResult);

      return NextResponse.json({
        success: true,
        method: 'ai-enhanced',
        data: {
          // 基础信息（优先使用AI提取，规则引擎作为补充）
          basicInfo: {
            ...aiResult.basicInfo,
            // 如果AI未能提取某些字段，使用规则引擎的结果
            caseNumber: aiResult.basicInfo.caseNumber || ruleBasedResult.caseNumber || '',
            court: aiResult.basicInfo.court || ruleBasedResult.court || '',
            judgeDate: aiResult.basicInfo.judgeDate || ruleBasedResult.date || ''
          },
          
          // 三要素（AI深度分析）
          threeElements: {
            facts: aiResult.facts,
            evidence: aiResult.evidence,
            reasoning: aiResult.reasoning
          },
          
          // 规则引擎补充
          ruleBasedSupplement: {
            disputes: ruleBasedResult.disputes,
            basicEvidence: ruleBasedResult.evidence
          },
          
          // 元数据
          metadata: aiResult.metadata
        },
        confidence: aiResult.metadata.confidence
      });
      
    } catch (aiError) {
      // Step 4: AI分析失败时的降级处理机制
      console.error('AI分析失败，降级到规则引擎:', aiError);

      // 确定错误类型，提供更具体的提示
      let warningMessage = 'AI分析暂时不可用，使用规则引擎结果';
      if (aiError.message.includes('网络连接失败')) {
        warningMessage = 'AI服务网络连接失败，使用本地规则引擎结果';
      } else if (aiError.message.includes('API Key')) {
        warningMessage = 'AI服务配置问题，使用本地规则引擎结果';
      } else if (aiError.message.includes('超时')) {
        warningMessage = 'AI服务响应超时，使用本地规则引擎结果';
      }

      // 返回增强的规则引擎结果作为备选方案
      return NextResponse.json({
        success: true,
        method: 'rule-based-fallback',
        data: ruleBasedResult,
        confidence: 60,
        warning: warningMessage,
        errorDetails: {
          aiError: aiError.message,
          fallbackUsed: true,
          processingTime: Date.now() - (request as any).startTime || 0
        }
      });
    }
    
  } catch (error) {
    // Step 5: 全局异常处理和错误响应
    console.error('提取失败:', error);
    return NextResponse.json(
      {
        error: '提取过程出错',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/extract-elements - API使用说明和示例文档
 * @description 提供完整的API使用指南、参数说明和响应示例
 * @returns API文档和使用示例
 *
 * 响应内容：
 * - 接口基本信息
 * - 请求参数详细说明
 * - 响应格式和字段含义
 * - 完整的请求/响应示例
 * - 错误处理说明
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/extract-elements',
    method: 'POST',
    description: '智能提取判决书三要素（事实、证据质证、法官说理）',
    parameters: {
      text: '判决书全文（必需）',
      useAI: '是否使用AI增强（可选，默认true）',
      apiKey: 'OpenAI API密钥（可选，不提供则使用环境变量）'
    },
    response: {
      success: 'boolean - 是否成功',
      method: 'string - 使用的提取方法',
      data: 'object - 提取的三要素数据',
      confidence: 'number - 结果置信度(0-100)'
    },
    example: {
      request: {
        text: '判决书内容...',
        useAI: true
      },
      response: {
        success: true,
        method: 'ai-enhanced',
        data: {
          basicInfo: { /* 基本信息 */ },
          threeElements: { /* 三要素 */ },
          metadata: { /* 元数据 */ }
        },
        confidence: 85
      }
    }
  });
}