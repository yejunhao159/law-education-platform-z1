/**
 * 投票广播器
 * @description 负责投票相关事件的SSE广播
 */

import { SSEConnectionManager } from './connection-manager';
import {
  SSEMessage,
  SSEEventType,
  VoteStartedData,
  VoteUpdateData,
  VoteEndedData,
  StudentActivityData
} from './types';

import type {
  VoteSession as DomainVoteSession,
  VoteOption as DomainVoteOption
} from '../../../src/domains/teaching-acts/services/types/ClassroomTypes';

/**
 * 投票广播器类
 */
export class VoteBroadcaster {
  private connectionManager: SSEConnectionManager;

  constructor() {
    this.connectionManager = SSEConnectionManager.getInstance();
  }

  /**
   * 广播投票开始事件
   */
  broadcastVoteStarted(classroomId: string, voteSession: DomainVoteSession): number {
    const message: SSEMessage = {
      type: SSEEventType.VOTE_STARTED,
      timestamp: Date.now(),
      classroomId,
      data: {
        voteId: voteSession.id,
        question: voteSession.question,
        options: voteSession.options.map(opt => ({
          id: opt.id,
          text: opt.text
        })),
        duration: voteSession.endsAt ?
          Math.floor((voteSession.endsAt - Date.now()) / 1000) : undefined,
        startedAt: voteSession.createdAt
      } as VoteStartedData
    };

    const sentCount = this.connectionManager.broadcast(classroomId, message);
    console.log(`投票开始事件已广播到${sentCount}个连接 - 课堂${classroomId}, 投票${voteSession.id}`);

    return sentCount;
  }

  /**
   * 广播投票更新事件
   */
  broadcastVoteUpdate(classroomId: string, voteSession: DomainVoteSession): number {
    const totalVotes = this.calculateTotalVotes(voteSession.options);

    const message: SSEMessage = {
      type: SSEEventType.VOTE_UPDATE,
      timestamp: Date.now(),
      classroomId,
      data: {
        voteId: voteSession.id,
        results: voteSession.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          count: opt.voteCount,
          percentage: totalVotes > 0 ?
            Math.round((opt.voteCount / totalVotes) * 100) : 0
        })),
        totalVotes,
        lastUpdate: Date.now()
      } as VoteUpdateData
    };

    const sentCount = this.connectionManager.broadcast(classroomId, message);
    console.log(`投票更新事件已广播到${sentCount}个连接 - 课堂${classroomId}, 总票数${totalVotes}`);

    return sentCount;
  }

  /**
   * 广播投票结束事件
   */
  broadcastVoteEnded(classroomId: string, voteSession: DomainVoteSession): number {
    const totalVotes = this.calculateTotalVotes(voteSession.options);

    const message: SSEMessage = {
      type: SSEEventType.VOTE_ENDED,
      timestamp: Date.now(),
      classroomId,
      data: {
        voteId: voteSession.id,
        finalResults: voteSession.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          count: opt.voteCount,
          percentage: totalVotes > 0 ?
            Math.round((opt.voteCount / totalVotes) * 100) : 0
        })),
        totalVotes,
        endedAt: voteSession.endsAt || Date.now()
      } as VoteEndedData
    };

    const sentCount = this.connectionManager.broadcast(classroomId, message);
    console.log(`投票结束事件已广播到${sentCount}个连接 - 课堂${classroomId}, 最终票数${totalVotes}`);

    return sentCount;
  }

  /**
   * 广播学生加入事件
   */
  broadcastStudentJoined(
    classroomId: string,
    studentId: string,
    studentName: string,
    totalStudents: number
  ): number {
    const message: SSEMessage = {
      type: SSEEventType.STUDENT_JOINED,
      timestamp: Date.now(),
      classroomId,
      data: {
        studentId,
        studentName,
        timestamp: Date.now(),
        totalStudents
      } as StudentActivityData
    };

    const sentCount = this.connectionManager.broadcast(classroomId, message);
    console.log(`学生加入事件已广播 - 课堂${classroomId}, 学生${studentName}(${studentId})`);

    return sentCount;
  }

  /**
   * 广播学生离开事件
   */
  broadcastStudentLeft(
    classroomId: string,
    studentId: string,
    studentName: string,
    totalStudents: number
  ): number {
    const message: SSEMessage = {
      type: SSEEventType.STUDENT_LEFT,
      timestamp: Date.now(),
      classroomId,
      data: {
        studentId,
        studentName,
        timestamp: Date.now(),
        totalStudents
      } as StudentActivityData
    };

    const sentCount = this.connectionManager.broadcast(classroomId, message);
    console.log(`学生离开事件已广播 - 课堂${classroomId}, 学生${studentName}(${studentId})`);

    return sentCount;
  }

  /**
   * 向特定学生发送消息
   */
  sendToStudent(classroomId: string, studentId: string, message: SSEMessage): boolean {
    const sent = this.connectionManager.sendToStudent(classroomId, studentId, message);

    if (sent) {
      console.log(`消息已发送给学生 - 课堂${classroomId}, 学生${studentId}, 类型${message.type}`);
    } else {
      console.warn(`发送失败 - 课堂${classroomId}, 学生${studentId}未连接或连接已断开`);
    }

    return sent;
  }

  /**
   * 获取课堂连接统计
   */
  getClassroomStats(classroomId: string): {
    totalConnections: number;
    studentConnections: number;
    teacherConnections: number;
  } {
    return this.connectionManager.getClassroomStats(classroomId);
  }

  /**
   * 批量广播投票更新（优化性能）
   */
  batchBroadcastVoteUpdates(updates: Array<{
    classroomId: string;
    voteSession: DomainVoteSession;
  }>): Record<string, number> {
    const results: Record<string, number> = {};

    for (const { classroomId, voteSession } of updates) {
      results[classroomId] = this.broadcastVoteUpdate(classroomId, voteSession);
    }

    console.log(`批量广播完成，涉及${updates.length}个课堂`);
    return results;
  }

  /**
   * 计算总投票数
   */
  private calculateTotalVotes(options: DomainVoteOption[]): number {
    return options.reduce((total, opt) => total + opt.voteCount, 0);
  }

  /**
   * 验证投票会话数据
   */
  /*private validateVoteSession(voteSession: DomainVoteSession): boolean {
    if (!voteSession.id || !voteSession.question) {
      console.error('投票会话数据无效：缺少必要字段');
      return false;
    }

    if (!Array.isArray(voteSession.options) || voteSession.options.length === 0) {
      console.error('投票会话数据无效：选项列表为空');
      return false;
    }

    // 验证选项格式
    for (const option of voteSession.options) {
      if (!option.id || !option.text || typeof option.voteCount !== 'number') {
        console.error('投票选项数据无效：', option);
        return false;
      }
    }

    return true;
  }*/

  /**
   * 创建安全的投票会话副本（避免数据污染）
   */
  /*private createSafeVoteSessionCopy(voteSession: DomainVoteSession): DomainVoteSession {
    return {
      id: voteSession.id,
      question: voteSession.question,
      options: voteSession.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt.voteCount
      })),
      createdAt: voteSession.createdAt,
      endsAt: voteSession.endsAt,
      isActive: voteSession.isActive,
      participantVotes: { ...voteSession.participantVotes },
      maxOptions: voteSession.maxOptions
    };
  }*/
}