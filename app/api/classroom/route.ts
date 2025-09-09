/**
 * 课堂管理API路由
 * @description 处理课堂创建、加入、管理等功能的API端点
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// ============== 类型定义 ==============

interface ClassroomInfo {
  id: string
  name: string
  description?: string
  teacherId: string
  teacherName: string
  createdAt: number
  status: 'active' | 'inactive' | 'archived'
  maxStudents: number
  currentStudents: number
  sessionMode: 'classroom' | 'demo'
  settings: {
    allowAnonymous: boolean
    requireApproval: boolean
    autoStartSessions: boolean
  }
}

interface StudentInfo {
  id: string
  name: string
  joinedAt: number
  status: 'active' | 'inactive'
  sessionId?: string
}

interface ClassroomSession {
  id: string
  classroomId: string
  name: string
  description?: string
  status: 'preparing' | 'active' | 'paused' | 'completed'
  startedAt?: number
  endedAt?: number
  participants: StudentInfo[]
  caseId?: string
  settings: {
    difficulty: 'easy' | 'normal' | 'hard'
    mode: 'auto' | 'semi' | 'manual'
    maxDuration: number
  }
}

// ============== 数据存储（临时内存存储） ==============
// 注意：实际应用中应使用数据库

const classrooms = new Map<string, ClassroomInfo>()
const classroomSessions = new Map<string, ClassroomSession>()
const studentSessions = new Map<string, string>() // studentId -> sessionId
const inviteCodes = new Map<string, string>() // inviteCode -> classroomId

// 测试重置函数（仅用于测试）
export function resetClassroomData() {
  classrooms.clear()
  classroomSessions.clear()
  studentSessions.clear()
  inviteCodes.clear()
}

// ============== 辅助函数 ==============

/**
 * 生成课堂邀请码
 */
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * 验证教师权限
 */
function verifyTeacherAccess(classroomId: string, teacherId: string): boolean {
  const classroom = classrooms.get(classroomId)
  return classroom?.teacherId === teacherId
}

/**
 * 验证学生是否可以加入课堂
 */
function canJoinClassroom(classroom: ClassroomInfo): boolean {
  return classroom.status === 'active' && 
         classroom.currentStudents < classroom.maxStudents
}

// ============== API 处理函数 ==============

/**
 * POST /api/classroom - 创建或加入课堂
 */
