/**
 * Act2 页面集成示例
 * T046: Act2深度分析页面只读模式
 * 实际位置: app/teaching/[id]/act2/page.tsx
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  useReadOnlyMode,
  ReadOnlyBanner,
  DisableInReadOnly,
} from '../components/ReadOnlyModeMixin';
import { useTeachingStore } from '../stores/useTeachingStore';

export default function Act2PageExample() {
  const params = useParams();
  const sessionId = params?.id as string;

  const { isClassroomMode, currentSnapshot, isReady } =
    useReadOnlyMode(sessionId);

  const { analysisData } = useTeachingStore();

  // 数据源选择
  const act2Data = isClassroomMode
    ? currentSnapshot?.act2AnalysisSnapshot
    : analysisData.result;

  if (!isReady) {
    return <div className="flex justify-center p-8">加载中...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <ReadOnlyBanner />

      <h1 className="text-3xl font-bold mb-6">第二幕：深度分析</h1>

      {act2Data && (
        <div className="space-y-6">
          {/* 法律问题 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">法律问题识别</h2>
            <textarea
              value={(act2Data as any)?.legalIssues?.join('\n') || ''}
              disabled={isClassroomMode}
              rows={5}
              className={`w-full p-3 border rounded ${
                isClassroomMode ? 'bg-gray-50' : ''
              }`}
            />
          </section>

          {/* 事实分析 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">事实分析</h2>
            <textarea
              value={(act2Data as any)?.factAnalysis || ''}
              disabled={isClassroomMode}
              rows={8}
              className={`w-full p-3 border rounded ${
                isClassroomMode ? 'bg-gray-50' : ''
              }`}
            />
          </section>

          {/* 法律依据 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">法律依据</h2>
            <ul className="space-y-2">
              {((act2Data as any)?.legalBasis || []).map((basis: string, idx: number) => (
                <li key={idx} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>{basis}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 编辑按钮 */}
          <DisableInReadOnly>
            <button className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              重新分析
            </button>
          </DisableInReadOnly>
        </div>
      )}
    </div>
  );
}
