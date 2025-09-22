/**
 * 教学活动Store单元测试
 * DeepPractice Standards Compliant
 */

import { renderHook, act } from '@testing-library/react';
import {
  useTeachingStore,
  useCurrentAct,
  useTeachingProgress,
  useCurrentSession,
  useStoryMode,
  useTeachingActions,
} from '@/src/domains/teaching-acts/stores/useTeachingStore';
import type { ActType } from '@/src/types';

// 模拟localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('教学活动Store', () => {
  beforeEach(() => {
    // 重置Store状态
    const { result } = renderHook(() => useTeachingActions());
    act(() => {
      result.current.reset();
    });

    // 清理localStorage模拟
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result: currentAct } = renderHook(() => useCurrentAct());
      const { result: progress } = renderHook(() => useTeachingProgress());
      const { result: currentSession } = renderHook(() => useCurrentSession());
      const { result: storyMode } = renderHook(() => useStoryMode());

      expect(currentAct.current).toBe('upload');
      expect(progress.current).toBeNull();
      expect(currentSession.current).toBeNull();
      expect(storyMode.current).toBe(false);
    });
  });

  describe('幕次管理', () => {
    it('应该能切换当前幕', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result: currentAct } = renderHook(() => useCurrentAct());

      act(() => {
        actions.current.setCurrentAct('analysis');
      });

      expect(currentAct.current).toBe('analysis');
    });

    it('应该能标记幕为完成', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result: progress } = renderHook(() => useTeachingProgress());

      act(() => {
        actions.current.markActComplete('upload');
      });

      const uploadAct = progress.current?.acts.find(act => act.actId === 'upload');
      expect(uploadAct?.status).toBe('completed');
    });

    it('标记幕为完成时应该自动切换到下一幕', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result: currentAct } = renderHook(() => useCurrentAct());

      act(() => {
        actions.current.markActComplete('upload');
      });

      expect(currentAct.current).toBe('analysis');
    });

    it('在最后一幕标记完成时不应该切换幕', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result: currentAct } = renderHook(() => useCurrentAct());

      act(() => {
        actions.current.setCurrentAct('summary');
        actions.current.markActComplete('summary');
      });

      expect(currentAct.current).toBe('summary');
    });
  });

  describe('会话管理', () => {
    it('应该能设置当前会话', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result: currentSession } = renderHook(() => useCurrentSession());

      const testSession = {
        id: 'session-1',
        title: '测试会话',
        status: 'active' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        participants: [],
        currentAct: 'upload' as ActType,
        caseId: 'case-1'
      };

      act(() => {
        actions.current.setCurrentSession(testSession);
      });

      expect(currentSession.current).toEqual(testSession);
    });
  });

  describe('故事模式', () => {
    it('应该能切换故事模式', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result: storyMode } = renderHook(() => useStoryMode());

      act(() => {
        actions.current.toggleStoryMode();
      });

      expect(storyMode.current).toBe(true);

      act(() => {
        actions.current.toggleStoryMode();
      });

      expect(storyMode.current).toBe(false);
    });

    it('应该能更新故事章节', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result } = renderHook(() => useTeachingStore());

      const testChapter = {
        id: 'chapter-1',
        title: '第一章',
        content: '章节内容',
        icon: '📖',
        color: 'blue'
      };

      act(() => {
        actions.current.setStoryChapters([testChapter]);
        actions.current.updateStoryChapter('chapter-1', '更新后的内容');
      });

      const updatedChapter = result.current.storyChapters.find(c => c.id === 'chapter-1');
      expect(updatedChapter?.content).toBe('更新后的内容');
    });
  });

  describe('编辑状态管理', () => {
    it('应该能管理字段编辑状态', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result } = renderHook(() => useTeachingStore());

      act(() => {
        actions.current.setEditingField('title', true);
      });

      expect(result.current.editingFields.has('title')).toBe(true);

      act(() => {
        actions.current.setEditingField('title', false);
      });

      expect(result.current.editingFields.has('title')).toBe(false);
    });
  });

  describe('自动过渡', () => {
    it('应该能管理自动过渡设置', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result } = renderHook(() => useTeachingStore());

      act(() => {
        actions.current.setAutoTransition(true);
      });

      expect(result.current.autoTransition).toBe(true);

      act(() => {
        actions.current.setAutoTransition(false);
      });

      expect(result.current.autoTransition).toBe(false);
    });
  });

  describe('幕数据管理', () => {
    it('应该能设置上传数据', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result } = renderHook(() => useTeachingStore());

      const uploadData = { file: 'test.pdf', extracted: true };

      act(() => {
        actions.current.setUploadData(uploadData);
      });

      expect(result.current.uploadData).toEqual(uploadData);
    });

    it('应该能设置分析数据', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result } = renderHook(() => useTeachingStore());

      const analysisData = { facts: [], disputes: [], evidence: [] };

      act(() => {
        actions.current.setAnalysisData(analysisData);
      });

      expect(result.current.analysisData).toEqual(analysisData);
    });

    it('应该能设置苏格拉底数据', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result } = renderHook(() => useTeachingStore());

      const socraticData = { level: 1, messages: [] };

      act(() => {
        actions.current.setSocraticData(socraticData);
      });

      expect(result.current.socraticData).toEqual(socraticData);
    });

    it('应该能设置总结数据', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result } = renderHook(() => useTeachingStore());

      const summaryData = { report: '学习报告', achievements: [] };

      act(() => {
        actions.current.setSummaryData(summaryData);
      });

      expect(result.current.summaryData).toEqual(summaryData);
    });
  });

  describe('进度计算', () => {
    it('应该能正确计算整体进度', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result: progress } = renderHook(() => useTeachingProgress());

      act(() => {
        actions.current.markActComplete('upload');
        actions.current.markActComplete('analysis');
      });

      // 2 out of 4 acts completed = 50%
      expect(progress.current?.overallProgress).toBe(50);
    });
  });

  describe('重置功能', () => {
    it('应该能重置所有状态', () => {
      const { result: actions } = renderHook(() => useTeachingActions());
      const { result: currentAct } = renderHook(() => useCurrentAct());
      const { result: storyMode } = renderHook(() => useStoryMode());

      act(() => {
        actions.current.setCurrentAct('analysis');
        actions.current.toggleStoryMode();
        actions.current.reset();
      });

      expect(currentAct.current).toBe('upload');
      expect(storyMode.current).toBe(false);
    });
  });
});