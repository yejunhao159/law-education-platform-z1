/**
 * 合同学习页面
 * 提供合同文档的智能分析和学习功能
 */

import { FileText, Search, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ContractPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            合同学习
          </h1>
          <p className="text-muted-foreground">
            上传合同文档,进行智能分析和风险识别
          </p>
        </div>

        {/* Placeholder Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              合同分析功能开发中
            </CardTitle>
            <CardDescription>
              即将推出智能合同审查和学习系统
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold mb-1">合同解析</h3>
                <p className="text-sm text-muted-foreground">
                  自动识别合同条款和关键要素
                </p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertCircle className="w-8 h-8 text-orange-600 mb-2" />
                <h3 className="font-semibold mb-1">风险识别</h3>
                <p className="text-sm text-muted-foreground">
                  AI识别潜在的法律风险和漏洞
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Search className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-semibold mb-1">条款对比</h3>
                <p className="text-sm text-muted-foreground">
                  对比标准条款,提供修改建议
                </p>
              </div>
            </div>

            <div className="p-6 bg-muted/50 rounded-lg text-center">
              <p className="text-muted-foreground">
                该功能正在开发中,敬请期待...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
