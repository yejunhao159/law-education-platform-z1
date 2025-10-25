/**
 * PPT展示组件
 * T048: 读取Act4快照中的pptDownloadUrl,无需直接调用AI
 * 实际位置建议: app/teaching/[id]/presentation/page.tsx
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useReadOnlyMode } from './ReadOnlyModeMixin';

/**
 * PPT展示页面组件
 */
export default function PresentationViewer() {
  const params = useParams();
  const sessionId = params?.id as string;

  const { currentSnapshot, isReady, snapshotError } = useReadOnlyMode(sessionId);

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 从Act4快照获取PPT URL
  const pptUrl = currentSnapshot?.act4SummarySnapshot?.pptDownloadUrl;
  const pptAssetId = currentSnapshot?.act4SummarySnapshot?.pptAssetId;

  // 全屏切换
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 监听全屏状态变化
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载演示文稿中...</p>
        </div>
      </div>
    );
  }

  if (snapshotError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            加载失败
          </h2>
          <p className="text-gray-600 mb-4">{snapshotError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!pptUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            暂无PPT文件
          </h2>
          <p className="text-gray-600 mb-4">
            当前快照中未生成PPT课件
            {pptAssetId && (
              <>
                <br />
                <span className="text-xs text-gray-500">
                  Asset ID: {pptAssetId}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen bg-gray-900 flex flex-col">
      {/* 工具栏 */}
      {!isFullscreen && (
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">PPT演示</h1>
            {currentSnapshot?.versionTag && (
              <p className="text-sm text-gray-400">
                版本: {currentSnapshot.versionTag}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              全屏演示
            </button>
            <a
              href={pptUrl}
              download
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
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
              下载PPT
            </a>
          </div>
        </div>
      )}

      {/* PPT预览区 */}
      <div className="flex-1 relative">
        {/* 使用iframe嵌入PPT (支持Google Docs/Office Online等) */}
        <iframe
          src={`${pptUrl}?embedded=true`}
          className="w-full h-full border-0"
          title="PPT Presentation"
          allow="fullscreen"
        />

        {/* 全屏模式下的控制按钮 */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 px-4 py-2 bg-gray-800/80 text-white rounded hover:bg-gray-700/80 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            退出全屏
          </button>
        )}
      </div>

      {/* 快照信息 */}
      {currentSnapshot && process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-800 text-gray-300 p-2 text-xs">
          <span className="mr-4">快照: {currentSnapshot.versionId}</span>
          <span className="mr-4">状态: {currentSnapshot.status}</span>
          {pptAssetId && <span>Asset: {pptAssetId}</span>}
        </div>
      )}
    </div>
  );
}

/**
 * 使用说明:
 *
 * 1. 将此组件放置在 app/teaching/[id]/presentation/page.tsx
 * 2. 组件会自动从快照中读取pptDownloadUrl
 * 3. 不需要直接调用AI服务
 * 4. 支持全屏演示和下载
 *
 * PPT URL格式支持:
 * - 直接文件URL (*.pptx)
 * - Google Slides链接
 * - Office Online嵌入链接
 * - 自定义存储服务URL
 */
