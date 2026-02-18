'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Compass,
  Target,
  CheckCircle2,
  Heart,
  Settings,
  Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { FormSection } from '@/features/roadmap/components/shared/form-section'
import { AiSuggestionPanel } from '@/components/common/ai-suggestion-panel'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection, useCreateRoadmapVersion } from '@/queries/use-direction'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { toast } from 'sonner'
import { SAMPLE_DIRECTION_STATEMENTS, SAMPLE_DIRECTION_WHYS } from '@/lib/constants/onboarding'
import type { AiSuggestion } from '@/components/common/ai-suggestion-panel'
import type { AiWhyVisionResponse, AiSuggestionItem } from '@/lib/ai/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DIRECTION_MAX_LENGTH = 200
const WHY_MAX_LENGTH = 500
const NAME_MAX_LENGTH = 100

const STEPS = [
  { number: 1, icon: Compass, label: '방향' },
  { number: 2, icon: Target, label: '목표' },
  { number: 3, icon: CheckCircle2, label: '확인' },
] as const

const STATUS_LABELS: Record<string, string> = {
  active: '진행 중',
  maintenance: '유지',
  backlog: '백로그',
  paused: '일시정지',
  completed: '완료',
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NewVersionWizard() {
  const isOpen = useRoadmapStore((s) => s.isNewVersionWizardOpen)
  const setIsOpen = useRoadmapStore((s) => s.setIsNewVersionWizardOpen)

  const { data: currentDirection } = useDirection()
  const { data: goals = [], isLoading: isGoalsLoading } = useGoals()
  const { data: areas = [] } = useAreas()
  const createVersion = useCreateRoadmapVersion()
  const aiSuggest = useAiSuggest()

  const [step, setStep] = useState(1)
  const [slideDirection, setSlideDirection] = useState(0)
  const [statement, setStatement] = useState('')
  const [why, setWhy] = useState('')
  const [name, setName] = useState('')
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])
  const [aiWhySuggestions, setAiWhySuggestions] = useState<AiSuggestionItem[]>([])

  const isDirty = statement.trim() !== '' || why.trim() !== '' || name.trim() !== ''

  // Initialize selected goals when opening
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setStep(1)
        setSlideDirection(0)
        setStatement('')
        setWhy('')
        setName('')
        setAiWhySuggestions([])
        // Pre-select active/maintenance goals
        const activeGoalIds = goals
          .filter((g) => g.status === 'active' || g.status === 'maintenance')
          .map((g) => g.id)
        setSelectedGoalIds(activeGoalIds)
      } else {
        // Close protection
        if (isDirty && !window.confirm('작성 중인 내용이 있습니다. 닫으시겠습니까?')) {
          return
        }
      }
      setIsOpen(open)
    },
    [goals, isDirty, setIsOpen]
  )

  const goNext = useCallback(() => {
    setSlideDirection(1)
    setStep((prev) => Math.min(prev + 1, 3))
  }, [])

  const goPrev = useCallback(() => {
    setSlideDirection(-1)
    setStep((prev) => Math.max(prev - 1, 1))
  }, [])

  const toggleGoal = useCallback((goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    )
  }, [])

  const handleConfirm = async () => {
    try {
      await createVersion.mutateAsync({
        statement: statement.trim(),
        why: why.trim() || undefined,
        name: name.trim() || undefined,
        carryOverGoalIds: selectedGoalIds,
      })
      toast.success('새 로드맵이 시작되었습니다!')
      setIsOpen(false)
    } catch {
      toast.error('새 로드맵 생성에 실패했습니다.')
    }
  }

  // Group goals by area for display
  const goalsByArea = useMemo(
    () =>
      areas
        .map((area) => ({
          area,
          goals: goals.filter((g) => g.area_id === area.id),
        }))
        .filter((group) => group.goals.length > 0),
    [areas, goals]
  )

  // Area-level toggle helpers
  const toggleAreaGoals = useCallback(
    (areaGoalIds: string[]) => {
      const allSelected = areaGoalIds.every((id) => selectedGoalIds.includes(id))
      if (allSelected) {
        setSelectedGoalIds((prev) => prev.filter((id) => !areaGoalIds.includes(id)))
      } else {
        setSelectedGoalIds((prev) => [...new Set([...prev, ...areaGoalIds])])
      }
    },
    [selectedGoalIds]
  )

  // AI why suggestion handler
  const handleWhyGenerate = useCallback(() => {
    aiSuggest.mutate(
      {
        type: 'why-vision',
        context: {
          direction: statement || currentDirection?.statement,
        },
        target: 'direction-why',
      },
      {
        onSuccess: (data) => {
          const res = data as AiWhyVisionResponse
          setAiWhySuggestions(res.suggestions || [])
        },
      }
    )
  }, [aiSuggest, statement, currentDirection?.statement])

  const handleWhySelect = useCallback((suggestion: AiSuggestion) => {
    setWhy(suggestion.text)
  }, [])

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="새 로드맵 만들기"
      description="새로운 방향, 새로운 시작"
    >
      <div className="space-y-6 p-1">
        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* Step Content with Slide Animation */}
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={step}
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Step 1: New Direction */}
            {step === 1 && (
              <StepDirection
                currentDirection={currentDirection}
                statement={statement}
                setStatement={setStatement}
                why={why}
                setWhy={setWhy}
                name={name}
                setName={setName}
                aiSuggest={aiSuggest}
                aiWhySuggestions={aiWhySuggestions}
                onWhyGenerate={handleWhyGenerate}
                onWhySelect={handleWhySelect}
              />
            )}

            {/* Step 2: Goal Carry Over */}
            {step === 2 && (
              <StepGoals
                isLoading={isGoalsLoading}
                goalsByArea={goalsByArea}
                selectedGoalIds={selectedGoalIds}
                toggleGoal={toggleGoal}
                toggleAreaGoals={toggleAreaGoals}
              />
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <StepConfirm
                currentDirection={currentDirection}
                statement={statement}
                selectedGoalIds={selectedGoalIds}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={goPrev}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              이전
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button onClick={goNext} disabled={step === 1 && !statement.trim()}>
              다음
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={createVersion.isPending}>
              {createVersion.isPending ? '생성 중...' : '새 로드맵 시작'}
            </Button>
          )}
        </div>
      </div>
    </ResponsiveModal>
  )
}

