'use client'

import { useDirection } from '@/queries/use-direction'

interface VersionBadgeProps {
  version: number | null
}

/** Shows a small "v1" badge when viewing tasks from a past roadmap version */
export function VersionBadge({ version }: VersionBadgeProps) {
  const { data: currentDirection } = useDirection()
  const currentVersion = currentDirection?.version ?? null

  if (!version || !currentVersion || version === currentVersion) return null

  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
      v{version}
    </span>
  )
}
