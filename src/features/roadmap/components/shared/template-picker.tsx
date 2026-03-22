'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GOAL_TEMPLATES, AREA_TYPE_LABELS, type GoalTemplate } from '../../data/goal-templates'
import { useApplyTemplate } from '../../hooks/use-apply-template'

interface TemplatePickerProps {
  areaId: string
  onClose: () => void
}

export function TemplatePicker({ areaId, onClose }: TemplatePickerProps) {
  const [selected, setSelected] = useState<GoalTemplate | null>(null)
  const { applyTemplate, isApplying } = useApplyTemplate()

  const handleUseTemplate = async () => {
    if (!selected) return
    try {
      await applyTemplate(selected, areaId)
    } finally {
      onClose()
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-sm font-medium text-[var(--color-text-primary)]">템플릿 선택</p>

      <div className="grid grid-cols-2 gap-2">
        {GOAL_TEMPLATES.map((template) => {
          const isSelected = selected?.id === template.id
          return (
            <button
              key={template.id}
              onClick={() => setSelected(isSelected ? null : template)}
              disabled={isApplying}
              className={[
                'relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all',
                isSelected
                  ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-primary-300)] hover:shadow-sm',
                isApplying ? 'opacity-50' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary-500)]">
                  <Check className="h-2.5 w-2.5 text-white" />
                </span>
              )}

              <span className="text-xl leading-none">{template.emoji}</span>
              <span className="text-xs leading-tight font-medium text-[var(--color-text-primary)]">
                {template.name}
              </span>
              <span className="text-[10px] leading-tight text-[var(--color-text-tertiary)]">
                {template.description}
              </span>
              <span className="mt-0.5 rounded-md bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                {AREA_TYPE_LABELS[template.areaType]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={isApplying}>
          취소
        </Button>
        <Button size="sm" onClick={handleUseTemplate} disabled={!selected || isApplying}>
          {isApplying ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              적용 중...
            </>
          ) : (
            '템플릿 적용'
          )}
        </Button>
      </div>
    </div>
  )
}
