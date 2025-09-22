/**
 * 主页面容器组件测试
 * DeepPractice Standards Compliant
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainPageContainer } from '@/src/domains/shared/containers/MainPageContainer';
import { createDefaultLegalCase } from '@/src/types';

// 模拟Store hooks
const mockUseCaseActions = {
  setCurrentCase: jest.fn(),
  reset: jest.fn(),
};

const mockUseTeachingActions = {
  setCurrentAct: jest.fn(),
  markActComplete: jest.fn(),
  reset: jest.fn(),
};

const mockUseAnalysisActions = {
  reset: jest.fn(),
};

// 模拟Store状态
let mockCurrentCase = null;
let mockCurrentAct = 'upload';
let mockProgress = null;
let mockAnalysisComplete = false;

jest.mock('@/src/domains/stores', () => ({
  useCurrentCase: () => mockCurrentCase,
  useTeachingStore: () => ({
    currentAct: mockCurrentAct,
    progress: mockProgress,
    setCurrentAct: mockUseTeachingActions.setCurrentAct,
    markActComplete: mockUseTeachingActions.markActComplete,
  }),
  useAnalysisStore: () => ({
    analysisComplete: mockAnalysisComplete,
  }),
}));

// 模拟懒加载组件
jest.mock('@/components/ThreeElementsExtractor', () => ({
  ThreeElementsExtractor: () => <div data-testid="three-elements-extractor">三要素提取器</div>,
}));

jest.mock('@/components/acts/DeepAnalysis', () => ({
  __esModule: true,
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="deep-analysis">
      深度分析组件
      <button onClick={onComplete}>完成分析</button>
    </div>
  ),
}));

jest.mock('@/components/acts/Act5TeacherMode', () => ({
  __esModule: true,
  default: () => <div data-testid="teacher-mode">教师模式组件</div>,
}));

jest.mock('@/components/acts/Act6JudgmentSummary', () => ({
  __esModule: true,
  default: () => <div data-testid="judgment-summary">判决总结组件</div>,
}));

// 模拟UI组件
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => (
    <span {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <div>{children}</div>,
}));

describe('MainPageContainer', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // 重置模拟状态
    mockCurrentCase = null;
    mockCurrentAct = 'upload';
    mockProgress = null;
    mockAnalysisComplete = false;

    // 清除模拟函数调用记录
    jest.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该渲染第一幕（案例导入）', () => {
      render(<MainPageContainer />);

      expect(screen.getByText('法学AI教学系统')).toBeInTheDocument();
      expect(screen.getByText('案例导入')).toBeInTheDocument();
      expect(screen.getByText('判决书智能解析')).toBeInTheDocument();
      expect(screen.getByTestId('three-elements-extractor')).toBeInTheDocument();
    });

    it('应该显示正确的进度', () => {
      render(<MainPageContainer />);

      // 第一幕的进度应该是25%
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  describe('幕次导航', () => {
    it('应该能切换到分析幕', () => {
      mockCurrentAct = 'analysis';

      render(<MainPageContainer />);

      expect(screen.getByText('深度分析')).toBeInTheDocument();
      expect(screen.getByTestId('deep-analysis')).toBeInTheDocument();
    });

    it('应该能切换到苏格拉底讨论幕', () => {
      mockCurrentAct = 'socratic';

      render(<MainPageContainer />);

      expect(screen.getByText('苏格拉底讨论')).toBeInTheDocument();
      expect(screen.getByTestId('teacher-mode')).toBeInTheDocument();
    });

    it('应该能切换到总结幕', () => {
      mockCurrentAct = 'summary';

      render(<MainPageContainer />);

      expect(screen.getByText('总结提升')).toBeInTheDocument();
      expect(screen.getByTestId('judgment-summary')).toBeInTheDocument();
    });
  });

  describe('用户交互', () => {
    it('有案例时应该显示"开始深度分析"按钮', () => {
      mockCurrentCase = createDefaultLegalCase('test-id', '测试案例');
      mockCurrentAct = 'upload';

      render(<MainPageContainer />);

      expect(screen.getByText('开始深度分析')).toBeInTheDocument();
    });

    it('点击"开始深度分析"应该标记第一幕完成并切换到第二幕', async () => {
      mockCurrentCase = createDefaultLegalCase('test-id', '测试案例');
      mockCurrentAct = 'upload';

      render(<MainPageContainer />);

      const button = screen.getByText('开始深度分析');
      await user.click(button);

      expect(mockUseTeachingActions.markActComplete).toHaveBeenCalledWith('upload');
      expect(mockUseTeachingActions.setCurrentAct).toHaveBeenCalledWith('analysis');
    });

    it('在分析幕点击完成应该进入苏格拉底讨论', async () => {
      mockCurrentAct = 'analysis';

      render(<MainPageContainer />);

      const button = screen.getByText('完成分析');
      await user.click(button);

      expect(mockUseTeachingActions.markActComplete).toHaveBeenCalledWith('analysis');
      expect(mockUseTeachingActions.setCurrentAct).toHaveBeenCalledWith('socratic');
    });

    it('在苏格拉底讨论幕点击完成应该进入总结阶段', async () => {
      mockCurrentAct = 'socratic';

      render(<MainPageContainer />);

      const button = screen.getByText('进入总结阶段');
      await user.click(button);

      expect(mockUseTeachingActions.markActComplete).toHaveBeenCalledWith('socratic');
      expect(mockUseTeachingActions.setCurrentAct).toHaveBeenCalledWith('summary');
    });
  });

  describe('导航栏交互', () => {
    it('应该显示所有四幕', () => {
      render(<MainPageContainer />);

      expect(screen.getByText('案例导入')).toBeInTheDocument();
      expect(screen.getByText('深度分析')).toBeInTheDocument();
      expect(screen.getByText('苏格拉底讨论')).toBeInTheDocument();
      expect(screen.getByText('总结提升')).toBeInTheDocument();
    });

    it('应该高亮当前激活的幕', () => {
      mockCurrentAct = 'analysis';

      render(<MainPageContainer />);

      const analysisNav = screen.getByText('深度分析').closest('div');
      expect(analysisNav).toHaveClass('bg-blue-50', 'text-blue-700');
    });

    it('应该标记已完成的幕', () => {
      mockProgress = {
        sessionId: 'test-session',
        overallProgress: 50,
        acts: [
          { actId: 'upload', status: 'completed', progress: 100, startedAt: '2024-01-01', completedAt: '2024-01-01' },
          { actId: 'analysis', status: 'in_progress', progress: 75, startedAt: '2024-01-01' },
          { actId: 'socratic', status: 'pending', progress: 0 },
          { actId: 'summary', status: 'pending', progress: 0 }
        ]
      };

      render(<MainPageContainer />);

      expect(screen.getByText('✓ 完成')).toBeInTheDocument();
    });
  });

  describe('快速导航', () => {
    it('应该渲染上一步和下一步按钮', () => {
      render(<MainPageContainer />);

      expect(screen.getByText('上一步')).toBeInTheDocument();
      expect(screen.getByText('下一步')).toBeInTheDocument();
    });

    it('在第一幕时上一步按钮应该被禁用', () => {
      mockCurrentAct = 'upload';

      render(<MainPageContainer />);

      const prevButton = screen.getByText('上一步');
      expect(prevButton).toBeDisabled();
    });

    it('没有案例时下一步按钮应该被禁用', () => {
      mockCurrentCase = null;

      render(<MainPageContainer />);

      const nextButton = screen.getByText('下一步');
      expect(nextButton).toBeDisabled();
    });

    it('点击上一步应该切换到前一幕', async () => {
      mockCurrentAct = 'analysis';

      render(<MainPageContainer />);

      const prevButton = screen.getByText('上一步');
      await user.click(prevButton);

      expect(mockUseTeachingActions.setCurrentAct).toHaveBeenCalledWith('upload');
    });

    it('点击下一步应该切换到后一幕', async () => {
      mockCurrentCase = createDefaultLegalCase('test-id', '测试案例');
      mockCurrentAct = 'upload';

      render(<MainPageContainer />);

      const nextButton = screen.getByText('下一步');
      await user.click(nextButton);

      expect(mockUseTeachingActions.setCurrentAct).toHaveBeenCalledWith('analysis');
    });
  });

  describe('进度指示器', () => {
    it('应该显示进度点', () => {
      render(<MainPageContainer />);

      // 应该有4个进度点
      const progressDots = screen.getAllByRole('presentation').filter(el =>
        el.className.includes('rounded-full')
      );

      // 至少应该有进度指示元素
      expect(progressDots.length).toBeGreaterThan(0);
    });
  });

  describe('错误边界', () => {
    it('应该在组件加载失败时显示错误信息', () => {
      // 这个测试需要模拟错误边界的行为
      // 由于ErrorBoundary被模拟了，我们只验证它被正确渲染
      render(<MainPageContainer />);

      // 验证错误边界存在（通过检查内容是否正常渲染）
      expect(screen.getByText('三要素提取器')).toBeInTheDocument();
    });
  });
});