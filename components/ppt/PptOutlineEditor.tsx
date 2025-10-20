/**
 * PPT大纲编辑器组件
 * 允许用户预览和编辑AI生成的PPT大纲
 */

'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Plus, FileText, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ========== 类型定义 ==========

interface PptSlide {
  title?: string;
  content?: string;
  type?: 'cover' | 'content' | 'image' | 'chart' | 'conclusion';
  visualHints?: string;
}

interface PptOutline {
  slides: PptSlide[];
  metadata: {
    totalSlides: number;
    estimatedMinutes: number;
    targetAudience: string;
  };
}

interface PptOutlineEditorProps {
  outline: PptOutline;
  onConfirm: (editedOutline: PptOutline) => void;
  onCancel: () => void;
}

// ========== 辅助函数 ==========

const getSlideTypeLabel = (type: PptSlide['type']) => {
  const labels = {
    cover: '封面',
    content: '内容',
    image: '图片',
    chart: '图表',
    conclusion: '总结'
  };
  return labels[type];
};

const getSlideTypeColor = (type: PptSlide['type']) => {
  const colors = {
    cover: 'bg-purple-100 text-purple-700',
    content: 'bg-blue-100 text-blue-700',
    image: 'bg-green-100 text-green-700',
    chart: 'bg-orange-100 text-orange-700',
    conclusion: 'bg-pink-100 text-pink-700'
  };
  return colors[type];
};

// ========== 主组件 ==========

export function PptOutlineEditor({ outline, onConfirm, onCancel }: PptOutlineEditorProps) {
  const [editedOutline, setEditedOutline] = useState<PptOutline>({ ...outline });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  /**
   * 更新幻灯片
   */
  const updateSlide = (index: number, field: keyof PptSlide, value: string) => {
    const newSlides = [...editedOutline.slides];
    newSlides[index] = {
      ...newSlides[index],
      [field]: value
    };
    setEditedOutline({
      ...editedOutline,
      slides: newSlides,
      metadata: {
        ...editedOutline.metadata,
        totalSlides: newSlides.length
      }
    });
  };

  /**
   * 删除幻灯片
   */
  const deleteSlide = (index: number) => {
    const newSlides = editedOutline.slides.filter((_, i) => i !== index);
    setEditedOutline({
      ...editedOutline,
      slides: newSlides,
      metadata: {
        ...editedOutline.metadata,
        totalSlides: newSlides.length
      }
    });
  };

  /**
   * 添加新幻灯片
   */
  const addSlide = () => {
    const newSlide: PptSlide = {
      title: '新增页面',
      content: '请输入内容...',
      type: 'content'
    };
    setEditedOutline({
      ...editedOutline,
      slides: [...editedOutline.slides, newSlide],
      metadata: {
        ...editedOutline.metadata,
        totalSlides: editedOutline.slides.length + 1
      }
    });
  };

  /**
   * 确认编辑
   */
  const handleConfirm = () => {
    onConfirm(editedOutline);
  };

  return (
    <div className="space-y-6">
      {/* 元数据卡片 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">总页数</div>
                  <div className="text-lg font-semibold">{editedOutline.metadata.totalSlides}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm text-gray-600">预计时长</div>
                  <div className="text-lg font-semibold">{editedOutline.metadata.estimatedMinutes} 分钟</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">目标受众</div>
                  <div className="text-lg font-semibold">{editedOutline.metadata.targetAudience}</div>
                </div>
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={addSlide}>
              <Plus className="w-4 h-4 mr-1" />
              添加页面
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 幻灯片列表 */}
      <div className="space-y-4">
        {editedOutline.slides.map((slide, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <Badge className={getSlideTypeColor(slide.type)}>
                    {getSlideTypeLabel(slide.type)}
                  </Badge>
                  {editingIndex === index ? (
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlide(index, 'title', e.target.value)}
                      className="flex-1"
                      placeholder="幻灯片标题"
                    />
                  ) : (
                    <CardTitle className="text-base flex-1">{slide.title}</CardTitle>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingIndex === index ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingIndex(null)}
                    >
                      完成
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingIndex(index)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {editedOutline.slides.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSlide(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* 内容编辑 */}
              {editingIndex === index ? (
                <Textarea
                  value={slide.content}
                  onChange={(e) => updateSlide(index, 'content', e.target.value)}
                  className="min-h-[100px]"
                  placeholder="幻灯片内容"
                />
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded">
                  {slide.content}
                </div>
              )}

              {/* 可视化提示 */}
              {slide.visualHints && (
                <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                  <span className="font-medium">💡 设计提示：</span> {slide.visualHints}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleConfirm}>
          确认并生成PPT
        </Button>
      </div>
    </div>
  );
}
