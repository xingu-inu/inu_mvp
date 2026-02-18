'use client'

import { useState, useRef, useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { Plus, ChevronDown, ChevronUp, Sparkles, RefreshCw, X, Check, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCreateTask } from '@/queries/use-tasks'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { DayOfWeekPicker } from '@/components/ui/day-of-week-picker'
import { cn } from '@/lib/utils'
import { chipClass } from '@/lib/utils/chip-class'
import {
  QUICK_REPEAT_OPTIONS as REPEAT_OPTIONS,
  DURATION_OPTIONS,
  TIME_SLOT_OPTIONS,
} from '@/lib/constants/time-slots'
import {
  repeatConfigToDays,
  daysToRepeatConfig,
  detectPreset,
  getRepeatSummary,
} from '@/lib/utils/repeat-utils'
import { useTaskSuggestContext } from '../hooks/use-task-suggest-context'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { validateAiIds } from '@/lib/utils/validate-ai-ids'
import { sanitizeAiTask } from '@/lib/utils/sanitize-ai-task'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import type { RepeatType, TimeSlot } from '@/types/entities'
import type { AiTaskSuggestResponse } from '@/lib/ai/types'

/** Subset of DURATION_OPTIONS for quick inline selection */
const QUICK_DURATION_OPTIONS = DURATION_OPTIONS.filter((opt) =>
  [15, 30, 45, 60].includes(opt.value)
)

interface InlineTaskInputProps {
  goals?: Array<{ id: string; name: string }>
  areaId?: string
  selectedDate: Date
  enableAiSuggest?: boolean
}

/** Flattened AI suggestion task with goal context */
interface FlatAiTask {
  name: string
  why?: string
  repeat_type?: string
  duration_minutes?: number
  time_slot?: string
  goalId?: string | null
  goalName?: string
  areaEmoji?: string
  areaId?: string | null
}

export function InlineTaskInput({
  goals,
  areaId,
  selectedDate,
  enableAiSuggest,
}: InlineTaskInputProps) {
  const [text, setText] = useState('')
  const [selectedGoalId, setSelectedGoalId] = useState(goals?.[0]?.id ?? '')
  const [repeatType, setRepeatType] = useState<RepeatType>('once')
  const [repeatDays, setRepeatDays] = useState<number[] | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState<number>(15)
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('anytime')
  const [why, setWhy] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const createTask = useCreateTask()
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  // AI suggest state
  const [showAi, setShowAi] = useState(false)
  const [createdAiTasks, setCreatedAiTasks] = useState<Set<string>>(new Set())
  const [creatingAiTask, setCreatingAiTask] = useState<string | null>(null)
  const { context: suggestContext, isLoading: suggestContextLoading } = useTaskSuggestContext()
  const aiSuggest = useAiSuggest()
  const { data: cachedGoals = [] } = useGoals()
  const { data: cachedAreas = [] } = useAreas()

  const aiResult = aiSuggest.data as AiTaskSuggestResponse | undefined
  const flatAiTasks = useMemo<FlatAiTask[]>(() => {
    if (!aiResult?.suggestions) return []
    return aiResult.suggestions.flatMap((group) =>
      group.tasks.map((task) => ({
        ...task,
        goalId: group.goalId,
        goalName: group.goalName,
        areaEmoji: group.areaEmoji,
        areaId: group.areaId,
      }))
    )
  }, [aiResult])

  const onceLabel = isToday(selectedDate) ? '오늘만' : format(selectedDate, 'M/d') + '만'
  const showGoalPicker = goals && goals.length > 1 && isFocused
  const isRepeating = repeatType !== 'once'
  const activeDays = isRepeating ? repeatConfigToDays(repeatType, repeatDays) : []
  const activePreset = isRepeating ? detectPreset(activeDays) : null
  const summary = isRepeating ? getRepeatSummary(activeDays) : null

  const handleQuickRepeat = (type: RepeatType) => {
    if (type === 'once') {
      setRepeatType('once')
      setRepeatDays(null)
    } else {
      setRepeatType(type)
      setRepeatDays(null)
    }
  }

  const handleDaysChange = (days: number[]) => {
    if (days.length === 0) {
      setRepeatType('custom')
      setRepeatDays([])
      return
    }
    const config = daysToRepeatConfig(days)
    setRepeatType(config.repeat_type)
    setRepeatDays(config.repeat_days)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    if (goals && !selectedGoalId) return

    createTask.mutate(
      {
        name: trimmed,
        ...(goals ? { goal_id: selectedGoalId } : {}),
        ...(areaId && !goals ? { area_id: areaId } : {}),
        repeat_type: repeatType,
        ...(repeatDays && repeatDays.length > 0 ? { repeat_days: repeatDays } : {}),
        time_slot: timeSlot,
        duration_minutes: durationMinutes,
        ...(why.trim() ? { why: why.trim() } : {}),
        ...(repeatType === 'once' ? { scheduled_date: dateStr } : {}),
      },
      {
        onSuccess: () => {
          setText('')
          setRepeatType('once')
          setRepeatDays(null)
          setDurationMinutes(15)
          setTimeSlot('anytime')
          setWhy('')
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.home(dateStr) })
          inputRef.current?.focus()
        },
      }
    )
  }

  const handleFocus = () => setIsFocused(true)
  const handleBlur = (e: React.FocusEvent) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    if (!text.trim()) {
      setIsFocused(false)
      setIsExpanded(false)
    }
  }

  // AI suggest handlers
  const handleAiGenerate = () => {
    if (!suggestContext || aiSuggest.isPending) return
    setShowAi(true)
    setCreatedAiTasks(new Set())
    setCreatingAiTask(null)

    // Filter context to current area when areaId is provided
    const filteredContext = areaId
      ? {
          ...suggestContext,
          areas: suggestContext.areas.filter((a) => a.id === areaId),
          goals: suggestContext.goals.filter((g) => g.areaId === areaId),
          existingTasks: suggestContext.existingTasks.filter((t) => {
            const areaGoalIds = new Set(
              suggestContext.goals.filter((g) => g.areaId === areaId).map((g) => g.id)
            )
            return t.goalId ? areaGoalIds.has(t.goalId) : false
          }),
        }
      : suggestContext

    aiSuggest.mutate({ type: 'task-suggest', context: filteredContext })
  }

  const handleAiTaskSelect = (task: FlatAiTask) => {
    const taskKey = `${task.goalId}-${task.name}`
    if (createdAiTasks.has(taskKey) || creatingAiTask === taskKey) return

    const { goalId, areaId: validAreaId } = validateAiIds(
      { goalId: task.goalId, areaId: task.areaId },
      cachedGoals,
      cachedAreas
    )

    // Use component's areaId prop as fallback
    const finalAreaId = validAreaId ?? areaId

    const sanitized = sanitizeAiTask(task, dateStr)

    setCreatingAiTask(taskKey)

    createTask.mutate(
      {
        goal_id: goalId,
        area_id: finalAreaId,
        ...sanitized,
      },
      {
        onSuccess: () => {
          setCreatedAiTasks((prev) => new Set(prev).add(taskKey))
          setCreatingAiTask(null)
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.home(dateStr) })
        },
        onError: () => {
          setCreatingAiTask(null)
        },
      }
    )
  }

  const handleCloseAi = () => {
    setShowAi(false)
    aiSuggest.reset()
  }

  return (
    <div className="space-y-1">
      <form onSubmit={handleSubmit} onBlur={handleBlur} className="space-y-1.5">
        {/* Goal selector chips (multi-goal areas, shown when focused) */}
        {showGoalPicker && (
          <div className="flex flex-wrap gap-1 px-1">
            {goals.map((goal) => (
              <Chip
                key={goal.id}
                variant="selection"
                selected={selectedGoalId === goal.id}
                onClick={() => setSelectedGoalId(goal.id)}
                className="cursor-pointer !border !px-2.5 !py-1 !text-xs"
              >
                {goal.name}
              </Chip>
            ))}
          </div>
        )}

        {/* Repeat type chips + expand toggle (shown on focus) */}
        {isFocused && (
          <div className="flex items-center gap-1 px-1">
            {/* 오늘만 (once) */}
            <button
              type="button"
              onClick={() => handleQuickRepeat('once')}
              className={chipClass(repeatType === 'once')}
            >
              {onceLabel}
            </button>

            {/* Separator */}
            <span className="text-[10px] text-[var(--color-text-quaternary)]">·</span>

            {/* Repeat options */}
            {REPEAT_OPTIONS.filter((opt) => opt.value !== 'once').map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleQuickRepeat(opt.value)}
                className={chipClass(isRepeating && activePreset === opt.value)}
              >
                {opt.label}
              </button>
            ))}

            {/* Custom indicator when days don't match a preset */}
            {isRepeating && activePreset === null && (
              <span className="rounded-full bg-[var(--color-primary-50)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary-600)]">
                매주 {summary ?? '요일 선택'}
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
              aria-label={isExpanded ? '세부 설정 접기' : '세부 설정 펼치기'}
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}

        {/* Expanded detail fields */}
        {isFocused && isExpanded && (
          <div className="space-y-1.5 px-1">
            {/* Day-of-week picker (only when repeating) */}
            {isRepeating && (
              <div className="flex items-center gap-1.5">
                <span className="flex-shrink-0 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                  매주
                </span>
                <DayOfWeekPicker selectedDays={activeDays} onChange={handleDaysChange} compact />
              </div>
            )}

            {/* Duration chips */}
            <div className="flex items-center gap-1">
              <span className="flex-shrink-0 text-xs text-[var(--color-text-tertiary)]">⏱</span>
              <div className="flex gap-1">
                {QUICK_DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDurationMinutes(opt.value)}
                    className={chipClass(durationMinutes === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time slot chips */}
            <div className="flex items-center gap-1">
              <span className="flex-shrink-0 text-xs text-[var(--color-text-tertiary)]">🕐</span>
              <div className="flex gap-1">
                {TIME_SLOT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeSlot(opt.value)}
                    className={chipClass(timeSlot === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Why input */}
            <div className="flex items-center gap-1">
              <span className="flex-shrink-0 text-xs text-[var(--color-text-tertiary)]">💭</span>
              <input
                type="text"
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="이 행동이 왜 효과적인가?"
                className="flex-1 rounded-lg bg-[var(--color-bg-secondary)] px-2.5 py-1 text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
              />
            </div>
          </div>
        )}

        {/* Input row */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2',
            'transition-colors',
            isFocused ? 'bg-[var(--color-bg-secondary)]' : 'hover:bg-[var(--color-bg-secondary)]/50'
          )}
        >
          <Plus className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={handleFocus}
            placeholder="할 일 추가..."
            disabled={createTask.isPending}
            className={cn(
              'flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none',
              'placeholder:text-[var(--color-text-tertiary)]',
              createTask.isPending && 'cursor-not-allowed opacity-50'
            )}
          />
          {/* Single-goal hint */}
          {goals && goals.length === 1 && isFocused && (
            <span className="flex-shrink-0 truncate text-xs text-[var(--color-text-tertiary)]">
              {goals[0].name}
            </span>
          )}
          {/* AI suggest button (roadmap pattern) */}
          {enableAiSuggest && (
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={suggestContextLoading || aiSuggest.isPending}
              className="flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)] disabled:opacity-50"
              title="AI로 할 일 추천받기"
            >
              {aiSuggest.isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI 추천
            </button>
          )}
        </div>
      </form>

      {/* AI suggest inline section (roadmap-style) */}
      {enableAiSuggest && (
        <AnimatePresence>
          {showAi && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Loading shimmer */}
              {aiSuggest.isPending && (
                <div className="space-y-2 px-1 py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Sparkles className="h-3 w-3 text-[var(--color-primary-400)]" />
                      </motion.div>
                      <span className="text-[11px] text-[var(--color-text-tertiary)]">
                        AI가 할 일을 추천하고 있어요
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          ...
                        </motion.span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseAi}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                      aria-label="닫기"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {[80, 65, 90].map((width, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                    >
                      <div
                        className="h-10 rounded-lg bg-[var(--color-bg-tertiary)]"
                        style={{ width: `${width}%` }}
                      >
                        <motion.div
                          className="h-full rounded-lg"
                          style={{
                            background:
                              'linear-gradient(90deg, transparent 0%, var(--color-bg-secondary) 50%, transparent 100%)',
                          }}
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.15,
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Results - clickable task cards */}
              {!aiSuggest.isPending && flatAiTasks.length > 0 && !aiSuggest.error && (
                <div className="space-y-1.5 px-1 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">
                      {aiResult?.summary || 'AI 추천'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCloseAi}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                      aria-label="닫기"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {flatAiTasks.map((task, index) => {
                    const taskKey = `${task.goalId}-${task.name}`
                    const isCreated = createdAiTasks.has(taskKey)
                    const isCreating = creatingAiTask === taskKey

                    return (
                      <motion.button
                        key={taskKey}
                        type="button"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleAiTaskSelect(task)}
                        disabled={isCreated || isCreating}
                        className={cn(
                          'flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                          isCreated
                            ? 'border-[var(--color-done)]/30 bg-[var(--color-done)]/5 opacity-60'
                            : isCreating
                              ? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] opacity-80'
                              : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]'
                        )}
                      >
                        <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
                          {isCreated ? (
                            <Check className="h-3 w-3 shrink-0 text-[var(--color-done)]" />
                          ) : isCreating ? (
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--color-primary-400)]" />
                          ) : (
                            <Sparkles className="h-3 w-3 shrink-0 text-[var(--color-primary-400)]" />
                          )}
                          {task.name}
                        </span>
                        {task.goalName && (
                          <span className="ml-[18px] flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
                            {task.areaEmoji && <span>{task.areaEmoji}</span>}
                            <span>{task.goalName}</span>
                          </span>
                        )}
                        {task.why && (
                          <span className="ml-[18px] text-[11px] text-[var(--color-text-tertiary)] italic">
                            {task.why}
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAiGenerate}
                    disabled={aiSuggest.isPending}
                    className="w-full gap-1 text-xs text-[var(--color-text-tertiary)]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    다시 추천받기
                  </Button>
                </div>
              )}

              {/* Error */}
              {!aiSuggest.isPending && aiSuggest.error && (
                <div className="px-1 py-1">
                  <p className="text-xs text-[var(--color-miss)]">AI 추천을 생성하지 못했어요.</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAiGenerate}
                    className="mt-1 text-xs"
                  >
                    다시 시도
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
