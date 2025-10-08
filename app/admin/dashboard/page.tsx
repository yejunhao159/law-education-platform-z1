/**
 * 管理后台 - 仪表板
 * 只有 admin 角色（teacher01）可以访问
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, LogIn, Activity, TrendingUp } from 'lucide-react';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  is_active: number;
  created_at: string;
  stats: {
    loginCount: number;
    lastLoginTime: string | null;
  };
}

interface Stats {
  summary: {
    totalUsers: number;
    totalLogins: number;
    recentLogins: number;
    activeUsers: number;
  };
  charts: {
    dailyLogins: Array<{ date: string; count: number }>;
    topUsers: Array<{
      id: number;
      username: string;
      display_name: string;
      login_count: number;
    }>;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');

      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      setCurrentUser(data.user);

      // 检查是否是管理员
      if (data.user.role !== 'admin') {
        toast.error('您没有管理员权限');
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      // 并行请求用户列表和统计数据
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
      ]);

      if (!usersRes.ok || !statsRes.ok) {
        if (usersRes.status === 403 || statsRes.status === 403) {
          toast.error('您没有管理员权限');
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();

      setUsers(usersData.users);
      setStats(statsData);
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '从未登录';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
            <p className="text-gray-600 mt-1">
              欢迎回来，{currentUser?.display_name}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/')}>
              返回首页
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.summary.totalUsers}</div>
                <p className="text-xs text-muted-foreground">注册用户总数</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总登录次数</CardTitle>
                <LogIn className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.summary.totalLogins}</div>
                <p className="text-xs text-muted-foreground">累计登录次数</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.summary.activeUsers}</div>
                <p className="text-xs text-muted-foreground">最近7天登录</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">近期登录</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.summary.recentLogins}</div>
                <p className="text-xs text-muted-foreground">最近7天登录次数</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 用户列表 */}
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>系统中的所有用户及其统计信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-700">ID</th>
                    <th className="pb-3 font-medium text-gray-700">用户名</th>
                    <th className="pb-3 font-medium text-gray-700">显示名</th>
                    <th className="pb-3 font-medium text-gray-700">角色</th>
                    <th className="pb-3 font-medium text-gray-700">状态</th>
                    <th className="pb-3 font-medium text-gray-700">登录次数</th>
                    <th className="pb-3 font-medium text-gray-700">最后登录</th>
                    <th className="pb-3 font-medium text-gray-700">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">{user.id}</td>
                      <td className="py-3 font-medium">{user.username}</td>
                      <td className="py-3">{user.display_name}</td>
                      <td className="py-3">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? '管理员' : '教师'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={user.is_active ? 'default' : 'destructive'}>
                          {user.is_active ? '激活' : '禁用'}
                        </Badge>
                      </td>
                      <td className="py-3">{user.stats.loginCount}</td>
                      <td className="py-3 text-sm text-gray-600">
                        {formatDate(user.stats.lastLoginTime)}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 登录排行榜 */}
        {stats && stats.charts.topUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>登录排行榜</CardTitle>
              <CardDescription>登录次数最多的用户</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.charts.topUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{user.display_name}</p>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {user.login_count}
                      </p>
                      <p className="text-sm text-gray-600">次登录</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
