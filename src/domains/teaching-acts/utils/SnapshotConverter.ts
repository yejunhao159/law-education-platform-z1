/**
 * 教学会话快照转换器
 * 负责 Zustand Store ↔ Database Snapshot 的双向转换
 * DeepPractice Standards Compliant
 */

import type { TeachingSessionSnapshot } from '../repositories/TeachingSessionRepository';

export class SnapshotConverter {
  /**
   * 从 Zustand Store 创建数据库快照
   * @param storeState useTeachingStore.getState() 的返回值
   * @param pptUrl PPT下载链接（可选）
   */
  static fromStore(storeState: any, pptUrl?: string): TeachingSessionSnapshot {
    // 提取案例基本信息
    const extractedData = storeState.uploadData?.extractedElements as any;
    const caseInfo = extractedData?.data || extractedData || {};

    const caseTitle =
      caseInfo.title ||
      caseInfo.caseTitle ||
      caseInfo.案件名称 ||
      caseInfo.caseNumber ||
      caseInfo.案号 ||
      '未命名案例';

    const caseNumber = caseInfo.caseNumber || caseInfo.案号 || '';
    const courtName = caseInfo.court || caseInfo.法院 || '';

    // 转换第3幕数据：将Set转为Array
    const completedNodes = Array.isArray(storeState.socraticData?.completedNodes)
      ? storeState.socraticData.completedNodes
      : Array.from(storeState.socraticData?.completedNodes || []);

    // 构建快照
    const snapshot: TeachingSessionSnapshot = {
      caseTitle,
      caseNumber: caseNumber || undefined,
      courtName: courtName || undefined,

      act1_upload: {
        extractedElements: storeState.uploadData?.extractedElements || {},
        confidence: storeState.uploadData?.confidence || 0,
        originalFileName: caseInfo.originalFileName || '',
        uploadedAt: new Date().toISOString(),
      },

      act2_analysis: {
        result: storeState.analysisData?.result || {},
        completedAt: new Date().toISOString(),
      },

      act3_socratic: {
        level: storeState.socraticData?.level || 1,
        completedNodes,
        totalRounds: completedNodes.length,
        completedAt: new Date().toISOString(),
      },

      act4_summary: {
        learningReport: storeState.summaryData?.caseLearningReport || {},
        pptUrl: pptUrl || undefined,
        pptMetadata: pptUrl
          ? {
              generatedAt: new Date().toISOString(),
            }
          : undefined,
        completedAt: new Date().toISOString(),
      },
    };

    return snapshot;
  }

  /**
   * 从数据库快照恢复到 Zustand Store
   * @param dbSession 数据库查询结果
   */
  static toStore(dbSession: any): any {
    // 🆕 Step 5: 完整恢复扩展后的DeepAnalysisResult
    const analysisResult = dbSession.act2_analysis?.result || null;

    return {
      uploadData: {
        extractedElements: dbSession.act1_upload?.extractedElements || null,
        confidence: dbSession.act1_upload?.confidence || 0,
      },

      analysisData: {
        result: analysisResult,
        isAnalyzing: false,
      },

      // 🆕 恢复AI故事章节（从analysisResult.narrative中提取）
      storyChapters: analysisResult?.narrative?.chapters || [],

      socraticData: {
        isActive: false,
        level: dbSession.act3_socratic?.level || 1,
        teachingModeEnabled: false,
        completedNodes: new Set(dbSession.act3_socratic?.completedNodes || []),
      },

      summaryData: {
        report: null,
        caseLearningReport: dbSession.act4_summary?.learningReport || null,
        isGenerating: false,
      },

      currentAct: 'upload' as const, // 从第1幕开始查看

      // 元数据（用于UI展示和行为控制）
      _snapshot: {
        sessionId: dbSession.id,
        caseTitle: dbSession.caseTitle || dbSession.case_title,
        caseNumber: dbSession.caseNumber || dbSession.case_number,
        pptUrl: dbSession.act4_summary?.pptUrl,
        createdAt: dbSession.createdAt || dbSession.created_at,
        isReadOnly: true, // 标记为只读模式
        source: 'database', // 标记数据来源
        // 新增：方便调试的元数据
        hasNarrative: !!analysisResult?.narrative,
        narrativeChaptersCount: analysisResult?.narrative?.chapters?.length || 0,
        hasTimelineAnalysis: !!analysisResult?.timelineAnalysis,
        hasEvidenceQuestions: !!analysisResult?.evidenceQuestions,
        hasClaimAnalysis: !!analysisResult?.claimAnalysis,
      },

      // UI状态重置
      storyMode: true,
      loading: false,
      error: null,
    };
  }

  /**
   * 验证快照数据完整性
   */
  static validate(snapshot: TeachingSessionSnapshot): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!snapshot.caseTitle) {
      errors.push('缺少案例标题');
    }

    if (!snapshot.act1_upload?.extractedElements) {
      errors.push('缺少第1幕数据');
    }

    if (!snapshot.act2_analysis?.result) {
      errors.push('缺少第2幕分析结果');
    }

    if (!snapshot.act4_summary?.learningReport) {
      errors.push('缺少第4幕学习报告');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
