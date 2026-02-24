'use client'

import { useMemo } from 'react'
import { format, parseISO, differenceInMonths } from 'date-fns'
import type { AreaReviewData } from './use-review-roadmap-data'

export interface GoalStoryItem {
  goalId: string
  goalName: string
  status: string
  why: string | null
  createdAt: string
  startLabel: string // "2025.12" format
  endLabel: string | null // null if ongoing
  durationMonths: number
  completedGroups: number
  totalGroups: number
  completionRate: number
}

export interface AreaStory {
  areaId: string
  areaName: string
  areaEmoji: string
  areaColor: string
  totalGoals: number
  activeGoals: number
  completedGoals: number
  pausedGoals: number
  goals: GoalStoryItem[]
  longestGoal: GoalStoryItem | null
}

export function useAreaStories(roadmapData: AreaReviewData[] | undefined): AreaStory[] {
  return useMemo(() => {
    if (!roadmapData) return []

    return roadmapData
      .map((areaData) => {
        const goals: GoalStoryItem[] = areaData.goals.map((goalData) => {
          const createdAt = goalData.goal.createdAt || new Date().toISOString()
          const createdDate = parseISO(createdAt)
          const now = new Date()
          const durationMonths = Math.max(1, differenceInMonths(now, createdDate) + 1)
          const completedGroups = goalData.groups.filter((g) => g.is_completed).length
          const totalGroups = goalData.groups.length

          return {
            goalId: goalData.goal.id,
            goalName: goalData.goal.name,
            status: goalData.goal.status,
            why: goalData.goal.why,
            createdAt,
            startLabel: format(createdDate, 'yyyy.MM'),
            endLabel: goalData.goal.status === 'completed' ? format(now, 'yyyy.MM') : null,
            durationMonths,
            completedGroups,
            totalGroups,
            completionRate: goalData.periodCompletionRate,
          }
        })

        const activeGoals = goals.filter((g) => g.status === 'active').length
        const completedGoals = goals.filter((g) => g.status === 'completed').length
        const pausedGoals = goals.filter((g) => g.status === 'paused').length

        // Find longest active/completed goal
        const longestGoal =
          goals
            .filter((g) => g.status === 'active' || g.status === 'completed')
            .sort((a, b) => b.durationMonths - a.durationMonths)[0] ?? null

        return {
          areaId: areaData.area.id,
          areaName: areaData.area.name,
          areaEmoji: areaData.area.emoji,
          areaColor: areaData.area.color,
          totalGoals: goals.length,
          activeGoals,
          completedGoals,
          pausedGoals,
          goals,
          longestGoal,
        }
      })
      .filter((a) => a.totalGoals > 0)
  }, [roadmapData])
}
