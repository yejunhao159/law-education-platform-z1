'use client';

/**
 * 合同富文本编辑器核心组件
 * 基于 Tiptap 实现
 */

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';
import { RISK_COLORS } from '@/src/domains/contract-analysis/types/editor';
import type { RiskHighlight } from '@/src/domains/contract-analysis/types/editor';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  Type,
  Palette
} from 'lucide-react';

interface ContractEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export function ContractEditor({ initialContent = '', onContentChange }: ContractEditorProps) {
  const { document, risks, updateEditedText } = useContractEditorStore();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
    ],
    content: initialContent || document?.editedText || '',
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-base max-w-none focus:outline-none min-h-screen p-8 contract-editor-content',
        contenteditable: 'true',
        spellcheck: 'false',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      updateEditedText(text);
      onContentChange?.(html);
    },
  });

  // ✅ 关键修复：当document内容变化时，更新编辑器
  useEffect(() => {
    if (!editor) return;

    const newContent = document?.editedText || initialContent || '';

    // 只有当内容真的变化时才更新（避免无限循环）
    if (newContent && editor.getText() !== newContent) {
      console.log('📝 更新编辑器内容，长度:', newContent.length);
      editor.commands.setContent(newContent);
    }
  }, [editor, document?.editedText, initialContent]);

  // 当风险高亮数据更新时，重新应用高亮和批注
  useEffect(() => {
    if (!editor || risks.length === 0) return;
    if (!document?.editedText) return; // 等待文档加载完成

    // 等待编辑器完全初始化
    setTimeout(() => {
      // 应用高亮和批注标记
      risks.forEach((risk) => {
        applyRiskAnnotation(risk);
      });
    }, 500);
  }, [risks, editor, document]);

  // 应用风险批注（高亮 + Word风格标记）
  const applyRiskAnnotation = (risk: RiskHighlight) => {
    if (!editor) return;

    const { start, end } = risk.position;
    const color = RISK_COLORS[risk.riskLevel];

    try {
      // 应用高亮背景色
      editor
        .chain()
        .setTextSelection({ from: start, to: end })
        .setHighlight({ color })
        .run();

      console.log(`✅ 已高亮风险 ${risk.id}:`, risk.text.substring(0, 30));
    } catch (error) {
      console.error('应用高亮失败:', error, risk);
    }
  };

  // 跳转到指定位置并高亮
  const jumpToPosition = (position: { start: number; end: number }) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .setTextSelection(position)
      .run();

    // 滚动到可视区域
    const { node } = editor.view.domAtPos(position.start);
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 应用AI建议的修改
  const applySuggestion = (suggestion: {
    originalText: string;
    suggestedText: string;
    position: { start: number; end: number };
  }) => {
    if (!editor) return;

    const { start, end } = suggestion.position;

    // 选中要替换的文本
    editor
      .chain()
      .focus()
      .setTextSelection({ from: start, to: end })
      .insertContent(suggestion.suggestedText)
      .run();

    // 临时高亮修改的部分（绿色，3秒后消失）
    setTimeout(() => {
      const newEnd = start + suggestion.suggestedText.length;
      editor
        .chain()
        .setTextSelection({ from: start, to: newEnd })
        .setHighlight({ color: RISK_COLORS.low })
        .run();

      setTimeout(() => {
        editor.chain().unsetHighlight().run();
      }, 3000);
    }, 100);
  };

  // 暴露方法给父组件使用
  useEffect(() => {
    if (editor) {
      (window as any).contractEditor = {
        editor, // ✅ 暴露真正的 editor 实例
        jumpToPosition,
        applySuggestion,
        getContent: () => editor.getHTML(),
        getText: () => editor.getText(),
      };
    }

    return () => {
      delete (window as any).contractEditor;
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-600">编辑器加载中...</span>
      </div>
    );
  }

  return (
    <div id="ContractEditorId" className="contract-editor-wrapper h-full flex flex-col">
      {/* 编辑工具栏 */}
      {editor && (
        <div className="flex-shrink-0 border-b bg-gray-50 p-2 flex items-center gap-2 flex-wrap">
          {/* 文本样式 */}
          <div className="flex items-center gap-1 border-r pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('bold') ? 'bg-gray-300' : ''
              }`}
              title="加粗 (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('italic') ? 'bg-gray-300' : ''
              }`}
              title="斜体 (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('underline') ? 'bg-gray-300' : ''
              }`}
              title="下划线 (Ctrl+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 文字颜色 */}
          <div className="flex items-center gap-1 border-r pr-2">
            <span className="text-xs text-gray-600 mr-1">颜色:</span>
            {['#000000', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'].map((color) => (
              <button
                key={color}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                style={{ backgroundColor: color }}
                title={`设置颜色: ${color}`}
              />
            ))}
          </div>

          {/* 高亮背景 */}
          <div className="flex items-center gap-1 border-r pr-2">
            <span className="text-xs text-gray-600 mr-1">高亮:</span>
            <button
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('highlight', { color: '#fef08a' }) ? 'bg-yellow-200' : ''
              }`}
              title="黄色高亮"
            >
              <Highlighter className="w-4 h-4 text-yellow-600" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#fecaca' }).run()}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                editor.isActive('highlight', { color: '#fecaca' }) ? 'bg-red-200' : ''
              }`}
              title="红色高亮"
            >
              <Highlighter className="w-4 h-4 text-red-600" />
            </button>
            <button
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              className="p-2 rounded hover:bg-gray-200 transition-colors text-xs"
              title="清除高亮"
            >
              清除
            </button>
          </div>

          {/* 清除格式 */}
          <button
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            className="p-2 rounded hover:bg-gray-200 transition-colors text-xs"
            title="清除所有格式"
          >
            清除格式
          </button>
        </div>
      )}

      <style jsx global>{`
        /* 合同文档样式优化 */
        .contract-editor-content {
          line-height: 2.2;
          font-size: 15px;
          color: #1f2937;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
        }

        /* 段落样式 - 中文合同标准格式 */
        .contract-editor-content p {
          margin-bottom: 1.2em;
          text-align: justify;
          text-indent: 2em; /* 首行缩进2字符 */
        }

        /* 条款编号段落不缩进 */
        .contract-editor-content p:has(strong:first-child) {
          text-indent: 0;
          font-weight: 500;
        }

        /* 合同标题样式 */
        .contract-editor-content h1 {
          font-size: 1.6em;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 1.5em;
          text-align: center;
          color: #111827;
          text-indent: 0;
          letter-spacing: 0.1em;
        }

        /* 合同条款大标题 */
        .contract-editor-content h2 {
          font-size: 1.1em;
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.8em;
          color: #111827;
          text-indent: 0;
        }

        /* 合同小节标题 */
        .contract-editor-content h3 {
          font-size: 1em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.6em;
          color: #374151;
          text-indent: 0;
        }

        /* 列表样式 */
        .contract-editor-content ul,
        .contract-editor-content ol {
          margin-left: 2em;
          margin-bottom: 1em;
        }

        .contract-editor-content li {
          margin-bottom: 0.5em;
        }

        /* 强调样式 */
        .contract-editor-content strong {
          font-weight: 600;
          color: #111827;
        }

        .contract-editor-content em {
          font-style: italic;
          color: #4b5563;
        }

        /* 缩进样式 */
        .contract-editor-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin-left: 0;
          color: #6b7280;
        }
      `}</style>

      {/* 编辑器内容区 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
