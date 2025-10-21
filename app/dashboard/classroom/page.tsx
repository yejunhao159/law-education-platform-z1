/**
 * 虚拟法庭页面
 * 模拟真实法庭场景，进行法律实训
 */

'use client'

import { Scale, Users, BookOpen, AlertCircle, Hammer, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VirtualCourtroomPage() {
  return (
    <div id="ClassroomPageId" className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            虚拟法庭
          </h1>
          <p className="text-muted-foreground">
            模拟真实法庭场景，进行角色扮演式法律实训
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-1">
                功能开发中
              </h2>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                虚拟法庭功能正在紧张开发中，即将上线。我们将提供完整的模拟法庭体验，包括角色分配、案件推演、AI辅助等功能。
              </p>
            </div>
          </div>
        </div>

        {/* 规划中的功能 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 角色系统 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <CardTitle>角色系统</CardTitle>
              <CardDescription>
                分配法庭角色，模拟真实庭审流程
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>法官席：</strong>主持庭审，裁决案件</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>原告律师：</strong>陈述诉求，质询证人</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>被告律师：</strong>辩护答辩，举证反驳</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>观察员：</strong>旁听学习，实时评论</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 案件库 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <CardTitle>案件库</CardTitle>
              <CardDescription>
                真实案例改编，涵盖多个法律领域
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span><strong>民事案件：</strong>合同纠纷、侵权责任等</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span><strong>刑事案件：</strong>盗窃、诈骗、伤害等</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span><strong>行政案件：</strong>行政许可、行政处罚等</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span><strong>自定义案件：</strong>导入真实判决书推演</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* AI辅助 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <CardTitle>AI智能辅助</CardTitle>
              <CardDescription>
                AI扮演缺席角色，提供实时建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span><strong>智能对手：</strong>AI扮演对方律师，真实对抗</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span><strong>法律建议：</strong>实时提示法条和判例</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span><strong>质询引导：</strong>AI生成质询问题建议</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span><strong>判决分析：</strong>AI解读裁判理由和依据</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 流程控制 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4">
                <Hammer className="w-6 h-6 text-white" />
              </div>
              <CardTitle>庭审流程</CardTitle>
              <CardDescription>
                标准化庭审程序，规范化实训
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span><strong>开庭准备：</strong>角色分配，材料准备</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span><strong>法庭调查：</strong>陈述、举证、质证</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span><strong>法庭辩论：</strong>双方辩论，总结陈词</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span><strong>判决宣告：</strong>法官宣判，生成报告</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* 学习价值 */}
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              教学价值
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              虚拟法庭将为法学教育提供沉浸式实训体验：
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span><strong>实战演练：</strong>从理论到实践的桥梁</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span><strong>角色体验：</strong>理解不同法律角色的职责</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span><strong>能力提升：</strong>锻炼法律思维和辩论技巧</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span><strong>安全环境：</strong>无风险的试错学习空间</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
