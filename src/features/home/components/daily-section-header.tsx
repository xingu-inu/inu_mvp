interface DailySectionHeaderProps {
  taskCount: number
}

export function DailySectionHeader({ taskCount }: DailySectionHeaderProps) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <h2
        id="daily-tasks"
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-primary)]"
      >
        <span>📌</span>
        <span>일상</span>
      </h2>
      {taskCount > 0 && (
        <span className="font-mono text-xs text-[var(--color-text-tertiary)] tabular-nums">
          {taskCount}
        </span>
      )}
    </div>
  )
}
