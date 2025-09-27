/**
 * 测试ClaimAnalysisService功能
 */

// 模拟时间轴事件数据 - 符合TimelineEvent接口
const testEvents = [
  {
    id: 'E1',
    date: '2024-01-15',
    title: '签订合同',
    description: '甲方与乙方签订货物买卖合同，约定甲方于2024-02-15前交付货物',
    type: 'fact',
    importance: 'critical',
    legalRelation: {
      type: '买卖合同',
      parties: ['甲方', '乙方'],
      change: 'created',
      description: '建立买卖合同关系'
    },
    claims: {
      basis: ['《民法典》第595条'],
      elements: [],
      fulfilled: true,
      type: 'contractual'
    }
  },
  {
    id: 'E2',
    date: '2024-02-15',
    title: '交付期限届满',
    description: '约定的交付期限届满，甲方未交付货物',
    type: 'fact',
    importance: 'critical',
    legalRelation: {
      type: '买卖合同',
      parties: ['甲方', '乙方'],
      change: 'modified',
      description: '合同履行期限届满'
    },
    disputeFocus: {
      isKeyDispute: true,
      disputeType: 'factual',
      description: '是否构成违约',
      parties: ['甲方', '乙方'],
      resolved: false
    }
  },
  {
    id: 'E3',
    date: '2024-02-20',
    title: '催告履行',
    description: '乙方向甲方发出催告通知，要求其在7日内履行交付义务',
    type: 'procedure',
    importance: 'important',
    legalRelation: {
      type: '买卖合同',
      parties: ['甲方', '乙方'],
      change: 'modified',
      description: '行使催告权'
    },
    limitation: {
      startDate: '2024-02-20',
      period: 36,
      suspended: false,
      interrupted: true
    }
  },
  {
    id: 'E4',
    date: '2024-02-28',
    title: '解除合同',
    description: '甲方仍未履行，乙方通知甲方解除合同并要求赔偿',
    type: 'legal',
    importance: 'critical',
    legalRelation: {
      type: '买卖合同',
      parties: ['甲方', '乙方'],
      change: 'terminated',
      description: '合同解除'
    },
    claims: {
      basis: ['《民法典》第563条', '《民法典》第584条'],
      elements: [],
      fulfilled: true,
      type: 'contractual'
    },
    disputeFocus: {
      isKeyDispute: true,
      disputeType: 'legal',
      description: '损害赔偿范围',
      parties: ['甲方', '乙方'],
      resolved: false
    }
  }
];

async function testClaimAnalysis() {
  try {
    console.log('=== 测试ClaimAnalysisService ===');

    // 创建分析请求
    const request = {
      events: testEvents,
      caseType: '买卖合同纠纷',
      focusAreas: ['claims', 'defenses', 'limitations', 'burden-of-proof'],
      depth: 'detailed',
      analysisMethod: 'timeline'  // 测试timeline分析方法
    };

    console.log('📋 分析请求:', {
      eventCount: request.events.length,
      caseType: request.caseType,
      depth: request.depth,
      analysisMethod: request.analysisMethod
    });

    // 直接API测试
    const response = await fetch('http://localhost:3004/api/legal-analysis/claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    console.log('📡 API响应状态:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ 请求权分析结果:');
      console.log('- 主要请求权:', result.claims?.primary?.length || 0, '项');
      console.log('- 备选请求权:', result.claims?.alternative?.length || 0, '项');
      console.log('- 抗辩事由:', result.claims?.defense?.length || 0, '项');
      console.log('- 关键时间点:', result.timeline?.keyPoints?.length || 0, '个');
      console.log('- 举证事项:', result.burdenOfProof?.length || 0, '项');
      console.log('- 法律关系:', result.legalRelations?.length || 0, '个');
      console.log('- 策略建议:', result.strategy?.recommendations?.length || 0, '条');

      // 检查是否为降级结果
      if (result.claims?.primary?.length === 0 && result.timeline?.keyPoints?.some(kp => kp.significance === '需要进一步分析')) {
        console.log('⚠️ 可能使用了降级分析，AI调用可能失败');
      } else {
        console.log('✅ AI分析成功，数据质量良好');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API调用失败:', errorText);
    }

  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}

testClaimAnalysis();