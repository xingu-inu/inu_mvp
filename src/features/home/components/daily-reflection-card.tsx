'use client'

import { useState, useCallback, useRef } from 'react'
import { format, isToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Check, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Mascot } from '@/components/common/mascot'
import { MoodSelector } from './mood-selector'
import { OverallReflectionTab } from './overall-reflection-tab'
import { PerTaskReflectionTab } from './per-task-reflection-tab'
import { useReflection, useCreateReflection, useDeleteReflection } from '@/queries/use-reflection'
import { calculateTaskStats } from '@/lib/utils/task-utils'
import { cn } from '@/lib/utils'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { MoodLevel, HomeTask, DailyReflection } from '@/types/entities'

interface DailyReflectionCardProps {
  tasks: HomeTask[]
  date: Date
}

export function DailyReflectionCard({ tasks, date }: DailyReflectionCardProps) {
  const dateString = format(date, 'yyyy-MM-dd')
  const isViewingToday = isToday(date)


  // React Query hooks
  const { data: reflection, isLoading } = useReflection(dateString)


  if (isLoading) {
    return (
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
        </div>
      </section>
    )
  }

  // Use key to reset form state when reflection data changes
  const formKey = reflection ? `${reflection.id}-${reflection.updated_at}` : `empty-${dateString}`

  return (
    <ReflectionForm
      key={formKey}
      tasks={tasks}
      date={date}
      dateString={dateString}
      reflection={reflection ?? null}
      isViewingToday={isViewingToday}
    />
  )
}

interface ReflectionFormProps {
  tasks: HomeTask[]
  date: Date
  dateString: string
  reflection: DailyReflection | null
  isViewingToday: boolean
}

