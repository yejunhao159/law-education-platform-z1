/**
 * 教学会话快照转换器 V2
 * 负责 Zustand Store ↔ Database Snapshot 的双向转换
 *
 * V2新特性：
 * - 支持版本控制
 * - Zod Schema验证
 * - Store同步（解决timelineAnalysis等数据丢失问题）
 * - 详细的错误处理和日志
 *
 * DeepPractice Standards Compliant
 */

import type {
  TeachingSessionSnapshotV1,
  Act1Snapshot,
  Act2Snapshot,
  Act3Snapshot,
  Act4Snapshot,
  SessionState,
} from '../schemas/SnapshotSchemas';
import {
  validateTeachingSessionSnapshot,
  validateAct1Snapshot,
  validateAct2Snapshot,
  getValidationErrorMessage,
} from '../schemas/SnapshotSchemas';

// ========== 类型定义 ==========

/**
 * Store状态（从useTeachingStore读取）
 */
interface StoreState {
  uploadData?: {
    extractedElements?: any;
    confidence?: number;
  };
  analysisData?: {
    result?: any;
    isAnalyzing?: boolean;
  };
  storyChapters?: any[];
  socraticData?: {
    level?: 1 | 2 | 3;
    completedNodes?: Set<string> | string[];
  };
  summaryData?: {
    caseLearningReport?: any;
  };
  currentAct?: string;
  sessionId?: string | null;
  sessionState?: SessionState;
  lastSavedAt?: string | null;
  [key: string]: any;
}

/**
 * 数据库会话实体
 */
interface DatabaseSession {
  id: string;
  user_id?: number;
  schema_version?: number;
  data_version?: string;
  session_state?: string;
  case_title?: string;
  case_number?: string;
  court_name?: string;
  act1_basic_info?: any;
  act1_facts?: any;
  act1_evidence?: any;
  act1_reasoning?: any;
  act1_metadata?: any;
  act1_confidence?: number;
  act2_narrative?: any;
  act2_timeline_analysis?: any;
  act2_evidence_questions?: any;
  act2_claim_analysis?: any;
  act3_socratic?: any;
  act4_learning_report?: any;
  act4_ppt_url?: string;
  act4_ppt_metadata?: any;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  last_saved_at?: string;
  save_type?: string;
}

/**
 * 转换选项
 */
interface ConversionOptions {
  strict?: boolean;  // 严格模式：验证失败抛出异常
  skipValidation?: boolean;  // 跳过Zod验证（性能优化）
  syncStores?: boolean;  // 是否同步到其他Store（默认true）
  saveType?: 'manual' | 'auto';
}

// ========== 核心转换器类 ==========

export class SnapshotConverterV2 {
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly CURRENT_SCHEMA_VERSION = 1;

