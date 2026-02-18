'use client'

import { Chip } from '@/components/ui/chip'
import { MoodSelector } from './mood-selector'
import { cn } from '@/lib/utils'
import type { MoodLevel, HomeTask } from '@/types/entities'
import type { CheckInNoteData } from '@/lib/utils/checkin-note'

interface PerTaskReflectionRowProps {
  task: HomeTask
  noteData: CheckInNoteData
  onChange: (taskId: string, data: CheckInNoteData) => void
  disabled?: boolean
}

export function PerTaskReflectionRow({
  task,
  noteData,
  onChange,
  disabled = false,
}: PerTaskReflectionRowProps) {
  const handleMoodChange = (mood: MoodLevel) => {
    onChange(task.id, { ...noteData, mood })
  }

  const handleTextChange = (text: string) => {
    onChange(task.id, { ...noteData, text: text || undefined })
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {/* Task name + area */}
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
          {task.name}
        </span>
        {task.goal?.area && (
          <Chip
            variant="area"
            emoji={task.goal.area.emoji}
            color={task.goal.area.color}
            className="shrink-0 text-xs"
          >
            {task.goal.area.name}
          </Chip>
        )}
      </div>

      {/* Per-task mood */}
      <MoodSelector
        value={noteData.mood ?? null}
        onChange={handleMoodChange}
        disabled={disabled}
        size="xs"
        hideLabel
      />

      {/* Per-task note */}
      <input
        type="text"
        value={noteData.text ?? ''}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="이 활동은 어떠셨나요?"
        disabled={disabled}
        maxLength={200}
        className={cn(
          'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-1.5',
          'text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
          'transition-colors focus:outline-none',
          disabled && 'cursor-not-allowed'
        )}
      />
    </div>
  )
}
