/**
 * 主页面展示组件
 * 负责纯UI渲染，不包含业务逻辑
 * DeepPractice Standards Compliant
 */

import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppHeader } from './layout/AppHeader';
import {
  Upload,
  Brain,
  MessageCircle,
  Gavel,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { LegalCase, ActType } from '@/src/types';

// ========== 懒加载组件 ==========
const ThreeElementsExtractor = lazy(() =>
  import('@/components/ThreeElementsExtractor').then(mod => ({ default: mod.ThreeElementsExtractor }))
);
const DeepAnalysis = lazy(() =>
  import('@/components/acts/DeepAnalysis').then(mod => ({ default: mod.default }))
);
const Act5TeacherMode = lazy(() =>
  import('@/components/acts/Act5TeacherMode').then(mod => ({ default: mod.default }))
);
const Act6JudgmentSummary = lazy(() =>
  import('@/components/acts/Act6JudgmentSummary').then(mod => ({ default: mod.default }))
);

// ========== 图标映射 ==========
const actIcons = {
  upload: Upload,
  analysis: Brain,
  socratic: MessageCircle,
  summary: Gavel,
};

// ========== 加载组件 ==========
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    <span className="ml-3 text-gray-600">加载中...</span>
  </div>
);

// ========== 错误回退组件 ==========
const ActErrorFallback = ({ actName, onRetry }: { actName: string; onRetry: () => void }) => (
  <Card className="p-8 text-center">
    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
    <h3 className="text-lg font-bold mb-2">加载失败</h3>
    <p className="text-gray-600 mb-4">无法加载{actName}的内容</p>
    <Button onClick={onRetry}>刷新页面</Button>
  </Card>
);

// ========== 接口定义 ==========
export interface MainPagePresentationProps {
  // 基础数据
  fourActs: Array<{
    id: ActType;
    name: string;
    description: string;
    progress: number;
  }>;
  currentActIndex: number;
  currentActData: {
    id: ActType;
    name: string;
    description: string;
    progress: number;
  };
  currentCase: LegalCase | null;
  extractedElements: any;
  overallProgress: number;
  analysisComplete: boolean;

  // 状态检查
  isActCompleted: (actIndex: number) => boolean;
  canNavigateToNextAct: boolean;

  // 事件处理
  onActComplete: () => void;
  onActNavigation: (actId: ActType) => void;
  onPreviousAct: () => void;
  onNextAct: () => void;
}

// ========== 主页面展示组件 ==========
export const MainPagePresentation: React.FC<MainPagePresentationProps> = ({
  fourActs,
  currentActIndex,
  currentActData,
  currentCase,
  extractedElements,
  overallProgress,
  analysisComplete,
  isActCompleted,
  canNavigateToNextAct,
  onActComplete,
  onActNavigation,
  onPreviousAct,
  onNextAct,
}) => {
  // ========== 渲染当前幕内容 ==========
  const renderActContent = () => {
    const act = currentActData;

    return (
      <ErrorBoundary
        fallback={<ActErrorFallback actName={act.name} onRetry={() => window.location.reload()} />}
      >
        <Suspense fallback={<LoadingSpinner />}>
          {(() => {
            switch (act.id) {
              case 'upload':
                return (
                  <div className="space-y-8">
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-bold text-gray-800 mb-4">判决书智能解析</h2>
                      <p className="text-gray-600 text-lg">上传判决书文件，AI将自动提取核心要素并开启教学流程</p>
                    </div>
                    <div className="max-w-5xl mx-auto">
                      <ThreeElementsExtractor />
                    </div>
                    {currentCase && (
                      <div className="text-center mt-6">
                        <Button size="lg" onClick={onActComplete}>
                          开始深度分析
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                );

              case 'analysis':
                return <DeepAnalysis onComplete={onActComplete} />;

              case 'socratic':
                return (
                  <div className="space-y-6">
                    <Act5TeacherMode />
                    <div className="text-center">
                      <Button size="lg" onClick={onActComplete}>
                        进入总结阶段
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                );

              case 'summary':
                return <Act6JudgmentSummary />;

              default:
                return (
                  <div className="text-center p-8">
                    <p className="text-gray-500">未知的教学阶段</p>
                  </div>
                );
            }
          })()}
        </Suspense>
      </ErrorBoundary>
    );
  };

  // ========== 渲染导航栏 ==========
  const renderNavigationBar = () => (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {fourActs.map((act, index) => {
            const isActive = index === currentActIndex;
            const isCompleted = isActCompleted(index);
            const ActIcon = actIcons[act.id];

            return (
              <div key={act.id} className="flex-1 flex items-center">
                <div
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all flex-1 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : isCompleted
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-400 hover:text-gray-600'
                  }`}
                  onClick={() => onActNavigation(act.id)}
                >
                  <div className={`p-2 rounded-full ${
                    isActive ? 'bg-blue-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <ActIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{act.name}</p>
                    <p className="text-xs opacity-80">{act.description}</p>
                  </div>
                  {isCompleted && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      ✓ 完成
                    </Badge>
                  )}
                </div>
                {index < fourActs.length - 1 && (
                  <ChevronRight className={`w-4 h-4 mx-2 ${
                    isCompleted ? 'text-green-500' : 'text-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ========== 渲染快速导航 ==========
  const renderQuickNavigation = () => (
    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={onPreviousAct}
            variant="outline"
            disabled={currentActIndex === 0}
          >
            上一步
          </Button>
          <Button
            onClick={onNextAct}
            disabled={currentActIndex >= fourActs.length - 1 || !canNavigateToNextAct}
          >
            下一步
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {fourActs.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentActIndex
                  ? 'bg-blue-600 w-8'
                  : index < currentActIndex
                    ? 'bg-green-500'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // ========== 主渲染 ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <AppHeader
        overallProgress={overallProgress}
        title="法学AI教学系统"
        subtitle="四步深度学习法 · 基于苏力教授教学理念"
      />

      {renderNavigationBar()}

      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {renderActContent()}
          </div>

          {renderQuickNavigation()}
        </div>
      </main>
    </div>
  );
};

// ========== 默认导出 ==========
export default MainPagePresentation;