'use client'

import { useState, useCallback, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { ResponsiveModal, ModalBody } from '@/components/ui/responsive-modal'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { useTasks } from '@/queries/use-tasks'
import { useDiagnosisActions } from '../../hooks/use-diagnosis-actions'
import { DiagnosisScopeStep } from './diagnosis-scope-step'
import { DiagnosisResultStep } from './diagnosis-result-step'
import type {
  DiagnosisScope,
  AiRoadmapDiagnosisResponse,
  AiRoadmapDiagnosisContext,
  DiagnosisAreaData,
  DiagnosisGoalData,
  DiagnosisTaskData,
  DiagnosisStats,
} from '@/lib/ai/types'
import type { Area, Goal, Task } from '@/types/entities'

type DiagnosisStep = 'scope' | 'loading' | 'result'

interface RoadmapDiagnosisModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areas: Area[]
  goals: Goal[]
  directionStatement?: string | null
  initialScope?: DiagnosisScope | null
  initialTargetId?: string | null
}

const STEP_TITLES: Record<DiagnosisStep, string> = {
  scope: '로드맵 진단',
  loading: '분석하는 중...',
  result: '진단 결과',
}

const STEP_DESCRIPTIONS: Record<DiagnosisStep, string | undefined> = {
  scope: '어떤 범위를 진단할까요?',
  loading: undefined,
  result: undefined,
}

// ── Context builder ──

function buildDiagnosisContext(
  scope: DiagnosisScope,
  targetId: string | null,
  areas: Area[],
  goals: Goal[],
  allTasks: Task[],
  directionStatement?: string | null
): AiRoadmapDiagnosisContext {
  let filteredAreas: Area[]
  let filteredGoals: Goal[]
  let filteredTasks: Task[]

  switch (scope) {
    case 'area': {
      filteredAreas = areas.filter((a) => a.id === targetId)
      filteredGoals = goals.filter((g) => g.area_id === targetId)
      const goalIds = new Set(filteredGoals.map((g) => g.id))
      filteredTasks = allTasks.filter((t) => t.goal_id && goalIds.has(t.goal_id))
      break
    }
    case 'goal': {
      const goal = goals.find((g) => g.id === targetId)
      filteredGoals = goal ? [goal] : []
      filteredAreas = goal ? areas.filter((a) => a.id === goal.area_id) : []
      filteredTasks = allTasks.filter((t) => t.goal_id === targetId)
      break
    }
    default: {
      // 'full'
      filteredAreas = areas
      filteredGoals = goals
      filteredTasks = allTasks
    }
  }

  const diagnosisAreas: DiagnosisAreaData[] = filteredAreas.map((a) => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    type: a.type || 'custom',
    why: a.why,
  }))

  const diagnosisGoals: DiagnosisGoalData[] = filteredGoals.map((g) => ({
    id: g.id,
    areaId: g.area_id,
    name: g.name,
    why: g.why,
    status: g.status,
    targetDate: g.target_date,
    groupCount: g.groups?.length ?? 0,
    taskCount: g.tasks?.length ?? 0,
  }))

  const diagnosisTasks: DiagnosisTaskData[] = filteredTasks.map((t) => ({
    id: t.id,
    goalId: t.goal_id ?? '',
    name: t.name,
    why: t.why,
    repeatType: t.repeat_type,
    timeSlot: t.time_slot,
    durationMinutes: t.duration_minutes,
    streakCount: t.streak_count,
  }))

  const activeGoals = filteredGoals.filter((g) => g.status === 'active')
  const backlogGoals = filteredGoals.filter((g) => g.status === 'backlog')
  const goalsWithoutTasks = filteredGoals.filter(
    (g) => !filteredTasks.some((t) => t.goal_id === g.id)
  )
  const avgTasksPerGoal =
    filteredGoals.length > 0
      ? Math.round((filteredTasks.length / filteredGoals.length) * 10) / 10
      : 0

  const stats: DiagnosisStats = {
    totalAreas: filteredAreas.length,
    totalGoals: filteredGoals.length,
    activeGoals: activeGoals.length,
    backlogGoals: backlogGoals.length,
    totalTasks: filteredTasks.length,
    goalsWithoutWhy: filteredGoals.filter((g) => !g.why).length,
    areasWithoutWhy: filteredAreas.filter((a) => !a.why).length,
    tasksWithoutWhy: filteredTasks.filter((t) => !t.why).length,
    goalsWithoutTasks: goalsWithoutTasks.length,
    avgTasksPerGoal,
  }

  return {
    direction: directionStatement ?? null,
    areas: diagnosisAreas,
    goals: diagnosisGoals,
    tasks: diagnosisTasks,
    stats,
  }
}

