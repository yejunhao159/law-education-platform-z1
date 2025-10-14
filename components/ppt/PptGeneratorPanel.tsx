/**
 * PPT生成器面板组件
 * 负责整个PPT生成流程的UI交互
 *
 * 流程：
 * 1. 收集数据 + AI生成大纲
 * 2. 展示大纲供用户审核/编辑
 * 3. 调用官方服务生成PPT
 * 4. 展示下载链接
 */

'use client';

import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { PptGeneratorService, type PptResult, type PptGenerationOptions, type PptTemplate, type PptGenerationProgress } from '@/src/domains/teaching-acts/services/PptGeneratorService';
import { PptOutlineEditor } from './PptOutlineEditor';

// ========== 类型定义 ==========

interface PptOutline {
  slides: Array<{
    title: string;
    content: string;
    type: 'cover' | 'content' | 'image' | 'chart' | 'conclusion';
    visualHints?: string;
  }>;
  metadata: {
    totalSlides: number;
    estimatedMinutes: number;
    targetAudience: string;
  };
}

type GenerationStage = 'idle' | 'generating-outline' | 'editing-outline' | 'generating-ppt' | 'completed' | 'error';

interface PptGeneratorPanelProps {
  /**
   * 生成完成回调
   */
  onComplete?: (result: PptResult) => void;

  /**
   * 关闭面板回调
   */
  onClose?: () => void;

  /**
   * PPT模版类型
   * @default 'school-leadership'
   */
  template?: PptTemplate;

  /**
   * 是否显示模板选择器
   * @default true
   */
  showTemplateSelector?: boolean;
}

// ========== 主组件 ==========

