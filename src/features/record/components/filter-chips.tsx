'use client'

import { cn } from '@/lib/utils'
import { useAreas } from '@/queries/use-areas'

interface FilterChipsProps {
  selectedAreaId: string | undefined
  onSelect: (areaId: string | undefined) => void
}

export function FilterChips({ selectedAreaId, onSelect }: FilterChipsProps) {
  const { data: areas } = useAreas()

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
      {/* All chip */}
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={cn(
          'min-h-[44px] shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors lg:min-h-0',
          selectedAreaId === undefined
            ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
        )}
      >
        전체
      </button>

      {/* Area chips */}
      {areas?.map((area) => (
        <button
          key={area.id}
          type="button"
          onClick={() => onSelect(area.id)}
          className={cn(
            'min-h-[44px] shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors lg:min-h-0',
            selectedAreaId === area.id
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
          )}
        >
          {area.emoji} {area.name}
        </button>
      ))}
    </div>
  )
}
