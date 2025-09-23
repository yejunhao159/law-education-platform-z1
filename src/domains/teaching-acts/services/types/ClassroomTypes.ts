/**
 * 课堂管理服务类型定义
 * DeepPractice Standards Compliant
 */

// ========== 基础实体类型 ==========
export interface ClassroomInfo {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  createdAt: number;
  status: 'active' | 'inactive' | 'archived';
  maxStudents: number;
  currentStudents: number;
  sessionMode: 'classroom' | 'demo';
  settings: ClassroomSettings;
}

export interface ClassroomSettings {
  allowAnonymous: boolean;
  requireApproval: boolean;
  autoStartSessions: boolean;
}

export interface StudentInfo {
  id: string;
  name: string;
  joinedAt: number;
  status: 'active' | 'inactive';
  sessionId?: string;
}

export interface ClassroomSession {
  id: string;
  classroomId: string;
  name: string;
  description?: string;
  status: 'preparing' | 'active' | 'paused' | 'completed';
  startedAt?: number;
  endedAt?: number;
  participants: StudentInfo[];
  caseId?: string;
  settings: SessionSettings;
}

export interface SessionSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  mode: 'auto' | 'semi' | 'manual';
  maxDuration: number;
}

// ========== 请求类型 ==========
export interface CreateClassroomRequest {
  name: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  maxStudents?: number;
  sessionMode?: 'classroom' | 'demo';
  settings?: Partial<ClassroomSettings>;
}

export interface JoinClassroomRequest {
  classroomId?: string;
  inviteCode?: string;
  studentId: string;
  studentName: string;
}

export interface StartSessionRequest {
  classroomId: string;
  teacherId: string;
  sessionName?: string;
  sessionDescription?: string;
  caseId?: string;
  settings?: Partial<SessionSettings>;
}

export interface EndSessionRequest {
  sessionId: string;
  classroomId: string;
  teacherId: string;
}

export interface GetStatusRequest {
  classroomId: string;
  studentId?: string;
}

export interface GetClassroomListRequest {
  teacherId: string;
}

export interface GetClassroomDetailRequest {
  classroomId: string;
}

// ========== 响应类型 ==========
export interface ClassroomResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code: string;
  };
}

export interface CreateClassroomResponse extends ClassroomResponse {
  data?: {
    classroom: ClassroomInfo;
    inviteCode: string;
    joinUrl: string;
  };
}

export interface JoinClassroomResponse extends ClassroomResponse {
  data?: {
    classroom: ClassroomInfo;
    student: StudentInfo;
    message: string;
  };
}

export interface StartSessionResponse extends ClassroomResponse {
  data?: {
    session: ClassroomSession;
    message: string;
  };
}

export interface EndSessionResponse extends ClassroomResponse {
  data?: {
    session: ClassroomSession;
    message: string;
  };
}

export interface GetStatusResponse extends ClassroomResponse {
  data?: {
    classroom: ClassroomInfo;
    activeSession: ClassroomSession | null;
    studentSession: ClassroomSession | null;
    timestamp: number;
  };
}

export interface GetClassroomListResponse extends ClassroomResponse {
  data?: {
    classrooms: ClassroomInfo[];
    total: number;
  };
}

export interface GetClassroomDetailResponse extends ClassroomResponse {
  data?: {
    classroom: ClassroomInfo;
    currentSession: ClassroomSession | null;
  };
}

// ========== 操作类型枚举 ==========
export enum ClassroomAction {
  CREATE = 'create',
  JOIN = 'join',
  START_SESSION = 'start-session',
  END_SESSION = 'end-session',
  GET_STATUS = 'get-status'
}

// ========== 错误代码枚举 ==========
export enum ClassroomErrorCode {
  INVALID_ACTION = 'INVALID_ACTION',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CLASSROOM_NOT_FOUND = 'CLASSROOM_NOT_FOUND',
  MISSING_PARAMETERS = 'MISSING_PARAMETERS',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  CLASSROOM_UNAVAILABLE = 'CLASSROOM_UNAVAILABLE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SESSION_ALREADY_ACTIVE = 'SESSION_ALREADY_ACTIVE',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND'
}