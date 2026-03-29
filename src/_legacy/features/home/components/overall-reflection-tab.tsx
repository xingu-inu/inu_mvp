'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MoodLevel } from '@/types/entities'

interface OverallReflectionTabProps {
  summary: string
  isDirty: boolean
  isSaving: boolean
  hasSaved: boolean
  selectedMood: MoodLevel | null
  isViewingToday: boolean
  onSummaryChange: (value: string) => void
  onSave: () => void
}

export function OverallReflectionTab({
  summary,
  isDirty,
  isSaving,
  hasSaved,
  selectedMood,
  isViewingToday,
  onSummaryChange,
  onSave,
}: OverallReflectionTabProps) {
  return (
    <div className="space-y-3">
      {/* Summary Input */}
      <div className="space-y-2">
        <label htmlFor="daily-summary" className="text-xs text-[var(--color-text-tertiary)]">
          한 줄 메모 (선택)
        </label>
        <input
          id="daily-summary"
          type="text"
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          placeholder={
            isViewingToday ? '오늘 하루를 한 줄로 정리해보세요' : '이 날을 한 줄로 정리해보세요'
          }
          disabled={isSaving}
          maxLength={200}
          className={cn(
            'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2',
            'text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
            'transition-colors focus:outline-none',
            isSaving && 'cursor-not-allowed opacity-50'
          )}
        />
      </div>

      {/* Save Button */}
      {(isDirty || (selectedMood && !hasSaved) || (summary.trim() && !hasSaved)) && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onSave}
          disabled={isSaving || (!selectedMood && !summary.trim())}
          className="gap-1.5 text-[var(--color-primary-600)]"
        >
          저장하기
        </Button>
      )}
    </div>
  )
}
