/**
 * 课堂适配器 - SessionManager与useSocraticStore的集成桥梁
 * DeepPractice Standards Compliant
 */

import { SessionManager, type SessionCreateOptions, type StudentJoinOptions } from '@/lib/services/session/session-manager';
import type { ClassroomSession, StudentInfo, VoteData } from '@/lib/types/socratic';
import type { DialogueSession, Message, TeachingLevel, DialogueContext } from '@/src/types';
import { createLogger } from '@/lib/utils/socratic-logger';

const logger = createLogger('ClassroomAdapter');

// ========== 适配器配置 ==========
export interface ClassroomAdapterConfig {
  /** 会话默认过期时间（毫秒） */
  defaultExpiryTime?: number;
  /** 最大学生数量 */
  maxStudents?: number;
  /** 是否允许匿名加入 */
  allowAnonymous?: boolean;
  /** 自动清理间隔（毫秒） */
  cleanupInterval?: number;
}

// ========== 映射关系接口 ==========
export interface SessionMapping {
  /** DialogueSession UUID */
  dialogueId: string;
  /** 课堂码 */
  classroomCode: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后同步时间 */
  lastSyncAt: number;
  /** 同步状态 */
  syncStatus: 'active' | 'syncing' | 'error';
}

// ========== 事件类型定义 ==========
export interface ClassroomAdapterEvents {
  /** 课堂会话创建 */
  classroomCreated: (mapping: SessionMapping, classroomSession: ClassroomSession) => void;
  /** 学生加入课堂 */
  studentJoined: (classroomCode: string, student: StudentInfo) => void;
  /** 学生离开课堂 */
  studentLeft: (classroomCode: string, studentId: string) => void;
  /** 投票开始 */
  voteStarted: (classroomCode: string, vote: VoteData) => void;
  /** 投票结束 */
  voteEnded: (classroomCode: string, voteId: string) => void;
  /** 状态同步完成 */
  stateSynced: (mapping: SessionMapping) => void;
  /** 课堂会话结束 */
  classroomEnded: (classroomCode: string, dialogueId: string) => void;
  /** 错误发生 */
  error: (error: Error, context?: any) => void;
}

