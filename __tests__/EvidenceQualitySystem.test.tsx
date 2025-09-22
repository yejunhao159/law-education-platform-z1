/**
 * Tests for EvidenceQualitySystem Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EvidenceQualitySystem } from '@/components/evidence/EvidenceQualitySystem';
import { useEvidenceInteractionStore } from '@/src/domains/stores';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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

describe('EvidenceQualitySystem', () => {
  beforeEach(() => {
    useEvidenceInteractionStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the main component', () => {
      render(<EvidenceQualitySystem />);
      
      expect(screen.getByText('证据质量评估系统')).toBeInTheDocument();
      expect(screen.getByText('智能评估证据的真实性、相关性和合法性')).toBeInTheDocument();
    });

    it('should display tabs', () => {
      render(<EvidenceQualitySystem />);
      
      expect(screen.getByText('总览')).toBeInTheDocument();
      expect(screen.getByText('证据列表')).toBeInTheDocument();
      expect(screen.getByText('质量评估')).toBeInTheDocument();
      expect(screen.getByText('评估报告')).toBeInTheDocument();
    });

    it('should show assessment counter', () => {
      render(<EvidenceQualitySystem />);
      
      expect(screen.getByText(/已评估:/)).toBeInTheDocument();
    });

    it('should display batch assessment button', () => {
      render(<EvidenceQualitySystem />);
      
      expect(screen.getByText('批量评估')).toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    it('should display statistics cards', () => {
      render(<EvidenceQualitySystem />);
      
      expect(screen.getByText('通过率')).toBeInTheDocument();
      expect(screen.getByText('平均真实性')).toBeInTheDocument();
      expect(screen.getByText('平均相关性')).toBeInTheDocument();
      expect(screen.getByText('平均合法性')).toBeInTheDocument();
    });

    it('should show initial 0% values', () => {
      render(<EvidenceQualitySystem />);
      
      const zeroPercents = screen.getAllByText('0%');
      expect(zeroPercents.length).toBeGreaterThan(0);
    });
  });

  describe('Evidence List Tab', () => {
    it('should display default evidence', () => {
      render(<EvidenceQualitySystem />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      expect(screen.getByText('购销合同')).toBeInTheDocument();
      expect(screen.getByText('银行转账记录')).toBeInTheDocument();
      expect(screen.getByText('微信聊天记录')).toBeInTheDocument();
      expect(screen.getByText('证人证言')).toBeInTheDocument();
      expect(screen.getByText('录音证据')).toBeInTheDocument();
    });

    it('should have assessment buttons for each evidence', () => {
      render(<EvidenceQualitySystem />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      const assessButtons = screen.getAllByText('评估');
      expect(assessButtons.length).toBeGreaterThan(0);
      
      const quickAssessButtons = screen.getAllByText('快速评估');
      expect(quickAssessButtons.length).toBeGreaterThan(0);
    });

    it('should use custom evidence list when provided', () => {
      const customEvidence = [
        {
          id: 'custom-1',
          name: '自定义证据',
          type: 'document' as const,
          content: '自定义内容',
          verified: true
        }
      ];
      
      render(<EvidenceQualitySystem evidenceList={customEvidence} />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      expect(screen.getByText('自定义证据')).toBeInTheDocument();
    });
  });

  describe('Assessment Tab', () => {
    it('should show empty state initially', () => {
      render(<EvidenceQualitySystem />);
      
      const assessmentTab = screen.getByRole('tab', { name: /质量评估/i });
      fireEvent.click(assessmentTab);
      
      expect(screen.getByText('请从证据列表中选择一份证据进行评估')).toBeInTheDocument();
    });

    it('should navigate to assessment tab when clicking assess button', () => {
      render(<EvidenceQualitySystem />);
      
      // Go to evidence list
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      // Click assess button
      const assessButtons = screen.getAllByText('评估');
      fireEvent.click(assessButtons[0]);
      
      // Should switch to assessment tab and show controls
      expect(screen.getByText('质量调整')).toBeInTheDocument();
      expect(screen.getByText('真实性')).toBeInTheDocument();
      expect(screen.getByText('相关性')).toBeInTheDocument();
      expect(screen.getByText('合法性')).toBeInTheDocument();
    });

    it('should display sliders for quality adjustment', () => {
      render(<EvidenceQualitySystem />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      const assessButtons = screen.getAllByText('评估');
      fireEvent.click(assessButtons[0]);
      
      const sliders = screen.getAllByRole('slider');
      expect(sliders).toHaveLength(3);
    });

    it('should have apply and auto-assess buttons', () => {
      render(<EvidenceQualitySystem />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      const assessButtons = screen.getAllByText('评估');
      fireEvent.click(assessButtons[0]);
      
      expect(screen.getByText('应用调整')).toBeInTheDocument();
      expect(screen.getByText('自动评估')).toBeInTheDocument();
    });
  });

  describe('Report Tab', () => {
    it('should show empty report initially', () => {
      render(<EvidenceQualitySystem />);
      
      const reportTab = screen.getByRole('tab', { name: /评估报告/i });
      fireEvent.click(reportTab);
      
      expect(screen.getByText('暂无评估结果')).toBeInTheDocument();
      expect(screen.getByText('请先对证据进行质量评估')).toBeInTheDocument();
    });

    it('should have export button', () => {
      render(<EvidenceQualitySystem />);
      
      const reportTab = screen.getByRole('tab', { name: /评估报告/i });
      fireEvent.click(reportTab);
      
      expect(screen.getByText('导出报告')).toBeInTheDocument();
    });
  });

  describe('Assessment Functionality', () => {
    it('should handle batch assessment', async () => {
      const onComplete = jest.fn();
      
      render(<EvidenceQualitySystem onComplete={onComplete} />);
      
      const batchButton = screen.getByText('批量评估');
      fireEvent.click(batchButton);
      
      await waitFor(() => {
        expect(screen.getByText('评估中...')).toBeInTheDocument();
      }, { timeout: 100 });
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      }, { timeout: 6000 });
    });

    it('should handle quick assessment', async () => {
      const onQualityUpdate = jest.fn();
      
      render(<EvidenceQualitySystem onQualityUpdate={onQualityUpdate} />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      const quickAssessButtons = screen.getAllByText('快速评估');
      fireEvent.click(quickAssessButtons[0]);
      
      await waitFor(() => {
        expect(onQualityUpdate).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should handle manual adjustment', () => {
      const onQualityUpdate = jest.fn();
      
      render(<EvidenceQualitySystem onQualityUpdate={onQualityUpdate} />);
      
      // Navigate to evidence list
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      // Click assess button
      const assessButtons = screen.getAllByText('评估');
      fireEvent.click(assessButtons[0]);
      
      // Apply adjustment
      const applyButton = screen.getByText('应用调整');
      fireEvent.click(applyButton);
      
      expect(onQualityUpdate).toHaveBeenCalled();
    });

    it('should update feedback store on assessment', async () => {
      render(<EvidenceQualitySystem />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      const quickAssessButtons = screen.getAllByText('快速评估');
      fireEvent.click(quickAssessButtons[0]);
      
      await waitFor(() => {
        const store = useEvidenceInteractionStore.getState();
        expect(store.feedback.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });

    it('should add points for approved evidence', async () => {
      render(<EvidenceQualitySystem />);
      
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      // Assess high-quality evidence
      const quickAssessButtons = screen.getAllByText('快速评估');
      fireEvent.click(quickAssessButtons[0]); // 购销合同 - high quality
      
      await waitFor(() => {
        const store = useEvidenceInteractionStore.getState();
        expect(store.score).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });
  });

  describe('Slider Interaction', () => {
    it('should update quality values with sliders', () => {
      render(<EvidenceQualitySystem />);
      
      // Navigate to assessment
      const evidenceTab = screen.getByRole('tab', { name: /证据列表/i });
      fireEvent.click(evidenceTab);
      
      const assessButtons = screen.getAllByText('评估');
      fireEvent.click(assessButtons[0]);
      
      // Find sliders
      const sliders = screen.getAllByRole('slider');
      
      // Change first slider (authenticity)
      fireEvent.change(sliders[0], { target: { value: '75' } });
      
      // Should update display
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });
});