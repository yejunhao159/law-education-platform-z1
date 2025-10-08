/**
 * 实时课堂互动面板
 * 通过Socket.IO实现教师端实时互动
 * @description 去除轮询逻辑，改用WebSocket实时推送
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Users,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Answer {
  questionId: string;
  answer: string;
  timestamp: string;
  studentId?: string;
}

interface Question {
  id: string;
  content: string;
  type: 'vote' | 'text';
  options?: string[];
  timestamp: string;
}

interface RealtimeClassroomPanelProps {
  /** 课堂代码 */
  classroomCode: string;
  /** AI生成的建议问题 */
  suggestedQuestion?: string;
  /** 问题发布成功回调 */
  onQuestionPublished?: (_question: Question) => void;
  /** 收到答案回调 */
  onAnswersReceived?: (_answers: Answer[]) => void;
}

export function RealtimeClassroomPanel({
  classroomCode,
  suggestedQuestion,
  onQuestionPublished,
  onAnswersReceived
}: RealtimeClassroomPanelProps) {
  const [questionContent, setQuestionContent] = useState('');
  const [questionType, setQuestionType] = useState<'vote' | 'text'>('vote');
  const [options, setOptions] = useState(['A. 是', 'B. 否', 'C. 不确定']);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 使用AI建议的问题
  useEffect(() => {
    if (suggestedQuestion && !questionContent) {
      setQuestionContent(suggestedQuestion);
    }
  }, [suggestedQuestion, questionContent]);

  // ✅ Socket.IO连接（替代轮询）
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
                      (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001');

    console.log('🔌 [教师端] 连接Socket.IO:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ [教师端] Socket.IO已连接');
      setIsConnected(true);
      newSocket.emit('join-classroom', classroomCode);
    });

    // ✅ 实时接收学生答案（不再轮询！）
    newSocket.on('new-answer', (answer) => {
      console.log('💬 [教师端] 收到学生答案:', answer);
      setAnswers(prev => {
        const newAnswers = [...prev, answer];
        onAnswersReceived?.(newAnswers);
        return newAnswers;
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ [教师端] Socket.IO断开');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomCode]);

  // ✅ 发布问题（通过Socket.IO）
  const handlePublishQuestion = () => {
    if (!questionContent.trim()) {
      alert('请输入问题内容');
      return;
    }

    if (!socket || !isConnected) {
      alert('Socket.IO未连接，请稍后重试');
      return;
    }

    setIsPublishing(true);

    const question: Question = {
      id: Date.now().toString(),
      content: questionContent,
      type: questionType,
      options: questionType === 'vote' ? options : undefined,
      timestamp: new Date().toISOString()
    };

    // 通过Socket.IO实时发布
    socket.emit('publish-question', {
      code: classroomCode,
      question
    });

    // 监听发布确认
    socket.once('question-published', (data) => {
      console.log('✅ [教师端] 问题已发布:', data);
      setCurrentQuestion(question);
      setAnswers([]); // 清空之前的答案
      onQuestionPublished?.(question);
      setQuestionContent('');
      setIsPublishing(false);
    });

    // 设置超时
    setTimeout(() => {
      if (isPublishing) {
        setIsPublishing(false);
        alert('发布超时，请重试');
      }
    }, 5000);
  };

  // 统计答案分布
  const getAnswerStats = () => {
    if (questionType === 'text') {
      return answers.length;
    }

    // 投票统计
    const stats: Record<string, number> = {};
    answers.forEach(ans => {
      stats[ans.answer] = (stats[ans.answer] || 0) + 1;
    });

    return Object.entries(stats).map(([option, count]) => ({
      option,
      count,
      percentage: Math.round((count / answers.length) * 100)
    }));
  };

  const stats = questionType === 'vote' && Array.isArray(getAnswerStats())
    ? getAnswerStats() as Array<{option: string, count: number, percentage: number}>
    : [];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            实时课堂互动
            {isConnected && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
          </CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {answers.length} 人已回答
          </Badge>
        </div>
        <CardDescription>
          {isConnected ? 'Socket.IO 已连接 - 实时推送' : '连接中...'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="publish" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="publish">发布问题</TabsTrigger>
            <TabsTrigger value="answers">
              查看答案
              {answers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {answers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 发布问题Tab */}
          <TabsContent value="publish" className="space-y-4">
            {suggestedQuestion && (
              <Alert>
                <Separator className="mb-2" />
                <AlertDescription className="space-y-2">
                  <div className="text-sm font-medium">AI建议的问题:</div>
                  <div className="text-sm text-muted-foreground italic">
                    &ldquo;{suggestedQuestion}&rdquo;
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuestionContent(suggestedQuestion)}
                  >
                    使用此问题
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">问题类型</label>
              <div className="flex gap-2">
                <Button
                  variant={questionType === 'vote' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuestionType('vote')}
                >
                  投票选择
                </Button>
                <Button
                  variant={questionType === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuestionType('text')}
                >
                  文本回答
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">问题内容</label>
              <Textarea
                placeholder="输入要推送给学生的问题..."
                value={questionContent}
                onChange={(e) => setQuestionContent(e.target.value)}
                rows={3}
              />
            </div>

            {questionType === 'vote' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">投票选项</label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                    />
                    {options.length > 2 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                      >
                        删除
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOptions([...options, `${String.fromCharCode(65 + options.length)}. 选项`])}
                  >
                    + 添加选项
                  </Button>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handlePublishQuestion}
              disabled={isPublishing || !questionContent.trim()}
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  发布中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  发布到学生端
                </>
              )}
            </Button>

            {currentQuestion && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="text-sm font-medium mb-1">已发布问题:</div>
                  <div className="text-sm text-muted-foreground">
                    "{currentQuestion.content}"
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(currentQuestion.timestamp).toLocaleTimeString('zh-CN')}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* 查看答案Tab */}
          <TabsContent value="answers" className="space-y-4">
            {!currentQuestion ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  还没有发布问题。请先发布一个问题,学生才能回答。
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="rounded-lg bg-muted p-4">
                  <div className="text-sm font-medium mb-2">当前问题:</div>
                  <div className="text-sm">{currentQuestion.content}</div>
                </div>

                {questionType === 'vote' && stats.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">投票结果</div>
                      <Badge variant="secondary">{answers.length}人投票</Badge>
                    </div>
                    {stats.map((stat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{stat.option}</span>
                          <span className="text-muted-foreground">
                            {stat.count}票 ({stat.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : questionType === 'text' && answers.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">学生回答:</div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {answers.map((ans, idx) => (
                        <Card key={idx} className="p-3">
                          <div className="text-sm">{ans.answer}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(ans.timestamp).toLocaleTimeString('zh-CN')}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      还没有学生提交答案。等待学生回答...
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default RealtimeClassroomPanel;
