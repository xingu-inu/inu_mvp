import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import type { AncestorWhy } from '../types'

interface WhyChainTooltipProps {
  ancestorWhys: AncestorWhy[]
  currentName: string
  currentWhy?: string | null
}

export const WhyChainTooltip = memo(function WhyChainTooltip({
  ancestorWhys,
  currentName,
  currentWhy,
}: WhyChainTooltipProps) {
  // Only show if there's at least one why in the chain
  const hasAnyWhy = ancestorWhys.some((a) => a.why) || currentWhy
  if (!hasAnyWhy) return null

  const items = [
    ...ancestorWhys.map((a) => ({ name: a.name, why: a.why })),
    { name: currentName, why: currentWhy },
  ]

  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[320px] -translate-x-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 opacity-0 shadow-lg transition-opacity duration-200 group-hover/why:opacity-100">
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
            )}
            <span className="font-medium text-[var(--color-text-primary)]">{item.name}</span>
            {item.why && (
              <span className="text-[var(--color-text-tertiary)] italic">
                &ldquo;{item.why}&rdquo;
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
})
