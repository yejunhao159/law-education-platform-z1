/**
 * 教师端课堂控制台 - 独立访问页面
 * 使用 TeacherSocratic 组件，避免代码重复
 */
'use client';

import { use } from 'react';
import TeacherSocratic from '@/components/socratic/TeacherSocratic';

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export default function TeacherClassroomPage({ params }: PageProps) {
  const { code } = use(params);

  // 构造一个模拟的 caseData，因为独立模式不需要真实案例
  const mockCaseData = {
    title: `课堂 ${code}`,
    facts: [
      '这是一个独立的课堂互动场景',
      '教师可以发布问题，学生实时回答',
      '支持投票和文本两种问答模式'
    ],
    laws: [
      '教学互动原则：引导而非灌输',
      '苏格拉底方法：通过提问启发思考'
    ],
    dispute: '如何通过互动提升教学效果'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部提示 */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>独立课堂模式</strong> - 课堂代码: <span className="font-mono font-bold">{code}</span>
            {' '}| 点击"课堂二维码"或"实时课堂互动"标签开始教学
          </p>
        </div>

        {/* 使用 TeacherSocratic 组件，传入课堂代码 */}
        <TeacherSocratic
          caseData={mockCaseData}
          initialClassroomCode={code}
        />
      </div>
    </div>
  );
}
