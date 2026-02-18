'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Chip } from '@/components/ui/chip'
import { useAreas } from '@/queries/use-areas'
import { getCrossAreaSuggestions, type CrossAreaSuggestion } from '@/lib/utils/why-generator'
import type { AreaType } from '@/types/entities'

interface CrossAreaPickerProps {
  primaryAreaId: string | null
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function CrossAreaPicker({ primaryAreaId, selectedIds, onChange }: CrossAreaPickerProps) {
  const { data: areas = [] } = useAreas()

  const primaryArea = useMemo(
    () => areas.find((a) => a.id === primaryAreaId) ?? null,
    [areas, primaryAreaId]
  )

  const otherAreas = useMemo(
    () => areas.filter((a) => a.is_active && a.id !== primaryAreaId),
    [areas, primaryAreaId]
  )

  const crossAreaSuggestions: CrossAreaSuggestion[] = useMemo(() => {
    if (!primaryArea) return []
    return getCrossAreaSuggestions(
      { type: primaryArea.type as AreaType },
      otherAreas.map((a) => ({ id: a.id, type: a.type, name: a.name, emoji: a.emoji }))
    )
  }, [primaryArea, otherAreas])

  const toggleArea = (areaId: string) => {
    onChange(
      selectedIds.includes(areaId)
        ? selectedIds.filter((id) => id !== areaId)
        : [...selectedIds, areaId]
    )
  }

  if (crossAreaSuggestions.length === 0) return null

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">다른 영역에도 도움이 돼요 (선택)</Label>
      <div className="flex flex-wrap gap-1.5">
        {crossAreaSuggestions.map((suggestion) => (
          <Chip
            key={suggestion.areaId}
            variant="selection"
            selected={selectedIds.includes(suggestion.areaId)}
            onClick={() => toggleArea(suggestion.areaId)}
            className="cursor-pointer text-xs"
          >
            {suggestion.emoji} {suggestion.areaName}
          </Chip>
        ))}
      </div>
      {selectedIds.length > 0 && (
        <div className="space-y-1">
          {crossAreaSuggestions
            .filter((s) => selectedIds.includes(s.areaId))
            .map((s) => (
              <p key={s.areaId} className="text-[10px] text-[var(--color-text-tertiary)]">
                {s.emoji} {s.text}
              </p>
            ))}
        </div>
      )}
    </div>
  )
}
