/**
 * Act4 页面集成示例
 * T047: Act4总结提升页面只读模式
 * 实际位置: app/teaching/[id]/act4/page.tsx
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

export default function Act4PageExample() {
  const params = useParams();
  const sessionId = params?.id as string;

  const { isClassroomMode, currentSnapshot, isReady } =
    useReadOnlyMode(sessionId);

  const { summaryData } = useTeachingStore();

  const act4Data = isClassroomMode
    ? currentSnapshot?.act4SummarySnapshot
    : summaryData.report;

  if (!isReady) {
    return <div className="flex justify-center p-8">加载中...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <ReadOnlyBanner />

      <h1 className="text-3xl font-bold mb-6">第四幕：总结提升</h1>

      {act4Data && (
        <div className="space-y-6">
          {/* 学习总结 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">学习总结</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700">{(act4Data as any)?.summary}</p>
            </div>
          </section>

          {/* 关键要点 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">关键要点</h2>
            <ul className="space-y-3">
              {((act4Data as any)?.keyTakeaways || []).map(
                (takeaway: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="inline-block w-6 h-6 rounded-full bg-blue-500 text-white text-center mr-3 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span>{takeaway}</span>
                  </li>
                )
              )}
            </ul>
          </section>

          {/* PPT下载 */}
          {(act4Data as any)?.pptDownloadUrl && (
            <section className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">课件下载</h2>
              <a
                href={(act4Data as any).pptDownloadUrl}
                download
                className="inline-flex items-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                下载PPT课件
              </a>
            </section>
          )}

          {/* 编辑按钮 */}
          <DisableInReadOnly>
            <button className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              重新生成总结
            </button>
          </DisableInReadOnly>
        </div>
      )}
    </div>
  );
}
