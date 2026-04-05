'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createArea } from '@/actions/area.actions'
import { createGoal } from '@/actions/goal.actions'
import { createTask } from '@/actions/task.actions'
import { queryKeys } from '@/lib/query/keys'
import { useAreas } from '@/queries/use-areas'
import type { AreaType } from '@/types/entities'

export interface BrainDumpReviewTask {
  _id: string
  _checked: boolean
  name: string
  why?: string
}

export interface BrainDumpReviewGoal {
  _id: string
  _checked: boolean
  name: string
  why?: string
  tasks: BrainDumpReviewTask[]
}

export interface BrainDumpReviewArea {
  _id: string
  _checked: boolean
  name: string
  emoji: string
  color: string
  type: string
  isExisting: boolean
  existingAreaId?: string
  goals: BrainDumpReviewGoal[]
}

export interface ApplyProgress {
  total: number
  completed: number
  failed: number
}

export function useBrainDumpApply() {
  const queryClient = useQueryClient()
  const { data: existingAreas } = useAreas()
  const [isApplying, setIsApplying] = useState(false)
  const [progress, setProgress] = useState<ApplyProgress>({ total: 0, completed: 0, failed: 0 })

  const apply = useCallback(
    async (areas: BrainDumpReviewArea[]): Promise<boolean> => {
      setIsApplying(true)

      // Count total items to create
      let total = 0
      for (const area of areas) {
        if (!area._checked) continue
        if (!area.isExisting) total++ // new area
        for (const goal of area.goals) {
          if (!goal._checked) continue
          total++ // goal
          for (const task of goal.tasks) {
            if (task._checked) total++ // task
          }
        }
      }

      setProgress({ total, completed: 0, failed: 0 })
      let completed = 0
      let failed = 0

      for (const area of areas) {
        if (!area._checked) continue

        // Resolve area ID: use provided ID, or fallback to name match
        let areaId = area.existingAreaId
        if (area.isExisting && !areaId && existingAreas) {
          const match = existingAreas.find((a) => a.name === area.name)
          if (match) areaId = match.id
        }

        // Create new area if needed
        if (!area.isExisting) {
          const result = await createArea({
            name: area.name,
            emoji: area.emoji,
            color: area.color,
            type: area.type as AreaType,
          })
          if (result.success && result.data) {
            areaId = result.data.id
            completed++
          } else {
            failed++
            // Skip all goals/tasks in this area
            const skippedGoals = area.goals.filter((g) => g._checked)
            const skippedTasks = skippedGoals.flatMap((g) => g.tasks.filter((t) => t._checked))
            failed += skippedGoals.length + skippedTasks.length
            setProgress({ total, completed, failed })
            continue
          }
          setProgress({ total, completed, failed })
        }

        if (!areaId) {
          // Count all checked descendants as failed instead of silently skipping
          for (const goal of area.goals) {
            if (!goal._checked) continue
            failed++
            failed += goal.tasks.filter((t) => t._checked).length
          }
          setProgress({ total, completed, failed })
          continue
        }

        // Create goals
        for (const goal of area.goals) {
          if (!goal._checked) continue

          const goalResult = await createGoal({
            area_id: areaId,
            name: goal.name,
            why: goal.why,
            status: 'backlog',
          })

          if (goalResult.success && goalResult.data) {
            completed++
            setProgress({ total, completed, failed })

            // Create tasks for this goal
            for (const task of goal.tasks) {
              if (!task._checked) continue

              const taskResult = await createTask({
                goal_id: goalResult.data.id,
                name: task.name,
                why: task.why,
                repeat_type: 'daily',
              })

              if (taskResult.success) {
                completed++
              } else {
                failed++
              }
              setProgress({ total, completed, failed })
            }
          } else {
            failed++
            // Skip tasks for this goal
            const skippedTasks = goal.tasks.filter((t) => t._checked)
            failed += skippedTasks.length
            setProgress({ total, completed, failed })
          }
        }
      }

      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.areas.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.roadmap }),
      ])

      setIsApplying(false)

      if (failed === 0) {
        toast.success(`${completed}개 항목이 추가되었습니다.`)
      } else {
        toast.warning(`${completed}개 추가, ${failed}개 실패`)
      }

      return failed === 0
    },
    [queryClient, existingAreas]
  )

  return { apply, isApplying, progress }
}
