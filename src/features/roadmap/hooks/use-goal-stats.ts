import { useMemo } from 'react'
import { useGoals } from '@/queries/use-goals'

export interface GoalStats {
  totalGoals: number
  activeCount: number
  completedCount: number
  completionRate: number
}

export function useGoalStats(): GoalStats | null {
  const { data: goals } = useGoals()

  return useMemo(() => {
    if (!goals || goals.length === 0) return null

    // archived/paused/backlog는 비활성 — stats에서 제외
    const countable = goals.filter(
      (g) => g.status !== 'archived' && g.status !== 'paused' && g.status !== 'backlog'
    )
    if (countable.length === 0) return null

    let activeCount = 0
    let completedCount = 0
    for (const g of countable) {
      if (g.status === 'active' || g.status === 'maintenance') activeCount++
      else if (g.status === 'completed') completedCount++
    }

    return {
      totalGoals: countable.length,
      activeCount,
      completedCount,
      completionRate: (completedCount / countable.length) * 100,
    }
  }, [goals])
}