export function RoadmapDiagnosisModal({
  open,
  onOpenChange,
  areas,
  goals,
  directionStatement,
  initialScope,
  initialTargetId,
}: RoadmapDiagnosisModalProps) {
  const [step, setStep] = useState<DiagnosisStep>('scope')
  const [selectedScope, setSelectedScope] = useState<DiagnosisScope>(initialScope ?? 'full')
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(initialTargetId ?? null)
  const [diagnosis, setDiagnosis] = useState<AiRoadmapDiagnosisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const aiSuggest = useAiSuggest()
  const { data: allTasks = [] } = useTasks()
  const { handleAction } = useDiagnosisActions(() => onOpenChange(false), allTasks)

  // Auto-start when initialScope is set (e.g., from goal-view-mode)
  const [autoStarted, setAutoStarted] = useState(false)
  useEffect(() => {
    if (open && initialScope && !autoStarted) {
      setAutoStarted(true)
      setSelectedScope(initialScope)
      setSelectedTargetId(initialTargetId ?? null)
      // Small timeout to ensure state is settled before starting
      setTimeout(() => {
        startDiagnosis(initialScope, initialTargetId ?? null)
      }, 0)
    }
    if (!open) {
      setAutoStarted(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialScope, initialTargetId])

  const startDiagnosis = useCallback(
    (scope: DiagnosisScope, targetId: string | null) => {
      setStep('loading')
      setError(null)

      const context = buildDiagnosisContext(
        scope,
        targetId,
        areas,
        goals,
        allTasks,
        directionStatement
      )

      aiSuggest.mutate(
        {
          type: 'roadmap-diagnosis',
          scope,
          targetId: targetId ?? undefined,
          context,
        },
        {
          onSuccess: (data) => {
            const response = data as AiRoadmapDiagnosisResponse
            setDiagnosis(response)
            setStep('result')
          },
          onError: (err) => {
            setError(err.message || 'AI 분석에 실패했어요. 다시 시도해주세요.')
            setStep('scope')
          },
        }
      )
    },
    [areas, goals, allTasks, directionStatement, aiSuggest]
  )

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Prevent closing during loading
      if (!newOpen && step === 'loading') return
      if (!newOpen) {
        // Reset state on close
        setStep('scope')
        setSelectedScope(initialScope ?? 'full')
        setSelectedTargetId(initialTargetId ?? null)
        setDiagnosis(null)
        setError(null)
      }
      onOpenChange(newOpen)
    },
    [step, onOpenChange, initialScope, initialTargetId]
  )

  const handleStart = useCallback(() => {
    startDiagnosis(selectedScope, selectedTargetId)
  }, [selectedScope, selectedTargetId, startDiagnosis])

  const handleRetry = useCallback(() => {
    startDiagnosis(selectedScope, selectedTargetId)
  }, [selectedScope, selectedTargetId, startDiagnosis])

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title={STEP_TITLES[step]}
      description={STEP_DESCRIPTIONS[step]}
    >
      {step === 'scope' && (
        <>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <DiagnosisScopeStep
            areas={areas}
            goals={goals}
            selectedScope={selectedScope}
            selectedTargetId={selectedTargetId}
            onScopeChange={setSelectedScope}
            onTargetChange={setSelectedTargetId}
            onStart={handleStart}
            onCancel={() => handleOpenChange(false)}
          />
        </>
      )}

      {step === 'loading' && (
        <ModalBody>
          <div className="flex flex-col items-center gap-5 py-12">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)]">
              <Sparkles className="h-8 w-8 animate-pulse text-[var(--color-primary-500)]" />
              <Loader2 className="absolute -right-1.5 -bottom-1.5 h-5 w-5 animate-spin text-[var(--color-primary-400)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                로드맵을 분석하고 있어요
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                구조, 동기, 실천 패턴을 살펴보는 중...
              </p>
            </div>
          </div>
        </ModalBody>
      )}

      {step === 'result' && diagnosis && (
        <DiagnosisResultStep
          diagnosis={diagnosis}
          onRetry={handleRetry}
          onClose={() => handleOpenChange(false)}
          onAction={handleAction}
        />
      )}
    </ResponsiveModal>
  )
}
