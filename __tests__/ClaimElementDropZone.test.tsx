/**
 * Tests for ClaimElementDropZone Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClaimElementDropZone } from '@/components/evidence/ClaimElementDropZone';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { ClaimElement } from '@/types/dispute-evidence';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock @dnd-kit/core
jest.mock('@dnd-kit/core', () => ({
  useDroppable: jest.fn(() => ({
    setNodeRef: jest.fn(),
    isOver: false,
    active: null,
  })),
  DndContext: ({ children }: any) => <>{children}</>,
  DragOverlay: ({ children }: any) => <>{children}</>,
}));

describe('ClaimElementDropZone', () => {
  const mockElement: ClaimElement = {
    id: 'element-1',
    claimBasisId: 'claim-1',
    name: '合同成立',
    description: '需要书面合同作为证据',
    required: true,
    proved: false,
    supportingEvidence: [],
  };

  const mockProvedElement: ClaimElement = {
    ...mockElement,
    id: 'element-2',
    proved: true,
    supportingEvidence: ['evidence-1'],
  };

  const mockOptionalElement: ClaimElement = {
    ...mockElement,
    id: 'element-3',
    required: false,
    name: '损害赔偿',
    description: '需要损失证明',
  };

  describe('Rendering', () => {
    it('should render element information', () => {
      render(<ClaimElementDropZone element={mockElement} />);
      
      expect(screen.getByText('合同成立')).toBeInTheDocument();
      expect(screen.getByText('需要书面合同作为证据')).toBeInTheDocument();
    });

    it('should show required badge for required elements', () => {
      render(<ClaimElementDropZone element={mockElement} />);
      
      expect(screen.getByText('必需')).toBeInTheDocument();
    });

    it('should show optional badge for optional elements', () => {
      render(<ClaimElementDropZone element={mockOptionalElement} />);
      
      expect(screen.getByText('可选')).toBeInTheDocument();
    });

    it('should show proved badge for proved elements', () => {
      render(<ClaimElementDropZone element={mockProvedElement} />);
      
      expect(screen.getByText('已证明')).toBeInTheDocument();
    });

    it('should show progress bar for unproved elements', () => {
      render(<ClaimElementDropZone element={mockElement} />);
      
      expect(screen.getByText('证明进度')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should not show progress bar for proved elements', () => {
      render(<ClaimElementDropZone element={mockProvedElement} />);
      
      expect(screen.queryByText('证明进度')).not.toBeInTheDocument();
    });
  });

  describe('Evidence Display', () => {
    it('should show empty state when no evidence', () => {
      render(<ClaimElementDropZone element={mockElement} />);
      
      expect(screen.getByText('拖拽证据到此处')).toBeInTheDocument();
    });

    it('should display supporting evidence count', () => {
      const elementWithEvidence = {
        ...mockElement,
        supportingEvidence: ['ev-1', 'ev-2'],
      };
      
      render(<ClaimElementDropZone element={elementWithEvidence} />);
      
      expect(screen.getByText('支持证据 (2)')).toBeInTheDocument();
    });

    it('should expand to show evidence details on click', () => {
      const elementWithEvidence = {
        ...mockElement,
        supportingEvidence: ['ev-1', 'ev-2'],
      };
      
      render(<ClaimElementDropZone element={elementWithEvidence} />);
      
      const card = screen.getByText('合同成立').closest('.relative');
      fireEvent.click(card!);
      
      expect(screen.getByText('ev-1')).toBeInTheDocument();
      expect(screen.getByText('ev-2')).toBeInTheDocument();
    });

    it('should not expand if element is proved', () => {
      render(<ClaimElementDropZone element={mockProvedElement} />);
      
      const card = screen.getByText('合同成立').closest('.relative');
      fireEvent.click(card!);
      
      // Should not expand for proved elements
      expect(card).toHaveClass('overflow-hidden');
    });
  });

  describe('Drop Functionality', () => {
    it('should disable drop for proved elements', () => {
      const { useDroppable } = require('@dnd-kit/core');
      
      render(<ClaimElementDropZone element={mockProvedElement} />);
      
      expect(useDroppable).toHaveBeenCalledWith(
        expect.objectContaining({
          disabled: true,
        })
      );
    });

    it('should enable drop for unproved elements', () => {
      const { useDroppable } = require('@dnd-kit/core');
      
      render(<ClaimElementDropZone element={mockElement} canDrop={true} />);
      
      expect(useDroppable).toHaveBeenCalledWith(
        expect.objectContaining({
          disabled: false,
        })
      );
    });

    it('should show drop hint when active', () => {
      render(
        <ClaimElementDropZone 
          element={mockElement} 
          isActive={true}
          canDrop={true}
        />
      );
      
      expect(screen.getByText('松开鼠标将证据映射到此要素')).toBeInTheDocument();
    });

    it('should apply hover styles when dragging over', () => {
      const { useDroppable } = require('@dnd-kit/core');
      useDroppable.mockReturnValue({
        setNodeRef: jest.fn(),
        isOver: true,
        active: { id: 'evidence-1' },
      });
      
      render(<ClaimElementDropZone element={mockElement} isOver={true} />);
      
      const card = screen.getByText('合同成立').closest('[class*="relative"]');
      expect(card?.className).toContain('border-blue-500');
    });
  });

  describe('Evidence Removal', () => {
    it('should show remove button for evidence items', () => {
      const onRemove = jest.fn();
      const elementWithEvidence = {
        ...mockElement,
        supportingEvidence: ['ev-1'],
      };
      
      render(
        <ClaimElementDropZone 
          element={elementWithEvidence} 
          onRemove={onRemove}
        />
      );
      
      // Expand to see evidence
      const card = screen.getByText('合同成立').closest('.relative');
      fireEvent.click(card!);
      
      // Find remove button (X icon)
      const removeButtons = screen.getAllByRole('button');
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('should call onRemove when clicking remove button', () => {
      const onRemove = jest.fn();
      const elementWithEvidence = {
        ...mockElement,
        supportingEvidence: ['ev-1'],
      };
      
      render(
        <ClaimElementDropZone 
          element={elementWithEvidence} 
          onRemove={onRemove}
        />
      );
      
      // Expand to see evidence
      const card = screen.getByText('合同成立').closest('.relative');
      fireEvent.click(card!);
      
      // Click remove button
      const removeButton = screen.getByText('ev-1').nextElementSibling as HTMLElement;
      fireEvent.click(removeButton);
      
      expect(onRemove).toHaveBeenCalledWith('ev-1');
    });

    it('should not show remove button for proved elements', () => {
      const onRemove = jest.fn();
      
      render(
        <ClaimElementDropZone 
          element={mockProvedElement} 
          onRemove={onRemove}
        />
      );
      
      // Should not have any remove buttons for proved elements
      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('Progress Calculation', () => {
    it('should show 0% progress with no evidence', () => {
      render(<ClaimElementDropZone element={mockElement} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show 100% progress for required element with one evidence', () => {
      const elementWithEvidence = {
        ...mockElement,
        supportingEvidence: ['ev-1'],
      };
      
      render(<ClaimElementDropZone element={elementWithEvidence} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should show 50% progress for optional element with one evidence', () => {
      const elementWithEvidence = {
        ...mockOptionalElement,
        supportingEvidence: ['ev-1'],
      };
      
      render(<ClaimElementDropZone element={elementWithEvidence} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('should apply proved styles', () => {
      render(<ClaimElementDropZone element={mockProvedElement} />);
      
      const card = screen.getByText('合同成立').closest('[class*="relative"]');
      expect(card?.className).toContain('border-green-500');
    });

    it('should apply active styles', () => {
      render(
        <ClaimElementDropZone 
          element={mockElement} 
          isActive={true}
        />
      );
      
      const card = screen.getByText('合同成立').closest('[class*="relative"]');
      expect(card?.className).toContain('border-yellow-500');
    });

    it('should apply default styles', () => {
      render(<ClaimElementDropZone element={mockElement} />);
      
      const card = screen.getByText('合同成立').closest('[class*="relative"]');
      expect(card?.className).toContain('border-gray-300');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ClaimElementDropZone element={mockElement} />);
      
      const card = screen.getByText('合同成立').closest('div');
      expect(card).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      const elementWithEvidence = {
        ...mockElement,
        supportingEvidence: ['ev-1'],
      };
      
      render(<ClaimElementDropZone element={elementWithEvidence} />);
      
      const card = screen.getByText('合同成立').closest('.relative');
      expect(card).toBeInTheDocument();
    });
  });
});