import { useRoadmapStore } from '@/stores/roadmap.store'
import type { DiagnosisAction } from '@/lib/ai/types'
import type { Task } from '@/types/entities'

export function useDiagnosisActions(onClose: () => void, allTasks: Task[] = []) {
  function handleAction(action: DiagnosisAction | undefined) {
    if (!action || action.type === 'none') return

    switch (action.targetType) {
      case 'goal':
        // Goal targets: add-why, pause-goal, activate-goal, add-task, set-deadline
        // Use setState for atomic update — sets focusedGoalId so GoalBrowsePanel
        // subscription reacts (expands accordion, scrolls into view)
        useRoadmapStore.setState({
          pendingDiagnosisAction: action,
          selection: { type: 'goal', id: action.targetId },
          focusedGoalId: action.targetId,
          inlineMode: null,
        })
        break

      case 'area':
        if (action.type === 'add-why') {
          // area add-why: select the area to trigger InlineAreaEdit
          useRoadmapStore.setState({
            pendingDiagnosisAction: action,
            selection: { type: 'area', id: action.targetId },
            panelMode: 'view-area',
          })
        } else {
          // add-goal: only set pendingAction — GoalBrowsePanel will handle
          // uncollapsing the area and showing InlineGoalCreate
          useRoadmapStore.setState({
            pendingDiagnosisAction: action,
          })
        }
        break

      case 'task': {
        // Task targets: add-why on a task
        // Navigate to the parent goal, then GoalBrowsePanel will set inlineMode
        const task = allTasks.find((t) => t.id === action.targetId)
        const goalId = task?.goal_id
        if (goalId) {
          useRoadmapStore.setState({
            pendingDiagnosisAction: action,
            selection: { type: 'goal', id: goalId },
            focusedGoalId: goalId,
            inlineMode: null,
          })
        }
        break
      }
    }

    onClose()
  }

  return { handleAction }
}
