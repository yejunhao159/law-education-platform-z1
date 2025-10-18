/**
 * PPT生成独立页面
 * 路由：/teaching/ppt/generate
 *
 * 功能：
 * 1. 收集四幕教学数据
 * 2. DeepSeek流式生成大纲（实时显示）
 * 3. 纯文字编辑器修改大纲
 * 4. 选择官方模板
 * 5. 生成PPT并下载
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTeachingStore } from '@/src/domains/teaching-acts/stores/useTeachingStore';
import { Template302Selector } from '@/components/ppt/Template302Selector';
import { StreamingOutlineEditor } from '@/components/ppt/StreamingOutlineEditor';
import { PptDebugPanel } from '@/components/ppt/PptDebugPanel';
import { PptDataFlowDebugger } from '@/components/ppt/PptDataFlowDebugger';
import { PptGeneratorService } from '@/src/domains/teaching-acts/services/PptGeneratorService';
import type { PptGenerationProgress } from '@/src/domains/teaching-acts/services/PptGeneratorService';

type Stage = 'template' | 'generating' | 'editing' | 'rendering' | 'completed' | 'error';

export default function PptGeneratePage() {
  const router = useRouter();

  // 状态管理
  const [stage, setStage] = useState<Stage>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [outlineText, setOutlineText] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<PptGenerationProgress | null>(null);
  const [pptResult, setPptResult] = useState<{ url: string; coverUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 检查是否有四幕数据
  const store = useTeachingStore();
  const hasData = store.uploadData.extractedElements || store.analysisData.result;

  useEffect(() => {
    if (!hasData) {
      // 如果没有数据，提示用户
      setError('请先完成前四幕教学流程，才能生成PPT');
      setStage('error');
    }
  }, [hasData]);

  /**
   * 阶段1：选择模板后，开始生成大纲
   */
  const handleStartGenerate = async () => {
    try {
      setStage('generating');
      setError(null);
      setStreamingText('');
      setIsStreaming(true);

      // 调用流式生成大纲
      await generateOutlineWithStreaming();

      setIsStreaming(false);
      setStage('editing');
    } catch (err) {
      console.error('生成大纲失败:', err);
      setError(err instanceof Error ? err.message : '生成大纲失败');
      setStage('error');
      setIsStreaming(false);
    }
  };

  /**
   * 使用真正的流式API生成大纲（直接生成Markdown）
   * ✅ 使用PptGeneratorService.generateOutlineStream()方法
   * 🎯 重构说明：现在直接返回Markdown，无需JSON转换
   */
  async function generateOutlineWithStreaming() {
    const service = new PptGeneratorService();

    // 收集数据
    const data = service.collectData();

    // 🚀 使用真正的流式API生成大纲 - 直接返回Markdown
    const markdownText = await service.generateOutlineStream(
      data,
      {
        template: 'education-bureau',
        style: 'formal',
        length: 'medium',
        includeDialogue: true
      },
      (chunk: string) => {
        // 实时更新UI显示 - 用户能看到可读的Markdown而非JSON
        setStreamingText(prev => prev + chunk);
      }
    );

    console.log('✅ [页面] Markdown大纲流式生成完成:', {
      contentLength: markdownText.length,
      estimatedPages: (markdownText.match(/##/g) || []).length,
      hasDesignHints: markdownText.includes('💡 设计提示')
    });

    // 🎯 关键简化：直接使用Markdown，无需转换
    setOutlineText(markdownText);
    return markdownText;
  }

  /**
   * 阶段2：确认大纲，开始生成PPT
   */
  const handleConfirmOutline = async () => {
    try {
      setStage('rendering');
      setError(null);

      const service = new PptGeneratorService();

      // 调用PPT生成服务
      const result = await service.generateFromMarkdown(outlineText, {
        templateId: selectedTemplateId,
        language: 'zh',
        onProgress: (prog) => {
          console.log('📊 进度更新:', prog);
          setProgress(prog);
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'PPT生成失败');
      }

      setPptResult({
        url: result.url!,
        coverUrl: result.coverUrl
      });
      setStage('completed');

    } catch (err) {
      console.error('生成PPT失败:', err);
      setError(err instanceof Error ? err.message : '生成PPT失败');
      setStage('error');
    }
  };

  /**
   * 重新开始
   */
  const handleRestart = () => {
    setStage('template');
    setSelectedTemplateId(undefined);
    setOutlineText('');
    setStreamingText('');
    setProgress(null);
    setPptResult(null);
    setError(null);
  };

  // ========== 渲染 ==========

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto py-8 max-w-6xl">
        {/* 顶部导航 */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回学习报告
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">生成教学PPT</h1>
              <p className="text-gray-600">基于四幕教学数据，智能生成专业PPT</p>
            </div>
          </div>
        </div>

        {/* 阶段指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <StageIndicator label="选择模板" active={stage === 'template'} completed={['generating', 'editing', 'rendering', 'completed'].includes(stage)} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div className={`h-full bg-blue-500 transition-all ${['generating', 'editing', 'rendering', 'completed'].includes(stage) ? 'w-full' : 'w-0'}`} />
            </div>
            <StageIndicator label="生成大纲" active={stage === 'generating'} completed={['editing', 'rendering', 'completed'].includes(stage)} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div className={`h-full bg-blue-500 transition-all ${['editing', 'rendering', 'completed'].includes(stage) ? 'w-full' : 'w-0'}`} />
            </div>
            <StageIndicator label="编辑确认" active={stage === 'editing'} completed={['rendering', 'completed'].includes(stage)} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div className={`h-full bg-blue-500 transition-all ${['rendering', 'completed'].includes(stage) ? 'w-full' : 'w-0'}`} />
            </div>
            <StageIndicator label="生成PPT" active={stage === 'rendering'} completed={stage === 'completed'} />
          </div>
        </div>

        {/* 🔍 数据调试面板 */}
        <div className="mb-6 space-y-4">
          <PptDebugPanel />
          <PptDataFlowDebugger />
        </div>

        {/* 主内容区 */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* 错误状态 */}
            {stage === 'error' && (
              <div className="text-center py-12">
                <div className="text-red-600 text-lg mb-4">{error}</div>
                <Button onClick={handleRestart}>重新开始</Button>
              </div>
            )}

            {/* 阶段1：选择模板 */}
            {stage === 'template' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">选择PPT模板</h2>
                  <p className="text-gray-600 text-sm">从官方模板库中选择您喜欢的设计风格</p>
                </div>

                <Template302Selector
                  selected={selectedTemplateId}
                  onSelect={setSelectedTemplateId}
                />

                <div className="flex justify-end pt-4">
                  <Button
                    size="lg"
                    onClick={handleStartGenerate}
                    disabled={!hasData}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    开始生成大纲
                  </Button>
                </div>
              </div>
            )}

            {/* 阶段2：生成大纲中 */}
            {stage === 'generating' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                  <h2 className="text-xl font-semibold mb-2">AI正在生成PPT大纲...</h2>
                  <p className="text-gray-600 text-sm">请稍候，这可能需要5-10秒</p>
                </div>

                {/* 流式输出显示 */}
                <StreamingOutlineEditor
                  content={streamingText}
                  isStreaming={isStreaming}
                  readOnly
                />
              </div>
            )}

            {/* 阶段3：编辑大纲 */}
            {stage === 'editing' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">预览和编辑大纲</h2>
                  <p className="text-gray-600 text-sm">您可以直接修改文本内容，调整页面标题和描述</p>
                </div>

                <StreamingOutlineEditor
                  content={outlineText}
                  onChange={setOutlineText}
                  isStreaming={false}
                />

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleRestart}>
                    重新生成
                  </Button>
                  <Button size="lg" onClick={handleConfirmOutline}>
                    确认并生成PPT
                  </Button>
                </div>
              </div>
            )}

            {/* 阶段4：渲染PPT中 */}
            {stage === 'rendering' && (
              <div className="space-y-6 py-12">
                <div className="text-center mb-8">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                  <h2 className="text-xl font-semibold mb-2">正在生成PPT...</h2>
                  <p className="text-gray-600 text-sm">
                    {progress?.message || '系统正在渲染您的PPT...'}
                  </p>
                </div>

                {progress && (
                  <div className="max-w-md mx-auto">
                    <Progress value={progress.progress} className="h-2 mb-2" />
                    <p className="text-xs text-gray-500 text-center">{progress.progress}%</p>
                  </div>
                )}
              </div>
            )}

            {/* 阶段5：完成 */}
            {stage === 'completed' && pptResult && (
              <div className="text-center py-12 space-y-6">
                <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                  <Download className="w-8 h-8 text-green-600" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-2">PPT生成成功！</h2>
                  <p className="text-gray-600">您的教学PPT已准备就绪</p>
                </div>

                {pptResult.coverUrl && (
                  <div className="max-w-2xl mx-auto">
                    <img
                      src={pptResult.coverUrl}
                      alt="PPT封面"
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                )}

                <div className="flex justify-center gap-4">
                  <Button size="lg" asChild>
                    <a href={pptResult.url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-5 h-5 mr-2" />
                      下载PPT
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleRestart}>
                    生成新的PPT
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * 阶段指示器组件
 */
function StageIndicator({ label, active, completed }: { label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
        completed
          ? 'bg-blue-500 border-blue-500'
          : active
          ? 'bg-white border-blue-500'
          : 'bg-white border-gray-300'
      }`}>
        {completed ? (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className={`w-3 h-3 rounded-full ${active ? 'bg-blue-500' : 'bg-gray-300'}`} />
        )}
      </div>
      <span className={`text-xs mt-2 ${active || completed ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
