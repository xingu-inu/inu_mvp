'use client'

import { useState, useCallback } from 'react'
import { Check, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useBrainDumpApply } from '@/features/roadmap/hooks/use-brain-dump-apply'
import type { BrainDumpReviewArea } from '@/features/roadmap/hooks/use-brain-dump-apply'
import { toReviewAreas, parseProposalOutput, type ProposeStructureOutput } from './proposal-utils'

type CardState = 'idle' | 'applying' | 'applied' | 'error'

interface ProposalCardProps {
  output: unknown
}

export function ProposalCard({ output }: ProposalCardProps) {
  const parsed = parseProposalOutput(output)
  if (!parsed) return null

  return <ProposalCardInner data={parsed} />
}

function ProposalCardInner({ data }: { data: ProposeStructureOutput }) {
  const [areas, setAreas] = useState<BrainDumpReviewArea[]>(() => toReviewAreas(data))
  const [cardState, setCardState] = useState<CardState>('idle')
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(
    () => new Set(areas.map((a) => a._id))
  )
  const { apply, progress } = useBrainDumpApply()

  const checkedCount = countCheckedItems(areas)

  const handleApply = useCallback(async () => {
    setCardState('applying')
    try {
      const ok = await apply(areas)
      setCardState(ok ? 'applied' : 'error')
    } catch {
      setCardState('error')
    }
  }, [areas, apply])

  function toggleAreaExpanded(areaId: string) {
    setExpandedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }

  function toggleAreaChecked(areaId: string) {
    if (cardState !== 'idle') return
    setAreas((prev) =>
      prev.map((a) => {
        if (a._id !== areaId) return a
        const newChecked = !a._checked
        return {
          ...a,
          _checked: newChecked,
          goals: a.goals.map((g) => ({
            ...g,
            _checked: newChecked,
            tasks: g.tasks.map((t) => ({ ...t, _checked: newChecked })),
          })),
        }
      })
    )
  }

  function toggleGoalChecked(areaId: string, goalId: string) {
    if (cardState !== 'idle') return
    setAreas((prev) =>
      prev.map((a) => {
        if (a._id !== areaId) return a
        const updatedGoals = a.goals.map((g) => {
          if (g._id !== goalId) return g
          const newChecked = !g._checked
          return {
            ...g,
            _checked: newChecked,
            tasks: g.tasks.map((t) => ({ ...t, _checked: newChecked })),
          }
        })
        return { ...a, goals: updatedGoals, _checked: updatedGoals.some((g) => g._checked) }
      })
    )
  }

  function toggleTaskChecked(areaId: string, goalId: string, taskId: string) {
    if (cardState !== 'idle') return
    setAreas((prev) =>
      prev.map((a) => {
        if (a._id !== areaId) return a
        const updatedGoals = a.goals.map((g) => {
          if (g._id !== goalId) return g
          const updatedTasks = g.tasks.map((t) =>
            t._id === taskId ? { ...t, _checked: !t._checked } : t
          )
          return { ...g, tasks: updatedTasks, _checked: updatedTasks.some((t) => t._checked) }
        })
        return { ...a, goals: updatedGoals, _checked: updatedGoals.some((g) => g._checked) }
      })
    )
  }

  // ── Applied state ──
  if (cardState === 'applied') {
    return (
      <div className="my-1 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300">
          {progress.completed}개 항목이 추가되었어요
        </span>
      </div>
    )
  }

  // ── Error state ──
  if (cardState === 'error') {
    return (
      <div className="my-1 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {progress.completed}개 완료, {progress.failed}개 실패
          </span>
        </div>
        <button
          onClick={() => setCardState('idle')}
          className="flex-shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="my-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
      {/* Summary */}
      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <p className="text-xs text-[var(--color-text-secondary)]">{data.summary}</p>
      </div>

      {/* Areas */}
      <div className="max-h-[300px] overflow-y-auto">
        {areas.map((area) => (
          <div key={area._id} className="border-b border-[var(--color-border)] last:border-b-0">
            {/* Area header */}
            <button
              onClick={() => toggleAreaExpanded(area._id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <Checkbox
                checked={area._checked}
                disabled={cardState !== 'idle'}
                onChange={(e) => {
                  e.stopPropagation()
                  toggleAreaChecked(area._id)
                }}
              />
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: area.color }}
              />
              <span className="text-xs">{area.emoji}</span>
              <span className="flex-1 truncate text-xs font-medium text-[var(--color-text-primary)]">
                {area.name}
              </span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                  area.isExisting
                    ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                )}
              >
                {area.isExisting ? '기존' : '새로운'}
              </span>
              {expandedAreas.has(area._id) ? (
                <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-quaternary)]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-quaternary)]" />
              )}
            </button>

            {/* Goals / Tasks */}
            <AnimatePresence>
              {expandedAreas.has(area._id) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-[var(--color-bg-secondary)]/50">
                    {area.goals.map((goal) => (
                      <div key={goal._id}>
                        {/* Goal row */}
                        <div className="flex items-center gap-2 px-3 py-1.5 pl-8">
                          <Checkbox
                            checked={goal._checked}
                            disabled={cardState !== 'idle'}
                            onChange={() => toggleGoalChecked(area._id, goal._id)}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className={cn(
                                'block text-xs',
                                goal._checked
                                  ? 'text-[var(--color-text-primary)]'
                                  : 'text-[var(--color-text-quaternary)] line-through'
                              )}
                            >
                              {goal.name}
                            </span>
                          </div>
                        </div>

                        {/* Tasks */}
                        {goal.tasks.map((task) => (
                          <div key={task._id} className="flex items-center gap-2 px-3 py-1 pl-12">
                            <Checkbox
                              checked={task._checked}
                              disabled={cardState !== 'idle'}
                              onChange={() => toggleTaskChecked(area._id, goal._id, task._id)}
                              size="sm"
                            />
                            <span
                              className={cn(
                                'flex-1 text-[11px]',
                                task._checked
                                  ? 'text-[var(--color-text-secondary)]'
                                  : 'text-[var(--color-text-quaternary)] line-through'
                              )}
                            >
                              {task.name}
                            </span>
                            <span className="flex-shrink-0 rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-quaternary)]">
                              {formatRepeatType(task.repeat_type)} · {task.duration_minutes}분
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2">
        {cardState === 'applying' ? (
          <div className="flex flex-1 items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-primary-500)]" />
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary-500)] transition-all duration-300"
                  style={{
                    width:
                      progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {progress.completed}/{progress.total}
            </span>
          </div>
        ) : (
          <>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {checkedCount}개 선택됨
            </span>
            <button
              onClick={handleApply}
              disabled={checkedCount === 0}
              className="flex items-center gap-1 rounded-lg bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:opacity-40"
            >
              <Check className="h-3 w-3" />
              반영하기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Helpers ──

function Checkbox({
  checked,
  onChange,
  disabled,
  size = 'md',
}: {
  checked: boolean
  onChange: (e: React.MouseEvent) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'

  return (
    <button
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(e)
      }}
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded border transition-colors',
        sizeClass,
        checked
          ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
          : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]',
        disabled && 'opacity-50'
      )}
    >
      {checked && <Check className={iconSize} />}
    </button>
  )
}

function countCheckedItems(areas: BrainDumpReviewArea[]): number {
  let count = 0
  for (const area of areas) {
    if (!area._checked) continue
    if (!area.isExisting) count++
    for (const goal of area.goals) {
      if (!goal._checked) continue
      count++
      count += goal.tasks.filter((t) => t._checked).length
    }
  }
  return count
}

function formatRepeatType(type: string): string {
  switch (type) {
    case 'once':
      return '1회'
    case 'daily':
      return '매일'
    case 'weekdays':
      return '평일'
    case 'weekends':
      return '주말'
    case 'weekly':
      return '매주'
    case 'custom':
      return '커스텀'
    default:
      return type
  }
}