function ReflectionForm({
  tasks,
  date,
  dateString,
  reflection,
  isViewingToday,
}: ReflectionFormProps) {
  const stats = calculateTaskStats(tasks)
  const hasSaved = !!reflection
  const isAllDone = stats.isAllDone

  // User can manually toggle. null = no manual override (use auto logic)
  const [userToggle, setUserToggle] = useState<boolean | null>(null)
  // Auto-open only when already saved (not when all done — let user choose)
  const autoOpen = hasSaved
  // User override wins, otherwise auto logic
  const isOpen = userToggle ?? autoOpen
  // CTA mode: all done but no reflection yet
  const showCta = isAllDone && !hasSaved && !isOpen

  const toggleOpen = () => setUserToggle((prev) => !(prev ?? autoOpen))

  // Initialize state from reflection data (only on mount due to key)
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(reflection?.mood ?? null)
  const [summary, setSummary] = useState(reflection?.summary ?? '')
  const [isDirty, setIsDirty] = useState(false)
  const summaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const createReflection = useCreateReflection()
  const deleteReflection = useDeleteReflection()

  const saveReflection = useCallback(
    async (mood?: MoodLevel, text?: string) => {
      const moodValue = mood ?? selectedMood ?? undefined
      const summaryValue = (text ?? summary) || undefined

      if (!moodValue && !summaryValue) return false

      try {
        await createReflection.mutateAsync({
          date: dateString,
          mood: moodValue,
          summary: summaryValue,
        })
        setIsDirty(false)
        return true
      } catch {
        return false
      }
    },
    [selectedMood, summary, dateString, createReflection]
  )

  const handleMoodChange = async (mood: MoodLevel) => {
    setSelectedMood(mood)
    await saveReflection(mood)
    trackEvent(ANALYTICS_EVENTS.REFLECTION_SAVED, { type: 'mood', mood })
  }

  const handleSummaryChange = (value: string) => {
    setSummary(value)
    setIsDirty(true)

    // Clear pending debounce
    if (summaryTimeoutRef.current) {
      clearTimeout(summaryTimeoutRef.current)
    }
  }

  const handleSave = async () => {
    if (summaryTimeoutRef.current) {
      clearTimeout(summaryTimeoutRef.current)
    }
    const success = await saveReflection()
    if (success) {
      toast.success('회고가 저장되었어요', { duration: 2000 })
      trackEvent(ANALYTICS_EVENTS.REFLECTION_SAVED, { type: 'summary' })
    }
  }

  const handleReset = async () => {
    if (!reflection) {
      setSelectedMood(null)
      setSummary('')
      setIsDirty(false)
      return
    }

    try {
      await deleteReflection.mutateAsync({ id: reflection.id, date: dateString })
      setSelectedMood(null)
      setSummary('')
      setIsDirty(false)
      toast.success('회고가 초기화되었어요', { duration: 2000 })
    } catch {
      toast.error('초기화에 실패했어요')
    }
  }

  const isSaving = createReflection.isPending || deleteReflection.isPending

  return (
    <section aria-labelledby="daily-reflection-title">
      {/* CTA button when all done */}
      {showCta && (
        <button
          onClick={toggleOpen}
          className="flex w-full items-center gap-3 rounded-xl bg-[var(--color-primary-500)] px-5 py-4 text-left text-white transition-all hover:bg-[var(--color-primary-600)] active:scale-[0.98]"
        >
          <Mascot mood="checkin" size="xs" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">오늘 하루 어땠나요?</p>
            <p className="text-xs opacity-80">회고를 남겨보세요</p>
          </div>
          <ChevronRight className="h-4 w-4 opacity-60" />
        </button>
      )}

      {/* Normal collapsible header (when not CTA) */}
      {!showCta && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50">
          <button
            onClick={toggleOpen}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <h3
                id="daily-reflection-title"
                className="text-sm font-medium text-[var(--color-text-secondary)]"
              >
                {isViewingToday ? '오늘의 회고' : `${format(date, 'M월 d일')} 회고`}
              </h3>
              {hasSaved && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-done)]">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-[var(--color-text-tertiary)] transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Collapsible Content */}
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ReflectionContent
                  isViewingToday={isViewingToday}
                  hasSaved={hasSaved}
                  selectedMood={selectedMood}
                  summary={summary}
                  isDirty={isDirty}
                  isSaving={isSaving}
                  tasks={tasks}
                  dateString={dateString}
                  onMoodChange={handleMoodChange}
                  onSummaryChange={handleSummaryChange}
                  onSave={handleSave}
                  onReset={handleReset}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

interface ReflectionContentProps {
  isViewingToday: boolean
  hasSaved: boolean
  selectedMood: MoodLevel | null
  summary: string
  isDirty: boolean
  isSaving: boolean
  tasks: HomeTask[]
  dateString: string
  onMoodChange: (mood: MoodLevel) => void
  onSummaryChange: (value: string) => void
  onSave: () => void
  onReset: () => void
}

function ReflectionContent({
  isViewingToday,
  hasSaved,
  selectedMood,
  summary,
  isDirty,
  isSaving,
  tasks,
  dateString,
  onMoodChange,
  onSummaryChange,
  onSave,
  onReset,
}: ReflectionContentProps) {
  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Reset button */}
      {(hasSaved || selectedMood || summary) && (
        <div className="flex justify-end">
          <button
            onClick={onReset}
            disabled={isSaving}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
              'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]',
              isSaving && 'cursor-not-allowed opacity-50'
            )}
          >
            <RotateCcw className="h-3 w-3" />
            초기화
          </button>
        </div>
      )}

      {/* Daily Mood */}
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          {isViewingToday ? '오늘 하루 어땠나요?' : '이 날은 어땠나요?'}
        </p>
        <MoodSelector value={selectedMood} onChange={onMoodChange} disabled={isSaving} size="sm" />
      </div>

      {/* Overall reflection */}
      <OverallReflectionTab
        summary={summary}
        isDirty={isDirty}
        isSaving={isSaving}
        hasSaved={hasSaved}
        selectedMood={selectedMood}
        isViewingToday={isViewingToday}
        onSummaryChange={onSummaryChange}
        onSave={onSave}
      />

      {/* Per-task reflection */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text-tertiary)]">태스크별 회고</p>
        <PerTaskReflectionTab tasks={tasks} dateString={dateString} disabled={isSaving} />
      </div>

      {/* Go to Review Link */}
      <Link
        href="/review"
        className={cn(
          'flex w-full items-center justify-between',
          'text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]'
        )}
      >
        <span>자세한 회고 작성하기</span>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
