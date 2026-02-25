'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, Compass } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_GROUPS } from '@/lib/goal-status'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore, selectStatusFilter } from '@/stores/roadmap.store'
import { EmptyRoadmap } from './empty-roadmap'
import { GoalListSkeleton } from './goal-list-skeleton'
import { ErrorCard } from '@/components/ui/error-card'
import { MobileGoalCard } from './mobile-goal-card'
import { GoalDetailDrawer } from './goal-detail-drawer'
import type { Goal, Area } from '@/types/entities'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Direction Banner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DirectionBanner({ statement }: { statement: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className="flex w-full items-start gap-2.5 rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 text-left transition-colors active:bg-[var(--color-bg-tertiary)]"
    >
      <Compass className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary-500)]" />
      <p
        className={cn(
          'flex-1 text-sm leading-relaxed text-[var(--color-text-secondary)]',
          !isOpen && 'line-clamp-1'
        )}
      >
        {statement}
      </p>
      <motion.span
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className="mt-0.5 shrink-0"
      >
        <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
      </motion.span>
    </button>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Status Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface StatusSectionProps {
  label: string
  count: number
  defaultExpanded: boolean
  children: React.ReactNode
}

function StatusSection({ label, count, defaultExpanded, children }: StatusSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 py-2"
      >
        <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
        </motion.span>
        <span className="text-xs font-semibold tracking-wider text-[var(--color-text-tertiary)] uppercase">
          {label}
        </span>
        <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-tertiary)]">
          {count}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Area Section Header
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AreaSectionProps {
  area: Area
  goalCount: number
  children: React.ReactNode
}

function AreaSection({ area, goalCount, children }: AreaSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors active:bg-[var(--color-bg-tertiary)]"
        style={{ backgroundColor: `${area.color}10` }}
      >
        <span className="text-base">{area.emoji}</span>
        <span className="flex-1 text-left text-sm font-semibold text-[var(--color-text-primary)]">
          {area.name}
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">{goalCount}개</span>
        <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 pl-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function MobileRoadmapView() {
  const statusFilter = useRoadmapStore(selectStatusFilter)
  const openMobileDrawer = useRoadmapStore((s) => s.openMobileDrawer)
  const setPanelMode = useRoadmapStore((s) => s.setPanelMode)

  const { data: direction } = useDirection()
  const {
    data: goals = [],
    isLoading: goalsLoading,
    isError: goalsError,
    error: goalsErr,
    refetch: refetchGoals,
  } = useGoals()
  const {
    data: areas = [],
    isLoading: areasLoading,
    isError: areasError,
    error: areasErr,
    refetch: refetchAreas,
  } = useAreas()

  const handleGoalClick = useCallback(
    (goalId: string) => {
      openMobileDrawer(goalId)
    },
    [openMobileDrawer]
  )

  // Group goals by status, then by area
  const groupedData = useMemo(() => {
    const activeAreas = areas.filter((a) => a.is_active)
    const areaMap = new Map(activeAreas.map((a) => [a.id, a]))

    return GOAL_STATUS_GROUPS.map((statusGroup) => {
      // Apply status filter
      if (statusFilter !== 'all' && statusFilter !== statusGroup.id) return null

      const statusGoals = goals.filter((g) => g.status === statusGroup.id)
      if (statusGoals.length === 0) return null

      // Group by area
      const byArea = new Map<string, Goal[]>()
      for (const goal of statusGoals) {
        const existing = byArea.get(goal.area_id) ?? []
        byArea.set(goal.area_id, [...existing, goal])
      }

      const areaSections = Array.from(byArea.entries())
        .map(([areaId, areaGoals]) => {
          const area = areaMap.get(areaId)
          if (!area) return null
          return { area, goals: areaGoals }
        })
        .filter(Boolean) as { area: Area; goals: Goal[] }[]

      return {
        ...statusGroup,
        count: statusGoals.length,
        areaSections,
      }
    }).filter(Boolean) as {
      id: string
      label: string
      defaultExpanded: boolean
      count: number
      areaSections: { area: Area; goals: Goal[] }[]
    }[]
  }, [goals, areas, statusFilter])

  if (goalsError || areasError) {
    return (
      <ErrorCard
        error={(goalsErr ?? areasErr) as Error}
        onRetry={() => {
          refetchGoals()
          refetchAreas()
        }}
      />
    )
  }

  if (goalsLoading || areasLoading) {
    return <GoalListSkeleton />
  }

  if (goals.length === 0) {
    return <EmptyRoadmap onAddGoal={() => setPanelMode('browse')} isMobile />
  }

  return (
    <>
      <div className="space-y-4">
        {/* Direction Banner */}
        {direction?.statement && <DirectionBanner statement={direction.statement} />}

        {/* Status Sections */}
        {groupedData.map((section) => (
          <StatusSection
            key={section.id}
            label={section.label}
            count={section.count}
            defaultExpanded={section.defaultExpanded}
          >
            {section.areaSections.map(({ area, goals: areaGoals }) => (
              <AreaSection key={area.id} area={area} goalCount={areaGoals.length}>
                {areaGoals.map((goal) => (
                  <MobileGoalCard
                    key={goal.id}
                    goal={goal}
                    onClick={() => handleGoalClick(goal.id)}
                  />
                ))}
              </AreaSection>
            ))}
          </StatusSection>
        ))}

        {/* When filter active but no results */}
        {groupedData.length === 0 && statusFilter !== 'all' && (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--color-text-tertiary)]">해당 상태의 목표가 없어요</p>
          </div>
        )}
      </div>

      {/* Goal Detail Bottom Sheet */}
      <GoalDetailDrawer />
    </>
  )
}
