'use client';

/**
 * AI助手面板
 * 显示风险列表、条款检查和AI对话
 */

import { useState, useRef, useEffect } from 'react';
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';
import { RiskHighlightCard } from './RiskHighlightCard';
import { Send, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { ClauseCheckResult } from '@/src/domains/contract-analysis/types/editor';

interface AIAssistantPanelProps {
  onJumpToPosition?: (position: { start: number; end: number }) => void;
  onApplySuggestion?: (suggestion: {
    originalText: string;
    suggestedText: string;
    position: { start: number; end: number };
  }) => void;
}

export function AIAssistantPanel({ onJumpToPosition, onApplySuggestion }: AIAssistantPanelProps) {
  const { risks, clauseChecks, messages, isAnalyzing, analysisProgress, addMessage } =
    useContractEditorStore();

  const [activeTab, setActiveTab] = useState<'risks' | 'clauses' | 'chat'>('risks');
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsSending(true);

    // 添加用户消息
    addMessage({
      role: 'user',
      content: userMessage,
    });

    try {
      // TODO: 调用AI服务
      // const response = await contractAIService.chat(userMessage);

      // 模拟AI回复（实际应该调用AI服务）
      setTimeout(() => {
        addMessage({
          role: 'ai',
          content: '收到您的问题。这是一个示例回复，实际应该调用AI服务。',
          type: 'info',
        });
        setIsSending(false);
      }, 1000);
    } catch (error) {
      addMessage({
        role: 'ai',
        content: '抱歉，处理您的问题时出现错误，请稍后再试。',
        type: 'warning',
      });
      setIsSending(false);
    }
  };

  const renderClauseCheckIcon = (clause: ClauseCheckResult) => {
    if (!clause.present) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    switch (clause.adequacy) {
      case 'sufficient':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'needs-improvement':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'inadequate':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const renderClauseCheckCard = (clause: ClauseCheckResult) => {
    const importanceColor = {
      critical: 'border-red-500',
      important: 'border-yellow-500',
      recommended: 'border-blue-500',
    };

    return (
      <div
        key={clause.clauseName}
        className={`border-l-4 rounded-lg p-3 mb-2 bg-white shadow-sm ${
          importanceColor[clause.importance]
        }`}
      >
        <div className="flex items-start gap-2">
          {renderClauseCheckIcon(clause)}
          <div className="flex-1">
            <h4 className="font-medium text-sm text-gray-800">{clause.clauseName}</h4>
            {clause.reason && <p className="text-xs text-gray-600 mt-1">{clause.reason}</p>}
            {clause.risk && (
              <p className="text-xs text-red-600 mt-1">
                <span className="font-semibold">风险: </span>
                {clause.risk}
              </p>
            )}
            {clause.suggestion && (
              <p className="text-xs text-blue-600 mt-1">
                <span className="font-semibold">建议: </span>
                {clause.suggestion}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="AIAssistantPanelId" className="h-full flex flex-col bg-gray-50">
      {/* 分析进度条 */}
      {isAnalyzing && (
        <div className="bg-blue-50 p-3 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-800">AI正在分析合同...</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 标签切换 */}
      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveTab('risks')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'risks'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          风险识别
          {risks.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
              {risks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('clauses')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'clauses'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          条款检查
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          AI对话
          {messages.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 风险列表 */}
        {activeTab === 'risks' && (
          <div>
            {risks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">暂无风险识别结果</p>
                <p className="text-xs mt-2">上传合同后AI将自动分析</p>
              </div>
            ) : (
              <div>
                {risks.map((risk) => (
                  <RiskHighlightCard
                    key={risk.id}
                    risk={risk}
                    onJumpToPosition={onJumpToPosition}
                    onApplySuggestion={onApplySuggestion}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 条款检查 */}
        {activeTab === 'clauses' && (
          <div>
            {clauseChecks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">暂无条款检查结果</p>
                <p className="text-xs mt-2">上传合同后AI将自动检查</p>
              </div>
            ) : (
              <div>{clauseChecks.map((clause) => renderClauseCheckCard(clause))}</div>
            )}
          </div>
        )}

        {/* AI对话 */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">开始与AI助手对话</p>
                  <p className="text-xs mt-2">询问合同相关的任何问题</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-800 shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 聊天输入框 */}
      {activeTab === 'chat' && (
        <div className="border-t bg-white p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="询问AI助手..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || isSending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
