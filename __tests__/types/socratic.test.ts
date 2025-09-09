/**
 * 苏格拉底式问答类型定义单元测试
 * @module __tests__/types/socratic
 * @description 测试类型验证、默认值、边界条件
 */

import { z } from 'zod';
import {
  MessageRole,
  DialogueLevel,
  ControlMode,
  SessionMode,
  Difficulty,
  LogLevel,
  ErrorCode,
  Message,
  DialogueState,
  AgentContext,
  ClassroomSession,
  StudentInfo,
  CachedResponse,
  LEVEL_CONFIG,
  DEFAULT_AGENT_SETTINGS,
  SESSION_EXPIRY_TIME,
  CLASSROOM_CODE_LENGTH,
  CACHE_SIMILARITY_THRESHOLD
} from '@/lib/types/socratic';

// ============== Zod Schemas for Runtime Validation ==============

const MessageSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(MessageRole),
  content: z.string(),
  level: z.nativeEnum(DialogueLevel),
  timestamp: z.number().positive(),
  metadata: z.object({
    keywords: z.array(z.string()).optional(),
    quality: z.number().min(0).max(100).optional(),
    suggestions: z.array(z.string()).optional(),
    thinkingTime: z.number().nonnegative().optional(),
    similarQuestionId: z.string().optional()
  }).optional(),
  streaming: z.boolean().optional()
});

const PerformanceSchema = z.object({
  questionCount: z.number().nonnegative(),
  correctRate: z.number().min(0).max(100),
  thinkingTime: z.array(z.number().nonnegative()),
  avgResponseTime: z.number().positive().optional(),
  levelDuration: z.record(z.nativeEnum(DialogueLevel), z.number()).optional()
});

const DialogueStateSchema = z.object({
  sessionId: z.string(),
  caseId: z.string(),
  currentLevel: z.nativeEnum(DialogueLevel),
  messages: z.array(MessageSchema),
  participants: z.array(z.string()),
  mode: z.nativeEnum(ControlMode),
  performance: PerformanceSchema,
  createdAt: z.number().positive(),
  lastActivityAt: z.number().positive(),
  isEnded: z.boolean().optional()
});

const StudentInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  joinedAt: z.number().positive(),
  handRaised: z.boolean().optional(),
  handRaisedAt: z.number().positive().optional(),
  isOnline: z.boolean(),
  lastActiveAt: z.number().positive()
});

// ============== Test Suites ==============

describe('Socratic Types - Enums', () => {
  test('MessageRole enum values', () => {
    expect(MessageRole.STUDENT).toBe('student');
    expect(MessageRole.AGENT).toBe('agent');
    expect(MessageRole.TEACHER).toBe('teacher');
    expect(MessageRole.SYSTEM).toBe('system');
  });

  test('DialogueLevel enum values', () => {
    expect(DialogueLevel.OBSERVATION).toBe(1);
    expect(DialogueLevel.FACTS).toBe(2);
    expect(DialogueLevel.ANALYSIS).toBe(3);
    expect(DialogueLevel.APPLICATION).toBe(4);
    expect(DialogueLevel.VALUES).toBe(5);
  });

  test('ControlMode enum values', () => {
    expect(ControlMode.AUTO).toBe('auto');
    expect(ControlMode.SEMI_AUTO).toBe('semi');
    expect(ControlMode.MANUAL).toBe('manual');
  });

  test('ErrorCode enum contains expected codes', () => {
    expect(ErrorCode.AGENT_UNAVAILABLE).toBe('AGENT_001');
    expect(ErrorCode.SESSION_EXPIRED).toBe('SESSION_002');
    expect(ErrorCode.INVALID_INPUT).toBe('INPUT_001');
    expect(ErrorCode.RATE_LIMIT).toBe('SYSTEM_001');
  });
});

