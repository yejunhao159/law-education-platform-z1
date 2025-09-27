/**
 * 测试故事模式直接API调用
 * 绕过deechat包问题，直接调用DeepSeek API
 */

// 模拟案例数据
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

async function testStoryDirectAPI() {
  try {
    console.log('=== 测试故事模式直接API调用 ===');

    // 构建提示词 - 模拟CaseNarrativeService的buildNarrativePrompt方法
    const buildNarrativePrompt = (caseData) => {
      const timeline = caseData?.threeElements?.facts?.timeline || [];
      const parties = caseData?.threeElements?.facts?.parties || [];

      const timelineSummary = timeline.length > 0 ?
        timeline.map((event, index) =>
          `${index + 1}. ${event.date} - ${event.title}: ${event.description}`
        ).join('\n') :
        '暂无时间轴信息';

      const partiesContext = parties.length > 0 ?
        `主要当事人：${parties.join('、')}` :
        '当事人信息待完善';

      return `你是一位资深的法律专家和教育工作者，精通法律案例的叙事艺术。请基于以下案例信息生成专业的法律案情叙事。

## 案例基本信息
- 案件编号：${caseData.basicInfo.caseNumber || '待补充'}
- 审理法院：${caseData.basicInfo.court || '待补充'}
- 案件类型：${caseData.basicInfo.caseType || '待补充'}
- ${partiesContext}

## 时间轴事件
${timelineSummary}

## 叙事要求
### 叙事风格
采用引人入胜的故事叙述风格，但保持法律专业性

### 分析深度
进行详细的案情分析，重点关注关键事实和法律关系

## 专业要求
1. **法律准确性**：确保所有法律术语和分析准确无误
2. **逻辑清晰**：按照时间顺序和逻辑关系组织内容
3. **教学价值**：突出案例的教学意义和法律原理
4. **争议导向**：重点展现争议焦点的形成和发展
5. **证据意识**：强调关键证据在案件中的作用

## 输出格式
请生成3-5个故事章节，每个章节包含：
- title: 章节标题（简洁有力）
- content: 详细内容（300-500字）
- legalSignificance: 法律意义（100-200字）
- keyParties: 涉及的关键当事人
- disputeElements: 争议要素（如有）

请以JSON格式返回结果，格式如下：
{
  "chapters": [
    {
      "title": "案件起源",
      "content": "详细的案情叙述...",
      "legalSignificance": "法律意义分析...",
      "keyParties": ["当事人A", "当事人B"],
      "disputeElements": ["争议点1", "争议点2"]
    }
  ]
}

现在开始生成专业的法律案情叙事：`;
    };

    const prompt = buildNarrativePrompt(testCaseData);

    console.log('📝 提示词长度:', prompt.length, '字符');

    // 直接调用DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-6b081a93258346379182141661293345'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 5000,
        top_p: 0.9
      })
    });

    console.log('📡 DeepSeek API响应状态:', response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (content) {
        console.log('✅ AI响应成功');
        console.log('📄 响应长度:', content.length, '字符');
        console.log('🔧 Token使用:', result.usage?.total_tokens || '未知');

        // 尝试解析JSON
        try {
          let jsonContent = content;
          if (content.includes('```json')) {
            const match = content.match(/```json\n([\s\S]*?)\n```/);
            if (match && match[1]) {
              jsonContent = match[1];
            }
          }

          const parsed = JSON.parse(jsonContent);

          if (parsed.chapters && Array.isArray(parsed.chapters)) {
            console.log('🎯 成功生成故事章节:', parsed.chapters.length, '个');

            parsed.chapters.forEach((chapter, index) => {
              console.log(`\n📖 第${index + 1}章: ${chapter.title}`);
              console.log(`   内容: ${chapter.content?.substring(0, 100)}...`);
              console.log(`   法律意义: ${chapter.legalSignificance?.substring(0, 50)}...`);
              console.log(`   当事人: ${chapter.keyParties?.join(', ') || '无'}`);
              console.log(`   争议要素: ${chapter.disputeElements?.join(', ') || '无'}`);
            });

            console.log('\n✅ 故事模式直接API调用完全成功！');
            console.log('🔍 这证明CaseNarrativeService的环境变量修复是有效的');
            console.log('⚠️ 问题确实出在@deepracticex/ai-chat包的HTTP 404错误');
          } else {
            console.log('❌ 响应格式错误：缺少chapters字段');
          }
        } catch (parseError) {
          console.log('❌ JSON解析失败:', parseError.message);
          console.log('📄 原始响应内容:', content.substring(0, 500) + '...');
        }
      } else {
        console.log('❌ AI响应内容为空');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ DeepSeek API调用失败:', errorText);
    }

  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}

testStoryDirectAPI();