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

  // 构造一个模拟的 caseData，使用完整的 LegalCase 格式
  const mockCaseData = {
    id: `classroom-${code}`,
    basicInfo: {
      caseNumber: `课堂 ${code}`,
      court: '教学场景',
      judgeDate: new Date().toISOString().split('T')[0] || '',
      caseType: '民事' as const,
      parties: {
        plaintiff: [{ name: '教师' }],
        defendant: [{ name: '学生' }]
      }
    },
    threeElements: {
      facts: {
        summary: '这是一个独立的课堂互动场景，教师可以发布问题，学生实时回答',
        timeline: [
          { date: new Date().toISOString().split('T')[0] || '', event: '课堂开始', title: '开始', importance: 'normal' as const }
        ],
        keyFacts: [
          '这是一个独立的课堂互动场景',
          '教师可以发布问题，学生实时回答',
          '支持投票和文本两种问答模式'
        ],
        disputedFacts: []
      },
      evidence: {
        summary: '通过互动提升教学效果',
        items: [],
        chainAnalysis: {
          complete: true,
          missingLinks: [],
          strength: 'moderate' as const
        }
      },
      reasoning: {
        summary: '苏格拉底式教学方法',
        legalBasis: [
          {
            law: '教学互动原则',
            article: '第1条',
            content: '引导而非灌输',
            application: '通过提问启发思考'
          },
          {
            law: '苏格拉底方法',
            article: '第2条',
            content: '通过提问启发思考',
            application: '帮助学生自主发现知识'
          }
        ],
        logicChain: [],
        keyArguments: ['引导思考', '互动学习'],
        judgment: '通过互动提升教学效果'
      }
    },
    timeline: [
      { date: new Date().toISOString().split('T')[0] || '', event: '课堂开始', title: '开始', importance: 'normal' as const }
    ],
    metadata: {
      extractedAt: new Date().toISOString(),
      confidence: 100,
      aiModel: 'mock',
      processingTime: 0,
      extractionMethod: 'manual' as const
    }
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
