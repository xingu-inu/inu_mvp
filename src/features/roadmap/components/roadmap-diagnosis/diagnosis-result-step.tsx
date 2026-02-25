'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { DiagnosisObservationCard } from './diagnosis-observation-card'
import { AiIcon } from '@/components/common/ai-icon'
import type { AiRoadmapDiagnosisResponse, DiagnosisAction } from '@/lib/ai/types'

interface DiagnosisResultStepProps {
  diagnosis: AiRoadmapDiagnosisResponse
  onRetry: () => void
  onClose: () => void
  onAction: (action: DiagnosisAction | undefined) => void
}

const SCOPE_LABELS: Record<string, string> = {
  full: '전체 로드맵',
  area: '영역',
  goal: '목표',
}

export function DiagnosisResultStep({
  diagnosis,
  onRetry,
  onClose,
  onAction,
}: DiagnosisResultStepProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    () => diagnosis.observations[0]?.id ?? null
  )

  function toggleObservation(observationId: string) {
    setExpandedId((prev) => (prev === observationId ? null : observationId))
  }

  const scopeLabel = SCOPE_LABELS[diagnosis.scope] ?? diagnosis.scope
  const targetDisplay = diagnosis.targetName ? `${scopeLabel}: ${diagnosis.targetName}` : scopeLabel

  return (
    <>
      <ModalBody className="max-h-[60vh] overflow-y-auto">
        {/* Section 1: Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 rounded-2xl bg-[var(--color-bg-secondary)] px-4 py-5"
        >
          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--color-text-tertiary)]">
            {targetDisplay}
          </span>
          <AiIcon
            name={diagnosis.summary.icon}
            className="h-12 w-12 text-[var(--color-primary-500)]"
          />
          <p className="text-base font-semibold text-[var(--color-text-primary)]">
            {diagnosis.summary.label}
          </p>
          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            {diagnosis.summary.description}
          </p>
        </motion.div>

        {/* Section 2: Strengths */}
        {diagnosis.strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5"
          >
            <h3 className="mb-2 text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
              잘하고 있는 점
            </h3>
            <div className="space-y-1.5">
              {diagnosis.strengths.map((strength, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  className="flex items-start gap-2 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2"
                >
                  <AiIcon name={strength.icon} className="mt-0.5 text-[var(--color-primary-500)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {strength.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Section 3: Observations */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 space-y-2"
        >
          <h3 className="text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            함께 살펴볼 부분
          </h3>
          {diagnosis.observations.map((obs, idx) => (
            <motion.div
              key={obs.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + idx * 0.08 }}
            >
              <DiagnosisObservationCard
                observation={obs}
                isExpanded={expandedId === obs.id}
                onToggle={() => toggleObservation(obs.id)}
                onAction={onAction}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Section 4: Next Steps */}
        {diagnosis.nextSteps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-5"
          >
            <h3 className="mb-2 text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
              다음 한 걸음
            </h3>
            <div className="space-y-1.5">
              {diagnosis.nextSteps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2"
                >
                  <span className="flex-1 text-sm text-[var(--color-text-secondary)]">
                    {step.text}
                  </span>
                  {step.action && step.action.type !== 'none' && (
                    <button
                      onClick={() => onAction(step.action)}
                      className="flex-shrink-0 text-xs font-medium text-[var(--color-primary-500)] transition-colors hover:text-[var(--color-primary-600)]"
                    >
                      {step.action.label} &rarr;
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onRetry} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          다시 진단
        </Button>
        <Button onClick={onClose} className="flex-1">
          닫기
        </Button>
      </ModalFooter>
    </>
  )
}
