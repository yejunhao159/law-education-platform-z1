'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// 移除复杂的标签页系统
import ArgumentTree, { ArgumentNode } from './ArgumentTree';
import { ClassroomCode } from './ClassroomCode';
import { RealtimeClassroomPanel } from './RealtimeClassroomPanel';
import { ClassroomSession, DialogueLevel } from '@/lib/types/socratic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Download,
  Settings,
  QrCode,
  MessageSquare
} from 'lucide-react';

/**
 * 教师专用苏格拉底教学界面
 * 简化设计，专注于教师引导学生思考的核心功能
 */

interface TeacherSocraticProps {
  caseData: {
    title: string;
    facts: string[];
    laws: string[];
    dispute: string;
  };
  /** 可选：外部传入的课堂代码（用于独立访问模式） */
  initialClassroomCode?: string;
}

export default function TeacherSocratic({ caseData, initialClassroomCode }: TeacherSocraticProps) {
  // 对话历史
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'teacher' | 'ai' | 'student-simulation';
    content: string;
    timestamp: string;
    suggestions?: string[];
    choices?: Array<{ id: string; content: string }>;
  }>>([]);

  // 论证树节点
  const [argumentNodes, setArgumentNodes] = useState<ArgumentNode[]>([]);

  // 当前显示的选项（用于投票后继续对话）
  const [currentChoices, setCurrentChoices] = useState<Array<{ id: string; content: string }>>([]);

  // 当前输入
  const [currentInput, setCurrentInput] = useState('');

  // 简化后的会话状态 - 移除复杂的模式和难度选择
  const [isActive, setIsActive] = useState(false);

  // 课堂二维码状态
  const [showQRCode, setShowQRCode] = useState(false);
  const [classroomSession, setClassroomSession] = useState<ClassroomSession | null>(null);
  
  // AI建议的问题（默认为空，只有AI响应后才显示）
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  // AI生成的当前问题（用于推送到实时课堂）
  const [currentAIQuestion, setCurrentAIQuestion] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部 - 已禁用，保持用户当前位置
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  // 从AI响应内容中提取建议问题
  const extractSuggestedQuestions = (content: string): string[] => {
    const questions: string[] = [];
    
    // 匹配"建议问题："或类似的标记
    const suggestionsMatch = content.match(/(?:建议问题|后续问题|推荐问题|可以继续探讨)[：:]\s*([^]+?)(?=\n\n|$)/);
    if (suggestionsMatch) {
      // 提取问题列表
      const questionsText = suggestionsMatch[1];
      const lines = questionsText.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        // 匹配各种格式的问题标记
        const questionMatch = line.match(/^[\d•\-*]\.?\s*(.+)/);
        if (questionMatch) {
          questions.push(questionMatch[1].trim());
        }
      });
    }
    
    // 如果没有找到明确的建议问题部分，尝试从内容中提取问句
    if (questions.length === 0) {
      const questionRegex = /[^。！\n]*[？?]/g;
      const matches = content.match(questionRegex);
      if (matches) {
        // 只取前3个问题
        questions.push(...matches.slice(0, 3).map(q => q.trim()));
      }
    }
    
    return questions;
  };

  // 发送消息（使用真实API）
  const sendMessage = async (content: string, isAISuggestion: boolean = false) => {
    if (!content.trim()) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      role: 'teacher' as const,
      content,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, newMessage]);
    setCurrentInput('');

    // 添加到论证树
    const newNode: ArgumentNode = {
      id: `node-${Date.now()}`,
      type: 'question',
      content,
      speaker: 'teacher',
      parentId: argumentNodes.length > 0 ? argumentNodes[argumentNodes.length - 1]?.id : undefined
    };
    setArgumentNodes(prev => [...prev, newNode]);

    // 调用统一的苏格拉底API
    try {
      const response = await fetch('/api/socratic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streaming: true, // Phase B优化: 启用流式输出
          messages: [
            ...messages.map(m => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.content,
              timestamp: new Date().toISOString()
            })),
            {
              role: 'user',
              content: content,
              timestamp: new Date().toISOString()
            }
          ],
          caseContext: `案件：${caseData.title}\n争议：${caseData.dispute}\n事实：${caseData.facts.join('；')}\n法条：${caseData.laws.join('；')}`,
          currentTopic: content,
          level: 'INTERMEDIATE',
          mode: 'EXPLORATION',
          sessionId: `teacher-session-${Date.now()}`,
          // 保持向后兼容的字段
          question: content,
          context: {
            caseTitle: caseData.title,
            facts: caseData.facts,
            laws: caseData.laws,
            dispute: caseData.dispute,
            previousMessages: messages.map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        })
      });

      // Phase B优化: 流式SSE处理+实时更新
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      // 先创建占位消息
      const aiMessageId = `msg-${Date.now() + 1}`;
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'ai' as const,
        content: '',
        timestamp: new Date().toLocaleTimeString(),
        suggestions: []
      }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  // 实时更新消息内容
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId ? { ...msg, content: fullContent } : msg
                  ));
                }
              } catch (e) {
                console.warn('解析SSE失败:', data, e);
              }
            }
          }
        }
      }

      // 解析AI响应中的ABCDE选项
      const extractedChoices = extractChoices(fullContent);
      if (extractedChoices.length > 0) {
        setCurrentChoices(extractedChoices);
      }

      // 提取建议问题
      const extractedQuestions = extractSuggestedQuestions(fullContent);
      setSuggestedQuestions(extractedQuestions);

      // 更新消息，添加choices和suggestions字段
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { 
          ...msg, 
          choices: extractedChoices,
          suggestions: extractedQuestions 
        } : msg
      ));

      // 添加AI回答到论证树
      const aiNode: ArgumentNode = {
        id: `node-${Date.now() + 1}`,
        type: 'reason',
        content: fullContent,
        speaker: 'ai',
        parentId: newNode.id,
        evaluation: {
          strength: 'medium',
          issues: []
        }
      };
      setArgumentNodes(prev => [...prev, aiNode]);

      // 更新当前AI问题（用于推送到学生端）
      setCurrentAIQuestion(fullContent);
    } catch (error) {
      console.error('调用API时出错:', error);
      // 使用备用响应
      const fallbackResponse = generateAIResponse(content);
      const aiMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'ai' as const,
        content: fallbackResponse.answer,
        timestamp: new Date().toLocaleTimeString(),
        suggestions: fallbackResponse.followUpQuestions
      };
      setMessages(prev => [...prev, aiMessage]);
      setSuggestedQuestions(fallbackResponse.followUpQuestions);
    }
  };

  // 生成AI响应（简化版）
  // 简化后的AI响应生成 - 移除难度级别
  const generateAIResponse = (question: string) => {
    return {
      answer: "这个问题需要结合案件事实进行法律分析。建议引导学生从法条要件、案件事实和法律推理等角度深入思考。",
      followUpQuestions: [
        "案件的关键法律问题是什么？",
        "相关法条如何适用到本案？",
        "学生的分析还需要补充哪些方面？"
      ]
    };
  };

  // 解析选项（提取A、B、C、D、E选项）
  const extractChoices = (content: string): Array<{ id: string; content: string }> => {
    const choices: Array<{ id: string; content: string }> = [];
    // 匹配多种格式: A) xxx、A. xxx、A: xxx、A、xxx、A） xxx（全角）
    const regex = /([A-E])[)）.、:：]\s*([^\n]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1] && match[2]) {
        choices.push({
          id: match[1],
          content: match[2].trim()
        });
      }
    }
    return choices;
  };

  // 开始对话 - 简化版
  const startDialogue = async () => {
    setIsActive(true);
    // 生成初始问题
    const initialQuestion = "让我们开始讨论这个案件的核心法律问题。您认为本案的争议焦点是什么？";
    
    const initialMessage = {
      id: `msg-${Date.now()}`,
      role: 'ai' as const,
      content: initialQuestion,
      timestamp: new Date().toLocaleTimeString(),
      suggestions: [
        "本案涉及哪些法律关系？",
        "原被告双方的主要分歧在哪里？",
        "哪些证据对案件判决最为关键？"
      ]
    };
    
    setMessages([initialMessage]);
    setSuggestedQuestions(initialMessage.suggestions);
    
    // 添加到论证树
    const initialNode: ArgumentNode = {
      id: `node-${Date.now()}`,
      type: 'topic',
      content: '案件讨论：' + caseData.title,
      speaker: 'system',
      parentId: undefined
    };
    setArgumentNodes([initialNode]);
  };

  // 创建或加入课堂
  const createClassroom = async () => {
    try {
      const response = await fetch('/api/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: caseData.title,
          description: `苏格拉底讨论：${caseData.dispute}`,
          maxStudents: 50
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setClassroomSession(data.data);
        setShowQRCode(true);
      }
    } catch (error) {
      console.error('创建课堂失败:', error);
    }
  };

  // 推送问题到学生端
  const pushQuestionToStudents = async (question: string) => {
    if (!classroomSession) return;
    
    try {
      await fetch(`/api/classroom/${classroomSession.code}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          choices: currentChoices
        })
      });
      
      console.log('问题已推送到学生端');
    } catch (error) {
      console.error('推送问题失败:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 - 简化版 */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">苏格拉底对话</h2>
          <span className="text-sm text-gray-500">- {caseData.title}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button 
              onClick={startDialogue}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-1" />
              开始对话
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowQRCode(!showQRCode)}
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
              >
                <QrCode className="w-4 h-4" />
                {classroomSession ? '查看二维码' : '创建课堂'}
              </Button>
              <Button
                onClick={() => {
                  if (confirm('确定要重置对话吗？')) {
                    setMessages([]);
                    setArgumentNodes([]);
                    setSuggestedQuestions([]);
                    setCurrentChoices([]);
                    setIsActive(false);
                  }
                }}
                size="sm"
                variant="outline"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 - 使用Tabs组件 */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="dialogue" className="h-full">
          <TabsList className="w-full justify-start px-4">
            <TabsTrigger value="dialogue">对话视图</TabsTrigger>
            <TabsTrigger value="argument">论证结构</TabsTrigger>
            {classroomSession && (
              <TabsTrigger value="classroom">实时课堂</TabsTrigger>
            )}
          </TabsList>

          {/* 对话视图 */}
          <TabsContent value="dialogue" className="h-full">
            <div className="h-full flex">
              {/* 对话历史 - 占据主要空间 */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.role === 'teacher' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          msg.role === 'teacher'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {msg.role === 'teacher' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                          <span className="text-xs opacity-75">
                            {msg.role === 'teacher' ? '教师' : 'AI助手'}
                          </span>
                          <span className="text-xs opacity-50">{msg.timestamp}</span>
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        
                        {/* 显示选项 */}
                        {msg.choices && msg.choices.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm font-medium mb-2">投票选项：</p>
                            <div className="space-y-1">
                              {msg.choices.map((choice) => (
                                <div key={choice.id} className="text-sm">
                                  {choice.id}. {choice.content}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 显示建议问题 */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm font-medium mb-2">建议继续探讨：</p>
                            <div className="space-y-2">
                              {msg.suggestions.map((q, idx) => (
                                <Button
                                  key={idx}
                                  size="sm"
                                  variant="ghost"
                                  className="w-full justify-start text-left text-xs"
                                  onClick={() => setCurrentInput(q)}
                                >
                                  <Sparkles className="w-3 h-3 mr-2 flex-shrink-0" />
                                  {q}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入区域 */}
                {isActive && (
                  <div className="border-t bg-white p-4">
                    <div className="flex gap-2">
                      <textarea
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(currentInput);
                          }
                        }}
                        placeholder="输入您的问题或引导..."
                        className="flex-1 min-h-[80px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => sendMessage(currentInput)}
                          disabled={!currentInput.trim()}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        {currentAIQuestion && classroomSession && (
                          <Button
                            onClick={() => pushQuestionToStudents(currentAIQuestion)}
                            size="sm"
                            variant="outline"
                            title="推送到学生端"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 快速建议 - 只在有建议时显示 */}
                    {suggestedQuestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-500">快速选择：</span>
                        {suggestedQuestions.map((q, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant="outline"
                            onClick={() => sendMessage(q, true)}
                            className="text-xs"
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 论证结构视图 */}
          <TabsContent value="argument" className="h-full p-4">
            <div className="h-full bg-white rounded-lg border p-4 overflow-auto">
              <ArgumentTree nodes={argumentNodes} />
            </div>
          </TabsContent>

          {/* 实时课堂视图 */}
          {classroomSession && (
            <TabsContent value="classroom" className="h-full">
              <RealtimeClassroomPanel
                classroomCode={classroomSession.code}
                isTeacher={true}
                currentQuestion={currentAIQuestion}
                choices={currentChoices}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* 二维码弹窗 */}
      {showQRCode && !classroomSession && (
        <ClassroomCode
          onClose={() => setShowQRCode(false)}
          onCreateClassroom={createClassroom}
        />
      )}
      
      {showQRCode && classroomSession && (
        <ClassroomCode
          classroomCode={classroomSession.code}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </div>
  );
}