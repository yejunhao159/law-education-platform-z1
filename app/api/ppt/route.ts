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
      return NextResponse.json({ error: errorText || 'PPT generation failed' }, { status: response.status });
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
      return NextResponse.json({ error: text || 'Failed to query PPT status' }, { status: response.status });
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
      return NextResponse.json({ error: text || 'Failed to download PPT' }, { status: response.status });
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
