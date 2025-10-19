"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || '登录失败')
        return
      }

      toast.success('登录成功！')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Login error:', error)
      toast.error('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 p-8">
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          {/* Username field */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-gray-700 block">
              账号
            </label>
            <Input
              id="username"
              type="text"
              placeholder="请输入账号"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 px-4 text-[15px] bg-white/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400 hover:bg-white"
              required
              disabled={loading}
            />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 block">
              密码
            </label>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 px-4 text-[15px] bg-white/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400 hover:bg-white"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Demo account hint */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>体验账号: teacher01 - teacher05</p>
          <p>密码: 2025</p>
        </div>

        {/* Login button */}
        <Button
          type="submit"
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-[15px] font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
          disabled={loading}
        >
          {loading ? '登录中...' : '登录'}
        </Button>

        {/* Forgot password link */}
        <div className="text-center pt-2">
          <a href="#" className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-light">
            忘记密码？
          </a>
        </div>
      </form>
    </div>
  )
}
