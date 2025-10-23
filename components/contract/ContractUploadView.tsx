/**
 * 合同上传视图
 * 提供文件上传界面，处理文档提取并存入Store
 */

'use client';

import { FileUploadZone } from './FileUploadZone';
import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';

export function ContractUploadView() {
  const { setDocument, setParsedContract, setAnalysisStatus } = useContractEditorStore();

  const handleFileSelect = (file: File) => {
    console.log('📁 文件选中:', file.name, '大小:', (file.size / 1024).toFixed(2), 'KB');
  };

  const handleExtractComplete = async (text: string, file: File) => {
    console.log('📝 文本提取完成');
    console.log('  - 文件名:', file.name);
    console.log('  - 文本长度:', text.length, '字符');
    console.log('  - 文本预览:', text.substring(0, 100) + '...');

    // 1. ✅ 立即创建文档对象并存入Store（不等待解析）
    const document = {
      id: `contract-${Date.now()}`,
      fileName: file.name,
      uploadTime: new Date(),
      originalText: text,
      editedText: text,
    };

    console.log('💾 保存到Store:', document.id);
    setDocument(document);

    console.log('✅ 文档上传流程完成，即将跳转到编辑器');

    // 2. 🔄 后台异步调用AI解析（不阻塞UI）
    parseContractInBackground(text);
  };

  /**
   * 后台异步解析合同（不阻塞UI）
   */
  const parseContractInBackground = async (text: string) => {
    console.log('🤖 开始后台AI分析...');
    setAnalysisStatus('analyzing');

    try {
      const response = await fetch('/api/contract/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractText: text }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ AI分析完成:', result.data);
        setParsedContract(result.data.contract);
        setAnalysisStatus('completed');
      } else {
        throw new Error(result.message || '分析失败');
      }
    } catch (error) {
      console.error('❌ 后台AI分析失败:', error);
      setAnalysisStatus('failed');
      // 注意：失败不影响编辑功能，用户仍可编辑文档
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            合同分析助手
          </h1>
          <p className="text-lg text-gray-600">
            上传合同文档，开始智能分析
          </p>
        </div>

        {/* 上传区域 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <FileUploadZone
            onFileSelect={handleFileSelect}
            onExtractComplete={handleExtractComplete}
            accept=".docx,.doc"
            maxSize={10}
          />

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              📌 使用提示
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 支持 .docx 和 .doc 格式的合同文档</li>
              <li>• 文件大小不超过 10MB</li>
              <li>• 上传后自动提取文本并进入编辑器</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
