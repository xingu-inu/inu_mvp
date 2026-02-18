'use client'

import { Check, SkipForward, CheckCircle, Calendar1, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shouldUseWhiteText } from '@/lib/utils/color'
import type { HomeTask } from '@/types/entities'

interface WeekTaskBlockProps {
  task: HomeTask
  onClick?: () => void
  /** Absolute positioning style (from layout algorithm) */
  positionStyle?: {
    top: number
    height: number
    left: string
    width: string
  }
}

const COMPACT_THRESHOLD = 40

/**
 * Format "HH:MM" to display like "9:30 AM"
 */
function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Compute end time from start + duration in minutes.
 */
function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const totalMin = h * 60 + m + durationMinutes
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

/**
 * Google Calendar–style event block for the week grid.
 *
 * Three rendering modes:
 * 1. Full Block (positionStyle + height >= 40px): Solid color fill + white text
 * 2. Chip (positionStyle + height < 40px): Colored dot + dark text
 * 3. Anytime Chip (no positionStyle): Same as chip
 */
export function WeekTaskBlock({ task, onClick, positionStyle }: WeekTaskBlockProps) {
  const status = task.todayCheckIn?.status
  const areaColor = task.goal?.area?.color ?? '#64748b'
  const areaEmoji = task.goal?.area?.emoji
  const isCompact = positionStyle ? positionStyle.height < COMPACT_THRESHOLD : true
  const isFullBlock = !!positionStyle && !isCompact
  const useWhiteText = shouldUseWhiteText(areaColor)
  const isCompletedOnce = task.taskStatus === 'completed' && task.repeat_type === 'once'

  // Time range for full blocks
  let timeDisplay: string | null = null
  if (isFullBlock && task.specific_time) {
    const startFormatted = formatTime(task.specific_time)
    if (task.duration_minutes > 0) {
      const endTime = computeEndTime(task.specific_time, task.duration_minutes)
      timeDisplay = `${startFormatted} – ${endTime ? formatTime(endTime) : ''}`
    } else {
      timeDisplay = startFormatted
    }
  }

  // --- FULL BLOCK: Area accent bar + shadow + rounded-lg ---
  if (isFullBlock) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'absolute flex w-full flex-col overflow-hidden rounded-lg px-2.5 py-1.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.1)] transition-all',
          'hover:shadow-md hover:brightness-105',
          status === 'done' && 'opacity-65',
          status === 'skip' && 'opacity-55',
          isCompletedOnce && 'opacity-50'
        )}
        style={{
          backgroundColor: `${areaColor}CC`,
          borderLeft: `3px solid ${areaColor}`,
          top: `${positionStyle.top}px`,
          height: `${positionStyle.height}px`,
          left: positionStyle.left,
          width: positionStyle.width,
          color: useWhiteText ? 'white' : 'var(--color-text-primary)',
        }}
      >
        {/* Area emoji + Task name */}
        <span
          className={cn(
            'flex items-center gap-1 truncate text-sm leading-snug font-semibold',
            (status === 'done' || isCompletedOnce) && 'line-through'
          )}
        >
          {isCompletedOnce ? (
            <CheckCircle className="h-3 w-3 flex-shrink-0" />
          ) : areaEmoji && positionStyle.height >= 52 ? (
            <span className="flex-shrink-0 text-xs">{areaEmoji}</span>
          ) : null}
          {task.repeat_type === 'once' ? (
            <Calendar1 className="h-3 w-3 flex-shrink-0 opacity-70" />
          ) : (
            <Repeat className="h-3 w-3 flex-shrink-0 opacity-70" />
          )}
          <span className="truncate">{task.name}</span>
        </span>

        {timeDisplay && positionStyle.height >= 52 && (
          <span
            className="mt-0.5 truncate text-xs leading-tight"
            style={{ opacity: useWhiteText ? 0.85 : 0.7 }}
          >
            {timeDisplay}
          </span>
        )}

        {/* Cross-linked area dots */}
        {task.relatedAreas && task.relatedAreas.length > 0 && positionStyle.height >= 52 && (
          <span className="mt-auto flex items-center gap-1">
            {task.relatedAreas.map((area) => (
              <span
                key={area.id}
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: useWhiteText ? 'rgba(255,255,255,0.6)' : area.color,
                }}
                aria-hidden="true"
              />
            ))}
          </span>
        )}

        {status === 'done' && (
          <div
            className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full"
            style={{
              backgroundColor: useWhiteText ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)',
            }}
          >
            <Check className="h-2.5 w-2.5" />
          </div>
        )}
        {status === 'skip' && (
          <div
            className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full"
            style={{
              backgroundColor: useWhiteText ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)',
            }}
          >
            <SkipForward className="h-2.5 w-2.5" />
          </div>
        )}
      </button>
    )
  }

  // --- CHIP MODE: colored dot + dark text ---
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1.5 overflow-hidden rounded px-1.5 py-0.5 text-left transition-colors',
        'hover:bg-[var(--color-bg-secondary)]',
        status === 'done' && 'opacity-60',
        status === 'skip' && 'opacity-50',
        isCompletedOnce && 'opacity-50',
        positionStyle ? 'absolute' : 'relative'
      )}
      style={
        positionStyle
          ? {
              top: `${positionStyle.top}px`,
              height: `${positionStyle.height}px`,
              left: positionStyle.left,
              width: positionStyle.width,
            }
          : undefined
      }
    >
      <div
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: areaColor }}
      />
      {task.repeat_type === 'once' ? (
        <Calendar1 className="h-2.5 w-2.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      ) : (
        <Repeat className="h-2.5 w-2.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      )}
      <span
        className={cn(
          'truncate text-xs font-medium text-[var(--color-text-primary)]',
          (status === 'done' || isCompletedOnce) && 'line-through'
        )}
      >
        {task.name}
      </span>
      {isCompletedOnce ? (
        <CheckCircle className="h-2.5 w-2.5 flex-shrink-0 text-[var(--color-done)]" />
      ) : status === 'done' ? (
        <Check className="h-2.5 w-2.5 flex-shrink-0 text-[var(--color-done)]" />
      ) : null}
    </button>
  )
}
