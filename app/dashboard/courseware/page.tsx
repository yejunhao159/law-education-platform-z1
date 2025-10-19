/**
 * 课件存储页面
 * 整合PPT生成功能,提供智能化教学课件管理
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, FolderOpen, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CoursewarePage() {
  const router = useRouter()

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            课件存储
          </h1>
          <p className="text-muted-foreground">
            AI智能生成教学课件,一键导出PPT,高效备课
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 生成新课件 */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/teaching/ppt/generate')}>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <CardTitle>生成新课件</CardTitle>
              <CardDescription>
                基于四幕教学数据,智能生成专业PPT课件
              </CardDescription>
            </CardHeader>
          </Card>

          {/* 我的课件库 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <CardTitle>我的课件库</CardTitle>
              <CardDescription>
                查看和管理已生成的教学课件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">功能开发中...</p>
            </CardContent>
          </Card>
        </div>

        {/* 功能说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              功能介绍
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">智能PPT生成</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>自动收集四幕教学数据(案例导入、深度分析、苏格拉底讨论、总结提升)</li>
                <li>AI流式生成PPT大纲,实时预览</li>
                <li>支持在线编辑大纲内容</li>
                <li>多种官方模板可选</li>
                <li>一键生成并下载专业PPT</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">使用流程</h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>完成判决书学习的四幕教学流程</li>
                <li>点击"生成新课件"进入PPT生成页面</li>
                <li>选择PPT模板风格</li>
                <li>AI自动生成大纲(可编辑)</li>
                <li>确认后生成PPT并下载</li>
              </ol>
            </div>

            <div className="pt-4">
              <Button onClick={() => router.push('/teaching/ppt/generate')}>
                <Plus className="w-4 h-4 mr-2" />
                立即生成课件
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
