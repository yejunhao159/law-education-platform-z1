/**
 * 学生扫码加入课堂页面
 * 无需登录，扫码即用
 */
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export default function JoinClassroomPage({ params }: PageProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const { code } = use(params);

  // 自动加入课堂（无需输入姓名）
  const handleAutoJoin = async () => {
    setIsJoining(true);

    try {
      // 验证课堂是否存在
      const response = await fetch(`/api/classroom/${code}/check`);

      if (response.ok) {
        // 直接跳转到学生视图
        router.push(`/classroom/${code}/student`);
      } else {
        alert('课堂不存在或已结束');
      }
    } catch (error) {
      console.error('加入课堂失败:', error);
      alert('加入失败，请重试');
    } finally {
      setIsJoining(false);
    }
  };

  // 页面加载时自动加入
  useEffect(() => {
    handleAutoJoin();
  }, [code]);

  return (
    <div id="JoinClassroomPageId" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            正在加入课堂
          </h1>
          <p className="text-gray-600">
            课堂代码: <span className="font-mono font-semibold">{code}</span>
          </p>
        </div>

        {isJoining ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500">正在连接...</p>
          </div>
        ) : (
          <Button
            onClick={handleAutoJoin}
            className="w-full"
            size="lg"
          >
            重新加入
          </Button>
        )}

        <p className="text-xs text-gray-400 mt-6">
          无需登录，扫码即用
        </p>
      </Card>
    </div>
  );
}
