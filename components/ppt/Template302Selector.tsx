/**
 * 官方模板选择器
 * 提供预设的PPT设计模板
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Shuffle, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Template302 {
  id: string;
  name: string;
  coverUrl?: string;
  style?: string;
  description?: string;
}

interface Template302SelectorProps {
  selected?: string;
  onSelect: (templateId: string | undefined) => void;
}

export function Template302Selector({ selected, onSelect }: Template302SelectorProps) {
  const [templates, setTemplates] = useState<Template302[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 加载预设模板
    setLoading(true);
    setTimeout(() => {
      setTemplates(getMockTemplates());
      setLoading(false);
    }, 300); // 模拟加载效果
  }, []);

  /**
   * 预设模板数据
   * 提供多种常用的PPT设计风格供用户选择
   */
  function getMockTemplates(): Template302[] {
    return [
      {
        id: 'business-formal',
        name: '商务正式',
        style: 'formal',
        description: '适合商务汇报、正式场合'
      },
      {
        id: 'modern-simple',
        name: '现代简约',
        style: 'modern',
        description: '简洁设计，适合教学培训'
      },
      {
        id: 'academic-style',
        name: '学术风格',
        style: 'academic',
        description: '专业严谨，适合学术汇报'
      },
      {
        id: 'creative-colorful',
        name: '创意多彩',
        style: 'creative',
        description: '活泼生动，适合创新展示'
      }
    ];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">加载模板中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 随机模板选项 */}
        <Card
          className={`cursor-pointer hover:shadow-lg transition-all ${
            !selected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-300'
          }`}
          onClick={() => onSelect(undefined)}
        >
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 mx-auto mb-4 flex items-center justify-center">
              <Shuffle className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold mb-1">随机模板</h3>
            <p className="text-xs text-gray-600">由AI自动选择最佳模板</p>
            {!selected && (
              <Badge className="mt-2 bg-blue-500">已选择</Badge>
            )}
          </CardContent>
        </Card>

        {/* 官方模板列表 */}
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer hover:shadow-lg transition-all ${
              selected === template.id ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-gray-300'
            }`}
            onClick={() => onSelect(template.id)}
          >
            <CardContent className="p-6">
              {/* 模板预览图 */}
              {template.coverUrl ? (
                <img
                  src={template.coverUrl}
                  alt={template.name}
                  className="w-full aspect-video object-cover rounded mb-3"
                />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded mb-3 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">预览图</span>
                </div>
              )}

              {/* 模板信息 */}
              <div className="text-center">
                <h3 className="font-semibold mb-1">{template.name}</h3>
                {template.description && (
                  <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                )}
                {template.style && (
                  <Badge variant="outline" className="text-xs">
                    {template.style}
                  </Badge>
                )}
                {selected === template.id && (
                  <Badge className="mt-2 bg-blue-500">已选择</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
        <p className="flex items-start gap-2">
          <span>💡</span>
          <span>
            <strong>提示：</strong>
            {selected
              ? `您已选择"${templates.find(t => t.id === selected)?.name || selected}"模板。系统会应用对应的设计风格生成PPT。`
              : '推荐使用"随机模板"，系统会根据内容自动选择最合适的设计风格。'
            }
          </span>
        </p>
      </div>
    </div>
  );
}
