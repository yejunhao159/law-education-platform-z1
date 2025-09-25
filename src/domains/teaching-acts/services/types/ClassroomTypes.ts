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
  /** 当前进行中的投票 */
  currentVote?: VoteSession;
}

export interface SessionSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  mode: 'auto' | 'semi' | 'manual';
  maxDuration: number;
}

// ========== 投票系统类型 ==========
export interface VoteOption {
  /** 选项ID (A, B, C, D, E) */
  id: string;
  /** 选项描述文本 */
  text: string;
  /** 当前投票数 */
  voteCount: number;
}

export interface VoteSession {
  /** 投票会话ID */
  id: string;
  /** 投票问题 */
  question: string;
  /** 投票选项列表 */
  options: VoteOption[];
  /** 投票创建时间 */
  createdAt: number;
  /** 投票结束时间 */
  endsAt?: number;
  /** 是否激活状态 */
  isActive: boolean;
  /** 参与者投票记录 studentId -> optionId */
  participantVotes: Record<string, string>;
  /** 允许的最大选项数 */
  maxOptions: number;
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

// ========== 投票相关请求类型 ==========
export interface StartVoteRequest {
  sessionId: string;
  teacherId: string;
  question: string;
  options: string[]; // 最多5个选项 (A, B, C, D, E)
  duration?: number; // 投票持续时间（秒）
}

export interface SubmitVoteRequest {
  sessionId: string;
  studentId: string;
  optionId: string; // 'A', 'B', 'C', 'D', 'E'
}

export interface EndVoteRequest {
  sessionId: string;
  teacherId: string;
}

export interface GetVoteResultsRequest {
  sessionId: string;
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

// ========== 投票相关响应类型 ==========
export interface StartVoteResponse extends ClassroomResponse {
  data?: {
    voteSession: VoteSession;
    message: string;
  };
}

export interface SubmitVoteResponse extends ClassroomResponse {
  data?: {
    voteSession: VoteSession;
    message: string;
  };
}

export interface EndVoteResponse extends ClassroomResponse {
  data?: {
    voteSession: VoteSession;
    results: VoteOption[];
    message: string;
  };
}

export interface GetVoteResultsResponse extends ClassroomResponse {
  data?: {
    voteSession: VoteSession | null;
    results: VoteOption[];
  };
}

// ========== 操作类型枚举 ==========
export enum ClassroomAction {
  CREATE = 'create',
  JOIN = 'join',
  START_SESSION = 'start-session',
  END_SESSION = 'end-session',
  GET_STATUS = 'get-status',
  START_VOTE = 'start-vote',
  SUBMIT_VOTE = 'submit-vote',
  END_VOTE = 'end-vote',
  GET_VOTE_RESULTS = 'get-vote-results'
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
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  VOTE_ALREADY_ACTIVE = 'VOTE_ALREADY_ACTIVE',
  VOTE_NOT_FOUND = 'VOTE_NOT_FOUND',
  VOTE_ENDED = 'VOTE_ENDED',
  VOTE_ALREADY_SUBMITTED = 'VOTE_ALREADY_SUBMITTED',
  INVALID_VOTE_OPTION = 'INVALID_VOTE_OPTION',
  TOO_MANY_OPTIONS = 'TOO_MANY_OPTIONS'
}