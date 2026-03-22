'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCreateGoal, useDeleteGoal } from '@/queries/use-goals'
import { useCreateGroup } from '@/queries/use-groups'
import { useCreateTask } from '@/queries/use-tasks'
import type { GoalTemplate } from '../data/goal-templates'

export function useApplyTemplate() {
  const [isApplying, setIsApplying] = useState(false)
  const createGoal = useCreateGoal()
  const createGroup = useCreateGroup()
  const createTask = useCreateTask()
  const deleteGoal = useDeleteGoal()

  async function applyTemplate(template: GoalTemplate, areaId: string): Promise<void> {
    setIsApplying(true)
    let goalId: string | null = null
    try {
      // 1. Create the Goal
      const goal = await createGoal.mutateAsync({
        area_id: areaId,
        name: `${template.emoji} ${template.name}`,
        status: 'active',
      })
      goalId = goal.id

      // 2. Create Groups sequentially (need IDs for tasks)
      for (const groupTemplate of template.groups) {
        const group = await createGroup.mutateAsync({
          goal_id: goal.id,
          name: groupTemplate.name,
        })

        // 3. Create Tasks for this group (order preserved by sequential creation)
        for (const taskTemplate of groupTemplate.tasks) {
          await createTask.mutateAsync({
            goal_id: goal.id,
            group_id: group.id,
            name: taskTemplate.name,
            repeat_type: taskTemplate.repeatType ?? 'daily',
            time_slot: taskTemplate.timeSlot ?? 'anytime',
          })
        }
      }

      toast.success(`'${template.name}' 템플릿이 적용되었습니다!`)
    } catch {
      // Clean up: delete the goal (cascade-deletes groups/tasks) to avoid orphaned data
      if (goalId) {
        try {
          await deleteGoal.mutateAsync(goalId)
        } catch {
          // Cleanup failed — orphaned goal may remain
        }
      }
      toast.error('템플릿 적용에 실패했습니다.')
      throw new Error('Template application failed')
    } finally {
      setIsApplying(false)
    }
  }

  return { applyTemplate, isApplying }
}
