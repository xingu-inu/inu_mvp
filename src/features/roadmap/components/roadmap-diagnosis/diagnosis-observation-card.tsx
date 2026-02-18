'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiagnosisObservation, DiagnosisAction } from '@/lib/ai/types'

interface DiagnosisObservationCardProps {
  observation: DiagnosisObservation
  isExpanded: boolean
  onToggle: () => void
  onAction: (action: DiagnosisAction | undefined) => void
}

function FindingRow({
  finding,
  onAction,
}: {
  finding: DiagnosisObservation['findings'][number]
  onAction: (action: DiagnosisAction | undefined) => void
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-text-quaternary)]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--color-text-secondary)]">{finding.text}</p>
        {finding.action && finding.action.type !== 'none' && (
          <button
            onClick={() => onAction(finding.action)}
            className="mt-1 text-xs font-medium text-[var(--color-primary-500)] transition-colors hover:text-[var(--color-primary-600)]"
          >
            {finding.action.label} →
          </button>
        )}
      </div>
    </div>
  )
}

export function DiagnosisObservationCard({
  observation,
  isExpanded,
  onToggle,
  onAction,
}: DiagnosisObservationCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-3 py-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
      >
        <span className="text-base">{observation.emoji}</span>
        <div className="min-w-0 flex-1 text-left">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {observation.title}
          </span>
          <p className="truncate text-xs text-[var(--color-text-tertiary)]">
            {observation.description}
          </p>
        </div>

        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--color-text-quaternary)]" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--color-text-quaternary)]" />
        )}
      </button>

      {/* Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border)] px-3 py-2">
              {observation.findings.map((finding, idx) => (
                <FindingRow key={idx} finding={finding} onAction={onAction} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
