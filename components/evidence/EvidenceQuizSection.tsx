/**
 * 证据学习问答组件
 * 基于时间轴事件中的证据信息自动生成学习问题
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  RotateCcw,
  ChevronRight,
  Lightbulb,
  FileText,
  Scale,
  Users
} from 'lucide-react';

import type {
  EvidenceQuizSectionProps,
  EvidenceQuizSession,
  EvidenceQuiz,
  Evidence,
  TimelineEvent
} from '@/types/timeline-claim-analysis';

export function EvidenceQuizSection({
  evidences = [],
  autoGenerate = true,
  maxQuizzes = 5,
  onSessionComplete,
  onAnswerSubmit,
  className = ''
}: EvidenceQuizSectionProps) {
  const [session, setSession] = useState<EvidenceQuizSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAnswers, setCurrentAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  // 自动生成问答题目
  useEffect(() => {
    if (autoGenerate && !session) {
      // 如果没有传入证据数据，使用模拟证据数据进行演示
      if (evidences.length === 0) {
        generateQuizzesWithMockData();
      } else {
        generateQuizzes();
      }
    }
  }, [autoGenerate, evidences]);

  const generateQuizzes = async () => {
    setIsGenerating(true);

    try {
      // 模拟从证据生成问答题目的过程
      const generatedQuizzes = await generateQuizzesFromEvidence(evidences, maxQuizzes);

      const newSession: EvidenceQuizSession = {
        id: `quiz_${Date.now()}`,
        startTime: new Date().toISOString(),
        currentQuizIndex: 0,
        quizzes: generatedQuizzes,
        userAnswers: [],
        score: 0,
        totalPossibleScore: generatedQuizzes.reduce((sum, quiz) => sum + (quiz.points || 10), 0),
        completed: false
      };

      setSession(newSession);
      setCurrentAnswers(new Array(generatedQuizzes.length).fill(-1));
      setStartTime(Date.now());
    } catch (error) {
      console.error('生成证据问答失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQuizzesWithMockData = async () => {
    setIsGenerating(true);

    try {
      // 创建模拟证据数据
      const mockEvidences: Evidence[] = [
        {
          id: 'mock_evidence_1',
          title: '购销合同',
          description: '原告与被告于2023年3月1日签署的设备购销合同',
          content: '甲方（买方）：XX公司，乙方（卖方）：YY企业。约定设备价格100万元，交付时间2023年5月1日...',
          type: 'documentary',
          relatedEvents: ['event_1'],
          metadata: {
            source: '案件材料',
            dateCreated: '2023-03-01',
            author: '合同当事人'
          }
        },
        {
          id: 'mock_evidence_2',
          title: '银行转账记录',
          description: '原告向被告支付货款的银行转账凭证',
          content: '转账日期：2023年3月15日，转账金额：50万元，付款方：XX公司，收款方：YY企业',
          type: 'documentary',
          relatedEvents: ['event_2'],
          metadata: {
            source: '银行系统',
            dateCreated: '2023-03-15'
          }
        },
        {
          id: 'mock_evidence_3',
          title: '质量检验报告',
          description: '第三方检测机构出具的设备质量检验报告',
          content: '检验结论：设备不符合合同约定的技术标准，存在质量缺陷...',
          type: 'expert',
          relatedEvents: ['event_3'],
          metadata: {
            source: '检测机构',
            dateCreated: '2023-06-10',
            author: 'XX检测中心'
          }
        }
      ];

      const generatedQuizzes = await generateQuizzesFromEvidence(mockEvidences, maxQuizzes);

      const newSession: EvidenceQuizSession = {
        id: `quiz_mock_${Date.now()}`,
        startTime: new Date().toISOString(),
        currentQuizIndex: 0,
        quizzes: generatedQuizzes,
        userAnswers: [],
        score: 0,
        totalPossibleScore: generatedQuizzes.reduce((sum, quiz) => sum + (quiz.points || 10), 0),
        completed: false
      };

      setSession(newSession);
      setCurrentAnswers(new Array(generatedQuizzes.length).fill(-1));
      setStartTime(Date.now());
    } catch (error) {
      console.error('生成模拟证据问答失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (quizIndex: number, selectedAnswer: number) => {
    const newAnswers = [...currentAnswers];
    newAnswers[quizIndex] = selectedAnswer;
    setCurrentAnswers(newAnswers);
  };

  const handleSubmitQuiz = (quizIndex: number) => {
    if (!session || currentAnswers[quizIndex] === -1) return;

    const quiz = session.quizzes[quizIndex];
    const selectedAnswer = currentAnswers[quizIndex];
    const isCorrect = selectedAnswer === quiz.correctAnswer;
    const timeSpent = Date.now() - startTime;

    const userAnswer = {
      quizId: quiz.id,
      selectedAnswer,
      isCorrect,
      timeSpent
    };

    const updatedSession = {
      ...session,
      userAnswers: [...session.userAnswers, userAnswer],
      score: session.score + (isCorrect ? (quiz.points || 10) : 0),
      currentQuizIndex: Math.min(quizIndex + 1, session.quizzes.length)
    };

    setSession(updatedSession);
    onAnswerSubmit?.(quiz.id, selectedAnswer);

    // 如果是最后一题，标记完成
    if (quizIndex === session.quizzes.length - 1) {
      const finalSession = { ...updatedSession, completed: true };
      setSession(finalSession);
      setShowResults(true);
      onSessionComplete?.(finalSession);
    }
  };

  const handleRestart = () => {
    setSession(null);
    setCurrentAnswers([]);
    setShowResults(false);
    setStartTime(0);
    if (autoGenerate) {
      generateQuizzes();
    }
  };

  const getDifficultyColor = (difficulty: EvidenceQuiz['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-50';
      case 'intermediate': return 'text-blue-600 bg-blue-50';
      case 'advanced': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getQuestionTypeIcon = (type: EvidenceQuiz['questionType']) => {
    switch (type) {
      case 'type': return FileText;
      case 'burden': return Users;
      case 'relevance': return Scale;
      case 'admissibility': return CheckCircle;
      case 'strength': return Star;
      default: return BookOpen;
    }
  };

  if (isGenerating) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Brain className="w-8 h-8 text-blue-600" />
          </motion.div>
          <p className="mt-4 text-lg font-medium text-gray-700">AI正在生成证据学习问题...</p>
          <p className="text-sm text-gray-500 mt-1">基于时间轴事件分析证据特征</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无证据学习内容</h3>
          <p className="text-sm text-gray-500">请先分析时间轴事件以获取证据信息</p>
          <Button onClick={generateQuizzes} className="mt-4">
            开始证据学习
          </Button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const accuracy = session.userAnswers.length > 0
      ? (session.userAnswers.filter(a => a.isCorrect).length / session.userAnswers.length) * 100
      : 0;

    return (
      <div className={`space-y-4 ${className}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">学习完成！</h3>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(accuracy)}%</div>
              <div className="text-xs text-gray-500">正确率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{session.score}</div>
              <div className="text-xs text-gray-500">得分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{session.quizzes.length}</div>
              <div className="text-xs text-gray-500">题目</div>
            </div>
          </div>
          <Button onClick={handleRestart} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            重新开始
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentQuiz = session.quizzes[session.currentQuizIndex];
  const progress = ((session.currentQuizIndex + 1) / session.quizzes.length) * 100;
  const userAnswer = session.userAnswers.find(a => a.quizId === currentQuiz?.id);
  const hasAnswered = userAnswer !== undefined;

  if (!currentQuiz) return null;

  const QuestionIcon = getQuestionTypeIcon(currentQuiz.questionType);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 进度条 */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {session.currentQuizIndex + 1} / {session.quizzes.length}
        </span>
      </div>

      {/* 当前题目 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuiz.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-blue-100">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <QuestionIcon className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">证据分析问题</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(currentQuiz.difficulty)}>
                    {currentQuiz.difficulty === 'beginner' ? '基础' :
                     currentQuiz.difficulty === 'intermediate' ? '中级' : '高级'}
                  </Badge>
                  <Badge variant="outline">
                    {currentQuiz.points || 10} 分
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* 证据信息 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm">相关证据</span>
                </div>
                <p className="text-sm text-gray-700">
                  {currentQuiz.evidence.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentQuiz.evidence.description}
                </p>
              </div>

              {/* 问题 */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">{currentQuiz.question}</h4>

                {/* 选项 */}
                <div className="space-y-2">
                  {currentQuiz.options.map((option, index) => {
                    const isSelected = currentAnswers[session.currentQuizIndex] === index;
                    const isCorrect = index === currentQuiz.correctAnswer;
                    const showAnswer = hasAnswered;

                    let buttonClass = "text-left p-3 border-2 rounded-lg transition-all duration-200 ";

                    if (showAnswer) {
                      if (isCorrect) {
                        buttonClass += "border-green-500 bg-green-50 text-green-800";
                      } else if (isSelected && !isCorrect) {
                        buttonClass += "border-red-500 bg-red-50 text-red-800";
                      } else {
                        buttonClass += "border-gray-200 bg-gray-50 text-gray-600";
                      }
                    } else {
                      if (isSelected) {
                        buttonClass += "border-blue-500 bg-blue-50 text-blue-800";
                      } else {
                        buttonClass += "border-gray-200 hover:border-gray-300 hover:bg-gray-50";
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => !hasAnswered && handleAnswerSelect(session.currentQuizIndex, index)}
                        disabled={hasAnswered}
                        className={buttonClass}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option}</span>
                          {showAnswer && isCorrect && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                          {showAnswer && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 答案解释 */}
              {hasAnswered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm text-blue-800">解析</span>
                  </div>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    {currentQuiz.explanation}
                  </p>
                </motion.div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>题目 {session.currentQuizIndex + 1}</span>
                </div>

                {!hasAnswered ? (
                  <Button
                    onClick={() => handleSubmitQuiz(session.currentQuizIndex)}
                    disabled={currentAnswers[session.currentQuizIndex] === -1}
                    className="gap-2"
                  >
                    提交答案
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (session.currentQuizIndex < session.quizzes.length - 1) {
                        setSession({
                          ...session,
                          currentQuizIndex: session.currentQuizIndex + 1
                        });
                      } else {
                        setShowResults(true);
                      }
                    }}
                    className="gap-2"
                  >
                    {session.currentQuizIndex < session.quizzes.length - 1 ? '下一题' : '查看结果'}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * 🚀 AI智能证据学习问题生成函数 - 真实版
 * 基于真实证据内容和案例上下文，调用AI服务生成专业的证据法学习问题
 */
async function generateQuizzesFromEvidence(evidences: Evidence[], maxCount: number): Promise<EvidenceQuiz[]> {
  try {
    console.log('🎯 开始AI智能生成证据学习问题', {
      evidenceCount: evidences.length,
      maxQuestions: maxCount
    });

    // 构建AI请求数据
    const requestData = {
      evidence: evidences.map(e => ({
        id: e.id,
        content: e.description || e.title,
        type: e.type || 'document'
      })),
      claimElements: evidences.map(e => ({
        id: e.id,
        name: e.title,
        description: e.description || e.title,
        type: e.type || 'fact'
      })),
      mode: 'generate-questions',
      config: {
        targetLevel: 'intermediate',
        focusAreas: ['relevance', 'admissibility', 'probative-value'],
        questionTypes: ['single-choice', 'multiple-choice'],
        maxQuestions: maxCount,
        includeExplanations: true
      },
      caseContext: {
        basicInfo: {
          caseType: 'civil',
          summary: '基于时间轴事件的证据学习'
        }
      }
    };

    console.log('📡 调用AI证据学习问题生成API...');

    // 调用AI增强的证据质量评估API（生成问题模式）
    const response = await fetch('/api/evidence-quality', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'AI生成失败');
    }

    console.log('✅ AI问题生成成功', {
      generatedCount: result.questions?.length || 0,
      mode: result.mode
    });

    // 转换AI生成的问题为组件期望的格式
    const aiQuestions = result.questions || [];
    const quizzes: EvidenceQuiz[] = aiQuestions.map((q: any, index: number) => ({
      id: q.id || `ai_quiz_${index}`,
      evidenceId: q.relatedEvidence?.[0] || evidences[index % evidences.length]?.id,
      evidence: evidences.find(e => e.id === q.relatedEvidence?.[0]) || evidences[index % evidences.length],
      questionType: mapFocusAreaToQuestionType(q.focusArea),
      question: q.question,
      options: q.options || ['选项A', '选项B', '选项C', '选项D'],
      correctAnswer: getCorrectAnswerIndex(q.correctAnswer, q.options),
      explanation: q.explanation || '专业解释',
      points: Math.round((q.difficulty || 0.5) * 20), // 基于难度计算分数
      difficulty: mapAILevelToQuizLevel(q.level),
      metadata: {
        evidenceTitle: evidences.find(e => e.id === q.relatedEvidence?.[0])?.title || '相关证据',
        evidenceType: evidences.find(e => e.id === q.relatedEvidence?.[0])?.type || 'document',
        timeGenerated: new Date().toISOString(),
        source: 'ai-generated',
        legalBasis: q.legalBasis || [],
        teachingPoints: q.teachingPoints || [],
        aiConfidence: q.difficulty || 0.5
      }
    }));

    // 如果AI生成的问题数量不足，用备选问题补充
    if (quizzes.length < maxCount) {
      const additionalQuizzes = generateFallbackQuizzes(
        evidences,
        maxCount - quizzes.length,
        quizzes.length
      );
      quizzes.push(...additionalQuizzes);
    }

    console.log('🎉 证据学习问题生成完成', {
      totalQuizzes: quizzes.length,
      aiGenerated: aiQuestions.length,
      fallbackGenerated: quizzes.length - aiQuestions.length
    });

    return quizzes.slice(0, maxCount);

  } catch (error) {
    console.error('❌ AI证据学习问题生成失败:', error);

    // 使用备选问题生成逻辑
    console.log('🔄 切换到备选问题生成逻辑...');
    return generateFallbackQuizzes(evidences, maxCount, 0);
  }
}

/**
 * 备选问题生成逻辑（当AI服务不可用时）
 */
function generateFallbackQuizzes(evidences: Evidence[], count: number, startIndex: number): EvidenceQuiz[] {
  const questionTemplates = [
    {
      type: 'relevance' as const,
      template: '该证据与案件争议的关联性程度如何？',
      options: ['直接关联', '间接关联', '关联性较弱', '无关联'],
      correctAnswer: 0,
      difficulty: 'beginner' as const
    },
    {
      type: 'admissibility' as const,
      template: '该证据的可采纳性如何？',
      options: ['完全可采纳', '部分可采纳', '不可采纳', '需要补强'],
      correctAnswer: 0,
      difficulty: 'intermediate' as const
    },
    {
      type: 'strength' as const,
      template: '该证据的证明力强度如何？',
      options: ['证明力很强', '证明力中等', '证明力较弱', '无证明力'],
      correctAnswer: 1,
      difficulty: 'intermediate' as const
    },
    {
      type: 'burden' as const,
      template: '关于该证据的举证责任，下列说法正确的是？',
      options: ['原告承担', '被告承担', '双方共同承担', '法院调查取证'],
      correctAnswer: 0,
      difficulty: 'advanced' as const
    }
  ];

  const quizzes: EvidenceQuiz[] = [];

  for (let i = 0; i < count && i < evidences.length; i++) {
    const evidence = evidences[i];
    const template = questionTemplates[i % questionTemplates.length];

    const quiz: EvidenceQuiz = {
      id: `fallback_quiz_${startIndex + i}_${evidence.id}`,
      evidenceId: evidence.id,
      evidence,
      questionType: template.type,
      question: `关于证据"${evidence.title}"：${template.template}`,
      options: template.options,
      correctAnswer: template.correctAnswer,
      explanation: `关于证据"${evidence.title}"的专业分析：${getExplanationForType(template.type)}`,
      points: template.difficulty === 'beginner' ? 5 : template.difficulty === 'intermediate' ? 10 : 15,
      difficulty: template.difficulty,
      metadata: {
        evidenceTitle: evidence.title,
        evidenceType: evidence.type || 'document',
        timeGenerated: new Date().toISOString(),
        source: 'fallback-generated'
      }
    };

    quizzes.push(quiz);
  }

  return quizzes;
}

/**
 * 辅助函数：映射AI焦点领域到问题类型
 */
function mapFocusAreaToQuestionType(focusArea: string): EvidenceQuiz['questionType'] {
  switch (focusArea) {
    case 'relevance': return 'relevance';
    case 'admissibility': return 'admissibility';
    case 'probative-value': return 'strength';
    case 'authentication': return 'type';
    default: return 'relevance';
  }
}

/**
 * 辅助函数：映射AI级别到问答难度
 */
function mapAILevelToQuizLevel(level: string): EvidenceQuiz['difficulty'] {
  switch (level) {
    case 'beginner': return 'beginner';
    case 'intermediate': return 'intermediate';
    case 'advanced': return 'advanced';
    default: return 'intermediate';
  }
}

/**
 * 辅助函数：获取正确答案索引
 */
function getCorrectAnswerIndex(correctAnswer: string | string[], options: string[]): number {
  if (Array.isArray(correctAnswer)) {
    // 多选题处理（暂时返回第一个选项）
    return options.indexOf(correctAnswer[0]) !== -1 ? options.indexOf(correctAnswer[0]) : 0;
  }

  const index = options.indexOf(correctAnswer);
  return index !== -1 ? index : 0;
}

/**
 * 辅助函数：根据问题类型生成解释
 */
function getExplanationForType(type: string): string {
  switch (type) {
    case 'relevance':
      return '证据的相关性是指证据与待证事实之间的客观联系。相关性是证据的基本属性，只有与案件事实相关的材料才能作为证据使用。';
    case 'admissibility':
      return '证据的可采性是指证据是否符合法定的采纳条件。不可采的证据不能在法庭上提出或不能作为认定事实的依据。';
    case 'strength':
      return '证据的证明力是指证据对案件事实的证明价值和说服力。证明力的强弱直接影响法官对案件事实的认定。';
    case 'burden':
      return '举证责任是指当事人对自己提出的主张有责任提供证据加以证明的法律责任。一般遵循"谁主张，谁举证"的原则。';
    default:
      return '这是证据法领域的专业问题，需要结合具体证据内容和法律规定进行分析。';
  }
}