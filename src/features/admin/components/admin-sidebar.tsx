'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Users,
  Megaphone,
  MessageSquare,
  Settings,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', icon: BarChart3 },
  { href: '/admin/analytics', label: '분석', icon: TrendingUp },
  { href: '/admin/users', label: '사용자', icon: Users },
  { href: '/admin/announcements', label: '공지사항', icon: Megaphone },
  { href: '/admin/feedbacks', label: '피드백', icon: MessageSquare },
  { href: '/admin/settings', label: '설정', icon: Settings },
] as const

export function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-primary)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <Image src="/logo.png" alt="inu" width={28} height={28} />
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Back to App */}
      <div className="border-t border-[var(--color-border)] p-3">
        <Link
          href="/home"
          className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          앱으로 돌아가기
        </Link>
      </div>
    </aside>
  )
}
