/**
 * 课堂管理应用服务
 * 核心业务逻辑，从API层分离
 * DeepPractice Standards Compliant
 */

import { v4 as uuidv4 } from 'uuid';
import { ClassroomStateManager } from './ClassroomStateManager';
import {
  ClassroomInfo,
  ClassroomSession,
  StudentInfo,
  VoteSession,
  VoteOption,
  CreateClassroomRequest,
  CreateClassroomResponse,
  JoinClassroomRequest,
  JoinClassroomResponse,
  StartSessionRequest,
  StartSessionResponse,
  EndSessionRequest,
  EndSessionResponse,
  GetStatusRequest,
  GetStatusResponse,
  GetClassroomListRequest,
  GetClassroomListResponse,
  GetClassroomDetailRequest,
  GetClassroomDetailResponse,
  StartVoteRequest,
  StartVoteResponse,
  SubmitVoteRequest,
  SubmitVoteResponse,
  EndVoteRequest,
  EndVoteResponse,
  GetVoteResultsRequest,
  GetVoteResultsResponse,
  ClassroomErrorCode
} from './types/ClassroomTypes';

export class ClassroomApplicationService {
  constructor(
    private stateManager: ClassroomStateManager = new ClassroomStateManager()
  ) {}

  // ========== 课堂管理 ==========

