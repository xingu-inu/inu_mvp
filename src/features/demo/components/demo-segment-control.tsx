'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDemoMode, type DemoTab } from '@/lib/demo/demo-context'

interface SegmentItem {
  tab: DemoTab
  label: string
}

const DEMO_NAV_ITEMS: SegmentItem[] = [
  { tab: 'home', label: '홈' },
  { tab: 'roadmap', label: '로드맵' },
  { tab: 'review', label: '회고' },
]

interface DemoSegmentControlProps {
  className?: string
}

export function DemoSegmentControl({ className }: DemoSegmentControlProps) {
  const { activeTab, setActiveTab } = useDemoMode()

  return (
    <nav
      className={cn(
        'flex items-center gap-1 rounded-full bg-[var(--color-bg-tertiary)] p-1',
        className
      )}
      aria-label="데모 메인 네비게이션"
    >
      {DEMO_NAV_ITEMS.map(({ tab, label }) => {
        const isActive = activeTab === tab

        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="demo-segment-indicator"
                className="absolute inset-0 rounded-full bg-[var(--color-primary-500)]"
                transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
