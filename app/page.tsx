"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // 检查认证状态
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setChecking(false))
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return null
}
