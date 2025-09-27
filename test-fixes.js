#!/usr/bin/env node

/**
 * 测试修复后的API服务
 * 验证是否还存在"只有骨头没有肉"的问题
 */

const testData = {
  events: [
    {
      id: "event-1",
      date: "2022-01-15",
      title: "签订房屋买卖合同",
      description: "原告与被告签订房屋买卖合同，约定房屋总价500万元",
      evidence: ["购房合同原件"]
    },
    {
      id: "event-2",
      date: "2022-02-20",
      title: "支付首付款",
      description: "原告按约定支付首付款150万元",
      evidence: ["银行转账记录", "收款收据"]
    },
    {
      id: "event-3",
      date: "2022-03-10",
      title: "被告拒绝过户",
      description: "被告以房价上涨为由拒绝办理过户手续",
      evidence: ["录音证据", "微信聊天记录"]
    },
    {
      id: "event-4",
      date: "2022-04-05",
      title: "发送律师函",
      description: "原告委托律师向被告发送律师函要求履行合同",
      evidence: ["律师函", "快递签收记录"]
    },
    {
      id: "event-5",
      date: "2022-05-01",
      title: "提起诉讼",
      description: "原告向法院提起诉讼要求继续履行合同",
      evidence: ["起诉状", "法院受理通知书"]
    }
  ],
  caseType: "civil",
  depth: "comprehensive"
};

async function testAPI(url, apiName, customData) {
  console.log(`\n🧪 测试 ${apiName}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customData || testData)
    });

    const data = await response.json();

    // 检查响应状态
    console.log(`📊 状态码: ${response.status}`);
    console.log(`📊 成功标志: ${data.success}`);

    // 检查是否有实际内容
    if (data.success) {
      // 检查是否有硬编码的默认值
      const responseStr = JSON.stringify(data);
      const hardcodedPhrases = [
        '需要进一步分析',
        '待确定',
        '建议进一步分析案件细节',
        '内容生成中...'
      ];

      const foundHardcoded = hardcodedPhrases.filter(phrase =>
        responseStr.includes(phrase)
      );

      if (foundHardcoded.length > 0) {
        console.log(`❌ 发现硬编码默认值: ${foundHardcoded.join(', ')}`);
      } else {
        console.log(`✅ 未发现硬编码默认值`);
      }

      // 检查关键字段
      switch(apiName) {
        case '争议分析':
          console.log(`📊 争议数量: ${data.disputes?.length || 0}`);
          break;
        case '请求权分析':
          const claimsCount = (data.data?.claims?.primary?.length || 0) +
                             (data.data?.claims?.alternative?.length || 0);
          console.log(`📊 请求权数量: ${claimsCount}`);
          break;
        case '时间轴分析':
          console.log(`📊 转折点数量: ${data.data?.analysis?.keyTurningPoints?.length || 0}`);
          break;
      }
    } else {
      console.log(`❌ 错误: ${data.error || '未知错误'}`);
      if (data.details) {
        console.log(`📝 详情: ${data.details}`);
      }
    }

  } catch (error) {
    console.log(`❌ 请求失败: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 开始测试修复后的API服务...\n');

  // 争议分析需要特殊格式
  const disputeData = {
    documentText: testData.events.map(e => `${e.date}：${e.title}。${e.description}`).join('\n'),
    caseType: 'civil',
    options: {
      extractClaimBasis: true,
      analyzeDifficulty: true,
      generateTeachingNotes: false
    }
  };

  await testAPI('http://localhost:3000/api/dispute-analysis', '争议分析', disputeData);
  await testAPI('http://localhost:3000/api/legal-analysis/claims', '请求权分析');
  await testAPI('http://localhost:3000/api/timeline-analysis', '时间轴分析');

  console.log('\n✅ 测试完成！');
}

runTests().catch(console.error);