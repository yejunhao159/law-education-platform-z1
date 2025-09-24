/**
 * 重构后的课堂适配器
 * 职责：专门处理课堂功能（投票、学生交互等）
 * 使用SessionCoordinator进行会话协调
 * DeepPractice Standards Compliant
 */

import { sessionCoordinator, type CoordinatedSessionInfo } from './SessionCoordinator';
import type { ClassroomSession, StudentInfo, VoteData } from '@/lib/types/socratic';
import { createLogger } from '@/lib/utils/socratic-logger';

const logger = createLogger('ClassroomAdapter');

// ========== 适配器配置 ==========
export interface ClassroomAdapterConfig {
  /** 最大学生数量 */
  maxStudents?: number;
  /** 是否允许匿名加入 */
  allowAnonymous?: boolean;
  /** 自动同步间隔（毫秒） */
  syncInterval?: number;
}

// ========== 事件类型定义 ==========
export interface ClassroomAdapterEvents {
  /** 学生加入课堂 */
  studentJoined: (dialogueId: string, student: StudentInfo) => void;
  /** 学生离开课堂 */
  studentLeft: (dialogueId: string, studentId: string) => void;
  /** 投票开始 */
  voteStarted: (dialogueId: string, vote: VoteData) => void;
  /** 投票结束 */
  voteEnded: (dialogueId: string, voteId: string) => void;
  /** 状态同步完成 */
  stateSynced: (dialogueId: string) => void;
  /** 错误发生 */
  error: (error: Error, dialogueId?: string) => void;
}

// ========== 重构后的课堂适配器 ==========
export class ClassroomAdapter {
  private config: Required<ClassroomAdapterConfig>;
  private eventListeners: Partial<ClassroomAdapterEvents> = {};
  private syncTimer?: NodeJS.Timeout;
  private activeVotes: Map<string, VoteData> = new Map(); // dialogueId -> VoteData

  constructor(config: ClassroomAdapterConfig = {}) {
    this.config = {
      maxStudents: config.maxStudents || 50,
      allowAnonymous: config.allowAnonymous ?? true,
      syncInterval: config.syncInterval || 30000, // 30秒同步一次
    };

    this.startSyncTimer();
    logger.info('ClassroomAdapter 初始化完成', this.config);
  }

  // ========== 课堂会话管理 ==========

