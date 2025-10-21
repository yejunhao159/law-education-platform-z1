/**
 * 四幕教学域类型定义
 * DeepPractice Standards Compliant
 */

import { z } from 'zod';

import { BaseEntitySchema } from '../shared/base';

// ========== 四幕类型 ==========
export const ActTypeSchema = z.enum(['upload', 'analysis', 'socratic', 'summary']);

// ========== 幕状态 ==========
export const ActStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'skipped']);

// ========== 单幕定义 ==========
export const ActDefinitionSchema = z.object({
  id: ActTypeSchema,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  progress: z.number().min(0).max(100),
  estimatedDuration: z.number().optional(), // 预估时长（分钟）
  prerequisites: z.array(ActTypeSchema).optional(), // 前置要求
});

// ========== 幕状态跟踪 ==========
export const ActStateSchema = z.object({
  actId: ActTypeSchema,
  status: ActStatusSchema,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).default(0),
  data: z.record(z.unknown()).optional(), // 各幕特有数据
  errors: z.array(z.string()).optional(),
});

// ========== 教学进度 ==========
export const TeachingProgressSchema = BaseEntitySchema.extend({
  caseId: z.string(),
  currentAct: ActTypeSchema,
  acts: z.array(ActStateSchema),
  overallProgress: z.number().min(0).max(100),
  startedAt: z.string().datetime(),
  estimatedCompletion: z.string().datetime().optional(),
  teachingMode: z.enum(['self_paced', 'guided', 'collaborative']).default('guided'),
});

// ========== 故事章节（第二幕特有） ==========
export const StoryChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  order: z.number(),
});

// ========== 分析结果（第二幕输出） ==========
export const DeepAnalysisResultSchema = z.object({
  factAnalysis: z.object({
    keyFacts: z.array(z.string()),
    disputedPoints: z.array(z.string()),
    timeline: z.array(z.object({
      date: z.string(),
      event: z.string(),
      importance: z.enum(['critical', 'important', 'normal']),
    })),
  }),
  evidenceAnalysis: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  legalAnalysis: z.object({
    applicableLaws: z.array(z.string()),
    precedents: z.array(z.string()),
    risks: z.array(z.string()),
  }),

  // 🆕 新增：AI故事章节（智能叙事）
  narrative: z.object({
    chapters: z.array(StoryChapterSchema),
    generatedAt: z.string().datetime().optional(),
    fallbackUsed: z.boolean().optional(),
    errorMessage: z.string().optional(),
  }).optional(),

  // 🆕 新增：证据学习问题
  evidenceQuestions: z.array(z.object({
    id: z.string(),
    evidenceId: z.string(),
    question: z.string(),
    questionType: z.enum(['type', 'burden', 'relevance', 'admissibility', 'strength']),
    options: z.array(z.string()),
    correctAnswer: z.number(),
    explanation: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    points: z.number().optional(),
  })).optional(),

  // 🆕 新增：请求权分析结果
  claimAnalysis: z.object({
    claims: z.array(z.object({
      id: z.string(),
      basis: z.string(),
      basisText: z.string().optional(),
      type: z.enum(['primary', 'alternative', 'subsidiary']),
      elements: z.array(z.object({
        name: z.string(),
        description: z.string(),
        satisfied: z.boolean(),
        evidence: z.array(z.string()),
        analysis: z.string().optional(),
      })),
      conclusion: z.enum(['established', 'partial', 'failed']),
      reasoning: z.string().optional(),
      priority: z.number().optional(),
    })),
    defenses: z.array(z.object({
      id: z.string(),
      type: z.enum(['denial', 'excuse', 'objection', 'counterclaim']),
      basis: z.string(),
      description: z.string(),
      evidence: z.array(z.string()),
      impact: z.enum(['blocks-claim', 'reduces-claim', 'no-impact']),
    })).optional(),
    strategy: z.object({
      recommendations: z.array(z.string()),
      risks: z.array(z.string()),
      opportunities: z.array(z.string()),
    }).optional(),
  }).optional(),

  // 🆕 新增：时间线AI分析（保存完整的TimelineAnalysis结果）
  timelineAnalysis: z.record(z.unknown()).optional(),
});

// ========== 学习报告（第四幕输出） ==========
export const LearningReportSchema = z.object({
  summary: z.string(),
  keyLearnings: z.array(z.string()),
  skillsAssessed: z.array(z.object({
    skill: z.string(),
    level: z.enum(['novice', 'intermediate', 'advanced']),
    evidence: z.array(z.string()),
  })),
  recommendations: z.array(z.string()),
  nextSteps: z.array(z.string()),
  generatedAt: z.string().datetime(),
});

