'use client'

import { useState, useCallback } from 'react'
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
  } | null
  onSaveMonthly?: (data: { summary: string }) => void
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

    const trimmed = monthlySummary.trim()
    const hasChanged = trimmed !== (monthlyReflection?.summary ?? '')

    if (trimmed && hasChanged) {
      onSaveMonthly({ summary: trimmed })
    }
  }, [monthlySummary, monthlyReflection?.summary, onSaveMonthly])

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
        /* Monthly: single textarea */
        <div className="mt-3 flex flex-col gap-1">
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
      )}
    </motion.section>
  )
}
