'use client'

import { useState, useCallback, useMemo } from 'react'
import { PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MoodLevel } from '@/types/entities'
import { useGoalReflection, useSaveGoalReflection, useReviewPeriod } from '../../hooks'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOOD_OPTIONS: { value: MoodLevel; emoji: string; label: string }[] = [
  { value: 'terrible', emoji: '😫', label: '힘들었어요' },
  { value: 'bad', emoji: '😕', label: '아쉬워요' },
  { value: 'neutral', emoji: '😐', label: '보통이에요' },
  { value: 'good', emoji: '🙂', label: '괜찮았어요' },
  { value: 'great', emoji: '😄', label: '최고였어요' },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function GoalReflectionSection({ goalId }: { goalId: string }) {
  const { startDate, endDate } = useReviewPeriod()
  const { data: reflection } = useGoalReflection(goalId, startDate, endDate)
  const { mutate: save, isPending } = useSaveGoalReflection(goalId, startDate, endDate)

  const [summary, setSummary] = useState('')
  const [feeling, setFeeling] = useState<MoodLevel | null>(null)
  const [nextFocus, setNextFocus] = useState('')
  const [syncedId, setSyncedId] = useState<string | null>(null)

  // 서버 데이터 로드 시 로컬 상태 동기화 (React 권장: render 중 상태 조정)
  if (reflection?.id && reflection.id !== syncedId) {
    setSyncedId(reflection.id)
    setSummary(reflection.summary ?? '')
    setFeeling((reflection.progress_feeling as MoodLevel | null) ?? null)
    setNextFocus(reflection.next_focus ?? '')
  }

  // Dirty state: 로컬 값과 서버 값 비교
  const isDirty = useMemo(() => {
    const serverSummary = reflection?.summary ?? ''
    const serverFeeling = (reflection?.progress_feeling as MoodLevel | null) ?? null
    const serverNextFocus = reflection?.next_focus ?? ''

    return (
      summary.trim() !== serverSummary ||
      feeling !== serverFeeling ||
      nextFocus.trim() !== serverNextFocus
    )
  }, [summary, feeling, nextFocus, reflection])

  const handleSave = useCallback(() => {
    const trimmedSummary = summary.trim()
    const trimmedNextFocus = nextFocus.trim()
    const hasContent = trimmedSummary || feeling || trimmedNextFocus
    if (!hasContent) return

    save({
      summary: trimmedSummary || undefined,
      progress_feeling: feeling || undefined,
      next_focus: trimmedNextFocus || undefined,
    })
  }, [summary, feeling, nextFocus, save])

  const textareaClass = cn(
    'w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2',
    'text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
    'focus:border-[var(--color-primary-400)] focus:ring-1 focus:ring-[var(--color-primary-400)] focus:outline-none',
    'transition-colors',
    isPending && 'opacity-60'
  )

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      <div className="flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <h4 className="text-xs font-semibold tracking-wider text-[var(--color-text-primary)] uppercase">
          목표 회고
        </h4>
      </div>

      {/* 진행 느낌 */}
      <div className="mt-3">
        <label className="text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          이 목표의 진행 느낌은?
        </label>
        <div className="mt-1.5 flex gap-2">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFeeling(opt.value)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-center transition-colors',
                feeling === opt.value
                  ? 'bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-400)]'
                  : 'hover:bg-[var(--color-bg-secondary)]'
              )}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-[11px] text-[var(--color-text-tertiary)]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 요약 */}
      <div className="mt-3 flex flex-col gap-1">
        <label className="text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          이 목표에서 가장 인상 깊었던 점은?
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="적어보세요..."
          disabled={isPending}
          rows={2}
          className={textareaClass}
        />
      </div>

      {/* 다음 집중 */}
      <div className="mt-2 flex flex-col gap-1">
        <label className="text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          다음 기간에 집중하고 싶은 것은?
        </label>
        <textarea
          value={nextFocus}
          onChange={(e) => setNextFocus(e.target.value)}
          placeholder="적어보세요..."
          disabled={isPending}
          rows={2}
          className={textareaClass}
        />
      </div>

      {/* 저장 버튼 */}
      <div className="mt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isPending}
          className={cn(
            'w-full rounded-lg py-2 text-sm font-medium transition-colors',
            isDirty && !isPending
              ? 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]'
              : 'cursor-not-allowed bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
          )}
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
