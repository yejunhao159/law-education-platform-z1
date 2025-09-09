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
  level: 'basic' | 'intermediate' | 'advanced';
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
  const [currentLevel, setCurrentLevel] = useState<'basic' | 'intermediate' | 'advanced'>('basic');
  const [currentQuestion, setCurrentQuestion] = useState<SocraticQuestion | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [thinkingPath, setThinkingPath] = useState<string[]>([]);

  // 法学思维训练的三个层次
  const questionBank: Record<string, SocraticQuestion[]> = {
    basic: [
      {
        id: 'b1',
        level: 'basic',
        question: '请找出本案的核心争议点是什么？',
        hint: '想想双方当事人在哪个问题上存在根本分歧',
        keyPoints: ['争议焦点', '双方立场', '事实分歧'],
        followUp: '这个争议点涉及哪些法律要件？'
      },
      {
        id: 'b2',
        level: 'basic',
        question: '原告主张的请求权基础是什么？',
        hint: '请求权基础 = 谁基于什么法律向谁主张什么',
        keyPoints: ['请求权主体', '法律依据', '请求内容'],
        followUp: '被告可能有哪些抗辩？'
      }
    ],
    intermediate: [
      {
        id: 'i1',
        level: 'intermediate',
        question: '如果你是被告律师，你会如何反驳原告的主张？',
        hint: '考虑：事实层面、法律层面、证据层面',
        keyPoints: ['事实反驳', '法律抗辩', '证据质疑', '程序问题'],
        followUp: '原告如何应对这些反驳？'
      },
      {
        id: 'i2',
        level: 'intermediate',
        question: '本案的关键证据是什么？其证明力如何？',
        hint: '证据三性：真实性、关联性、合法性',
        keyPoints: ['证据识别', '证明力评估', '证据链完整性'],
        followUp: '缺少这个证据会如何影响判决？'
      }
    ],
    advanced: [
      {
        id: 'a1',
        level: 'advanced',
        question: '如果改变一个关键事实，判决结果会如何变化？',
        hint: '选择一个你认为最重要的事实进行假设',
        keyPoints: ['要件该当性', '因果关系', '法律效果'],
        followUp: '这说明了什么法律原理？'
      },
      {
        id: 'a2',
        level: 'advanced',
        question: '本案判决可能产生什么社会影响？法官应如何平衡？',
        hint: '考虑：个案正义vs普遍正义、法律效果vs社会效果',
        keyPoints: ['利益衡量', '价值判断', '社会影响', '司法政策'],
        followUp: '如何确保判决的可接受性？'
      }
    ]
  };

  // 生成下一个问题
  const generateNextQuestion = () => {
    const questions = questionBank[currentLevel];
    const randomIndex = Math.floor(Math.random() * questions.length);
    setCurrentQuestion(questions[randomIndex]);
    setShowHint(false);
    setFeedback('');
    setStudentAnswer('');
  };

  // 简单的答案评估（实际应该调用AI）
  const evaluateAnswer = () => {
    if (!currentQuestion || !studentAnswer.trim()) return;

    // 检查是否包含关键点
    const hitPoints = currentQuestion.keyPoints.filter(point => 
      studentAnswer.includes(point)
    );

    const score = (hitPoints.length / currentQuestion.keyPoints.length) * 100;

    if (score >= 70) {
      setFeedback('🎯 excellent! 你抓住了关键要点。');
      
      // 记录思维路径
      setThinkingPath(prev => [...prev, `✓ ${currentQuestion.question}`]);
      
      // 进阶到下一级别
      if (currentLevel === 'basic' && thinkingPath.length >= 2) {
        setCurrentLevel('intermediate');
        setFeedback(feedback + ' 让我们深入一些...');
      } else if (currentLevel === 'intermediate' && thinkingPath.length >= 4) {
        setCurrentLevel('advanced');
        setFeedback(feedback + ' 准备好接受挑战了吗？');
      }
      
      // 2秒后显示追问
      if (currentQuestion.followUp) {
        setTimeout(() => {
          setCurrentQuestion({
            ...currentQuestion,
            question: currentQuestion.followUp!,
            id: currentQuestion.id + '-followup'
          });
          setStudentAnswer('');
        }, 2000);
      } else {
        setTimeout(generateNextQuestion, 2000);
      }
    } else if (score >= 40) {
      setFeedback('🤔 方向正确，但请考虑更多要点...');
      setShowHint(true);
    } else {
      setFeedback('💭 让我们换个角度思考...');
      setShowHint(true);
    }
  };

  // 初始化第一个问题
  useEffect(() => {
    generateNextQuestion();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 进度指示器 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium
            ${currentLevel === 'basic' ? 'bg-green-100 text-green-700' : 
              currentLevel === 'intermediate' ? 'bg-blue-100 text-blue-700' : 
              'bg-purple-100 text-purple-700'}`}>
            {currentLevel === 'basic' ? '基础理解' : 
             currentLevel === 'intermediate' ? '深度分析' : '批判思维'}
          </div>
          <div className="text-sm text-gray-500">
            已完成 {thinkingPath.length} 个思考点
          </div>
        </div>
      </div>

      {/* 案件背景提示 */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <div className="text-sm text-gray-600">
          <strong>争议焦点：</strong>{caseContext.dispute}
        </div>
      </Card>

      {/* 当前问题 */}
      {currentQuestion && (
        <Card className="p-6 shadow-lg">
          <div className="space-y-4">
            {/* 问题 */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                ?
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentQuestion.question}
                </h3>
              </div>
            </div>

            {/* 提示（按需显示） */}
            {showHint && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg">
                <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>提示：</strong>{currentQuestion.hint}
                </div>
              </div>
            )}

            {/* 答案输入区 */}
            <div className="space-y-3">
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="请输入你的分析...（尝试包含关键法律要件）"
                className="w-full min-h-[120px] p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {/* 关键词提示 */}
              <div className="flex flex-wrap gap-2">
                {currentQuestion.keyPoints.map((point, index) => (
                  <span 
                    key={index}
                    className={`px-2 py-1 text-xs rounded-full 
                      ${studentAnswer.includes(point) 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'}`}>
                    {point}
                  </span>
                ))}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex items-center justify-between">
              <Button
                onClick={evaluateAnswer}
                disabled={!studentAnswer.trim()}
                className="flex items-center space-x-2"
              >
                <span>提交思考</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowHint(!showHint)}
                className="text-sm"
              >
                {showHint ? '隐藏提示' : '需要提示'}
              </Button>
            </div>

            {/* 反馈 */}
            {feedback && (
              <div className={`p-4 rounded-lg flex items-start space-x-2
                ${feedback.includes('excellent') ? 'bg-green-50 text-green-800' :
                  feedback.includes('正确') ? 'bg-blue-50 text-blue-800' :
                  'bg-yellow-50 text-yellow-800'}`}>
                {feedback.includes('excellent') ? 
                  <CheckCircle className="w-5 h-5 mt-0.5" /> :
                  <AlertCircle className="w-5 h-5 mt-0.5" />}
                <div>{feedback}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 思维路径记录 */}
      {thinkingPath.length > 0 && (
        <Card className="p-4 bg-blue-50">
          <h4 className="font-medium mb-2 text-blue-900">你的思维路径</h4>
          <div className="space-y-1">
            {thinkingPath.map((path, index) => (
              <div key={index} className="text-sm text-blue-700">
                {path}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}