// ========== 案件学习报告（MVP版） ==========
export const CaseLearningReportSchema = z.object({
  caseOverview: z.object({
    title: z.string(),
    oneLineSummary: z.string(),
    keyDispute: z.string(),
    judgmentResult: z.string(),
  }),
  learningPoints: z.object({
    factualInsights: z.array(z.string()).max(3),
    legalPrinciples: z.array(z.string()).max(3),
    evidenceHandling: z.array(z.string()).max(3),
  }),
  socraticHighlights: z.object({
    keyQuestions: z.array(z.string()).max(3),
    studentInsights: z.array(z.string()).max(3),
    criticalThinking: z.array(z.string()).max(3),
  }),
  practicalTakeaways: z.object({
    similarCases: z.string(),
    cautionPoints: z.array(z.string()).max(3),
    checkList: z.array(z.string()).max(3),
  }),
  metadata: z.object({
    studyDuration: z.number(),
    completionDate: z.string().datetime(),
    difficultyLevel: z.enum(['简单', '中等', '困难']),
  }),
});

// ========== 教学会话 ==========
export const TeachingSessionSchema = BaseEntitySchema.extend({
  title: z.string(),
  description: z.string().optional(),
  teacherId: z.string().optional(),
  studentIds: z.array(z.string()),
  caseId: z.string(),
  progress: TeachingProgressSchema,
  settings: z.object({
    allowSkipping: z.boolean().default(false),
    timeLimit: z.number().optional(), // 总时长限制（分钟）
    autoAdvance: z.boolean().default(false),
    collaborativeMode: z.boolean().default(false),
  }),
  metadata: z.object({
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedDuration: z.number(), // 预估总时长（分钟）
    tags: z.array(z.string()).optional(),
  }),
});

// ========== TypeScript类型导出 ==========
export type ActType = z.infer<typeof ActTypeSchema>;
export type ActStatus = z.infer<typeof ActStatusSchema>;
export type ActDefinition = z.infer<typeof ActDefinitionSchema>;
export type ActState = z.infer<typeof ActStateSchema>;
export type TeachingProgress = z.infer<typeof TeachingProgressSchema>;
export type StoryChapter = z.infer<typeof StoryChapterSchema>;
export type DeepAnalysisResult = z.infer<typeof DeepAnalysisResultSchema>;
export type LearningReport = z.infer<typeof LearningReportSchema>;
export type CaseLearningReport = z.infer<typeof CaseLearningReportSchema>;
export type TeachingSession = z.infer<typeof TeachingSessionSchema>;

// ========== 四幕定义常量 ==========
export const FOUR_ACTS: ActDefinition[] = [
  {
    id: 'upload',
    name: '案例导入',
    description: '上传判决书并智能解析',
    icon: 'Upload',
    progress: 25,
    estimatedDuration: 10,
  },
  {
    id: 'analysis',
    name: '深度分析',
    description: '事实认定 • 争点聚焦 • 证据链',
    icon: 'Brain',
    progress: 50,
    estimatedDuration: 30,
    prerequisites: ['upload'],
  },
  {
    id: 'socratic',
    name: '苏格拉底讨论',
    description: 'AI引导式深度思辨',
    icon: 'MessageCircle',
    progress: 75,
    estimatedDuration: 45,
    prerequisites: ['analysis'],
  },
  {
    id: 'summary',
    name: '总结提升',
    description: '判决分析 • 学习报告',
    icon: 'Gavel',
    progress: 100,
    estimatedDuration: 20,
    prerequisites: ['socratic'],
  },
];

// ========== 验证函数 ==========
export const validateTeachingSession = (data: unknown): TeachingSession => {
  return TeachingSessionSchema.parse(data);
};

export const validateActState = (data: unknown): ActState => {
  return ActStateSchema.parse(data);
};

// ========== 工厂函数 ==========
export const createActState = (actId: ActType): ActState => ({
  actId,
  status: 'pending',
  progress: 0,
});

export const createTeachingProgress = (caseId: string): TeachingProgress => ({
  id: crypto.randomUUID(),
  caseId,
  currentAct: 'upload',
  acts: FOUR_ACTS.map(act => createActState(act.id)),
  overallProgress: 0,
  startedAt: new Date().toISOString(),
  teachingMode: 'guided',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ========== 工具函数 ==========
export const getActByType = (actType: ActType): ActDefinition | undefined => {
  return FOUR_ACTS.find(act => act.id === actType);
};

export const getNextAct = (currentAct: ActType): ActType | null => {
  const currentIndex = FOUR_ACTS.findIndex(act => act.id === currentAct);
  if (currentIndex >= 0 && currentIndex < FOUR_ACTS.length - 1) {
    return FOUR_ACTS[currentIndex + 1]?.id || null;
  }
  return null;
};

export const canAdvanceToAct = (targetAct: ActType, completedActs: ActType[]): boolean => {
  const act = getActByType(targetAct);
  if (!act?.prerequisites) return true;

  return act.prerequisites.every(prereq => completedActs.includes(prereq));
};