  /**
   * 从 Zustand Store 创建数据库快照
   * @param storeState useTeachingStore.getState() 的返回值
   * @param pptUrl PPT下载链接（可选）
   * @param options 转换选项
   */
  static toDatabase(
    storeState: StoreState,
    pptUrl?: string,
    options: ConversionOptions = {}
  ): TeachingSessionSnapshotV1 {
    const { strict = true, skipValidation = false, saveType } = options;

    try {
      // Step 1: 提取案例基本信息
      const caseInfo = this.extractCaseInfo(storeState);

      // Step 2: 检测会话状态
      const sessionState =
        storeState.sessionState ||
        this.mapActToSessionState(storeState.currentAct) ||
        this.detectSessionState(storeState);

      // Step 3: 构建Act1快照
      const act1 = this.buildAct1Snapshot(storeState);

      // Step 4: 构建Act2快照（如果存在）
      const act2 = this.buildAct2Snapshot(storeState);

      // Step 5: 构建Act3快照（如果存在）
      const act3 = this.buildAct3Snapshot(storeState);

      // Step 6: 构建Act4快照（如果存在）
      const act4 = this.buildAct4Snapshot(storeState, pptUrl);

      // Step 7: 组装完整快照
      const snapshot: TeachingSessionSnapshotV1 = {
        version: this.CURRENT_VERSION,
        schemaVersion: this.CURRENT_SCHEMA_VERSION,
        sessionState,
        caseTitle: caseInfo.title,
        caseNumber: caseInfo.number,
        courtName: caseInfo.court,
        act1,
        act2,
        act3,
        act4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSavedAt: new Date().toISOString(),
        saveType: saveType || 'manual',
      };

      // Step 8: Zod验证（可选）
      if (!skipValidation) {
        const validation = validateTeachingSessionSnapshot(snapshot);
        if (!validation.success && validation.error) {
          const errorMsg = getValidationErrorMessage(validation.error);
          console.error('❌ [SnapshotConverter] 快照验证失败:', errorMsg);

          if (strict) {
            throw new Error(`快照数据不符合Schema: ${errorMsg}`);
          }
        } else {
          console.log('✅ [SnapshotConverter] 快照验证通过');
        }
      }

      return snapshot;
    } catch (error) {
      console.error('❌ [SnapshotConverter] toDatabase转换失败:', error);
      throw error;
    }
  }

  /**
   * 从数据库快照恢复到 Zustand Store
   * @param dbSession 数据库查询结果
   * @param options 转换选项
   */
  static toStore(
    dbSession: DatabaseSession,
    options: ConversionOptions = {}
  ): StoreState {
    const { syncStores = true } = options;

    try {
      // Step 1: 版本兼容性检查
      this.checkVersion(dbSession);

      const sessionState = (dbSession.session_state ||
        (dbSession as any).sessionState ||
        'act1') as SessionState;
      const currentAct = this.mapSessionStateToAct(sessionState);

      // Step 2: 恢复基本数据到Store
      const storeData: StoreState = {
        sessionId: dbSession.id,
        sessionState,
        lastSavedAt: (dbSession as any).last_saved_at || (dbSession as any).lastSavedAt,
        uploadData: this.restoreAct1ToStore(dbSession),
        analysisData: this.restoreAct2ToStore(dbSession),
        storyChapters: this.restoreStoryChapters(dbSession),
        socraticData: this.restoreAct3ToStore(dbSession),
        summaryData: this.restoreAct4ToStore(dbSession),
        currentAct,

        // 元数据
        _snapshot: {
          sessionId: dbSession.id,
          caseTitle: (dbSession as any).case_title || (dbSession as any).caseTitle,
          caseNumber: (dbSession as any).case_number || (dbSession as any).caseNumber,
          pptUrl: (dbSession as any).act4_ppt_url || (dbSession as any).act4PptUrl,
          createdAt: (dbSession as any).created_at || (dbSession as any).createdAt,
          isReadOnly: true,
          source: 'database',
          schemaVersion:
            (dbSession as any).schema_version ||
            (dbSession as any).schemaVersion ||
            0,
          dataVersion:
            (dbSession as any).data_version ||
            (dbSession as any).dataVersion ||
            'unknown',
        },

        // UI状态重置
        storyMode: true,
        loading: false,
        error: null,
      };

      // Step 3: 同步到其他Store（解决timelineAnalysis丢失等问题）
      if (syncStores) {
        this.syncToAllStores(dbSession, storeData).catch((error) => {
          console.error('⚠️ [SnapshotConverter] Store同步失败（非致命）:', error);
        });
      }

      console.log('✅ [SnapshotConverter] 快照恢复成功', {
        sessionId: dbSession.id,
        sessionState,
        hasTimelineAnalysis: !!(
          (dbSession as any).act2_timeline_analysis ||
          (dbSession as any).act2TimelineAnalysis ||
          (dbSession as any).act2?.timelineAnalysis
        ),
        hasStoryChapters: !!(
          (dbSession as any).act2_narrative ||
          (dbSession as any).act2Narrative ||
          (dbSession as any).act2?.narrative
        )?.chapters,
      });

      return storeData;
    } catch (error) {
      console.error('❌ [SnapshotConverter] toStore转换失败:', error);
      throw error;
    }
  }

