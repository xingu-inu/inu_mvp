import { cn } from '@/lib/utils'

interface WhyChainDisplayProps {
  areaName: string
  areaEmoji: string
  areaWhy: string | null
  goalName: string
  goalWhy: string | null
}

export function WhyChainDisplay({
  areaName,
  areaEmoji,
  areaWhy,
  goalName,
  goalWhy,
}: WhyChainDisplayProps) {
  const bothNull = areaWhy === null && goalWhy === null

  return (
    <div className={cn('rounded-lg bg-[var(--color-bg-secondary)] p-3')}>
      {/* Area */}
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {areaEmoji} {areaName}
        </p>
        {areaWhy && (
          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)] italic">
            &ldquo;{areaWhy}&rdquo;
          </p>
        )}
      </div>

      {/* Connector */}
      <div className="my-1.5 pl-1 text-xs text-[var(--color-text-tertiary)]">↓</div>

      {/* Goal */}
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">🎯 {goalName}</p>
        {goalWhy && (
          <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)] italic">
            &ldquo;{goalWhy}&rdquo;
          </p>
        )}
      </div>

      {bothNull && (
        <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
          아직 이유가 작성되지 않았어요
        </p>
      )}
    </div>
  )
}
