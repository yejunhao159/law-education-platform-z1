/**
 * 学习报告生成API
 * POST /api/teaching-acts/summary
 */

import { NextResponse } from 'next/server';
import { caseSummaryService } from '@/src/domains/teaching-acts/services/CaseSummaryService';

export async function POST(request: Request) {
  try {
    console.log('开始生成学习报告...');

    // 🔧 修复：从请求体接收客户端Store数据
    const storeData = await request.json();

    console.log('📥 [API] 接收到客户端Store数据:', {
      uploadData存在: !!storeData.uploadData?.extractedElements,
      analysisData存在: !!storeData.analysisData?.result,
      socraticLevel: storeData.socraticData?.level || 1,
      completedNodes: storeData.socraticData?.completedNodes?.length || 0
    });

    // 生成报告（传递客户端数据）
    const report = await caseSummaryService.generateCaseSummary(storeData);

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