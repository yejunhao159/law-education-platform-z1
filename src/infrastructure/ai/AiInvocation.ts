import { callUnifiedAI } from './AICallProxy';

export interface AiInvocationOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface AiInvocationResult {
  content: string;
  tokensUsed: number;
  cost: number;
  model: string;
  callId: string;
}

const JSON_FENCE_REGEX = /```json\s*([\s\S]*?)\s*```/i;
const GENERIC_FENCE_REGEX = /```[\w]*\s*([\s\S]*?)\s*```/i;
const DEGRADED_PATTERNS = [
  '抱歉',
  '无法生成',
  '错误',
  '系统繁忙',
  '服务降级',
  'sorry',
  'unable to generate',
  'error',
  'service unavailable'
];

/**
 * 统一的 AI 调用入口，封装 callUnifiedAI 的细节。
 */
export async function invokeAi(options: AiInvocationOptions): Promise<AiInvocationResult> {
  const {
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
    responseFormat
  } = options;

  const result = await callUnifiedAI(systemPrompt, userPrompt, {
    temperature,
    maxTokens,
    responseFormat,
  });

  return {
    content: result.content,
    tokensUsed: result.tokensUsed,
    cost: result.cost,
    model: result.model,
    callId: result.callId
  };
}

/**
 * 移除 AI 响应中可能出现的 Markdown 代码块包装，返回纯文本。
 */
export function stripCodeFences(raw: string): string {
  if (!raw) return raw;

  const jsonMatch = raw.match(JSON_FENCE_REGEX);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }

  const genericMatch = raw.match(GENERIC_FENCE_REGEX);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }

  return raw.trim();
}

/**
 * 将 AI 返回的字符串解析为 JSON 对象，并在失败时抛出更友好的错误。
 */
export function parseAiJson<T>(raw: string): T {
  const sanitised = stripCodeFences(raw);
  try {
    return JSON.parse(sanitised) as T;
  } catch (error) {
    throw new Error(
      `AI 响应不是有效的 JSON：${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 粗略检测 AI 内容是否为降级/错误提示。
 */
export function isDegradedContent(content: string): boolean {
  if (!content) return true;
  const lower = content.toLowerCase();
  return DEGRADED_PATTERNS.some(pattern => {
    const target = pattern.toLowerCase();
    return lower.includes(target);
  });
}
