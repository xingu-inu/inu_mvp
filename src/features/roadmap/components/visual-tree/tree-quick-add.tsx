'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useCreateArea, useAreas } from '@/queries/use-areas'
import { useCreateGoal } from '@/queries/use-goals'
import { useCreateTask } from '@/queries/use-tasks'
import { format } from 'date-fns'
import { AREA_PRESETS_EXTENDED, SAMPLE_GOALS, SAMPLE_TASKS } from '@/lib/constants/onboarding'
import type { AreaType } from '@/types/entities'

interface TreeQuickAddProps {
  parentType: 'direction' | 'area' | 'goal' | 'group'
  parentId: string
  /** Goal ID — required when adding task under a group */
  goalId?: string
  /** Area type — used for sample suggestions */
  areaType?: AreaType
  onClose: () => void
}

export function TreeQuickAdd({
  parentType,
  parentId,
  goalId,
  areaType,
  onClose,
}: TreeQuickAddProps) {
  switch (parentType) {
    case 'direction':
      return <AreaQuickAdd onClose={onClose} />
    case 'area':
      return <GoalQuickAdd areaId={parentId} areaType={areaType} onClose={onClose} />
    case 'goal':
      return <TaskQuickAdd goalId={parentId} areaType={areaType} onClose={onClose} />
    case 'group':
      return (
        <TaskQuickAdd goalId={goalId!} groupId={parentId} areaType={areaType} onClose={onClose} />
      )
    default:
      return null
  }
}

// ── Area Quick Add — preset chips + custom option ──

function AreaQuickAdd({ onClose }: { onClose: () => void }) {
  const { data: areas = [] } = useAreas()
  const createArea = useCreateArea()
  const [isCustom, setIsCustom] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const existingTypes = areas.filter((a) => a.is_active).map((a) => a.type)
  const availablePresets = AREA_PRESETS_EXTENDED.filter((p) => !existingTypes.includes(p.type))

  useEffect(() => {
    if (isCustom) inputRef.current?.focus()
  }, [isCustom])

  const handlePresetClick = (preset: (typeof AREA_PRESETS_EXTENDED)[number]) => {
    createArea.mutate(
      { name: preset.name, type: preset.type, emoji: preset.emoji, color: preset.color },
      { onSuccess: () => onClose() }
    )
  }

  const handleCustomSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    createArea.mutate(
      { name: trimmed, type: 'custom' as AreaType, emoji: '✨', color: '#8a7a65' },
      { onSuccess: () => onClose() }
    )
  }

  if (isCustom) {
    return (
      <div className="w-60 space-y-3">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">새 영역</p>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCustomSubmit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder="영역 이름"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-300)]"
          maxLength={50}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            size="sm"
            onClick={handleCustomSubmit}
            disabled={!name.trim() || createArea.isPending}
          >
            추가
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-60 space-y-3">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">영역 추가</p>
      {availablePresets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {availablePresets.map((preset) => (
            <button
              key={preset.type}
              onClick={() => handlePresetClick(preset)}
              disabled={createArea.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            >
              <span>{preset.emoji}</span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-tertiary)]">모든 기본 영역이 추가되었어요</p>
      )}
      <button
        onClick={() => setIsCustom(true)}
        className="text-xs text-[var(--color-primary-500)] transition-colors hover:text-[var(--color-primary-600)]"
      >
        직접 만들기
      </button>
    </div>
  )
}

// ── Goal Quick Add — name input + sample chips ──

function GoalQuickAdd({
  areaId,
  areaType,
  onClose,
}: {
  areaId: string
  areaType?: AreaType
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const createGoal = useCreateGoal()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const samples = areaType ? (SAMPLE_GOALS[areaType] ?? []).slice(0, 3) : []

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    createGoal.mutate(
      { area_id: areaId, name: trimmed, status: 'active' },
      { onSuccess: () => onClose() }
    )
  }

  return (
    <div className="w-60 space-y-3">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">새 목표</p>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onClose()
        }}
        placeholder="목표 이름"
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-300)]"
        maxLength={100}
      />
      {samples.length > 0 && !name && (
        <div className="flex flex-wrap gap-1.5">
          {samples.map((sample) => (
            <button
              key={sample}
              onClick={() => setName(sample)}
              className="rounded-md bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              {sample}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          취소
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || createGoal.isPending}>
          추가
        </Button>
      </div>
    </div>
  )
}

// ── Task Quick Add — name input + sample chips ──

function TaskQuickAdd({
  goalId,
  groupId,
  areaType,
  onClose,
}: {
  goalId: string
  groupId?: string
  areaType?: AreaType
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const createTask = useCreateTask()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const samples = areaType ? (SAMPLE_TASKS[areaType] ?? []).slice(0, 3) : []

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    createTask.mutate(
      {
        goal_id: goalId,
        group_id: groupId,
        name: trimmed,
        repeat_type: 'once',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        time_slot: 'anytime',
      },
      { onSuccess: () => onClose() }
    )
  }

  return (
    <div className="w-60 space-y-3">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">새 할 일</p>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onClose()
        }}
        placeholder="할 일 이름"
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary-300)]"
        maxLength={100}
      />
      {samples.length > 0 && !name && (
        <div className="flex flex-wrap gap-1.5">
          {samples.map((sample) => (
            <button
              key={sample}
              onClick={() => setName(sample)}
              className="rounded-md bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              {sample}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          취소
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || createTask.isPending}>
          추가
        </Button>
      </div>
    </div>
  )
}
