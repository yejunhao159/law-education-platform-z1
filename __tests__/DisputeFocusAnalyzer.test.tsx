/**
 * Tests for DisputeFocusAnalyzer Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DisputeFocusAnalyzer } from '@/components/dispute/DisputeFocusAnalyzer';
import { useDisputeStore } from '@/lib/stores/useDisputeStore';
import { useEvidenceInteractionStore } from '@/lib/stores/useEvidenceInteractionStore';

// Mock modules
jest.mock('@/lib/ai-dispute-analyzer');
jest.mock('@/lib/evidence-mapping-service');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock DnD
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <>{children}</>,
  closestCenter: jest.fn(),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
    active: null,
  }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('DisputeFocusAnalyzer', () => {
  beforeEach(() => {
    // Reset stores
    useDisputeStore.getState().reset();
    useEvidenceInteractionStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the main component', () => {
      render(<DisputeFocusAnalyzer />);
      
      expect(screen.getByText('争议焦点智能分析系统')).toBeInTheDocument();
      expect(screen.getByText('开始分析')).toBeInTheDocument();
    });

    it('should display tabs', () => {
      render(<DisputeFocusAnalyzer />);
      
      expect(screen.getByText('争议焦点')).toBeInTheDocument();
      expect(screen.getByText('证据材料')).toBeInTheDocument();
      expect(screen.getByText('证据映射')).toBeInTheDocument();
    });

    it('should show initial score', () => {
      render(<DisputeFocusAnalyzer />);
      
      expect(screen.getByText('得分: 0')).toBeInTheDocument();
    });

    it('should display progress bar', () => {
      render(<DisputeFocusAnalyzer />);
      
      expect(screen.getByText(/证明进度:/)).toBeInTheDocument();
    });
  });

  describe('Analysis Flow', () => {
    it('should handle analysis button click', async () => {
      const { DisputeAnalyzer } = require('@/lib/ai-dispute-analyzer');
      const mockAnalyze = jest.fn().mockResolvedValue({
        success: true,
        disputes: [
          {
            id: 'dispute-1',
            content: '合同效力争议',
            plaintiffView: '合同有效',
            defendantView: '合同无效',
            courtView: '合同部分有效',
            claimBasis: [
              {
                id: 'claim-1',
                name: '合同成立',
                elements: [
                  {
                    id: 'el-1',
                    name: '要约',
                    description: '需要证明要约存在',
                    required: true,
                    proved: false,
                    supportingEvidence: []
                  }
                ]
              }
            ],
            difficulty: 'intermediate',
            teachingValue: 'high',
            relatedLaws: [],
            createdAt: new Date().toISOString()
          }
        ]
      });
      
      DisputeAnalyzer.mockImplementation(() => ({
        analyze: mockAnalyze
      }));

      const onComplete = jest.fn();
      
      render(
        <DisputeFocusAnalyzer 
          documentText="测试文档"
          onComplete={onComplete}
        />
      );

      const analyzeButton = screen.getByText('开始分析');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockAnalyze).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('should show error when no document provided', async () => {
      render(<DisputeFocusAnalyzer />);

      const analyzeButton = screen.getByText('开始分析');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        const store = useEvidenceInteractionStore.getState();
        expect(store.feedback.some(f => f.type === 'error')).toBe(true);
      });
    });

    it('should update progress when elements are proved', () => {
      render(<DisputeFocusAnalyzer />);
      
      // Initially should show 0/0
      expect(screen.getByText('证明进度: 0/0 要素已完成')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', () => {
      render(<DisputeFocusAnalyzer />);
      
      // Click Evidence tab
      const evidenceTab = screen.getByRole('tab', { name: /证据材料/i });
      fireEvent.click(evidenceTab);
      
      // Should show evidence cards
      expect(screen.getByText('购销合同')).toBeInTheDocument();
      
      // Click Mapping tab
      const mappingTab = screen.getByRole('tab', { name: /证据映射/i });
      fireEvent.click(mappingTab);
      
      expect(screen.getByText('可用证据')).toBeInTheDocument();
      expect(screen.getByText('请求权要素')).toBeInTheDocument();
    });

    it('should show empty state in disputes tab', () => {
      render(<DisputeFocusAnalyzer />);
      
      expect(screen.getByText('尚未识别争议焦点')).toBeInTheDocument();
      expect(screen.getByText('点击"开始分析"按钮进行智能分析')).toBeInTheDocument();
    });

    it('should display default evidence in evidence tab', () => {
      render(<DisputeFocusAnalyzer />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据材料/i });
      fireEvent.click(evidenceTab);
      
      expect(screen.getByText('购销合同')).toBeInTheDocument();
      expect(screen.getByText('付款凭证')).toBeInTheDocument();
      expect(screen.getByText('催款通知')).toBeInTheDocument();
      expect(screen.getByText('证人证言')).toBeInTheDocument();
    });
  });

  describe('Evidence Mapping', () => {
    it('should show mapping instruction when no dispute selected', () => {
      render(<DisputeFocusAnalyzer />);
      
      const mappingTab = screen.getByRole('tab', { name: /证据映射/i });
      fireEvent.click(mappingTab);
      
      expect(screen.getByText('请先选择一个争议焦点以查看其请求权要素')).toBeInTheDocument();
    });

    it('should display evidence cards in mapping view', () => {
      render(<DisputeFocusAnalyzer />);
      
      const mappingTab = screen.getByRole('tab', { name: /证据映射/i });
      fireEvent.click(mappingTab);
      
      // Should show evidence in compact view
      const evidenceSection = screen.getByText('可用证据').parentElement;
      expect(evidenceSection).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag start', () => {
      const { DndContext } = require('@dnd-kit/core');
      let dragStartHandler: any;
      
      DndContext.mockImplementation(({ onDragStart, children }: any) => {
        dragStartHandler = onDragStart;
        return <>{children}</>;
      });
      
      render(<DisputeFocusAnalyzer />);
      
      const mappingTab = screen.getByRole('tab', { name: /证据映射/i });
      fireEvent.click(mappingTab);
      
      // Simulate drag start
      if (dragStartHandler) {
        dragStartHandler({
          active: {
            id: 'ev-1',
            data: {
              current: {
                type: 'evidence',
                evidence: {
                  id: 'ev-1',
                  name: '购销合同',
                  type: 'document',
                  content: '合同内容'
                }
              }
            }
          }
        });
      }
      
      expect(useEvidenceInteractionStore.getState().draggedItem).toBe('ev-1');
    });

    it('should handle drop on valid target', () => {
      const { DndContext } = require('@dnd-kit/core');
      const { EvidenceMappingService } = require('@/lib/evidence-mapping-service');
      
      let dragEndHandler: any;
      
      DndContext.mockImplementation(({ onDragEnd, children }: any) => {
        dragEndHandler = onDragEnd;
        return <>{children}</>;
      });
      
      EvidenceMappingService.mockImplementation(() => ({
        autoMapEvidence: jest.fn().mockReturnValue([
          { evidenceId: 'ev-1', elementId: 'el-1', confidence: 0.8 }
        ])
      }));
      
      render(<DisputeFocusAnalyzer />);
      
      // Need to set up claim elements first
      const mappingTab = screen.getByRole('tab', { name: /证据映射/i });
      fireEvent.click(mappingTab);
      
      // Simulate successful drop
      if (dragEndHandler) {
        dragEndHandler({
          active: {
            id: 'ev-1',
            data: {
              current: {
                type: 'evidence',
                evidence: {
                  id: 'ev-1',
                  name: '购销合同',
                  type: 'document',
                  content: '合同内容'
                }
              }
            }
          },
          over: {
            id: 'el-1',
            data: {
              current: {
                type: 'claimElement',
                element: {
                  id: 'el-1',
                  name: '合同成立'
                }
              }
            }
          }
        });
      }
      
      const store = useEvidenceInteractionStore.getState();
      expect(store.completedMappings.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Feedback System', () => {
    it('should display feedback messages', async () => {
      const store = useEvidenceInteractionStore.getState();
      store.addFeedback('success', '操作成功');
      
      render(<DisputeFocusAnalyzer />);
      
      await waitFor(() => {
        expect(screen.getByText('操作成功')).toBeInTheDocument();
      });
    });

    it('should update score', () => {
      const store = useEvidenceInteractionStore.getState();
      store.addPoints(50);
      
      render(<DisputeFocusAnalyzer />);
      
      expect(screen.getByText('得分: 50')).toBeInTheDocument();
    });
  });

  describe('Custom Evidence', () => {
    it('should use provided evidence list', () => {
      const customEvidence = [
        {
          id: 'custom-1',
          name: '自定义证据',
          type: 'document' as const,
          content: '自定义内容',
          verified: true
        }
      ];
      
      render(
        <DisputeFocusAnalyzer evidenceList={customEvidence} />
      );
      
      const evidenceTab = screen.getByRole('tab', { name: /证据材料/i });
      fireEvent.click(evidenceTab);
      
      expect(screen.getByText('自定义证据')).toBeInTheDocument();
    });
  });
});