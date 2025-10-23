/**
 * 合同编辑器页面
 * 核心流程：上传文件 → 提取文本 → 编辑器显示
 */

'use client';

import { useState } from 'react';
import { ContractUploadView } from '@/components/contract/ContractUploadView';
import { ContractEditor } from '@/components/contract/ContractEditor';
import { ClauseNavigationPanel } from '@/components/contract/ClauseNavigationPanel';
import { ContractInfoModal } from '@/components/contract/ContractInfoModal';
import { ContractAIChatPanel } from '@/components/contract/ContractAIChatPanel';
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';
import { FileText, Download, Loader2, CheckCircle, AlertCircle, Info, MessageSquare } from 'lucide-react';

export default function ContractEditorPage() {
  const { document, parsedContract, analysisStatus } = useContractEditorStore();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);

  // 未上传文档：显示上传界面
  if (!document) {
    return <ContractUploadView />;
  }

  // 已上传文档：显示编辑器
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">{document.fileName}</h2>
            <span className="text-xs text-gray-500">
              {new Date(document.uploadTime).toLocaleString('zh-CN')}
            </span>

            {/* 合同信息按钮（分析完成后显示） */}
            {analysisStatus === 'completed' && parsedContract && (
              <button
                onClick={() => setIsInfoModalOpen(true)}
                className="ml-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{parsedContract.metadata.contractType}</span>
                <span className="text-blue-100">|</span>
                <span>{parsedContract.clauses.length}条款</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => console.log('保存功能待实现')}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </div>

      {/* AI分析状态提示栏（仅在分析中或失败时显示） */}
      {analysisStatus === 'analyzing' && (
        <div className="bg-blue-50 border-b border-blue-200 flex-shrink-0">
          <div className="px-6 py-2.5 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">
              AI正在分析合同结构...（预计3-5秒）
            </span>
          </div>
        </div>
      )}

      {analysisStatus === 'failed' && (
        <div className="bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <div className="px-6 py-2.5 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              ⚠️ AI分析失败，但不影响编辑功能
            </span>
          </div>
        </div>
      )}

      {/* 主体区域：三栏布局 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧：条款导航 */}
        <ClauseNavigationPanel />

        {/* 中间：编辑器 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            <ContractEditor initialContent={document.editedText} />
          </div>
        </div>

        {/* 右侧：AI助手对话面板 */}
        <ContractAIChatPanel
          isOpen={isChatPanelOpen}
          onClose={() => setIsChatPanelOpen(false)}
        />

        {/* 浮动按钮：打开AI助手 */}
        {!isChatPanelOpen && (
          <button
            onClick={() => setIsChatPanelOpen(true)}
            className="fixed right-6 bottom-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group hover:scale-110 z-50"
            title="打开AI助手"
          >
            <MessageSquare className="w-6 h-6" />
            {/* 脉冲动画提示 */}
            <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></span>
          </button>
        )}
      </div>

      {/* 合同信息详情弹窗 */}
      <ContractInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </div>
  );
}
