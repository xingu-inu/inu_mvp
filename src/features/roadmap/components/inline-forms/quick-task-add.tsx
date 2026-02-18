'use client'

import { useState, useRef, useCallback } from 'react'
import { Plus, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/ui/chip'
import { useCreateTask } from '@/queries/use-tasks'
import {
  getTaskNameSuggestions,
  getWhySuggestions,
  getCrossAreaSuggestions,
  type WhySuggestion,
  type CrossAreaSuggestion,
} from '@/lib/utils/why-generator'
import type { AreaType } from '@/types/entities'

interface QuickTaskAddProps {
  goalId: string
  defaultGroupId?: string
  onDone: () => void
  goal: { name: string; why: string | null }
  area: { type: AreaType; name: string }
  otherAreas: Array<{ id: string; type: AreaType; name: string; emoji: string }>
}

export function QuickTaskAdd({
  goalId,
  defaultGroupId,
  onDone,
  goal,
  area,
  otherAreas,
}: QuickTaskAddProps) {
  const createTask = useCreateTask()
  const inputRef = useRef<HTMLInputElement>(null)

  // State
  const [taskName, setTaskName] = useState('')
  const [showCustomName, setShowCustomName] = useState(false)
  const [selectedWhys, setSelectedWhys] = useState<string[]>([])
  const [showCustomWhy, setShowCustomWhy] = useState(false)
  const [customWhy, setCustomWhy] = useState('')
  const [selectedCrossAreaIds, setSelectedCrossAreaIds] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  // Suggestions
  const nameSuggestions = getTaskNameSuggestions(area.type)
  const whySuggestions: WhySuggestion[] = getWhySuggestions(goal, area)
  const crossAreaSuggestions: CrossAreaSuggestion[] = getCrossAreaSuggestions(area, otherAreas)

  const handleNameChipClick = (name: string) => {
    if (taskName === name) {
      setTaskName('')
    } else {
      setTaskName(name)
      setShowCustomName(false)
    }
  }

  const toggleWhy = (text: string) => {
    setSelectedWhys((prev) =>
      prev.includes(text) ? prev.filter((w) => w !== text) : [...prev, text]
    )
  }

  const toggleCrossArea = (areaId: string) => {
    setSelectedCrossAreaIds((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    )
  }

  const addCustomWhy = () => {
    const trimmed = customWhy.trim()
    if (trimmed && !selectedWhys.includes(trimmed)) {
      setSelectedWhys((prev) => [...prev, trimmed])
      setCustomWhy('')
      setShowCustomWhy(false)
    }
  }

  const handleReset = useCallback(() => {
    setTaskName('')
    setShowCustomName(false)
    setSelectedWhys([])
    setShowCustomWhy(false)
    setCustomWhy('')
    setSelectedCrossAreaIds([])
    setShowDetails(false)
  }, [])

  const handleSubmit = () => {
    if (!taskName.trim()) return

    const whyText = selectedWhys.length > 0 ? selectedWhys.join('. ') : undefined

    createTask.mutate(
      {
        goal_id: goalId,
        group_id: defaultGroupId,
        name: taskName.trim(),
        why: whyText,
        repeat_type: 'daily',
        duration_minutes: 15,
        time_slot: 'anytime',
        related_area_ids: selectedCrossAreaIds.length > 0 ? selectedCrossAreaIds : undefined,
      },
      {
        onSuccess: () => {
          handleReset()
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault()
      if (showCustomName && taskName.trim()) {
        setShowCustomName(false)
      } else if (showCustomWhy && customWhy.trim()) {
        addCustomWhy()
      }
    }
    if (e.key === 'Escape') {
      onDone()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      style={{ overflow: 'hidden' }}
    >
      <div
        className="space-y-3 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary-600)]">
            <Plus className="h-3.5 w-3.5" />
            빠른 할 일 추가
          </div>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
            onClick={onDone}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Step 1: Task Name */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">이름</span>
          <div className="flex flex-wrap gap-1.5">
            {nameSuggestions.map((name) => (
              <Chip
                key={name}
                variant="selection"
                selected={taskName === name}
                onClick={() => handleNameChipClick(name)}
                className="cursor-pointer text-xs"
              >
                {name}
              </Chip>
            ))}
            {!showCustomName ? (
              <Chip
                variant="selection"
                selected={false}
                onClick={() => {
                  setShowCustomName(true)
                  setTaskName('')
                  setTimeout(() => inputRef.current?.focus(), 50)
                }}
                className="cursor-pointer border-dashed text-xs"
              >
                <Plus className="h-3 w-3" />
                직접 입력
              </Chip>
            ) : (
              <Input
                ref={inputRef}
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="할 일 이름 입력..."
                className="h-8 text-xs"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Details toggle (Why + Cross-area) */}
        {taskName && (
          <button
            className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Why & 연결 설정
          </button>
        )}

        {/* Step 2: Why Selection (optional) */}
        {taskName && showDetails && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              왜 이 할 일을? (선택)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {whySuggestions.map((s) => (
                <Chip
                  key={s.text}
                  variant="selection"
                  selected={selectedWhys.includes(s.text)}
                  onClick={() => toggleWhy(s.text)}
                  className="cursor-pointer text-xs"
                >
                  {s.text}
                </Chip>
              ))}
              {!showCustomWhy ? (
                <Chip
                  variant="selection"
                  selected={false}
                  onClick={() => setShowCustomWhy(true)}
                  className="cursor-pointer border-dashed text-xs"
                >
                  <Plus className="h-3 w-3" />
                  직접 입력
                </Chip>
              ) : (
                <div className="flex w-full gap-1.5">
                  <Input
                    value={customWhy}
                    onChange={(e) => setCustomWhy(e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    placeholder="나만의 이유..."
                    className="h-8 flex-1 text-xs"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={addCustomWhy}
                    disabled={!customWhy.trim()}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Cross-area (optional) */}
        {taskName && showDetails && crossAreaSuggestions.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              다른 영역에도 도움이 돼요 (선택)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {crossAreaSuggestions.map((s) => (
                <Chip
                  key={s.areaId}
                  variant="selection"
                  selected={selectedCrossAreaIds.includes(s.areaId)}
                  onClick={() => toggleCrossArea(s.areaId)}
                  className="cursor-pointer text-xs"
                  emoji={s.emoji}
                >
                  {s.areaName}
                </Chip>
              ))}
            </div>
            {/* Show selected cross-area reasons */}
            {selectedCrossAreaIds.length > 0 && (
              <div className="space-y-1">
                {crossAreaSuggestions
                  .filter((s) => selectedCrossAreaIds.includes(s.areaId))
                  .map((s) => (
                    <p key={s.areaId} className="text-[10px] text-[var(--color-text-tertiary)]">
                      {s.emoji} {s.text}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1 gap-1"
            onClick={onDone}
          >
            <X className="h-3.5 w-3.5" />
            닫기
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1 gap-1"
            onClick={handleSubmit}
            disabled={!taskName.trim()}
            isLoading={createTask.isPending}
          >
            <Check className="h-3.5 w-3.5" />
            추가
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
