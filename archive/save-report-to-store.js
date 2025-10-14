/**
 * 保存报告到Store的正确方法
 * 在浏览器控制台执行
 */

console.log('='.repeat(60));
console.log('💾 保存第四幕报告到Store');
console.log('='.repeat(60));

// 第四幕报告数据（从API返回）
const reportData = {
  "caseOverview": {
    "title": "海难救助报酬纠纷案",
    "oneLineSummary": "东莞丰某海运公司诉东营鑫某物流公司支付海难救助报酬，最高法院最终支持救助报酬请求",
    "keyDispute": "同一船舶所有人的遇险船舶过失是否影响救助船舶的报酬请求权",
    "judgmentResult": "二审改判支持救助报酬129万余元，再审维持"
  },
  "learningPoints": {
    "factualInsights": [
      "同一船东的两艘船舶可构成独立救助关系",
      "救助船舶对事故无过失，救助行为有效",
      "汽油泄漏险情构成海难救助前提条件"
    ],
    "legalPrinciples": [
      "海商法第191条：同一船东船舶救助可获报酬",
      "海商法第187条：救助方过失才影响报酬",
      "救助船舶应作为独立单位认定责任"
    ],
    "evidenceHandling": [
      "法院主动调取海事报告等关键证据",
      "被告未能举证救助船舶存在过失",
      "书证证据链完整证明救助事实"
    ]
  },
  "socraticHighlights": {
    "keyQuestions": [
      "同一船东的船舶救助是否应获报酬？",
      "遇险船舶过失能否归责于救助船舶？",
      "海难救助报酬的法定条件是什么？"
    ],
    "studentInsights": [
      "船舶在法律上可作为独立责任主体",
      "救助报酬制度旨在鼓励海上救援",
      "过失责任应当具体到每艘船舶"
    ],
    "criticalThinking": [
      "一审为何错误适用法律？",
      "如何平衡船东责任与救助激励？",
      "证据规则在海事案件中的特殊性"
    ]
  },
  "practicalTakeaways": {
    "similarCases": [
      "同一主体多船救助纠纷",
      "海难救助报酬争议",
      "船舶过失责任认定案件"
    ],
    "cautionPoints": [
      "不能因船东相同而混同船舶责任",
      "救助报酬请求需证明救助有效性",
      "注意区分遇险与救助船舶的过失"
    ],
    "checkList": [
      "确认救助船舶无自身过失",
      "收集完整救助过程证据",
      "明确救助效果和危险程度"
    ]
  },
  "metadata": {
    "studyDuration": 45,
    "completionDate": "2025-10-14T07:49:36.102Z",
    "difficultyLevel": "中等"
  }
};

// 方法1：直接修改localStorage
console.log('\n--- 方法1：直接保存到localStorage ---');
try {
  const storeKey = 'teaching-store';
  const rawData = localStorage.getItem(storeKey);

  if (!rawData) {
    console.error('❌ 未找到teaching-store');
  } else {
    const parsed = JSON.parse(rawData);

    // 修改state中的summaryData
    if (!parsed.state) {
      console.error('❌ Store格式错误');
    } else {
      // 保存报告数据
      parsed.state.summaryData = {
        report: null,
        caseLearningReport: reportData,
        isGenerating: false
      };

      // 写回localStorage
      localStorage.setItem(storeKey, JSON.stringify(parsed));

      console.log('✅ 报告已保存到localStorage');
      console.log('数据大小:', JSON.stringify(reportData).length, 'bytes');
      console.log('\n📊 报告统计:');
      console.log('  事实洞察:', reportData.learningPoints.factualInsights.length);
      console.log('  法律原则:', reportData.learningPoints.legalPrinciples.length);
      console.log('  证据处理:', reportData.learningPoints.evidenceHandling.length);
      console.log('  关键问题:', reportData.socraticHighlights.keyQuestions.length);
      console.log('  学生洞察:', reportData.socraticHighlights.studentInsights.length);
      console.log('  批判性思维:', reportData.socraticHighlights.criticalThinking.length);
      console.log('  注意事项:', reportData.practicalTakeaways.cautionPoints.length);
      console.log('  检查清单:', reportData.practicalTakeaways.checkList.length);

      console.log('\n⚡ 刷新页面以查看报告');
      setTimeout(() => {
        location.reload();
      }, 1000);
    }
  }
} catch (error) {
  console.error('❌ 保存失败:', error);
}

console.log('\n' + '='.repeat(60));
