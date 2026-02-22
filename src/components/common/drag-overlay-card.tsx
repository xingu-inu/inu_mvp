interface DragOverlayCardProps {
  children: React.ReactNode
}

export function DragOverlayCard({ children }: DragOverlayCardProps) {
  return (
    <div className="rounded-md bg-[var(--color-bg-primary)] shadow-lg ring-2 ring-[var(--color-primary-300)]">
      {children}
    </div>
  )
}
