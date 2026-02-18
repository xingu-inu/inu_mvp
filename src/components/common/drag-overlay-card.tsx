interface DragOverlayCardProps {
  children: React.ReactNode
}

export function DragOverlayCard({ children }: DragOverlayCardProps) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-primary)] shadow-lg ring-1 ring-black/5 dark:ring-white/10">
      {children}
    </div>
  )
}
