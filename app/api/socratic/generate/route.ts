/**
 * 苏格拉底教学AI生成API
 * 使用DeepSeek为教师提供智能问题建议和分析
 */

import { NextRequest, NextResponse } from 'next/server';

// 请求体类型
interface SocraticRequest {
  question: string;          // 教师的问题
  level: 'basic' | 'intermediate' | 'advanced';  // 教学难度
  context: {
    caseTitle?: string;       // 案件标题
    facts?: string[];         // 案件事实
    laws?: string[];          // 相关法条
    dispute?: string;         // 争议焦点
    previousMessages?: Array<{  // 对话历史
      role: 'teacher' | 'ai' | 'student';
      content: string;
    }>;
  };
  mode: 'response' | 'suggestions' | 'analysis';  // 模式
}

// 响应类型
interface SocraticResponse {
  success: boolean;
  data?: {
    answer: string;           // AI回答
    followUpQuestions: string[];  // 建议的追问
    analysis?: {              // 分析结果
      keyPoints: string[];
      weaknesses: string[];
      suggestions: string[];
    };
  };
  error?: string;
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

    // 构建系统提示词
    const systemPrompt = buildSystemPrompt(body.level);
    
    // 构建用户提示词
    const userPrompt = buildUserPrompt(body);
    
    // 调用DeepSeek API
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    
    if (!apiKey) {
      console.error('DeepSeek API Key未配置');
      return NextResponse.json({
        success: false,
        error: 'API配置错误'
      }, { status: 500 });
    }

    console.log('调用DeepSeek API进行苏格拉底教学分析...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,  // 适中的创造性
        max_tokens: 1500,
        response_format: { type: "json_object" }  // 强制JSON响应
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API错误:', errorText);
      return NextResponse.json({
        success: false,
        error: `API调用失败: ${response.status}`
      }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json({
        success: false,
        error: '未获得有效响应'
      }, { status: 500 });
    }

    // 解析AI响应
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error('解析AI响应失败:', content);
      // 如果解析失败，返回纯文本响应
      result = {
        answer: content,
        followUpQuestions: [],
        analysis: null
      };
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('苏格拉底AI生成错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}

/**
 * 构建系统提示词
 */
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
4. **关注生活正义**：重视普通人的正义感受，不忽视"秋菊的困惑"

苏格拉底式五层递进教学法：
- **观察层**：引导学生仔细观察案例细节，识别基本事实信息
- **事实层**：帮助学生梳理时间线和因果关系，区分客观事实与主观推论
- **分析层**：引导识别法律关系主体，分析权利义务，找出争议本质
- **应用层**：指导学生选择适用法条，分析构成要件，进行法律推理
- **价值层**：引发对公平正义的思考，平衡各方利益，考虑社会效果

当前学生水平：${levelDescriptions[level as keyof typeof levelDescriptions]}

你的教学方法：
1. **不直接给答案**：通过层层递进的问题引导学生自己发现真理
2. **重视中国实践**：结合中国法律实践和社会现实进行分析
3. **批判性思维**：鼓励学生质疑，培养独立思考能力
4. **语境化分析**：将法律问题放在具体的社会、文化、经济背景中分析

回答要求：
1. 用JSON格式回答，包含以下字段：
   - answer: 基于苏力教学理念的引导建议（体现本土资源思维，不超过250字）
   - followUpQuestions: 3-5个体现苏格拉底式递进逻辑的问题（数组）
   - analysis: 包含keyPoints（关键点）、weaknesses（薄弱环节）、suggestions（教学建议，要体现中国法学特色）

2. 语言风格：
   - 用平实的语言讲深刻的道理（苏力特色）
   - 问题要具体且贴近中国法律实践
   - 避免过度西化的法学术语

3. 分层教学策略：
   - 观察层-事实层：引导发现案例中的中国社会现实特征
   - 分析层-应用层：结合中国法律传统和现代法治实践
   - 价值层：思考法律与中国社会文化的深层关系`;
}

/**
 * 构建用户提示词
 */
function buildUserPrompt(request: SocraticRequest): string {
  const { question, context, mode } = request;
  
  let prompt = `案件背景：
标题：${context.caseTitle || '法律案例'}
争议焦点：${context.dispute || '待分析'}
`;

  if (context.facts && context.facts.length > 0) {
    prompt += `\n关键事实：\n${context.facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  }

  if (context.laws && context.laws.length > 0) {
    prompt += `\n\n相关法条：\n${context.laws.map((l, i) => `${i + 1}. ${l}`).join('\n')}`;
  }

  if (context.previousMessages && context.previousMessages.length > 0) {
    const recent = context.previousMessages.slice(-3);  // 只取最近3条
    prompt += `\n\n最近对话：\n${recent.map(m => `${m.role}: ${m.content}`).join('\n')}`;
  }

  prompt += `\n\n教师当前问题：${question}`;

  switch (mode) {
    case 'suggestions':
      prompt += '\n\n请基于苏力教授的"本土资源"理论，为这个教学场景提供体现中国法学特色的引导性问题建议。问题应该帮助学生从中国的社会现实出发理解法律问题。';
      break;
    case 'analysis':
      prompt += '\n\n请从苏力教授的"语境论法学"视角，分析学生可能的思维盲点和教学重点。特别关注如何让学生理解法律与中国社会实践的关系。';
      break;
    default:
      prompt += '\n\n请提供体现苏力教授教学理念的苏格拉底式引导建议：1）从生活经验入手，而非抽象概念；2）关注中国法律实践的特殊性；3）引导学生思考法律背后的社会现实。';
  }

  return prompt;
}