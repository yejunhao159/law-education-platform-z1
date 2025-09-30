/**
 * 会话协调器
 * 职责：协调DialogueSessionManager和ClassroomSessionManager
 * 提供统一的会话管理接口
 * DeepPractice Standards Compliant
 */

import { dialogueSessionManager, DialogueSessionManager, type DialogueSession } from './DialogueSessionManager';
import { SessionManager as ClassroomSessionManager } from '@/lib/services/session/session-manager';
import type { ClassroomSession, StudentInfo } from '@/src/domains/socratic-dialogue/types';

// ========== 协调器接口 ==========
export interface SessionCoordination {
  dialogueId: string;
  classroomCode?: string;
  relationshipType: 'solo' | 'classroom' | 'demo';
  createdAt: number;
  lastSyncAt: number;
}

export interface CoordinatedSessionInfo {
  dialogueSession: DialogueSession;
  classroomSession?: ClassroomSession;
  coordination: SessionCoordination;
  participants: StudentInfo[];
}

// ========== 会话协调器 ==========
export class SessionCoordinator {
  private dialogueManager: DialogueSessionManager;
  private classroomManager: ClassroomSessionManager;
  private coordinations: Map<string, SessionCoordination> = new Map();

  constructor() {
    this.dialogueManager = dialogueSessionManager;
    this.classroomManager = new ClassroomSessionManager({
      maxSessions: 50,
      defaultExpiryTime: 6 * 60 * 60 * 1000, // 6小时
      enableCleanup: true,
      cleanupInterval: 30 * 60 * 1000, // 30分钟清理一次
    });
  }

  // ========== 会话创建和管理 ==========

  /**
   * 创建独立的对话会话
   */
  createSoloDialogue(options: {
    title: string;
    caseInfo?: any;
  }): DialogueSession {
    const dialogueSession = this.dialogueManager.createSession({
      title: options.title,
      caseInfo: options.caseInfo,
    });

    // 记录协调关系
    const coordination: SessionCoordination = {
      dialogueId: dialogueSession.id,
      relationshipType: 'solo',
      createdAt: Date.now(),
      lastSyncAt: Date.now(),
    };

    this.coordinations.set(dialogueSession.id, coordination);
    return dialogueSession;
  }

  /**
   * 创建课堂模式的对话会话
   */
  async createClassroomDialogue(options: {
    title: string;
    caseInfo?: any;
    teacherId?: string;
    maxStudents?: number;
  }): Promise<CoordinatedSessionInfo | null> {
    try {
      // 1. 创建对话会话
      const dialogueSession = this.dialogueManager.createSession({
        title: options.title,
        caseInfo: options.caseInfo,
      });

      // 2. 创建课堂会话
      const classroomResult = this.classroomManager.createSession({
        teacherId: options.teacherId,
        sessionName: options.title,
        maxStudents: options.maxStudents || 30,
      });

      if (!classroomResult.success || !classroomResult.data) {
        // 创建失败，清理对话会话
        this.dialogueManager.deleteSession(dialogueSession.id);
        return null;
      }

      const classroomSession = classroomResult.data;

      // 3. 记录协调关系
      const coordination: SessionCoordination = {
        dialogueId: dialogueSession.id,
        classroomCode: classroomSession.code,
        relationshipType: 'classroom',
        createdAt: Date.now(),
        lastSyncAt: Date.now(),
      };

      this.coordinations.set(dialogueSession.id, coordination);

      return {
        dialogueSession,
        classroomSession,
        coordination,
        participants: [],
      };

    } catch (error) {
      console.error('创建课堂对话失败:', error);
      return null;
    }
  }

  /**
   * 获取协调的会话信息
   */
  getCoordinatedSession(dialogueId: string): CoordinatedSessionInfo | null {
    const coordination = this.coordinations.get(dialogueId);
    if (!coordination) return null;

    const dialogueSession = this.dialogueManager.getSession(dialogueId);
    if (!dialogueSession) return null;

    let classroomSession: ClassroomSession | undefined;
    let participants: StudentInfo[] = [];

    if (coordination.classroomCode) {
      const classroomResult = this.classroomManager.getSessionByCode(coordination.classroomCode);
      if (classroomResult.success && classroomResult.data) {
        classroomSession = classroomResult.data;
        participants = Array.from(classroomSession.students.values());
      }
    }

    return {
      dialogueSession,
      classroomSession,
      coordination,
      participants,
    };
  }

