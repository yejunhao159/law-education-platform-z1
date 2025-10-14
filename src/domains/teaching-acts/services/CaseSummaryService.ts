/**
 * 案件学习报告生成服务
 * 负责收集前三幕数据并生成学习报告
 */

import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';
import { useTeachingStore } from '../stores/useTeachingStore';
import type { CaseLearningReport } from '@/src/types';
import { CaseSummaryPromptBuilder } from './prompts/CaseSummaryPromptBuilder';

export class CaseSummaryService {
  /**
   * 生成案件学习报告
   * @param clientStoreData 客户端传递的Store数据（可选，服务端无法访问localStorage）
   */
  async generateCaseSummary(clientStoreData?: any): Promise<CaseLearningReport> {
    // 🔧 修复：优先使用客户端传递的数据，回退到服务端Store
    const storeData = clientStoreData || useTeachingStore.getState();

    console.log('📦 [CaseSummaryService] 数据来源:', clientStoreData ? '客户端传递' : '服务端Store');

    // 🔧 修复：正确提取第一幕的案例数据
    // extractedElements 的结构是 {data: currentCase, confidence: 90}
    const extractedData = storeData.uploadData?.extractedElements as any;
    const actualCaseInfo = extractedData?.data || extractedData || {};

    // 收集各幕数据
    const caseData = {
      // 第一幕：案例基本信息（修复后：提取data字段）
      caseInfo: actualCaseInfo,

      // 第二幕：深度分析结果
      analysisResult: storeData.analysisData?.result || {},

      // 第三幕：苏格拉底对话
      socraticLevel: storeData.socraticData?.level || 1,
      completedNodes: Array.isArray(storeData.socraticData?.completedNodes)
        ? storeData.socraticData.completedNodes
        : [],

      // 会话时长（简单计算）
      studyDuration: this.calculateStudyDuration(storeData)
    };

    // 🔍 调试：打印收集到的数据
    console.log('📊 [CaseSummaryService] 收集到的前三幕数据:', {
      原始extractedElements结构: extractedData ? Object.keys(extractedData).slice(0, 3) : '无',
      提取后的caseInfo大小: Object.keys(caseData.caseInfo).length,
      caseInfo示例字段: Object.keys(caseData.caseInfo).slice(0, 5),
      caseInfo中的案例名称: caseData.caseInfo?.title || caseData.caseInfo?.caseTitle || '未知',
      analysisResult大小: Object.keys(caseData.analysisResult).length,
      analysisResult示例字段: Object.keys(caseData.analysisResult).slice(0, 5),
      socraticLevel: caseData.socraticLevel,
      completedNodes: caseData.completedNodes.length,
      studyDuration: caseData.studyDuration
    });

    // 🔧 智能降级策略：评估数据完整度
    const hasCaseInfo = Object.keys(caseData.caseInfo).length > 0;
    const hasAnalysisResult = Object.keys(caseData.analysisResult).length > 0;

    console.log('📊 [CaseSummaryService] 数据完整度评估:', {
      第一幕数据: hasCaseInfo ? '✅ 有' : '❌ 无',
      第二幕数据: hasAnalysisResult ? '✅ 有' : '❌ 无',
      策略: !hasCaseInfo ? '⚠️ 无数据，使用占位符' : !hasAnalysisResult ? '⚡ 降级模式：仅用第一幕数据' : '✅ 完整模式'
    });

    if (!hasCaseInfo) {
      console.warn('⚠️ [CaseSummaryService] 警告：第一幕数据为空！AI将基于空数据生成报告');
      console.warn('💡 建议：请先完成第一幕（案例导入）');
    } else if (!hasAnalysisResult) {
      console.warn('⚡ [CaseSummaryService] 降级模式：仅有第一幕数据，将生成基础报告');
      console.warn('💡 建议：完成第二幕（深度分析）可获得更详细的报告');
    }

    // 使用AI提取学习要点
    return await this.extractLearningPoints(caseData);
  }
  
