/**
 * 适配器函数测试
 * @description 验证Domain层到前端层的数据适配是否正确
 */

import type {
  ClassroomSession as DomainClassroomSession,
  StudentInfo as DomainStudentInfo,
  VoteSession as DomainVoteSession
} from '../../../../src/domains/teaching-acts/services/types/ClassroomTypes';

import {
  adaptClassroomSession,
  adaptStudentInfo,
  adaptVoteSession,
  extractClassroomCode,
  createABCDEOptions
} from '../adapters';

describe('Domain到前端适配器测试', () => {

  describe('extractClassroomCode', () => {
    it('应该从UUID中提取6位数字码', () => {
      const uuid = 'abc123-def456-ghi789';
      const code = extractClassroomCode(uuid);

      expect(code).toHaveLength(6);
      expect(/^\d+$/.test(code)).toBe(true);
    });
  });

  describe('adaptStudentInfo', () => {
    it('应该正确适配学生信息', () => {
      const domainStudent: DomainStudentInfo = {
        id: 'student-123',
        name: '张三',
        joinedAt: 1640995200000,
        status: 'active'
      };

      const adapted = adaptStudentInfo(domainStudent);

      expect(adapted).toEqual({
        id: 'student-123',
        displayName: '张三',
        joinedAt: 1640995200000,
        handRaised: false,
        handRaisedAt: undefined,
        isOnline: true,
        lastActiveAt: 1640995200000
      });
    });
  });

  describe('adaptVoteSession', () => {
    it('应该正确适配投票会话', () => {
      const domainVote: DomainVoteSession = {
        id: 'vote-123',
        question: '你认为这个案例的判决是否合理？',
        options: [
          { id: 'A', text: '完全合理', voteCount: 5 },
          { id: 'B', text: '基本合理', voteCount: 3 },
          { id: 'C', text: '不太合理', voteCount: 2 }
        ],
        createdAt: 1640995200000,
        isActive: true,
        participantVotes: {
          'student-1': 'A',
          'student-2': 'A',
          'student-3': 'B'
        },
        maxOptions: 5
      };

      const adapted = adaptVoteSession(domainVote);

      expect(adapted.question).toBe('你认为这个案例的判决是否合理？');
      expect(adapted.choices).toHaveLength(3);
      expect(adapted.choices[0]).toEqual({
        id: 'A',
        text: '完全合理',
        count: 5,
        percentage: 50 // 5/10 * 100
      });
      expect(adapted.totalVotes).toBe(10);
      expect(adapted.votedStudents).toHaveLength(3);
      expect(adapted.isEnded).toBe(false);
    });
  });

  describe('createABCDEOptions', () => {
    it('应该创建ABCDE格式的选项', () => {
      const options = ['选项1', '选项2', '选项3'];
      const abcdeOptions = createABCDEOptions(options);

      expect(abcdeOptions).toHaveLength(3);
      expect(abcdeOptions[0]).toEqual({
        id: 'A',
        text: '选项1',
        voteCount: 0
      });
      expect(abcdeOptions[1].id).toBe('B');
      expect(abcdeOptions[2].id).toBe('C');
    });

    it('应该限制最多5个选项', () => {
      const options = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const abcdeOptions = createABCDEOptions(options);

      expect(abcdeOptions).toHaveLength(5);
      expect(abcdeOptions[4].id).toBe('E');
    });
  });

  describe('adaptClassroomSession', () => {
    it('应该正确适配课堂会话', () => {
      const domainSession: DomainClassroomSession = {
        id: 'session-abc123',
        classroomId: 'classroom-456',
        name: '合同法案例讨论',
        status: 'active',
        startedAt: 1640995200000,
        participants: [
          {
            id: 'student-1',
            name: '张三',
            joinedAt: 1640995200000,
            status: 'active'
          }
        ],
        settings: {
          difficulty: 'normal',
          mode: 'auto',
          maxDuration: 3600
        }
      };

      const adapted = adaptClassroomSession(domainSession);

      expect(adapted.code).toHaveLength(6);
      expect(adapted.id).toBe('session-abc123');
      expect(adapted.name).toBe('合同法案例讨论');
      expect(adapted.status).toBe('active');
      expect(adapted.students).toHaveLength(1);
      expect(adapted.students[0].displayName).toBe('张三');
    });
  });
});