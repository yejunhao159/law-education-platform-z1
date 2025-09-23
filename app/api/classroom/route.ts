/**
 * 课堂管理API - 重构版
 * @description 基于DDD架构的课堂管理HTTP接口，专注于请求/响应处理
 * @author DeepPractice Legal Intelligence System
 * @version 2.0.0
 *
 * 架构特点：
 * - 职责单一：仅处理HTTP请求/响应层面逻辑
 * - 业务分离：核心业务逻辑移至ClassroomApplicationService
 * - 错误标准化：统一的错误码和状态码映射
 * - 类型安全：完整的TypeScript类型支持
 *
 * 支持的操作：
 * - CREATE: 创建课堂（教师）
 * - JOIN: 加入课堂（学生）
 * - START_SESSION: 开始会话（教师）
 * - END_SESSION: 结束会话（教师）
 * - GET_STATUS: 获取状态（通用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { ClassroomApplicationService } from '../../../src/domains/teaching-acts/services/ClassroomApplicationService';
import { ClassroomAction, ClassroomErrorCode } from '../../../src/domains/teaching-acts/services/types/ClassroomTypes';

// 创建Application Service实例（单例模式）
const classroomService = new ClassroomApplicationService();

/**
 * POST /api/classroom - 课堂操作处理器
 * @description 统一的课堂操作入口，通过action字段区分具体操作
 * @param req - Next.js请求对象
 * @returns 标准化的课堂操作响应
 *
 * 请求体格式：
 * {
 *   "action": "create" | "join" | "start-session" | "end-session" | "get-status",
 *   ...其他操作特定参数
 * }
 *
 * 响应格式：
 * {
 *   "success": boolean,
 *   "data"?: object,    // 成功时的数据
 *   "error"?: {         // 失败时的错误信息
 *     "message": string,
 *     "code": string
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: 解析和验证请求数据
    const requestData = await parseRequest(req);

    // Step 2: 委托给Application Service执行业务逻辑
    const result = await executeAction(requestData);

    // Step 3: 根据业务结果返回适当的HTTP响应
    const responseData = result.success ? result : result;
    const statusCode = result.success ? 200 : getErrorStatusCode(result.error?.code);

    const response = NextResponse.json(responseData, { status: statusCode });

    // Step 4: 添加安全的CORS头
    addCORSHeaders(response, req);

    return response;

  } catch (error) {
    // Step 5: 统一异常处理和错误日志记录
    console.error('❌ Classroom API错误:', error);
    const errorResponse = handleError(error);
    addCORSHeaders(errorResponse, req);
    return errorResponse;
  }
}

/**
 * GET /api/classroom - 获取课堂信息处理器
 * @description 根据查询参数获取课堂列表或特定课堂详情
 * @param req - Next.js请求对象
 * @returns 课堂信息响应
 *
 * 支持的查询参数组合：
 * 1. ?action=list&teacherId={id} - 获取教师的课堂列表
 * 2. ?id={classroomId} - 获取特定课堂的详细信息
 *
 * 响应数据结构：
 * - 课堂列表：{ classrooms: ClassroomInfo[], total: number }
 * - 课堂详情：{ classroom: ClassroomInfo, currentSession: ClassroomSession | null }
 */
export async function GET(req: NextRequest) {
  try {
    // Step 1: 解析URL查询参数
    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get('id');
    const teacherId = searchParams.get('teacherId');
    const action = searchParams.get('action');

    let result;

    // Step 2: 根据参数组合确定查询类型并调用相应的业务方法
    if (action === 'list' && teacherId) {
      // 场景1: 获取教师的所有课堂列表
      result = await classroomService.getClassroomList({ teacherId });
    } else if (classroomId) {
      // 场景2: 获取特定课堂的详细信息
      result = await classroomService.getClassroomDetail({ classroomId });
    } else {
      // 场景3: 参数不匹配，返回参数错误
      const errorResponse = NextResponse.json({
        success: false,
        error: {
          message: '缺少必要参数',
          code: ClassroomErrorCode.MISSING_PARAMETERS
        }
      }, { status: 400 });

      addCORSHeaders(errorResponse, req);
      return errorResponse;
    }

    // Step 3: 根据业务执行结果返回适当的HTTP响应
    const responseData = result.success ? result : result;
    const statusCode = result.success ? 200 : getErrorStatusCode(result.error?.code);

    const response = NextResponse.json(responseData, { status: statusCode });
    addCORSHeaders(response, req);

    return response;

  } catch (error) {
    // Step 4: 异常处理和错误日志记录
    console.error('❌ Classroom GET错误:', error);
    const errorResponse = handleError(error);
    addCORSHeaders(errorResponse, req);
    return errorResponse;
  }
}

/**
 * OPTIONS - CORS预检请求处理器
 * @description 处理浏览器的CORS预检请求，支持跨域API调用
 * @returns 带有CORS头的空响应
 *
 * 安全配置说明：
 * - Origin: 环境区分配置（开发环境允许localhost，生产环境限制域名）
 * - Methods: 支持常用HTTP方法
 * - Headers: 允许Content-Type和Authorization头
 * - Max-Age: 预检结果缓存24小时
 * - Credentials: 支持凭证传递
 */