  /**
   * 创建课堂
   */
  async createClassroom(request: CreateClassroomRequest): Promise<CreateClassroomResponse> {
    try {
      // 验证必要字段
      this.validateCreateClassroomRequest(request);

      // 生成唯一邀请码
      let inviteCode: string;
      do {
        inviteCode = this.stateManager.generateInviteCode();
      } while (this.stateManager.isInviteCodeExists(inviteCode));

      // 创建课堂对象
      const classroomId = uuidv4();
      const classroom: ClassroomInfo = {
        id: classroomId,
        name: request.name.trim(),
        description: request.description?.trim() || '',
        teacherId: request.teacherId,
        teacherName: request.teacherName,
        createdAt: Date.now(),
        status: 'active',
        maxStudents: Math.max(1, Math.min(100, request.maxStudents || 30)),
        currentStudents: 0,
        sessionMode: request.sessionMode || 'classroom',
        settings: {
          allowAnonymous: request.settings?.allowAnonymous !== false,
          requireApproval: request.settings?.requireApproval === true,
          autoStartSessions: request.settings?.autoStartSessions === true
        }
      };

      // 保存课堂
      this.stateManager.createClassroom(classroom, inviteCode);

      // 构建响应
      return {
        success: true,
        data: {
          classroom,
          inviteCode,
          joinUrl: this.buildJoinUrl(inviteCode)
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '创建课堂失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 学生加入课堂
   */
  async joinClassroom(request: JoinClassroomRequest): Promise<JoinClassroomResponse> {
    try {
      // 验证必要字段
      this.validateJoinClassroomRequest(request);

      // 查找课堂
      const classroom = this.findClassroom(request);
      if (!classroom) {
        return this.buildErrorResponse(
          '课堂不存在或已关闭',
          ClassroomErrorCode.CLASSROOM_NOT_FOUND
        );
      }

      // 检查是否可以加入
      if (!this.stateManager.canJoinClassroom(classroom)) {
        return this.buildErrorResponse(
          '课堂已满或不可用',
          ClassroomErrorCode.CLASSROOM_UNAVAILABLE
        );
      }

      // 创建学生信息
      const student: StudentInfo = {
        id: request.studentId,
        name: request.studentName.trim(),
        joinedAt: Date.now(),
        status: 'active'
      };

      // 更新课堂学生数量
      this.stateManager.incrementStudentCount(classroom.id);

      return {
        success: true,
        data: {
          classroom,
          student,
          message: `成功加入课堂：${classroom.name}`
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '加入课堂失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 开始会话
   */
  async startSession(request: StartSessionRequest): Promise<StartSessionResponse> {
    try {
      // 验证教师权限
      if (!this.stateManager.verifyTeacherAccess(request.classroomId, request.teacherId)) {
        return this.buildErrorResponse(
          '无权限操作此课堂',
          ClassroomErrorCode.UNAUTHORIZED
        );
      }

      const classroom = this.stateManager.getClassroom(request.classroomId)!;

      // 检查是否有活跃会话
      const existingSession = this.stateManager.getActiveSession(request.classroomId);
      if (existingSession) {
        return this.buildErrorResponse(
          '课堂已有活跃会话',
          ClassroomErrorCode.SESSION_ALREADY_ACTIVE
        );
      }

      // 创建新会话
      const sessionId = uuidv4();
      const session: ClassroomSession = {
        id: sessionId,
        classroomId: request.classroomId,
        name: request.sessionName || `${classroom.name} - ${new Date().toLocaleString()}`,
        description: request.sessionDescription || '',
        status: 'active',
        startedAt: Date.now(),
        participants: [],
        caseId: request.caseId,
        settings: {
          difficulty: request.settings?.difficulty || 'normal',
          mode: request.settings?.mode || 'auto',
          maxDuration: Math.max(300000, Math.min(7200000, request.settings?.maxDuration || 3600000))
        }
      };

      this.stateManager.createSession(session);

      return {
        success: true,
        data: {
          session,
          message: '会话已开始'
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '开始会话失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 结束会话
   */
  async endSession(request: EndSessionRequest): Promise<EndSessionResponse> {
    try {
      // 验证教师权限
      if (!this.stateManager.verifyTeacherAccess(request.classroomId, request.teacherId)) {
        return this.buildErrorResponse(
          '无权限操作此课堂',
          ClassroomErrorCode.UNAUTHORIZED
        );
      }

      const session = this.stateManager.getSession(request.sessionId);
      if (!session) {
        return this.buildErrorResponse(
          '会话不存在',
          ClassroomErrorCode.SESSION_NOT_FOUND
        );
      }

      // 结束会话
      this.stateManager.endSession(request.sessionId);

      return {
        success: true,
        data: {
          session: this.stateManager.getSession(request.sessionId)!,
          message: '会话已结束'
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '结束会话失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 获取状态
   */
  async getStatus(request: GetStatusRequest): Promise<GetStatusResponse> {
    try {
      const classroom = this.stateManager.getClassroom(request.classroomId);
      if (!classroom) {
        return this.buildErrorResponse(
          '课堂不存在',
          ClassroomErrorCode.CLASSROOM_NOT_FOUND
        );
      }

      // 获取当前活跃会话
      const activeSession = this.stateManager.getActiveSession(request.classroomId);

      // 获取学生会话信息
      let studentSession = null;
      if (request.studentId) {
        studentSession = this.stateManager.getStudentSession(request.studentId);
      }

      return {
        success: true,
        data: {
          classroom,
          activeSession: activeSession || null,
          studentSession: studentSession || null,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '获取状态失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 获取课堂列表
   */
  async getClassroomList(request: GetClassroomListRequest): Promise<GetClassroomListResponse> {
    try {
      const classrooms = this.stateManager.getTeacherClassrooms(request.teacherId);

      return {
        success: true,
        data: {
          classrooms,
          total: classrooms.length
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '获取课堂列表失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 获取课堂详情
   */
  async getClassroomDetail(request: GetClassroomDetailRequest): Promise<GetClassroomDetailResponse> {
    try {
      const classroom = this.stateManager.getClassroom(request.classroomId);
      if (!classroom) {
        return this.buildErrorResponse(
          '课堂不存在',
          ClassroomErrorCode.CLASSROOM_NOT_FOUND
        );
      }

      // 获取当前会话信息
      const currentSession = this.stateManager.getActiveSession(request.classroomId);

      return {
        success: true,
        data: {
          classroom,
          currentSession: currentSession || null
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '获取课堂详情失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  // ========== 投票管理 ==========

  /**
   * 开始投票
   */
  async startVote(request: StartVoteRequest): Promise<StartVoteResponse> {
    try {
      // 验证教师权限
      if (!this.stateManager.verifyTeacherAccess(request.sessionId, request.teacherId)) {
        return this.buildErrorResponse(
          '无权限操作此会话',
          ClassroomErrorCode.UNAUTHORIZED
        );
      }

      const session = this.stateManager.getSession(request.sessionId);
      if (!session) {
        return this.buildErrorResponse(
          '会话不存在',
          ClassroomErrorCode.SESSION_NOT_FOUND
        );
      }

      // 检查是否已有活跃投票
      if (session.currentVote && session.currentVote.isActive) {
        return this.buildErrorResponse(
          '已有活跃的投票进行中',
          ClassroomErrorCode.VOTE_ALREADY_ACTIVE
        );
      }

      // 验证选项数量（最多5个）
      if (request.options.length > 5) {
        return this.buildErrorResponse(
          '投票选项不能超过5个',
          ClassroomErrorCode.TOO_MANY_OPTIONS
        );
      }

      // 创建投票选项（ABCDE格式）
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const voteOptions: VoteOption[] = request.options.slice(0, 5).map((text, index) => ({
        id: letters[index],
        text: text.trim(),
        voteCount: 0
      }));

      // 创建投票会话
      const voteId = uuidv4();
      const voteSession: VoteSession = {
        id: voteId,
        question: request.question.trim(),
        options: voteOptions,
        createdAt: Date.now(),
        endsAt: request.duration ? Date.now() + (request.duration * 1000) : undefined,
        isActive: true,
        participantVotes: {},
        maxOptions: voteOptions.length
      };

      // 更新会话
      this.stateManager.startVote(request.sessionId, voteSession);

      return {
        success: true,
        data: {
          voteSession,
          message: '投票已开始'
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '开始投票失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 提交投票
   */
  async submitVote(request: SubmitVoteRequest): Promise<SubmitVoteResponse> {
    try {
      const session = this.stateManager.getSession(request.sessionId);
      if (!session) {
        return this.buildErrorResponse(
          '会话不存在',
          ClassroomErrorCode.SESSION_NOT_FOUND
        );
      }

      const voteSession = session.currentVote;
      if (!voteSession) {
        return this.buildErrorResponse(
          '当前没有进行中的投票',
          ClassroomErrorCode.VOTE_NOT_FOUND
        );
      }

      if (!voteSession.isActive) {
        return this.buildErrorResponse(
          '投票已结束',
          ClassroomErrorCode.VOTE_ENDED
        );
      }

      // 检查是否已经投过票
      if (voteSession.participantVotes[request.studentId]) {
        return this.buildErrorResponse(
          '您已经投过票了',
          ClassroomErrorCode.VOTE_ALREADY_SUBMITTED
        );
      }

      // 验证投票选项
      const validOptions = ['A', 'B', 'C', 'D', 'E'];
      if (!validOptions.includes(request.optionId.toUpperCase())) {
        return this.buildErrorResponse(
          '无效的投票选项',
          ClassroomErrorCode.INVALID_VOTE_OPTION
        );
      }

      // 检查选项是否存在
      const optionExists = voteSession.options.some(opt => opt.id === request.optionId.toUpperCase());
      if (!optionExists) {
        return this.buildErrorResponse(
          '投票选项不存在',
          ClassroomErrorCode.INVALID_VOTE_OPTION
        );
      }

      // 提交投票
      this.stateManager.submitVote(request.sessionId, request.studentId, request.optionId.toUpperCase());

      // 获取更新后的投票会话
      const updatedSession = this.stateManager.getSession(request.sessionId)!;

      return {
        success: true,
        data: {
          voteSession: updatedSession.currentVote!,
          message: '投票提交成功'
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '提交投票失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 结束投票
   */
  async endVote(request: EndVoteRequest): Promise<EndVoteResponse> {
    try {
      // 验证教师权限
      if (!this.stateManager.verifyTeacherAccess(request.sessionId, request.teacherId)) {
        return this.buildErrorResponse(
          '无权限操作此会话',
          ClassroomErrorCode.UNAUTHORIZED
        );
      }

      const session = this.stateManager.getSession(request.sessionId);
      if (!session) {
        return this.buildErrorResponse(
          '会话不存在',
          ClassroomErrorCode.SESSION_NOT_FOUND
        );
      }

      const voteSession = session.currentVote;
      if (!voteSession) {
        return this.buildErrorResponse(
          '当前没有进行中的投票',
          ClassroomErrorCode.VOTE_NOT_FOUND
        );
      }

      // 结束投票
      this.stateManager.endVote(request.sessionId);

      // 获取最终结果
      const updatedSession = this.stateManager.getSession(request.sessionId)!;
      const finalVoteSession = updatedSession.currentVote!;

      return {
        success: true,
        data: {
          voteSession: finalVoteSession,
          results: finalVoteSession.options,
          message: '投票已结束'
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '结束投票失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * 获取投票结果
   */
  async getVoteResults(request: GetVoteResultsRequest): Promise<GetVoteResultsResponse> {
    try {
      const session = this.stateManager.getSession(request.sessionId);
      if (!session) {
        return this.buildErrorResponse(
          '会话不存在',
          ClassroomErrorCode.SESSION_NOT_FOUND
        );
      }

      const voteSession = session.currentVote;

      return {
        success: true,
        data: {
          voteSession: voteSession || null,
          results: voteSession ? voteSession.options : []
        }
      };

    } catch (error) {
      return this.buildErrorResponse(
        error instanceof Error ? error.message : '获取投票结果失败',
        ClassroomErrorCode.INTERNAL_ERROR
      );
    }
  }

  // ========== 私有辅助方法 ==========

  /**
   * 验证创建课堂请求
   */
  private validateCreateClassroomRequest(request: CreateClassroomRequest): void {
    if (!request.name || !request.name.trim()) {
      throw new Error('课堂名称不能为空');
    }
    if (!request.teacherId) {
      throw new Error('教师ID不能为空');
    }
    if (!request.teacherName) {
      throw new Error('教师姓名不能为空');
    }
  }

  /**
   * 验证加入课堂请求
   */
  private validateJoinClassroomRequest(request: JoinClassroomRequest): void {
    if (!request.classroomId && !request.inviteCode) {
      throw new Error('必须提供课堂ID或邀请码');
    }
    if (!request.studentId) {
      throw new Error('学生ID不能为空');
    }
    if (!request.studentName) {
      throw new Error('学生姓名不能为空');
    }
  }

  /**
   * 查找课堂
   */
  private findClassroom(request: JoinClassroomRequest): ClassroomInfo | undefined {
    if (request.classroomId) {
      return this.stateManager.getClassroom(request.classroomId);
    } else if (request.inviteCode) {
      return this.stateManager.getClassroomByInviteCode(request.inviteCode);
    }
    return undefined;
  }

  /**
   * 构建加入链接
   */
  private buildJoinUrl(inviteCode: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/classroom/join?code=${inviteCode}`;
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(message: string, code: ClassroomErrorCode): any {
    return {
      success: false,
      error: {
        message,
        code
      }
    };
  }

  // ========== 测试和调试方法 ==========

  /**
   * 重置数据（仅用于测试）
   */
  resetData(): void {
    this.stateManager.reset();
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return this.stateManager.getStatistics();
  }
}