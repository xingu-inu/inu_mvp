'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useHomeState, type HomeView } from '../hooks/use-home-state'

const VIEW_OPTIONS: { value: HomeView; label: string }[] = [
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
]

export function HomeViewToggle() {
  const { view, setView } = useHomeState()

  return (
    <div
      className="flex items-center gap-0.5 rounded-full bg-[var(--color-bg-tertiary)] p-0.5"
      role="tablist"
      aria-label="캘린더 뷰 전환"
    >
      {VIEW_OPTIONS.map((option) => {
        const isActive = view === option.value
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => setView(option.value)}
            className={cn(
              'relative rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="home-view-indicator"
                className="absolute inset-0 rounded-full bg-[var(--color-primary-500)]"
                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
