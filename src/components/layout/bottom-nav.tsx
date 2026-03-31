'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

const navItems = [
  { href: '/roadmap', icon: Map, label: '로드맵' },
  { href: '/record', icon: BookOpen, label: '기록' },
]

export function BottomNav() {
  const pathname = usePathname()
  const lastTapRef = useRef<{ href: string; time: number } | null>(null)

  const handleClick = (e: React.MouseEvent, href: string) => {
    // 햅틱 피드백 (모바일 지원 시)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }

    // 더블탭 감지 → 스크롤 최상단
    // eslint-disable-next-line react-hooks/purity -- Date.now() in event handler is intentional
    const now = Date.now()
    const lastTap = lastTapRef.current

    if (lastTap?.href === href && now - lastTap.time < 300 && pathname.startsWith(href)) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (!pathname.startsWith(href)) {
      trackEvent(ANALYTICS_EVENTS.TAB_SWITCHED, { from: pathname, to: href })
    }

    lastTapRef.current = { href, time: now }
  }

  return (
    <nav
      className="glass-4 fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--color-border)] lg:hidden"
      role="navigation"
      aria-label="메인 네비게이션"
    >
      <div
        className="mx-auto flex h-16 max-w-3xl items-center justify-around px-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => handleClick(e, href)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-w-[64px] flex-col items-center gap-1 rounded-lg px-4 py-2 transition-all',
                'active:scale-95',
                isActive
                  ? 'text-[var(--color-primary-500)]'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              <Icon
                className={cn('h-6 w-6 transition-all', isActive && 'stroke-[2.5]')}
                fill={isActive ? 'var(--color-primary-100)' : 'none'}
              />
              <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-medium')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
