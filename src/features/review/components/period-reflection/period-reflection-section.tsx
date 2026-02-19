'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REFLECTION_PROMPTS } from '../../utils/generate-insight'

// ---- Types -------------------------------------------------------

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

  const hasWeeklyChanges = useMemo(() => {
    return (
      weeklyValues.highlight.trim() !== (weeklyReflection?.highlight ?? '') ||
      weeklyValues.challenge.trim() !== (weeklyReflection?.challenge ?? '') ||
      weeklyValues.next_focus.trim() !== (weeklyReflection?.next_focus ?? '')
    )
  }, [weeklyValues, weeklyReflection])

  const handleWeeklySave = useCallback(() => {
    if (!onSaveWeekly) return

    const trimmed = {
      highlight: weeklyValues.highlight.trim() || undefined,
      challenge: weeklyValues.challenge.trim() || undefined,
      next_focus: weeklyValues.next_focus.trim() || undefined,
    }

    onSaveWeekly(trimmed)
  }, [weeklyValues, onSaveWeekly])

  // ---- Monthly handlers ----

  const hasMonthlyChanges = useMemo(() => {
    return (
      monthlySummary.trim() !== (monthlyReflection?.summary ?? '') ||
      monthlyHighlight.trim() !== (monthlyReflection?.highlight ?? '') ||
      monthlyChallenge.trim() !== (monthlyReflection?.challenge ?? '')
    )
  }, [monthlySummary, monthlyHighlight, monthlyChallenge, monthlyReflection])

  const handleMonthlySave = useCallback(() => {
    if (!onSaveMonthly) return

    onSaveMonthly({
      summary: monthlySummary.trim() || undefined,
      highlight: monthlyHighlight.trim() || undefined,
      challenge: monthlyChallenge.trim() || undefined,
    })
  }, [monthlySummary, monthlyHighlight, monthlyChallenge, onSaveMonthly])

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

      {isWeek ? (
        /* Weekly: prompt as placeholder, compact grid on desktop */
        <>
          <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
            {REFLECTION_FIELDS.map(({ key, promptIndex }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
                  {REFLECTION_PROMPTS.weekly[promptIndex]}
                </label>
                <textarea
                  value={weeklyValues[key]}
                  onChange={(e) => handleWeeklyChange(key, e.target.value)}
                  placeholder="적어보세요..."
                  disabled={isSavingWeekly}
                  rows={2}
                  className={textareaClass(isSavingWeekly)}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleWeeklySave}
              disabled={!hasWeeklyChanges || isSavingWeekly}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                hasWeeklyChanges && !isSavingWeekly
                  ? 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]'
                  : 'cursor-not-allowed bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
              )}
            >
              {isSavingWeekly ? '저장 중...' : '저장'}
            </button>
          </div>
        </>
      ) : (
        /* Monthly: 3 prompts matching weekly layout */
        <>
          <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
                {REFLECTION_PROMPTS.monthly[2]}
              </label>
              <textarea
                value={monthlyHighlight}
                onChange={(e) => setMonthlyHighlight(e.target.value)}
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
                placeholder="적어보세요..."
                disabled={isSavingMonthly}
                rows={2}
                className={textareaClass(isSavingMonthly)}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleMonthlySave}
              disabled={!hasMonthlyChanges || isSavingMonthly}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                hasMonthlyChanges && !isSavingMonthly
                  ? 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]'
                  : 'cursor-not-allowed bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
              )}
            >
              {isSavingMonthly ? '저장 중...' : '저장'}
            </button>
          </div>
        </>
      )}
    </motion.section>
  )
}
