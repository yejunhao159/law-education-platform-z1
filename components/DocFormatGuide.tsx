'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, ArrowRight, CheckCircle } from 'lucide-react';

export function DocFormatGuide() {
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <FileText className="h-4 w-4 text-orange-600" />
      <AlertTitle>需要上传 .doc 文件？</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          请先将文件转换为 .docx 格式（2分钟搞定）：
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">方法1：使用 Word</span>
          </div>
          <ol className="ml-6 space-y-1 text-sm text-gray-600">
            <li>1. 用 Word 打开 .doc 文件</li>
            <li>2. 点击"文件" → "另存为"</li>
            <li>3. 选择"Word 文档 (*.docx)"格式</li>
            <li>4. 保存后上传新文件</li>
          </ol>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">方法2：在线转换（免费）</span>
          </div>
          <div className="ml-6 space-y-2">
            <a 
              href="https://www.ilovepdf.com/word_to_pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
            >
              iLovePDF（支持转PDF）
              <ArrowRight className="w-3 h-3" />
            </a>
            <p className="text-xs text-gray-500">
              提示：也可以直接上传 PDF 格式
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 mt-3 p-2 bg-green-50 rounded">
          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium">为什么这样做？</span>
            <p className="text-gray-600 mt-1">
              .docx 是标准格式，解析更准确、更快速。
              转换只需一次，之后可以一直使用。
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}