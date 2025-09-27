/**
 * 测试证据映射功能
 */

// 模拟带有不同证据字段的时间轴事件
const testEvents = [
  {
    id: 'E1',
    date: '2024-01-15',
    title: '签订合同',
    description: '甲方与乙方签订货物买卖合同',
    type: 'fact',
    importance: 'critical',
    // 原有的evidence字段格式
    evidence: [
      {
        id: 'ev1',
        content: '买卖合同原件',
        type: 'documentary',
        title: '合同文件'
      }
    ]
  },
  {
    id: 'E2',
    date: '2024-02-15',
    title: '交付期限届满',
    description: '约定的交付期限届满，甲方未交付货物',
    type: 'fact',
    importance: 'critical',
    // TimelineEvent标准的evidenceInfo字段
    evidenceInfo: {
      evidenceType: 'documentary',
      strength: 0.9,
      admissibility: true,
      authenticity: 'verified',
      relevance: 0.8
    }
  },
  {
    id: 'E3',
    date: '2024-02-20',
    title: '催告履行',
    description: '乙方向甲方发出催告通知',
    type: 'procedure',
    importance: 'important',
    // relatedEvidence字段
    relatedEvidence: ['催告通知书', '快递单据']
  },
  {
    id: 'E4',
    date: '2024-02-28',
    title: '解除合同',
    description: '乙方通知甲方解除合同并要求赔偿证据充分',
    type: 'legal',
    importance: 'critical'
    // 没有明确的证据字段，但描述中包含"证据"
  }
];

async function testEvidenceMapping() {
  try {
    console.log('=== 测试证据映射功能 ===');

    // 模拟前端组件提取证据的逻辑
    const extractedEvidence = testEvents
      .filter(e => {
        // 模拟 getEvidenceCount 逻辑
        return (e.evidence && Array.isArray(e.evidence) && e.evidence.length > 0) ||
               e.evidenceInfo ||
               (e.relatedEvidence && Array.isArray(e.relatedEvidence) && e.relatedEvidence.length > 0) ||
               (e.description && e.description.includes('证据'));
      })
      .flatMap(e => {
        const evidenceList = [];

        // 处理原有的 evidence 字段
        if (e.evidence && Array.isArray(e.evidence)) {
          evidenceList.push(...e.evidence.map((ev, index) => ({
            id: ev?.id || `${e.date}-evidence-${index}`,
            content: ev?.content || ev?.description || ev?.title || e.description || e.title,
            type: ev?.type || 'documentary',
            relatedEvent: e.date,
            source: 'timeline-evidence'
          })));
        }

        // 处理 evidenceInfo 字段
        if (e.evidenceInfo) {
          evidenceList.push({
            id: `${e.date}-evidenceInfo`,
            content: e.description || e.title || '事件证据',
            type: e.evidenceInfo.evidenceType || 'documentary',
            relatedEvent: e.date,
            source: 'timeline-evidenceInfo',
            metadata: {
              strength: e.evidenceInfo.strength,
              admissibility: e.evidenceInfo.admissibility,
              authenticity: e.evidenceInfo.authenticity,
              relevance: e.evidenceInfo.relevance
            }
          });
        }

        // 处理 relatedEvidence 字段
        if (e.relatedEvidence && Array.isArray(e.relatedEvidence)) {
          evidenceList.push(...e.relatedEvidence.map((evidenceId, index) => ({
            id: evidenceId || `${e.date}-related-${index}`,
            content: `${e.description || e.title} 相关证据`,
            type: 'documentary',
            relatedEvent: e.date,
            source: 'timeline-relatedEvidence'
          })));
        }

        // 如果没有明确的证据字段，但有证据相关内容，创建一个基础证据条目
        if (evidenceList.length === 0 && (e.description?.includes('证据') || e.title?.includes('证据'))) {
          evidenceList.push({
            id: `${e.date}-inferred`,
            content: e.description || e.title,
            type: 'documentary',
            relatedEvent: e.date,
            source: 'timeline-inferred'
          });
        }

        return evidenceList;
      });

    // 构建请求体
    const request = {
      evidence: extractedEvidence,
      claimElements: testEvents.map(e => ({
        id: e.id,
        name: e.title,
        description: e.description,
        type: e.type
      })),
      mode: 'generate-questions',
      config: {
        targetLevel: 'intermediate',
        focusAreas: ['relevance', 'admissibility'],
        questionTypes: ['single-choice'],
        maxQuestions: 3,
        includeExplanations: true
      },
      caseContext: {
        basicInfo: {
          caseType: 'civil',
          court: '测试法院'
        },
        timeline: testEvents
      }
    };

    console.log('📋 测试数据:', {
      events: testEvents.length,
      有evidence字段: testEvents.filter(e => e.evidence).length,
      有evidenceInfo字段: testEvents.filter(e => e.evidenceInfo).length,
      有relatedEvidence字段: testEvents.filter(e => e.relatedEvidence).length,
      描述包含证据: testEvents.filter(e => e.description?.includes('证据')).length
    });

    console.log('🔍 提取的证据数据:', {
      总证据数: extractedEvidence.length,
      证据详情: extractedEvidence.map(ev => ({
        id: ev.id,
        source: ev.source,
        type: ev.type,
        content: ev.content?.substring(0, 30) + '...'
      }))
    });

    // 测试evidence-quality API
    const response = await fetch('http://localhost:3004/api/evidence-quality', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    console.log('📡 API响应状态:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ 证据映射测试结果:');
      console.log('- 成功状态:', result.success);
      console.log('- 分析模式:', result.mode);

      if (result.questions) {
        console.log('- 生成问题数:', result.questions.length);
        console.log('- 问题示例:', result.questions.slice(0, 2).map(q => ({
          question: q.question?.substring(0, 50) + '...',
          focusArea: q.focusArea,
          level: q.level
        })));
      }

      if (result.summary) {
        console.log('- 汇总信息:', result.summary);
      }

      if (result.success && result.questions?.length > 0) {
        console.log('✅ 证据映射功能正常，成功生成学习问题');
      } else {
        console.log('⚠️ 证据映射存在问题，未能生成有效问题');
      }
    } else {
      const errorData = await response.json();
      console.log('❌ API调用失败:', errorData);
    }

  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}

testEvidenceMapping();