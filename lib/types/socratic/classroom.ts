/**
 * 苏格拉底课堂管理适配器层
 * @module types/socratic/classroom
 * @description 前端友好的类型定义，适配Domain层数据结构
 */

import { DialogueLevel } from './dialogue';
import type {
  ClassroomSession as DomainClassroomSession,
  StudentInfo as DomainStudentInfo,
  VoteSession as DomainVoteSession,
  VoteOption as DomainVoteOption
} from '../../../src/domains/teaching-acts/services/types/ClassroomTypes';

// ============== 前端适配枚举 ==============

/**
 * 会话模式枚举（兼容性保持）
 */
export enum SessionMode {
  CLASSROOM = 'classroom',  // 课堂模式
  DEMO = 'demo'            // 演示模式
}

// ============== 前端友好接口 ==============

/**
 * 学生信息接口（前端适配）
 */
export interface StudentInfo {
  /** 临时学生ID */
  id: string;
  /** 显示名称 */
  displayName: string;
  /** 加入时间 */
  joinedAt: number;
  /** 是否举手 */
  handRaised?: boolean;
  /** 举手时间 */
  handRaisedAt?: number;
  /** 是否在线 */
  isOnline: boolean;
  /** 最后活动时间 */
  lastActiveAt: number;
}

/**
 * 投票选项接口（前端适配）
 */
export interface VoteChoice {
  /** 选项ID (A, B, C, D, E) */
  id: string;
  /** 选项文本 */
  text: string;
  /** 投票数 */
  count: number;
  /** 投票百分比 */
  percentage?: number;
}

/**
 * 投票数据接口（前端适配）
 */
export interface VoteData {
  /** 投票ID */
  id: string;
  /** 问题 */
  question: string;
  /** 选项列表 */
  choices: VoteChoice[];
  /** 已投票的学生ID列表 */
  votedStudents: string[];
  /** 投票创建时间 */
  createdAt: number;
  /** 投票结束时间 */
  endsAt?: number;
  /** 是否已结束 */
  isEnded: boolean;
  /** 总投票数 */
  totalVotes: number;
}

/**
 * 课堂会话接口（前端适配）
 */
export interface ClassroomSession {
  /** 6位数字课堂码（从Domain ID提取） */
  code: string;
  /** 原始Domain ID（内部使用） */
  id: string;
  /** 课堂名称 */
  name: string;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间（6小时后） */
  expiresAt: number;
  /** 教师ID */
  teacherId?: string;
  /** 学生列表（适配为数组） */
  students: StudentInfo[];
  /** 当前问题 */
  currentQuestion?: string;
  /** 当前投票 */
  currentVote?: VoteData;
  /** 会话状态（适配枚举） */
  status: 'waiting' | 'active' | 'ended';
  /** 案例ID */
  caseId?: string;
  /** 统计信息 */
  statistics?: {
    /** 总参与人数 */
    totalParticipants: number;
    /** 活跃人数 */
    activeParticipants: number;
    /** 平均理解度 */
    avgUnderstanding: number;
    /** 各层级时长 */
    levelDurations: Record<DialogueLevel, number>;
  };
}

// ============== 常量定义 ==============

/**
 * 会话过期时间（6小时）
 */
export const SESSION_EXPIRY_TIME = 6 * 60 * 60 * 1000;

/**
 * 课堂码长度
 */
export const CLASSROOM_CODE_LENGTH = 6;

// ============== 适配器函数导出 ==============

export {
  adaptClassroomSession,
  adaptStudentInfo,
  adaptVoteSession,
  extractClassroomCode,
  createABCDEOptions,
  isValidVoteOptionId
} from './adapters';