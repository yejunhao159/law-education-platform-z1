/**
 * 案例管理Store单元测试
 * DeepPractice Standards Compliant
 */

import { renderHook, act } from '@testing-library/react';
import {
  useCaseManagementStore,
  useCurrentCase,
  useCases,
  useSelectedCaseId,
  useCaseLoading,
  useCaseError,
  useCaseActions,
} from '@/src/domains/case-management/stores/useCaseStore';
import type { LegalCase } from '@/src/types';

// 创建测试用例的辅助函数
const createTestLegalCase = (id: string, title: string): LegalCase => ({
  id,
  title,
  basicInfo: {
    court: '测试法院',
    courtLevel: '基层法院',
    caseNumber: 'TEST001',
    filingDate: '2024-01-01',
    judgmentDate: '2024-01-15',
    caseType: '民事',
    caseNature: '合同纠纷',
    judges: ['张法官'],
  },
  parties: {
    plaintiffs: [{ name: '原告', type: 'individual', role: 'plaintiff' }],
    defendants: [{ name: '被告', type: 'individual', role: 'defendant' }],
    thirdParties: [],
  },
  timeline: [],
  evidence: [],
  verdict: {
    ruling: '判决内容',
    compensation: [],
    liability: [],
  },
  metadata: {
    confidence: 90,
    aiModel: 'DeepSeek',
    processingTime: 1000,
    extractionMethod: 'pure-ai',
  },
});

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

