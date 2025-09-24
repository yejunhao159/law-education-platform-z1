/**
 * 苏格拉底教学API - DDD架构版本
 * 纯适配层：只做请求响应转换，所有业务逻辑交给Domain层处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { EnhancedSocraticService } from '@/src/domains/socratic-dialogue/services/EnhancedSocraticService';
import {
  SocraticDifficultyLevel,
  SocraticMode,
  SocraticDifficulty,
  type SocraticRequest as DomainSocraticRequest,
  type SocraticMessage
} from '@/lib/types/socratic/ai-service';

// API层的简化请求接口 - 移除复杂的难度和模式选择
interface APISocraticRequest {
  question: string;
  context: {
    caseTitle?: string;
    facts?: string[];
    laws?: string[];
    dispute?: string;
    previousMessages?: Array<{
      role: 'teacher' | 'ai' | 'student';
      content: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: APISocraticRequest = await request.json();

    // 基础验证
    if (!body.question) {
      return NextResponse.json({
        success: false,
        error: '缺少问题内容'
      }, { status: 400 });
    }

    console.log('使用Domain层EnhancedSocraticService处理请求...');

    // 将API请求转换为Domain层请求
    const domainRequest = convertAPIRequestToDomainRequest(body);

    // 创建Domain层服务实例
    const socraticService = new EnhancedSocraticService();

    // 调用Domain层服务
    const domainResponse = await socraticService.generateSocraticQuestion(domainRequest);

    // 检查Domain层响应
    if (!domainResponse.success) {
      return NextResponse.json({
        success: false,
        error: domainResponse.error?.message || '苏格拉底对话生成失败'
      }, { status: 500 });
    }

    // 将Domain层响应转换为API响应
    const apiResponse = convertDomainResponseToAPIResponse(domainResponse, body);

    return NextResponse.json({
      success: true,
      data: apiResponse
    });

  } catch (error) {
    console.error('API层错误:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

/**
 * 将API层请求转换为Domain层请求
 * 简化版：使用固定的默认教学配置
 */
function convertAPIRequestToDomainRequest(apiRequest: APISocraticRequest): DomainSocraticRequest {
  // 使用固定的中等难度和分析模式，简化教学流程
  const defaultLevel = SocraticDifficultyLevel.INTERMEDIATE;
  const defaultMode = SocraticMode.ANALYSIS;

  // 转换消息历史
  const messages: SocraticMessage[] = (apiRequest.context.previousMessages || []).map(msg => ({
    role: msg.role === 'student' ? 'user' : 'assistant',
    content: msg.content,
    timestamp: new Date().toISOString()
  }));

  // 构建案例上下文
  let caseContext = '';
  if (apiRequest.context.caseTitle) {
    caseContext += `案例：${apiRequest.context.caseTitle}\n`;
  }
  if (apiRequest.context.dispute) {
    caseContext += `争议焦点：${apiRequest.context.dispute}\n`;
  }
  if (apiRequest.context.facts && apiRequest.context.facts.length > 0) {
    caseContext += `关键事实：${apiRequest.context.facts.join('；')}\n`;
  }
  if (apiRequest.context.laws && apiRequest.context.laws.length > 0) {
    caseContext += `相关法条：${apiRequest.context.laws.join('；')}\n`;
  }

  return {
    level: defaultLevel,
    mode: defaultMode,
    currentTopic: apiRequest.question,
    caseContext: caseContext || undefined,
    messages: messages.length > 0 ? messages : undefined,
    sessionId: `api-${Date.now()}`, // 生成临时会话ID
    difficulty: 'MEDIUM' // 固定使用中等难度
  };
}

/**
 * 将Domain层响应转换为API层响应
 * 简化版：移除复杂的level处理逻辑
 */
function convertDomainResponseToAPIResponse(
  domainResponse: any,
  originalRequest: APISocraticRequest
): any {
  // 从Domain层响应中提取核心内容
  const aiResponse = domainResponse.data.question || domainResponse.data.content;

  // 尝试解析AI响应为结构化格式
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(aiResponse);
  } catch {
    // 如果不是JSON格式，创建简化的响应结构
    parsedResponse = {
      answer: aiResponse,
      followUpQuestions: generateCompatibilityFollowUpQuestions(),
      analysis: {
        keyPoints: ["基于统一苏格拉底身份的教学引导"],
        weaknesses: ["需要结合Domain层的具体分析"],
        suggestions: ["使用ISSUE协作范式深化理解"]
      }
    };
  }

  return parsedResponse;
}

/**
 * 生成后续引导问题
 * 简化版：提供通用的苏格拉底式引导问题
 */
function generateCompatibilityFollowUpQuestions(): string[] {
  return [
    "学生是否理解了案例的关键法律问题？",
    "需要引导学生思考哪些其他角度？",
    "如何帮助学生深化法律分析？"
  ];
}