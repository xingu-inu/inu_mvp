'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import type { Area, Goal } from '@/types/entities'
import type {
  AiRoadmapDiagnosisResponse,
  DiagnosisAreaData,
  DiagnosisGoalData,
  DiagnosisStats,
  DiagnosisTaskData,
} from '@/lib/ai/types'
import type { BalanceOverlay } from './types'

// ── Helpers ─────────────────────────────────────────────────

function buildMinimalContext(areas: Area[], goals: Goal[], directionStatement?: string | null) {
  const diagAreas: DiagnosisAreaData[] = areas.map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji ?? '',
    type: a.type ?? '',
    why: a.why ?? null,
  }))

  const diagGoals: DiagnosisGoalData[] = goals.map((g) => ({
    id: g.id,
    areaId: g.area_id ?? '',
    name: g.name,
    why: g.why ?? null,
    status: g.status ?? 'active',
    targetDate: g.target_date ?? null,
    groupCount: 0,
    taskCount: 0,
  }))

  const activeGoals = goals.filter((g) => g.status === 'active' || g.status === 'maintenance')
  const backlogGoals = goals.filter((g) => g.status === 'backlog')

  const stats: DiagnosisStats = {
    totalAreas: areas.length,
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    backlogGoals: backlogGoals.length,
    totalTasks: 0,
    goalsWithoutWhy: goals.filter((g) => !g.why).length,
    areasWithoutWhy: areas.filter((a) => !a.why).length,
    tasksWithoutWhy: 0,
    goalsWithoutTasks: 0,
    avgTasksPerGoal: 0,
  }

  return {
    direction: directionStatement ?? null,
    areas: diagAreas,
    goals: diagGoals,
    tasks: [] as DiagnosisTaskData[],
    stats,
  }
}

/** Map diagnosis observations → per-node visual overlays */
function mapDiagnosisToOverlays(response: AiRoadmapDiagnosisResponse): Map<string, BalanceOverlay> {
  const result = new Map<string, BalanceOverlay>()

  for (const obs of response.observations) {
    for (const finding of obs.findings) {
      const action = finding.action
      if (!action || action.type === 'none') continue

      let level: BalanceOverlay['level'] = 'warning'

      if (action.targetType === 'area' && action.type === 'add-goal') {
        level = 'critical'
      } else if (
        action.targetType === 'goal' &&
        (action.type === 'pause-goal' ||
          action.type === 'add-task' ||
          action.type === 'set-deadline')
      ) {
        level = 'warning'
      }

      const existing = result.get(action.targetId)
      // Only upgrade, never downgrade
      if (existing && existing.level === 'critical') continue

      result.set(action.targetId, {
        nodeId: action.targetId,
        level,
        message: finding.text,
      })
    }
  }

  return result
}

// ── Hook ────────────────────────────────────────────────────

export function useAiBalanceOverlay(
  areas: Area[],
  goals: Goal[],
  directionStatement?: string | null
) {
  const [isActive, setIsActive] = useState(false)
  const [overlays, setOverlays] = useState<Map<string, BalanceOverlay>>(new Map())
  const cachedRef = useRef<Map<string, BalanceOverlay> | null>(null)
  const { mutate, isPending } = useAiSuggest()

  // Invalidate cache when inputs change
  useEffect(() => {
    cachedRef.current = null
  }, [areas, goals, directionStatement])

  const toggle = useCallback(() => {
    if (isActive) {
      // Turning OFF — keep cache, clear active overlays
      setIsActive(false)
      setOverlays(new Map())
      return
    }

    // Turning ON
    setIsActive(true)

    if (cachedRef.current) {
      setOverlays(cachedRef.current)
      return
    }

    const context = buildMinimalContext(areas, goals, directionStatement)
    mutate(
      { type: 'roadmap-diagnosis', scope: 'full', context },
      {
        onSuccess: (data) => {
          const mapped = mapDiagnosisToOverlays(data as AiRoadmapDiagnosisResponse)
          cachedRef.current = mapped
          setOverlays(mapped)
        },
        onError: () => {
          setIsActive(false)
        },
      }
    )
  }, [isActive, areas, goals, directionStatement, mutate])

  return { overlays, isActive, isLoading: isPending && isActive, toggle }
}
