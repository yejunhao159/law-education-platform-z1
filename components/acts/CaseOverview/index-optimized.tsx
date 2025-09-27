'use client'

/**
 * 案件概况组件 (CaseOverview) - 优化版
 *
 * 主要改进：
 * 1. 删除数据模式，统一使用故事形式展示
 * 2. 优化AI故事生成逻辑，提高成功率
 * 3. 添加故事缓存机制，避免重复生成
 * 4. 改进错误处理和降级策略
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StoryView } from './StoryView'
import { useCurrentCase } from '@/src/domains/stores'
import { useTeachingStore } from '@/src/domains/teaching-acts/stores/useTeachingStore'
import { BookOpen, Clock, Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { createLogger } from '@/lib/logging'
import { Button } from '@/components/ui/button'

const logger = createLogger('CaseOverview');

// 故事缓存
const storyCache = new Map<string, any>();

export function CaseOverview() {
  const caseData = useCurrentCase()
  const storyChapters = useTeachingStore((state) => state.storyChapters)
  const setCurrentAct = useTeachingStore((state) => state.setCurrentAct)

  const [hasInitializedStory, setHasInitializedStory] = useState(false)
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [aiGenerationError, setAIGenerationError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // 获取缓存键
  const getCacheKey = useCallback(() => {
    if (!caseData?.basicInfo?.caseNumber) return null;
    return `story_${caseData.basicInfo.caseNumber}`;
  }, [caseData]);

  // 🚀 优化后的AI智能故事生成
  const generateStoryChapters = useCallback(async (forceRegenerate = false) => {
    if (!caseData || isGeneratingStory) return

    const cacheKey = getCacheKey();

    // 检查缓存
    if (!forceRegenerate && cacheKey && storyCache.has(cacheKey)) {
      logger.info('从缓存加载故事');
      const cached = storyCache.get(cacheKey);
      useTeachingStore.getState().setStoryChapters(cached);
      return;
    }

    setIsGeneratingStory(true)
    setAIGenerationError(null)

    try {
      logger.info('开始AI智能故事生成', {
        caseNumber: caseData.basicInfo?.caseNumber,
        attempt: retryCount + 1
      });

      // 构建优化的请求参数
      const requestBody = {
        caseData,
        narrativeStyle: 'legal_story', // 专业法律故事风格
        depth: 'comprehensive',
        focusAreas: ['timeline', 'parties', 'disputes', 'evidence'],
        // 新增：提供结构化指导
        chapterTemplate: {
          chapter1: { focus: 'background', title: '纠纷的起源' },
          chapter2: { focus: 'conflict', title: '冲突的爆发' },
          chapter3: { focus: 'evidence', title: '证据的较量' },
          chapter4: { focus: 'resolution', title: '法律的裁决' }
        },
        // 新增：质量控制参数
        qualityRequirements: {
          minLength: 300,
          includeKeyPoints: true,
          legalAccuracy: 'high'
        }
      };

      const response = await fetch('/api/legal-analysis/intelligent-narrative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // 增加超时时间
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `API调用失败: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.chapters || result.chapters.length === 0) {
        throw new Error(result.error || '未能生成有效故事内容');
      }

      logger.info('AI故事生成成功', {
        chaptersCount: result.chapters.length,
        confidence: result.metadata?.confidence
      });

      // 格式化章节数据
      const formattedChapters = result.chapters.map((chapter: any, index: number) => ({
        id: chapter.id || `chapter-${index + 1}`,
        title: chapter.title || `第${index + 1}章`,
        content: chapter.content || '',
        icon: chapter.icon || getChapterIcon(index),
        color: chapter.color || getChapterColor(index),
        // AI增强字段
        legalSignificance: chapter.legalSignificance || '',
        keyParties: chapter.keyParties || [],
        disputeElements: chapter.disputeElements || [],
        // 新增：关键证据和法条
        keyEvidence: chapter.keyEvidence || [],
        applicableLaws: chapter.applicableLaws || []
      }));

      // 缓存结果
      if (cacheKey) {
        storyCache.set(cacheKey, formattedChapters);
      }

      // 存储到store
      useTeachingStore.getState().setStoryChapters(formattedChapters);
      setRetryCount(0); // 重置重试计数

    } catch (error) {
      logger.error('AI故事生成失败', error);

      const errorMessage = error instanceof Error ? error.message : 'AI服务暂时不可用';
      setAIGenerationError(errorMessage);

      // 使用降级策略
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        // 使用基础模板生成
        generateFallbackStory();
      } else {
        // 多次失败后使用静态模板
        generateStaticStory();
      }
    } finally {
      setIsGeneratingStory(false)
    }
  }, [caseData, isGeneratingStory, retryCount, getCacheKey]);

  // 降级策略：基础模板生成
  const generateFallbackStory = useCallback(() => {
    if (!caseData) return;

    logger.info('使用基础模板生成故事');

    const timeline = caseData.threeElements?.facts?.timeline || [];
    const parties = caseData.threeElements?.facts?.parties || [];

    const fallbackChapters = [
      {
        id: 'chapter-1',
        title: '案件背景',
        content: `本案涉及${parties.join('、')}之间的纠纷。案号：${caseData.basicInfo?.caseNumber || '未知'}，由${caseData.basicInfo?.court || '法院'}审理。`,
        icon: '📖',
        color: 'blue'
      },
      {
        id: 'chapter-2',
        title: '事实经过',
        content: timeline.map((e: any) => `${e.date}：${e.event}`).join('\n'),
        icon: '⏰',
        color: 'green'
      },
      {
        id: 'chapter-3',
        title: '争议焦点',
        content: '双方的主要争议集中在合同履行、责任认定等方面。',
        icon: '⚖️',
        color: 'orange'
      },
      {
        id: 'chapter-4',
        title: '法律分析',
        content: '根据相关法律规定，本案需要综合考虑各方证据和法律适用。',
        icon: '📚',
        color: 'purple'
      }
    ];

    useTeachingStore.getState().setStoryChapters(fallbackChapters);
  }, [caseData]);

  // 最终降级：静态故事模板
  const generateStaticStory = useCallback(() => {
    logger.info('使用静态模板');

    const staticChapters = [
      {
        id: 'static-1',
        title: '案件概述',
        content: '这是一个法律纠纷案件，涉及多方当事人的权益。',
        icon: '📋',
        color: 'gray'
      }
    ];

    useTeachingStore.getState().setStoryChapters(staticChapters);
  }, []);

  // 辅助函数
  const getChapterIcon = (index: number) => {
    const icons = ['📖', '⚡', '⚖️', '🎯'];
    return icons[index % icons.length];
  };

  const getChapterColor = (index: number) => {
    const colors = ['blue', 'green', 'orange', 'purple'];
    return colors[index % colors.length];
  };

  // 初始化时自动生成故事（只执行一次）
  useEffect(() => {
    if (!hasInitializedStory && caseData && storyChapters.length === 0) {
      setHasInitializedStory(true);
      generateStoryChapters();
    }
  }, [caseData, storyChapters.length, hasInitializedStory, generateStoryChapters]);

  // 设置当前幕次
  useEffect(() => {
    setCurrentAct('act2');
  }, [setCurrentAct]);

  if (!caseData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">暂无案件数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                案件概况
              </CardTitle>
              <CardDescription>
                通过AI智能叙事，让复杂的法律关系更易理解
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* AI生成状态 */}
              {isGeneratingStory && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI正在生成故事...</span>
                </div>
              )}

              {/* AI增强标识 */}
              {storyChapters.length > 0 && !isGeneratingStory && !aiGenerationError && (
                <div className="flex items-center gap-1 text-xs text-green-600 px-2 py-1 bg-green-50 rounded">
                  <Sparkles className="w-3 h-3" />
                  <span>AI智能叙事</span>
                </div>
              )}

              {/* 重新生成按钮 */}
              {!isGeneratingStory && storyChapters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateStoryChapters(true)}
                  title="重新生成故事"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 错误提示 */}
          {aiGenerationError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">AI生成提示</span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                {aiGenerationError}
                {retryCount > 0 && `（已尝试${retryCount}次）`}
              </p>
            </div>
          )}

          {/* 基本信息标签 */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline">
              案号：{caseData.basicInfo.caseNumber}
            </Badge>
            <Badge variant="secondary">
              法院：{caseData.basicInfo.court}
            </Badge>
            {caseData.basicInfo.caseType && (
              <Badge variant="default">
                {caseData.basicInfo.caseType}
              </Badge>
            )}
            {caseData.basicInfo.date && (
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {caseData.basicInfo.date}
              </Badge>
            )}
          </div>

          {/* 统一使用故事展示 */}
          <StoryView
            caseData={caseData}
            chapters={storyChapters}
            isGenerating={isGeneratingStory}
            regenerate={() => generateStoryChapters(true)}
          />
        </CardContent>
      </Card>
    </div>
  )
}