  // ========== 私有辅助方法：toDatabase ==========

  private static extractCaseInfo(storeState: StoreState): {
    title: string;
    number?: string;
    court?: string;
  } {
    const extractedData = storeState.uploadData?.extractedElements as any;
    const data = extractedData?.data || extractedData || {};

    // 🔧 优先从basicInfo提取（标准结构）
    const basicInfo = data.basicInfo || {};

    // 🔧 也支持直接在data上的字段（兼容性）
    const caseNumber =
      basicInfo.caseNumber ||
      data.caseNumber ||
      basicInfo.案号 ||
      data.案号;

    const court =
      basicInfo.court ||
      data.court ||
      basicInfo.法院 ||
      data.法院;

    // 🔧 案件标题的多种可能来源
    const title =
      data.title ||
      data.caseTitle ||
      basicInfo.caseNumber ||  // 如果没有标题，用案号
      caseNumber ||
      data.案件名称 ||
      data.案号 ||
      '未命名案例';

    return {
      title,
      number: caseNumber,
      court: court,
    };
  }

  private static mapActToSessionState(act?: string): SessionState | null {
    if (!act) return null;
    const mapping: Record<string, SessionState> = {
      upload: 'act1',
      analysis: 'act2',
      socratic: 'act3',
      summary: 'act4',
    };
    return mapping[act] || null;
  }

  private static detectSessionState(storeState: StoreState): SessionState {
    if (storeState.summaryData?.caseLearningReport) return 'completed';
    if (storeState.socraticData?.completedNodes &&
        (storeState.socraticData.completedNodes as any).size > 0) return 'act3';
    if (storeState.analysisData?.result) return 'act2';
    if (storeState.uploadData?.extractedElements) return 'act1';
    return 'act1';
  }

  private static buildAct1Snapshot(storeState: StoreState): Act1Snapshot {
    const extractedData = storeState.uploadData?.extractedElements as any;
    const data = extractedData?.data || extractedData || {};
    const metadata = {
      extractedAt: new Date().toISOString(),
      confidence: storeState.uploadData?.confidence ?? data.metadata?.confidence ?? 0,
      processingTime: 0,
      aiModel: 'unknown',
      ...(data.metadata || {}),
    };

    if (data.originalFileName && !metadata.originalFileName) {
      metadata.originalFileName = data.originalFileName;
    }
    if (data.uploadedAt && !metadata.uploadedAt) {
      metadata.uploadedAt = data.uploadedAt;
    }

    return {
      basicInfo: data.basicInfo || {},
      facts: data.facts || { summary: '' },
      evidence: data.evidence || { summary: '' },
      reasoning: data.reasoning || { summary: '' },
      metadata,
      originalFileName: data.originalFileName,
      uploadedAt: data.uploadedAt || new Date().toISOString(),
    };
  }

  private static buildAct2Snapshot(storeState: StoreState): Act2Snapshot | undefined {
    const result = storeState.analysisData?.result;
    if (!result) return undefined;

    return {
      narrative: result.narrative || undefined,
      timelineAnalysis: result.timelineAnalysis || undefined,
      evidenceQuestions: result.evidenceQuestions || undefined,
      claimAnalysis: result.claimAnalysis || undefined,
      completedAt: new Date().toISOString(),
    };
  }

  private static buildAct3Snapshot(storeState: StoreState): Act3Snapshot | undefined {
    const socraticData = storeState.socraticData;
    if (!socraticData) return undefined;

    const completedNodes = Array.isArray(socraticData.completedNodes)
      ? socraticData.completedNodes
      : Array.from(socraticData.completedNodes || []);

    if (completedNodes.length === 0) return undefined;

    return {
      level: socraticData.level || 1,
      completedNodes,
      totalRounds: completedNodes.length,
      completedAt: new Date().toISOString(),
    };
  }

