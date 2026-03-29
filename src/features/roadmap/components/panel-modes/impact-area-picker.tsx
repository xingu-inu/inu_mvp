'use client'

import { cn } from '@/lib/utils'
import type { Area } from '@/types/entities'

interface ImpactAreaPickerProps {
  areaId: string
  selectedIds: string[]
  areas: Area[]
  onUpdate: (ids: string[]) => void
}

export function ImpactAreaPicker({ areaId, selectedIds, areas, onUpdate }: ImpactAreaPickerProps) {
  const secondaryAreas = areas.filter((a) => a.id !== areaId)
  const atMax = selectedIds.length >= 3

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onUpdate(selectedIds.filter((x) => x !== id))
    } else if (!atMax) {
      onUpdate([...selectedIds, id])
    }
  }

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">영향 영역</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          이 목표가 도움이 되는 영역 (최대 3개)
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {secondaryAreas.map((area) => {
          const isSelected = selectedIds.includes(area.id)
          const isDisabled = atMax && !isSelected

          return (
            <button
              key={area.id}
              type="button"
              disabled={isDisabled}
              onClick={() => toggle(area.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
                isSelected
                  ? 'border border-solid'
                  : 'border border-dashed border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]',
                isDisabled && 'pointer-events-none opacity-50'
              )}
              style={
                isSelected
                  ? {
                      backgroundColor: `${area.color}26`,
                      borderColor: area.color,
                      color: area.color,
                    }
                  : undefined
              }
            >
              <span>{area.emoji}</span>
              <span>{area.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
