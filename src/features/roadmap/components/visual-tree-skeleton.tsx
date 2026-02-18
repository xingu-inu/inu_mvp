'use client'

/**
 * Desktop VisualTree skeleton — mimics the node-graph layout with connector lines.
 * Card styles match tree-node-card.tsx, connector pattern matches tree-node.tsx (vertical layout).
 */
export function VisualTreeSkeleton() {
  return (
    <div className="relative min-h-0 flex-1">
      <div className="h-full overflow-hidden bg-[var(--color-bg-tertiary)]">
        <div className="animate-pulse p-12">
          {/* Root: Direction → Areas → Goals (vertical layout) */}
          <div className="flex flex-col items-center">
            {/* Direction card */}
            <div className="flex min-w-[180px] items-center gap-2 rounded-xl border-2 border-[var(--color-primary-500)] bg-[var(--color-primary-500)] px-3 py-3 shadow-sm">
              <div className="h-4 w-4 rounded bg-white/30" />
              <div className="h-4 w-32 rounded bg-white/30" />
              <div className="ml-auto h-4 w-5 rounded-full bg-white/30" />
            </div>

            {/* Connector: direction → areas */}
            <div className="h-5 shrink-0 border-l-2 border-[var(--color-border)]" />

            {/* Area branches */}
            <div className="flex">
              {/* Area 1 branch (left) */}
              <div className="relative flex flex-col items-center px-3">
                {/* Right half horizontal bar */}
                <div className="absolute top-0 left-1/2 h-0.5 w-1/2 bg-[var(--color-border)]" />
                {/* Vertical stub */}
                <div className="h-5 shrink-0 border-l-2 border-[var(--color-border)]" />

                {/* Area 1 card */}
                <div
                  className="flex min-w-[140px] items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm"
                  style={{ borderLeftWidth: 4, borderLeftColor: 'var(--color-bg-tertiary)' }}
                >
                  <div className="h-5 w-5 rounded bg-[var(--color-bg-tertiary)]" />
                  <div className="h-4 w-16 rounded bg-[var(--color-bg-tertiary)]" />
                  <div className="ml-auto h-4 w-5 rounded-full bg-[var(--color-bg-tertiary)]" />
                </div>

                {/* Connector: area 1 → goals */}
                <div className="h-5 shrink-0 border-l-2 border-[var(--color-border)]" />

                {/* Goal branches under Area 1 */}
                <div className="flex">
                  {/* Goal 1 (left) */}
                  <div className="relative flex flex-col items-center px-3">
                    <div className="absolute top-0 left-1/2 h-0.5 w-1/2 bg-[var(--color-border)]" />
                    <div className="h-5 shrink-0 border-l-2 border-[var(--color-border)]" />
                    <div className="flex min-w-[150px] items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm">
                      <div className="h-4 w-4 rounded bg-[var(--color-bg-tertiary)]" />
                      <div className="h-4 w-20 rounded bg-[var(--color-bg-tertiary)]" />
                      <div className="ml-auto h-4 w-10 rounded-full bg-[var(--color-bg-tertiary)]" />
                    </div>
                  </div>

                  {/* Goal 2 (right) */}
                  <div className="relative flex flex-col items-center px-3">
                    <div className="absolute top-0 left-0 h-0.5 w-1/2 bg-[var(--color-border)]" />
                    <div className="h-5 shrink-0 border-l-2 border-[var(--color-border)]" />
                    <div className="flex min-w-[150px] items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm">
                      <div className="h-4 w-4 rounded bg-[var(--color-bg-tertiary)]" />
                      <div className="h-4 w-24 rounded bg-[var(--color-bg-tertiary)]" />
                      <div className="ml-auto h-4 w-10 rounded-full bg-[var(--color-bg-tertiary)]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Area 2 branch (right) */}
              <div className="relative flex flex-col items-center px-3">
                {/* Left half horizontal bar */}
                <div className="absolute top-0 left-0 h-0.5 w-1/2 bg-[var(--color-border)]" />
                {/* Vertical stub */}
                <div className="h-5 shrink-0 border-l-2 border-[var(--color-border)]" />

                {/* Area 2 card */}
                <div
                  className="flex min-w-[140px] items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm"
                  style={{ borderLeftWidth: 4, borderLeftColor: 'var(--color-bg-tertiary)' }}
                >
                  <div className="h-5 w-5 rounded bg-[var(--color-bg-tertiary)]" />
                  <div className="h-4 w-14 rounded bg-[var(--color-bg-tertiary)]" />
                  <div className="ml-auto h-4 w-5 rounded-full bg-[var(--color-bg-tertiary)]" />
                </div>

                {/* Connector: area 2 → goal */}
                <div className="h-5 shrink-0 border-l-2 border-[var(--color-border)]" />

                {/* Single goal under Area 2 (no horizontal bar, only child) */}
                <div className="flex flex-col items-center">
                  <div className="flex min-w-[150px] items-center gap-2 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm">
                    <div className="h-4 w-4 rounded bg-[var(--color-bg-tertiary)]" />
                    <div className="h-4 w-28 rounded bg-[var(--color-bg-tertiary)]" />
                    <div className="ml-auto h-4 w-10 rounded-full bg-[var(--color-bg-tertiary)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom controls skeleton */}
      <div className="absolute bottom-6 left-6 z-20">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]/90 px-2 py-1.5 shadow-md backdrop-blur-sm">
          <div className="h-[44px] w-[44px] rounded-lg bg-[var(--color-bg-tertiary)]" />
          <div className="h-[44px] w-12 rounded-lg bg-[var(--color-bg-tertiary)]" />
          <div className="h-[44px] w-[44px] rounded-lg bg-[var(--color-bg-tertiary)]" />
          <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
          <div className="h-[44px] w-[44px] rounded-lg bg-[var(--color-bg-tertiary)]" />
          <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
          <div className="h-[44px] w-[44px] rounded-lg bg-[var(--color-bg-tertiary)]" />
        </div>
      </div>
    </div>
  )
}
