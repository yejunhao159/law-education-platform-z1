/**
 * Tests for Feedback Animation Components
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  FeedbackAnimation,
  ScoreAnimation,
  SuccessBurst,
  RippleEffect,
  ProgressCelebration,
  FloatingHearts,
  LoadingDots,
  Confetti
} from '@/components/feedback/FeedbackAnimations';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onAnimationComplete, ...props }: any) => {
      // Simulate animation complete
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 100);
      }
      return <div {...props}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  Variants: {}
}));

// Mock window.innerHeight
Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

describe('FeedbackAnimation', () => {
  it('should render success feedback', () => {
    render(<FeedbackAnimation type="success" message="操作成功" />);
    expect(screen.getByText('操作成功')).toBeInTheDocument();
  });

  it('should render error feedback', () => {
    render(<FeedbackAnimation type="error" message="操作失败" />);
    expect(screen.getByText('操作失败')).toBeInTheDocument();
  });

  it('should render warning feedback', () => {
    render(<FeedbackAnimation type="warning" message="警告信息" />);
    expect(screen.getByText('警告信息')).toBeInTheDocument();
  });

  it('should render achievement feedback', () => {
    render(<FeedbackAnimation type="achievement" message="获得成就" />);
    expect(screen.getByText('获得成就')).toBeInTheDocument();
  });

  it('should hide after duration', async () => {
    const onComplete = jest.fn();
    render(
      <FeedbackAnimation 
        type="success" 
        message="测试" 
        duration={100}
        onComplete={onComplete}
      />
    );
    
    expect(screen.getByText('测试')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should render at different positions', () => {
    const { rerender } = render(
      <FeedbackAnimation type="info" message="顶部" position="top" />
    );
    expect(screen.getByText('顶部')).toBeInTheDocument();

    rerender(
      <FeedbackAnimation type="info" message="中间" position="center" />
    );
    expect(screen.getByText('中间')).toBeInTheDocument();

    rerender(
      <FeedbackAnimation type="info" message="底部" position="bottom" />
    );
    expect(screen.getByText('底部')).toBeInTheDocument();
  });
});

describe('ScoreAnimation', () => {
  it('should render positive score', () => {
    render(<ScoreAnimation points={10} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('should render negative score', () => {
    render(<ScoreAnimation points={-5} />);
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('should call onComplete after animation', async () => {
    const onComplete = jest.fn();
    render(<ScoreAnimation points={10} onComplete={onComplete} />);
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should position correctly', () => {
    const { container } = render(<ScoreAnimation points={10} x={100} y={200} />);
    const element = container.firstChild as HTMLElement;
    expect(element.style.left).toBe('100px');
    expect(element.style.top).toBe('200px');
  });
});

describe('SuccessBurst', () => {
  it('should render particle animations', () => {
    const { container } = render(<SuccessBurst />);
    const particles = container.querySelectorAll('svg');
    expect(particles.length).toBeGreaterThan(0);
  });

  it('should render custom particle count', () => {
    const { container } = render(<SuccessBurst particleCount={12} />);
    const particles = container.querySelectorAll('svg');
    expect(particles.length).toBe(12);
  });

  it('should position correctly', () => {
    const { container } = render(<SuccessBurst x={50} y={100} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.left).toBe('50px');
    expect(wrapper.style.top).toBe('100px');
  });
});

describe('RippleEffect', () => {
  it('should render ripple element', () => {
    const { container } = render(<RippleEffect x={100} y={100} />);
    const ripple = container.firstChild as HTMLElement;
    expect(ripple).toBeInTheDocument();
  });

  it('should apply correct color class', () => {
    const { container, rerender } = render(<RippleEffect x={100} y={100} color="success" />);
    let ripple = container.firstChild as HTMLElement;
    expect(ripple.className).toContain('bg-green-500/20');

    rerender(<RippleEffect x={100} y={100} color="error" />);
    ripple = container.firstChild as HTMLElement;
    expect(ripple.className).toContain('bg-red-500/20');
  });

  it('should set correct size and position', () => {
    const { container } = render(<RippleEffect x={200} y={150} size={300} />);
    const ripple = container.firstChild as HTMLElement;
    expect(ripple.style.left).toBe('50px'); // 200 - 300/2
    expect(ripple.style.top).toBe('0px'); // 150 - 300/2
    expect(ripple.style.width).toBe('300px');
    expect(ripple.style.height).toBe('300px');
  });
});

describe('ProgressCelebration', () => {
  it('should not show celebration when progress below milestone', () => {
    const { container } = render(<ProgressCelebration progress={50} milestone={100} />);
    expect(container.firstChild).toBeNull();
  });

  it('should show celebration when progress reaches milestone', () => {
    render(<ProgressCelebration progress={100} milestone={100} />);
    expect(screen.getByText('🎉 目标达成！')).toBeInTheDocument();
  });

  it('should show celebration for custom milestone', () => {
    render(<ProgressCelebration progress={50} milestone={50} />);
    expect(screen.getByText('🎉 目标达成！')).toBeInTheDocument();
  });
});

describe('FloatingHearts', () => {
  it('should render multiple hearts', () => {
    const { container } = render(<FloatingHearts />);
    const hearts = container.querySelectorAll('svg');
    expect(hearts.length).toBe(5);
  });

  it('should have heart icons', () => {
    const { container } = render(<FloatingHearts />);
    const hearts = container.querySelectorAll('svg');
    hearts.forEach(heart => {
      expect(heart.className.baseVal).toContain('text-red-400');
    });
  });
});

describe('LoadingDots', () => {
  it('should render three dots', () => {
    const { container } = render(<LoadingDots />);
    const dots = container.querySelectorAll('[class*="rounded-full"]');
    expect(dots.length).toBe(3);
  });

  it('should apply animation styles', () => {
    const { container } = render(<LoadingDots />);
    const dots = container.querySelectorAll('[class*="bg-primary"]');
    expect(dots.length).toBe(3);
  });
});

describe('Confetti', () => {
  it('should render confetti pieces', () => {
    const { container } = render(<Confetti />);
    const pieces = container.querySelectorAll('[class*="absolute"]');
    expect(pieces.length).toBe(50);
  });

  it('should apply random colors', () => {
    const { container } = render(<Confetti />);
    const pieces = container.querySelectorAll('[style*="backgroundColor"]');
    expect(pieces.length).toBeGreaterThan(0);
  });
});