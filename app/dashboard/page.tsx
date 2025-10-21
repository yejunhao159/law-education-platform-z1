import { Scale, FileText, BookOpen, Users, Folder, Star } from "lucide-react"

export default function DashboardPage() {
  return (
    <div id="DashboardPageId" className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            欢迎使用 LawEdu AI
          </h1>
          <p className="text-lg text-muted-foreground">
            智能化法学教育平台 - AI驱动的四幕教学法
          </p>
        </div>

        {/* All Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 判决书学习 */}
          <a
            href="/dashboard/judgment"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              判决书学习
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              通过四幕教学法深入学习法律判决书，提升法律分析能力
            </p>
          </a>

          {/* 合同学习 */}
          <a
            href="/dashboard/contract"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              合同学习
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              系统化学习合同法知识，掌握合同起草与审查技能
            </p>
          </a>

          {/* 我的课程 */}
          <a
            href="/dashboard/courses"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              我的课程
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              查看和管理您的所有课程，跟踪学习进度
            </p>
          </a>

          {/* 虚拟法庭 */}
          <a
            href="/dashboard/classroom"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              虚拟法庭
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              模拟法庭场景，角色扮演，AI辅助法律实训
            </p>
          </a>

          {/* 课件存储 */}
          <a
            href="/dashboard/courseware"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Folder className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              课件存储
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI智能生成教学课件，一键导出PPT，高效备课
            </p>
          </a>

          {/* 收藏 */}
          <a
            href="/dashboard/favorites"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Star className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              收藏
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              管理您收藏的案例、课件和学习资料
            </p>
          </a>
        </div>

        {/* Quick Start Tip */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 快速开始
          </h2>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            点击上方卡片开始使用各项功能。所有功能也可以通过左侧菜单快速访问。
          </p>
        </div>
      </div>
    </div>
  )
}