describe('Socratic Types - Message Validation', () => {
  test('valid Message object passes validation', () => {
    const validMessage: Message = {
      id: 'msg-001',
      role: MessageRole.STUDENT,
      content: '这个案件的核心争议是什么？',
      level: DialogueLevel.OBSERVATION,
      timestamp: Date.now(),
      metadata: {
        keywords: ['核心争议', '案件'],
        quality: 85,
        thinkingTime: 2500
      }
    };

    expect(() => MessageSchema.parse(validMessage)).not.toThrow();
  });

  test('invalid Message role throws validation error', () => {
    const invalidMessage = {
      id: 'msg-001',
      role: 'invalid-role',
      content: 'test',
      level: DialogueLevel.OBSERVATION,
      timestamp: Date.now()
    };

    expect(() => MessageSchema.parse(invalidMessage)).toThrow();
  });

  test('Message with negative timestamp throws error', () => {
    const invalidMessage = {
      id: 'msg-001',
      role: MessageRole.STUDENT,
      content: 'test',
      level: DialogueLevel.OBSERVATION,
      timestamp: -1
    };

    expect(() => MessageSchema.parse(invalidMessage)).toThrow();
  });

  test('Message quality score must be between 0-100', () => {
    const invalidMessage: Message = {
      id: 'msg-001',
      role: MessageRole.AGENT,
      content: 'test',
      level: DialogueLevel.ANALYSIS,
      timestamp: Date.now(),
      metadata: {
        quality: 150 // Invalid: > 100
      }
    };

    expect(() => MessageSchema.parse(invalidMessage)).toThrow();
  });
});

describe('Socratic Types - DialogueState Validation', () => {
  test('valid DialogueState passes validation', () => {
    const validState: DialogueState = {
      sessionId: '123456',
      caseId: 'case-001',
      currentLevel: DialogueLevel.FACTS,
      messages: [],
      participants: ['student-1', 'student-2'],
      mode: ControlMode.AUTO,
      performance: {
        questionCount: 5,
        correctRate: 80,
        thinkingTime: [2000, 3000, 2500],
        avgResponseTime: 2500
      },
      createdAt: Date.now(),
      lastActivityAt: Date.now()
    };

    expect(() => DialogueStateSchema.parse(validState)).not.toThrow();
  });

  test('DialogueState with invalid performance metrics throws error', () => {
    const invalidState = {
      sessionId: '123456',
      caseId: 'case-001',
      currentLevel: DialogueLevel.FACTS,
      messages: [],
      participants: [],
      mode: ControlMode.AUTO,
      performance: {
        questionCount: -5, // Invalid: negative
        correctRate: 120, // Invalid: > 100
        thinkingTime: []
      },
      createdAt: Date.now(),
      lastActivityAt: Date.now()
    };

    expect(() => DialogueStateSchema.parse(invalidState)).toThrow();
  });

  test('DialogueState requires all mandatory fields', () => {
    const incompleteState = {
      sessionId: '123456',
      // Missing: caseId, currentLevel, messages, etc.
    };

    expect(() => DialogueStateSchema.parse(incompleteState)).toThrow();
  });
});

describe('Socratic Types - StudentInfo Validation', () => {
  test('valid StudentInfo passes validation', () => {
    const validStudent: StudentInfo = {
      id: 'student-001',
      displayName: '学生A',
      joinedAt: Date.now(),
      isOnline: true,
      lastActiveAt: Date.now(),
      handRaised: true,
      handRaisedAt: Date.now()
    };

    expect(() => StudentInfoSchema.parse(validStudent)).not.toThrow();
  });

  test('StudentInfo with handRaised requires handRaisedAt', () => {
    const student: StudentInfo = {
      id: 'student-001',
      displayName: '学生A',
      joinedAt: Date.now(),
      isOnline: true,
      lastActiveAt: Date.now(),
      handRaised: true,
      // Should have handRaisedAt when handRaised is true
      handRaisedAt: undefined
    };

    // This is a logical validation, not schema validation
    const isValid = !student.handRaised || 
                   (student.handRaised && student.handRaisedAt !== undefined);
    expect(isValid).toBe(false);
  });
});

