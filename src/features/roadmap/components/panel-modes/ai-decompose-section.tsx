'use client'

import { AlertCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { AiDecomposePreview } from '../ai-decompose-preview'
import type { AiDecomposeResponse } from '@/lib/ai/types'

interface AiDecomposeSectionProps {
  isPending: boolean
  error: Error | null
  decomposeData: AiDecomposeResponse | null
  goalId: string
  onComplete: () => void
  onCancel: () => void
}

export function AiDecomposeSection({
  isPending,
  error,
  decomposeData,
  goalId,
  onComplete,
  onCancel,
}: AiDecomposeSectionProps) {
  return (
    <>
      {/* Loading skeleton */}
      {isPending && (
        <div className="space-y-2 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-tertiary)]"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isPending && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-miss)]/10 px-3 py-2 text-sm text-[var(--color-miss)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Preview */}
      <AnimatePresence>
        {decomposeData?.groups && decomposeData.groups.length > 0 && (
          <AiDecomposePreview
            goalId={goalId}
            groups={decomposeData.groups}
            onComplete={onComplete}
            onCancel={onCancel}
          />
        )}
      </AnimatePresence>
    </>
  )
}
