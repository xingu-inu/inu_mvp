'use client'

import { RoadmapDiagnosisModal } from '@/features/roadmap/components/roadmap-diagnosis'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore } from '@/stores/roadmap.store'

/**
 * AI Modals (Diagnosis) — mounted once at page level
 * for both desktop and mobile. Triggered via store state from
 * GoalBrowsePanel (desktop) or MobileRoadmapFab (mobile).
 */
export function RoadmapAiModals() {
  const { data: areas = [] } = useAreas()
  const { data: goals = [] } = useGoals()
  const { data: direction } = useDirection()

  const isDiagnosisOpen = useRoadmapStore((s) => s.isDiagnosisOpen)
  const setIsDiagnosisOpen = useRoadmapStore((s) => s.setIsDiagnosisOpen)
  const diagnosisInitialScope = useRoadmapStore((s) => s.diagnosisInitialScope)
  const diagnosisInitialTargetId = useRoadmapStore((s) => s.diagnosisInitialTargetId)

  return (
    <RoadmapDiagnosisModal
      open={isDiagnosisOpen}
      onOpenChange={setIsDiagnosisOpen}
      areas={areas}
      goals={goals}
      directionStatement={direction?.statement}
      initialScope={diagnosisInitialScope}
      initialTargetId={diagnosisInitialTargetId}
    />
  )
}
