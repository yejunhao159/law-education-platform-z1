/**
 * 主页面容器组件
 * 负责业务逻辑和状态管理，使用新的DDD架构
 * DeepPractice Standards Compliant
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useCurrentCase,
  useTeachingStore
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
export const MainPageContainer: React.FC<{ mode?: 'edit' | 'review' }> = ({
  mode = 'edit'  // 默认编辑模式
}) => {
  // ========== Store状态获取 ==========
  const currentCase = useCurrentCase();
  const {
    currentAct,
    progress,
    setCurrentAct,
    markActComplete
  } = useTeachingStore();

  // ========== 本地状态 ==========
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
  // 🛡️ 第一幕兜底保护：当有案例数据但无sessionId时，创建session
  // 说明：正常情况下ThreeElementsExtractor已经保存到DB了，这里只是兜底保护
  // 适用场景：
  // 1. ThreeElementsExtractor保存失败时的兜底
  // 2. 其他入口直接设置currentCase时的兜底
  useEffect(() => {
    const handleFirstActAutoSave = async () => {
      // 只读模式：不保存
      if (mode === 'review') {
        return;
      }

      // 已有sessionId：不重复创建（ThreeElementsExtractor已保存）
      const existingSessionId = useTeachingStore.getState().sessionId;
      if (existingSessionId) {
        console.log('⏭️ [兜底保护] 已有sessionId，跳过保存');
        return;
      }

      // 没有案例数据：等待上传
      if (!currentCase) {
        return;
      }

      // 正在保存：避免重复
      if (isSaving) {
        return;
      }

      console.log('🛡️ [兜底保护] 检测到案例但无sessionId，立即保存到DB');
      setIsSaving(true);

      try {
        // 1. 准备第一幕数据
        const elements = {
          data: currentCase,
          confidence: currentCase.metadata?.confidence || 90
        };

        // 2. 同步到 useTeachingStore（第四幕需要）
        useTeachingStore.getState().setExtractedElements(elements, elements.confidence);

        // 3. 转换为数据库快照格式
        const storeState = useTeachingStore.getState();
        const snapshot = SnapshotConverter.toDatabase(storeState, undefined, {
          saveType: 'auto',
        });

        console.log('📦 [第一幕] 快照数据准备完成:', {
          caseTitle: snapshot.caseTitle,
          confidence: snapshot.act1?.metadata?.confidence,
        });

        // 4. 调用API创建session
        const response = await fetch('/api/teaching-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshot }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || '创建session失败');
        }

        const result = await response.json();

        // 5. 保存sessionId到Store
        if (result?.data?.sessionId) {
          useTeachingStore.getState().setSessionMetadata({
            sessionId: result.data.sessionId,
            sessionState: 'act1',
          });

          console.log('✅ [第一幕] Session创建成功:', {
            sessionId: result.data.sessionId,
            caseTitle: snapshot.caseTitle,
          });

          toast.success('案例已保存', {
            description: `案例: ${snapshot.caseTitle}`,
            duration: 2000,
          });
        }

      } catch (error) {
        console.error('❌ [第一幕] 创建session失败:', error);
        toast.error('保存失败', {
          description: error instanceof Error ? error.message : '请稍后重试',
          duration: 5000,
        });
      } finally {
        setIsSaving(false);
      }
    };

    handleFirstActAutoSave();
  }, [currentCase, mode, isSaving]);

  // ========== 保存逻辑 ==========
  const saveSessionSnapshot = useCallback(
    async (options: { saveType?: 'manual' | 'auto' } = {}) => {
      const { saveType = 'auto' } = options;

      // 只读模式：不保存
      if (mode === 'review') {
        console.log('⚠️ [MainPageContainer] 只读模式，跳过保存');
        return;
      }

      if (isSaving) {
        console.log('⚠️ [MainPageContainer] 正在保存中，跳过');
        return;
      }

      setIsSaving(true);
      console.log('💾 [编辑模式] 保存学习进度...', { saveType });

      try {
        // 1. 从Store获取完整状态
        const storeState = useTeachingStore.getState();
        const existingSessionId = storeState.sessionId;

        // 2. 转换为数据库快照格式
        const snapshot = SnapshotConverter.toDatabase(storeState, undefined, {
          saveType,
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

        if (result?.data?.sessionId) {
          useTeachingStore.getState().setSessionMetadata({
            sessionId: result.data.sessionId,
            sessionState: result.data.sessionState ?? snapshot.sessionState,
          });
        }

        if (saveType === 'manual') {
          toast.success('学习进度已保存', {
            description: `案例: ${snapshot.caseTitle}`,
            duration: 3000,
          });
        }

        return result.data.sessionId as string;
      } catch (error) {
        console.error('❌ 保存失败:', error);
        toast.error('保存失败', {
          description: error instanceof Error ? error.message : '请稍后重试',
          duration: 5000,
        });
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [mode, isSaving]  // 添加mode依赖
  );

  // ========== 页面卸载时自动保存 ==========
  useEffect(() => {
    // 只读模式：不需要监听卸载事件
    if (mode === 'review') {
      return;
    }

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
  }, [mode, saveSessionSnapshot]);

  // ========== 事件处理函数 ==========
  const handleActComplete = async () => {
    const currentAct = fourActs[currentActIndex];
    if (!currentAct) return;

    markActComplete(currentAct.id);

    // 每一幕完成后自动保存（只读模式会在saveSessionSnapshot内部跳过）
    try {
      await saveSessionSnapshot();
    } catch (error) {
      console.error('自动保存失败:', error);
    }

    if (currentActIndex < fourActs.length - 1) {
      const nextAct = fourActs[currentActIndex + 1];
      if (nextAct) {
        setCurrentAct(nextAct.id);
      }
    }
  };

  const handleActNavigation = (actId: ActType) => {
    const targetIndex = actIdToIndex[actId];
    if (targetIndex === undefined) return;

    const isCompleted = targetIndex < currentActIndex;
    const isActive = targetIndex === currentActIndex;

    if (isCompleted || isActive) {
      setCurrentAct(actId);
    }
  };

  const handlePreviousAct = () => {
    const prevIndex = Math.max(currentActIndex - 1, 0);
    const prevAct = fourActs[prevIndex];
    if (prevAct) {
      setCurrentAct(prevAct.id);
    }
  };

  const handleNextAct = () => {
    const nextIndex = Math.min(currentActIndex + 1, fourActs.length - 1);
    const nextAct = fourActs[nextIndex];
    if (nextAct) {
      setCurrentAct(nextAct.id);
    }
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
    // 模式参数
    mode,

    // 基础数据
    fourActs,
    currentActIndex,
    currentActData,
    currentCase,
    overallProgress,

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
