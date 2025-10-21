/**
 * 用户导航栏组件
 * 显示当前用户信息和登出按钮
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
  role: string;
}

export function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/session');

      if (!response.ok) {
        // 未登录，重定向到登录页
        router.push('/login');
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('已退出登录');
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('退出登录失败');
    }
  };

  if (loading || !user) {
    return null;
  }

  const initials = user.display_name.slice(0, 2);

  return (
    <div id="UserNavId">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.display_name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              @{user.username}
            </p>
            {user.role === 'admin' && (
              <p className="text-xs leading-none text-blue-600">管理员</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'admin' && (
          <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>管理后台</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
