/**
 * 流式大纲编辑器
 * 支持实时显示流式输出 + 纯文字编辑
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { FileText, Edit3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface StreamingOutlineEditorProps {
  content: string;
  onChange?: (content: string) => void;
  isStreaming: boolean;
  readOnly?: boolean;
}

export function StreamingOutlineEditor({
  content,
  onChange,
  isStreaming,
  readOnly = false
}: StreamingOutlineEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 流式输出时自动滚动到底部
  useEffect(() => {
    if (isStreaming && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  // 计算字数和预估页数（基于 ## 二级标题）
  const charCount = content.length;
  const estimatedPages = Math.max(1, (content.match(/^##\s+/gm) || []).length);

  return (
    <Card className={`${isStreaming ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
      <CardContent className="p-6">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium">PPT大纲</span>
            {isStreaming && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full animate-pulse">
                生成中...
              </span>
            )}
            {!readOnly && !isStreaming && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                可编辑
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{charCount} 字</span>
            <span>•</span>
            <span>约 {estimatedPages} 页</span>
          </div>
        </div>

        {/* 编辑器 */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly || isStreaming}
            placeholder="AI正在生成大纲，请稍候..."
            className="min-h-[500px] font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500"
            style={{
              fontFamily: 'ui-monospace, monospace'
            }}
          />

          {/* 流式输出光标效果 */}
          {isStreaming && (
            <div className="absolute bottom-4 right-4 w-2 h-4 bg-blue-500 animate-pulse" />
          )}
        </div>

        {/* 底部提示 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-medium mb-1">💡 编辑提示：</p>
          <ul className="space-y-1 text-xs">
            <li>• 使用 <code className="bg-white px-1 rounded">## 标题</code> 表示一页PPT（二级标题自动分页）</li>
            <li>• 使用 <code className="bg-white px-1 rounded">### 小节</code> 表示页面内的内容块</li>
            <li>• 支持Markdown格式：列表（-）、表格（|）、引用（&gt;）、代码块等</li>
            <li>• 每页内容应完整详细，302.AI只负责视觉渲染</li>
            <li>• 可以自由添加、删除、调整页面顺序</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
