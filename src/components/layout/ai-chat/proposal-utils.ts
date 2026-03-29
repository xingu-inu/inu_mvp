import type {
  BrainDumpReviewArea,
  BrainDumpReviewGoal,
  BrainDumpReviewTask,
} from '@/features/roadmap/hooks/use-brain-dump-apply'

/** Shape returned by the propose_structure tool */
export interface ProposeStructureOutput {
  type: 'propose_structure'
  summary: string
  areas: ProposeStructureArea[]
}

export interface ProposeStructureArea {
  name: string
  emoji: string
  color: string
  type: string
  isExisting: boolean
  existingAreaId?: string
  goals: {
    name: string
    why?: string
    tasks: {
      name: string
      why?: string
      repeat_type: string
      duration_minutes: number
      time_slot: string
    }[]
  }[]
}

/** Convert propose_structure tool output to BrainDumpReviewArea[] with _id/_checked */
export function toReviewAreas(output: ProposeStructureOutput): BrainDumpReviewArea[] {
  let idCounter = 0

  return output.areas.map((area) => ({
    _id: `area-${idCounter++}`,
    _checked: true,
    name: area.name || '(이름 없음)',
    emoji: area.emoji || '📌',
    color: area.color || '#6B7280',
    type: area.type || 'custom',
    isExisting: !!area.isExisting,
    existingAreaId: area.existingAreaId,
    goals: (area.goals ?? []).map(
      (goal): BrainDumpReviewGoal => ({
        _id: `goal-${idCounter++}`,
        _checked: true,
        name: goal.name || '(이름 없음)',
        why: goal.why,
        tasks: (goal.tasks ?? []).map(
          (task): BrainDumpReviewTask => ({
            _id: `task-${idCounter++}`,
            _checked: true,
            name: task.name || '(이름 없음)',
            why: task.why,
            repeat_type: task.repeat_type || 'daily',
            duration_minutes: task.duration_minutes || 15,
            time_slot: task.time_slot || 'anytime',
          })
        ),
      })
    ),
  }))
}

/** Validate that a raw area object has the minimum required shape */
function isValidArea(a: unknown): boolean {
  if (typeof a !== 'object' || a === null) return false
  const obj = a as Record<string, unknown>
  return typeof obj.name === 'string' && Array.isArray(obj.goals)
}

/** Parse the raw tool output string into ProposeStructureOutput */
export function parseProposalOutput(raw: unknown): ProposeStructureOutput | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (
      data?.type === 'propose_structure' &&
      Array.isArray(data.areas) &&
      data.areas.length > 0 &&
      data.areas.every(isValidArea)
    ) {
      return data as ProposeStructureOutput
    }
    return null
  } catch {
    return null
  }
}
