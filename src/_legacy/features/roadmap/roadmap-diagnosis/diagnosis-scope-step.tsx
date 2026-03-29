'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MapPin, FolderOpen, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { cn } from '@/lib/utils'
import type { DiagnosisScope } from '@/lib/ai/types'
import type { Area, Goal } from '@/types/entities'

interface DiagnosisScopeStepProps {
  areas: Area[]
  goals: Goal[]
  selectedScope: DiagnosisScope
  selectedTargetId: string | null
  onScopeChange: (scope: DiagnosisScope) => void
  onTargetChange: (targetId: string | null) => void
  onStart: () => void
  onCancel: () => void
}

const SCOPE_OPTIONS: Array<{
  value: DiagnosisScope
  emoji: string
  label: string
  description: string
  icon: typeof MapPin
}> = [
  {
    value: 'full',
    emoji: '🗺️',
    label: '전체 로드맵',
    description: '영역·목표·할 일 전체를 분석해요',
    icon: MapPin,
  },
  {
    value: 'area',
    emoji: '📂',
    label: '영역 단위',
    description: '선택한 영역의 목표와 할 일을 분석해요',
    icon: FolderOpen,
  },
  {
    value: 'goal',
    emoji: '🎯',
    label: '목표 단위',
    description: '선택한 목표의 구조와 할 일을 분석해요',
    icon: Target,
  },
]

export function DiagnosisScopeStep({
  areas,
  goals,
  selectedScope,
  selectedTargetId,
  onScopeChange,
  onTargetChange,
  onStart,
  onCancel,
}: DiagnosisScopeStepProps) {
  const needsTarget = selectedScope === 'area' || selectedScope === 'goal'
  const isStartDisabled = needsTarget && !selectedTargetId

  function handleScopeChange(scope: DiagnosisScope) {
    onScopeChange(scope)
    onTargetChange(null)
  }

  return (
    <>
      <ModalBody>
        <div className="space-y-2">
          {SCOPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleScopeChange(option.value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                selectedScope === option.value
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
              )}
            >
              <span className="text-lg">{option.emoji}</span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    selectedScope === option.value
                      ? 'text-[var(--color-primary-600)]'
                      : 'text-[var(--color-text-primary)]'
                  )}
                >
                  {option.label}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{option.description}</p>
              </div>
              <div
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  selectedScope === option.value
                    ? 'border-[var(--color-primary-500)]'
                    : 'border-[var(--color-border)]'
                )}
              >
                {selectedScope === option.value && (
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary-500)]" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Target selector (area or goal) */}
        <AnimatePresence initial={false}>
          {needsTarget && (
            <motion.div
              key="target-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-1.5 px-0.5 pt-1 pb-0.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {selectedScope === 'area' ? '분석할 영역 선택' : '분석할 목표 선택'}
                </label>
                {selectedScope === 'area' ? (
                  <Select
                    value={selectedTargetId ?? ''}
                    onValueChange={(value) => onTargetChange(value || null)}
                  >
                    <SelectTrigger
                      className="h-10 rounded-xl text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <SelectValue placeholder="영역을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.emoji} {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={selectedTargetId ?? ''}
                    onValueChange={(value) => onTargetChange(value || null)}
                  >
                    <SelectTrigger
                      className="h-10 rounded-xl text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <SelectValue placeholder="목표를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((goal) => {
                        const area = areas.find((a) => a.id === goal.area_id)
                        return (
                          <SelectItem key={goal.id} value={goal.id}>
                            {goal.name}
                            {area ? ` · ${area.emoji} ${area.name}` : ''}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button onClick={onStart} disabled={isStartDisabled} className="flex-1">
          진단 시작
        </Button>
      </ModalFooter>
    </>
  )
}
