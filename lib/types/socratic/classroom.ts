/**
 * 苏格拉底课堂管理相关类型定义
 * @module types/socratic/classroom
 * @description 课堂码、学生管理、投票系统等相关类型
 */

import { DialogueLevel } from './dialogue';

// ============== 课堂管理枚举 ==============

/**
 * 会话模式枚举
 */
export enum SessionMode {
  CLASSROOM = 'classroom',  // 课堂模式
  DEMO = 'demo'            // 演示模式
}

// ============== 课堂相关接口 ==============

/**
 * 学生信息接口
 */
export interface StudentInfo {
  /** 临时学生ID */
  id: string;
  /** 显示名称（随机生成或自定义） */
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
 * 投票选项接口
 */
export interface VoteChoice {
  /** 选项ID */
  id: string;
  /** 选项文本 */
  text: string;
  /** 投票数 */
  count: number;
}

/**
 * 投票数据接口
 */
export interface VoteData {
  /** 投票ID */
  id: string;
  /** 问题 */
  question: string;
  /** 选项列表 */
  choices: VoteChoice[];
  /** 已投票的学生ID */
  votedStudents: Set<string>;
  /** 投票创建时间 */
  createdAt: number;
  /** 投票结束时间 */
  endsAt?: number;
  /** 是否已结束 */
  isEnded: boolean;
}

/**
 * 课堂会话接口
 */
export interface ClassroomSession {
  /** 6位数字课堂码 */
  code: string;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间（6小时后） */
  expiresAt: number;
  /** 教师ID（可选） */
  teacherId?: string;
  /** 学生Map */
  students: Map<string, StudentInfo>;
  /** 当前问题 */
  currentQuestion?: string;
  /** 当前投票 */
  currentVote?: VoteData;
  /** 会话状态 */
  status: 'waiting' | 'active' | 'ended';
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