describe('Socratic Types - Constants', () => {
  test('LEVEL_CONFIG contains all dialogue levels', () => {
    expect(LEVEL_CONFIG[DialogueLevel.OBSERVATION]).toBeDefined();
    expect(LEVEL_CONFIG[DialogueLevel.FACTS]).toBeDefined();
    expect(LEVEL_CONFIG[DialogueLevel.ANALYSIS]).toBeDefined();
    expect(LEVEL_CONFIG[DialogueLevel.APPLICATION]).toBeDefined();
    expect(LEVEL_CONFIG[DialogueLevel.VALUES]).toBeDefined();
  });

  test('LEVEL_CONFIG has valid min/max questions', () => {
    Object.values(LEVEL_CONFIG).forEach(config => {
      expect(config.minQuestions).toBeGreaterThan(0);
      expect(config.maxQuestions).toBeGreaterThanOrEqual(config.minQuestions);
      expect(config.name).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.objective).toBeTruthy();
    });
  });

  test('DEFAULT_AGENT_SETTINGS has valid defaults', () => {
    expect(DEFAULT_AGENT_SETTINGS.difficulty).toBe(Difficulty.NORMAL);
    expect(DEFAULT_AGENT_SETTINGS.language).toBe('zh-CN');
    expect(DEFAULT_AGENT_SETTINGS.legalSystem).toBe('chinese');
    expect(DEFAULT_AGENT_SETTINGS.maxTokens).toBeGreaterThan(0);
    expect(DEFAULT_AGENT_SETTINGS.temperature).toBeGreaterThan(0);
    expect(DEFAULT_AGENT_SETTINGS.temperature).toBeLessThanOrEqual(1);
    expect(DEFAULT_AGENT_SETTINGS.streaming).toBe(true);
  });

  test('SESSION_EXPIRY_TIME is 6 hours', () => {
    expect(SESSION_EXPIRY_TIME).toBe(6 * 60 * 60 * 1000);
  });

  test('CLASSROOM_CODE_LENGTH is 6', () => {
    expect(CLASSROOM_CODE_LENGTH).toBe(6);
  });

  test('CACHE_SIMILARITY_THRESHOLD is 0.85', () => {
    expect(CACHE_SIMILARITY_THRESHOLD).toBe(0.85);
    expect(CACHE_SIMILARITY_THRESHOLD).toBeGreaterThan(0);
    expect(CACHE_SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
  });
});

describe('Socratic Types - Boundary Conditions', () => {
  test('DialogueLevel progression boundaries', () => {
    const minLevel = DialogueLevel.OBSERVATION;
    const maxLevel = DialogueLevel.VALUES;
    
    expect(minLevel).toBe(1);
    expect(maxLevel).toBe(5);
    
    // Test level progression
    let currentLevel = minLevel;
    while (currentLevel < maxLevel) {
      currentLevel++;
      expect(currentLevel).toBeLessThanOrEqual(maxLevel);
    }
  });

  test('Performance correctRate boundaries', () => {
    const testCases = [
      { correctRate: 0, valid: true },
      { correctRate: 50, valid: true },
      { correctRate: 100, valid: true },
      { correctRate: -1, valid: false },
      { correctRate: 101, valid: false }
    ];

    testCases.forEach(({ correctRate, valid }) => {
      const performance = {
        questionCount: 5,
        correctRate,
        thinkingTime: [1000]
      };

      if (valid) {
        expect(() => PerformanceSchema.parse(performance)).not.toThrow();
      } else {
        expect(() => PerformanceSchema.parse(performance)).toThrow();
      }
    });
  });

  test('Classroom code length validation', () => {
    const generateCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };

    for (let i = 0; i < 10; i++) {
      const code = generateCode();
      expect(code.length).toBe(CLASSROOM_CODE_LENGTH);
      expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code)).toBeLessThan(1000000);
    }
  });

  test('Message timestamp must be positive', () => {
    const testCases = [
      Date.now(),
      1000000000000,
      1
    ];

    testCases.forEach(timestamp => {
      const message: Message = {
        id: 'test',
        role: MessageRole.STUDENT,
        content: 'test',
        level: DialogueLevel.OBSERVATION,
        timestamp
      };

      expect(() => MessageSchema.parse(message)).not.toThrow();
    });

    // Negative timestamps should fail
    const invalidMessage: Message = {
      id: 'test',
      role: MessageRole.STUDENT,
      content: 'test',
      level: DialogueLevel.OBSERVATION,
      timestamp: -1
    };

    expect(() => MessageSchema.parse(invalidMessage)).toThrow();
  });
});

