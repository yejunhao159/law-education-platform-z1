/**
 * 苏格拉底对话会话管理器
 * 职责：DialogueSession的生命周期管理和持久化
 * 区别于ClassroomSession的课堂管理器
 * DeepPractice Standards Compliant
 */

import { DialogueState, Performance, DialogueMode, CaseInfo } from '@/src/domains/socratic-dialogue/types';

// ========== 会话管理接口 ==========
export interface DialogueSession {
  id: string;
  title: string;
  caseId?: string;
  createdAt: number;
  lastActivityAt: number;
  isEnded: boolean;
  participants: string[];
  mode: DialogueMode;
  state: DialogueState;
  metadata: {
    totalMessages: number;
    completedLevels: number[];
    averageResponseTime: number;
  };
}

export interface SessionSummary {
  id: string;
  title: string;
  caseId?: string;
  createdAt: number;
  lastActivityAt: number;
  messageCount: number;
  isEnded: boolean;
}

export interface CreateSessionOptions {
  title: string;
  caseInfo?: CaseInfo;
  mode?: DialogueMode;
  initialParticipants?: string[];
}

// ========== 对话会话管理器 ==========
export class DialogueSessionManager {
  private sessions: Map<string, DialogueSession> = new Map();
  private activeSessionId: string | null = null;

  constructor() {
    this.loadPersistedSessions();
  }

  // ========== 会话创建与管理 ==========

  /**
   * 创建新会话
   */
  createSession(options: CreateSessionOptions): DialogueSession {
    const sessionId = this.generateSessionId();

    const session: DialogueSession = {
      id: sessionId,
      title: options.title,
      caseId: options.caseInfo?.id,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      isEnded: false,
      participants: options.initialParticipants || [],
      mode: options.mode || 'auto',
      state: {
        sessionId,
        caseId: options.caseInfo?.id || '',
        currentLevel: 1, // DialogueLevel.OBSERVATION
        messages: [],
        participants: options.initialParticipants || [],
        mode: options.mode || 'auto',
        performance: {
          questionCount: 0,
          correctRate: 0,
          thinkingTime: [],
        },
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isEnded: false,
      },
      metadata: {
        totalMessages: 0,
        completedLevels: [],
        averageResponseTime: 0,
      },
    };

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;
    this.persistSessions();

    return session;
  }

  /**
   * 获取当前活跃会话
   */
  getActiveSession(): DialogueSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * 设置活跃会话
   */
  setActiveSession(sessionId: string | null): boolean {
    if (sessionId === null) {
      this.activeSessionId = null;
      return true;
    }

    if (this.sessions.has(sessionId)) {
      this.activeSessionId = sessionId;
      this.updateSessionActivity(sessionId);
      return true;
    }

    return false;
  }

  /**
   * 获取会话详情
   */
  getSession(sessionId: string): DialogueSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 获取所有会话摘要
   */
  getAllSessionSummaries(): SessionSummary[] {
    return Array.from(this.sessions.values())
      .map(session => ({
        id: session.id,
        title: session.title,
        caseId: session.caseId,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        messageCount: session.metadata.totalMessages,
        isEnded: session.isEnded,
      }))
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  /**
   * 更新会话状态
   */
  updateSessionState(sessionId: string, stateUpdates: Partial<DialogueState>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    Object.assign(session.state, stateUpdates);
    this.updateSessionActivity(sessionId);
    this.updateSessionMetadata(sessionId);
    this.persistSessions();

    return true;
  }

  /**
   * 结束会话
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isEnded = true;
    session.state.isEnded = true;
    session.lastActivityAt = Date.now();

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    this.persistSessions();
    return true;
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) return false;

    this.sessions.delete(sessionId);

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    this.persistSessions();
    return true;
  }

  /**
   * 添加参与者
   */
  addParticipant(sessionId: string, participantId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (!session.participants.includes(participantId)) {
      session.participants.push(participantId);
      session.state.participants.push(participantId);
      this.updateSessionActivity(sessionId);
      this.persistSessions();
    }

    return true;
  }

  /**
   * 移除参与者
   */
  removeParticipant(sessionId: string, participantId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.participants = session.participants.filter(id => id !== participantId);
    session.state.participants = session.state.participants.filter(id => id !== participantId);

    this.updateSessionActivity(sessionId);
    this.persistSessions();
    return true;
  }

  // ========== 性能和统计 ==========

  /**
   * 获取会话统计信息
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    averageMessagesPerSession: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => !s.isEnded).length;

    const durations = sessions.map(s => {
      if (s.isEnded) {
        return s.lastActivityAt - s.createdAt;
      }
      return Date.now() - s.createdAt;
    });

    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const averageMessages = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.metadata.totalMessages, 0) / sessions.length
      : 0;

    return {
      totalSessions: sessions.length,
      activeSessions,
      averageSessionDuration: averageDuration,
      averageMessagesPerSession: averageMessages,
    };
  }

  // ========== 私有方法 ==========

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
      session.state.lastActivityAt = Date.now();
    }
  }

  private updateSessionMetadata(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 更新消息计数
    session.metadata.totalMessages = session.state.messages.length;

    // 更新完成的层级
    const currentLevel = session.state.currentLevel;
    if (!session.metadata.completedLevels.includes(currentLevel)) {
      session.metadata.completedLevels.push(currentLevel);
    }

    // 更新平均响应时间
    if (session.state.performance.thinkingTime.length > 0) {
      session.metadata.averageResponseTime =
        session.state.performance.thinkingTime.reduce((sum, time) => sum + time, 0) /
        session.state.performance.thinkingTime.length;
    }
  }

  private persistSessions(): void {
    // 检查是否在客户端环境
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const sessionData = {
        sessions: Array.from(this.sessions.entries()),
        activeSessionId: this.activeSessionId,
      };
      localStorage.setItem('socratic-sessions', JSON.stringify(sessionData));
    } catch (error) {
      console.warn('会话数据持久化失败:', error);
    }
  }

  private loadPersistedSessions(): void {
    // 检查是否在客户端环境
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('socratic-sessions');
      if (stored) {
        const sessionData = JSON.parse(stored);
        this.sessions = new Map(sessionData.sessions);
        this.activeSessionId = sessionData.activeSessionId;
      }
    } catch (error) {
      console.warn('加载持久化会话数据失败:', error);
    }
  }

  // ========== 清理和维护 ==========

  /**
   * 清理过期会话（超过30天的已结束会话）
   */
  cleanupExpiredSessions(): number {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.isEnded && session.lastActivityAt < thirtyDaysAgo) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.persistSessions();
    }

    return deletedCount;
  }
}

// ========== 单例实例 ==========
export const dialogueSessionManager = new DialogueSessionManager();