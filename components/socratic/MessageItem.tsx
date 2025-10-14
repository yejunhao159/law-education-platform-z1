'use client';

import React, { memo } from 'react';
import { Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Choice {
  id: string;
  content: string;
}

interface MessageItemProps {
  message: {
    id: string;
    role: 'teacher' | 'ai' | 'student-simulation';
    content: string;
    timestamp: string;
    suggestions?: string[];
    choices?: Choice[];
  };
  onChoiceClick: (choice: Choice) => void;
  onSuggestionClick: (question: string) => void;
}

/**
 * 单个消息组件 - 使用memo优化避免不必要的重渲染
 * 只有当消息内容真正变化时才会重新渲染
 */
const MessageItem = memo(({ message, onChoiceClick, onSuggestionClick }: MessageItemProps) => {
  const isTeacher = message.role === 'teacher';
  const isAI = message.role === 'ai';

  // 根据角色选择背景色
  const bgColor = isTeacher ? 'bg-blue-100' : isAI ? 'bg-purple-100' : 'bg-green-100';

  // 根据角色选择对齐方式
  const alignment = isTeacher ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[80%] p-3 rounded-lg ${bgColor}`}>
        <div className="flex items-center mb-1">
          {isTeacher ? <User className="w-4 h-4 mr-1" /> :
           isAI ? <Bot className="w-4 h-4 mr-1" /> :
           <User className="w-4 h-4 mr-1" />}
          <span className="text-xs font-medium">
            {isTeacher ? '教师' : isAI ? 'AI助手' : '学生模拟'}
          </span>
          <span className="text-xs text-gray-500 ml-2">{message.timestamp}</span>
        </div>

        {/* 消息内容 - 使用 will-change 优化动画性能 */}
        <div
          className="text-sm whitespace-pre-wrap"
          style={{ willChange: isAI && !message.choices ? 'contents' : 'auto' }}
        >
          {message.content}
        </div>

        {/* AI选项 - ISSUE方法论ABCDE选项 */}
        {message.choices && message.choices.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="text-xs font-medium text-blue-700 mb-2 flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />
              点击选项继续讨论：
            </div>
            <div className="grid grid-cols-1 gap-2">
              {message.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => onChoiceClick(choice)}
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

        {/* AI建议 - 只在消息内部显示一次 */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-xs text-gray-600 mb-1">建议追问：</div>
            <div className="space-y-1">
              {message.suggestions.map((q, idx) => (
                <button
                  key={`${message.id}-suggestion-${idx}`}
                  onClick={() => onSuggestionClick(q)}
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
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数 - 只有当消息内容真正变化时才重新渲染
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.choices?.length === nextProps.message.choices?.length &&
    prevProps.message.suggestions?.length === nextProps.message.suggestions?.length
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
