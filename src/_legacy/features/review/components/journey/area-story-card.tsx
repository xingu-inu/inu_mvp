'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { AiIcon } from '@/components/common/ai-icon'
import { useReviewInsight } from '../../hooks/use-review-insight'
import type { AreaReviewData, GoalReviewData } from '../../hooks/use-review-roadmap-data'
import type { GoalStatus } from '@/types/entities'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AreaStoryCardProps {
  areaData: AreaReviewData
  isExpanded: boolean
  onToggle: () => void
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STATUS_ICON: Record<GoalStatus, string> = {
  active: '🎯',
  completed: '✅',
  paused: '💤',
  maintenance: '🔄',
  backlog: '📋',
  archived: '📦',
}

// area-story-card uses a richer style object (bg + text + label) distinct from the shared STATUS_STYLES
const STATUS_STYLES: Record<GoalStatus, { bg: string; text: string; label: string }> = {
  active: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    label: '진행 중',
  },
  completed: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: '완료',
  },
  paused: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    label: '일시정지',
  },
  maintenance: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    label: '유지',
  },
  backlog: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-400',
    label: '백로그',
  },
  archived: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-400',
    label: '아카이브',
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StatusDots({ goals }: { goals: GoalReviewData[] }) {
  const counts: Partial<Record<GoalStatus, number>> = {}
  for (const g of goals) {
    counts[g.goal.status] = (counts[g.goal.status] ?? 0) + 1
  }

  const dotEntries: Array<{ status: GoalStatus; count: number }> = []
  const order: GoalStatus[] = [
    'active',
    'completed',
    'maintenance',
    'paused',
    'backlog',
    'archived',
  ]
  for (const s of order) {
    const c = counts[s]
    if (c) dotEntries.push({ status: s, count: c })
  }

  const dotColors: Record<GoalStatus, string> = {
    active: 'bg-blue-400',
    completed: 'bg-emerald-400',
    maintenance: 'bg-amber-400',
    paused: 'bg-gray-400',
    backlog: 'bg-gray-300',
    archived: 'bg-gray-200',
  }

  return (
    <div className="flex items-center gap-1">
      {dotEntries.map(({ status, count }) =>
        Array.from({ length: count }).map((_, i) => (
          <span
            key={`${status}-${i}`}
            className={cn('h-1.5 w-1.5 rounded-full', dotColors[status])}
            title={STATUS_STYLES[status].label}
          />
        ))
      )}
    </div>
  )
}

function PhaseIndicator({ groups }: { groups: GoalReviewData['groups'] }) {
  if (groups.length === 0) return null

  return (
    <div className="mt-1 flex items-center gap-1">
      {groups.map((group, idx) => (
        <div key={group.id} className="flex items-center gap-1">
          {idx > 0 && <span className="h-px w-3 bg-[var(--color-border)]" />}
          <span
            className={cn(
              'h-2 w-2 rounded-full border',
              group.is_completed
                ? 'border-emerald-400 bg-emerald-400'
                : 'border-[var(--color-border)] bg-transparent'
            )}
            title={group.name}
          />
        </div>
      ))}
    </div>
  )
}

function GoalPeriod({ goal }: { goal: GoalReviewData['goal'] }) {
  const start = goal.createdAt ? format(parseISO(goal.createdAt), 'yyyy.MM') : ''
  const isActive = goal.status === 'active' || goal.status === 'maintenance'
  const end = isActive ? '~' : '~'

  if (!start) return null

  return (
    <span className="mt-0.5 block text-[11px] text-[var(--color-text-tertiary)]">
      {start} {end}
    </span>
  )
}

function GoalItem({ goalData }: { goalData: GoalReviewData }) {
  const { goal, groups } = goalData
  const statusStyle = STATUS_STYLES[goal.status]

  return (
    <div className="flex items-start gap-2.5 py-2.5 first:pt-0">
      <span className="mt-0.5 shrink-0 text-base">{STATUS_ICON[goal.status]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {goal.name}
          </span>
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
              statusStyle.bg,
              statusStyle.text
            )}
          >
            {statusStyle.label}
          </span>
        </div>
        {groups.length > 0 && <PhaseIndicator groups={groups} />}
        <GoalPeriod goal={goal} />
      </div>
    </div>
  )
}

function AiInsightSection({ areaData }: { areaData: AreaReviewData }) {
  const { data, isLoading, error, generate } = useReviewInsight()

  function handleGenerate() {
    void generate({
      period: 'month',
      periodLabel: areaData.area.name,
      completionRate: areaData.periodCompletionRate,
      activeDays: 0,
      totalDays: 30,
      avgMoodLabel: '',
      moodTrend: [],
      topStreaks: [],
      areaBalances: [
        {
          areaName: areaData.area.name,
          completionRate: areaData.periodCompletionRate,
        },
      ],
    })
  }

  if (!data && !isLoading) {
    return (
      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <button
          onClick={handleGenerate}
          className="flex items-center gap-1.5 text-xs text-[var(--color-primary-500)] hover:underline"
        >
          <span>💡</span>
          <span>AI 분석</span>
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <button onClick={handleGenerate} className="text-xs text-red-500 hover:underline">
          다시 시도하기
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <p className="mb-1.5 text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        AI 분석
      </p>
      <div className="space-y-1">
        {data.patterns.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-1.5 text-xs text-[var(--color-text-secondary)]"
          >
            <AiIcon
              name={p.icon}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]"
            />
            <span>{p.text}</span>
          </div>
        ))}
      </div>
      {data.coaching.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.coaching.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs text-[var(--color-text-tertiary)] italic"
            >
              <AiIcon name={c.icon} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AreaStoryCard({ areaData, isExpanded, onToggle }: AreaStoryCardProps) {
  const { area, goals } = areaData

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      {/* Header / collapsed state */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4"
        aria-expanded={isExpanded}
      >
        <span className="text-xl">{area.emoji}</span>
        <div className="min-w-0 flex-1 text-left">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{area.name}</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-[var(--color-text-tertiary)]">{goals.length}개 목표</span>
            <StatusDots goals={goals} />
          </div>
        </div>
        <motion.span
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          className="shrink-0 text-[var(--color-text-tertiary)]"
        >
          <ChevronRight size={16} />
        </motion.span>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] px-4 pb-4">
              {goals.map((goalData) => (
                <GoalItem key={goalData.goal.id} goalData={goalData} />
              ))}
              <AiInsightSection areaData={areaData} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
