'use client'

import { cn } from '@/lib/utils'
import type { AreaReviewData } from '../../hooks/use-review-roadmap-data'
import { useGoalReflection, useSaveGoalReflection } from '../../hooks'
import { useReviewPeriod } from '../../hooks'
import { WhyChainDisplay } from './why-chain-display'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface WhyTemperatureSectionProps {
  roadmapData: AreaReviewData[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TEMPERATURE_OPTIONS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '🥶', label: '전혀' },
  { value: 2, emoji: '😕', label: '조금' },
  { value: 3, emoji: '😐', label: '보통' },
  { value: 4, emoji: '🙂', label: '꽤' },
  { value: 5, emoji: '🔥', label: '매우' },
]

function getFeedbackMessage(temperature: number): string {
  if (temperature <= 2) return '방향이 바뀌어도 괜찮아요. 새로운 이유를 찾아볼까요?'
  if (temperature === 3) return '한번 다시 생각해보는 것도 좋아요'
  return '좋은 동력이 있네요!'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WhyTemperatureCard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface WhyTemperatureCardProps {
  goalId: string
  goalName: string
  goalWhy: string | null
  areaName: string
  areaEmoji: string
  areaWhy: string | null
}

function WhyTemperatureCard({
  goalId,
  goalName,
  goalWhy,
  areaName,
  areaEmoji,
  areaWhy,
}: WhyTemperatureCardProps) {
  const { startDate, endDate } = useReviewPeriod()
  const { data: reflection } = useGoalReflection(goalId, startDate, endDate)
  const { mutate: save } = useSaveGoalReflection(goalId, startDate, endDate)

  const currentTemperature = reflection?.why_temperature ?? null

  const handleSelect = (value: number) => {
    save({
      summary: reflection?.summary ?? undefined,
      progress_feeling: reflection?.progress_feeling ?? undefined,
      next_focus: reflection?.next_focus ?? undefined,
      why_temperature: value,
    })
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <WhyChainDisplay
        areaName={areaName}
        areaEmoji={areaEmoji}
        areaWhy={areaWhy}
        goalName={goalName}
        goalWhy={goalWhy}
      />

      <div className="mt-3">
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">
          이 이유가 아직 와닿나요?
        </p>
        <div className="mt-2 flex gap-2">
          {TEMPERATURE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-center transition-colors',
                currentTemperature === opt.value
                  ? 'bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-400)]'
                  : 'hover:bg-[var(--color-bg-secondary)]'
              )}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-[9px] text-[var(--color-text-tertiary)]">{opt.label}</span>
            </button>
          ))}
        </div>

        {currentTemperature !== null && (
          <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
            {getFeedbackMessage(currentTemperature)}
          </p>
        )}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function WhyTemperatureSection({ roadmapData }: WhyTemperatureSectionProps) {
  const activeGoals: Array<{
    goalId: string
    goalName: string
    goalWhy: string | null
    areaName: string
    areaEmoji: string
    areaWhy: string | null
  }> = []

  for (const areaData of roadmapData) {
    for (const goalData of areaData.goals) {
      if (goalData.goal.status === 'active') {
        activeGoals.push({
          goalId: goalData.goal.id,
          goalName: goalData.goal.name,
          goalWhy: goalData.goal.why,
          areaName: areaData.area.name,
          areaEmoji: areaData.area.emoji,
          areaWhy: areaData.area.why,
        })
      }
    }
  }

  if (activeGoals.length === 0) return null

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Why 온도 체크 🌡️</h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
          활성 목표의 이유가 아직 와닿는지 점검해보세요
        </p>
      </div>

      <div className="space-y-3">
        {activeGoals.map((goal) => (
          <WhyTemperatureCard
            key={goal.goalId}
            goalId={goal.goalId}
            goalName={goal.goalName}
            goalWhy={goal.goalWhy}
            areaName={goal.areaName}
            areaEmoji={goal.areaEmoji}
            areaWhy={goal.areaWhy}
          />
        ))}
      </div>
    </section>
  )
}