export function PptGeneratorPanel({
  onComplete,
  onClose,
  template: initialTemplate = 'school-leadership',
  showTemplateSelector = true
}: PptGeneratorPanelProps) {
  // 状态管理
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [outline, setOutline] = useState<PptOutline | null>(null);
  const [pptResult, setPptResult] = useState<PptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<PptGenerationProgress | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PptTemplate>(initialTemplate);

  /**
   * 阶段1: 生成大纲
   */
  const handleGenerateOutline = async () => {
    try {
      setStage('generating-outline');
      setError(null);
      setProgress({ stage: 'outline', progress: 10, message: '正在初始化...' });

      // 获取API Key
      const apiKey = process.env.NEXT_PUBLIC_AI_302_API_KEY;
      if (!apiKey) {
        throw new Error('PPT生成服务API Key未配置，请在环境变量中设置 NEXT_PUBLIC_AI_302_API_KEY');
      }

      // 初始化服务
      const service = new PptGeneratorService(apiKey);

      const options: PptGenerationOptions = {
        template: selectedTemplate,  // 使用用户选择的模板
        language: 'zh',
        length: 'medium',
        onProgress: (prog) => {
          console.log('📊 [PptGeneratorPanel] 进度更新:', prog);
          setProgress(prog);
        }
      };

      // 调用DeepSeek生成大纲
      setProgress({ stage: 'outline', progress: 20, message: 'AI正在分析教学数据...' });
      const generatedOutline = await service.generateOutlineOnly(options);

      setOutline(generatedOutline);
      setProgress({ stage: 'outline', progress: 100, message: '大纲生成完成！' });
      setStage('editing-outline');

    } catch (err) {
      console.error('生成大纲失败:', err);
      setError(err instanceof Error ? err.message : '生成大纲失败，请重试');
      setStage('error');
    }
  };

  /**
   * 阶段2: 用户编辑完成，确认生成PPT
   */
  const handleConfirmOutline = async (editedOutline: PptOutline) => {
    try {
      setStage('generating-ppt');
      setError(null);
      setOutline(editedOutline);
      setProgress({ stage: 'content', progress: 35, message: '开始生成PPT...' });

      // 获取API Key
      const apiKey = process.env.NEXT_PUBLIC_AI_302_API_KEY;
      if (!apiKey) {
        throw new Error('PPT生成服务API Key未配置');
      }

      const service = new PptGeneratorService(apiKey);

      const options: PptGenerationOptions = {
        template: selectedTemplate,  // 使用用户选择的模板
        includeDialogue: true,
        language: 'zh',
        length: 'medium',
        onProgress: (prog) => {
          console.log('📊 [PptGeneratorPanel] PPT生成进度:', prog);
          setProgress(prog);
        }
      };

      // 使用已编辑的大纲生成PPT（异步流式方案）
      const result = await service.generateFromOutline(editedOutline, options);

      if (!result.success) {
        throw new Error(result.error || 'PPT生成失败');
      }

      setPptResult(result);
      setProgress({ stage: 'completed', progress: 100, message: 'PPT生成完成！' });
      setStage('completed');

      // 回调通知外部
      if (onComplete) {
        onComplete(result);
      }

    } catch (err) {
      console.error('生成PPT失败:', err);
      setError(err instanceof Error ? err.message : '生成PPT失败，请重试');
      setStage('error');
    }
  };

  /**
   * 取消编辑，返回初始状态
   */
  const handleCancelEdit = () => {
    setStage('idle');
    setOutline(null);
  };

  /**
   * 重试
   */
  const handleRetry = () => {
    setStage('idle');
    setError(null);
    setPptResult(null);
    setOutline(null);
  };

  // ========== 渲染不同阶段的UI ==========

  /**
   * 初始状态：显示开始按钮
   */
  if (stage === 'idle') {
    const templateOptions: Array<{ value: PptTemplate; label: string; description: string }> = [
      { value: 'school-leadership', label: '学校领导汇报', description: '适合向学校领导展示教学创新和课程效果' },
      { value: 'teacher-training', label: '教师培训', description: '适合教师培训，展示教学方法和实践技巧' },
      { value: 'education-bureau', label: '教育局申报', description: '适合项目申报，强调创新价值和社会效益' },
      { value: 'parent-meeting', label: '家长会展示', description: '适合向家长展示学习成果和能力提升' },
      { value: 'academic-conference', label: '学术会议', description: '适合学术交流，强调方法创新和理论深度' }
    ];

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            生成教学PPT
          </CardTitle>
          <CardDescription>
            基于四幕教学数据，生成专业的教学汇报PPT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 模板选择器 */}
          {showTemplateSelector && (
            <div className="space-y-3">
              <label className="text-sm font-medium">选择PPT受众类型</label>
              <div className="grid grid-cols-1 gap-3">
                {templateOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(option.value)}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        checked={selectedTemplate === option.value}
                        onChange={() => setSelectedTemplate(option.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">生成流程：</h4>
            <ol className="space-y-2 text-sm text-gray-700">
              <li>1️⃣ AI分析四幕教学数据，生成PPT大纲</li>
              <li>2️⃣ 您可以预览和编辑大纲内容</li>
              <li>3️⃣ 确认后，系统生成精美PPT</li>
              <li>4️⃣ 下载使用（预计总耗时 30-40秒）</li>
            </ol>
          </div>

          <div className="flex justify-end gap-3">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
            )}
            <Button onClick={handleGenerateOutline}>
              <FileText className="w-4 h-4 mr-2" />
              开始生成
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * 生成大纲中
   */
  if (stage === 'generating-outline') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-10 pb-10">
          <div className="text-center mb-6">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-medium mb-2">AI正在生成PPT大纲...</h3>
            <p className="text-sm text-gray-600 mb-4">
              {progress?.message || '正在分析四幕教学数据...'}
            </p>
          </div>

          {/* 进度条 */}
          {progress && (
            <div className="max-w-md mx-auto">
              <Progress value={progress.progress} className="h-2 mb-2" />
              <p className="text-xs text-gray-500 text-center">{progress.progress}%</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  /**
   * 编辑大纲
   */
  if (stage === 'editing-outline' && outline) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>预览和编辑PPT大纲</CardTitle>
          <CardDescription>
            请检查并调整大纲内容，确认后将生成PPT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PptOutlineEditor
            outline={outline}
            onConfirm={handleConfirmOutline}
            onCancel={handleCancelEdit}
          />
        </CardContent>
      </Card>
    );
  }

  /**
   * 生成PPT中
   */
  if (stage === 'generating-ppt') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-10 pb-10">
          <div className="text-center mb-6">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-medium mb-2">正在生成PPT...</h3>
            <p className="text-sm text-gray-600 mb-4">
              {progress?.message || '系统正在渲染您的PPT...'}
            </p>
          </div>

          {/* 进度条 */}
          {progress && (
            <div className="max-w-md mx-auto mb-6">
              <Progress value={progress.progress} className="h-2 mb-2" />
              <p className="text-xs text-gray-500 text-center">{progress.progress}%</p>
            </div>
          )}

          {/* 阶段指示器 */}
          <div className="flex justify-center items-center gap-6 mb-4">
            <div className={`flex items-center gap-2 ${progress?.stage === 'content' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${progress?.stage === 'content' ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs">生成内容</span>
            </div>
            <div className={`flex items-center gap-2 ${progress?.stage === 'rendering' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${progress?.stage === 'rendering' ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs">渲染PPT</span>
            </div>
            <div className={`flex items-center gap-2 ${progress?.stage === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${progress?.stage === 'completed' ? 'bg-green-600' : 'bg-gray-400'}`} />
              <span className="text-xs">完成</span>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>共 {outline?.slides.length || 0} 页</p>
            <p>预计演讲时长: {outline?.metadata.estimatedMinutes || 0} 分钟</p>
            {progress?.pptId && (
              <p className="mt-2 font-mono text-[10px]">PPT ID: {progress.pptId}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * 生成完成
   */
  if (stage === 'completed' && pptResult) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-10 pb-10 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
          <h3 className="text-lg font-medium mb-2">PPT生成成功！</h3>

          <div className="bg-green-50 p-4 rounded-lg mb-6 text-sm">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <span className="text-gray-600">总页数：</span>
                <span className="font-medium">{pptResult.slides || outline?.slides.length || 0} 页</span>
              </div>
              {pptResult.size && (
                <div>
                  <span className="text-gray-600">文件大小：</span>
                  <span className="font-medium">{pptResult.size}</span>
                </div>
              )}
              {pptResult.cost && (
                <div>
                  <span className="text-gray-600">成本：</span>
                  <span className="font-medium">¥{pptResult.cost.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            {pptResult.url && (
              <Button asChild>
                <a
                  href={pptResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载PPT
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={handleRetry}>
              生成新的PPT
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                关闭
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * 错误状态
   */
  if (stage === 'error') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="pt-10 pb-10">
          <div className="text-center mb-6">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-medium mb-2">生成失败</h3>
          </div>

          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="flex justify-center gap-3">
            <Button onClick={handleRetry}>
              重试
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                关闭
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
