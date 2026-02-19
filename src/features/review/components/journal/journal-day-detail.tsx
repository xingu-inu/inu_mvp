'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Check, SkipForward, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/ui/badge'
import { VersionBadge } from '@/features/home/components/version-badge'
import { useHomeTasks } from '@/queries/use-home'
import { useReflection } from '@/queries/use-reflection'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { MOOD_EMOJIS, MOOD_LABELS } from '../../utils/review-utils'
import { parseCheckInNote } from '@/lib/utils/checkin-note'
import { generateDayNarrative } from '../../utils/generate-insight'
import { GrowthMessageCard } from '../growth-message-card'
import type { HomeTask, TimeSlot, CheckInStatus, MoodLevel } from '@/types/entities'

// Status priority for sorting: done first, then skip, then miss, then pending
const STATUS_ORDER: Record<string, number> = {
  done: 0,
  skip: 1,
  miss: 2,
  pending: 3,
}

// Time slot order for secondary sorting
const SLOT_ORDER: Record<TimeSlot, number> = {
  dawn: 0,
  morning: 1,
  afternoon: 2,
  evening: 3,
  anytime: 4,
}

function getTaskStatus(task: HomeTask): CheckInStatus | 'pending' {
  return task.todayCheckIn?.status ?? 'pending'
}

interface JournalDayDetailProps {
  dateStr: string
}

export function JournalDayDetail({ dateStr }: JournalDayDetailProps) {
  const dateObj = useMemo(() => parseISO(dateStr), [dateStr])
  const dateLabel = format(dateObj, 'M월 d일 EEEE', { locale: ko })

  const { data: apiTasks = [], isLoading: tasksLoading } = useHomeTasks(dateObj)
  const { data: reflection } = useReflection(dateStr)

  const tasks = useMemo(() => mapApiTasksToEntities(apiTasks), [apiTasks])
  const directionVersion = tasks[0]?.directionVersion ?? null

  // Sort: done first, then skip, then miss, then pending. Secondary: time slot
  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const statusA = STATUS_ORDER[getTaskStatus(a)] ?? 3
        const statusB = STATUS_ORDER[getTaskStatus(b)] ?? 3
        if (statusA !== statusB) return statusA - statusB
        const slotA = SLOT_ORDER[a.time_slot as TimeSlot] ?? 4
        const slotB = SLOT_ORDER[b.time_slot as TimeSlot] ?? 4
        return slotA - slotB
      }),
    [tasks]
  )

  const completed = tasks.filter((t) => t.todayCheckIn?.status === 'done').length
  const total = tasks.length

  // Group tasks by area
  const tasksByArea = useMemo(() => {
    const groups = new Map<
      string,
      { area: { id: string; name: string; emoji: string; color: string }; tasks: HomeTask[] }
    >()

    for (const task of sortedTasks) {
      const area = task.goal?.area ?? task.directArea
      const key = area?.id ?? '__none__'
      if (!groups.has(key)) {
        groups.set(key, {
          area: area ?? { id: '__none__', name: '기타', emoji: '📌', color: '#9ca3af' },
          tasks: [],
        })
      }
      groups.get(key)!.tasks.push(task)
    }

    return Array.from(groups.values())
  }, [sortedTasks])

  if (tasksLoading) {
    return <DetailSkeleton />
  }

  return (
    <motion.div
      key={dateStr}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-4"
    >
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{dateLabel}</h3>
          <VersionBadge version={directionVersion} />
        </div>
        {total > 0 && (
          <span className="text-xs font-medium text-[var(--color-text-tertiary)]">
            {completed}/{total} 완료
          </span>
        )}
      </div>

      {/* Mood Hero */}
      <MoodHero
        mood={(reflection?.mood as MoodLevel | null) ?? null}
        summary={reflection?.summary ?? null}
      />

      {/* Task Records — grouped by area */}
      {sortedTasks.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            이 날의 기록
          </p>
          <div className="space-y-4">
            {tasksByArea.map(({ area, tasks: areaTasks }) => (
              <div key={area.id} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{area.emoji}</span>
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {area.name}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {areaTasks.map((task) => (
                    <DetailTaskRow key={task.id} task={task} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state for no tasks */}
      {total === 0 && (
        <div className="rounded-lg bg-[var(--color-bg-secondary)] p-4 text-center">
          <p className="text-sm text-[var(--color-text-tertiary)]">이 날은 예정된 할 일이 없어요</p>
        </div>
      )}

      {/* Growth message */}
      {total > 0 && <GrowthMessageCard message={generateDayNarrative(completed, total)} />}
    </motion.div>
  )
}

// ────────────────────────────────────────────
// Mood Hero
// ────────────────────────────────────────────

function MoodHero({ mood, summary }: { mood: MoodLevel | null; summary: string | null }) {
  if (!mood && !summary) {
    return (
      <div className="flex flex-col items-center gap-2 py-3 text-center">
        <span className="text-3xl">📝</span>
        <p className="text-sm text-[var(--color-text-tertiary)]">기분을 기록해보세요</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 py-3 text-center">
      {mood && (
        <>
          <span className="text-4xl">{MOOD_EMOJIS[mood]}</span>
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {MOOD_LABELS[mood]}
          </span>
        </>
      )}
      {summary && (
        <p className="mt-1 max-w-[280px] text-sm leading-relaxed text-[var(--color-text-secondary)] italic">
          &ldquo;{summary}&rdquo;
        </p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────
// Task Row
// ────────────────────────────────────────────

function DetailTaskRow({ task }: { task: HomeTask }) {
  const status = getTaskStatus(task)
  const area = task.goal?.area ?? task.directArea
  const noteData = parseCheckInNote(task.todayCheckIn?.note ?? null)

  return (
    <div
      className={cn(
        'rounded-lg p-3',
        status === 'done' && 'bg-[var(--color-done)]/5',
        status === 'skip' && 'bg-[var(--color-bg-secondary)]',
        (status === 'miss' || status === 'pending') && 'bg-[var(--color-bg-secondary)]'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <StatusIcon status={status} />
          {area && <span className="shrink-0 text-sm">{area.emoji}</span>}
          <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {task.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {task.streak_count > 0 && <StreakBadge count={task.streak_count} />}
          {status === 'skip' && (
            <span className="text-[10px] text-[var(--color-text-tertiary)]">건너뜀</span>
          )}
        </div>
      </div>
      {(noteData.text || noteData.mood) && (
        <div className="mt-1.5 flex items-start gap-1.5 pl-7">
          {noteData.mood && <span className="shrink-0 text-xs">{MOOD_EMOJIS[noteData.mood]}</span>}
          {noteData.text && (
            <p className="text-xs leading-relaxed text-[var(--color-text-tertiary)] italic">
              {noteData.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────
// Status Icon
// ────────────────────────────────────────────

function StatusIcon({ status }: { status: CheckInStatus | 'pending' }) {
  switch (status) {
    case 'done':
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-done)] text-white">
          <Check className="h-3 w-3" />
        </div>
      )
    case 'skip':
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-skip)] text-white">
          <SkipForward className="h-3 w-3" />
        </div>
      )
    case 'miss':
      return (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
          <Minus className="h-3 w-3 text-[var(--color-text-tertiary)]" />
        </div>
      )
    default:
      return (
        <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[var(--color-bg-tertiary)]" />
      )
  }
}

// ────────────────────────────────────────────
// Loading Skeleton
// ────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-bg-secondary)]" />
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--color-bg-secondary)]" />
        <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-bg-secondary)]" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-secondary)]" />
      ))}
    </div>
  )
}
