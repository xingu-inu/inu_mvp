'use client'

import type { GoalStats } from '../hooks/use-goal-stats'

export function RoadmapStatsSummary({ stats }: { stats: GoalStats | null }) {
  if (!stats) {
    return <span>인생의 큰 그림을 그려보세요</span>
  }

  const { totalGoals, completedCount } = stats

  if (completedCount === totalGoals) {
    return (
      <span>
        {totalGoals}개 목표 모두 달성! <span className="text-[var(--color-done)]">대단해요</span>
      </span>
    )
  }

  if (completedCount === 0) {
    return <span>목표 {totalGoals}개와 함께 걷는 중</span>
  }

  return (
    <span>
      목표 {totalGoals}개 중{' '}
      <span className="text-[var(--color-done)]">{completedCount}개 달성</span>
      {' · '}나아가는 중
    </span>
  )
}
