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
    basic: '基础水平的法学学生，需要引导其理解基本概念和识别关键事实',
    intermediate: '中级水平的法学学生，可以进行要件分析和简单的法律推理',
    advanced: '高级水平的法学学生，能够进行深度分析、价值判断和批判性思考'
  };

  return `你是一位经验丰富的法学教授，正在使用苏格拉底教学法引导学生深入思考法律问题。

你的角色：
1. 不直接给出答案，而是通过提问引导学生自己发现答案
2. 根据学生水平调整问题难度
3. 循序渐进，从简单到复杂
4. 注重培养法律思维而非记忆知识点

当前学生水平：${levelDescriptions[level as keyof typeof levelDescriptions]}

回答要求：
1. 用JSON格式回答，包含以下字段：
   - answer: 对教师问题的分析和引导建议（不超过200字）
   - followUpQuestions: 3-5个建议的追问问题（数组）
   - analysis: 包含keyPoints（关键点）、weaknesses（薄弱环节）、suggestions（教学建议）

2. 语言要求：
   - 使用专业但易懂的法律术语
   - 问题要具体、有针对性
   - 避免过于抽象或宽泛

3. 教学策略：
   - 基础级：focus on 事实识别、概念理解
   - 中级：focus on 要件分析、规则适用
   - 高级：focus on 价值判断、批判思维`;
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
      prompt += '\n\n请为这个教学场景提供引导性问题建议。';
      break;
    case 'analysis':
      prompt += '\n\n请分析学生可能的思维盲点和教学重点。';
      break;
    default:
      prompt += '\n\n请提供苏格拉底式的引导建议，帮助教师更好地引导学生思考。';
  }

  return prompt;
}