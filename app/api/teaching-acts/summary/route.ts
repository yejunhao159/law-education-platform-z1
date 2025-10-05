/**
 * 学习报告生成API
 * POST /api/teaching-acts/summary
 */

import { NextResponse } from 'next/server';
import { caseSummaryService } from '@/src/domains/teaching-acts/services/CaseSummaryService';

export async function POST() {
  try {
    console.log('开始生成学习报告...');
    
    // 生成报告
    const report = await caseSummaryService.generateCaseSummary();
    
    console.log('学习报告生成成功');
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('生成学习报告失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '报告生成失败，请重试'
    }, { status: 500 });
  }
}