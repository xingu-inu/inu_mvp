'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REFLECTION_PROMPTS } from '../../utils/generate-insight'

// ---- Types -------------------------------------------------------

interface OverviewStats {
  completionRate: number
  activeDays: number
  totalDays: number
  avgMoodLabel: string
  avgMoodEmoji: string
  longestStreak: number
}

interface PeriodReflectionSectionProps {
  isWeek: boolean
  periodLabel: string // "이번 주" or "2월"
  weeklyReflection?: {
    highlight?: string | null
    challenge?: string | null
    next_focus?: string | null
  } | null
  onSaveWeekly?: (data: { highlight?: string; challenge?: string; next_focus?: string }) => void
  isSavingWeekly?: boolean
  monthlyReflection?: {
    summary?: string | null
    highlight?: string | null
    challenge?: string | null
  } | null
  onSaveMonthly?: (data: { summary?: string; highlight?: string; challenge?: string }) => void
  isSavingMonthly?: boolean
  overviewStats?: OverviewStats
}

// ---- Local helpers -----------------------------------------------

function MiniStatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-secondary)] px-2.5 py-2 text-center">
      <p className="text-[10px] font-medium text-[var(--color-text-tertiary)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">{sub}</p>
    </div>
  )
}

// ---- Reflection field keys ----------------------------------------

type ReflectionKey = 'highlight' | 'challenge' | 'next_focus'

const REFLECTION_FIELDS: Array<{ key: ReflectionKey; promptIndex: number }> = [
  { key: 'highlight', promptIndex: 0 },
  { key: 'challenge', promptIndex: 1 },
  { key: 'next_focus', promptIndex: 2 },
]

// ---- Component ---------------------------------------------------

export function PeriodReflectionSection({
  isWeek,
  periodLabel,
  weeklyReflection,
  onSaveWeekly,
  isSavingWeekly = false,
  monthlyReflection,
  onSaveMonthly,
  isSavingMonthly = false,
  overviewStats,
}: PeriodReflectionSectionProps) {
  // Weekly local state
  const [weeklyValues, setWeeklyValues] = useState<Record<ReflectionKey, string>>({
    highlight: weeklyReflection?.highlight ?? '',
    challenge: weeklyReflection?.challenge ?? '',
    next_focus: weeklyReflection?.next_focus ?? '',
  })

  // Monthly local state
  const [monthlySummary, setMonthlySummary] = useState(monthlyReflection?.summary ?? '')
  const [monthlyHighlight, setMonthlyHighlight] = useState(monthlyReflection?.highlight ?? '')
  const [monthlyChallenge, setMonthlyChallenge] = useState(monthlyReflection?.challenge ?? '')

  // ---- Weekly handlers ----

  const handleWeeklyChange = useCallback((key: ReflectionKey, value: string) => {
    setWeeklyValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleWeeklyBlur = useCallback(() => {
    if (!onSaveWeekly) return

    const trimmed = {
      highlight: weeklyValues.highlight.trim() || undefined,
      challenge: weeklyValues.challenge.trim() || undefined,
      next_focus: weeklyValues.next_focus.trim() || undefined,
    }

    const hasContent = trimmed.highlight || trimmed.challenge || trimmed.next_focus
    const hasChanged =
      (trimmed.highlight ?? '') !== (weeklyReflection?.highlight ?? '') ||
      (trimmed.challenge ?? '') !== (weeklyReflection?.challenge ?? '') ||
      (trimmed.next_focus ?? '') !== (weeklyReflection?.next_focus ?? '')

    if (hasContent && hasChanged) {
      onSaveWeekly(trimmed)
    }
  }, [weeklyValues, weeklyReflection, onSaveWeekly])

  // ---- Monthly handlers ----

  const handleMonthlyBlur = useCallback(() => {
    if (!onSaveMonthly) return

    const trimmedSummary = monthlySummary.trim()
    const trimmedHighlight = monthlyHighlight.trim()
    const trimmedChallenge = monthlyChallenge.trim()

    const hasContent = trimmedSummary || trimmedHighlight || trimmedChallenge
    const hasChanged =
      trimmedSummary !== (monthlyReflection?.summary ?? '') ||
      trimmedHighlight !== (monthlyReflection?.highlight ?? '') ||
      trimmedChallenge !== (monthlyReflection?.challenge ?? '')

    if (hasContent && hasChanged) {
      onSaveMonthly({
        summary: trimmedSummary || undefined,
        highlight: trimmedHighlight || undefined,
        challenge: trimmedChallenge || undefined,
      })
    }
  }, [monthlySummary, monthlyHighlight, monthlyChallenge, monthlyReflection, onSaveMonthly])

  // ---- Textarea class ----

  const textareaClass = (isSaving: boolean) =>
    cn(
      'w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2',
      'text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
      'focus:border-[var(--color-primary-400)] focus:ring-1 focus:ring-[var(--color-primary-400)] focus:outline-none',
      'transition-colors',
      isSaving && 'opacity-60'
    )

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
          {periodLabel} 회고
        </h3>
      </div>

      {/* Mini summary cards */}
      {overviewStats && (
        <div className="mt-2 mb-3 grid grid-cols-3 gap-2">
          <MiniStatCard
            label="실천율"
            value={`${overviewStats.completionRate}%`}
            sub={`${overviewStats.activeDays}/${overviewStats.totalDays}일`}
          />
          <MiniStatCard
            label="평균 기분"
            value={overviewStats.avgMoodEmoji || '—'}
            sub={overviewStats.avgMoodLabel}
          />
          <MiniStatCard
            label="최장 스트릭"
            value={overviewStats.longestStreak > 0 ? `🔥${overviewStats.longestStreak}` : '—'}
            sub="연속일"
          />
        </div>
      )}

      {isWeek ? (
        /* Weekly: prompt as placeholder, compact grid on desktop */
        <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
          {REFLECTION_FIELDS.map(({ key, promptIndex }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
                {REFLECTION_PROMPTS.weekly[promptIndex]}
              </label>
              <textarea
                value={weeklyValues[key]}
                onChange={(e) => handleWeeklyChange(key, e.target.value)}
                onBlur={handleWeeklyBlur}
                placeholder="적어보세요..."
                disabled={isSavingWeekly}
                rows={2}
                className={textareaClass(isSavingWeekly)}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Monthly: 3 prompts matching weekly layout */
        <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
              {REFLECTION_PROMPTS.monthly[2]}
            </label>
            <textarea
              value={monthlyHighlight}
              onChange={(e) => setMonthlyHighlight(e.target.value)}
              onBlur={handleMonthlyBlur}
              placeholder="적어보세요..."
              disabled={isSavingMonthly}
              rows={2}
              className={textareaClass(isSavingMonthly)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
              {REFLECTION_PROMPTS.monthly[1]}
            </label>
            <textarea
              value={monthlyChallenge}
              onChange={(e) => setMonthlyChallenge(e.target.value)}
              onBlur={handleMonthlyBlur}
              placeholder="적어보세요..."
              disabled={isSavingMonthly}
              rows={2}
              className={textareaClass(isSavingMonthly)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
              {REFLECTION_PROMPTS.monthly[0]}
            </label>
            <textarea
              value={monthlySummary}
              onChange={(e) => setMonthlySummary(e.target.value)}
              onBlur={handleMonthlyBlur}
              placeholder="적어보세요..."
              disabled={isSavingMonthly}
              rows={2}
              className={textareaClass(isSavingMonthly)}
            />
          </div>
        </div>
      )}
    </motion.section>
  )
}
