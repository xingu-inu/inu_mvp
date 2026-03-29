'use client'

import { Map, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemoMode, type DemoTab } from '@/lib/demo/demo-context'

interface NavItem {
  tab: DemoTab
  icon: React.ComponentType<{ className?: string; fill?: string }>
  label: string
}

const DEMO_NAV_ITEMS: NavItem[] = [
  { tab: 'roadmap', icon: Map, label: '로드맵' },
  { tab: 'review', icon: BarChart3, label: '회고' },
]

export function DemoBottomNav() {
  const { activeTab, setActiveTab } = useDemoMode()

  const handleClick = (tab: DemoTab) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
    setActiveTab(tab)
  }

  return (
    <nav
      className="glass-4 fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--color-border)] lg:hidden"
      role="navigation"
      aria-label="데모 메인 네비게이션"
    >
      <div
        className="mx-auto flex h-16 max-w-3xl items-center justify-around px-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {DEMO_NAV_ITEMS.map(({ tab, icon: Icon, label }) => {
          const isActive = activeTab === tab

          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleClick(tab)}
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
            </button>
          )
        })}
      </div>
    </nav>
  )
}