  /**
   * 同步对话和课堂状态
   */
  async syncSessions(dialogueId: string): Promise<boolean> {
    const coordination = this.coordinations.get(dialogueId);
    if (!coordination || !coordination.classroomCode) return true;

    try {
      const dialogueSession = this.dialogueManager.getSession(dialogueId);
      const classroomResult = this.classroomManager.getSessionByCode(coordination.classroomCode);

      if (!dialogueSession || !classroomResult.success || !classroomResult.data) {
        return false;
      }

      const classroomSession = classroomResult.data;

      // 同步参与者信息
      const participants = Array.from(classroomSession.students.keys());
      this.dialogueManager.updateSessionState(dialogueId, {
        participants,
      });

      // 更新同步时间
      coordination.lastSyncAt = Date.now();

      return true;
    } catch (error) {
      console.error('同步会话失败:', error);
      return false;
    }
  }

  /**
   * 结束协调的会话
   */
  async endCoordinatedSession(dialogueId: string): Promise<boolean> {
    const coordination = this.coordinations.get(dialogueId);
    if (!coordination) return false;

    try {
      // 结束对话会话
      this.dialogueManager.endSession(dialogueId);

      // 如果有关联的课堂会话，也结束它
      if (coordination.classroomCode) {
        this.classroomManager.updateSessionStatus(coordination.classroomCode, 'ended');
      }

      // 清理协调关系
      this.coordinations.delete(dialogueId);

      return true;
    } catch (error) {
      console.error('结束协调会话失败:', error);
      return false;
    }
  }

  // ========== 课堂管理代理 ==========

  /**
   * 向课堂添加学生
   */
  async addStudentToClassroom(dialogueId: string, studentInfo: {
    displayName: string;
    avatar?: string;
  }): Promise<StudentInfo | null> {
    const coordination = this.coordinations.get(dialogueId);
    if (!coordination || !coordination.classroomCode) return null;

    try {
      const studentId = crypto.randomUUID();
      const result = this.classroomManager.addStudentToSession(
        coordination.classroomCode,
        studentId,
        studentInfo
      );

      if (result.success && result.data) {
        // 同步到对话会话
        await this.syncSessions(dialogueId);
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('添加学生失败:', error);
      return null;
    }
  }

  /**
   * 从课堂移除学生
   */
  async removeStudentFromClassroom(dialogueId: string, studentId: string): Promise<boolean> {
    const coordination = this.coordinations.get(dialogueId);
    if (!coordination || !coordination.classroomCode) return false;

    try {
      const result = this.classroomManager.removeStudentFromSession(
        coordination.classroomCode,
        studentId
      );

      if (result.success) {
        // 同步到对话会话
        await this.syncSessions(dialogueId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('移除学生失败:', error);
      return false;
    }
  }

  // ========== 统计和清理 ==========

  /**
   * 获取协调器统计信息
   */
  getCoordinatorStats() {
    const dialogueStats = this.dialogueManager.getSessionStats();
    const classroomStats = this.classroomManager.getSessionStats();

    const coordinationsByType = {
      solo: 0,
      classroom: 0,
      demo: 0,
    };

    for (const coordination of this.coordinations.values()) {
      coordinationsByType[coordination.relationshipType]++;
    }

    return {
      dialogue: dialogueStats,
      classroom: classroomStats,
      coordinations: {
        total: this.coordinations.size,
        byType: coordinationsByType,
      },
    };
  }

  /**
   * 清理过期的协调关系
   */
  cleanupExpiredCoordinations() {
    const now = Date.now();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24小时

    for (const [dialogueId, coordination] of this.coordinations) {
      if (now - coordination.lastSyncAt > expiredThreshold) {
        const dialogueSession = this.dialogueManager.getSession(dialogueId);

        // 如果对话会话已经结束或不存在，清理协调关系
        if (!dialogueSession || dialogueSession.isEnded) {
          this.coordinations.delete(dialogueId);
        }
      }
    }
  }

  /**
   * 关闭协调器
   */
  shutdown() {
    // 清理所有协调关系
    this.coordinations.clear();

    // 停止课堂管理器
    this.classroomManager.stop();
  }
}

// ========== 单例实例 ==========
export const sessionCoordinator = new SessionCoordinator();