describe('案例管理Store', () => {
  beforeEach(() => {
    // 重置Store状态
    const { result } = renderHook(() => useCaseActions());
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
      const { result: currentCase } = renderHook(() => useCurrentCase());
      const { result: cases } = renderHook(() => useCases());
      const { result: selectedId } = renderHook(() => useSelectedCaseId());
      const { result: loading } = renderHook(() => useCaseLoading());
      const { result: error } = renderHook(() => useCaseError());

      expect(currentCase.current).toBeNull();
      expect(cases.current).toEqual([]);
      expect(selectedId.current).toBeNull();
      expect(loading.current).toBe(false);
      expect(error.current).toBeNull();
    });
  });

  describe('案例管理操作', () => {
    it('应该能设置当前案例', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: currentCase } = renderHook(() => useCurrentCase());

      const testCase = createTestLegalCase('test-id', '测试案例');

      act(() => {
        actions.current.setCurrentCase(testCase);
      });

      expect(currentCase.current).toEqual(testCase);
    });

    it('应该能添加案例到列表', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: cases } = renderHook(() => useCases());

      const testCase = createTestLegalCase('test-id', '测试案例');

      act(() => {
        actions.current.addCase(testCase);
      });

      expect(cases.current).toContain(testCase);
    });

    it('应该能更新案例', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: cases } = renderHook(() => useCases());

      const testCase = createTestLegalCase('test-id', '测试案例');
      const updates = { title: '更新后的标题' };

      act(() => {
        actions.current.addCase(testCase);
        actions.current.updateCase('test-id', updates);
      });

      const updatedCase = cases.current.find(c => c.id === 'test-id');
      expect(updatedCase?.title).toBe('更新后的标题');
    });

    it('应该能删除案例', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: cases } = renderHook(() => useCases());

      const testCase = createTestLegalCase('test-id', '测试案例');

      act(() => {
        actions.current.addCase(testCase);
        actions.current.removeCase('test-id');
      });

      expect(cases.current.find(c => c.id === 'test-id')).toBeUndefined();
    });

    it('删除当前案例时应该清空当前案例', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: currentCase } = renderHook(() => useCurrentCase());

      const testCase = createTestLegalCase('test-id', '测试案例');

      act(() => {
        actions.current.addCase(testCase);
        actions.current.setCurrentCase(testCase);
        actions.current.removeCase('test-id');
      });

      expect(currentCase.current).toBeNull();
    });
  });

  describe('案例选择', () => {
    it('应该能选择案例', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: selectedId } = renderHook(() => useSelectedCaseId());
      const { result: currentCase } = renderHook(() => useCurrentCase());

      const testCase = createTestLegalCase('test-id', '测试案例');

      act(() => {
        actions.current.addCase(testCase);
        actions.current.selectCase('test-id');
      });

      expect(selectedId.current).toBe('test-id');
      expect(currentCase.current).toEqual(testCase);
    });

    it('应该能清空选择', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: selectedId } = renderHook(() => useSelectedCaseId());
      const { result: currentCase } = renderHook(() => useCurrentCase());

      const testCase = createTestLegalCase('test-id', '测试案例');

      act(() => {
        actions.current.addCase(testCase);
        actions.current.selectCase('test-id');
        actions.current.clearSelection();
      });

      expect(selectedId.current).toBeNull();
      expect(currentCase.current).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('应该能设置和清除错误', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: error } = renderHook(() => useCaseError());

      act(() => {
        actions.current.setError('测试错误');
      });

      expect(error.current).toBe('测试错误');

      act(() => {
        actions.current.clearError();
      });

      expect(error.current).toBeNull();
    });
  });

  describe('加载状态', () => {
    it('应该能管理加载状态', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: loading } = renderHook(() => useCaseLoading());

      act(() => {
        actions.current.setLoading(true);
      });

      expect(loading.current).toBe(true);

      act(() => {
        actions.current.setLoading(false);
      });

      expect(loading.current).toBe(false);
    });
  });

  describe('搜索和筛选', () => {
    it('应该能设置搜索查询', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result } = renderHook(() => useCaseManagementStore());

      act(() => {
        actions.current.setSearchQuery('搜索关键词');
      });

      expect(result.current.searchQuery).toBe('搜索关键词');
    });

    it('应该能设置筛选条件', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result } = renderHook(() => useCaseManagementStore());

      const filters = { caseType: '民事', court: '北京法院' };

      act(() => {
        actions.current.setFilters(filters);
      });

      expect(result.current.filters).toEqual(filters);
    });

    it('应该能清除筛选条件', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result } = renderHook(() => useCaseManagementStore());

      act(() => {
        actions.current.setFilters({ caseType: '民事' });
        actions.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('分页管理', () => {
    it('应该能设置分页信息', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result } = renderHook(() => useCaseManagementStore());

      const pagination = { page: 2, limit: 20, total: 100 };

      act(() => {
        actions.current.setPagination(pagination);
      });

      expect(result.current.pagination.page).toBe(2);
      expect(result.current.pagination.limit).toBe(20);
      expect(result.current.pagination.total).toBe(100);
    });

    it('应该能翻到下一页', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result } = renderHook(() => useCaseManagementStore());

      act(() => {
        actions.current.setPagination({ page: 1, limit: 10, total: 50 });
        actions.current.nextPage();
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it('应该能翻到上一页', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result } = renderHook(() => useCaseManagementStore());

      act(() => {
        actions.current.setPagination({ page: 3, limit: 10, total: 50 });
        actions.current.previousPage();
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it('在第一页时不应该能翻到上一页', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result } = renderHook(() => useCaseManagementStore());

      act(() => {
        actions.current.setPagination({ page: 1, limit: 10, total: 50 });
        actions.current.previousPage();
      });

      expect(result.current.pagination.page).toBe(1);
    });

    it('在最后一页时不应该能翻到下一页', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result } = renderHook(() => useCaseManagementStore());

      act(() => {
        actions.current.setPagination({ page: 5, limit: 10, total: 50 }); // 最后一页
        actions.current.nextPage();
      });

      expect(result.current.pagination.page).toBe(5);
    });
  });

  describe('重置功能', () => {
    it('应该能重置所有状态', () => {
      const { result: actions } = renderHook(() => useCaseActions());
      const { result: currentCase } = renderHook(() => useCurrentCase());
      const { result: cases } = renderHook(() => useCases());
      const { result: loading } = renderHook(() => useCaseLoading());

      const testCase = createTestLegalCase('test-id', '测试案例');

      act(() => {
        actions.current.addCase(testCase);
        actions.current.setCurrentCase(testCase);
        actions.current.setLoading(true);
        actions.current.setError('测试错误');
        actions.current.reset();
      });

      expect(currentCase.current).toBeNull();
      expect(cases.current).toEqual([]);
      expect(loading.current).toBe(false);
    });
  });
});