/**
 * 对话回放组件
 * T059-T062: Act3对话历史回放UI
 */

'use client';

import React from 'react';

interface DialogueTurn {
  turnId: string;
  turnIndex: number;
  speaker: 'teacher' | 'student' | 'assistant';
  message: string;
  createdAt: string;
}

interface DialogueReplayProps {
  sessionId: string;
  versionId?: string;
  isClassroomMode: boolean;
}

export default function DialogueReplay({
  sessionId,
  versionId,
  isClassroomMode,
}: DialogueReplayProps) {
  const [dialogues, setDialogues] = React.useState<DialogueTurn[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // T059: 加载对话历史
  React.useEffect(() => {
    async function loadDialogues() {
      try {
        const url = versionId
          ? `/api/teaching-sessions/${sessionId}/dialogues?versionId=${versionId}`
          : `/api/teaching-sessions/${sessionId}/dialogues`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || '加载对话失败');
        }

        setDialogues(data.dialogues);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }

    loadDialogues();
  }, [sessionId, versionId]);

  if (loading) {
    return <div className="text-center p-4">加载对话历史中...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">错误: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* T061: 课堂锁定提示 */}
      {isClassroomMode && (
        <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm">
          <span className="font-medium text-blue-800">🔒 只读模式</span>
          <p className="text-blue-700 mt-1">
            当前查看的是课堂快照，对话记录无法修改或删除
          </p>
        </div>
      )}

      {/* T060: 对话回放控件 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">
            对话历史 ({dialogues.length} 轮)
          </h3>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {dialogues.map((turn) => (
            <div
              key={turn.turnId}
              className={`flex ${
                turn.speaker === 'student' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  turn.speaker === 'teacher'
                    ? 'bg-blue-50 border border-blue-200'
                    : turn.speaker === 'student'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                {/* 说话者标识 */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    {turn.speaker === 'teacher'
                      ? '👨‍🏫 教师'
                      : turn.speaker === 'student'
                      ? '👨‍🎓 学生'
                      : '🤖 助手'}
                  </span>
                  <span className="text-xs text-gray-400">
                    第 {turn.turnIndex + 1} 轮
                  </span>
                </div>

                {/* 消息内容 */}
                <p className="text-gray-800">{turn.message}</p>

                {/* 时间戳 */}
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(turn.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}

          {dialogues.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              暂无对话记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
