'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// 移除复杂的标签页系统
import { ArgumentNode } from './ArgumentTree';
import { ClassroomCode } from './ClassroomCode';
import { RealtimeClassroomPanel } from './RealtimeClassroomPanel';
import { ClassroomSession } from '@/lib/types/socratic';
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

  // AI提取的ABCDE选项
  const [currentChoices, setCurrentChoices] = useState<Array<{ id: string; content: string }>>([]);

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
  const sendMessage = async (content: string, _isAISuggestion: boolean = false) => {
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
      const fallbackResponse = generateAIResponse();
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

  // 生成AI响应（备用方案）
  const generateAIResponse = () => {
    return {
      answer: "这个问题需要结合案件事实进行法律分析。建议引导学生从法条要件、案件事实和法律推理等角度深入思考。",
      followUpQuestions: [
        "案件的关键法律问题是什么？",
        "相关法条如何适用到本案？",
        "学生的分析还需要补充哪些方面？"
      ]
    };
  };

  // 提取AI回答中的ABCDE选项
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

    // 如果没有找到选项，尝试更宽松的匹配
    if (choices.length === 0) {
      // 匹配行首的 A xxx 格式
      const looseRegex = /^([A-E])\s+([^\n]+)/gm;
      while ((match = looseRegex.exec(content)) !== null) {
        // 确保不是普通句子开头（如 A person...）
        if (match[1] && match[2] && !match[2].match(/^(person|man|woman|child|student|teacher)/i)) {
          choices.push({
            id: match[1],
            content: match[2].trim()
          });
        }
      }
    }

    return choices;
  };

  // 点击选项继续对话
  const handleChoiceClick = (choice: { id: string; content: string }) => {
    const message = `基于选项${choice.id}（${choice.content}），我们继续深入探讨`;
    sendMessage(message, false);
    setCurrentChoices([]); // 清空当前选项
  };

  // 生成或使用已有课堂代码
  const generateClassroomCode = () => {
    // 如果外部传入了课堂代码，使用传入的；否则生成新的
    const code = initialClassroomCode || Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = Date.now();
    const session: ClassroomSession = {
      code,
      createdAt: now,
      expiresAt: now + 6 * 60 * 60 * 1000, // 6小时后过期
      teacherId: '教师', // 可以从用户状态获取
      students: new Map(), // 使用Map而不是数组
      status: 'waiting'
    };
    setClassroomSession(session);
    setShowQRCode(true);
  };

  // 如果有传入的课堂代码，自动创建会话
  useEffect(() => {
    if (initialClassroomCode && !classroomSession) {
      generateClassroomCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClassroomCode]);

  // 实时课堂问题发布回调
  const handleQuestionPublished = (question: any) => {
    console.log('问题已发布到学生端:', question);
    // 可以将问题添加到对话历史
    const newMessage = {
      id: `msg-${Date.now()}`,
      role: 'teacher' as const,
      content: `📢 已推送问题到学生端: ${question.content}`,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // 实时课堂答案接收回调
  const handleAnswersReceived = (answers: any[]) => {
    console.log('收到学生答案:', answers);
    // 可以基于答案生成AI分析或下一个问题
    if (answers.length > 0) {
      // 提取答案内容用于AI分析
      const answerSummary = answers.map(a => a.answer).join('; ');
      setCurrentAIQuestion(`基于学生答案(${answerSummary})，继续引导思考`);
    }
  };

  // 推送AI问题到学生端（使用SSE）
  const pushQuestionToStudents = async () => {
    if (!classroomSession) {
      alert('请先创建课堂会话');
      return;
    }

    // 获取当前AI问题或最后一条AI消息
    const questionToPush = currentAIQuestion || messages.filter(m => m.role === 'ai').slice(-1)[0]?.content;

    if (!questionToPush) {
      alert('没有可推送的问题，请先与AI对话生成问题');
      return;
    }

    try {
      // 调用问题发布API
      const response = await fetch(`/api/classroom/${classroomSession.code}/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: questionToPush,
          type: 'text', // 简化版只使用文本问题
          options: []
        })
      });

      const result = await response.json();

      if (result.success) {
        // 添加成功消息到对话
        const newMessage = {
          id: `msg-${Date.now()}`,
          role: 'teacher' as const,
          content: `✅ 问题已推送到学生端: ${questionToPush.substring(0, 50)}${questionToPush.length > 50 ? '...' : ''}`,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, newMessage]);
      } else {
        alert('推送失败: ' + result.error);
      }
    } catch (error) {
      console.error('推送问题失败:', error);
      alert('推送失败，请检查网络连接');
    }
  };

  // 使用建议问题
  const useSuggestedQuestion = (question: string) => {
    sendMessage(question, true);
  };

  // 开始/暂停会话
  const toggleSession = async () => {
    setIsActive(!isActive);
    if (!isActive) {
      // 开始会话时添加初始消息
      const aiMessageId = `msg-${Date.now()}`;
      const welcomeMessage = {
        id: aiMessageId,
        role: 'ai' as const,
        content: `正在分析案件"${caseData.title}"...`,
        timestamp: new Date().toLocaleTimeString(),
        suggestions: []
      };
      setMessages([welcomeMessage]);

      // 获取AI的详细案件分析 + ISSUE选择题（流式输出）
      try {
        const response = await fetch('/api/socratic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            streaming: true, // 启用流式输出
            messages: [{
              role: 'user',
              content: `你现在要开始第一次苏格拉底对话。请记住你的核心身份：精神助产士，而非知识讲解者。

【核心任务】：生成第一个引导性问题，激发学生思考，而非提供答案。

【关键原则】：
1. 重在发问，轻在解释（70%问题 + 30%简短铺垫）
2. 问题要锋利，直击案件核心矛盾，暴露学生可能的思维盲点
3. 不要告诉学生"应该怎么分析"，而是通过问题引导他们自己发现
4. 禁止抽象讨论，每个问题都必须锚定具体案件事实
5. 使用纯文本格式（不要用**、#、-等符号）

【输出结构】：

第一部分：案件核心矛盾点（1-2句话铺垫）
用一两句话指出案件最让人困惑或矛盾的地方，激发好奇心。

第二部分：连环追问（3-5个问题，层层深入）
每个问题都要：
- 基于具体案件事实
- 追问"为什么"而非"是什么"
- 暴露逻辑矛盾或思维盲点
- 引导学生自己发现答案

第三部分：ISSUE选择题（可选，如果适合的话）
如果某个问题适合用选择题形式，提供A-E选项，每个选项都是一种思路，而非简单对错。

【禁止行为】：
- 禁止法条逐条讲解（这是教科书，不是苏格拉底对话）
- 禁止给出"标准答案"或"分析框架"
- 禁止温柔引导（"咱们一起看看"）
- 禁止多选题式的罗列（"可能是A/B/C"）

【示例风格】（仅供参考格式，不要照搬内容）：

这个案件最有意思的地方在于：甲方支付了50万，但只得到价值5万的货物，合同还是有效的。

你觉得这合理吗？为什么？

如果你说"不合理"，那请问：
- 不合理的标准是什么？谁来判断"合理"？
- 如果每个人都能以"我觉得不合理"来撤销合同，会发生什么？

如果你说"合理"，那请问：
- 50万买5万的东西，这不是明显的显失公平吗？
- 法律为什么要保护这种"不公平"？

现在，请基于这个案件生成你的第一个问题。`,
              timestamp: new Date().toISOString()
            }],
            caseContext: `案件：${caseData.title}\n争议：${caseData.dispute}\n事实：${caseData.facts.join('；')}\n法条：${caseData.laws.join('；')}`,
            currentTopic: '案件深度分析与教学准备',
            level: 'INTERMEDIATE',
            mode: 'EXPLORATION',
            sessionId: `teacher-init-${Date.now()}`,
            // 保持向后兼容的字段
            question: '案件深度分析与教学准备',
            context: {
              caseTitle: caseData.title,
              facts: caseData.facts,
              laws: caseData.laws,
              dispute: caseData.dispute,
              previousMessages: []
            }
          })
        });

        // 流式SSE处理+实时更新
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

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
                    // 实时更新消息内容（更新现有消息，而非替换整个数组）
                    setMessages(prev => prev.map(msg =>
                      msg.id === aiMessageId ? {
                        ...msg,
                        content: fullContent
                      } : msg
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

        // 解析AI响应中的建议问题
        const extractedQuestions = extractSuggestedQuestions(fullContent);
        if (extractedQuestions.length > 0) {
          setSuggestedQuestions(extractedQuestions);
        }

        // 更新消息，添加choices和suggestions字段（使用map更新，而非替换整个数组）
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? {
            ...msg,
            content: fullContent,
            choices: extractedChoices,
            suggestions: extractedQuestions
          } : msg
        ));

        // 更新当前AI问题（用于推送到学生端）
        setCurrentAIQuestion(fullContent);

      } catch (error) {
        console.error('获取初始分析失败:', error);
        // 使用默认提示
        setMessages([{
          id: aiMessageId,
          role: 'ai' as const,
          content: `案件分析失败，请稍后重试或手动输入问题开始教学。\n\n案件：${caseData.title}\n争议：${caseData.dispute}`,
          timestamp: new Date().toLocaleTimeString(),
          suggestions: []
        }]);
      }
    }
  };

  // 重置会话
  const resetSession = () => {
    setMessages([]);
    setArgumentNodes([]);
    setIsActive(false);
  };

  // 导出对话记录
  const exportSession = () => {
    const data = {
      case: caseData,
      messages,
      argumentTree: argumentNodes,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socratic-session-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 头部控制栏 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">苏格拉底教学法 - 教师控制台</h2>
          <p className="text-gray-600 mt-1">案件: {caseData.title}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 控制按钮 */}
          <Button
            onClick={toggleSession}
            variant={isActive ? "destructive" : "default"}
          >
            {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isActive ? '暂停' : '开始'}
          </Button>

          <Button onClick={resetSession} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </Button>

          <Button onClick={generateClassroomCode} variant="outline">
            <QrCode className="w-4 h-4 mr-2" />
            课堂二维码
          </Button>

          <Button onClick={exportSession} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 标签页：AI对话 + 实时互动 */}
      <Tabs defaultValue="dialogue" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dialogue">
            <Bot className="w-4 h-4 mr-2" />
            AI对话引导
          </TabsTrigger>
          <TabsTrigger value="realtime">
            <MessageSquare className="w-4 h-4 mr-2" />
            实时课堂互动
          </TabsTrigger>
          <TabsTrigger value="classroom-code">
            <QrCode className="w-4 h-4 mr-2" />
            课堂二维码
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: AI对话引导 */}
        <TabsContent value="dialogue">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            {/* 左侧：对话区域 */}
            <Card className="p-4 flex flex-col h-[1100px]">
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'teacher' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[80%] p-3 rounded-lg
                      ${msg.role === 'teacher' ? 'bg-blue-100' : 
                        msg.role === 'ai' ? 'bg-purple-100' : 'bg-green-100'}
                    `}>
                      <div className="flex items-center mb-1">
                        {msg.role === 'teacher' ? <User className="w-4 h-4 mr-1" /> :
                         msg.role === 'ai' ? <Bot className="w-4 h-4 mr-1" /> :
                         <User className="w-4 h-4 mr-1" />}
                        <span className="text-xs font-medium">
                          {msg.role === 'teacher' ? '教师' :
                           msg.role === 'ai' ? 'AI助手' : '学生模拟'}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">{msg.timestamp}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                      {/* AI选项 - ISSUE方法论ABCDE选项 */}
                      {msg.choices && msg.choices.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="text-xs font-medium text-blue-700 mb-2 flex items-center">
                            <Sparkles className="w-3 h-3 mr-1" />
                            点击选项继续讨论：
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.choices.map((choice) => (
                              <button
                                key={`${msg.id}-${choice.id}`}
                                onClick={() => handleChoiceClick(choice)}
                                className="flex items-start text-left text-xs p-2 rounded-lg border border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all"
                              >
                                <span className="inline-block w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2 flex-shrink-0 font-semibold">
                                  {choice.id}
                                </span>
                                <span className="flex-1">{choice.content}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI建议 */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-gray-600 mb-1">建议追问：</div>
                          <div className="space-y-1">
                            {msg.suggestions.map((q, idx) => (
                              <button
                                key={idx}
                                onClick={() => useSuggestedQuestion(q)}
                                className="block w-full text-left text-xs p-1 rounded hover:bg-white/50 transition-colors"
                              >
                                • {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 建议问题 */}
              {suggestedQuestions.length > 0 && (
                <div className="border rounded-lg p-3 bg-yellow-50">
                  <div className="flex items-center mb-2">
                    <Sparkles className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium">AI建议的引导问题</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        onClick={() => useSuggestedQuestion(q)}
                        className="text-xs"
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* 输入区域 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      sendMessage(currentInput);
                    }
                  }}
                  placeholder="输入引导性问题..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                  disabled={!isActive}
                />
                <Button 
                  onClick={() => sendMessage(currentInput)}
                  disabled={!isActive || !currentInput.trim()}
                >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* 右侧：简化教师控制台 */}
            <Card className="p-4 flex flex-col h-[1100px] overflow-hidden">
              <h3 className="font-semibold mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                课堂互动控制
              </h3>

              {/* 当前AI问题显示 */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  当前AI建议问题：
                </label>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg min-h-[80px]">
                  <p className="text-sm text-gray-800">
                    {currentAIQuestion || messages.filter(m => m.role === 'ai').slice(-1)[0]?.content || '等待AI生成问题...'}
                  </p>
                </div>
              </div>

              {/* 推送到学生端按钮 */}
              <Button
                onClick={pushQuestionToStudents}
                disabled={!classroomSession || (!currentAIQuestion && messages.filter(m => m.role === 'ai').length === 0)}
                className="w-full mb-4"
                size="lg"
              >
                <Send className="w-4 h-4 mr-2" />
                推送问题到学生端
              </Button>

              {/* 二维码区域 */}
              {classroomSession && (
                <div className="border-t pt-4 flex-1 flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    课堂二维码：
                  </label>
                  <div className="flex-1 flex items-center justify-center">
                    <ClassroomCode
                      session={classroomSession}
                      isTeacher={true}
                      config={{
                        showQRCode: true,
                        allowShare: false,
                        showStats: false
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    学生扫码加入课堂
                  </p>
                </div>
              )}

              {!classroomSession && (
                <div className="border-t pt-4 flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-500 text-center">
                    点击顶部"课堂二维码"按钮创建课堂
                  </p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: 实时课堂互动 */}
        <TabsContent value="realtime">
          {classroomSession ? (
            <RealtimeClassroomPanel
              classroomCode={classroomSession.code}
              suggestedQuestion={currentAIQuestion || ''}
              onQuestionPublished={handleQuestionPublished}
              onAnswersReceived={handleAnswersReceived}
            />
          ) : (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-4">还未创建课堂</h3>
              <p className="text-gray-600 mb-6">
                请先创建课堂二维码，学生扫码加入后即可使用实时互动功能
              </p>
              <Button onClick={generateClassroomCode}>
                <QrCode className="w-4 h-4 mr-2" />
                创建课堂二维码
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: 课堂二维码 */}
        <TabsContent value="classroom-code">
          {classroomSession ? (
            <Card className="p-6">
              <ClassroomCode
                session={classroomSession}
                isTeacher={true}
                config={{
                  showQRCode: true,
                  allowShare: true,
                  showStats: true
                }}
              />
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-4">还未创建课堂</h3>
              <p className="text-gray-600 mb-6">
                创建课堂二维码，让学生扫码加入课堂
              </p>
              <Button onClick={generateClassroomCode}>
                <QrCode className="w-4 h-4 mr-2" />
                创建课堂二维码
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 课堂二维码弹窗 */}
      {showQRCode && classroomSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowQRCode(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
            <ClassroomCode
              session={classroomSession}
              isTeacher={true}
              config={{
                showQRCode: true,
                allowShare: true,
                showStats: true
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}