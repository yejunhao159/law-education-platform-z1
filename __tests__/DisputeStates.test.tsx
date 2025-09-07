/**
 * Tests for Loading and Error States
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  DisputeLoadingState, 
  DisputeCardSkeleton,
  EvidenceLoadingState 
} from '@/components/dispute/DisputeLoadingState';
import { 
  DisputeErrorState, 
  ErrorAlert,
  EmptyState 
} from '@/components/dispute/DisputeErrorState';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('DisputeLoadingState', () => {
  it('should render default loading message', () => {
    render(<DisputeLoadingState />);
    expect(screen.getByText('正在分析争议焦点...')).toBeInTheDocument();
    expect(screen.getByText('AI 正在深度分析案件内容')).toBeInTheDocument();
  });

  it('should render custom message', () => {
    render(<DisputeLoadingState message="自定义加载消息" />);
    expect(screen.getByText('自定义加载消息')).toBeInTheDocument();
  });

  it('should show progress bar when enabled', () => {
    render(<DisputeLoadingState showProgress={true} progress={50} />);
    expect(screen.getByText('分析进度')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should not show progress bar by default', () => {
    render(<DisputeLoadingState />);
    expect(screen.queryByText('分析进度')).not.toBeInTheDocument();
  });
});

describe('DisputeCardSkeleton', () => {
  it('should render skeleton structure', () => {
    const { container } = render(<DisputeCardSkeleton />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('EvidenceLoadingState', () => {
  it('should render multiple skeleton cards', () => {
    const { container } = render(<EvidenceLoadingState />);
    const cards = container.querySelectorAll('[class*="Card"]');
    expect(cards.length).toBe(6);
  });
});

describe('DisputeErrorState', () => {
  it('should render default error message', () => {
    render(<DisputeErrorState />);
    expect(screen.getByText('分析出现错误')).toBeInTheDocument();
    expect(screen.getByText('系统遇到了一个意外错误，请重试或联系支持')).toBeInTheDocument();
  });

  it('should render network error', () => {
    render(<DisputeErrorState errorType="network" />);
    expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    expect(screen.getByText('无法连接到服务器，请检查网络连接后重试')).toBeInTheDocument();
  });

  it('should render parsing error', () => {
    render(<DisputeErrorState errorType="parsing" />);
    expect(screen.getByText('数据解析错误')).toBeInTheDocument();
  });

  it('should render API error', () => {
    render(<DisputeErrorState errorType="api" />);
    expect(screen.getByText('API 服务异常')).toBeInTheDocument();
  });

  it('should render validation error', () => {
    render(<DisputeErrorState errorType="validation" />);
    expect(screen.getByText('数据验证失败')).toBeInTheDocument();
  });

  it('should show retry button when onRetry provided', () => {
    const onRetry = jest.fn();
    render(<DisputeErrorState onRetry={onRetry} />);
    
    const retryButton = screen.getByText('重新尝试');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should show back button when onBack provided', () => {
    const onBack = jest.fn();
    render(<DisputeErrorState onBack={onBack} />);
    
    const backButton = screen.getByText('返回上一页');
    expect(backButton).toBeInTheDocument();
    
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('should show home button when no callbacks provided', () => {
    render(<DisputeErrorState />);
    expect(screen.getByText('返回首页')).toBeInTheDocument();
  });

  it('should show error details when enabled', () => {
    const error = new Error('Test error details');
    render(<DisputeErrorState error={error} showDetails={true} />);
    expect(screen.getByText('错误详情')).toBeInTheDocument();
    expect(screen.getByText(/Test error details/)).toBeInTheDocument();
  });

  it('should render help text', () => {
    render(<DisputeErrorState />);
    expect(screen.getByText('如果问题持续存在，请尝试：')).toBeInTheDocument();
    expect(screen.getByText('• 刷新页面')).toBeInTheDocument();
    expect(screen.getByText('• 清除浏览器缓存')).toBeInTheDocument();
    expect(screen.getByText('• 联系技术支持')).toBeInTheDocument();
  });
});

describe('ErrorAlert', () => {
  it('should render error message', () => {
    render(<ErrorAlert message="测试错误消息" />);
    expect(screen.getByText('测试错误消息')).toBeInTheDocument();
    expect(screen.getByText('错误')).toBeInTheDocument();
  });

  it('should show dismiss button when onDismiss provided', () => {
    const onDismiss = jest.fn();
    render(<ErrorAlert message="测试" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('关闭');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should not show dismiss button when onDismiss not provided', () => {
    render(<ErrorAlert message="测试" />);
    expect(screen.queryByText('关闭')).not.toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('should render default empty state', () => {
    render(<EmptyState />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('当前没有可显示的内容')).toBeInTheDocument();
  });

  it('should render custom title and message', () => {
    render(
      <EmptyState 
        title="自定义标题" 
        message="自定义消息" 
      />
    );
    expect(screen.getByText('自定义标题')).toBeInTheDocument();
    expect(screen.getByText('自定义消息')).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    const onClick = jest.fn();
    render(
      <EmptyState 
        action={{ label: '添加数据', onClick }}
      />
    );
    
    const actionButton = screen.getByText('添加数据');
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(onClick).toHaveBeenCalled();
  });

  it('should render custom icon when provided', () => {
    const { container } = render(
      <EmptyState 
        icon={<div data-testid="custom-icon">Icon</div>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});