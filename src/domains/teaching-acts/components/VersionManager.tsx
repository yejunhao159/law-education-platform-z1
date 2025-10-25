/**
 * 版本管理组件
 * T071-T076: 版本历史、切换、回放功能
 */

'use client';

import React from 'react';
import { useTeachingStore } from '../stores/useTeachingStore';

interface VersionMetadata {
  versionId: string;
  versionTag: string;
  status: string;
  classroomReady: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VersionManagerProps {
  sessionId: string;
}

export default function VersionManager({ sessionId }: VersionManagerProps) {
  const [versions, setVersions] = React.useState<VersionMetadata[]>([]);
  const [selectedVersion, setSelectedVersion] = React.useState<string | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);

  const { currentSnapshot } = useTeachingStore();

  // T071: 加载版本列表
  const loadVersions = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/teaching-sessions/${sessionId}/versions`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '加载版本失败');
      }

      setVersions(data.versions);
      setLoading(false);
    } catch (error) {
      console.error('加载版本失败:', error);
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // T072: 加载特定版本
  const loadSpecificVersion = async (versionId: string) => {
    try {
      const response = await fetch(
        `/api/teaching-sessions/${sessionId}/versions/${versionId}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '加载版本失败');
      }

      // 更新Store中的快照
      useTeachingStore.setState({
        currentSnapshot: data.snapshot,
      });

      setSelectedVersion(versionId);
    } catch (error) {
      console.error('加载版本失败:', error);
      alert('加载版本失败: ' + error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">加载版本列表...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* T073: 版本历史UI */}
      <h2 className="text-xl font-semibold mb-4">版本历史</h2>

      {/* T075: 版本回放模式提示 */}
      {selectedVersion && selectedVersion !== currentSnapshot?.versionId && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-yellow-800">
              历史回放模式
            </span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            正在查看历史版本，内容为只读状态
          </p>
        </div>
      )}

      {/* 版本列表 */}
      <div className="space-y-3">
        {versions.map((version) => {
          const isSelected = version.versionId === selectedVersion;
          const isCurrent =
            version.versionId === currentSnapshot?.versionId;

          return (
            <div
              key={version.versionId}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isCurrent
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => loadSpecificVersion(version.versionId)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* 版本标签 */}
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {version.versionTag}
                    </h3>

                    {/* 状态徽章 */}
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        version.status === 'classroom_ready'
                          ? 'bg-green-100 text-green-800'
                          : version.status === 'ready_for_class'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {version.status}
                    </span>

                    {/* T076: 锁定标识 */}
                    {version.locked && (
                      <span className="flex items-center gap-1 text-xs text-gray-600">
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
                        已锁定
                      </span>
                    )}

                    {isCurrent && (
                      <span className="text-xs text-green-600 font-medium">
                        当前版本
                      </span>
                    )}
                  </div>

                  {/* 时间信息 */}
                  <div className="mt-2 text-sm text-gray-600">
                    <div>
                      创建: {new Date(version.createdAt).toLocaleString()}
                    </div>
                    <div>
                      更新: {new Date(version.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  {isSelected && (
                    <button
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadSpecificVersion(version.versionId);
                      }}
                    >
                      加载
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {versions.length === 0 && (
          <div className="text-center text-gray-500 py-8">暂无版本记录</div>
        )}
      </div>
    </div>
  );
}

/**
 * T074: 版本切换器组件（用于页面header）
 */
export function VersionSwitcher({ sessionId }: { sessionId: string }) {
  const [versions, setVersions] = React.useState<VersionMetadata[]>([]);
  const { currentSnapshot } = useTeachingStore();

  React.useEffect(() => {
    fetch(`/api/teaching-sessions/${sessionId}/versions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVersions(data.versions);
        }
      })
      .catch(console.error);
  }, [sessionId]);

  return (
    <select
      className="px-3 py-2 border rounded-md text-sm"
      value={currentSnapshot?.versionId || ''}
      onChange={(e) => {
        const versionId = e.target.value;
        // 加载选中的版本
        fetch(`/api/teaching-sessions/${sessionId}/versions/${versionId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              useTeachingStore.setState({
                currentSnapshot: data.snapshot,
              });
            }
          });
      }}
    >
      <option value="">选择版本</option>
      {versions.map((v) => (
        <option key={v.versionId} value={v.versionId}>
          {v.versionTag} ({v.status})
        </option>
      ))}
    </select>
  );
}
