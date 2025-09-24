/**
 * 简化版苏格拉底教学API
 * 使用原生 DeepSeek API，避免复杂的 DeeChat 依赖
 */

import { NextRequest, NextResponse } from 'next/server';

interface SocraticRequest {
  question: string;
  level: 'basic' | 'intermediate' | 'advanced';
  context: {
    caseTitle?: string;
    facts?: string[];
    laws?: string[];
    dispute?: string;
    previousMessages?: Array<{
      role: 'teacher' | 'ai' | 'student';
      content: string;
    }>;
  };
  mode: 'response' | 'suggestions' | 'analysis';
}

export async function POST(request: NextRequest) {
  try {
    const body: SocraticRequest = await request.json();

    // 验证请求
    if (!body.question || !body.level) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }

    console.log('使用简化版苏格拉底服务处理请求...');

    // 构建系统提示词
    const systemPrompt = buildSystemPrompt(body.level);

    // 构建用户提示词
    const userPrompt = buildUserPrompt(body);

    // 调用 DeepSeek API
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API密钥未配置'
      }, { status: 500 });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API 错误:', errorText);
      return NextResponse.json({
        success: false,
        error: `AI服务错误: ${response.status}`
      }, { status: 500 });
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      return NextResponse.json({
        success: false,
        error: 'AI响应格式异常'
      }, { status: 500 });
    }

    const aiResponse = data.choices[0].message.content;

    // 尝试解析 JSON 响应
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch {
      // 如果不是 JSON 格式，创建一个简单的响应结构
      parsedResponse = {
        answer: aiResponse,
        followUpQuestions: generateFollowUpQuestions(body.level),
        analysis: {
          keyPoints: ["基于苏力教授教学理念生成"],
          weaknesses: ["需要结合中国法律实践"],
          suggestions: ["引导学生关注法律的社会现实"]
        }
      };
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse
    });

  } catch (error) {
    console.error('苏格拉底AI生成错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}

function buildSystemPrompt(level: string): string {
  const levelDescriptions = {
    basic: '观察层-事实层水平：需要引导其仔细观察案例细节，识别基本事实，理清时间线和因果关系',
    intermediate: '分析层-应用层水平：能够进行法律关系分析、权利义务梳理，并开始应用具体法条进行推理',
    advanced: '价值层水平：能够进行深度的价值判断、利益平衡考量，思考法律背后的公平正义问题'
  };

  return `你是苏力（朱苏力）教授，北京大学法学院资深教授，中国法理学泰斗。你秉承"法律的生命不在逻辑，而在经验"的理念，正在使用苏格拉底教学法引导学生深入思考中国法律问题。

你的教学理念：
1. **本土资源理论**：强调中国法治必须基于中国的历史、文化和社会现实
2. **语境论法学**：法律必须在具体社会语境中理解和运用
3. **经验优于逻辑**：从实践经验出发，而非抽象理论推演
4. **关注生活正义**：重视普通人的正义感受

当前学生水平：${levelDescriptions[level as keyof typeof levelDescriptions]}

你的教学方法：
1. **不直接给答案**：通过层层递进的问题引导学生自己发现真理
2. **重视中国实践**：结合中国法律实践和社会现实进行分析
3. **批判性思维**：鼓励学生质疑，培养独立思考能力

请用JSON格式回答，包含以下字段：
- answer: 基于苏力教学理念的引导建议（不超过250字）
- followUpQuestions: 3个苏格拉底式递进问题（数组）
- analysis: 包含keyPoints（关键点）、weaknesses（薄弱环节）、suggestions（教学建议）

语言风格要平实，避免过度西化的法学术语，体现中国法学特色。`;
}

function buildUserPrompt(request: SocraticRequest): string {
  let prompt = `案件背景：
标题：${request.context.caseTitle || '法律案例'}
争议焦点：${request.context.dispute || '待分析'}
`;

  if (request.context.facts && request.context.facts.length > 0) {
    prompt += `\n关键事实：\n${request.context.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  }

  if (request.context.laws && request.context.laws.length > 0) {
    prompt += `\n\n相关法条：\n${request.context.laws.map((l, i) => `${i + 1}. ${l}`).join('\n')}`;
  }

  if (request.context.previousMessages && request.context.previousMessages.length > 0) {
    const recent = request.context.previousMessages.slice(-3);
    prompt += `\n\n最近对话：\n${recent.map(m => `${m.role}: ${m.content}`).join('\n')}`;
  }

  prompt += `\n\n教师当前问题：${request.question}`;

  switch (request.mode) {
    case 'suggestions':
      prompt += '\n\n请基于苏力教授的"本土资源"理论，为这个教学场景提供体现中国法学特色的引导性问题建议。';
      break;
    case 'analysis':
      prompt += '\n\n请从苏力教授的"语境论法学"视角，分析学生可能的思维盲点和教学重点。';
      break;
    default:
      prompt += '\n\n请提供体现苏力教授教学理念的苏格拉底式引导建议：从生活经验入手，关注中国法律实践的特殊性。';
  }

  return prompt;
}

function generateFollowUpQuestions(level: string): string[] {
  const questionsByLevel = {
    basic: [
      "学生是否理解了案例的基本事实？",
      "需要引导学生关注哪些细节？",
      "如何帮助学生梳理时间顺序？"
    ],
    intermediate: [
      "学生的法律分析是否深入？",
      "是否需要引导学生思考其他角度？",
      "如何帮助学生更好地运用法条？"
    ],
    advanced: [
      "学生的价值判断是否成熟？",
      "如何引导学生思考更深层的正义问题？",
      "学生是否考虑到了社会影响？"
    ]
  };

  return questionsByLevel[level as keyof typeof questionsByLevel] || questionsByLevel.intermediate;
}