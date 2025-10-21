'use client';

/**
 * 文件上传区域组件
 * 支持拖拽上传PDF/Word文档
 */

import { useState, useRef } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onExtractComplete?: (text: string) => void;
  accept?: string;
  maxSize?: number; // MB
}

export function FileUploadZone({
  onFileSelect,
  onExtractComplete,
  accept = '.pdf,.doc,.docx',
  maxSize = 10,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      return `文件大小超过${maxSize}MB限制`;
    }

    // 检查文件类型
    const validTypes = accept.split(',').map((t) => t.trim());
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExt)) {
      return `不支持的文件格式，请上传${validTypes.join('、')}格式`;
    }

    return null;
  };

  const handleFile = async (file: File) => {
    setError(null);

    // 验证文件
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // 提取文本
    setIsExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      onExtractComplete?.(text);
    } catch (err) {
      setError('文本提取失败，请重试');
      console.error('Text extraction error:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'pdf') {
      return await extractFromPDF(file);
    } else if (fileExt === 'doc' || fileExt === 'docx') {
      return await extractFromWord(file);
    }

    throw new Error('Unsupported file type');
  };

  const extractFromPDF = async (file: File): Promise<string> => {
    // TODO: 使用 pdfjs-dist 提取PDF文本
    // 这里是示例实现，实际应该使用 pdf.js
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // 实际实现需要使用 pdf.js 解析
        resolve('PDF文本提取功能待实现，这是示例文本');
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const extractFromWord = async (file: File): Promise<string> => {
    // TODO: 使用 mammoth 提取Word文本
    // 这里是示例实现
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // 实际实现需要使用 mammoth
        resolve('Word文本提取功能待实现，这是示例文本');
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="w-full">
      {/* 上传区域 */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
          />

          <Upload
            className={`w-12 h-12 mx-auto mb-4 ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`}
          />

          <p className="text-lg font-medium text-gray-700 mb-2">
            {isDragging ? '释放文件以上传' : '拖拽文件到这里，或点击选择'}
          </p>

          <p className="text-sm text-gray-500">
            支持 {accept.split(',').join('、')} 格式，大小不超过 {maxSize}MB
          </p>
        </div>
      ) : (
        /* 文件信息 */
        <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
          <div className="flex items-start gap-4">
            <File className="w-8 h-8 text-green-600 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-800 truncate">{selectedFile.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {formatFileSize(selectedFile.size)}
              </p>

              {isExtracting && (
                <div className="flex items-center gap-2 mt-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">正在提取文本...</span>
                </div>
              )}

              {!isExtracting && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-sm text-green-700">✓ 文件上传成功</span>
                </div>
              )}
            </div>

            <button
              onClick={handleRemoveFile}
              className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
              title="移除文件"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
