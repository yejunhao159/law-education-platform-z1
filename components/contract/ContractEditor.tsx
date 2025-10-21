'use client';

/**
 * 合同富文本编辑器核心组件
 * 基于 Tiptap 实现
 */

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';
import { RISK_COLORS } from '@/src/domains/contract-analysis/types/editor';
import type { RiskHighlight } from '@/src/domains/contract-analysis/types/editor';

interface ContractEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export function ContractEditor({ initialContent = '', onContentChange }: ContractEditorProps) {
  const { document, risks, updateEditedText } = useContractEditorStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Underline,
    ],
    content: initialContent || document?.editedText || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-screen p-8 max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      updateEditedText(text);
      onContentChange?.(html);
    },
  });

  // 当风险高亮数据更新时，重新应用高亮
  useEffect(() => {
    if (!editor || risks.length === 0) return;

    // 清除所有现有高亮
    editor.commands.unsetHighlight();

    // 应用新的高亮
    risks.forEach((risk) => {
      highlightRisk(risk);
    });
  }, [risks, editor]);

  // 在编辑器中高亮风险条款
  const highlightRisk = (risk: RiskHighlight) => {
    if (!editor) return;

    const { start, end } = risk.position;
    const color = RISK_COLORS[risk.riskLevel];

    try {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: start, to: end })
        .setHighlight({ color })
        .run();
    } catch (error) {
      console.error('高亮失败:', error);
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
    <div id="ContractEditorId" className="contract-editor-wrapper h-full">
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
}