  /**
   * 从会话数据中提取学习要点
   */
  private async extractLearningPoints(data: any): Promise<CaseLearningReport> {
    // ✅ 使用专业的Prompt构建器
    const promptBuilder = new CaseSummaryPromptBuilder();

    // 🔧 根据数据完整度调整Prompt
    const hasCaseInfo = Object.keys(data.caseInfo).length > 0;
    const hasAnalysisResult = Object.keys(data.analysisResult).length > 0;

    // 构建System Prompt
    const systemPrompt = promptBuilder.buildSystemPrompt({
      hasCaseInfo,
      hasAnalysisResult,
      socraticLevel: data.socraticLevel
    });

    // 构建User Prompt
    const userPrompt = promptBuilder.buildUserPrompt({
      caseInfo: data.caseInfo,
      analysisResult: data.analysisResult,
      socraticLevel: data.socraticLevel,
      completedNodes: data.completedNodes,
      studyDuration: data.studyDuration
    });

    try {
      console.log('🔍 [CaseSummaryService] 开始调用AI生成学习报告...');
      console.log('📊 [CaseSummaryService] Prompt长度:', {
        system: systemPrompt.length,
        user: userPrompt.length,
        total: systemPrompt.length + userPrompt.length
      });

      const result = await callUnifiedAI(systemPrompt, userPrompt, {
        temperature: 0.3,
        maxTokens: 2500,
        responseFormat: 'json'
      });

      console.log('✅ [CaseSummaryService] AI调用成功，开始解析结果');
      console.log('📦 [CaseSummaryService] 返回数据类型:', typeof result);
      console.log('📦 [CaseSummaryService] 返回数据结构:', Object.keys(result || {}));

      // 🔧 修复：callUnifiedAI返回的是{content, tokensUsed, cost, ...}对象
      // 需要先提取content字段，再解析JSON
      let content = (result as any).content || result;

      // 🔧 修复：清理AI返回的Markdown代码块标记（```json ... ```）
      if (typeof content === 'string') {
        content = content.trim();
        // 移除开头的 ```json 或 ```
        content = content.replace(/^```(?:json)?\s*\n?/i, '');
        // 移除结尾的 ```
        content = content.replace(/\n?```\s*$/i, '');
        content = content.trim();
      }

      console.log('🧹 [CaseSummaryService] 清理后的内容长度:', content.length);
      console.log('📄 [CaseSummaryService] AI返回内容预览:', typeof content === 'string' ? content.substring(0, 200) + '...' : content);

      const report = typeof content === 'string' ? JSON.parse(content) : content;

      console.log('✅ [CaseSummaryService] JSON解析成功');
      console.log('📋 [CaseSummaryService] AI生成的报告字段:', Object.keys(report));
      console.log('📋 [CaseSummaryService] caseOverview字段:', report.caseOverview ? Object.keys(report.caseOverview) : '无');
      console.log('📋 [CaseSummaryService] learningPoints字段:', report.learningPoints ? Object.keys(report.learningPoints) : '无');

      // 确保数据结构完整
      const finalReport = this.ensureReportStructure(report);

      // 检查是否使用了占位符
      const usingPlaceholder = finalReport.caseOverview.oneLineSummary.includes('生成中');
      if (usingPlaceholder) {
        console.warn('⚠️ [CaseSummaryService] 警告：报告使用了占位符，AI可能返回了空数据');
      } else {
        console.log('✅ [CaseSummaryService] 报告生成成功，包含真实AI分析内容');
      }

      return finalReport;
    } catch (error) {
      console.error('❌ [CaseSummaryService] AI生成报告失败 - 详细错误:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name,
        rawError: error
      });

      // 🔧 修复：暴露真实错误信息，而不是隐藏
      const errorMsg = error instanceof Error ? error.message : '生成学习报告失败，请重试';
      throw new Error(`生成学习报告失败: ${errorMsg}`);
    }
  }
  
  /**
   * 计算学习时长（分钟）
   */
  private calculateStudyDuration(storeData: any): number {
    // 简单估算：每幕平均15分钟
    let duration = 0;

    if (storeData.uploadData?.extractedElements) duration += 10;
    if (storeData.analysisData?.result) duration += 20;
    if (storeData.socraticData?.level > 0) duration += storeData.socraticData.level * 15;

    return duration || 45; // 默认45分钟
  }
  
  /**
   * 确保报告结构完整
   * 🔧 优化：使用更智能的fallback逻辑，避免覆盖有效数据
   */
  private ensureReportStructure(report: any): CaseLearningReport {
    // 辅助函数：检查值是否有效（不是 null/undefined/空字符串/空数组）
    const isValidValue = (val: any): boolean => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'string') return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0 && val.every(item => typeof item === 'string' && item.trim().length > 0);
      return true;
    };

    return {
      caseOverview: {
        title: isValidValue(report.caseOverview?.title) ? report.caseOverview.title : '案例学习报告',
        oneLineSummary: isValidValue(report.caseOverview?.oneLineSummary) ? report.caseOverview.oneLineSummary : '案件概要生成中...',
        keyDispute: isValidValue(report.caseOverview?.keyDispute) ? report.caseOverview.keyDispute : '争议焦点分析中...',
        judgmentResult: isValidValue(report.caseOverview?.judgmentResult) ? report.caseOverview.judgmentResult : '判决结果整理中...'
      },
      learningPoints: {
        factualInsights: isValidValue(report.learningPoints?.factualInsights) ? report.learningPoints.factualInsights : ['事实要点提取中...'],
        legalPrinciples: isValidValue(report.learningPoints?.legalPrinciples) ? report.learningPoints.legalPrinciples : ['法律原理总结中...'],
        evidenceHandling: isValidValue(report.learningPoints?.evidenceHandling) ? report.learningPoints.evidenceHandling : ['证据要点归纳中...']
      },
      socraticHighlights: {
        keyQuestions: isValidValue(report.socraticHighlights?.keyQuestions) ? report.socraticHighlights.keyQuestions : ['关键问题整理中...'],
        studentInsights: isValidValue(report.socraticHighlights?.studentInsights) ? report.socraticHighlights.studentInsights : ['学习领悟总结中...'],
        criticalThinking: isValidValue(report.socraticHighlights?.criticalThinking) ? report.socraticHighlights.criticalThinking : ['思辨要点提炼中...']
      },
      practicalTakeaways: {
        similarCases: isValidValue(report.practicalTakeaways?.similarCases) ? report.practicalTakeaways.similarCases : '适用案件类型分析中...',
        cautionPoints: isValidValue(report.practicalTakeaways?.cautionPoints) ? report.practicalTakeaways.cautionPoints : ['注意事项整理中...'],
        checkList: isValidValue(report.practicalTakeaways?.checkList) ? report.practicalTakeaways.checkList : ['操作要点归纳中...']
      },
      metadata: {
        studyDuration: report.metadata?.studyDuration || 45,
        completionDate: report.metadata?.completionDate || new Date().toISOString(),
        difficultyLevel: report.metadata?.difficultyLevel || '中等'
      }
    };
  }
}

// 导出单例
export const caseSummaryService = new CaseSummaryService();