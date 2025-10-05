/**
 * 案件学习报告生成服务
 * 负责收集前三幕数据并生成学习报告
 */

import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';
import { useTeachingStore } from '../stores/useTeachingStore';
import type { CaseLearningReport } from '@/src/types';

export class CaseSummaryService {
  /**
   * 生成案件学习报告
   */
  async generateCaseSummary(): Promise<CaseLearningReport> {
    const store = useTeachingStore.getState();
    
    // 收集各幕数据
    const caseData = {
      // 第一幕：案例基本信息
      caseInfo: store.uploadData.extractedElements || {},
      
      // 第二幕：深度分析结果
      analysisResult: store.analysisData.result || {},
      
      // 第三幕：苏格拉底对话
      socraticLevel: store.socraticData.level,
      completedNodes: Array.from(store.socraticData.completedNodes),
      
      // 会话时长（简单计算）
      studyDuration: this.calculateStudyDuration()
    };
    
    // 使用AI提取学习要点
    return await this.extractLearningPoints(caseData);
  }
  
  /**
   * 从会话数据中提取学习要点
   */
  private async extractLearningPoints(data: any): Promise<CaseLearningReport> {
    const systemPrompt = `你是一位经验丰富的法学教育专家，擅长从案例学习中提炼核心知识点。

任务要求：
1. 用简洁通俗的语言总结要点，每个要点不超过30字
2. 突出实用性和可操作性，避免空泛的理论
3. 要点要具体，能直接应用到类似案件中
4. 总结时要考虑学生的学习路径和讨论深度`;

    const userPrompt = `基于以下案例学习数据，生成学习报告：

案例信息：
${JSON.stringify(data.caseInfo, null, 2)}

深度分析结果：
${JSON.stringify(data.analysisResult, null, 2)}

苏格拉底讨论情况：
- 讨论深度等级：${data.socraticLevel}/3
- 完成的讨论节点：${data.completedNodes.join(', ')}

请生成JSON格式的学习报告，包含：
1. caseOverview: 案件概览
   - title: 案件标题
   - oneLineSummary: 一句话说明（谁告谁什么事，法院怎么判）
   - keyDispute: 核心争议焦点
   - judgmentResult: 判决结果

2. learningPoints: 学习要点
   - factualInsights: 事实认定要点（2-3个）
   - legalPrinciples: 法律原理要点（2-3个）
   - evidenceHandling: 证据处理要点（2-3个）

3. socraticHighlights: 讨论精华
   - keyQuestions: 关键问题（2-3个）
   - studentInsights: 重要领悟（2-3个）
   - criticalThinking: 批判思考点（2-3个）

4. practicalTakeaways: 实践要点
   - similarCases: 适用的类似案件类型
   - cautionPoints: 需要注意的陷阱（2-3个）
   - checkList: 实务操作要点（2-3个）

5. metadata: 元数据
   - studyDuration: ${data.studyDuration}
   - completionDate: "${new Date().toISOString()}"
   - difficultyLevel: 根据案件复杂度判断（简单/中等/困难）`;

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

      const report = typeof content === 'string' ? JSON.parse(content) : content;

      console.log('✅ [CaseSummaryService] JSON解析成功');

      // 确保数据结构完整
      return this.ensureReportStructure(report);
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
  private calculateStudyDuration(): number {
    // 简单估算：每幕平均15分钟
    const store = useTeachingStore.getState();
    let duration = 0;
    
    if (store.uploadData.extractedElements) duration += 10;
    if (store.analysisData.result) duration += 20;
    if (store.socraticData.level > 0) duration += store.socraticData.level * 15;
    
    return duration || 45; // 默认45分钟
  }
  
  /**
   * 确保报告结构完整
   */
  private ensureReportStructure(report: any): CaseLearningReport {
    return {
      caseOverview: {
        title: report.caseOverview?.title || '案例学习报告',
        oneLineSummary: report.caseOverview?.oneLineSummary || '案件概要生成中...',
        keyDispute: report.caseOverview?.keyDispute || '争议焦点分析中...',
        judgmentResult: report.caseOverview?.judgmentResult || '判决结果整理中...'
      },
      learningPoints: {
        factualInsights: report.learningPoints?.factualInsights || ['事实要点提取中...'],
        legalPrinciples: report.learningPoints?.legalPrinciples || ['法律原理总结中...'],
        evidenceHandling: report.learningPoints?.evidenceHandling || ['证据要点归纳中...']
      },
      socraticHighlights: {
        keyQuestions: report.socraticHighlights?.keyQuestions || ['关键问题整理中...'],
        studentInsights: report.socraticHighlights?.studentInsights || ['学习领悟总结中...'],
        criticalThinking: report.socraticHighlights?.criticalThinking || ['思辨要点提炼中...']
      },
      practicalTakeaways: {
        similarCases: report.practicalTakeaways?.similarCases || '适用案件类型分析中...',
        cautionPoints: report.practicalTakeaways?.cautionPoints || ['注意事项整理中...'],
        checkList: report.practicalTakeaways?.checkList || ['操作要点归纳中...']
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