/**
 * TDD Tests for Dispute Store
 * Testing Zustand state management for disputes
 */

import { act, renderHook } from '@testing-library/react';
import { useDisputeStore } from '../useDisputeStore';
import type { DisputeFocus } from '@/types/dispute-evidence';
import type { DisputeAnalysisStatus } from '@/lib/ai-dispute-analyzer';

describe('useDisputeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useDisputeStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useDisputeStore());

      expect(result.current.disputes).toEqual([]);
      expect(result.current.selectedDisputeId).toBeNull();
      expect(result.current.status).toBe('pending');
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Dispute Management', () => {
    it('should set disputes', () => {
      const { result } = renderHook(() => useDisputeStore());
      
      const mockDisputes: DisputeFocus[] = [
        {
          id: 'dispute-1',
          content: '合同是否成立',
          plaintiffView: '原告观点',
          defendantView: '被告观点',
          courtView: '法院认定',
          claimBasis: [],
          difficulty: 'basic',
          teachingValue: 'high',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        }
      ];

      act(() => {
        result.current.setDisputes(mockDisputes);
      });

      expect(result.current.disputes).toEqual(mockDisputes);
    });

    it('should add a single dispute', () => {
      const { result } = renderHook(() => useDisputeStore());
      
      const newDispute: DisputeFocus = {
        id: 'dispute-2',
        content: '损害赔偿数额',
        plaintiffView: '原告主张100万',
        defendantView: '被告认为过高',
        courtView: '法院酌定50万',
        claimBasis: [],
        difficulty: 'advanced',
        teachingValue: 'medium',
        relatedLaws: [],
        createdAt: new Date().toISOString()
      };

      act(() => {
        result.current.addDispute(newDispute);
      });

      expect(result.current.disputes).toHaveLength(1);
      expect(result.current.disputes[0]).toEqual(newDispute);
    });

    it('should update an existing dispute', () => {
      const { result } = renderHook(() => useDisputeStore());
      
      const initialDispute: DisputeFocus = {
        id: 'dispute-1',
        content: '初始内容',
        plaintiffView: '原告观点',
        defendantView: '被告观点',
        courtView: '法院认定',
        claimBasis: [],
        difficulty: 'basic',
        teachingValue: 'high',
        relatedLaws: [],
        createdAt: new Date().toISOString()
      };

      act(() => {
        result.current.addDispute(initialDispute);
      });

      act(() => {
        result.current.updateDispute('dispute-1', {
          content: '更新后的内容',
          difficulty: 'advanced'
        });
      });

      expect(result.current.disputes[0].content).toBe('更新后的内容');
      expect(result.current.disputes[0].difficulty).toBe('advanced');
    });

    it('should remove a dispute', () => {
      const { result } = renderHook(() => useDisputeStore());
      
      const dispute1: DisputeFocus = {
        id: 'dispute-1',
        content: '争议1',
        plaintiffView: '观点1',
        defendantView: '观点2',
        courtView: '认定',
        claimBasis: [],
        difficulty: 'basic',
        teachingValue: 'high',
        relatedLaws: [],
        createdAt: new Date().toISOString()
      };

      const dispute2: DisputeFocus = {
        id: 'dispute-2',
        content: '争议2',
        plaintiffView: '观点1',
        defendantView: '观点2',
        courtView: '认定',
        claimBasis: [],
        difficulty: 'basic',
        teachingValue: 'high',
        relatedLaws: [],
        createdAt: new Date().toISOString()
      };

      act(() => {
        result.current.setDisputes([dispute1, dispute2]);
      });

      act(() => {
        result.current.removeDispute('dispute-1');
      });

      expect(result.current.disputes).toHaveLength(1);
      expect(result.current.disputes[0].id).toBe('dispute-2');
    });
  });

  describe('Selection Management', () => {
    it('should select a dispute', () => {
      const { result } = renderHook(() => useDisputeStore());

      act(() => {
        result.current.selectDispute('dispute-1');
      });

      expect(result.current.selectedDisputeId).toBe('dispute-1');
    });

    it('should get selected dispute', () => {
      const { result } = renderHook(() => useDisputeStore());
      
      const dispute: DisputeFocus = {
        id: 'dispute-1',
        content: '争议内容',
        plaintiffView: '原告观点',
        defendantView: '被告观点',
        courtView: '法院认定',
        claimBasis: [],
        difficulty: 'basic',
        teachingValue: 'high',
        relatedLaws: [],
        createdAt: new Date().toISOString()
      };

      act(() => {
        result.current.addDispute(dispute);
        result.current.selectDispute('dispute-1');
      });

      const selected = result.current.getSelectedDispute();
      expect(selected).toEqual(dispute);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useDisputeStore());

      act(() => {
        result.current.selectDispute('dispute-1');
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedDisputeId).toBeNull();
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useDisputeStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useDisputeStore());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useDisputeStore());

      act(() => {
        result.current.setError('Error message');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should set status', () => {
      const { result } = renderHook(() => useDisputeStore());

      const statuses: DisputeAnalysisStatus[] = [
        'pending',
        'analyzing',
        'completed',
        'failed',
        'cached'
      ];

      statuses.forEach(status => {
        act(() => {
          result.current.setStatus(status);
        });
        expect(result.current.status).toBe(status);
      });
    });
  });

  describe('Cache Management', () => {
    it('should check if disputes are cached', () => {
      const { result } = renderHook(() => useDisputeStore());

      act(() => {
        result.current.setCached(true);
      });

      expect(result.current.isCached).toBe(true);
    });

    it('should store cache timestamp', () => {
      const { result } = renderHook(() => useDisputeStore());
      const now = Date.now();

      act(() => {
        result.current.updateCacheTimestamp();
      });

      expect(result.current.cacheTimestamp).toBeGreaterThanOrEqual(now);
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter disputes by difficulty', () => {
      const { result } = renderHook(() => useDisputeStore());
      
      const disputes: DisputeFocus[] = [
        {
          id: 'dispute-1',
          content: '基础争议',
          plaintiffView: '观点',
          defendantView: '观点',
          courtView: '认定',
          claimBasis: [],
          difficulty: 'basic',
          teachingValue: 'high',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'dispute-2',
          content: '高级争议',
          plaintiffView: '观点',
          defendantView: '观点',
          courtView: '认定',
          claimBasis: [],
          difficulty: 'advanced',
          teachingValue: 'high',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        }
      ];

      act(() => {
        result.current.setDisputes(disputes);
      });

      const filtered = result.current.filterByDifficulty('basic');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].difficulty).toBe('basic');
    });

    it('should sort disputes by teaching value', () => {
      const { result } = renderHook(() => useDisputeStore());
      
      const disputes: DisputeFocus[] = [
        {
          id: 'dispute-1',
          content: '低价值',
          plaintiffView: '观点',
          defendantView: '观点',
          courtView: '认定',
          claimBasis: [],
          difficulty: 'basic',
          teachingValue: 'low',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'dispute-2',
          content: '高价值',
          plaintiffView: '观点',
          defendantView: '观点',
          courtView: '认定',
          claimBasis: [],
          difficulty: 'basic',
          teachingValue: 'high',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'dispute-3',
          content: '中等价值',
          plaintiffView: '观点',
          defendantView: '观点',
          courtView: '认定',
          claimBasis: [],
          difficulty: 'basic',
          teachingValue: 'medium',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        }
      ];

      act(() => {
        result.current.setDisputes(disputes);
      });

      const sorted = result.current.sortByTeachingValue();
      expect(sorted[0].teachingValue).toBe('high');
      expect(sorted[1].teachingValue).toBe('medium');
      expect(sorted[2].teachingValue).toBe('low');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset entire store to initial state', () => {
      const { result } = renderHook(() => useDisputeStore());

      // Modify various states
      act(() => {
        result.current.addDispute({
          id: 'dispute-1',
          content: '争议',
          plaintiffView: '观点',
          defendantView: '观点',
          courtView: '认定',
          claimBasis: [],
          difficulty: 'basic',
          teachingValue: 'high',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        });
        result.current.selectDispute('dispute-1');
        result.current.setLoading(true);
        result.current.setError('Error');
        result.current.setStatus('analyzing');
      });

      // Reset everything
      act(() => {
        result.current.reset();
      });

      expect(result.current.disputes).toEqual([]);
      expect(result.current.selectedDisputeId).toBeNull();
      expect(result.current.status).toBe('pending');
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});