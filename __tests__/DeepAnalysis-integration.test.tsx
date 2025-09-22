/**
 * Integration Tests for DeepAnalysis with new intelligent components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeepAnalysis from '@/components/acts/DeepAnalysis';
import { useCaseStore } from '@/src/domains/stores';

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

// Mock UI components
jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, ...props }: any) => (
    <input
      type="range"
      value={value?.[0] || 0}
      onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

// Mock existing components
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

describe('DeepAnalysis Integration', () => {
  const mockCaseData = {
    id: 'test-case-1',
    originalText: '这是一个测试案例文本',
    threeElements: {
      reasoning: {
        summary: '这是裁判要点总结'
      }
    },
    evidence: [
      {
        id: 'ev-1',
        name: '测试证据',
        type: 'document',
        content: '证据内容'
      }
    ]
  };

  beforeEach(() => {
    // Set up store with mock data
    useCaseStore.setState({
      caseData: mockCaseData
    });
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main component', () => {
      render(<DeepAnalysis />);
      
      expect(screen.getByText('深度案例分析')).toBeInTheDocument();
      expect(screen.getByText('理解案件核心要素，为讨论奠定基础')).toBeInTheDocument();
    });

    it('should display view toggle buttons', () => {
      render(<DeepAnalysis />);
      
      expect(screen.getByText('经典分析')).toBeInTheDocument();
      expect(screen.getByText('智能分析')).toBeInTheDocument();
    });

    it('should show classic view by default', () => {
      render(<DeepAnalysis />);
      
      expect(screen.getByText('案件概况')).toBeInTheDocument();
      expect(screen.getByText('争议焦点')).toBeInTheDocument();
      expect(screen.getByText('证据质证')).toBeInTheDocument();
    });

    it('should display classic components', () => {
      render(<DeepAnalysis />);
      
      expect(screen.getByText('Act2CaseIntro Component')).toBeInTheDocument();
      expect(screen.getByText('Act4FocusAnalysis Component')).toBeInTheDocument();
      expect(screen.getByText('EvidenceReview Component')).toBeInTheDocument();
    });
  });

  describe('View Switching', () => {
    it('should switch to intelligent view when button clicked', () => {
      render(<DeepAnalysis />);
      
      const intelligentButton = screen.getByText('智能分析');
      fireEvent.click(intelligentButton);
      
      // Should show intelligent analysis components
      expect(screen.getByText('争议焦点智能分析系统')).toBeInTheDocument();
      expect(screen.getByText('证据质量评估系统')).toBeInTheDocument();
    });

    it('should switch back to classic view', () => {
      render(<DeepAnalysis />);
      
      // Switch to intelligent
      const intelligentButton = screen.getByText('智能分析');
      fireEvent.click(intelligentButton);
      
      // Switch back to classic
      const classicButton = screen.getByText('经典分析');
      fireEvent.click(classicButton);
      
      expect(screen.getByText('Act2CaseIntro Component')).toBeInTheDocument();
    });

    it('should maintain button states correctly', () => {
      render(<DeepAnalysis />);
      
      const classicButton = screen.getByText('经典分析').closest('button');
      const intelligentButton = screen.getByText('智能分析').closest('button');
      
      // Initially classic is selected
      expect(classicButton).toHaveClass('bg-primary');
      expect(intelligentButton).not.toHaveClass('bg-primary');
      
      // Click intelligent
      fireEvent.click(intelligentButton!);
      
      // Now intelligent should be selected
      expect(intelligentButton).toHaveClass('bg-primary');
      expect(classicButton).not.toHaveClass('bg-primary');
    });
  });

  describe('Intelligent View Components', () => {
    it('should render DisputeFocusAnalyzer in intelligent view', () => {
      render(<DeepAnalysis />);
      
      const intelligentButton = screen.getByText('智能分析');
      fireEvent.click(intelligentButton);
      
      expect(screen.getByText('争议焦点智能分析系统')).toBeInTheDocument();
      expect(screen.getByText('开始分析')).toBeInTheDocument();
    });

    it('should render EvidenceQualitySystem in intelligent view', () => {
      render(<DeepAnalysis />);
      
      const intelligentButton = screen.getByText('智能分析');
      fireEvent.click(intelligentButton);
      
      expect(screen.getByText('证据质量评估系统')).toBeInTheDocument();
      expect(screen.getByText('批量评估')).toBeInTheDocument();
    });

    it('should pass case data to intelligent components', () => {
      render(<DeepAnalysis />);
      
      const intelligentButton = screen.getByText('智能分析');
      fireEvent.click(intelligentButton);
      
      // DisputeFocusAnalyzer should receive document text
      expect(screen.getByText('争议焦点智能分析系统')).toBeInTheDocument();
      
      // EvidenceQualitySystem should show evidence
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      // Should use the evidence from case data
      expect(screen.getByText('测试证据')).toBeInTheDocument();
    });
  });

  describe('Completion Flow', () => {
    it('should show completion button', () => {
      render(<DeepAnalysis />);
      
      expect(screen.getByText('完成案例分析')).toBeInTheDocument();
    });

    it('should handle completion', () => {
      const onComplete = jest.fn();
      render(<DeepAnalysis onComplete={onComplete} />);
      
      const completeButton = screen.getByText('完成案例分析');
      fireEvent.click(completeButton);
      
      expect(screen.getByText('分析完成，可以进入苏格拉底讨论')).toBeInTheDocument();
      expect(screen.getByText('进入苏格拉底讨论')).toBeInTheDocument();
    });

    it('should call onComplete when clicking next', () => {
      const onComplete = jest.fn();
      render(<DeepAnalysis onComplete={onComplete} />);
      
      // First complete analysis
      const completeButton = screen.getByText('完成案例分析');
      fireEvent.click(completeButton);
      
      // Then click next
      const nextButton = screen.getByText('进入苏格拉底讨论');
      fireEvent.click(nextButton);
      
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Classic View Content', () => {
    it('should display timeline hint', () => {
      render(<DeepAnalysis />);
      
      expect(screen.getByText('请求权时间轴分析')).toBeInTheDocument();
      expect(screen.getByText(/请回到第二幕/)).toBeInTheDocument();
    });

    it('should display court reasoning when available', () => {
      render(<DeepAnalysis />);
      
      expect(screen.getByText('裁判要点')).toBeInTheDocument();
      expect(screen.getByText('这是裁判要点总结')).toBeInTheDocument();
    });

    it('should not display court reasoning when not available', () => {
      useCaseStore.setState({
        caseData: {
          ...mockCaseData,
          threeElements: undefined
        }
      });
      
      render(<DeepAnalysis />);
      
      expect(screen.queryByText('裁判要点')).not.toBeInTheDocument();
    });
  });

  describe('Data Integration', () => {
    it('should use case data from store', () => {
      render(<DeepAnalysis />);
      
      const intelligentButton = screen.getByText('智能分析');
      fireEvent.click(intelligentButton);
      
      // The components should receive the case data
      expect(useCaseStore.getState().caseData).toBe(mockCaseData);
    });

    it('should handle missing case data gracefully', () => {
      useCaseStore.setState({
        caseData: null
      });
      
      render(<DeepAnalysis />);
      
      const intelligentButton = screen.getByText('智能分析');
      fireEvent.click(intelligentButton);
      
      // Should still render without errors
      expect(screen.getByText('争议焦点智能分析系统')).toBeInTheDocument();
      expect(screen.getByText('证据质量评估系统')).toBeInTheDocument();
    });
  });
});