'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { REFLECTION_PROMPTS } from '../../utils/generate-insight'
import { useWeeklyReflection, useSaveWeeklyReflection } from '../../hooks/use-weekly-reflection'
import { useMonthlyReflection, useSaveMonthlyReflection } from '../../hooks/use-monthly-reflection'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOOD_OPTIONS = [
  { mood: 'terrible', emoji: '😫' },
  { mood: 'bad', emoji: '😕' },
  { mood: 'neutral', emoji: '😐' },
  { mood: 'good', emoji: '🙂' },
  { mood: 'great', emoji: '😄' },
] as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface QuickReflectionProps {
  isWeek: boolean
  weekStart?: string
  monthStart?: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Inner components (split to satisfy hook rules)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function WeeklyReflectionInput({ weekStart, prompt }: { weekStart: string; prompt: string }) {
  const { data: weeklyReflection } = useWeeklyReflection(weekStart)
  const { mutate: saveWeekly } = useSaveWeeklyReflection(weekStart)

  // Derive initial value from server data; use key-based remount to reset
  const serverValue = weeklyReflection?.highlight ?? ''
  const [value, setValue] = useState(serverValue)
  const [lastSynced, setLastSynced] = useState(serverValue)

  // Sync when server data changes (without useEffect + setState)
  if (serverValue !== lastSynced) {
    setLastSynced(serverValue)
    setValue(serverValue)
  }

  const handleBlur = () => {
    const trimmed = value.trim()
    if (trimmed !== serverValue) {
      saveWeekly({ highlight: trimmed })
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder={prompt}
      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:ring-2 focus:ring-[var(--color-primary-400)] focus:outline-none"
    />
  )
}

function MonthlyReflectionInput({ monthStart, prompt }: { monthStart: string; prompt: string }) {
  const { data: monthlyReflection } = useMonthlyReflection(monthStart)
  const { mutate: saveMonthly } = useSaveMonthlyReflection(monthStart)

  const serverValue = monthlyReflection?.summary ?? ''
  const [value, setValue] = useState(serverValue)
  const [lastSynced, setLastSynced] = useState(serverValue)

  if (serverValue !== lastSynced) {
    setLastSynced(serverValue)
    setValue(serverValue)
  }

  const handleBlur = () => {
    const trimmed = value.trim()
    if (trimmed !== serverValue) {
      saveMonthly({ summary: trimmed })
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder={prompt}
      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:ring-2 focus:ring-[var(--color-primary-400)] focus:outline-none"
    />
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function QuickReflection({ isWeek, weekStart, monthStart }: QuickReflectionProps) {
  // Pick a stable prompt based on the period seed string
  const prompt = useMemo(() => {
    const prompts = isWeek ? REFLECTION_PROMPTS.weekly : REFLECTION_PROMPTS.monthly
    const seed = isWeek ? (weekStart ?? '') : (monthStart ?? '')
    // Stable index from seed string
    const index =
      seed.length > 0
        ? seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % prompts.length
        : 0
    return prompts[index]
  }, [isWeek, weekStart, monthStart])

  const canRender = isWeek ? !!weekStart : !!monthStart

  if (!canRender) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        한 줄 회고
      </span>

      <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
        {/* Reflection input */}
        {isWeek && weekStart ? (
          <WeeklyReflectionInput weekStart={weekStart} prompt={prompt} />
        ) : monthStart ? (
          <MonthlyReflectionInput monthStart={monthStart} prompt={prompt} />
        ) : null}

        {/* Mood emoji row (visual only — mood is per-day) */}
        <div className="flex justify-center gap-3">
          {MOOD_OPTIONS.map(({ mood, emoji }) => (
            <button
              key={mood}
              type="button"
              disabled
              aria-label={mood}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl opacity-40 transition-opacity hover:opacity-60"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
