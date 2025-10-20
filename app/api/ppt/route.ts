import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.302.ai';
const REQUEST_TIMEOUT = 480_000; // 8 minutes (increased for complex PPT generation)

type SupportedAction = 'generate' | 'status' | 'download';

interface PptRequestBody {
  action?: SupportedAction;
  payload?: any;
}

function createTimeoutController(timeout: number = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return { controller, timer };
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.AI_302_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'PPT API key missing (AI_302_API_KEY)' }, { status: 500 });
  }

  let body: PptRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { action, payload } = body ?? {};

  if (!action) {
    return NextResponse.json({ error: 'Missing action in request body' }, { status: 400 });
  }

  switch (action) {
    case 'generate':
      return proxyGenerateRequest(payload, apiKey);
    case 'status':
      return proxyStatusRequest(payload, apiKey);
    case 'download':
      return proxyDownloadRequest(payload, apiKey);
    default:
      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }
}

async function proxyGenerateRequest(payload: any, apiKey: string): Promise<Response> {
  if (!payload) {
    return NextResponse.json({ error: 'Missing payload for generate action' }, { status: 400 });
  }

  const { controller, timer } = createTimeoutController();

  try {
    const response = await fetch(`${API_BASE_URL}/302/ppt/generatecontent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();

      // 🔧 解析302.AI的错误响应，提供友好的错误提示
      let friendlyError = errorText || 'PPT generation failed';
      try {
        const errorData = JSON.parse(errorText);
        const apiError = errorData.error;

        // 识别常见错误类型
        if (apiError?.err_code === -10006 || apiError?.message?.includes('Quota')) {
          friendlyError = '💰 302.AI API 配额已用完。请访问 302.AI 充值或更换 API 密钥。';
        } else if (apiError?.err_code === -10001 || apiError?.message?.includes('Invalid API key')) {
          friendlyError = '🔑 API 密钥无效。请检查 AI_302_API_KEY 环境变量。';
        } else if (apiError?.message_cn) {
          // 使用中文错误信息（更友好）
          friendlyError = `302.AI 错误: ${apiError.message_cn}`;
        } else if (apiError?.message) {
          friendlyError = `302.AI 错误: ${apiError.message}`;
        }
      } catch (e) {
        // 如果解析失败，使用原始错误
      }

      return NextResponse.json({ error: friendlyError }, { status: response.status });
    }

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    const status = error instanceof Error && error.name === 'AbortError' ? 504 : 500;
    return NextResponse.json(
      { error: `Failed to proxy PPT generation request: ${error instanceof Error ? error.message : String(error)}` },
      { status }
    );
  } finally {
    clearTimeout(timer);
  }
}

async function proxyStatusRequest(payload: any, apiKey: string): Promise<Response> {
  const pptId = payload?.pptId;
  if (!pptId) {
    return NextResponse.json({ error: 'Missing pptId for status action' }, { status: 400 });
  }

  const { controller, timer } = createTimeoutController();

  try {
    const response = await fetch(`${API_BASE_URL}/302/ppt/asyncpptinfo?pptId=${encodeURIComponent(pptId)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      let friendlyError = text || 'Failed to query PPT status';
      try {
        const errorData = JSON.parse(text);
        const apiError = errorData.error;
        if (apiError?.err_code === -10006) {
          friendlyError = '💰 302.AI API 配额已用完。';
        } else if (apiError?.message_cn) {
          friendlyError = `302.AI 错误: ${apiError.message_cn}`;
        }
      } catch (e) {}
      return NextResponse.json({ error: friendlyError }, { status: response.status });
    }

    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const status = error instanceof Error && error.name === 'AbortError' ? 504 : 500;
    return NextResponse.json(
      { error: `Failed to proxy PPT status request: ${error instanceof Error ? error.message : String(error)}` },
      { status }
    );
  } finally {
    clearTimeout(timer);
  }
}

async function proxyDownloadRequest(payload: any, apiKey: string): Promise<Response> {
  const pptId = payload?.pptId;
  if (!pptId) {
    return NextResponse.json({ error: 'Missing pptId for download action' }, { status: 400 });
  }

  const { controller, timer } = createTimeoutController();

  try {
    const response = await fetch(`${API_BASE_URL}/302/ppt/downloadpptx`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: pptId, refresh: false }),
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      let friendlyError = text || 'Failed to download PPT';
      try {
        const errorData = JSON.parse(text);
        const apiError = errorData.error;
        if (apiError?.err_code === -10006) {
          friendlyError = '💰 302.AI API 配额已用完。';
        } else if (apiError?.message_cn) {
          friendlyError = `302.AI 错误: ${apiError.message_cn}`;
        }
      } catch (e) {}
      return NextResponse.json({ error: friendlyError }, { status: response.status });
    }

    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const status = error instanceof Error && error.name === 'AbortError' ? 504 : 500;
    return NextResponse.json(
      { error: `Failed to proxy PPT download request: ${error instanceof Error ? error.message : String(error)}` },
      { status }
    );
  } finally {
    clearTimeout(timer);
  }
}
