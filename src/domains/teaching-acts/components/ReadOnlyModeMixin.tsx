/**
 * 只读模式混入组件
 * T045-T047: Act页面只读模式集成
 *
 * 使用方式:
 * 1. 在Act页面中导入useTeachingStore
 * 2. 调用loadClassroomSnapshot加载快照
 * 3. 使用isClassroomMode()判断是否只读
 * 4. 根据只读状态禁用编辑控件
 */

import React from 'react';
import { useTeachingStore } from '../stores/useTeachingStore';

/**
 * 只读模式Hook
 * 提供只读状态和加载快照的功能
 */
export function useReadOnlyMode(sessionId: string | null) {
  const {
    loadClassroomSnapshot,
    isClassroomMode,
    currentSnapshot,
    snapshotLoading,
    snapshotError,
  } = useTeachingStore();

  const [isReady, setIsReady] = React.useState(false);

  // 加载快照
  React.useEffect(() => {
    if (sessionId && !isReady) {
      loadClassroomSnapshot(sessionId)
        .then(() => {
          setIsReady(true);
          console.log('[ReadOnlyMode] 快照加载完成');
        })
        .catch((error) => {
          console.error('[ReadOnlyMode] 快照加载失败:', error);
          // 即使失败也标记为ready,允许页面继续渲染
          setIsReady(true);
        });
    }
  }, [sessionId, loadClassroomSnapshot, isReady]);

  return {
    isClassroomMode: isClassroomMode(),
    currentSnapshot,
    snapshotLoading,
    snapshotError,
    isReady,
  };
}

/**
 * 只读标记组件
 * 显示"只读模式"徽章
 */
export function ReadOnlyBadge() {
  const { isClassroomMode, currentSnapshot } = useTeachingStore();

  if (!isClassroomMode()) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700">
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <span>只读模式</span>
      {currentSnapshot?.versionTag && (
        <span className="text-xs opacity-75">
          ({currentSnapshot.versionTag})
        </span>
      )}
    </div>
  );
}

/**
 * 只读提示Banner
 * 在页面顶部显示只读提示
 */
export function ReadOnlyBanner() {
  const { isClassroomMode, currentSnapshot } = useTeachingStore();

  if (!isClassroomMode()) {
    return null;
  }

  const isLocked = !!currentSnapshot?.lockedAt;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            课堂快照只读模式
          </h3>
          <div className="mt-2 text-sm text-blue-700">
            <p>
              当前正在查看课堂快照版本，所有编辑功能已禁用。
              {isLocked && currentSnapshot?.lockedBy && (
                <span className="ml-2 text-blue-600">
                  已锁定 (by {currentSnapshot.lockedBy})
                </span>
              )}
            </p>
            {currentSnapshot && (
              <div className="mt-2 text-xs text-blue-600">
                <div>版本ID: {currentSnapshot.versionId}</div>
                <div>状态: {currentSnapshot.status}</div>
                {currentSnapshot.versionTag && (
                  <div>标签: {currentSnapshot.versionTag}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 表单字段只读包装器
 * 自动根据只读模式禁用输入
 */
interface ReadOnlyFieldProps {
  children: React.ReactNode;
  className?: string;
}

export function ReadOnlyField({ children, className = '' }: ReadOnlyFieldProps) {
  const isClassroomMode = useTeachingStore((state) => state.isClassroomMode());

  return (
    <div className={`${isClassroomMode ? 'opacity-70 pointer-events-none' : ''} ${className}`}>
      {children}
      {isClassroomMode && (
        <div className="absolute inset-0 bg-gray-50/50 cursor-not-allowed" />
      )}
    </div>
  );
}

/**
 * 禁用编辑按钮
 */
interface DisableInReadOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DisableInReadOnly({ children, fallback }: DisableInReadOnlyProps) {
  const isClassroomMode = useTeachingStore((state) => state.isClassroomMode());

  if (isClassroomMode) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
