/**
 * SSE类型定义
 * @description 定义Server-Sent Events相关的类型结构
 */

/**
 * SSE事件类型枚举
 */
export enum SSEEventType {
  VOTE_STARTED = 'vote-started',
  VOTE_UPDATE = 'vote-update',
  VOTE_ENDED = 'vote-ended',
  STUDENT_JOINED = 'student-joined',
  STUDENT_LEFT = 'student-left',
  CONNECTION_ESTABLISHED = 'connection-established',
  HEARTBEAT = 'heartbeat'
}

/**
 * 基础SSE消息结构
 */
export interface SSEMessage {
  type: SSEEventType;
  timestamp: number;
  classroomId: string;
  data: unknown;
}

/**
 * 投票开始事件数据
 */
export interface VoteStartedData {
  voteId: string;
  question: string;
  options: Array<{
    id: string; // A, B, C, D, E
    text: string;
  }>;
  duration?: number; // 持续时间（秒）
  startedAt: number;
}

/**
 * 投票更新事件数据
 */
export interface VoteUpdateData {
  voteId: string;
  results: Array<{
    id: string;
    text: string;
    count: number;
    percentage: number;
  }>;
  totalVotes: number;
  lastUpdate: number;
}

/**
 * 投票结束事件数据
 */
export interface VoteEndedData {
  voteId: string;
  finalResults: Array<{
    id: string;
    text: string;
    count: number;
    percentage: number;
  }>;
  totalVotes: number;
  endedAt: number;
}

/**
 * 学生加入/离开事件数据
 */
export interface StudentActivityData {
  studentId: string;
  studentName: string;
  timestamp: number;
  totalStudents: number;
}

/**
 * 连接建立事件数据
 */
export interface ConnectionEstablishedData {
  connectionId: string;
  classroomId: string;
  timestamp: number;
}

/**
 * 心跳事件数据
 */
export interface HeartbeatData {
  timestamp: number;
  connectionCount: number;
}

/**
 * SSE事件数据联合类型
 */
export type SSEEventData =
  | VoteStartedData
  | VoteUpdateData
  | VoteEndedData
  | StudentActivityData
  | ConnectionEstablishedData
  | HeartbeatData;

/**
 * 具体的SSE消息类型
 */
export interface VoteStartedMessage extends SSEMessage {
  type: SSEEventType.VOTE_STARTED;
  data: VoteStartedData;
}

export interface VoteUpdateMessage extends SSEMessage {
  type: SSEEventType.VOTE_UPDATE;
  data: VoteUpdateData;
}

export interface VoteEndedMessage extends SSEMessage {
  type: SSEEventType.VOTE_ENDED;
  data: VoteEndedData;
}

export interface StudentJoinedMessage extends SSEMessage {
  type: SSEEventType.STUDENT_JOINED;
  data: StudentActivityData;
}

export interface StudentLeftMessage extends SSEMessage {
  type: SSEEventType.STUDENT_LEFT;
  data: StudentActivityData;
}

/**
 * SSE连接配置
 */
export interface SSEConnectionConfig {
  classroomId: string;
  studentId?: string;
  reconnectInterval?: number; // 重连间隔（毫秒）
  maxReconnectAttempts?: number; // 最大重连次数
  heartbeatInterval?: number; // 心跳间隔（毫秒）
}

/**
 * SSE连接状态
 */
export enum SSEConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

/**
 * SSE连接状态信息
 */
export interface SSEConnectionState {
  status: SSEConnectionStatus;
  connectionId?: string;
  lastConnected?: number;
  reconnectAttempts: number;
  error?: string;
}