import { Card } from '@/components/ui'

export default function TodayLoading() {
  return (
    <div className="space-y-4 px-4 py-6">
      {/* Hero Card Skeleton */}
      <Card className="h-40 animate-pulse bg-[var(--color-bg-secondary)]" />

      {/* Task Cards Skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="h-20 animate-pulse bg-[var(--color-bg-secondary)]" />
      ))}
    </div>
  )
}
