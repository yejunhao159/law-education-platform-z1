'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * 简化版苏格拉底对话组件
 * 核心理念：通过递进式提问训练法学思维
 */

interface SocraticQuestion {
  id: string;
  question: string;
  hint: string;
  keyPoints: string[];
  followUp?: string;
}

interface Props {
  caseContext: {
    facts: string[];
    laws: string[];
    dispute: string;
  };
}

export default function SimpleSocratic({ caseContext }: Props) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<SocraticQuestion | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [thinkingPath, setThinkingPath] = useState<string[]>([]);

  // 简化的法学思维训练问题 - 移除难度分级
  const questionBank: SocraticQuestion[] = [
    {
      id: 'q1',
      question: '请找出本案的核心争议点是什么？',
      hint: '想想双方当事人在哪个问题上存在根本分歧',
      keyPoints: ['争议焦点', '双方立场', '事实分歧'],
      followUp: '这个争议点涉及哪些法律要件？'
    },
    {
      id: 'q2',
      question: '原告主张的请求权基础是什么？',
      hint: '请求权基础 = 谁基于什么法律向谁主张什么',
      keyPoints: ['请求权主体', '法律依据', '请求内容'],
      followUp: '被告可能有哪些抗辩？'
    },
    {
      id: 'q3',
      question: '如果你是被告律师，你会如何反驳原告的主张？',
      hint: '考虑：事实层面、法律层面、证据层面',
      keyPoints: ['事实反驳', '法律抗辩', '证据质疑', '程序问题'],
      followUp: '原告如何应对这些反驳？'
    },
    {
      id: 'q4',
      question: '本案的关键证据是什么？其证明力如何？',
      hint: '证据三性：真实性、关联性、合法性',
      keyPoints: ['证据识别', '证明力评估', '证据链完整性'],
      followUp: '缺少这个证据会如何影响判决？'
    },
    {
      id: 'q5',
      question: '如果改变一个关键事实，判决结果会如何变化？',
      hint: '选择一个你认为最重要的事实进行假设',
      keyPoints: ['要件该当性', '因果关系', '法律效果'],
      followUp: '这说明了什么法律原理？'
    }
  ];

  useEffect(() => {
    if (questionBank.length > 0) {
      setCurrentQuestion(questionBank[0]);
    }
  }, []);

  const nextQuestion = () => {
    if (currentQuestionIndex < questionBank.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questionBank[nextIndex]);
      setStudentAnswer('');
      setShowHint(false);
      setFeedback('');
    }
  };

  const submitAnswer = () => {
    if (!studentAnswer.trim()) return;

    // 简化的反馈逻辑
    const keywordMatches = currentQuestion?.keyPoints.some(point =>
      studentAnswer.toLowerCase().includes(point.toLowerCase())
    ) || false;

    const feedback = keywordMatches
      ? '很好！你抓住了关键点。让我们继续深入思考...'
      : '思考得不错，但还可以从其他角度考虑。试试看提示？';

    setFeedback(feedback);
    setThinkingPath([...thinkingPath, studentAnswer]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">苏格拉底式法学思维训练</h2>
        <p className="text-gray-600">通过层层递进的提问，培养严谨的法学分析思维</p>
      </div>

      {/* 案例背景 */}
      <Card className="p-4 bg-blue-50">
        <h3 className="font-semibold mb-2">案例背景</h3>
        <div className="space-y-2 text-sm">
          <div><strong>争议焦点：</strong>{caseContext.dispute}</div>
          <div>
            <strong>关键事实：</strong>
            <ul className="list-disc list-inside ml-2">
              {caseContext.facts.map((fact, index) => (
                <li key={index}>{fact}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* 当前问题 */}
      {currentQuestion && (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">{currentQuestionIndex + 1}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>

              {/* 回答区域 */}
              <div className="space-y-4">
                <textarea
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="请在此处输入你的分析..."
                  className="w-full h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <div className="flex gap-2">
                  <Button onClick={submitAnswer} disabled={!studentAnswer.trim()}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    提交分析
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowHint(!showHint)}
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {showHint ? '隐藏提示' : '显示提示'}
                  </Button>

                  {feedback && (
                    <Button onClick={nextQuestion} className="ml-auto">
                      下一个问题
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 提示区域 */}
              {showHint && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-800">思考提示</div>
                      <div className="text-yellow-700 text-sm">{currentQuestion.hint}</div>
                      <div className="text-yellow-600 text-xs mt-1">
                        关键点：{currentQuestion.keyPoints.join('、')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 反馈区域 */}
              {feedback && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-green-800">{feedback}</div>
                  {currentQuestion.followUp && (
                    <div className="text-green-600 text-sm mt-2">
                      继续思考：{currentQuestion.followUp}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 思维路径 */}
      {thinkingPath.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">思维路径</h3>
          <div className="space-y-2">
            {thinkingPath.map((path, index) => (
              <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                <span className="font-medium">步骤 {index + 1}：</span>
                {path}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}