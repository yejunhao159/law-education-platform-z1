'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { FileParser } from '@/lib/file-parser';

interface FileUploaderProps {
  onFileSelect: (file: File) => Promise<void>;
}

export function SimpleFileUploader({ onFileSelect }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      console.log('⚠️ 没有选择文件');
      return;
    }

    console.log('📄 开始处理文件:', {
      name: file.name,
      size: (file.size / 1024).toFixed(2) + 'KB',
      type: file.type
    });

    setError(null);
    setSuccess(false);
    setProcessing(true);
    setFileName(file.name);
    setProgress(0);

    try {
      // 文件类型验证
      if (!FileParser.canParse(file)) {
        throw new Error(`不支持的文件格式：${file.name.split('.').pop()?.toUpperCase()}`);
      }

      // 文件大小验证（10MB限制）
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请使用小于10MB的文件`);
      }

      setProgress(20);
      
      // 调用父组件的处理函数
      await onFileSelect(file);
      
      setProgress(100);
      setSuccess(true);
      
    } catch (error) {
      console.error('文件处理失败:', error);
      setError(error instanceof Error ? error.message : '文件处理失败');
      
      // 提供转换建议
      if (error instanceof Error) {
        const tip = FileParser.getConversionTip(file);
        if (tip !== '建议使用 .txt 或 .md 格式，最稳定可靠') {
          setError(`${error.message}\n\n💡 建议：${tip}`);
        }
      }
    } finally {
      setProcessing(false);
      setTimeout(() => {
        setProgress(0);
        if (success) setSuccess(false);
      }, 2000);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 文件选择事件触发:', e.target.files?.[0]?.name);
    await handleFiles(e.target.files);
    // 清空input value，允许重复选择同一文件
    e.target.value = '';
  }, [handleFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    await handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="space-y-4">
      <Card 
        className={`p-8 transition-all border-2 border-dashed ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : processing 
              ? 'border-orange-300 bg-orange-50'
              : success
                ? 'border-green-300 bg-green-50'
                : error
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {success ? (
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
          ) : error ? (
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          ) : (
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          )}
          
          <h3 className="text-lg font-semibold mb-2">
            {success ? '上传成功' : '上传判决书文档'}
          </h3>
          
          <p className="text-sm text-gray-500 mb-4">
            {dragActive 
              ? '松开鼠标上传文件' 
              : '支持 PDF、DOCX、TXT、MD 格式，点击或拖拽文件到此区域'
            }
          </p>
          
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,.doc"
            onChange={handleFileChange}
            disabled={processing}
            className="hidden"
            id="file-upload"
          />
          
          <label htmlFor="file-upload">
            <Button 
              size="lg"
              disabled={processing}
              className="cursor-pointer"
              variant={success ? "outline" : "default"}
            >
              <Upload className="w-4 h-4 mr-2" />
              {processing ? '处理中...' : success ? '重新上传' : '选择文件'}
            </Button>
          </label>
          
          {fileName && (
            <p className="mt-3 text-sm text-gray-600 font-medium">
              📄 {fileName}
            </p>
          )}
          
          {processing && progress > 0 && (
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-gray-500 mt-1">解析进度: {progress}%</p>
            </div>
          )}
          
          {!processing && !success && (
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <p>💡 推荐格式优先级：DOCX {`>`} PDF {`>`} TXT</p>
              <p>📏 文件大小限制：10MB以内</p>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            文件解析成功！正在提取三要素...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}