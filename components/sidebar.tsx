"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Scale, FileText, BookOpen, Users, Folder, Star, ChevronLeft, ChevronRight } from "lucide-react"

const navigation = [
  { name: "判决书学习", href: "/dashboard/judgment", icon: Scale },
  { name: "合同学习", href: "/dashboard/contract", icon: FileText },
  { name: "我的课程", href: "/dashboard/courses", icon: BookOpen },
  { name: "虚拟法庭", href: "/dashboard/classroom", icon: Users },
  { name: "我的课件", href: "/dashboard/my-courseware", icon: Folder },
  { name: "收藏", href: "/dashboard/favorites", icon: Star },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    // 从API获取当前用户信息
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        } else {
          router.push('/login')
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <aside id="SidebarId" className={`${collapsed ? 'w-16' : 'w-64'} border-r border-border bg-sidebar flex items-center justify-center transition-all duration-300`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </aside>
    )
  }

  return (
    <aside id="SidebarId" className={`${collapsed ? 'w-16' : 'w-64'} border-r border-border bg-sidebar flex flex-col transition-all duration-300 relative`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all flex items-center justify-center"
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Logo */}
      <div className={`${collapsed ? 'p-3' : 'p-6'} border-b border-sidebar-border transition-all duration-300`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-sidebar" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">LawEdu AI</h1>
              <p className="text-xs text-muted-foreground">法学教育平台</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} transition-all duration-300`}>
        <div className="space-y-1">
          {!collapsed && <p className="px-3 py-2 text-xs font-medium text-muted-foreground">功能</p>}
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center ${collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'} rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-sidebar-border transition-all duration-300`}>
        {collapsed ? (
          <>
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-sm font-medium">
                {user?.display_name?.[0] || 'U'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-2 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex justify-center"
              title="退出登录"
            >
              <span className="text-lg">⎋</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-sm font-medium">
                {user?.display_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.display_name || '用户'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role === 'admin' ? '管理员' : '教师'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              退出登录
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
