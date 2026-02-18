'use client'

import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { ModalBody } from '@/components/ui/responsive-modal'
import type { ApplyProgress } from '../../hooks/use-brain-dump-apply'

interface BrainDumpApplyStepProps {
  progress: ApplyProgress
}

export function BrainDumpApplyStep({ progress }: BrainDumpApplyStepProps) {
  const { total, completed, failed } = progress
  const done = completed + failed
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <ModalBody>
      <div className="flex flex-col items-center gap-5 py-6">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary-500)]" />

        <div className="text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            항목을 추가하고 있어요...
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {done}/{total}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-2 rounded-full bg-[var(--color-bg-tertiary)]">
            <div
              className="h-2 rounded-full bg-[var(--color-primary-500)] transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Status counts */}
        <div className="flex gap-4 text-xs text-[var(--color-text-tertiary)]">
          {completed > 0 && (
            <span className="flex items-center gap-1 text-[var(--color-done)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completed} 완료
            </span>
          )}
          {failed > 0 && (
            <span className="flex items-center gap-1 text-[var(--color-miss)]">
              <XCircle className="h-3.5 w-3.5" />
              {failed} 실패
            </span>
          )}
        </div>
      </div>
    </ModalBody>
  )
}
