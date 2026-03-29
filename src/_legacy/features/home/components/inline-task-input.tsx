'use client'

import { useState, useRef, useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { Plus, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react'
import { useCreateTask } from '@/queries/use-tasks'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
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
import { InlineAiSuggest, type FlatAiTask } from './inline-ai-suggest'

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

      {/* AI suggest inline section */}
      {enableAiSuggest && (
        <InlineAiSuggest
          showAi={showAi}
          aiSuggest={aiSuggest}
          flatAiTasks={flatAiTasks}
          aiResult={aiResult}
          createdAiTasks={createdAiTasks}
          creatingAiTask={creatingAiTask}
          onGenerate={handleAiGenerate}
          onTaskSelect={handleAiTaskSelect}
          onClose={handleCloseAi}
        />
      )}
    </div>
  )
}
