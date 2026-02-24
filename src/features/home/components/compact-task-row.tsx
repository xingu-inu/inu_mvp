'use client'

import { useState, useRef, memo } from 'react'
import { format, addDays, isSameDay } from 'date-fns'
import {
  Check,
  SkipForward,
  Calendar1,
  Repeat,
  ChevronDown,
  Trash2,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { ParticleBurst } from '@/components/ui/animations/particle-burst'
import { Confetti } from '@/components/ui/animations/confetti'
import { InlineDeleteConfirm } from '@/features/roadmap/components/inline-forms/inline-delete-confirm'
import { InlineTaskEdit } from '@/features/roadmap/components/inline-forms/inline-task-edit'
import { ReadOnlyTaskDetail } from './inline-task-edit-home'
import { usePanelDateStore } from '@/stores/panel-date.store'
import { useCheckIn, useUndoCheckIn } from '@/queries/use-checkin'
import { useUpdateTask, useDeleteTask } from '@/queries/use-tasks'
import { useDirection } from '@/queries/use-direction'
import { useGoogleCalendarConnection } from '@/queries/use-google-calendar-connection'
import { cn } from '@/lib/utils'
import { generateAiComment } from '@/lib/utils/ai-comments'
import { isStreakMilestone } from '@/lib/constants/animations'
import type { HomeTask, CheckInStatus } from '@/types/entities'

interface CompactTaskRowProps {
  task: HomeTask
  isReadOnly?: boolean
  selectedDate: Date
  isExpanded?: boolean
  onToggle?: (taskId: string) => void
  priorityTier?: number
}

export const CompactTaskRow = memo(
  function CompactTaskRow({
    task,
    isReadOnly = false,
    selectedDate,
    isExpanded = false,
    onToggle,
    priorityTier,
  }: CompactTaskRowProps) {
    const [particleKey, setParticleKey] = useState(0)
    const [confettiKey, setConfettiKey] = useState(0)
    const [hasError, setHasError] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const rowRef = useRef<HTMLDivElement>(null)

    const { data: currentDirection } = useDirection()
    const checkIn = useCheckIn()
    const undoCheckIn = useUndoCheckIn()
    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()
    const { data: gcalConnection } = useGoogleCalendarConnection()
    const isGcalConnected = !!gcalConnection?.sync_enabled
    const status = task.todayCheckIn?.status

    // Tasks from past roadmap versions should not allow check-in actions
    const isPastVersion =
      task.directionVersion != null && task.directionVersion !== currentDirection?.version
    const effectiveReadOnly = isReadOnly || isPastVersion

    const canUndo = status && task.todayCheckIn?.id !== 'optimistic' && !effectiveReadOnly

    const isCompletedOnce = task.taskStatus === 'completed' && task.repeat_type === 'once'

    // Group/Goal 맥락 서브텍스트 + 스트릭 (inu "맥락 제공" 원칙)
    const contextText = [task.group?.name, task.goal?.name].filter(Boolean).join(' · ') || null
    const hasStreak = task.streak_count > 0
    const showSubtitle = contextText || hasStreak
    const isStreakAtRisk = !status && task.streak_count >= 3 && new Date().getHours() >= 18

    const isTimePassed = (() => {
      if (status || effectiveReadOnly) return false
      if (!isSameDay(selectedDate, new Date())) return false
      if (task.time_slot === 'anytime') return false
      const now = new Date().getHours()
      const slotEndHours: Record<string, number> = {
        dawn: 6,
        morning: 12,
        afternoon: 18,
        evening: 24,
      }
      const endHour = slotEndHours[task.time_slot]
      return endHour != null && now >= endHour
    })()

    const handleCheckIn = (newStatus: CheckInStatus) => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      checkIn.mutate(
        {
          task_id: task.id,
          date: dateStr,
          status: newStatus,
        },
        {
          onSuccess: () => {
            if (newStatus === 'done') {
              setParticleKey((k) => k + 1)
              const newStreak = task.streak_count + 1
              const newTotal = task.total_completed + 1
              if (isStreakMilestone(newStreak)) {
                setConfettiKey((k) => k + 1)
              }
              toast.success(generateAiComment(newStreak, newTotal), { duration: 3000 })
            }
          },
          onError: () => {
            setHasError(true)
            setTimeout(() => setHasError(false), 500)
          },
        }
      )
    }

    const handleRowClick = () => {
      onToggle?.(task.id)
    }

    const handlePostpone = () => {
      const tomorrowDate = addDays(selectedDate, 1)
      const tomorrow = format(tomorrowDate, 'yyyy-MM-dd')
      const dateLabel = format(tomorrowDate, 'M월 d일')
      updateTask.mutate(
        { id: task.id, input: { scheduled_date: tomorrow } },
        {
          onSuccess: () =>
            toast.success('내일로 미뤘어요', {
              action: {
                label: `${dateLabel} 보기`,
                onClick: () => usePanelDateStore.getState().setSelectedDate(tomorrowDate),
              },
            }),
        }
      )
    }

    return (
      <div ref={rowRef} data-task-id={task.id}>
        {/* Main row (clickable to toggle) */}
        <div
          role="article"
          aria-label={`${task.name}${status === 'done' ? ' 완료됨' : status === 'skip' ? ' 건너뜀' : ''}`}
          data-testid="compact-task-row"
          data-status={status || 'pending'}
          className={cn(
            'group/row relative flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
            !status && !isExpanded && !isStreakAtRisk && 'hover:bg-[var(--color-bg-secondary)]',
            status === 'done' && 'bg-[var(--color-done-bg)]',
            status === 'skip' && 'bg-[var(--color-skip-bg)]',
            hasError && 'animate-shake',
            isReadOnly && 'opacity-70',
            isExpanded && !status && 'bg-[var(--color-bg-secondary)]',
            isStreakAtRisk &&
              'bg-[var(--color-streak-bg)]/30 ring-1 ring-[var(--color-streak-ring)]'
          )}
        >
          {/* Particle Animation */}
          <div className="pointer-events-none absolute top-1/2 left-1/2">
            <ParticleBurst animationKey={particleKey} />
          </div>
          <Confetti animationKey={confettiKey} />

          {/* Checkbox (done) / status indicator */}
          {!effectiveReadOnly && !status && (
            <button
              onClick={() => handleCheckIn('done')}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`${task.name} 완료`}
              disabled={checkIn.isPending}
              className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 border-[var(--color-border)] transition-colors before:absolute before:-inset-3 before:content-[''] hover:border-[var(--color-done)] hover:bg-[var(--color-done-bg)] disabled:opacity-50"
            >
              <Check className="h-3 w-3 text-transparent" aria-hidden="true" />
            </button>
          )}
          {status === 'done' && (
            <button
              onClick={
                canUndo
                  ? () =>
                      undoCheckIn.mutate({
                        checkInId: task.todayCheckIn!.id!,
                        taskId: task.id,
                        date: format(selectedDate, 'yyyy-MM-dd'),
                      })
                  : undefined
              }
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!canUndo || undoCheckIn.isPending}
              aria-label={canUndo ? '달성 취소' : '완료됨'}
              className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[var(--color-done)] text-white transition-colors before:absolute before:-inset-3 before:content-[''] disabled:opacity-70"
            >
              <Check className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          {status === 'skip' && (
            <button
              onClick={
                canUndo
                  ? () =>
                      undoCheckIn.mutate({
                        checkInId: task.todayCheckIn!.id!,
                        taskId: task.id,
                        date: format(selectedDate, 'yyyy-MM-dd'),
                      })
                  : undefined
              }
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!canUndo || undoCheckIn.isPending}
              aria-label={canUndo ? '달성 취소' : '건너뜀'}
              className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[var(--color-skip)] text-white transition-colors before:absolute before:-inset-3 before:content-[''] disabled:opacity-70"
            >
              <SkipForward className="h-3 w-3" aria-hidden="true" />
            </button>
          )}

          {/* Task name + context subtitle (clickable to toggle) */}
          <div
            className={cn(
              'min-w-0 flex-1',
              onToggle && 'cursor-pointer',
              isCompletedOnce && 'opacity-50'
            )}
            onClick={handleRowClick}
          >
            <span
              className={cn(
                'flex items-center gap-1 truncate text-sm font-medium text-[var(--color-text-primary)]',
                (status === 'done' || isCompletedOnce) && 'line-through opacity-60',
                status === 'skip' && 'opacity-60'
              )}
            >
              {/* Once vs Repeat icon */}
              {task.repeat_type === 'once' ? (
                <Calendar1
                  className={cn(
                    'h-3.5 w-3.5 flex-shrink-0',
                    isTimePassed
                      ? 'text-[var(--color-text-disabled)]'
                      : 'text-[var(--color-text-tertiary)]'
                  )}
                  aria-hidden="true"
                />
              ) : (
                <Repeat
                  className={cn(
                    'h-3.5 w-3.5 flex-shrink-0',
                    isTimePassed
                      ? 'text-[var(--color-text-disabled)]'
                      : 'text-[var(--color-text-tertiary)]'
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{task.name}</span>
              {priorityTier === 1 && (
                <span className="flex-shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:bg-orange-900/50 dark:text-orange-300">
                  🔥
                </span>
              )}
            </span>
            {showSubtitle && !isExpanded && (
              <span
                className={cn(
                  'block truncate pl-[18px] text-[11px] leading-tight text-[var(--color-text-tertiary)]',
                  (status === 'done' || isCompletedOnce) && 'line-through opacity-60',
                  status === 'skip' && 'opacity-60'
                )}
              >
                {contextText}
                {hasStreak && (
                  <span
                    className={cn(
                      'text-[var(--color-streak)]',
                      isStreakAtRisk && 'animate-pulse text-[var(--color-streak-high)]',
                      particleKey > 0 && 'animate-streak-pop'
                    )}
                  >
                    {contextText ? ' · ' : ''}🔥{task.streak_count}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Skip button (repeating only, pending) */}
          {!status && !effectiveReadOnly && task.repeat_type !== 'once' && (
            <button
              onClick={() => handleCheckIn('skip')}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`${task.name} 건너뛰기`}
              disabled={checkIn.isPending}
              className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-all before:absolute before:-inset-[9px] before:content-[''] hover:bg-[var(--color-skip)] hover:text-white disabled:opacity-50"
            >
              <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Postpone button (once tasks only, pending, today only) */}
          {!status && !effectiveReadOnly && task.repeat_type === 'once' && !isCompletedOnce && (
            <button
              onClick={handlePostpone}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`${task.name} 내일로 미루기`}
              disabled={updateTask.isPending}
              className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-all before:absolute before:-inset-[9px] before:content-[''] hover:bg-[var(--color-text-tertiary)] hover:text-white disabled:opacity-50"
            >
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Delete button (hover visible on desktop) */}
          {!effectiveReadOnly && !isCompletedOnce && (
            <button
              onClick={() => setIsDeleting(true)}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`${task.name} 삭제`}
              className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-all before:absolute before:-inset-[9px] before:content-[''] hover:bg-[var(--color-miss)] hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Read-only checkbox placeholder */}
          {effectiveReadOnly && !status && (
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 border-[var(--color-border)] opacity-40">
              <Check className="h-3 w-3 text-transparent" />
            </span>
          )}

          {/* Expand indicator (clickable to toggle) */}
          {onToggle && (
            <button
              onClick={handleRowClick}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={isExpanded ? '접기' : '펼치기'}
              className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-all before:absolute before:-inset-[9px] before:content-[''] hover:bg-[var(--color-text-tertiary)] hover:text-white"
            >
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
          )}

          {/* Screen reader status announcements */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {status === 'done' && `${task.name} 완료! ${task.streak_count + 1}일 연속입니다.`}
            {status === 'skip' && `${task.name}을 건너뛰었습니다.`}
          </div>
        </div>

        {/* Inline detail section (accordion) */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {effectiveReadOnly ? (
                <ReadOnlyTaskDetail task={task} />
              ) : (
                <InlineTaskEdit task={task} onDone={() => onToggle?.(task.id)} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline Delete Confirm */}
        <AnimatePresence>
          {isDeleting && (
            <InlineDeleteConfirm
              title={`"${task.name}" 삭제할까요?`}
              description={
                isGcalConnected
                  ? '삭제하면 기록과 Google Calendar 일정도 함께 사라져요'
                  : '삭제하면 기록도 함께 사라져요'
              }
              onCancel={() => setIsDeleting(false)}
              onConfirm={() => deleteTask.mutate(task.id)}
              isLoading={deleteTask.isPending}
              alternativeAction={{
                label: '일시 정지',
                onAction: () => {
                  updateTask.mutate(
                    { id: task.id, input: { status: 'paused' } },
                    { onSuccess: () => setIsDeleting(false) }
                  )
                },
                isLoading: updateTask.isPending,
              }}
            />
          )}
        </AnimatePresence>
      </div>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.name === nextProps.task.name &&
      prevProps.task.todayCheckIn?.id === nextProps.task.todayCheckIn?.id &&
      prevProps.task.todayCheckIn?.status === nextProps.task.todayCheckIn?.status &&
      prevProps.task.streak_count === nextProps.task.streak_count &&
      prevProps.task.taskStatus === nextProps.task.taskStatus &&
      prevProps.task.group?.name === nextProps.task.group?.name &&
      prevProps.task.goal?.name === nextProps.task.goal?.name &&
      prevProps.task.directionVersion === nextProps.task.directionVersion &&
      prevProps.isReadOnly === nextProps.isReadOnly &&
      prevProps.selectedDate.getTime() === nextProps.selectedDate.getTime() &&
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.priorityTier === nextProps.priorityTier
    )
  }
)
