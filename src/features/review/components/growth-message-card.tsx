'use client'

import { Lightbulb } from 'lucide-react'

interface GrowthMessageCardProps {
  message: string
}

export function GrowthMessageCard({ message }: GrowthMessageCardProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-[var(--color-primary-50)] p-3.5">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary-500)]" />
      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{message}</p>
    </div>
  )
}
