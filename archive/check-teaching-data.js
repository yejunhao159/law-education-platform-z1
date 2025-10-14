/**
 * 查看第四幕教学数据
 * 这个脚本需要在浏览器控制台执行
 */

console.log('='.repeat(60));
console.log('📊 第四幕教学数据检查');
console.log('='.repeat(60));

// 检查 teaching-store 数据
const teachingStoreKey = 'teaching-store';
const rawData = localStorage.getItem(teachingStoreKey);

if (!rawData) {
  console.log('❌ 未找到 teaching-store 数据');
  console.log('\n提示：请先完成一次完整的四幕教学流程');
} else {
  try {
    const parsed = JSON.parse(rawData);
    const state = parsed.state || parsed;

    console.log('\n✅ 找到 teaching-store 数据');
    console.log('\n--- 数据概览 ---');
    console.log('当前幕:', state.currentAct);
    console.log('故事模式:', state.storyMode);

    // 第一幕数据
    console.log('\n--- 第一幕：案例导入 ---');
    if (state.uploadData?.extractedElements) {
      console.log('✅ 已提取案例元素');
      console.log('置信度:', state.uploadData.confidence);
      const keys = Object.keys(state.uploadData.extractedElements || {});
      console.log('提取的字段数:', keys.length);
      console.log('字段列表:', keys.join(', '));
    } else {
      console.log('❌ 未找到案例元素数据');
    }

    // 第二幕数据
    console.log('\n--- 第二幕：深度分析 ---');
    if (state.analysisData?.result) {
      console.log('✅ 已完成深度分析');
      const result = state.analysisData.result;

      if (result.factAnalysis) {
        console.log('\n事实分析:');
        console.log('  关键事实数:', result.factAnalysis.keyFacts?.length || 0);
        console.log('  争议焦点数:', result.factAnalysis.disputedPoints?.length || 0);
        console.log('  时间线事件数:', result.factAnalysis.timeline?.length || 0);
      }

      if (result.evidenceAnalysis) {
        console.log('\n证据分析:');
        console.log('  优势点数:', result.evidenceAnalysis.strengths?.length || 0);
        console.log('  劣势点数:', result.evidenceAnalysis.weaknesses?.length || 0);
        console.log('  建议数:', result.evidenceAnalysis.recommendations?.length || 0);
      }

      if (result.legalAnalysis) {
        console.log('\n法律分析:');
        console.log('  适用法律数:', result.legalAnalysis.applicableLaws?.length || 0);
        console.log('  判例数:', result.legalAnalysis.precedents?.length || 0);
        console.log('  风险点数:', result.legalAnalysis.risks?.length || 0);
      }
    } else {
      console.log('❌ 未找到深度分析数据');
    }

    // 第三幕数据
    console.log('\n--- 第三幕：苏格拉底讨论 ---');
    if (state.socraticData) {
      console.log('是否激活:', state.socraticData.isActive);
      console.log('当前等级:', state.socraticData.level);
      console.log('教学模式:', state.socraticData.teachingModeEnabled);

      const completedNodes = state.socraticData.completedNodes;
      if (Array.isArray(completedNodes)) {
        console.log('完成的节点数:', completedNodes.length);
      } else {
        console.log('完成的节点数: 0');
      }
    } else {
      console.log('❌ 未找到苏格拉底数据');
    }

    // 第四幕数据 - 重点
    console.log('\n--- 第四幕：总结提升 ---');
    if (state.summaryData) {
      let hasData = false;

      // 检查 LearningReport
      if (state.summaryData.report) {
        hasData = true;
        const report = state.summaryData.report;
        console.log('\n✅ 学习报告 (LearningReport):');
        console.log('  生成时间:', report.generatedAt);
        console.log('  关键学习点数:', report.keyLearnings?.length || 0);
        console.log('  评估技能数:', report.skillsAssessed?.length || 0);
        console.log('  推荐建议数:', report.recommendations?.length || 0);
        console.log('  下一步行动数:', report.nextSteps?.length || 0);

        if (report.summary) {
          console.log('\n  总结摘要:');
          console.log('   ', report.summary.substring(0, 100) + '...');
        }

        if (report.skillsAssessed && report.skillsAssessed.length > 0) {
          console.log('\n  技能评估:');
          report.skillsAssessed.forEach((skill, idx) => {
            console.log(`    ${idx + 1}. ${skill.skill} - ${skill.level}`);
          });
        }
      }

      // 检查 CaseLearningReport
      if (state.summaryData.caseLearningReport) {
        hasData = true;
        const caseReport = state.summaryData.caseLearningReport;
        console.log('\n✅ 案件学习报告 (CaseLearningReport):');

        if (caseReport.caseOverview) {
          console.log('\n  案例概览:');
          console.log('    标题:', caseReport.caseOverview.title);
          console.log('    一句话总结:', caseReport.caseOverview.oneLineSummary);
          console.log('    关键争议:', caseReport.caseOverview.keyDispute);
          console.log('    判决结果:', caseReport.caseOverview.judgmentResult);
        }

        if (caseReport.learningPoints) {
          console.log('\n  学习要点:');
          console.log('    事实洞察数:', caseReport.learningPoints.factualInsights?.length || 0);
          console.log('    法律原则数:', caseReport.learningPoints.legalPrinciples?.length || 0);
          console.log('    证据处理数:', caseReport.learningPoints.evidenceHandling?.length || 0);
        }

        if (caseReport.socraticHighlights) {
          console.log('\n  苏格拉底精华:');
          console.log('    关键问题数:', caseReport.socraticHighlights.keyQuestions?.length || 0);
          console.log('    学生洞察数:', caseReport.socraticHighlights.studentInsights?.length || 0);
          console.log('    批判性思维数:', caseReport.socraticHighlights.criticalThinking?.length || 0);
        }

        if (caseReport.practicalTakeaways) {
          console.log('\n  实践要点:');
          console.log('    注意事项数:', caseReport.practicalTakeaways.cautionPoints?.length || 0);
          console.log('    检查清单数:', caseReport.practicalTakeaways.checkList?.length || 0);
        }

        if (caseReport.metadata) {
          console.log('\n  元数据:');
          console.log('    学习时长:', caseReport.metadata.studyDuration, '分钟');
          console.log('    完成日期:', caseReport.metadata.completionDate);
          console.log('    难度等级:', caseReport.metadata.difficultyLevel);
        }
      }

      if (!hasData) {
        console.log('❌ 未找到总结提升数据');
        console.log('   summaryData 结构:', JSON.stringify(state.summaryData, null, 2));
      }
    } else {
      console.log('❌ 未找到 summaryData');
    }

    // 数据统计
    console.log('\n' + '='.repeat(60));
    console.log('📈 数据统计汇总');
    console.log('='.repeat(60));

    let totalDataPoints = 0;

    if (state.uploadData?.extractedElements) {
      const uploadPoints = Object.keys(state.uploadData.extractedElements).length;
      totalDataPoints += uploadPoints;
      console.log('第一幕数据点:', uploadPoints);
    }

    if (state.analysisData?.result) {
      const analysisPoints =
        (state.analysisData.result.factAnalysis?.keyFacts?.length || 0) +
        (state.analysisData.result.factAnalysis?.disputedPoints?.length || 0) +
        (state.analysisData.result.factAnalysis?.timeline?.length || 0) +
        (state.analysisData.result.evidenceAnalysis?.strengths?.length || 0) +
        (state.analysisData.result.evidenceAnalysis?.weaknesses?.length || 0) +
        (state.analysisData.result.evidenceAnalysis?.recommendations?.length || 0) +
        (state.analysisData.result.legalAnalysis?.applicableLaws?.length || 0) +
        (state.analysisData.result.legalAnalysis?.precedents?.length || 0) +
        (state.analysisData.result.legalAnalysis?.risks?.length || 0);
      totalDataPoints += analysisPoints;
      console.log('第二幕数据点:', analysisPoints);
    }

    if (state.socraticData) {
      const socraticPoints = Array.isArray(state.socraticData.completedNodes)
        ? state.socraticData.completedNodes.length
        : 0;
      totalDataPoints += socraticPoints;
      console.log('第三幕数据点:', socraticPoints);
    }

    if (state.summaryData) {
      let summaryPoints = 0;
      if (state.summaryData.report) {
        summaryPoints += (state.summaryData.report.keyLearnings?.length || 0) +
          (state.summaryData.report.skillsAssessed?.length || 0) +
          (state.summaryData.report.recommendations?.length || 0) +
          (state.summaryData.report.nextSteps?.length || 0);
      }
      if (state.summaryData.caseLearningReport) {
        summaryPoints +=
          (state.summaryData.caseLearningReport.learningPoints?.factualInsights?.length || 0) +
          (state.summaryData.caseLearningReport.learningPoints?.legalPrinciples?.length || 0) +
          (state.summaryData.caseLearningReport.learningPoints?.evidenceHandling?.length || 0) +
          (state.summaryData.caseLearningReport.socraticHighlights?.keyQuestions?.length || 0) +
          (state.summaryData.caseLearningReport.socraticHighlights?.studentInsights?.length || 0) +
          (state.summaryData.caseLearningReport.socraticHighlights?.criticalThinking?.length || 0) +
          (state.summaryData.caseLearningReport.practicalTakeaways?.cautionPoints?.length || 0) +
          (state.summaryData.caseLearningReport.practicalTakeaways?.checkList?.length || 0);
      }
      totalDataPoints += summaryPoints;
      console.log('第四幕数据点:', summaryPoints);
    }

    console.log('\n总数据点:', totalDataPoints);
    console.log('数据大小:', (rawData.length / 1024).toFixed(2), 'KB');

    // 完整数据导出
    console.log('\n' + '='.repeat(60));
    console.log('💾 完整数据导出（可复制）');
    console.log('='.repeat(60));
    console.log('JSON数据:');
    console.log(JSON.stringify(state, null, 2));

  } catch (error) {
    console.error('❌ 解析数据失败:', error);
    console.log('\n原始数据:', rawData.substring(0, 500) + '...');
  }
}

console.log('\n' + '='.repeat(60));
console.log('✅ 检查完成');
console.log('='.repeat(60));
