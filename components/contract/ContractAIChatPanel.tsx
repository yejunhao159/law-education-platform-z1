'use client';

/**
 * 合同AI助手对话面板
 * 提供实时对话能力，帮助用户理解合同
 */

import { useState, useRef, useEffect } from 'react';
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Send,
  Bot,
  User,
  Sparkles,
  MessageSquare,
  Loader2,
  Settings,
  X,
} from 'lucide-react';
import { QUICK_QUESTIONS, getQuickQuestionsByType } from '@/src/domains/contract-analysis/prompts/contract-assistant';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface ContractAIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContractAIChatPanel({ isOpen, onClose }: ContractAIChatPanelProps) {
  const { document, parsedContract, risks } = useContractEditorStore();

  // 对话状态
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);

  // 配置
  const [config, setConfig] = useState({
    streaming: true,
    enableMCP: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 快捷问题
  const quickQuestions = parsedContract?.metadata.contractType
    ? getQuickQuestionsByType(parsedContract.metadata.contractType)
    : QUICK_QUESTIONS;

  /**
   * 发送消息
   */
  const sendMessage = async (content: string) => {
    if (!content.trim() || !document) {
      return;
    }

    // 添加用户消息
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 调用API
      const response = await fetch('/api/contract/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
          currentQuery: content,
          contractContext: {
            contractId: document.id,
            contractText: document.editedText,
            parsedContract,
            risks,
          },
          config: {
            streaming: config.streaming,
            enableMCP: config.enableMCP,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      // 处理流式响应
      if (config.streaming) {
        await handleStreamingResponse(response);
      } else {
        await handleNormalResponse(response);
      }
    } catch (error) {
      console.error('❌ 发送消息失败:', error);

      // 显示错误消息
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，我遇到了一些问题。请稍后再试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理流式响应
   */
  const handleStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('无法读取响应流');
    }

    let fullContent = '';
    const aiMessageId = `msg-${Date.now()}`;

    // 创建占位消息
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;

              // 实时更新消息
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMessageId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch (e) {
            // 忽略JSON解析错误
          }
        }
      }
    }
  };

  /**
   * 处理普通响应
   */
  const handleNormalResponse = async (response: Response) => {
    const result = await response.json();

    if (result.success) {
      const aiMessage: Message = {
        id: result.data.message.id,
        role: 'assistant',
        content: result.data.message.content,
        timestamp: new Date(result.data.message.timestamp),
        suggestions: result.data.suggestions?.quickReplies,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } else {
      throw new Error(result.message || '未知错误');
    }
  };

  /**
   * 处理快捷问题点击
   */
  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    textareaRef.current?.focus();
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-96 border-l bg-white flex flex-col h-full shadow-lg">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">AI合同助手</h3>
            <p className="text-xs text-gray-500">随时为你解答</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 配置按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">开始提问吧！我会帮你分析合同风险</p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* 正在输入指示器 */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI正在思考...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 快捷问题 */}
      {messages.length === 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">快速开始：</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.slice(0, 3).map((q, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1.5 px-3"
                onClick={() => handleQuickQuestion(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading || !document}
          />
          <Button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading || !document}
            className="h-[60px] px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Enter 发送，Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}

/**
 * 消息气泡组件
 */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-500' : 'bg-gray-200'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-gray-600" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={`flex-1 ${isUser ? 'items-end' : ''}`}>
        <Card
          className={`p-3 ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-50 text-gray-900 border-gray-200'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </Card>

        {/* 时间戳 */}
        <p className="text-xs text-gray-400 mt-1 px-1">
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {/* 快捷回复建议 */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1 px-2"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