// ========== 课堂适配器类 ==========
export class ClassroomAdapter {
  private sessionManager: SessionManager;
  private sessionMappings: Map<string, SessionMapping> = new Map(); // UUID -> Mapping
  private codeMappings: Map<string, string> = new Map(); // 课堂码 -> UUID
  private eventListeners: Partial<ClassroomAdapterEvents> = {};
  private config: Required<ClassroomAdapterConfig>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: ClassroomAdapterConfig = {}) {
    this.config = {
      defaultExpiryTime: config.defaultExpiryTime || 2 * 60 * 60 * 1000, // 2小时
      maxStudents: config.maxStudents || 50,
      allowAnonymous: config.allowAnonymous ?? true,
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000, // 5分钟
    };

    this.sessionManager = new SessionManager({
      maxSessions: 100,
      cleanupIntervalMs: this.config.cleanupInterval,
    });

    this.startCleanupTimer();
    logger.info('ClassroomAdapter 初始化完成', this.config);
  }

  // ========== 核心集成方法 ==========

  /**
   * 创建课堂会话并建立映射关系
   */
  async createClassroomSession(
    dialogueSession: DialogueSession,
    options: Partial<SessionCreateOptions> = {}
  ): Promise<{ mapping: SessionMapping; classroomSession: ClassroomSession }> {
    try {
      logger.info('开始创建课堂会话', { dialogueId: dialogueSession.id });

      // 创建SessionManager会话
      const sessionOptions: SessionCreateOptions = {
        teacherId: `teacher-${Date.now()}`,
        sessionName: dialogueSession.title,
        customExpiryTime: this.config.defaultExpiryTime,
        maxStudents: this.config.maxStudents,
        allowAnonymous: this.config.allowAnonymous,
        ...options,
      };

      const result = this.sessionManager.createSession(sessionOptions);

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '创建课堂会话失败');
      }

      const classroomSession = result.data;

      // 创建映射关系
      const mapping: SessionMapping = {
        dialogueId: dialogueSession.id,
        classroomCode: classroomSession.code,
        createdAt: Date.now(),
        lastSyncAt: Date.now(),
        syncStatus: 'active',
      };

      // 存储映射
      this.sessionMappings.set(dialogueSession.id, mapping);
      this.codeMappings.set(classroomSession.code, dialogueSession.id);

      // 触发事件
      this.emit('classroomCreated', mapping, classroomSession);

      logger.info('课堂会话创建成功', {
        dialogueId: dialogueSession.id,
        classroomCode: classroomSession.code,
      });

      return { mapping, classroomSession };
    } catch (error) {
      logger.error('创建课堂会话失败', error);
      this.emit('error', error as Error, { dialogueSession });
      throw error;
    }
  }

  /**
   * 根据对话会话ID获取课堂信息
   */
  getClassroomByDialogueId(dialogueId: string): ClassroomSession | null {
    const mapping = this.sessionMappings.get(dialogueId);
    if (!mapping) {
      return null;
    }

    const result = this.sessionManager.getSessionByCode(mapping.classroomCode);
    return result.success ? result.data || null : null;
  }

  /**
   * 根据课堂码获取对话会话ID
   */
  getDialogueIdByClassroomCode(classroomCode: string): string | null {
    return this.codeMappings.get(classroomCode) || null;
  }

  /**
   * 获取映射关系
   */
  getSessionMapping(dialogueId: string): SessionMapping | null {
    return this.sessionMappings.get(dialogueId) || null;
  }

  // ========== 学生管理 ==========

  /**
   * 学生加入课堂
   */
  async addStudentToClassroom(
    dialogueId: string,
    studentId: string,
    options: StudentJoinOptions
  ): Promise<StudentInfo | null> {
    try {
      const mapping = this.sessionMappings.get(dialogueId);
      if (!mapping) {
        throw new Error('找不到对应的课堂会话');
      }

      const result = this.sessionManager.addStudentToSession(
        mapping.classroomCode,
        studentId,
        options
      );

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '学生加入失败');
      }

      const student = result.data;

      // 更新同步时间
      mapping.lastSyncAt = Date.now();

      // 触发事件
      this.emit('studentJoined', mapping.classroomCode, student);

      logger.info('学生加入课堂成功', {
        dialogueId,
        studentId,
        classroomCode: mapping.classroomCode,
      });

      return student;
    } catch (error) {
      logger.error('学生加入课堂失败', error);
      this.emit('error', error as Error, { dialogueId, studentId });
      return null;
    }
  }

  /**
   * 学生离开课堂
   */
  async removeStudentFromClassroom(dialogueId: string, studentId: string): Promise<boolean> {
    try {
      const mapping = this.sessionMappings.get(dialogueId);
      if (!mapping) {
        throw new Error('找不到对应的课堂会话');
      }

      const result = this.sessionManager.removeStudentFromSession(
        mapping.classroomCode,
        studentId
      );

      if (!result.success) {
        throw new Error(result.error?.message || '学生离开失败');
      }

      // 更新同步时间
      mapping.lastSyncAt = Date.now();

      // 触发事件
      this.emit('studentLeft', mapping.classroomCode, studentId);

      logger.info('学生离开课堂成功', {
        dialogueId,
        studentId,
        classroomCode: mapping.classroomCode,
      });

      return true;
    } catch (error) {
      logger.error('学生离开课堂失败', error);
      this.emit('error', error as Error, { dialogueId, studentId });
      return false;
    }
  }

  /**
   * 获取课堂学生列表
   */
  getClassroomStudents(dialogueId: string): StudentInfo[] {
    const classroom = this.getClassroomByDialogueId(dialogueId);
    return classroom ? Array.from(classroom.students.values()) : [];
  }

  // ========== 投票管理 ==========

  /**
   * 设置当前投票
   */
  async setCurrentVote(dialogueId: string, voteData: VoteData): Promise<boolean> {
    try {
      const mapping = this.sessionMappings.get(dialogueId);
      if (!mapping) {
        throw new Error('找不到对应的课堂会话');
      }

      const result = this.sessionManager.setCurrentVote(mapping.classroomCode, voteData);

      if (!result.success) {
        throw new Error(result.error?.message || '设置投票失败');
      }

      // 更新同步时间
      mapping.lastSyncAt = Date.now();

      // 触发事件
      this.emit('voteStarted', mapping.classroomCode, voteData);

      logger.info('投票设置成功', {
        dialogueId,
        voteId: voteData.id,
        classroomCode: mapping.classroomCode,
      });

      return true;
    } catch (error) {
      logger.error('设置投票失败', error);
      this.emit('error', error as Error, { dialogueId, voteData });
      return false;
    }
  }

  /**
   * 结束当前投票
   */
  async endCurrentVote(dialogueId: string): Promise<boolean> {
    try {
      const mapping = this.sessionMappings.get(dialogueId);
      const classroom = this.getClassroomByDialogueId(dialogueId);

      if (!mapping || !classroom || !classroom.currentVote) {
        return false;
      }

      const voteId = classroom.currentVote.id;

      // 清除当前投票
      const result = this.sessionManager.setCurrentVote(mapping.classroomCode, null as any);

      if (result.success) {
        mapping.lastSyncAt = Date.now();
        this.emit('voteEnded', mapping.classroomCode, voteId);

        logger.info('投票结束成功', {
          dialogueId,
          voteId,
          classroomCode: mapping.classroomCode,
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('结束投票失败', error);
      this.emit('error', error as Error, { dialogueId });
      return false;
    }
  }

  // ========== 状态同步 ==========

  /**
   * 同步对话会话状态到课堂
   */
  syncDialogueToClassroom(dialogueSession: DialogueSession): boolean {
    try {
      const mapping = this.sessionMappings.get(dialogueSession.id);
      if (!mapping) {
        return false;
      }

      // 更新课堂问题
      if (dialogueSession.context.currentQuestion) {
        this.sessionManager.setCurrentQuestion(
          mapping.classroomCode,
          dialogueSession.context.currentQuestion
        );
      }

      // 更新同步状态
      mapping.lastSyncAt = Date.now();
      mapping.syncStatus = 'active';

      this.emit('stateSynced', mapping);

      return true;
    } catch (error) {
      logger.error('同步对话状态到课堂失败', error);
      return false;
    }
  }

  /**
   * 从课堂同步状态到对话会话
   */
  syncClassroomToDialogue(dialogueId: string): Partial<DialogueSession> | null {
    try {
      const mapping = this.sessionMappings.get(dialogueId);
      if (!mapping) {
        return null;
      }

      const classroom = this.getClassroomByDialogueId(dialogueId);
      if (!classroom) {
        return null;
      }

      // 构建需要同步的状态
      const syncData: Partial<DialogueSession> = {
        participants: Array.from(classroom.students.values()),
        updatedAt: new Date().toISOString(),
      };

      // 更新同步时间
      mapping.lastSyncAt = Date.now();

      return syncData;
    } catch (error) {
      logger.error('从课堂同步状态失败', error);
      return null;
    }
  }

  // ========== 生命周期管理 ==========

  /**
   * 结束课堂会话
   */
  async endClassroomSession(dialogueId: string): Promise<boolean> {
    try {
      const mapping = this.sessionMappings.get(dialogueId);
      if (!mapping) {
        return false;
      }

      // 更新会话状态为结束
      const result = this.sessionManager.updateSessionStatus(mapping.classroomCode, 'ended');

      if (result.success) {
        // 清理映射关系
        this.sessionMappings.delete(dialogueId);
        this.codeMappings.delete(mapping.classroomCode);

        // 触发事件
        this.emit('classroomEnded', mapping.classroomCode, dialogueId);

        logger.info('课堂会话结束', {
          dialogueId,
          classroomCode: mapping.classroomCode,
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('结束课堂会话失败', error);
      this.emit('error', error as Error, { dialogueId });
      return false;
    }
  }

  /**
   * 获取所有活跃的映射关系
   */
  getActiveMappings(): SessionMapping[] {
    return Array.from(this.sessionMappings.values()).filter(
      (mapping) => mapping.syncStatus === 'active'
    );
  }

  /**
   * 获取适配器统计信息
   */
  getAdapterStats(): {
    totalMappings: number;
    activeMappings: number;
    sessionManagerStats: any;
  } {
    const sessionManagerStats = this.sessionManager.getSessionStats();

    return {
      totalMappings: this.sessionMappings.size,
      activeMappings: this.getActiveMappings().length,
      sessionManagerStats,
    };
  }

  // ========== 事件系统 ==========

  /**
   * 添加事件监听器
   */
  on<K extends keyof ClassroomAdapterEvents>(
    event: K,
    listener: ClassroomAdapterEvents[K]
  ): void {
    this.eventListeners[event] = listener as any;
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
    ...args: Parameters<NonNullable<ClassroomAdapterEvents[K]>>
  ): void {
    const listener = this.eventListeners[event];
    if (listener) {
      (listener as any)(...args);
    }
  }

  // ========== 清理和维护 ==========

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 执行清理操作
   */
  private performCleanup(): void {
    const now = Date.now();
    const expiredMappings: string[] = [];

    // 检查过期的映射
    for (const [dialogueId, mapping] of this.sessionMappings.entries()) {
      const classroom = this.getClassroomByDialogueId(dialogueId);
      if (!classroom || now > classroom.expiresAt) {
        expiredMappings.push(dialogueId);
      }
    }

    // 清理过期映射
    for (const dialogueId of expiredMappings) {
      const mapping = this.sessionMappings.get(dialogueId);
      if (mapping) {
        this.sessionMappings.delete(dialogueId);
        this.codeMappings.delete(mapping.classroomCode);
        logger.info('清理过期映射', { dialogueId, classroomCode: mapping.classroomCode });
      }
    }

    // 执行SessionManager清理
    this.sessionManager.cleanupExpiredSessions();
  }

  /**
   * 停止适配器
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.sessionManager.stop();
    this.sessionMappings.clear();
    this.codeMappings.clear();
    this.eventListeners = {};

    logger.info('ClassroomAdapter 已停止');
  }
}

/**
 * 全局适配器实例
 */
export const classroomAdapter = new ClassroomAdapter();

/**
 * 便捷的Hook接口
 */
export function useClassroomAdapter() {
  return classroomAdapter;
}