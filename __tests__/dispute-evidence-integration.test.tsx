/**
 * Integration Tests for Dispute Evidence Analysis
 * Testing the complete workflow from analysis to interaction
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DisputeEvidenceAnalysis } from '@/components/dispute/DisputeEvidenceAnalysis';
import { DisputeAnalyzer } from '@/lib/ai-dispute-analyzer';
import { EvidenceMappingService } from '@/lib/evidence-mapping-service';
import { useDisputeStore } from '@/src/domains/stores';
import { useEvidenceInteractionStore } from '@/src/domains/stores';

// Mock fetch
global.fetch = jest.fn();

describe('Dispute Evidence Analysis Integration', () => {
  beforeEach(() => {
    // Reset stores
    useDisputeStore.getState().reset();
    useEvidenceInteractionStore.getState().reset();
    
    // Clear mocks
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main component', () => {
      render(<DisputeEvidenceAnalysis />);
      
      expect(screen.getByText('争议焦点与证据分析')).toBeInTheDocument();
      expect(screen.getByText('开始分析')).toBeInTheDocument();
    });

    it('should show tabs for different views', () => {
      render(<DisputeEvidenceAnalysis />);
      
      expect(screen.getByText('争议焦点')).toBeInTheDocument();
      expect(screen.getByText('证据评估')).toBeInTheDocument();
      expect(screen.getByText('分析报告')).toBeInTheDocument();
    });

    it('should display initial empty state', () => {
      render(<DisputeEvidenceAnalysis />);
      
      expect(screen.getByText('尚未识别争议焦点')).toBeInTheDocument();
    });
  });

  describe('Document Analysis Flow', () => {
    it('should analyze document when button is clicked', async () => {
      const mockResponse = {
        success: true,
        disputes: [
          {
            id: 'dispute-1',
            content: '合同效力争议',
            plaintiffView: '合同有效',
            defendantView: '合同无效',
            courtView: '合同部分有效',
            claimBasis: [],
            difficulty: 'basic',
            teachingValue: 'high',
            relatedLaws: [],
            createdAt: new Date().toISOString()
          }
        ],
        claimBasisMappings: [],
        metadata: {
          analysisTime: 1500,
          modelVersion: 'deepseek-chat',
          confidence: 0.85,
          timestamp: new Date().toISOString()
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const onComplete = jest.fn();
      
      render(
        <DisputeEvidenceAnalysis 
          documentText="测试文档内容"
          caseId="test-case"
          onAnalysisComplete={onComplete}
        />
      );

      const analyzeButton = screen.getByText('开始分析');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('分析中...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(mockResponse.disputes);
      });

      // Check if disputes are displayed
      expect(useDisputeStore.getState().disputes).toHaveLength(1);
      expect(useDisputeStore.getState().status).toBe('completed');
    });

    it('should handle analysis errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <DisputeEvidenceAnalysis 
          documentText="测试文档"
          caseId="test-case"
        />
      );

      const analyzeButton = screen.getByText('开始分析');
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(useDisputeStore.getState().status).toBe('failed');
        expect(useDisputeStore.getState().error).toContain('Network error');
      });
    });
  });

  describe('Store Integration', () => {
    it('should update dispute store on successful analysis', async () => {
      const analyzer = new DisputeAnalyzer();
      const mockDisputes = [
        {
          id: 'dispute-1',
          content: 'Test dispute',
          plaintiffView: 'View 1',
          defendantView: 'View 2',
          courtView: 'Court view',
          claimBasis: [],
          difficulty: 'basic' as const,
          teachingValue: 'high' as const,
          relatedLaws: [],
          createdAt: new Date().toISOString()
        }
      ];

      // Directly update store
      useDisputeStore.getState().setDisputes(mockDisputes);

      expect(useDisputeStore.getState().disputes).toEqual(mockDisputes);
    });

    it('should update evidence interaction store on mapping', () => {
      const store = useEvidenceInteractionStore.getState();
      
      // Simulate drag and drop
      store.startDrag('evidence-1');
      expect(store.draggedItem).toBe('evidence-1');
      
      store.setDropTarget('element-1');
      expect(store.dropTarget).toBe('element-1');
      
      store.completeDrop('evidence-1', 'element-1', true);
      expect(store.completedMappings.has('evidence-1')).toBe(true);
      expect(store.draggedItem).toBeNull();
    });

    it('should track score and feedback', () => {
      const store = useEvidenceInteractionStore.getState();
      
      store.addPoints(10);
      expect(store.score).toBe(10);
      
      store.addFeedback('success', 'Great job!');
      expect(store.feedback).toHaveLength(1);
      expect(store.feedback[0].message).toBe('Great job!');
    });
  });

  describe('Service Integration', () => {
    it('should map evidence to claim elements', () => {
      const service = new EvidenceMappingService();
      
      const evidence = {
        id: 'ev-1',
        content: '书面合同',
        type: 'document'
      };
      
      const elements = [
        {
          id: 'el-1',
          claimBasisId: 'claim-1',
          name: '合同成立',
          description: '需要书面合同',
          required: true,
          proved: false,
          supportingEvidence: []
        }
      ];
      
      const mappings = service.autoMapEvidence(evidence, elements);
      expect(mappings.length).toBeGreaterThan(0);
      
      if (mappings.length > 0) {
        expect(mappings[0].evidenceId).toBe('ev-1');
        expect(mappings[0].confidence).toBeGreaterThan(0);
      }
    });

    it('should analyze mapping quality', () => {
      const service = new EvidenceMappingService();
      
      const mappings = [
        {
          evidenceId: 'ev-1',
          elementId: 'el-1',
          confidence: 0.8,
          isManual: false
        },
        {
          evidenceId: 'ev-2',
          elementId: 'el-2',
          confidence: 0.9,
          isManual: true
        }
      ];
      
      const analysis = service.analyzeMappingQuality(mappings);
      
      expect(analysis.totalMappings).toBe(2);
      expect(analysis.manualMappings).toBe(1);
      expect(analysis.autoMappings).toBe(1);
      expect(analysis.averageConfidence).toBeCloseTo(0.85, 2);
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress based on completed mappings', () => {
      const disputeStore = useDisputeStore.getState();
      const interactionStore = useEvidenceInteractionStore.getState();
      
      // Set up disputes
      disputeStore.setDisputes([
        {
          id: 'dispute-1',
          content: 'Dispute 1',
          plaintiffView: 'View 1',
          defendantView: 'View 2',
          courtView: 'Court view',
          claimBasis: [],
          difficulty: 'basic',
          teachingValue: 'high',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        }
      ]);
      
      // Complete some mappings
      interactionStore.completeDrop('ev-1', 'el-1', true);
      interactionStore.completeDrop('ev-2', 'el-2', true);
      
      const totalTasks = disputeStore.disputes.length * 3;
      const completedTasks = interactionStore.completedMappings.size;
      const progress = (completedTasks / totalTasks) * 100;
      
      expect(progress).toBeGreaterThan(0);
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', () => {
      render(<DisputeEvidenceAnalysis />);
      
      // Click on Evidence tab
      const evidenceTab = screen.getByRole('tab', { name: /证据评估/i });
      fireEvent.click(evidenceTab);
      
      expect(screen.getByText('证据质量评估')).toBeInTheDocument();
      
      // Click on Analysis tab
      const analysisTab = screen.getByRole('tab', { name: /分析报告/i });
      fireEvent.click(analysisTab);
      
      expect(screen.getByText('综合分析报告')).toBeInTheDocument();
    });
  });
});