  /**
   * 创建课堂模式对话
   */
  async createClassroomDialogue(options: {
    title: string;
    caseInfo?: any;
    teacherId?: string;
  }): Promise<CoordinatedSessionInfo | null> {
    try {
      logger.info('开始创建课堂对话', { title: options.title });

      const coordinatedSession = await sessionCoordinator.createClassroomDialogue({
        title: options.title,
        caseInfo: options.caseInfo,
        teacherId: options.teacherId,
        maxStudents: this.config.maxStudents,
      });

      if (coordinatedSession) {
        logger.info('课堂对话创建成功', {
          dialogueId: coordinatedSession.dialogueSession.id,
          classroomCode: coordinatedSession.classroomSession?.code,
        });
      }

      return coordinatedSession;
    } catch (error) {
      logger.error('创建课堂对话失败:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'));
      return null;
    }
  }

  /**
   * 结束课堂对话
   */
  async endClassroomDialogue(dialogueId: string): Promise<boolean> {
    try {
      const success = await sessionCoordinator.endCoordinatedSession(dialogueId);

      if (success) {
        // 清理本地状态
        this.activeVotes.delete(dialogueId);
        logger.info('课堂对话结束成功', { dialogueId });
      }

      return success;
    } catch (error) {
      logger.error('结束课堂对话失败:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'), dialogueId);
      return false;
    }
  }

  /**
   * 获取课堂信息
   */
  getClassroomInfo(dialogueId: string): CoordinatedSessionInfo | null {
    return sessionCoordinator.getCoordinatedSession(dialogueId);
  }

  // ========== 学生管理 ==========

  /**
   * 添加学生到课堂
   */
  async addStudent(dialogueId: string, studentInfo: {
    displayName: string;
    avatar?: string;
  }): Promise<StudentInfo | null> {
    try {
      const student = await sessionCoordinator.addStudentToClassroom(dialogueId, studentInfo);

      if (student) {
        this.emit('studentJoined', dialogueId, student);
        logger.info('学生加入成功', {
          dialogueId,
          studentId: student.id,
          displayName: student.displayName,
        });
      }

      return student;
    } catch (error) {
      logger.error('添加学生失败:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'), dialogueId);
      return null;
    }
  }

  /**
   * 移除学生
   */
  async removeStudent(dialogueId: string, studentId: string): Promise<boolean> {
    try {
      const success = await sessionCoordinator.removeStudentFromClassroom(dialogueId, studentId);

      if (success) {
        this.emit('studentLeft', dialogueId, studentId);
        logger.info('学生离开成功', { dialogueId, studentId });
      }

      return success;
    } catch (error) {
      logger.error('移除学生失败:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'), dialogueId);
      return false;
    }
  }

  /**
   * 获取课堂学生列表
   */
  getStudents(dialogueId: string): StudentInfo[] {
    const classroomInfo = this.getClassroomInfo(dialogueId);
    return classroomInfo?.participants || [];
  }

  // ========== 投票系统 ==========

  /**
   * 开始投票
   */
  async startVote(dialogueId: string, voteOptions: {
    question: string;
    choices: Array<{ text: string }>;
    duration?: number;
  }): Promise<VoteData | null> {
    try {
      const vote: VoteData = {
        id: crypto.randomUUID(),
        question: voteOptions.question,
        choices: voteOptions.choices.map((choice, index) => ({
          id: `choice-${index}`,
          text: choice.text,
          count: 0,
        })),
        votedStudents: new Set(),
        createdAt: Date.now(),
        endsAt: voteOptions.duration ? Date.now() + voteOptions.duration : undefined,
        isEnded: false,
      };

      // 存储投票状态
      this.activeVotes.set(dialogueId, vote);

      // 如果有结束时间，设置自动结束
      if (vote.endsAt) {
        setTimeout(() => {
          this.endVote(dialogueId);
        }, voteOptions.duration);
      }

      this.emit('voteStarted', dialogueId, vote);
      logger.info('投票开始', { dialogueId, voteId: vote.id, question: vote.question });

      return vote;
    } catch (error) {
      logger.error('开始投票失败:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'), dialogueId);
      return null;
    }
  }

  /**
   * 结束投票
   */
  async endVote(dialogueId: string): Promise<VoteData | null> {
    try {
      const vote = this.activeVotes.get(dialogueId);
      if (!vote || vote.isEnded) return null;

      vote.isEnded = true;
      this.activeVotes.set(dialogueId, vote);

      this.emit('voteEnded', dialogueId, vote.id);
      logger.info('投票结束', { dialogueId, voteId: vote.id });

      return vote;
    } catch (error) {
      logger.error('结束投票失败:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'), dialogueId);
      return null;
    }
  }

  /**
   * 学生投票
   */
  async submitVote(dialogueId: string, studentId: string, choiceId: string): Promise<boolean> {
    try {
      const vote = this.activeVotes.get(dialogueId);
      if (!vote || vote.isEnded) return false;

      // 检查是否已投票
      if (vote.votedStudents.has(studentId)) return false;

      // 查找选项
      const choice = vote.choices.find(c => c.id === choiceId);
      if (!choice) return false;

      // 记录投票
      choice.count++;
      vote.votedStudents.add(studentId);

      // 更新投票状态
      this.activeVotes.set(dialogueId, vote);

      logger.info('学生投票成功', { dialogueId, studentId, choiceId });
      return true;
    } catch (error) {
      logger.error('学生投票失败:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'), dialogueId);
      return false;
    }
  }

  /**
   * 获取当前投票
   */
  getCurrentVote(dialogueId: string): VoteData | null {
    return this.activeVotes.get(dialogueId) || null;
  }

  // ========== 状态同步 ==========

  /**
   * 同步对话和课堂状态
   */
  async syncStates(dialogueId: string): Promise<boolean> {
    try {
      const success = await sessionCoordinator.syncSessions(dialogueId);

      if (success) {
        this.emit('stateSynced', dialogueId);
      }

      return success;
    } catch (error) {
      logger.error('状态同步失败:', error);
      this.emit('error', error instanceof Error ? error : new Error('Unknown error'), dialogueId);
      return false;
    }
  }

  // ========== 事件管理 ==========

  /**
   * 注册事件监听器
   */
  on<K extends keyof ClassroomAdapterEvents>(
    event: K,
    listener: ClassroomAdapterEvents[K]
  ): void {
    this.eventListeners[event] = listener;
  }

  /**
   * 移除事件监听器
   */
  off<K extends keyof ClassroomAdapterEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof ClassroomAdapterEvents>(
    event: K,
    ...args: Parameters<ClassroomAdapterEvents[K]>
  ): void {
    const listener = this.eventListeners[event];
    if (listener) {
      try {
        (listener as any)(...args);
      } catch (error) {
        logger.error('事件监听器执行失败:', error);
      }
    }
  }

  // ========== 清理和维护 ==========

  /**
   * 启动定时同步
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      this.performPeriodicSync();
    }, this.config.syncInterval);
  }

  /**
   * 执行周期性同步
   */
  private async performPeriodicSync(): Promise<void> {
    const stats = sessionCoordinator.getCoordinatorStats();

    // 清理过期的协调关系
    sessionCoordinator.cleanupExpiredCoordinations();

    logger.debug('周期性同步完成', {
      totalCoordinations: stats.coordinations.total,
      activeSessions: stats.dialogue.activeSessions,
    });
  }

  /**
   * 获取适配器统计信息
   */
  getStats() {
    const coordinatorStats = sessionCoordinator.getCoordinatorStats();

    return {
      ...coordinatorStats,
      adapter: {
        activeVotes: this.activeVotes.size,
        config: this.config,
      },
    };
  }

  /**
   * 关闭适配器
   */
  shutdown(): void {
    // 清理定时器
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }

    // 清理状态
    this.activeVotes.clear();
    this.eventListeners = {};

    logger.info('ClassroomAdapter 已关闭');
  }
}

// ========== 单例实例 ==========
export const classroomAdapter = new ClassroomAdapter();