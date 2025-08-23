/**
 * API路由：智能提取判决书三要素
 * 整合规则引擎和AI智能体
 */

import { NextRequest, NextResponse } from 'next/server';
import { LegalParser } from '@/lib/legal-parser';
// 使用DeepSeek版本的AI Agent
import { LegalAIAgent, DeepSeekLegalAgent } from '@/lib/ai-legal-agent-deepseek';
import { IntelligentMerger } from '@/lib/ai-legal-agent';

export async function POST(request: NextRequest) {
  try {
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
    
    // 如果不使用AI，直接返回规则结果
    if (!useAI) {
      return NextResponse.json({
        success: true,
        method: 'rule-based',
        data: ruleBasedResult,
        confidence: 60
      });
    }
    
    // Step 2: AI深度分析（如果启用）
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
          // 基础信息（来自规则引擎）
          basicInfo: {
            caseNumber: ruleBasedResult.caseNumber,
            court: ruleBasedResult.court,
            date: ruleBasedResult.date,
            parties: ruleBasedResult.parties
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
      console.error('AI分析失败，降级到规则引擎:', aiError);
      
      // AI失败时，返回增强的规则结果
      return NextResponse.json({
        success: true,
        method: 'rule-based-fallback',
        data: ruleBasedResult,
        confidence: 60,
        warning: 'AI分析暂时不可用，使用规则引擎结果'
      });
    }
    
  } catch (error) {
    console.error('提取失败:', error);
    return NextResponse.json(
      { error: '提取过程出错', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * GET请求：返回API使用说明
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