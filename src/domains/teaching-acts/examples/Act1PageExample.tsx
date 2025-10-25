/**
 * Act1 页面集成示例
 * T045: 展示如何在Act1页面中集成只读模式
 *
 * 实际页面位置: app/teaching/[id]/act1/page.tsx
 *
 * 关键要点:
 * 1. 使用useReadOnlyMode hook加载快照
 * 2. 根据isClassroomMode()状态禁用编辑控件
 * 3. 从currentSnapshot读取Act1数据展示
 * 4. 显示ReadOnlyBanner提示用户
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  useReadOnlyMode,
  ReadOnlyBanner,
  ReadOnlyBadge,
  DisableInReadOnly,
} from '../components/ReadOnlyModeMixin';
import { useTeachingStore } from '../stores/useTeachingStore';

export default function Act1PageExample() {
  const params = useParams();
  const sessionId = params?.id as string;

  // 1. 使用只读模式hook
  const { isClassroomMode, currentSnapshot, snapshotLoading, isReady } =
    useReadOnlyMode(sessionId);

  // 2. 获取Store状态
  const { uploadData, setExtractedElements } = useTeachingStore();

  // 3. 根据模式选择数据源
  const act1Data = isClassroomMode
    ? currentSnapshot?.act1CaseSnapshot // 只读: 从快照读取
    : uploadData.extractedElements; // 编辑: 从Store读取

  // 加载中状态
  if (snapshotLoading || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载课堂快照中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 只读提示Banner */}
      <ReadOnlyBanner />

      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">第一幕：案例导入</h1>
        <ReadOnlyBadge />
      </div>

      {/* 案例内容展示 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">案例信息</h2>

        {act1Data ? (
          <div className="space-y-4">
            {/* 案例标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                案例标题
              </label>
              <input
                type="text"
                value={(act1Data as any)?.caseTitle || ''}
                disabled={isClassroomMode}
                className={`w-full px-3 py-2 border rounded-md ${
                  isClassroomMode
                    ? 'bg-gray-50 cursor-not-allowed'
                    : 'bg-white'
                }`}
                onChange={(e) => {
                  if (!isClassroomMode) {
                    // 编辑模式下的处理逻辑
                    console.log('Editing:', e.target.value);
                  }
                }}
              />
            </div>

            {/* 案例内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                案例内容
              </label>
              <textarea
                value={(act1Data as any)?.caseContent || ''}
                disabled={isClassroomMode}
                rows={10}
                className={`w-full px-3 py-2 border rounded-md ${
                  isClassroomMode
                    ? 'bg-gray-50 cursor-not-allowed'
                    : 'bg-white'
                }`}
                onChange={(e) => {
                  if (!isClassroomMode) {
                    console.log('Editing:', e.target.value);
                  }
                }}
              />
            </div>

            {/* 元数据展示 */}
            {(act1Data as any)?.metadata && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  元数据
                </h3>
                <pre className="text-xs text-gray-600 overflow-auto">
                  {JSON.stringify((act1Data as any).metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {isClassroomMode
              ? '快照中无Act1数据'
              : '尚未导入案例，请先上传案例文件'}
          </div>
        )}
      </div>

      {/* 操作按钮区 */}
      <div className="flex gap-4">
        {/* 只在编辑模式下显示编辑按钮 */}
        <DisableInReadOnly>
          <button
            onClick={() => {
              // 编辑逻辑
              console.log('Edit clicked');
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            编辑案例
          </button>

          <button
            onClick={() => {
              // 保存逻辑
              console.log('Save clicked');
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            保存修改
          </button>
        </DisableInReadOnly>

        {/* 只读模式下显示查看详情按钮 */}
        {isClassroomMode && (
          <button
            onClick={() => {
              console.log('View details');
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            查看详情
          </button>
        )}

        {/* 下一步按钮始终可用 */}
        <button
          onClick={() => {
            // 进入下一幕
            console.log('Next act');
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
        >
          进入第二幕
        </button>
      </div>

      {/* 快照信息调试面板 (开发环境) */}
      {process.env.NODE_ENV === 'development' && currentSnapshot && (
        <div className="mt-8 bg-gray-100 p-4 rounded-md">
          <h3 className="text-sm font-medium mb-2">快照信息 (开发模式)</h3>
          <div className="text-xs space-y-1">
            <div>版本ID: {currentSnapshot.versionId}</div>
            <div>会话ID: {currentSnapshot.sessionId}</div>
            <div>状态: {currentSnapshot.status}</div>
            <div>
              课堂就绪: {currentSnapshot.classroomReady ? '是' : '否'}
            </div>
            {currentSnapshot.lockedAt && (
              <div>
                锁定时间: {new Date(currentSnapshot.lockedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 集成检查清单:
 *
 * ✅ 1. 导入useReadOnlyMode hook
 * ✅ 2. 在组件初始化时调用hook加载快照
 * ✅ 3. 根据isClassroomMode()判断模式
 * ✅ 4. 从currentSnapshot读取Act1数据
 * ✅ 5. 禁用编辑控件 (disabled={isClassroomMode})
 * ✅ 6. 使用DisableInReadOnly包装编辑按钮
 * ✅ 7. 显示ReadOnlyBanner和ReadOnlyBadge
 * ✅ 8. 处理加载和错误状态
 *
 * 迁移到实际页面的步骤:
 * 1. 复制这个文件到 app/teaching/[id]/act1/page.tsx
 * 2. 调整导入路径
 * 3. 替换示例数据结构为实际的Act1 Schema
 * 4. 集成实际的编辑逻辑
 * 5. 测试只读模式和编辑模式切换
 */