  private static buildAct4Snapshot(storeState: StoreState, pptUrl?: string): Act4Snapshot | undefined {
    const report = storeState.summaryData?.caseLearningReport;
    if (!report) return undefined;

    return {
      learningReport: report as any,
      pptUrl,
      pptMetadata: pptUrl
        ? {
            generatedAt: new Date().toISOString(),
          }
        : undefined,
      completedAt: new Date().toISOString(),
    };
  }

  // ========== 私有辅助方法：toStore ==========

  private static checkVersion(dbSession: DatabaseSession): void {
    const schemaVersion =
      dbSession.schema_version ||
      (dbSession as any).schemaVersion ||
      0;
    if (schemaVersion > this.CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `不支持的Schema版本: ${schemaVersion}（当前最高支持: ${this.CURRENT_SCHEMA_VERSION}）`
      );
    }
    if (schemaVersion < this.CURRENT_SCHEMA_VERSION) {
      console.warn(
        `⚠️ [SnapshotConverter] 检测到旧版本数据 (v${schemaVersion})，将尝试兼容性转换`
      );
    }
  }

  private static restoreAct1ToStore(dbSession: DatabaseSession): StoreState['uploadData'] {
    const record: any = dbSession;
    const act1BasicInfo =
      record.act1_basic_info || record.act1BasicInfo || record.act1?.basicInfo;
    const act1Facts = record.act1_facts || record.act1Facts || record.act1?.facts;
    const act1Evidence =
      record.act1_evidence || record.act1Evidence || record.act1?.evidence;
    const act1Reasoning =
      record.act1_reasoning || record.act1Reasoning || record.act1?.reasoning;
    const act1Metadata =
      record.act1_metadata || record.act1Metadata || record.act1?.metadata;
    const act1Confidence =
      record.act1_confidence ?? record.act1Confidence ?? record.act1?.metadata?.confidence;

    if (act1BasicInfo || act1Facts || act1Evidence || act1Reasoning || act1Metadata) {
      return {
        extractedElements: {
          data: {
            basicInfo: act1BasicInfo,
            facts: act1Facts,
            evidence: act1Evidence,
            reasoning: act1Reasoning,
            metadata: act1Metadata,
          },
        },
        confidence: act1Confidence || 0,
      };
    }

    if (record.act1_upload) {
      const act1 = record.act1_upload;
      return {
        extractedElements: act1.extractedElements || null,
        confidence: act1.confidence || 0,
      };
    }

    return {
      extractedElements: null,
      confidence: 0,
    };
  }

  private static restoreAct2ToStore(dbSession: DatabaseSession): StoreState['analysisData'] {
    const record: any = dbSession;
    const act2Narrative =
      record.act2_narrative || record.act2Narrative || record.act2?.narrative;
    const act2Timeline =
      record.act2_timeline_analysis ||
      record.act2TimelineAnalysis ||
      record.act2?.timelineAnalysis;
    const act2EvidenceQuestions =
      record.act2_evidence_questions ||
      record.act2EvidenceQuestions ||
      record.act2?.evidenceQuestions;
    const act2ClaimAnalysis =
      record.act2_claim_analysis ||
      record.act2ClaimAnalysis ||
      record.act2?.claimAnalysis;

    if (act2Narrative || act2Timeline || act2EvidenceQuestions || act2ClaimAnalysis) {
      return {
        result: {
          narrative: act2Narrative,
          timelineAnalysis: act2Timeline,
          evidenceQuestions: act2EvidenceQuestions,
          claimAnalysis: act2ClaimAnalysis,
        },
        isAnalyzing: false,
      };
    }

    if (record.act2_analysis) {
      const act2 = record.act2_analysis;
      return {
        result: act2.result || null,
        isAnalyzing: false,
      };
    }

    return {
      result: null,
      isAnalyzing: false,
    };
  }

  private static restoreStoryChapters(dbSession: DatabaseSession): any[] {
    // 从act2_narrative中提取chapters
    const narrative =
      (dbSession.act2_narrative as any) ||
      (dbSession as any).act2Narrative ||
      (dbSession as any).act2?.narrative;
    return narrative?.chapters || [];
  }

  private static restoreAct3ToStore(dbSession: DatabaseSession): StoreState['socraticData'] {
    const act3 =
      (dbSession.act3_socratic as any) ||
      (dbSession as any).act3Socratic ||
      (dbSession as any).act3;
    if (!act3) {
      return {
        isActive: false,
        level: 1,
        teachingModeEnabled: false,
        completedNodes: new Set(),
      };
    }

    return {
      isActive: false,
      level: act3.level || 1,
      teachingModeEnabled: false,
      completedNodes: new Set(act3.completedNodes || []),
    };
  }

  private static restoreAct4ToStore(dbSession: DatabaseSession): StoreState['summaryData'] {
    const act4 =
      (dbSession as any).act4_learning_report ||
      (dbSession as any).act4LearningReport ||
      (dbSession as any).act4?.learningReport;
    if (!act4) {
      return {
        report: null,
        caseLearningReport: null,
        isGenerating: false,
      };
    }

    return {
      report: null,
      caseLearningReport: act4,
      isGenerating: false,
    };
  }

  private static mapSessionStateToAct(sessionState: string): string {
    const mapping: Record<string, string> = {
      act1: 'upload',
      act2: 'analysis',
      act3: 'socratic',
      act4: 'summary',
      completed: 'summary',
    };
    return mapping[sessionState] || 'upload';
  }

  // ========== Store同步（解决关键bug） ==========

  /**
   * 同步数据到其他Store
   * 关键：解决timelineAnalysis等数据丢失的问题
   */
  private static async syncToAllStores(
    dbSession: DatabaseSession,
    storeData: StoreState
  ): Promise<void> {
    const syncTasks: Promise<void>[] = [];

    // 同步1：timelineAnalysis到useAnalysisStore
    const timelineAnalysis =
      (dbSession as any).act2_timeline_analysis ||
      (dbSession as any).act2TimelineAnalysis ||
      (dbSession as any).act2?.timelineAnalysis;
    if (timelineAnalysis) {
      syncTasks.push(
        this.syncTimelineAnalysis(timelineAnalysis)
      );
    }

    // 同步2：storyChapters到useTeachingStore（已在storeData中，这里仅记录）
    const narrative =
      (dbSession as any).act2_narrative ||
      (dbSession as any).act2Narrative ||
      (dbSession as any).act2?.narrative;
    if ((narrative as any)?.chapters) {
      console.log('✅ [SnapshotConverter] storyChapters已包含在storeData中');
    }

    // 等待所有同步完成
    await Promise.all(syncTasks);
  }

  /**
   * 同步时间轴分析到useAnalysisStore
   */
  private static async syncTimelineAnalysis(timelineData: any): Promise<void> {
    try {
      const { useAnalysisStore } = await import(
        '@/src/domains/legal-analysis/stores/useAnalysisStore'
      );

      // 设置时间轴分析数据
      useAnalysisStore.getState().setTimelineAnalysis('main', timelineData);

      console.log('✅ [SnapshotConverter] timelineAnalysis已同步到useAnalysisStore', {
        hasTurningPoints: !!timelineData?.turningPoints,
        hasTimeline: !!timelineData?.timeline,
      });
    } catch (error) {
      console.error('❌ [SnapshotConverter] 同步timelineAnalysis失败:', error);
      throw error;
    }
  }
}

// 向后兼容：导出默认的SnapshotConverter
export { SnapshotConverterV2 as SnapshotConverter };
