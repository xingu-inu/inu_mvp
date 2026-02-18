import { VersionBadge } from './version-badge'

interface AreaSectionHeaderProps {
  area: { id: string; name: string; emoji: string }
  stats: { total: number; completed: number }
  directionVersion?: number | null
}

export function AreaSectionHeader({ area, stats, directionVersion }: AreaSectionHeaderProps) {
  return (
    <>
      <h2
        id={`area-${area.id}`}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-primary)]"
      >
        <span>{area.emoji}</span>
        <span>{area.name}</span>
        <VersionBadge version={directionVersion ?? null} />
      </h2>
      <div className="flex items-center gap-2">
        <div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
          <div
            className="h-full rounded-full bg-[var(--color-done)] transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
          />
        </div>
        <span className="font-mono text-xs text-[var(--color-text-tertiary)] tabular-nums">
          {stats.completed}/{stats.total}
        </span>
      </div>
    </>
  )
}
