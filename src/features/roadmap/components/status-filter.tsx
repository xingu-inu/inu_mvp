'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_CONFIG, GOAL_STATUS_OPTIONS } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'
import {
  useRoadmapStore,
  selectStatusFilter,
  type StatusFilter as StatusFilterType,
} from '@/stores/roadmap.store'

const ALL_OPTIONS: { value: StatusFilterType; label: string }[] = [
  { value: 'all', label: '전체' },
  ...GOAL_STATUS_OPTIONS,
]

function getStatusSelectedClass(value: StatusFilterType): string | undefined {
  if (value === 'all') return undefined
  const config = GOAL_STATUS_CONFIG[value as GoalStatus]
  return cn(config.border, config.bg, config.text)
}

export function StatusFilter() {
  const statusFilter = useRoadmapStore(selectStatusFilter)
  const setStatusFilter = useRoadmapStore((s) => s.setStatusFilter)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSelect = (value: StatusFilterType) => {
    setStatusFilter(value)
    setIsExpanded(false)
  }

  // Chips to show when expanded (everything except the currently selected one)
  const extraOptions = ALL_OPTIONS.filter((o) => o.value !== statusFilter)

  return (
    <div className="flex items-center gap-2">
      {/* Selected chip — always visible, no conditional render */}
      <Chip
        variant="selection"
        selected
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn('cursor-pointer', getStatusSelectedClass(statusFilter))}
      >
        {ALL_OPTIONS.find((o) => o.value === statusFilter)?.label ?? '전체'}
      </Chip>

      {/* Extra chips — animate in/out to the right */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex items-center gap-2 overflow-hidden"
          >
            {extraOptions.map((option) => (
              <Chip
                key={option.value}
                variant="selection"
                selected={false}
                onClick={() => handleSelect(option.value)}
                className="cursor-pointer whitespace-nowrap"
              >
                {option.label}
              </Chip>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
      >
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </motion.span>
        {!isExpanded && <span>더보기</span>}
      </button>
    </div>
  )
}
