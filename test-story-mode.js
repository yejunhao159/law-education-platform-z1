/**
 * 测试故事模式AI调用功能
 * 验证CaseNarrativeService环境变量修复后的智能叙事生成
 */

// 模拟案例数据 - 符合NarrativeGenerationRequest接口
const testCaseData = {
  basicInfo: {
    caseNumber: '(2024)民初第001号',
    court: '某县人民法院',
    caseType: '买卖合同纠纷',
    level: '基层法院',
    nature: '民事案件'
  },
  threeElements: {
    facts: {
      timeline: [
        {
          id: 'E1',
          date: '2024-01-15',
          title: '签订合同',
          description: '甲方（买方）与乙方（卖方）签订货物买卖合同，约定乙方于2024-02-15前交付价值50万元的机械设备',
          type: 'fact',
          importance: 'critical'
        },
        {
          id: 'E2',
          date: '2024-02-15',
          title: '交付期限届满',
          description: '约定的交付期限届满，乙方未按期交付货物，甲方多次催促无果',
          type: 'fact',
          importance: 'critical'
        },
        {
          id: 'E3',
          date: '2024-02-20',
          title: '催告履行',
          description: '甲方向乙方发出书面催告通知，要求其在7日内履行交付义务，否则将解除合同',
          type: 'procedure',
          importance: 'important'
        },
        {
          id: 'E4',
          date: '2024-02-28',
          title: '解除合同',
          description: '乙方仍未履行，甲方正式通知解除合同并要求返还预付款30万元及赔偿损失10万元',
          type: 'legal',
          importance: 'critical'
        }
      ],
      parties: ['甲方（购买方）', '乙方（销售方）'],
      keyFacts: [
        '双方签订买卖合同',
        '约定交付时间为2024-02-15',
        '乙方未按期交付',
        '甲方行使合同解除权',
        '要求返还预付款并赔偿损失'
      ]
    },
    disputes: [
      {
        id: 'D1',
        title: '合同履行责任',
        description: '乙方是否构成根本违约',
        type: 'factual',
        parties: ['甲方', '乙方']
      },
      {
        id: 'D2',
        title: '损害赔偿范围',
        description: '甲方要求的损失赔偿是否合理',
        type: 'legal',
        parties: ['甲方', '乙方']
      }
    ],
    reasoning: {
      summary: '本案争议焦点在于乙方未按约定履行交付义务是否构成根本违约，以及甲方解除合同并要求赔偿的法律依据是否充分。'
    }
  }
};

async function testStoryMode() {
  try {
    console.log('=== 测试故事模式AI调用 ===');

    // 创建智能叙事请求
    const narrativeRequest = {
      caseData: testCaseData,
      narrativeStyle: 'story',
      depth: 'detailed',
      focusAreas: ['timeline', 'parties', 'disputes', 'legal-reasoning']
    };

    console.log('📋 故事生成请求:', {
      caseNumber: narrativeRequest.caseData.basicInfo.caseNumber,
      timelineEvents: narrativeRequest.caseData.threeElements.facts.timeline.length,
      parties: narrativeRequest.caseData.threeElements.facts.parties.length,
      disputes: narrativeRequest.caseData.threeElements.disputes.length,
      narrativeStyle: narrativeRequest.narrativeStyle,
      depth: narrativeRequest.depth
    });

    // 测试intelligent-narrative API
    const response = await fetch('http://localhost:3004/api/legal-analysis/intelligent-narrative', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(narrativeRequest)
    });

    console.log('📡 API响应状态:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ 智能叙事生成结果:');
      console.log('- 成功状态:', result.success);
      console.log('- 章节数量:', result.chapters?.length || 0);
      console.log('- 处理时间:', result.metadata?.processingTime, 'ms');
      console.log('- 置信度:', result.metadata?.confidence);
      console.log('- 使用模型:', result.metadata?.model);

      if (result.chapters && result.chapters.length > 0) {
        console.log('\n📖 生成的故事章节:');
        result.chapters.forEach((chapter, index) => {
          console.log(`\n${index + 1}. ${chapter.title} (${chapter.color})`);
          console.log(`   内容: ${chapter.content?.substring(0, 100)}...`);
          console.log(`   法律意义: ${chapter.legalSignificance?.substring(0, 50)}...`);
          console.log(`   关键当事人: ${chapter.keyParties?.join(', ') || '无'}`);
          console.log(`   争议要素: ${chapter.disputeElements?.join(', ') || '无'}`);
        });

        // 检查是否为真正的AI生成内容
        const hasDetailedContent = result.chapters.every(ch =>
          ch.content && ch.content.length > 200 &&
          ch.legalSignificance && ch.legalSignificance.length > 50
        );

        const hasVariedTitles = new Set(result.chapters.map(ch => ch.title)).size === result.chapters.length;

        if (hasDetailedContent && hasVariedTitles && result.metadata.confidence > 0.7) {
          console.log('\n✅ 故事模式AI调用成功！生成了高质量的智能叙事');
        } else {
          console.log('\n⚠️ 可能使用了降级/静态内容，AI调用可能存在问题');
          console.log('  详细内容检查:', hasDetailedContent);
          console.log('  标题差异化检查:', hasVariedTitles);
          console.log('  置信度检查:', result.metadata.confidence > 0.7);
        }
      } else {
        console.log('❌ 未生成任何故事章节');
      }

      if (result.error) {
        console.log('⚠️ 错误信息:', result.error);
      }

    } else {
      const errorText = await response.text();
      console.log('❌ API调用失败:', errorText);
    }

  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}

testStoryMode();