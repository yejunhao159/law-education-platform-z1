import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div id="DashboardLayoutId" className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
