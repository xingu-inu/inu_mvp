import { Archive, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Completion path choice after achieving a goal */
export type CompletionChoice = 'archive' | 'next-level'

interface CompletionChoiceOption {
  id: CompletionChoice
  icon: LucideIcon
  label: string
  description: string
}

/**
 * Shared choices for goal completion flow.
 * Used by GoalCompletionDialog (modal) and InlineGoalCompletion (inline).
 */
export const COMPLETION_CHOICES: readonly CompletionChoiceOption[] = [
  {
    id: 'archive',
    icon: Archive,
    label: '완료 & 보관',
    description: '기록으로 남기기',
  },
  {
    id: 'next-level',
    icon: ArrowUpRight,
    label: '다음 레벨',
    description: '새로운 도전 시작',
  },
] as const
