/**
 * 课堂检查API
 * 验证课堂代码是否有效
 */
import { NextRequest, NextResponse } from 'next/server';

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 处理 CORS preflight 请求
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// 简单的内存存储（生产环境应使用数据库或Redis）
const activeClassrooms = new Set<string>();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // 检查课堂是否存在
  // TODO: 这里应该从数据库查询，目前简化为内存检查
  // 临时方案：所有6位代码都视为有效（用于快速演示）
  const isValid = code && code.length === 6;

  if (isValid) {
    // 标记课堂为活跃状态
    activeClassrooms.add(code);

    return NextResponse.json({
      success: true,
      classroom: {
        code,
        active: true,
        timestamp: new Date().toISOString(),
      },
    }, { headers: corsHeaders });
  }

  return NextResponse.json(
    {
      success: false,
      error: '课堂不存在或已结束',
    },
    { status: 404, headers: corsHeaders }
  );
}

// 导出activeClassrooms供其他API使用
export { activeClassrooms };
