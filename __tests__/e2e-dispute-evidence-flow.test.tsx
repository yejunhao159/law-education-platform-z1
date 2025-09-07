/**
 * End-to-End Tests for Complete Dispute Analysis and Evidence Quality Flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeepAnalysis from '@/components/acts/DeepAnalysis';
import { useCaseStore } from '@/lib/stores/useCaseStore';
import { useDisputeStore } from '@/lib/stores/useDisputeStore';
import { useEvidenceInteractionStore } from '@/lib/stores/useEvidenceInteractionStore';

// Mock all required modules
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => {
    // Store handler for simulation
    (global as any).__dndHandler = onDragEnd;
    return <>{children}</>;
  },
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

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, ...props }: any) => (
    <input
      type="range"
      data-testid="quality-slider"
      value={value?.[0] || 0}
      onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

// Mock classic components
jest.mock('@/components/acts/Act2CaseIntro', () => ({
  Act2CaseIntro: () => <div>Act2CaseIntro Component</div>
}));

jest.mock('@/components/acts/Act4FocusAnalysis', () => ({
  __esModule: true,
  default: () => <div>Act4FocusAnalysis Component</div>
}));

jest.mock('@/components/acts/EvidenceReview', () => ({
  EvidenceReview: () => <div>EvidenceReview Component</div>
}));

jest.mock('@/components/timeline/UnifiedTimeline', () => ({
  UnifiedTimeline: () => <div>UnifiedTimeline Component</div>
}));

// Mock API modules
jest.mock('@/lib/ai-dispute-analyzer', () => ({
  DisputeAnalyzer: jest.fn().mockImplementation(() => ({
    analyze: jest.fn().mockResolvedValue({
      success: true,
      disputes: [
        {
          id: 'dispute-1',
          content: '合同效力争议',
          plaintiffView: '合同完全有效',
          defendantView: '合同应当无效',
          courtView: '合同部分有效',
          claimBasis: [
            {
              id: 'claim-1',
              name: '合同成立要件',
              elements: [
                {
                  id: 'element-1',
                  name: '意思表示真实',
                  description: '双方真实意思表示',
                  required: true,
                  proved: false,
                  supportingEvidence: []
                },
                {
                  id: 'element-2',
                  name: '合同形式合法',
                  description: '符合法定形式要求',
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
    })
  }))
}));

jest.mock('@/lib/evidence-mapping-service', () => ({
  EvidenceMappingService: jest.fn().mockImplementation(() => ({
    autoMapEvidence: jest.fn().mockReturnValue([
      { evidenceId: 'ev-1', elementId: 'element-1', confidence: 0.85 }
    ])
  }))
}));

describe('E2E: Complete Dispute and Evidence Flow', () => {
  const mockCaseData = {
    id: 'test-case-e2e',
    originalText: '这是一份购销合同纠纷案件，原告主张被告未按期付款...',
    title: '购销合同纠纷',
    threeElements: {
      facts: '原被告签订购销合同，被告未按期付款',
      evidence: ['合同原件', '转账记录', '催款函'],
      reasoning: {
        summary: '法院认为合同有效，被告应当承担违约责任'
      }
    },
    evidence: [
      {
        id: 'ev-1',
        name: '购销合同原件',
        type: 'document',
        content: '双方签字盖章的合同',
        verified: true,
        quality: { authenticity: 90, relevance: 95, legality: 100 }
      },
      {
        id: 'ev-2',
        name: '银行转账记录',
        type: 'document',
        content: '显示部分付款的银行流水',
        verified: true,
        quality: { authenticity: 95, relevance: 85, legality: 100 }
      }
    ]
  };

  beforeEach(() => {
    // Reset all stores
    useCaseStore.setState({ caseData: mockCaseData });
    useDisputeStore.getState().reset();
    useEvidenceInteractionStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('Complete User Journey', () => {
    it('should complete full analysis workflow', async () => {
      const onComplete = jest.fn();
      render(<DeepAnalysis onComplete={onComplete} />);

      // Step 1: Verify initial state
      expect(screen.getByText('深度案例分析')).toBeInTheDocument();
      expect(screen.getByText('经典分析')).toBeInTheDocument();
      expect(screen.getByText('智能分析')).toBeInTheDocument();

      // Step 2: Switch to intelligent analysis
      const intelligentButton = screen.getByText('智能分析');
      fireEvent.click(intelligentButton);

      await waitFor(() => {
        expect(screen.getByText('争议焦点智能分析系统')).toBeInTheDocument();
        expect(screen.getByText('证据质量评估系统')).toBeInTheDocument();
      });

      // Step 3: Start dispute analysis
      const analyzeButton = screen.getByText('开始分析');
      expect(analyzeButton).toBeInTheDocument();
      fireEvent.click(analyzeButton);

      // Wait for analysis to complete
      await waitFor(() => {
        const store = useDisputeStore.getState();
        expect(store.disputes).toHaveLength(1);
        expect(store.disputes[0].content).toBe('合同效力争议');
      }, { timeout: 3000 });

      // Step 4: Switch to evidence quality assessment
      const evidenceListTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceListTab);

      await waitFor(() => {
        expect(screen.getByText('购销合同原件')).toBeInTheDocument();
        expect(screen.getByText('银行转账记录')).toBeInTheDocument();
      });

      // Step 5: Perform batch quality assessment
      const batchAssessButton = screen.getByText('批量评估');
      fireEvent.click(batchAssessButton);

      // Wait for assessment feedback
      await waitFor(() => {
        const interactionStore = useEvidenceInteractionStore.getState();
        expect(interactionStore.feedback.length).toBeGreaterThan(0);
      }, { timeout: 6000 });

      // Step 6: Complete the analysis
      const completeAnalysisButton = screen.getByText('完成案例分析');
      fireEvent.click(completeAnalysisButton);

      expect(screen.getByText('分析完成，可以进入苏格拉底讨论')).toBeInTheDocument();

      // Step 7: Proceed to next stage
      const proceedButton = screen.getByText('进入苏格拉底讨论');
      fireEvent.click(proceedButton);

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Dispute Analysis Flow', () => {
    it('should analyze disputes and display results', async () => {
      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Start analysis
      const analyzeButton = screen.getByText('开始分析');
      fireEvent.click(analyzeButton);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText('分析中...')).toBeInTheDocument();
      }, { timeout: 100 });

      // Check results
      await waitFor(() => {
        const disputeTab = screen.getByRole('tab', { name: /争议焦点/i });
        fireEvent.click(disputeTab);
        
        // Should display dispute content
        const disputeStore = useDisputeStore.getState();
        expect(disputeStore.disputes).toHaveLength(1);
      }, { timeout: 3000 });
    });

    it('should handle evidence mapping', async () => {
      render(<DeepAnalysis />);

      // Setup: Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Analyze disputes first
      fireEvent.click(screen.getByText('开始分析'));
      
      await waitFor(() => {
        expect(useDisputeStore.getState().disputes).toHaveLength(1);
      }, { timeout: 3000 });

      // Go to mapping tab
      const mappingTab = screen.getByRole('tab', { name: /证据映射/i });
      fireEvent.click(mappingTab);

      // Should show evidence and claim elements
      expect(screen.getByText('可用证据')).toBeInTheDocument();
      expect(screen.getByText('请求权要素')).toBeInTheDocument();

      // Simulate drag and drop (if handler is available)
      if ((global as any).__dndHandler) {
        (global as any).__dndHandler({
          active: {
            id: 'ev-1',
            data: {
              current: {
                type: 'evidence',
                evidence: mockCaseData.evidence[0]
              }
            }
          },
          over: {
            id: 'element-1',
            data: {
              current: {
                type: 'claimElement',
                element: { id: 'element-1', name: '意思表示真实' }
              }
            }
          }
        });

        // Check mapping was recorded
        const interactionStore = useEvidenceInteractionStore.getState();
        expect(interactionStore.completedMappings.size).toBeGreaterThan(0);
      }
    });
  });

  describe('Evidence Quality Assessment Flow', () => {
    it('should assess evidence quality individually', async () => {
      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Go to evidence list
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);

      // Click quick assess for first evidence
      const quickAssessButtons = screen.getAllByText('快速评估');
      fireEvent.click(quickAssessButtons[0]);

      // Wait for assessment to complete
      await waitFor(() => {
        const interactionStore = useEvidenceInteractionStore.getState();
        const feedbacks = interactionStore.feedback;
        expect(feedbacks.some(f => f.message.includes('质量评估'))).toBe(true);
      }, { timeout: 2000 });
    });

    it('should allow manual quality adjustment', async () => {
      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Go to evidence list
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);

      // Click assess button for detailed assessment
      const assessButtons = screen.getAllByText('评估');
      fireEvent.click(assessButtons[0]);

      // Should navigate to assessment tab
      await waitFor(() => {
        expect(screen.getByText('质量调整')).toBeInTheDocument();
      });

      // Find and adjust sliders
      const sliders = screen.getAllByTestId('quality-slider');
      expect(sliders.length).toBeGreaterThan(0);

      // Change first slider value
      fireEvent.change(sliders[0], { target: { value: '80' } });

      // Apply adjustment
      const applyButton = screen.getByText('应用调整');
      fireEvent.click(applyButton);

      // Check feedback
      const interactionStore = useEvidenceInteractionStore.getState();
      expect(interactionStore.feedback.some(f => f.message.includes('更新'))).toBe(true);
    });

    it('should generate assessment report', async () => {
      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Perform batch assessment
      const batchButton = screen.getByText('批量评估');
      fireEvent.click(batchButton);

      // Wait for completion
      await waitFor(() => {
        const interactionStore = useEvidenceInteractionStore.getState();
        expect(interactionStore.feedback.length).toBeGreaterThan(0);
      }, { timeout: 6000 });

      // Go to report tab
      const reportTab = screen.getByRole('tab', { name: /评估报告/i });
      fireEvent.click(reportTab);

      // Should show report
      expect(screen.getByText('证据质量评估报告')).toBeInTheDocument();
      expect(screen.getByText('导出报告')).toBeInTheDocument();
    });
  });

  describe('Score and Progress Tracking', () => {
    it('should track user score', async () => {
      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Initial score should be 0
      expect(screen.getByText('得分: 0')).toBeInTheDocument();

      // Perform an action that gives points
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);

      const quickAssessButtons = screen.getAllByText('快速评估');
      fireEvent.click(quickAssessButtons[0]);

      // Wait for points to be added
      await waitFor(() => {
        const interactionStore = useEvidenceInteractionStore.getState();
        expect(interactionStore.score).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });

    it('should show progress for dispute analysis', async () => {
      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Should show initial progress
      expect(screen.getByText(/证明进度:/)).toBeInTheDocument();

      // Start analysis
      fireEvent.click(screen.getByText('开始分析'));

      await waitFor(() => {
        expect(useDisputeStore.getState().disputes).toHaveLength(1);
      }, { timeout: 3000 });

      // Progress should update after analysis
      expect(screen.getByText(/要素已完成/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle analysis errors gracefully', async () => {
      // Mock error
      const { DisputeAnalyzer } = require('@/lib/ai-dispute-analyzer');
      DisputeAnalyzer.mockImplementationOnce(() => ({
        analyze: jest.fn().mockRejectedValue(new Error('Analysis failed'))
      }));

      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Try to analyze
      fireEvent.click(screen.getByText('开始分析'));

      // Should show error feedback
      await waitFor(() => {
        const interactionStore = useEvidenceInteractionStore.getState();
        expect(interactionStore.feedback.some(f => f.type === 'error')).toBe(true);
      }, { timeout: 2000 });
    });

    it('should handle missing case data', () => {
      // Clear case data
      useCaseStore.setState({ caseData: null });

      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Should still render without errors
      expect(screen.getByText('争议焦点智能分析系统')).toBeInTheDocument();
      expect(screen.getByText('证据质量评估系统')).toBeInTheDocument();

      // Try to analyze
      fireEvent.click(screen.getByText('开始分析'));

      // Should handle gracefully
      expect(screen.getByText('开始分析')).toBeInTheDocument();
    });
  });

  describe('View Persistence', () => {
    it('should maintain analysis results when switching views', async () => {
      render(<DeepAnalysis />);

      // Switch to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Perform analysis
      fireEvent.click(screen.getByText('开始分析'));

      await waitFor(() => {
        expect(useDisputeStore.getState().disputes).toHaveLength(1);
      }, { timeout: 3000 });

      // Switch to classic view
      fireEvent.click(screen.getByText('经典分析'));

      // Switch back to intelligent view
      fireEvent.click(screen.getByText('智能分析'));

      // Results should still be there
      const disputeStore = useDisputeStore.getState();
      expect(disputeStore.disputes).toHaveLength(1);
    });
  });
});