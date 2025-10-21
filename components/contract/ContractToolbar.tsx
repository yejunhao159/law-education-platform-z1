'use client';

/**
 * 合同编辑器工具栏
 * 提供格式化、导出等功能
 */

import { type Editor } from '@tiptap/react';
import { Download, FileText, Bold, Italic, Underline as UnderlineIcon } from 'lucide-react';

interface ContractToolbarProps {
  editor: Editor | null;
  onExportPDF?: () => void;
  onExportWord?: () => void;
}

export function ContractToolbar({ editor, onExportPDF, onExportWord }: ContractToolbarProps) {
  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded hover:bg-gray-100 transition-colors
        ${active ? 'bg-blue-100 text-blue-600' : 'text-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="border-b bg-white px-4 py-2 flex items-center gap-1 flex-wrap sticky top-0 z-10 shadow-sm">
      {/* 文本格式化 */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="加粗 (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="斜体 (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="下划线 (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* 标题级别 */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="一级标题"
        >
          <span className="text-sm font-bold">H1</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="二级标题"
        >
          <span className="text-sm font-bold">H2</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="三级标题"
        >
          <span className="text-sm font-bold">H3</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph')}
          title="正文"
        >
          <span className="text-sm">正文</span>
        </ToolbarButton>
      </div>

      {/* 列表 */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="无序列表"
        >
          <span className="text-sm">•</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="有序列表"
        >
          <span className="text-sm">1.</span>
        </ToolbarButton>
      </div>

      {/* 撤销/重做 */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="撤销 (Ctrl+Z)"
        >
          <span className="text-sm">↶</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做 (Ctrl+Y)"
        >
          <span className="text-sm">↷</span>
        </ToolbarButton>
      </div>

      {/* 清除格式 */}
      <div className="flex items-center gap-1 border-r pr-2 mr-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="清除格式"
        >
          <span className="text-sm">清除</span>
        </ToolbarButton>
      </div>

      {/* 导出功能 */}
      <div className="flex items-center gap-2 ml-auto">
        {onExportWord && (
          <button
            onClick={onExportWord}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            title="导出为Word文档"
          >
            <FileText className="w-4 h-4" />
            <span>导出Word</span>
          </button>
        )}

        {onExportPDF && (
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            title="导出为PDF"
          >
            <Download className="w-4 h-4" />
            <span>导出PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}
