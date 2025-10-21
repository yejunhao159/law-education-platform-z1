/**
 * 主页面容器组件
 * 负责业务逻辑和状态管理，使用新的DDD架构
 * DeepPractice Standards Compliant
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useCurrentCase,
  useTeachingStore,
  useAnalysisStore
} from '@/src/domains/stores';
import { MainPagePresentation } from '../components/MainPagePresentation';
import { SnapshotConverter } from '@/src/domains/teaching-acts/utils/SnapshotConverterV2';
import { toast } from 'sonner';
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
  const [isSaving, setIsSaving] = useState(false);

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

  // ========== 保存逻辑 ==========
  const saveSessionSnapshot = useCallback(
    async (options: { saveType?: 'manual' | 'auto' } = {}) => {
      const { saveType = 'auto' } = options;

      if (isSaving) {
        console.log('⚠️ [MainPageContainer] 正在保存中，跳过');
        return;
      }

      setIsSaving(true);
      console.log('💾 [MainPageContainer] 开始保存教学会话快照...', { saveType });

      try {
        // 1. 从Store获取完整状态
        const storeState = useTeachingStore.getState();
        const existingSessionId = storeState.sessionId;

        // 2. 转换为数据库快照格式
        const snapshot = SnapshotConverter.toDatabase(storeState, undefined, {
          saveType,
        });

        console.log('📦 [MainPageContainer] 快照数据已构建:', {
          caseTitle: snapshot.caseTitle,
          hasAct1: !!snapshot.act1,
          hasAct2: !!snapshot.act2,
          hasAct3: !!snapshot.act3,
          hasAct4: !!snapshot.act4,
          sessionState: snapshot.sessionState,
          existingSessionId,
        });

        // 3. 调用API保存
        const endpoint = existingSessionId
          ? `/api/teaching-sessions/${existingSessionId}`
          : '/api/teaching-sessions';
        const method = existingSessionId ? 'PATCH' : 'POST';

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshot }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || '保存失败');
        }

        const result = await response.json();
        console.log('✅ [MainPageContainer] 教学会话保存成功:', result.data);

        if (result?.data?.sessionId) {
          useTeachingStore.getState().setSessionMetadata({
            sessionId: result.data.sessionId,
            sessionState: result.data.sessionState ?? snapshot.sessionState,
          });
        }

        toast.success('学习进度已自动保存', {
          description: `案例: ${snapshot.caseTitle}`,
          duration: 3000,
        });

        return result.data.sessionId as string;
      } catch (error) {
        console.error('❌ [MainPageContainer] 保存失败:', error);
        toast.error('保存失败', {
          description: error instanceof Error ? error.message : '请稍后重试',
          duration: 5000,
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving]
  );

  // ========== 页面卸载时自动保存 ==========
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const storeState = useTeachingStore.getState();
      if (storeState.uploadData?.extractedElements) {
        saveSessionSnapshot({ saveType: 'auto' }).catch((err) => {
          console.error('页面卸载时保存失败:', err);
        });

        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveSessionSnapshot]);

  // ========== 事件处理函数 ==========
  const handleActComplete = async () => {
    const currentActId = fourActs[currentActIndex].id;
    markActComplete(currentActId);

    // 🔥 关键修复：每一幕完成后自动保存
    try {
      await saveSessionSnapshot();
    } catch (error) {
      // 保存失败不阻断流程，只记录日志
      console.error('自动保存失败，但不影响继续学习:', error);
    }

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

  return (
    <div id="MainPageContainerId">
      <MainPagePresentation {...presentationProps} />
    </div>
  );
};

// ========== 默认导出 ==========
export default MainPageContainer;