export async function POST(req: NextRequest) {
  try {
    const { action, ...data } = await req.json()

    switch (action) {
      case 'create':
        return await handleCreateClassroom(data)
      
      case 'join':
        return await handleJoinClassroom(data)
      
      case 'start-session':
        return await handleStartSession(data)
      
      case 'end-session':
        return await handleEndSession(data)
      
      case 'get-status':
        return await handleGetStatus(data)
      
      default:
        return NextResponse.json({
          success: false,
          error: {
            message: '不支持的操作类型',
            code: 'INVALID_ACTION'
          }
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Classroom API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        message: '服务器内部错误',
        code: 'INTERNAL_ERROR'
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/classroom - 获取课堂列表或详情
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const classroomId = searchParams.get('id')
    const teacherId = searchParams.get('teacherId')
    const action = searchParams.get('action')

    if (action === 'list' && teacherId) {
      // 获取教师的课堂列表
      const teacherClassrooms = Array.from(classrooms.values())
        .filter(classroom => classroom.teacherId === teacherId)
        .sort((a, b) => b.createdAt - a.createdAt)

      return NextResponse.json({
        success: true,
        data: {
          classrooms: teacherClassrooms,
          total: teacherClassrooms.length
        }
      })
    }

    if (classroomId) {
      // 获取特定课堂详情
      const classroom = classrooms.get(classroomId)
      
      if (!classroom) {
        return NextResponse.json({
          success: false,
          error: {
            message: '课堂不存在',
            code: 'CLASSROOM_NOT_FOUND'
          }
        }, { status: 404 })
      }

      // 获取当前会话信息
      const currentSession = Array.from(classroomSessions.values())
        .find(session => session.classroomId === classroomId && 
                        session.status === 'active')

      return NextResponse.json({
        success: true,
        data: {
          classroom,
          currentSession: currentSession || null
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: {
        message: '缺少必要参数',
        code: 'MISSING_PARAMETERS'
      }
    }, { status: 400 })

  } catch (error) {
    console.error('Classroom GET Error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        message: '服务器内部错误',
        code: 'INTERNAL_ERROR'
      }
    }, { status: 500 })
  }
}

// ============== 具体处理函数 ==============

/**
 * 处理创建课堂请求
 */
async function handleCreateClassroom(data: any) {
  const {
    name,
    description = '',
    teacherId,
    teacherName,
    maxStudents = 30,
    sessionMode = 'classroom',
    settings = {
      allowAnonymous: true,
      requireApproval: false,
      autoStartSessions: false
    }
  } = data

  // 验证必要字段
  if (!name || !name.trim() || !teacherId || !teacherName) {
    return NextResponse.json({
      success: false,
      error: {
        message: '缺少必要字段：name, teacherId, teacherName',
        code: 'MISSING_REQUIRED_FIELDS'
      }
    }, { status: 400 })
  }

  // 创建课堂
  const classroomId = uuidv4()
  const inviteCode = generateInviteCode()
  
  const classroom: ClassroomInfo = {
    id: classroomId,
    name: name.trim(),
    description: description.trim(),
    teacherId,
    teacherName,
    createdAt: Date.now(),
    status: 'active',
    maxStudents: Math.max(1, Math.min(100, maxStudents)),
    currentStudents: 0,
    sessionMode,
    settings: {
      allowAnonymous: settings.allowAnonymous !== false,
      requireApproval: settings.requireApproval === true,
      autoStartSessions: settings.autoStartSessions === true
    }
  }

  classrooms.set(classroomId, classroom)
  inviteCodes.set(inviteCode, classroomId)

  return NextResponse.json({
    success: true,
    data: {
      classroom,
      inviteCode,
      joinUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/classroom/join?code=${inviteCode}`
    }
  })
}

/**
 * 处理加入课堂请求
 */
async function handleJoinClassroom(data: any) {
  const {
    classroomId,
    inviteCode,
    studentId,
    studentName
  } = data

  // 验证必要字段
  if ((!classroomId && !inviteCode) || !studentId || !studentName) {
    return NextResponse.json({
      success: false,
      error: {
        message: '缺少必要字段',
        code: 'MISSING_REQUIRED_FIELDS'
      }
    }, { status: 400 })
  }

  // 查找课堂
  let classroom: ClassroomInfo | undefined

  if (classroomId) {
    classroom = classrooms.get(classroomId)
  } else if (inviteCode) {
    // 根据邀请码查找课堂
    const foundClassroomId = inviteCodes.get(inviteCode)
    if (foundClassroomId) {
      classroom = classrooms.get(foundClassroomId)
    }
  }

  if (!classroom) {
    return NextResponse.json({
      success: false,
      error: {
        message: '课堂不存在或已关闭',
        code: 'CLASSROOM_NOT_FOUND'
      }
    }, { status: 404 })
  }

  // 检查是否可以加入
  if (!canJoinClassroom(classroom)) {
    return NextResponse.json({
      success: false,
      error: {
        message: '课堂已满或不可用',
        code: 'CLASSROOM_UNAVAILABLE'
      }
    }, { status: 403 })
  }

  // 创建学生信息
  const student: StudentInfo = {
    id: studentId,
    name: studentName.trim(),
    joinedAt: Date.now(),
    status: 'active'
  }

  // 更新课堂学生数量
  classroom.currentStudents += 1
  classrooms.set(classroom.id, classroom)

  return NextResponse.json({
    success: true,
    data: {
      classroom,
      student,
      message: `成功加入课堂：${classroom.name}`
    }
  })
}

/**
 * 处理开始会话请求
 */
async function handleStartSession(data: any) {
  const {
    classroomId,
    teacherId,
    sessionName,
    sessionDescription = '',
    caseId,
    settings = {
      difficulty: 'normal',
      mode: 'auto',
      maxDuration: 3600000 // 1小时
    }
  } = data

  // 验证教师权限
  if (!verifyTeacherAccess(classroomId, teacherId)) {
    return NextResponse.json({
      success: false,
      error: {
        message: '无权限操作此课堂',
        code: 'UNAUTHORIZED'
      }
    }, { status: 403 })
  }

  const classroom = classrooms.get(classroomId)!

  // 检查是否有活跃会话
  const existingSession = Array.from(classroomSessions.values())
    .find(session => session.classroomId === classroomId && 
                    session.status === 'active')

  if (existingSession) {
    return NextResponse.json({
      success: false,
      error: {
        message: '课堂已有活跃会话',
        code: 'SESSION_ALREADY_ACTIVE'
      }
    }, { status: 409 })
  }

  // 创建新会话
  const sessionId = uuidv4()
  const session: ClassroomSession = {
    id: sessionId,
    classroomId,
    name: sessionName || `${classroom.name} - ${new Date().toLocaleString()}`,
    description: sessionDescription,
    status: 'active',
    startedAt: Date.now(),
    participants: [],
    caseId,
    settings: {
      difficulty: settings.difficulty || 'normal',
      mode: settings.mode || 'auto',
      maxDuration: Math.max(300000, Math.min(7200000, settings.maxDuration || 3600000))
    }
  }

  classroomSessions.set(sessionId, session)

  return NextResponse.json({
    success: true,
    data: {
      session,
      message: '会话已开始'
    }
  })
}

/**
 * 处理结束会话请求
 */
async function handleEndSession(data: any) {
  const { sessionId, classroomId, teacherId } = data

  // 验证教师权限
  if (!verifyTeacherAccess(classroomId, teacherId)) {
    return NextResponse.json({
      success: false,
      error: {
        message: '无权限操作此课堂',
        code: 'UNAUTHORIZED'
      }
    }, { status: 403 })
  }

  const session = classroomSessions.get(sessionId)

  if (!session) {
    return NextResponse.json({
      success: false,
      error: {
        message: '会话不存在',
        code: 'SESSION_NOT_FOUND'
      }
    }, { status: 404 })
  }

  // 结束会话
  session.status = 'completed'
  session.endedAt = Date.now()
  classroomSessions.set(sessionId, session)

  // 清理学生会话映射
  session.participants.forEach(participant => {
    studentSessions.delete(participant.id)
  })

  return NextResponse.json({
    success: true,
    data: {
      session,
      message: '会话已结束'
    }
  })
}

/**
 * 处理获取状态请求
 */
async function handleGetStatus(data: any) {
  const { classroomId, studentId } = data

  const classroom = classrooms.get(classroomId)
  
  if (!classroom) {
    return NextResponse.json({
      success: false,
      error: {
        message: '课堂不存在',
        code: 'CLASSROOM_NOT_FOUND'
      }
    }, { status: 404 })
  }

  // 获取当前活跃会话
  const activeSession = Array.from(classroomSessions.values())
    .find(session => session.classroomId === classroomId && 
                    session.status === 'active')

  // 获取学生会话信息
  let studentSession = null
  if (studentId) {
    const sessionId = studentSessions.get(studentId)
    if (sessionId) {
      studentSession = classroomSessions.get(sessionId)
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      classroom,
      activeSession: activeSession || null,
      studentSession: studentSession || null,
      timestamp: Date.now()
    }
  })
}

/**
 * OPTIONS - 支持CORS预检请求
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}