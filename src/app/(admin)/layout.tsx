import { AdminGuard } from '@/features/admin/components/admin-guard'
import { AdminSidebar } from '@/features/admin/components/admin-sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-[var(--color-bg-secondary)] p-6">
          {children}
        </main>
      </div>
    </AdminGuard>
  )
}
