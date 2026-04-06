import { GoalListSkeleton, VisualTreeSkeleton } from '@/features/roadmap'

export default function MainLoading() {
  return (
    <>
      {/* Desktop */}
      <div className="hidden h-full bg-[var(--color-bg-primary)] lg:flex lg:flex-col">
        <div className="shrink-0 px-8 pt-6 pb-4">
          <div className="space-y-4">
            <div>
              <div className="h-7 w-20 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
              <div className="mt-1 h-4 w-48 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
            </div>
            <div className="h-9 w-64 animate-pulse rounded-lg bg-[var(--color-bg-tertiary)]" />
          </div>
        </div>
        <VisualTreeSkeleton />
      </div>

      {/* Mobile */}
      <div className="space-y-6 px-4 py-6 lg:hidden">
        <div className="space-y-4">
          <div>
            <div className="h-7 w-20 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
            <div className="mt-1 h-4 w-48 animate-pulse rounded bg-[var(--color-bg-tertiary)]" />
          </div>
          <div className="h-9 w-64 animate-pulse rounded-lg bg-[var(--color-bg-tertiary)]" />
        </div>
        <GoalListSkeleton />
      </div>
    </>
  )
}