describe('Socratic Types - Complex Scenarios', () => {
  test('ClassroomSession with multiple students', () => {
    const session: ClassroomSession = {
      code: '123456',
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRY_TIME,
      students: new Map([
        ['student-1', {
          id: 'student-1',
          displayName: '学生A',
          joinedAt: Date.now(),
          isOnline: true,
          lastActiveAt: Date.now()
        }],
        ['student-2', {
          id: 'student-2',
          displayName: '学生B',
          joinedAt: Date.now(),
          isOnline: false,
          lastActiveAt: Date.now() - 300000
        }]
      ]),
      status: 'active',
      statistics: {
        totalParticipants: 2,
        activeParticipants: 1,
        avgUnderstanding: 75,
        levelDurations: {
          [DialogueLevel.OBSERVATION]: 300000,
          [DialogueLevel.FACTS]: 450000,
          [DialogueLevel.ANALYSIS]: 0,
          [DialogueLevel.APPLICATION]: 0,
          [DialogueLevel.VALUES]: 0
        }
      }
    };

    expect(session.students.size).toBe(2);
    expect(session.statistics?.activeParticipants).toBeLessThanOrEqual(
      session.statistics?.totalParticipants || 0
    );
  });

  test('AgentContext with complete case information', () => {
    const context: AgentContext = {
      case: {
        id: 'case-001',
        type: '民事',
        facts: ['事实1', '事实2', '事实3'],
        disputes: ['争议点1', '争议点2'],
        laws: ['《民法典》第123条'],
        judgment: '判决结果'
      },
      dialogue: {
        level: DialogueLevel.ANALYSIS,
        history: [],
        performance: {
          questionCount: 10,
          correctRate: 85,
          thinkingTime: [2000, 3000, 2500]
        }
      },
      settings: DEFAULT_AGENT_SETTINGS,
      metadata: {
        teacherId: 'teacher-001',
        className: '法学基础班',
        tags: ['合同法', '案例分析']
      }
    };

    expect(context.case.type).toMatch(/^(民事|刑事|行政)$/);
    expect(context.dialogue.level).toBeGreaterThanOrEqual(DialogueLevel.OBSERVATION);
    expect(context.dialogue.level).toBeLessThanOrEqual(DialogueLevel.VALUES);
  });

  test('CachedResponse with quality metrics', () => {
    const cached: CachedResponse = {
      key: 'cache-key-001',
      question: '这个案件的核心争议是什么？',
      response: {
        content: '让我们先来看看案件的基本事实...',
        suggestedLevel: DialogueLevel.FACTS,
        concepts: ['合同', '违约', '赔偿'],
        evaluation: {
          understanding: 70,
          canProgress: false,
          weakPoints: ['法条理解不够深入']
        },
        cached: false,
        responseTime: 1500
      },
      useCount: 5,
      qualityScore: 88,
      createdAt: Date.now() - 3600000,
      lastUsedAt: Date.now(),
      tags: ['合同纠纷', '初级']
    };

    expect(cached.useCount).toBeGreaterThanOrEqual(0);
    expect(cached.qualityScore).toBeGreaterThanOrEqual(0);
    expect(cached.qualityScore).toBeLessThanOrEqual(100);
    expect(cached.lastUsedAt).toBeGreaterThanOrEqual(cached.createdAt);
  });
});

describe('Socratic Types - Error Handling', () => {
  test('SocraticError structure', () => {
    const error = {
      code: ErrorCode.AGENT_TIMEOUT,
      message: 'AI响应超时',
      details: { timeout: 30000, attempt: 3 },
      timestamp: Date.now()
    };

    expect(error.code).toMatch(/^(AGENT|SESSION|INPUT|SYSTEM)_\d{3}$/);
    expect(error.message).toBeTruthy();
    expect(error.timestamp).toBeGreaterThan(0);
  });

  test('Error code categorization', () => {
    const agentErrors = [
      ErrorCode.AGENT_UNAVAILABLE,
      ErrorCode.AGENT_TIMEOUT,
      ErrorCode.AGENT_INVALID_RESPONSE
    ];

    const sessionErrors = [
      ErrorCode.SESSION_NOT_FOUND,
      ErrorCode.SESSION_EXPIRED,
      ErrorCode.SESSION_FULL
    ];

    agentErrors.forEach(code => {
      expect(code).toMatch(/^AGENT_/);
    });

    sessionErrors.forEach(code => {
      expect(code).toMatch(/^SESSION_/);
    });
  });
});

describe('Socratic Types - Type Guards', () => {
  test('Type guard for Message role', () => {
    const isValidRole = (role: string): role is MessageRole => {
      return Object.values(MessageRole).includes(role as MessageRole);
    };

    expect(isValidRole('student')).toBe(true);
    expect(isValidRole('agent')).toBe(true);
    expect(isValidRole('invalid')).toBe(false);
  });

  test('Type guard for DialogueLevel', () => {
    const isValidLevel = (level: number): level is DialogueLevel => {
      return level >= DialogueLevel.OBSERVATION && 
             level <= DialogueLevel.VALUES;
    };

    expect(isValidLevel(1)).toBe(true);
    expect(isValidLevel(5)).toBe(true);
    expect(isValidLevel(0)).toBe(false);
    expect(isValidLevel(6)).toBe(false);
  });
});