'use client'

/**
 * Mobile TreeView skeleton — mimics the indented row-based tree structure.
 * Indent formula: paddingLeft = 12 + level * 16
 * Row: [chevron w-6] [icon] [name flex-1] [badge ml-auto]
 */
export function GoalListSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl bg-[var(--color-bg-primary)] shadow-[var(--shadow-card)]">
      {/* Direction (level 0) */}
      <div
        className="flex items-center gap-2 bg-[var(--color-bg-secondary)] py-4 pr-4"
        style={{ paddingLeft: 12 }}
      >
        <div className="h-6 w-6" />
        <div className="h-5 w-5 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-5 w-48 rounded bg-[var(--color-bg-tertiary)]" />
      </div>

      {/* Status Group "진행 중" (level 1) */}
      <div
        className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] py-2.5 pr-4"
        style={{ paddingLeft: 28 }}
      >
        <div className="h-6 w-6" />
        <div className="h-4 w-4 rounded bg-[var(--color-border)]" />
        <div className="h-3 w-14 rounded bg-[var(--color-border)]" />
        <div className="ml-auto h-4 w-6 rounded-full bg-[var(--color-border)]" />
      </div>

      {/* Area 1 (level 2) */}
      <div className="flex items-center gap-2 py-2.5 pr-4" style={{ paddingLeft: 44 }}>
        <div className="h-6 w-6" />
        <div className="h-4 w-4 rounded-full bg-[var(--color-bg-tertiary)]" />
        <div className="h-4 w-20 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="ml-auto h-4 w-6 rounded-full bg-[var(--color-border)]" />
      </div>

      {/* Goal 1 (level 3) */}
      <div className="flex items-center gap-2 py-2 pr-4" style={{ paddingLeft: 60 }}>
        <div className="w-6" />
        <div className="h-4 w-4 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-4 w-32 rounded bg-[var(--color-bg-tertiary)]" />
      </div>

      {/* Goal 2 (level 3) */}
      <div className="flex items-center gap-2 py-2 pr-4" style={{ paddingLeft: 60 }}>
        <div className="w-6" />
        <div className="h-4 w-4 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-4 w-24 rounded bg-[var(--color-bg-tertiary)]" />
      </div>

      {/* Area 2 (level 2) */}
      <div className="flex items-center gap-2 py-2.5 pr-4" style={{ paddingLeft: 44 }}>
        <div className="h-6 w-6" />
        <div className="h-4 w-4 rounded-full bg-[var(--color-bg-tertiary)]" />
        <div className="h-4 w-16 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="ml-auto h-4 w-6 rounded-full bg-[var(--color-border)]" />
      </div>

      {/* Goal 3 (level 3) */}
      <div className="flex items-center gap-2 py-2 pr-4" style={{ paddingLeft: 60 }}>
        <div className="w-6" />
        <div className="h-4 w-4 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-4 w-28 rounded bg-[var(--color-bg-tertiary)]" />
      </div>

      {/* Status Group "백로그" (level 1, collapsed) */}
      <div
        className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] py-2.5 pr-4"
        style={{ paddingLeft: 28 }}
      >
        <div className="h-6 w-6" />
        <div className="h-4 w-4 rounded bg-[var(--color-border)]" />
        <div className="h-3 w-12 rounded bg-[var(--color-border)]" />
        <div className="ml-auto h-4 w-6 rounded-full bg-[var(--color-border)]" />
      </div>
    </div>
  )
}
