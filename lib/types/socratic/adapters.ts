/**
 * 苏格拉底课堂管理适配器实现
 * @module types/socratic/adapters
 * @description Domain层到前端层的数据适配器函数
 */

import type {
  ClassroomSession as DomainClassroomSession,
  StudentInfo as DomainStudentInfo,
  VoteSession as DomainVoteSession,
  VoteOption as DomainVoteOption
} from '../../../src/domains/teaching-acts/services/types/ClassroomTypes';

import type {
  ClassroomSession,
  StudentInfo,
  VoteData,
  VoteChoice
} from './classroom';

import { SESSION_EXPIRY_TIME, CLASSROOM_CODE_LENGTH } from './classroom';

/**
 * 从Domain ClassroomSession适配到前端ClassroomSession
 */
export function adaptClassroomSession(domain: DomainClassroomSession): ClassroomSession {
  // 从UUID ID提取6位课堂码
  const code = extractClassroomCode(domain.id);

  // 计算过期时间（创建时间 + 6小时）
  const expiresAt = (domain.startedAt || Date.now()) + SESSION_EXPIRY_TIME;

  // 适配学生列表（从Domain的participants适配）
  const students = domain.participants.map(adaptStudentInfo);

  // 适配状态枚举
  const status = adaptSessionStatus(domain.status);

  // 适配投票数据
  const currentVote = domain.currentVote ? adaptVoteSession(domain.currentVote) : undefined;

  return {
    code,
    id: domain.id,
    name: domain.name,
    createdAt: domain.startedAt || Date.now(),
    expiresAt,
    teacherId: extractTeacherIdFromClassroomId(domain.classroomId),
    students,
    currentQuestion: undefined, // Domain层暂无此字段
    currentVote,
    status,
    caseId: domain.caseId,
    statistics: {
      totalParticipants: domain.participants.length,
      activeParticipants: domain.participants.filter((s: any) => s.status === 'active').length,
      avgUnderstanding: 75, // 默认值，待扩展
      levelDurations: {} as any // 待扩展
    }
  };
}

/**
 * 从Domain StudentInfo适配到前端StudentInfo
 */
export function adaptStudentInfo(domain: DomainStudentInfo): StudentInfo {
  return {
    id: domain.id,
    displayName: domain.name,
    joinedAt: domain.joinedAt,
    handRaised: false, // Domain层暂无此字段，默认false
    handRaisedAt: undefined,
    isOnline: domain.status === 'active',
    lastActiveAt: domain.joinedAt // 使用joinedAt作为默认值
  };
}

/**
 * 从Domain VoteSession适配到前端VoteData
 */
export function adaptVoteSession(domain: DomainVoteSession): VoteData {
  // 适配选项列表，计算百分比
  const totalVotes = domain.options.reduce((sum: number, opt: any) => sum + opt.voteCount, 0);
  const choices: VoteChoice[] = domain.options.map((opt: any) => ({
    id: opt.id,
    text: opt.text,
    count: opt.voteCount,
    percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0
  }));

  // 从Record转换为数组
  const votedStudents = Object.keys(domain.participantVotes);

  return {
    id: domain.id,
    question: domain.question,
    choices,
    votedStudents,
    createdAt: domain.createdAt,
    endsAt: domain.endsAt,
    isEnded: !domain.isActive,
    totalVotes
  };
}

/**
 * 提取6位课堂码的工具函数
 * @description 从UUID格式的Domain ID中提取或生成6位数字码
 */
export function extractClassroomCode(domainId: string): string {
  // 简单实现：从UUID中提取数字并截取前6位
  const digits = domainId.replace(/[^0-9]/g, '');

  if (digits.length >= CLASSROOM_CODE_LENGTH) {
    return digits.substring(0, CLASSROOM_CODE_LENGTH);
  }

  // 如果数字不够，用哈希方式生成
  let hash = 0;
  for (let i = 0; i < domainId.length; i++) {
    const char = domainId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // 确保是正数并转换为6位数字
  const code = Math.abs(hash).toString().padStart(CLASSROOM_CODE_LENGTH, '0');
  return code.substring(0, CLASSROOM_CODE_LENGTH);
}

/**
 * 适配会话状态枚举
 */
function adaptSessionStatus(domainStatus: DomainClassroomSession['status']): 'waiting' | 'active' | 'ended' {
  switch (domainStatus) {
    case 'preparing':
      return 'waiting';
    case 'active':
      return 'active';
    case 'paused':
      return 'active'; // 暂停状态映射为活跃
    case 'completed':
      return 'ended';
    default:
      return 'waiting';
  }
}

/**
 * 从classroom ID提取teacher ID的辅助函数
 * @description 简化实现，实际项目中应该从数据库查询
 */
function extractTeacherIdFromClassroomId(classroomId: string): string {
  // 简化实现：假设classroom ID包含teacher信息
  // 实际应该通过数据库查询获取
  return `teacher-${classroomId.substring(0, 8)}`;
}

// ============== ABCDE投票辅助函数 ==============

/**
 * 创建ABCDE格式的投票选项
 */
export function createABCDEOptions(options: string[]): DomainVoteOption[] {
  const letters = ['A', 'B', 'C', 'D', 'E'];

  return options.slice(0, 5).map((text, index) => ({
    id: letters[index],
    text: text.trim(),
    voteCount: 0
  }));
}

/**
 * 验证投票选项ID是否有效
 */
export function isValidVoteOptionId(optionId: string): boolean {
  return ['A', 'B', 'C', 'D', 'E'].includes(optionId.toUpperCase());
}