export async function OPTIONS(req: NextRequest) {
  // 获取请求的Origin
  const origin = req.headers.get('origin');

  // 安全的CORS配置：根据环境设置允许的域名
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
      : ['https://your-production-domain.com']; // 生产环境请替换为实际域名

  // 检查Origin是否在允许列表中
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  return new Response(null, {
    status: 200,
    headers: {
      // 只有在允许列表中的Origin才会被设置
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin' // 确保不同Origin的响应被正确缓存
    }
  });
}

// ========== 私有辅助方法 ==========

/**
 * 添加安全的CORS头
 * @description 为响应添加基于白名单的CORS头，确保跨域访问安全
 * @param response - Next.js响应对象
 * @param request - Next.js请求对象
 *
 * 安全策略：
 * - 检查请求Origin是否在允许列表中
 * - 开发环境允许localhost访问
 * - 生产环境仅允许配置的域名
 * - 支持凭证传递和预检缓存
 */
function addCORSHeaders(response: NextResponse, request: NextRequest): void {
  const origin = request.headers.get('origin');

  // 获取允许的域名列表
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
      : ['https://your-production-domain.com']; // 生产环境请替换为实际域名

  // 检查Origin是否在允许列表中
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Vary', 'Origin');
}

/**
 * 解析POST请求数据
 * @description 解析并验证JSON请求体，确保包含必需的action字段
 * @param req - Next.js请求对象
 * @returns 解析后的请求数据
 * @throws 当JSON格式错误或缺少action字段时抛出异常
 *
 * 验证规则：
 * - 请求体必须是有效的JSON格式
 * - 必须包含action字段（操作类型标识）
 */
async function parseRequest(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.action) {
      throw new Error('缺少操作类型');
    }

    return body;
  } catch (error) {
    throw new Error('请求数据格式错误');
  }
}

/**
 * 路由分发器：根据action执行对应的业务操作
 * @description 将HTTP请求路由到相应的Application Service方法
 * @param requestData - 包含action和其他参数的请求数据
 * @returns 业务操作的执行结果
 *
 * 支持的操作映射：
 * - CREATE → createClassroom: 创建新课堂
 * - JOIN → joinClassroom: 学生加入课堂
 * - START_SESSION → startSession: 开始教学会话
 * - END_SESSION → endSession: 结束教学会话
 * - GET_STATUS → getStatus: 获取课堂状态
 */
async function executeAction(requestData: any) {
  const { action, ...data } = requestData;

  switch (action) {
    case ClassroomAction.CREATE:
      return await classroomService.createClassroom(data);

    case ClassroomAction.JOIN:
      return await classroomService.joinClassroom(data);

    case ClassroomAction.START_SESSION:
      return await classroomService.startSession(data);

    case ClassroomAction.END_SESSION:
      return await classroomService.endSession(data);

    case ClassroomAction.GET_STATUS:
      return await classroomService.getStatus(data);

    default:
      return {
        success: false,
        error: {
          message: '不支持的操作类型',
          code: ClassroomErrorCode.INVALID_ACTION
        }
      };
  }
}

/**
 * 错误码到HTTP状态码映射器
 * @description 将业务层错误码转换为标准HTTP状态码
 * @param errorCode - 业务层定义的错误码
 * @returns 对应的HTTP状态码
 *
 * 映射规则：
 * - 400 Bad Request: 参数错误、输入验证失败
 * - 403 Forbidden: 权限不足
 * - 404 Not Found: 资源不存在
 * - 409 Conflict: 资源冲突（如重复创建）
 * - 500 Internal Server Error: 未分类错误
 */
function getErrorStatusCode(errorCode?: string): number {
  switch (errorCode) {
    case ClassroomErrorCode.MISSING_PARAMETERS:
    case ClassroomErrorCode.MISSING_REQUIRED_FIELDS:
    case ClassroomErrorCode.INVALID_ACTION:
      return 400;
    case ClassroomErrorCode.UNAUTHORIZED:
      return 403;
    case ClassroomErrorCode.CLASSROOM_NOT_FOUND:
    case ClassroomErrorCode.SESSION_NOT_FOUND:
      return 404;
    case ClassroomErrorCode.SESSION_ALREADY_ACTIVE:
    case ClassroomErrorCode.CLASSROOM_UNAVAILABLE:
      return 409;
    default:
      return 500;
  }
}

/**
 * 统一异常处理器
 * @description 处理未捕获的异常，返回标准化的错误响应
 * @param error - 捕获的异常对象
 * @returns 标准化的错误响应
 *
 * 安全考虑：
 * - 不向客户端暴露具体的异常信息
 * - 返回通用的服务器错误信息
 * - 实际错误信息仅记录在服务器日志中
 */
function handleError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '未知错误';

  return NextResponse.json({
    success: false,
    error: {
      message: '服务器内部错误',
      code: ClassroomErrorCode.INTERNAL_ERROR
    }
  }, { status: 500 });
}