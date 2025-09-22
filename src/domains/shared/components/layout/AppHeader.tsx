/**
 * 应用头部展示组件
 * DeepPractice Standards Compliant
 */

import { Progress } from '@/components/ui/progress';
import { User } from 'lucide-react';

// ========== 接口定义 ==========
export interface AppHeaderProps {
  overallProgress: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

// ========== 头部展示组件 ==========
export const AppHeader: React.FC<AppHeaderProps> = ({
  overallProgress,
  title = '法学AI教学系统',
  subtitle = '四步深度学习法 · 基于苏力教授教学理念',
  className = '',
}) => {
  return (
    <header className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className='max-w-7xl mx-auto px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-800'>{title}</h1>
            <p className='text-sm text-gray-600'>{subtitle}</p>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-right'>
              <p className='text-xs text-gray-500'>整体进度</p>
              <p className='text-lg font-bold text-blue-600'>{overallProgress}%</p>
            </div>
            <Progress value={overallProgress} className='w-32 h-2' />
            <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center'>
              <User className='w-4 h-4 text-gray-600' />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};