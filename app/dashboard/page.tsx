export default function DashboardPage() {
  return (
    <div className="p-8">
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

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Judgment Learning Card */}
          <a
            href="/dashboard/judgment"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              判决书学习
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              通过四幕教学法深入学习法律判决书，提升法律分析能力
            </p>
          </a>

          {/* Courseware Storage Card */}
          <a
            href="/dashboard/courseware"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              课件存储
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI智能生成教学课件，一键导出PPT，高效备课
            </p>
          </a>

          {/* Virtual Classroom Card */}
          <a
            href="/dashboard/classroom"
            className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              虚拟课堂
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              实时互动教学，AI辅助课堂讨论，提升学习效果
            </p>
          </a>
        </div>

        {/* Stats or Recent Activity could go here */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 快速开始
          </h2>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            点击上方卡片开始使用各项功能，或通过左侧菜单导航到其他模块。
          </p>
        </div>
      </div>
    </div>
  )
}
