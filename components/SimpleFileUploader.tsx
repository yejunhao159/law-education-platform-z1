'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';

export function SimpleFileUploader({ onFileProcessed }: any) {
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setFileName(file.name);

    try {
      // 直接读取文本文件
      const text = await file.text();
      
      // 简单提取信息
      const caseNumber = text.match(/[(（]\d{4}[）)].*?第?\d+号/)?.[0];
      const court = text.match(/[\u4e00-\u9fa5]+人民法院/)?.[0];
      
      const result = {
        text,
        metadata: {
          fileName: file.name,
          fileType: file.name.split('.').pop() || 'unknown',
          caseNumber,
          court,
        }
      };

      onFileProcessed?.(result);
      
    } catch (error) {
      console.error('文件读取失败:', error);
      alert('文件读取失败，请使用 .txt 或 .md 格式');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">上传判决书</h3>
        <p className="text-sm text-gray-500 mb-4">支持 TXT、MD 格式</p>
        
        <input
          type="file"
          accept=".txt,.md"
          onChange={handleFileChange}
          disabled={processing}
          className="hidden"
          id="file-upload"
        />
        
        <label htmlFor="file-upload">
          <Button as="span" disabled={processing} className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            {processing ? '处理中...' : '选择文件'}
          </Button>
        </label>
        
        {fileName && (
          <p className="mt-2 text-sm text-gray-600">
            已选择: {fileName}
          </p>
        )}
      </div>
    </Card>
  );
}