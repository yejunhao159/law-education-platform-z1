'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { FileParser } from '@/lib/file-parser';
import { LegalParser } from '@/lib/legal-parser';

interface Props {
  onFileProcessed?: (document: any) => void;
}

export function MinimalFileUploader({ onFileProcessed }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setSuccess(false);
    setParsing(true);

    try {
      // 检查是否支持
      if (!FileParser.canParse(selectedFile)) {
        throw new Error(FileParser.getConversionTip(selectedFile));
      }

      // 解析文件
      console.log('开始解析文件:', selectedFile.name);
      const text = await FileParser.parse(selectedFile);
      console.log('文件解析成功，长度:', text.length);

      // 提取法律信息
      const legalDoc = LegalParser.parse(text);
      
      const result = {
        text,
        metadata: {
          fileName: selectedFile.name,
          fileType: selectedFile.name.split('.').pop() || 'unknown',
          caseNumber: legalDoc.caseNumber,
          court: legalDoc.court,
          date: legalDoc.date,
          parties: legalDoc.parties
        },
        legalAnalysis: legalDoc
      };

      setParsedData(result);
      setSuccess(true);
      onFileProcessed?.(result);

    } catch (err: any) {
      console.error('解析失败:', err);
      setError(err.message || '文件解析失败');
    } finally {
      setParsing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setError('');
    setSuccess(false);
    setParsedData(null);
  };

  return (
    <div className="space-y-4">
      {/* 文件选择 */}
      <Card className="p-6">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">上传判决书</h3>
          <p className="text-sm text-gray-500 mb-4">
            支持 TXT、MD、DOCX、PDF 格式
          </p>

          <input
            type="file"
            accept=".txt,.md,.docx,.pdf"
            onChange={handleFileSelect}
            disabled={parsing}
            className="hidden"
            id="file-input"
          />
          
          <Button 
            onClick={() => document.getElementById('file-input')?.click()}
            disabled={parsing}
            className="cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            {parsing ? '解析中...' : '选择文件'}
          </Button>

          {file && (
            <p className="mt-2 text-sm text-gray-600">
              已选择: {file.name}
            </p>
          )}
        </div>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{error}</p>
              <p className="text-sm text-gray-600">
                建议：将文件内容复制到记事本，保存为 .txt 格式后重新上传
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={reset}
              >
                重试
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 成功提示 */}
      {success && parsedData && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">文件解析成功！</p>
              {parsedData.metadata.caseNumber && (
                <p className="text-sm">案号：{parsedData.metadata.caseNumber}</p>
              )}
              {parsedData.metadata.court && (
                <p className="text-sm">法院：{parsedData.metadata.court}</p>
              )}
              <Button 
                size="sm"
                onClick={() => console.log('进入下一步')}
              >
                进入分析
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}