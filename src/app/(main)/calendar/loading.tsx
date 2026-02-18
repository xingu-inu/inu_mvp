import { Card } from '@/components/ui'

export default function CalendarLoading() {
  return (
    <div className="space-y-4 px-4 py-6">
      {/* Calendar Header Skeleton */}
      <Card className="h-16 animate-pulse bg-[var(--color-bg-secondary)]" />

      {/* Calendar Grid Skeleton */}
      <Card className="h-96 animate-pulse bg-[var(--color-bg-secondary)]" />
    </div>
  )
}
