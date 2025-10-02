/**
 * 学生端课堂视图
 * 实时接收教师问题，投票/输入答案
 */
'use client';

import { use, useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

interface Question {
  id: string;
  content: string;
  type: 'vote' | 'text';
  options?: string[]; // 投票选项 (如 ["A", "B", "C", "D"])
  timestamp: string;
}

export default function StudentClassroomPage({ params }: PageProps) {
  const { code } = use(params);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 连接SSE接收教师问题
  useEffect(() => {
    const eventSource = new EventSource(`/api/classroom/${code}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'question') {
          setQuestion(data.question);
          setAnswer('');
          setSelectedOption('');
          setHasSubmitted(false);
        }
      } catch (error) {
        console.error('解析SSE数据失败:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error);
      eventSource.close();

      // 3秒后重连
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    };

    return () => {
      eventSource.close();
    };
  }, [code]);

  // 提交答案
  const handleSubmit = async () => {
    if (!question) return;

    const finalAnswer = question.type === 'vote' ? selectedOption : answer;
    if (!finalAnswer.trim()) {
      alert('请先选择或输入答案');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/classroom/${code}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question.id,
          answer: finalAnswer,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setHasSubmitted(true);
      } else {
        alert('提交失败，请重试');
      }
    } catch (error) {
      console.error('提交答案失败:', error);
      alert('提交失败，请检查网络');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* 顶部状态栏 */}
      <div className="max-w-2xl mx-auto mb-4">
        <Card className="p-4 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">
                课堂: {code}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              实时连接中
            </span>
          </div>
        </Card>
      </div>

      {/* 主内容区 */}
      <div className="max-w-2xl mx-auto">
        {!question ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              等待教师提问...
            </h2>
            <p className="text-sm text-gray-500">
              请保持页面打开，新问题会自动显示
            </p>
          </Card>
        ) : (
          <Card className="p-6">
            {/* 问题内容 */}
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    教师提问
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {question.content}
                  </p>
                </div>
              </div>
            </div>

            {/* 投票选项 */}
            {question.type === 'vote' && question.options && (
              <div className="space-y-3 mb-6">
                {question.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedOption(option)}
                    disabled={hasSubmitted}
                    className={`
                      w-full p-4 rounded-lg border-2 transition-all text-left
                      ${selectedOption === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                      }
                      ${hasSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span className="font-medium">{option}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 文本输入框 */}
            {question.type === 'text' && (
              <div className="mb-6">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={hasSubmitted}
                  placeholder="请输入你的回答..."
                  className="min-h-[120px] resize-none"
                />
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || hasSubmitted}
                className="flex-1"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    提交中...
                  </>
                ) : hasSubmitted ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    已提交
                  </>
                ) : (
                  '提交答案'
                )}
              </Button>
            </div>

            {hasSubmitted && (
              <p className="text-sm text-green-600 text-center mt-4">
                ✓ 答案已发送给教师
              </p>
            )}
          </Card>
        )}
      </div>

      {/* 底部提示 */}
      <div className="max-w-2xl mx-auto mt-6 text-center">
        <p className="text-xs text-gray-400">
          保持页面打开以接收新问题
        </p>
      </div>
    </div>
  );
}
