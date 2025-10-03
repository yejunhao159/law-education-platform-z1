/**
 * API端点：查看完整的Socratic提示词
 * 用于调试和理解提示词结构
 */

import { NextRequest, NextResponse } from 'next/server';
import { FullPromptBuilder, type FullPromptContext } from '@/src/domains/socratic-dialogue/services/FullPromptBuilder';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const context: FullPromptContext = {
      mode: body.mode || 'exploration',
      difficulty: body.difficulty || 'intermediate',
      topic: body.topic || '法学基础讨论',
      issuePhase: body.issuePhase,
      includeDiagnostics: body.includeDiagnostics !== false  // 默认true
    };

    const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);

    return NextResponse.json({
      success: true,
      data: {
        systemPrompt,
        context,
        stats: {
          length: systemPrompt.length,
          estimatedTokens: Math.ceil(systemPrompt.length / 2.3),
          sections: 8
        }
      }
    });

  } catch (error) {
    console.error('[view-prompt] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
