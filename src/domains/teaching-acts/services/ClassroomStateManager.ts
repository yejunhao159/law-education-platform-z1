/**
 * 课堂状态管理器
 * 负责课堂数据的存储和管理
 * DeepPractice Standards Compliant
 */

import {
  ClassroomInfo,
  ClassroomSession,
  StudentInfo
} from './types/ClassroomTypes';

export class ClassroomStateManager {
  private classrooms = new Map<string, ClassroomInfo>();
  private classroomSessions = new Map<string, ClassroomSession>();
  private studentSessions = new Map<string, string>(); // studentId -> sessionId
  private inviteCodes = new Map<string, string>(); // inviteCode -> classroomId

  // ========== 课堂管理 ==========

  /**
   * 创建课堂
   */
  createClassroom(classroom: ClassroomInfo, inviteCode: string): void {
    this.classrooms.set(classroom.id, classroom);
    this.inviteCodes.set(inviteCode, classroom.id);
  }

  /**
   * 获取课堂信息
   */
  getClassroom(classroomId: string): ClassroomInfo | undefined {
    return this.classrooms.get(classroomId);
  }

  /**
   * 根据邀请码获取课堂
   */
  getClassroomByInviteCode(inviteCode: string): ClassroomInfo | undefined {
    const classroomId = this.inviteCodes.get(inviteCode);
    return classroomId ? this.classrooms.get(classroomId) : undefined;
  }

  /**
   * 获取教师的所有课堂
   */
  getTeacherClassrooms(teacherId: string): ClassroomInfo[] {
    return Array.from(this.classrooms.values())
      .filter(classroom => classroom.teacherId === teacherId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 更新课堂信息
   */
  updateClassroom(classroomId: string, updates: Partial<ClassroomInfo>): boolean {
    const classroom = this.classrooms.get(classroomId);
    if (!classroom) return false;

    const updatedClassroom = { ...classroom, ...updates };
    this.classrooms.set(classroomId, updatedClassroom);
    return true;
  }

  /**
   * 增加课堂学生数量
   */
  incrementStudentCount(classroomId: string): boolean {
    const classroom = this.classrooms.get(classroomId);
    if (!classroom) return false;

    classroom.currentStudents += 1;
    this.classrooms.set(classroomId, classroom);
    return true;
  }

  // ========== 会话管理 ==========

  /**
   * 创建会话
   */
  createSession(session: ClassroomSession): void {
    this.classroomSessions.set(session.id, session);
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): ClassroomSession | undefined {
    return this.classroomSessions.get(sessionId);
  }

  /**
   * 获取课堂的活跃会话
   */
  getActiveSession(classroomId: string): ClassroomSession | undefined {
    return Array.from(this.classroomSessions.values())
      .find(session =>
        session.classroomId === classroomId &&
        session.status === 'active'
      );
  }

  /**
   * 更新会话状态
   */
  updateSession(sessionId: string, updates: Partial<ClassroomSession>): boolean {
    const session = this.classroomSessions.get(sessionId);
    if (!session) return false;

    const updatedSession = { ...session, ...updates };
    this.classroomSessions.set(sessionId, updatedSession);
    return true;
  }

  /**
   * 结束会话
   */
  endSession(sessionId: string): boolean {
    const session = this.classroomSessions.get(sessionId);
    if (!session) return false;

    session.status = 'completed';
    session.endedAt = Date.now();
    this.classroomSessions.set(sessionId, session);

    // 清理学生会话映射
    session.participants.forEach(participant => {
      this.studentSessions.delete(participant.id);
    });

    return true;
  }

  // ========== 学生管理 ==========

  /**
   * 关联学生到会话
   */
  associateStudentToSession(studentId: string, sessionId: string): void {
    this.studentSessions.set(studentId, sessionId);
  }

  /**
   * 获取学生当前会话
   */
  getStudentSession(studentId: string): ClassroomSession | undefined {
    const sessionId = this.studentSessions.get(studentId);
    return sessionId ? this.classroomSessions.get(sessionId) : undefined;
  }

  /**
   * 移除学生会话关联
   */
  removeStudentFromSession(studentId: string): void {
    this.studentSessions.delete(studentId);
  }

  // ========== 验证和辅助方法 ==========

  /**
   * 验证教师权限
   */
  verifyTeacherAccess(classroomId: string, teacherId: string): boolean {
    const classroom = this.classrooms.get(classroomId);
    return classroom?.teacherId === teacherId;
  }

  /**
   * 检查课堂是否可加入
   */
  canJoinClassroom(classroom: ClassroomInfo): boolean {
    return classroom.status === 'active' &&
           classroom.currentStudents < classroom.maxStudents;
  }

  /**
   * 生成邀请码
   */
  generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * 检查邀请码是否已存在
   */
  isInviteCodeExists(inviteCode: string): boolean {
    return this.inviteCodes.has(inviteCode);
  }

  // ========== 测试和调试方法 ==========

  /**
   * 重置所有数据（仅用于测试）
   */
  reset(): void {
    this.classrooms.clear();
    this.classroomSessions.clear();
    this.studentSessions.clear();
    this.inviteCodes.clear();
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      totalClassrooms: this.classrooms.size,
      activeClassrooms: Array.from(this.classrooms.values())
        .filter(c => c.status === 'active').length,
      totalSessions: this.classroomSessions.size,
      activeSessions: Array.from(this.classroomSessions.values())
        .filter(s => s.status === 'active').length,
      connectedStudents: this.studentSessions.size
    };
  }
}

// 单例实例
export const classroomStateManager = new ClassroomStateManager();