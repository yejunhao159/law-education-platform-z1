/**
 * 主页面容器组件
 * 负责业务逻辑和状态管理，使用新的DDD架构
 * DeepPractice Standards Compliant
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useCurrentCase,
  useTeachingStore,
  useAnalysisStore
} from '@/src/domains/stores';
import { MainPagePresentation } from '../components/MainPagePresentation';
import type { ActType } from '@/src/types';

// ========== 四幕定义 ==========
const fourActs = [
  {
    id: 'upload' as ActType,
    name: '案例导入',
    description: '上传判决书并智能解析',
    progress: 25
  },
  {
    id: 'analysis' as ActType,
    name: '深度分析',
    description: '事实认定 • 争点聚焦 • 证据链',
    progress: 50
  },
  {
    id: 'socratic' as ActType,
    name: '苏格拉底讨论',
    description: 'AI引导式深度思辨',
    progress: 75
  },
  {
    id: 'summary' as ActType,
    name: '总结提升',
    description: '判决分析 • 学习报告',
    progress: 100
  }
];

// ========== 容器组件 ==========
export const MainPageContainer: React.FC = () => {
  // ========== Store状态获取 ==========
  const currentCase = useCurrentCase();
  const {
    currentAct,
    progress,
    setCurrentAct,
    markActComplete
  } = useTeachingStore();
  const { analysisComplete } = useAnalysisStore();

  // ========== 本地状态 ==========
  const [extractedElements, setExtractedElements] = useState<any>(null);

  // ========== 派生状态计算 ==========
  const actIdToIndex: Record<string, number> = useMemo(() => ({
    'upload': 0,
    'analysis': 1,
    'socratic': 2,
    'summary': 3,
    'prologue': 0  // 处理旧的prologue状态，映射到第一幕
  }), []);

  const currentActIndex = useMemo(() =>
    actIdToIndex[currentAct] || 0,
    [currentAct, actIdToIndex]
  );

  const overallProgress = useMemo(() =>
    fourActs[currentActIndex]?.progress || 0,
    [currentActIndex]
  );

  const currentActData = useMemo(() =>
    fourActs[currentActIndex],
    [currentActIndex]
  );

  // ========== 副作用处理 ==========
  useEffect(() => {
    if (currentCase) {
      const elements = {
        data: currentCase,
        confidence: currentCase.metadata?.confidence || 90
      };

      setExtractedElements(elements);

      // 🔗 数据桥接：同步到 useTeachingStore（第四幕需要）
      console.log('🔗 [MainPageContainer] 同步案例数据到 useTeachingStore', {
        数据大小: Object.keys(elements.data || {}).length,
        confidence: elements.confidence,
        案例标题: elements.data?.basicInfo?.caseNumber || elements.data?.threeElements?.facts?.caseTitle || '未知',
        数据预览: Object.keys(elements.data || {}).slice(0, 5)
      });
      useTeachingStore.getState().setExtractedElements(elements, elements.confidence);

      // 验证写入
      const stored = useTeachingStore.getState().uploadData;
      console.log('✅ [MainPageContainer] 验证Store写入:', {
        extractedElements存在: !!stored.extractedElements,
        confidence: stored.confidence
      });
    }
  }, [currentCase]);

  // ========== 事件处理函数 ==========
  const handleActComplete = () => {
    const currentActId = fourActs[currentActIndex].id;
    markActComplete(currentActId);

    if (currentActIndex < fourActs.length - 1) {
      const nextActId = fourActs[currentActIndex + 1].id;
      setCurrentAct(nextActId);
    }
  };

  const handleActNavigation = (actId: ActType) => {
    const targetIndex = actIdToIndex[actId];
    const isCompleted = targetIndex < currentActIndex;
    const isActive = targetIndex === currentActIndex;

    if (isCompleted || isActive) {
      setCurrentAct(actId);
    }
  };

  const handlePreviousAct = () => {
    const prevIndex = Math.max(currentActIndex - 1, 0);
    setCurrentAct(fourActs[prevIndex].id);
  };

  const handleNextAct = () => {
    const nextIndex = Math.min(currentActIndex + 1, fourActs.length - 1);
    setCurrentAct(fourActs[nextIndex].id);
  };

  // ========== 状态检查函数 ==========
  const isActCompleted = (actIndex: number): boolean => {
    if (!progress) return false;

    const actId = fourActs[actIndex]?.id;
    if (!actId) return false;

    const actProgress = progress.acts.find(act => act.actId === actId);
    return actProgress?.status === 'completed';
  };

  const canNavigateToNextAct = (): boolean => {
    return currentActIndex < fourActs.length - 1 && !!currentCase;
  };

  // ========== 组件渲染数据 ==========
  const presentationProps = {
    // 基础数据
    fourActs,
    currentActIndex,
    currentActData,
    currentCase,
    extractedElements,
    overallProgress,
    analysisComplete,

    // 状态检查
    isActCompleted,
    canNavigateToNextAct: canNavigateToNextAct(),

    // 事件处理
    onActComplete: handleActComplete,
    onActNavigation: handleActNavigation,
    onPreviousAct: handlePreviousAct,
    onNextAct: handleNextAct,
  };

  return <MainPagePresentation {...presentationProps} />;
};

// ========== 默认导出 ==========
export default MainPageContainer;