'use client'

/**
 * 案件概况组件 (CaseOverview)
 *
 * 职责：展示案件基本信息，支持故事模式和数据模式切换
 * 重构说明：
 * - 从 Act2CaseIntro 重命名为 CaseOverview，更语义化
 * - 移除了重复的时间轴功能，专注于案件基本信息展示
 * - 时间轴功能统一在 DeepAnalysis 中实现，避免功能重复
 *
 * 使用场景：第二幕深度分析中的案件概况卡片
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StoryView } from './StoryView'
import { useCurrentCase, useStoryMode } from '@/src/domains/stores'
import { useTeachingStore } from '@/src/domains/teaching-acts/stores/useTeachingStore'
import { BookOpen, FileText, ToggleLeft, ToggleRight, Clock, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { createLogger } from '@/lib/logging'

const logger = createLogger('CaseOverview');

export function CaseOverview() {
  // 直接使用领域 store，避免兼容性层
  const caseData = useCurrentCase()
  const storyMode = useStoryMode()

  console.log('[CaseOverview] 组件渲染:', {
    hasCaseData: !!caseData,
    storyMode,
    caseNumber: caseData?.basicInfo?.caseNumber
  })

  // 使用精确的 selector 订阅
  const storyChapters = useTeachingStore((state) => state.storyChapters)
  const toggleStoryMode = useTeachingStore((state) => state.toggleStoryMode)
  const setCurrentAct = useTeachingStore((state) => state.setCurrentAct)
  const sessionId = useTeachingStore((state) => state.sessionId) // 🆕 获取sessionId

  // 本地状态控制，完全避免 store 方法的循环依赖
  const [hasInitializedStory, setHasInitializedStory] = useState(false)
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [aiGenerationError, setAIGenerationError] = useState<string | null>(null)

  // 手动强制重新生成故事
  const forceRegenerateStory = useCallback(() => {
    console.log('[forceRegenerateStory] 强制重新生成故事');

    // 清空所有相关状态
    useTeachingStore.getState().setStoryChapters([]);
    setHasInitializedStory(false);
    setIsGeneratingStory(false);
    setAIGenerationError(null);

    // 等待下一帧再触发生成
    setTimeout(() => {
      setHasInitializedStory(false); // 确保可以重新触发生成
    }, 100);
  }, []);

  // 🚀 真正的AI智能故事生成函数
  const generateStoryChapters = useCallback(async () => {
    console.log('[generateStoryChapters] 函数被调用:', {
      hasCaseData: !!caseData,
      isGeneratingStory,
      caseNumber: caseData?.basicInfo?.caseNumber,
      timestamp: new Date().toISOString()
    });

    if (!caseData || isGeneratingStory) {
      console.log('[generateStoryChapters] 终止执行:', {
        reason: !caseData ? '无案例数据' : '正在生成中'
      });
      return
    }

    // 🆕 快照模式检查: 优先使用已保存的故事章节
    const existingChapters = useTeachingStore.getState().storyChapters;
    if (existingChapters && existingChapters.length > 0) {
      console.log('📂 [CaseOverview] 检测到已保存的故事章节，跳过AI生成:', {
        章节数量: existingChapters.length,
        来源: '数据库快照恢复',
      });
      setHasInitializedStory(true);
      setIsGeneratingStory(false);
      return; // 直接返回，不调用API
    }

    // 立即标记为正在生成，防止重复调用
    setIsGeneratingStory(true)
    setHasInitializedStory(true)  // 立即标记已初始化，防止重复触发
    setAIGenerationError(null)

    try {
      logger.info('开始AI智能故事生成', {
        caseNumber: caseData.basicInfo?.caseNumber,
        timelineLength: caseData.threeElements?.facts?.timeline?.length || 0
      });

      console.log('[generateStoryChapters] 准备调用API...');

      // 🔍 详细调试：检查发送给API的完整数据
      console.log('[generateStoryChapters] 完整的caseData内容:', {
        basicInfo: caseData.basicInfo,
        hasThreeElements: !!caseData.threeElements,
        threeElementsKeys: caseData.threeElements ? Object.keys(caseData.threeElements) : [],
        factsContent: caseData.threeElements?.facts,
        evidenceContent: caseData.threeElements?.evidence,
        reasoningContent: caseData.threeElements?.reasoning,
        timeline: caseData.timeline,
        metadata: caseData.metadata
      });

      // 🎯 通过API调用智能叙事服务
      const response = await fetch('/api/legal-analysis/intelligent-narrative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId, // 🆕 传入sessionId
          caseData,
          narrativeStyle: 'story',
          depth: 'detailed',
          focusAreas: ['timeline', 'parties', 'disputes']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `API调用失败: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '智能叙事生成失败');
      }

      logger.info('AI故事生成成功', {
        chaptersCount: result.chapters.length,
        confidence: result.metadata?.confidence,
        titles: result.chapters.map((ch: any) => ch.title)
      });

      // 转换为store期望的格式
      const formattedChapters = result.chapters.map((chapter: any) => ({
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        icon: chapter.icon,
        color: chapter.color,
        // 🆕 新增AI增强字段
        legalSignificance: chapter.legalSignificance,
        keyParties: chapter.keyParties,
        disputeElements: chapter.disputeElements
      }));

      // 存储到store
      useTeachingStore.getState().setStoryChapters(formattedChapters);

      setAIGenerationError(
        result.metadata?.fallbackUsed
          ? (result.metadata?.errorMessage || 'AI服务暂不可用，已生成规则化叙事结果')
          : null
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('AI故事生成失败', { error: errorMessage });
      setAIGenerationError(errorMessage);

      // 提供备选方案：基础故事结构
      const parties = [
        ...(caseData.basicInfo?.parties?.plaintiff?.map(p => p.name) || []),
        ...(caseData.basicInfo?.parties?.defendant?.map(p => p.name) || [])
      ];
      const fallbackChapters = [
        {
          id: 'chapter-fallback-1',
          title: '案件基本情况',
          content: `${caseData.basicInfo?.caseNumber || '本案'} 涉及 ${parties.join('、') || '相关当事人'} 之间的法律纠纷。`,
          icon: '📋',
          color: 'blue',
          order: 0
        },
        {
          id: 'chapter-fallback-2',
          title: '争议与分歧',
          content: '双方当事人在事实认定和法律适用方面存在分歧，需要通过法律程序解决。',
          icon: '⚖️',
          color: 'orange',
          order: 1
        }
      ];

      useTeachingStore.getState().setStoryChapters(fallbackChapters);
    } finally {
      setIsGeneratingStory(false)
    }
  }, [caseData, isGeneratingStory])

  // 检查是否为AI生成的章节（不是fallback）
  const hasAIGeneratedChapters = useMemo(() => {
    // 检查是否有真正的AI生成内容（不是fallback）
    return storyChapters.length > 0 &&
           !storyChapters[0]?.id?.includes('fallback') &&
           (storyChapters[0]?.content?.length ?? 0) > 200; // AI内容通常较长
  }, [storyChapters]);

  // 计算是否需要生成故事
  const shouldGenerateStory = useMemo(() => {
    // 简化条件：有案例数据 + 故事模式 + 没有AI章节 + 没有在生成中
    const should = !!(caseData && storyMode && !hasAIGeneratedChapters && !isGeneratingStory);

    if (should !== false) {  // 只在可能生成时打印日志
      console.log('[CaseOverview] 计算shouldGenerateStory:', {
        caseData: !!caseData,
        storyMode,
        hasAIGeneratedChapters,
        isGeneratingStory,
        result: should
      });
    }

    return should
  }, [caseData, storyMode, hasAIGeneratedChapters, isGeneratingStory])

  // 控制故事生成时机 - 当条件满足时触发一次
  useEffect(() => {
    if (shouldGenerateStory && !hasInitializedStory) {
      console.log('[CaseOverview] 触发故事生成...');
      generateStoryChapters()
    }
  }, [shouldGenerateStory, hasInitializedStory, generateStoryChapters])

  // 监听案例数据变化，清理旧的故事章节
  const prevCaseNumberRef = React.useRef(caseData?.basicInfo?.caseNumber)
  useEffect(() => {
    const currentCaseNumber = caseData?.basicInfo?.caseNumber

    // 当案例号改变时，清理故事相关状态
    if (prevCaseNumberRef.current && prevCaseNumberRef.current !== currentCaseNumber) {
      console.log('[CaseOverview] 检测到案例变更，清理故事缓存:', {
        from: prevCaseNumberRef.current,
        to: currentCaseNumber,
        timestamp: new Date().toISOString()
      });

      // 清空故事章节
      useTeachingStore.getState().setStoryChapters([])

      // 重置生成状态
      setHasInitializedStory(false)
      setIsGeneratingStory(false)
      setAIGenerationError(null)
    }

    prevCaseNumberRef.current = currentCaseNumber
  }, [caseData?.basicInfo?.caseNumber])

  // 重置初始化状态（仅当模式切换时）
  // 使用 useRef 来跟踪上一个 storyMode 值，避免依赖数组问题
  const prevStoryModeRef = React.useRef(storyMode)
  useEffect(() => {
    // 只在 storyMode 真正改变时执行
    if (prevStoryModeRef.current !== storyMode) {
      console.log('[CaseOverview] 模式切换:', {
        from: prevStoryModeRef.current,
        to: storyMode,
        timestamp: new Date().toISOString()
      });

      if (!storyMode) {
        // 关闭故事模式时，重置所有状态
        setHasInitializedStory(false)
        setIsGeneratingStory(false)
      }

      prevStoryModeRef.current = storyMode
    }
  }, [storyMode])

  if (!caseData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无案件数据</h3>
            <p className="text-gray-500 mb-4">请先在序幕中上传并解析判决书文件</p>
            <Button onClick={() => setCurrentAct('upload')}>
              返回序幕
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 模式切换 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">案件概况</CardTitle>
              <CardDescription>
                {storyMode 
                  ? '以叙事方式呈现案件，更易理解案情发展' 
                  : '以结构化数据呈现，便于快速查看关键信息'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* AI生成状态指示 */}
              {isGeneratingStory && (
                <div className="flex items-center gap-2 text-sm text-blue-600 mr-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI生成中...</span>
                </div>
              )}

              {/* AI增强标识 */}
              {storyMode && storyChapters.length > 0 && !isGeneratingStory && (
                <div className="flex items-center gap-1 text-xs text-green-600 mr-3 px-2 py-1 bg-green-50 rounded">
                  <Sparkles className="w-3 h-3" />
                  <span>AI增强</span>
                </div>
              )}

              {/* 刷新按钮 - 仅在故事模式显示 */}
              {storyMode && !isGeneratingStory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={forceRegenerateStory}
                  className="mr-2"
                  title="重新生成故事"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={toggleStoryMode}
                className="flex items-center gap-2"
                disabled={isGeneratingStory}
              >
                {storyMode ? (
                  <>
                    <ToggleRight className="w-4 h-4" />
                    故事模式
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    数据模式
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* AI生成错误提示 */}
          {aiGenerationError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">AI生成遇到问题</span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                {aiGenerationError}
              </p>
            </div>
          )}

          {/* 案件基本信息 */}
          <div className="flex items-center gap-2 mb-4">
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
          </div>
          
          {/* 内容展示 - 移除重复时间轴，仅展示基本信息 */}
          {storyMode ? (
            <StoryView />
          ) : (
            <div className="space-y-4">
              {/* 基本案件信息展示 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 案件状态 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    案件状态
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>案件类型: {caseData.basicInfo.caseType || '民事'}</p>
                    <p>法院: {caseData.basicInfo.court}</p>
                    <p>判决日期: {caseData.basicInfo.judgeDate}</p>
                  </div>
                </div>

                {/* 当事人信息 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    当事人
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {caseData.basicInfo.parties.plaintiff.map((party, index) => (
                      <p key={`plaintiff-${index}`}>原告: {party.name}</p>
                    ))}
                    {caseData.basicInfo.parties.defendant.map((party, index) => (
                      <p key={`defendant-${index}`}>被告: {party.name}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* 提示信息 */}
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-700">
                  详细的时间轴分析将在下方的"AI智能分析"部分展示
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
