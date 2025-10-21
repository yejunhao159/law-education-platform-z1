'use client';

/**
 * 合同编辑器主页面
 * 集成编辑器、工具栏、AI助手面板
 */

import { useState, useEffect } from 'react';
import { ContractEditor } from '@/components/contract/ContractEditor';
import { ContractToolbar } from '@/components/contract/ContractToolbar';
import { AIAssistantPanel } from '@/components/contract/AIAssistantPanel';
import { FileUploadZone } from '@/components/contract/FileUploadZone';
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';
import type { Editor } from '@tiptap/react';
import { jsPDF } from 'jspdf';

export default function ContractEditorPage() {
  const { document, setDocument, setIsAnalyzing, setAnalysisProgress, setRisks, setClauseChecks } =
    useContractEditorStore();

  const [currentEditor, setCurrentEditor] = useState<Editor | null>(null);
  const [showUpload, setShowUpload] = useState(true);

  useEffect(() => {
    // 从 window 获取编辑器实例
    const checkEditor = () => {
      const editor = (window as any).contractEditor;
      if (editor) {
        setCurrentEditor(editor);
      }
    };

    checkEditor();
    const interval = setInterval(checkEditor, 500);

    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (file: File) => {
    // 创建文档记录
    setDocument({
      id: `doc-${Date.now()}`,
      fileName: file.name,
      uploadTime: new Date(),
      originalText: '',
      editedText: '',
    });
  };

  const handleExtractComplete = async (text: string) => {
    // 文本提取完成，更新文档并开始分析
    setDocument({
      id: document?.id || `doc-${Date.now()}`,
      fileName: document?.fileName || 'unknown',
      uploadTime: document?.uploadTime || new Date(),
      originalText: text,
      editedText: text,
    });

    // 隐藏上传区，显示编辑器
    setShowUpload(false);

    // 触发AI分析
    await analyzeContract(text);
  };

  const analyzeContract = async (text: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      console.log('📋 开始分析合同...');
      setAnalysisProgress(20);

      // 调用真实的API
      const response = await fetch('/api/contract/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractText: text,
        }),
      });

      setAnalysisProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '分析失败');
      }

      const result = await response.json();
      console.log('✅ 分析完成:', result);

      setAnalysisProgress(80);

      // 处理分析结果
      if (result.success && result.data) {
        const { contract, analysis } = result.data;

        // 更新合同元数据
        if (document) {
          setDocument({
            ...document,
            contractType: contract.metadata.contractType,
            parties: contract.metadata.parties,
          });
        }

        // 从解析结果中提取风险（临时实现，后续会有专门的风险识别服务）
        const detectedRisks = contract.clauses
          .filter((clause: any) =>
            clause.category === '违约责任' ||
            clause.category === '合同终止'
          )
          .map((clause: any, index: number) => ({
            id: `risk-${clause.id}`,
            text: clause.content.substring(0, 100),
            riskLevel: 'medium' as const,
            riskType: `${clause.category}条款`,
            description: `发现${clause.category}相关内容，请仔细审查`,
            legalBasis: '建议咨询专业律师',
            consequence: '具体风险需要进一步分析',
            position: clause.position,
            suggestion: `建议仔细审查【${clause.title}】的内容`,
          }));

        setRisks(detectedRisks);

        // 基于条款统计生成条款检查结果（临时实现）
        const clausesByCategory = analysis.stats.clausesByCategory;
        const essentialClauses = [
          '违约责任条款',
          '合同终止条款',
          '交付/履行条款',
          '管辖条款',
          '争议解决条款',
          '法律费用承担条款',
        ];

        const clauseCheckResults = essentialClauses.map((clauseName) => {
          const categoryKey = clauseName.replace('条款', '').replace('/', '');
          const isPresent = Object.keys(clausesByCategory).some(
            (key) => key.includes(categoryKey) || categoryKey.includes(key)
          );

          if (isPresent) {
            return {
              clauseName,
              present: true,
              adequacy: 'sufficient' as const,
              importance: 'important' as const,
            };
          } else {
            return {
              clauseName,
              present: false,
              importance: 'critical' as const,
              reason: `未找到明确的${clauseName}`,
              risk: `可能在${clauseName.replace('条款', '')}方面存在法律风险`,
              suggestion: `建议补充${clauseName}，明确相关权利义务`,
            };
          }
        });

        setClauseChecks(clauseCheckResults);

        console.log('✅ 风险识别完成:', detectedRisks.length, '个风险');
        console.log('✅ 条款检查完成:', clauseCheckResults.length, '项');
      }

      setAnalysisProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error('❌ 分析失败:', error);
      alert(
        '合同分析失败：' + (error instanceof Error ? error.message : '未知错误')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentEditor) return;

    const doc = new jsPDF();
    const content = currentEditor.getText();

    // 简单的文本导出（实际应该做更好的排版）
    const lines = content.split('\n');
    let y = 10;

    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(line, 10, y);
      y += 7;
    });

    doc.save(`${document?.fileName || 'contract'}.pdf`);
  };

  const handleExportWord = () => {
    if (!currentEditor) return;

    // TODO: 实现Word导出
    // 可以使用 docx 库或者简单的 HTML 转换
    const content = currentEditor.getHTML();
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document?.fileName || 'contract'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJumpToPosition = (position: { start: number; end: number }) => {
    (window as any).contractEditor?.jumpToPosition(position);
  };

  const handleApplySuggestion = (suggestion: {
    originalText: string;
    suggestedText: string;
    position: { start: number; end: number };
  }) => {
    (window as any).contractEditor?.applySuggestion(suggestion);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">合同智能编辑器</h1>
            {document && (
              <p className="text-sm text-gray-600 mt-1">
                当前文档: {document.fileName}
              </p>
            )}
          </div>
          {!showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              重新上传
            </button>
          )}
        </div>
      </div>

      {/* 主内容区域 */}
      {showUpload ? (
        /* 上传界面 */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <FileUploadZone
              onFileSelect={handleFileSelect}
              onExtractComplete={handleExtractComplete}
            />
          </div>
        </div>
      ) : (
        /* 编辑器界面 */
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧编辑器区域 (75%) */}
          <div className="flex-[3] flex flex-col bg-white border-r overflow-hidden">
            <ContractToolbar
              editor={currentEditor}
              onExportPDF={handleExportPDF}
              onExportWord={handleExportWord}
            />
            <div className="flex-1 overflow-auto">
              <ContractEditor
                initialContent={document?.editedText}
                onContentChange={(content) => {
                  // 内容已通过 store 自动更新
                }}
              />
            </div>
          </div>

          {/* 右侧AI助手区域 (25%) */}
          <div className="flex-[1] bg-gray-50 overflow-hidden">
            <AIAssistantPanel
              onJumpToPosition={handleJumpToPosition}
              onApplySuggestion={handleApplySuggestion}
            />
          </div>
        </div>
      )}
    </div>
  );
}