/* ------------------------------------------------------------------ */
/*  Step Indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((s, index) => {
        const isActive = s.number === currentStep
        const isCompleted = s.number < currentStep
        const isPending = s.number > currentStep
        const Icon = s.icon

        return (
          <div key={s.number} className="flex items-center">
            {/* Connector line (before step, except first) */}
            {index > 0 && (
              <div
                className={`h-[2px] w-8 transition-colors ${
                  s.number <= currentStep
                    ? 'bg-[var(--color-primary-500)]/40'
                    : 'bg-[var(--color-border)]'
                }`}
              />
            )}

            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'border-[var(--color-primary-500)]/40 bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)]'
                    : isActive
                      ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-[10px] transition-colors ${
                  isActive
                    ? 'font-bold text-[var(--color-primary-500)]'
                    : isCompleted
                      ? 'font-medium text-[var(--color-primary-500)]/60'
                      : isPending
                        ? 'text-[var(--color-text-tertiary)]'
                        : ''
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 1: Direction                                                  */
/* ------------------------------------------------------------------ */

interface StepDirectionProps {
  currentDirection: { statement: string; version: number; why: string | null } | null | undefined
  statement: string
  setStatement: (v: string) => void
  why: string
  setWhy: (v: string) => void
  name: string
  setName: (v: string) => void
  aiSuggest: ReturnType<typeof useAiSuggest>
  aiWhySuggestions: AiSuggestionItem[]
  onWhyGenerate: () => void
  onWhySelect: (suggestion: AiSuggestion) => void
}

function StepDirection({
  currentDirection,
  statement,
  setStatement,
  why,
  setWhy,
  name,
  setName,
  aiSuggest,
  aiWhySuggestions,
  onWhyGenerate,
  onWhySelect,
}: StepDirectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">새로운 방향 설정</h3>

      {/* Current direction display */}
      {currentDirection && (
        <div className="rounded-xl border-l-2 border-l-[var(--color-primary-500)] bg-[var(--color-bg-secondary)] p-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--color-text-tertiary)]">지금까지의 방향</p>
            <span className="rounded-full bg-[var(--color-primary-500)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary-500)]">
              v{currentDirection.version}
            </span>
          </div>
          <p className="mt-1 text-sm">{currentDirection.statement}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* New direction input */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            새로운 방향 <span className="text-[var(--color-miss)]">*</span>
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="앞으로 어떤 삶을 살고 싶은가요?"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm outline-none focus:border-[var(--color-primary-500)]"
            rows={2}
            maxLength={DIRECTION_MAX_LENGTH}
          />
          <p className="mt-0.5 text-right text-xs text-[var(--color-text-tertiary)]">
            {statement.length}/{DIRECTION_MAX_LENGTH}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_DIRECTION_STATEMENTS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => setStatement(statement === text ? '' : text)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                  statement === text
                    ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]/50'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {/* Why field - special styling */}
        <div className="space-y-2 rounded-lg bg-[var(--color-primary-50)]/40 p-2.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary-600)]">
            <Heart className="h-3.5 w-3.5" />왜 이 방향인가요?
          </label>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="이 방향이 나에게 중요한 이유"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm outline-none focus:border-[var(--color-primary-500)]"
            rows={2}
            maxLength={WHY_MAX_LENGTH}
          />
          <p className="text-right text-xs text-[var(--color-text-tertiary)]">
            {why.length}/{WHY_MAX_LENGTH}
          </p>

          {/* Example why chips */}
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_DIRECTION_WHYS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => setWhy(text)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                  why === text
                    ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-200)] hover:bg-[var(--color-primary-50)]/50'
                }`}
              >
                {text}
              </button>
            ))}
          </div>

          {/* AI suggestion panel for why */}
          <AiSuggestionPanel
            triggerLabel="AI로 이유 찾기"
            isLoading={aiSuggest.isPending}
            error={aiSuggest.error}
            suggestions={aiWhySuggestions}
            selectedValue={why}
            onSelect={onWhySelect}
            onGenerate={onWhyGenerate}
            showDescriptions={false}
          />
        </div>

        {/* Version name - inside FormSection */}
        <FormSection
          icon={Settings}
          label="추가 설정"
          defaultOpen={false}
          preview={name || undefined}
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              버전 이름 (선택)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2026년 하반기 로드맵"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2.5 text-sm outline-none focus:border-[var(--color-primary-500)]"
              maxLength={NAME_MAX_LENGTH}
            />
          </div>
        </FormSection>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 2: Goal Selection                                             */
/* ------------------------------------------------------------------ */

interface GoalsByAreaItem {
  area: { id: string; name: string; emoji: string }
  goals: Array<{
    id: string
    name: string
    status: string
    tasks?: Array<{ id: string }>
    area_id: string
  }>
}

interface StepGoalsProps {
  isLoading: boolean
  goalsByArea: GoalsByAreaItem[]
  selectedGoalIds: string[]
  toggleGoal: (goalId: string) => void
  toggleAreaGoals: (areaGoalIds: string[]) => void
}

function StepGoals({
  isLoading,
  goalsByArea,
  selectedGoalIds,
  toggleGoal,
  toggleAreaGoals,
}: StepGoalsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">이어갈 목표 선택</h3>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          {selectedGoalIds.length > 0 ? (
            <span className="font-medium text-[var(--color-primary-500)]">
              {selectedGoalIds.length}개 선택됨
            </span>
          ) : (
            '선택한 목표와 하위 그룹/태스크가 새 로드맵으로 복사됩니다'
          )}
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-[var(--color-text-tertiary)]">불러오는 중...</p>
        </div>
      )}

      {/* Goal list */}
      {!isLoading && goalsByArea.length > 0 && (
        <div className="max-h-[400px] space-y-4 overflow-y-auto">
          {goalsByArea.map(({ area, goals: areaGoals }) => {
            const areaGoalIds = areaGoals.map((g) => g.id)
            const selectedCount = areaGoalIds.filter((id) => selectedGoalIds.includes(id)).length
            const allSelected = selectedCount === areaGoalIds.length
            const someSelected = selectedCount > 0 && !allSelected

            return (
              <div key={area.id}>
                {/* Area header with select-all toggle */}
                <label className="mb-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={() => toggleAreaGoals(areaGoalIds)}
                    className="h-4 w-4 rounded accent-[var(--color-primary-500)]"
                  />
                  <span>{area.emoji}</span>
                  <span className="text-sm font-medium">{area.name}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    ({selectedCount}/{areaGoalIds.length})
                  </span>
                </label>

                {/* Goals in area */}
                <div className="space-y-1.5 pl-6">
                  {areaGoals.map((goal) => {
                    const isSelected = selectedGoalIds.includes(goal.id)
                    return (
                      <label
                        key={goal.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--color-bg-secondary)] ${
                          isSelected ? 'bg-[var(--color-primary-50)]/50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleGoal(goal.id)}
                          className="h-4 w-4 rounded accent-[var(--color-primary-500)]"
                        />
                        <div className="flex-1">
                          <p className="text-sm">{goal.name}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            {STATUS_LABELS[goal.status] ?? goal.status}
                            {goal.tasks && ` \u00b7 ${goal.tasks.length}개 태스크`}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && goalsByArea.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <span className="text-4xl">🗺️</span>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            아직 목표가 없어요
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            새 로드맵에서 첫 목표를 만들어보세요
          </p>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 3: Confirmation                                               */
/* ------------------------------------------------------------------ */

interface StepConfirmProps {
  currentDirection: { statement: string; version: number } | null | undefined
  statement: string
  selectedGoalIds: string[]
}

function StepConfirm({ currentDirection, statement, selectedGoalIds }: StepConfirmProps) {
  const currentVersion = currentDirection?.version ?? 0
  const nextVersion = currentVersion + 1

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">확인</h3>

      {/* New direction quote */}
      {statement.trim() && (
        <div className="rounded-xl bg-[var(--color-bg-secondary)] p-4 text-center">
          <p className="text-base leading-relaxed text-[var(--color-primary-500)] italic">
            &ldquo;{statement.trim()}&rdquo;
          </p>
        </div>
      )}

      {/* Before / After summary */}
      <div className="space-y-3 rounded-xl bg-[var(--color-bg-secondary)] p-4">
        {/* Version change */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-text-tertiary)]" />
          <p className="text-sm">
            <span className="font-medium">v{currentVersion}</span>
            <span className="mx-1.5 text-[var(--color-text-tertiary)]">&rarr;</span>
            <span className="font-medium text-[var(--color-primary-500)]">v{nextVersion}</span>
          </p>
        </div>

        {/* Direction change */}
        {currentDirection && statement.trim() && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-text-tertiary)]" />
            <p className="text-sm leading-snug">
              <span className="text-[var(--color-text-tertiary)]">
                &ldquo;
                {currentDirection.statement.length > 30
                  ? currentDirection.statement.slice(0, 30) + '...'
                  : currentDirection.statement}
                &rdquo;
              </span>
              <span className="mx-1.5 text-[var(--color-text-tertiary)]">&rarr;</span>
              <span className="font-medium">
                &ldquo;
                {statement.trim().length > 30
                  ? statement.trim().slice(0, 30) + '...'
                  : statement.trim()}
                &rdquo;
              </span>
            </p>
          </div>
        )}

        {/* Goal carry-over */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary-500)]" />
          <p className="text-sm">
            <span className="font-medium text-[var(--color-primary-500)]">
              {selectedGoalIds.length}개
            </span>{' '}
            목표 이어감
          </p>
        </div>

        {/* Archive notice */}
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 shrink-0 rounded-full text-[var(--color-done)]"
            style={{ backgroundColor: 'var(--color-done, #22c55e)' }}
          />
          <p className="text-sm">
            현재 로드맵{currentDirection ? ` (v${currentVersion})` : ''}이 아카이브됩니다
          </p>
        </div>
      </div>

      {/* Encouragement card */}
      <div className="rounded-xl bg-[var(--color-primary-500)]/5 p-4">
        <div className="flex gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary-500)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-primary-500)]">
              새로운 시작은 용기 있는 선택이에요
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              지금까지의 기록은 모두 보존됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
