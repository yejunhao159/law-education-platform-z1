/**
 * 收藏页面
 * 展示用户收藏的案例、课件等内容
 */

import { Star, Bookmark, Heart } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function FavoritesPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            我的收藏
          </h1>
          <p className="text-muted-foreground">
            管理您收藏的案例、课件和学习资料
          </p>
        </div>

        {/* Placeholder Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              收藏功能开发中
            </CardTitle>
            <CardDescription>
              即将推出完整的收藏管理系统
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Star className="w-8 h-8 text-yellow-600 mb-2" />
                <h3 className="font-semibold mb-1">收藏案例</h3>
                <p className="text-sm text-muted-foreground">
                  保存重要的判决书案例
                </p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Bookmark className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold mb-1">收藏课件</h3>
                <p className="text-sm text-muted-foreground">
                  保存有价值的教学课件
                </p>
              </div>

              <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                <Heart className="w-8 h-8 text-pink-600 mb-2" />
                <h3 className="font-semibold mb-1">学习笔记</h3>
                <p className="text-sm text-muted-foreground">
                  记录学习过程中的心得体会
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
